import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Lifecycle } from "../../src/server/platform/lifecycle.ts";
import { PostgresOperations } from "../../src/server/platform/operations.ts";

const connectionString = process.env.TEST_DATABASE_URL;
async function isolatedDatabase(
  work: (pool: Pool, owner: string) => Promise<void>,
) {
  const admin = new Pool({ connectionString });
  const schema = `lifecycle_${randomUUID().replaceAll("-", "")}`;
  const owner = randomUUID();
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({
    connectionString,
    options: `-c search_path=${schema}`,
  });
  try {
    await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
    await pool.query(
      await readFile("migrations/007-account-interests.sql", "utf8"),
    );
    await pool.query(await readFile("migrations/003-lifecycle.sql", "utf8"));
    // This suite tests lifecycle fencing, not the separate pgvector migration gate.
    await pool.query(
      "CREATE TABLE profile_owner_lifecycle(owner_id uuid PRIMARY KEY,deleted_at timestamptz)",
    );
    await pool.query(
      "CREATE TABLE resume_profile_heads(id uuid PRIMARY KEY,owner_id uuid NOT NULL,current_version integer NOT NULL,expires_at timestamptz NOT NULL)",
    );
    await pool.query(
      "INSERT INTO app_users(id,auth_issuer,auth_subject,consent_version,consent_at) VALUES($1::uuid,'test',$1::text,'v1',now())",
      [owner],
    );
    await work(pool, owner);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
}

test(
  "failed cleanup rolls back all effects and a restarted worker retries durably",
  { skip: !connectionString },
  async () => {
    await isolatedDatabase(async (pool, owner) => {
      const lifecycle = new Lifecycle(pool);
      const profile = randomUUID();
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,1,now()+interval '1 day')",
        [profile, owner],
      );
      await pool.query(
        "INSERT INTO app_request_quotas VALUES($1,CURRENT_DATE,1)",
        [owner],
      );
      // Fail after the profile DELETE, proving the entire cleanup transaction rolls back.
      await pool.query(
        `CREATE FUNCTION reject_quota_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic cleanup failure'; END $$`,
      );
      await pool.query(
        "CREATE TRIGGER fail_cleanup BEFORE DELETE ON app_request_quotas FOR EACH ROW EXECUTE FUNCTION reject_quota_delete()",
      );
      const request = await lifecycle.request(owner);
      assert.equal((await lifecycle.reconcile()).completed, 0);
      assert.equal(
        (await lifecycle.status(owner, request.deletionId)).status,
        "failed",
      );
      assert.equal(
        (
          await pool.query("SELECT 1 FROM resume_profile_heads WHERE id=$1", [
            profile,
          ])
        ).rowCount,
        1,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT consent_version FROM app_users WHERE id=$1",
            [owner],
          )
        ).rows[0].consent_version,
        "v1",
      );
      assert.equal(
        (await lifecycle.reconcile()).checked,
        0,
        "backoff prevents immediate repeated cleanup",
      );
      await pool.query("DROP TRIGGER fail_cleanup ON app_request_quotas");
      await pool.query(
        "UPDATE app_deletions SET next_attempt_at=now()-interval '1 second' WHERE id=$1",
        [request.deletionId],
      );
      const restarted = new Lifecycle(pool);
      assert.equal((await restarted.reconcile()).completed, 1);
      assert.equal(
        (await restarted.status(owner, request.deletionId)).status,
        "completed",
      );
      assert.equal(
        (await pool.query("SELECT 1 FROM resume_profile_heads")).rowCount,
        0,
      );
      assert.equal(
        (await pool.query("SELECT 1 FROM app_request_quotas")).rowCount,
        0,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT consent_version FROM app_users WHERE id=$1",
            [owner],
          )
        ).rows[0].consent_version,
        null,
      );
      assert.equal(
        (await pool.query("SELECT attempts FROM app_deletions")).rows[0]
          .attempts,
        2,
      );
    });
  },
);

test(
  "a provider result arriving after deletion cannot recreate profile data",
  { skip: !connectionString },
  async () => {
    await isolatedDatabase(async (pool, owner) => {
      const lifecycle = new Lifecycle(pool);
      const operations = new PostgresOperations(pool);
      const db = drizzle(pool);
      const entered = Promise.withResolvers<void>();
      const resume = Promise.withResolvers<void>();
      const pending = operations.run(
        owner,
        "intake",
        "late-result",
        "digest",
        async () => {
          entered.resolve();
          await resume.promise;
          await db.transaction(async (tx) => {
            await operations.lockOwner(tx);
            await tx.execute(
              sql`INSERT INTO resume_profile_heads VALUES(${randomUUID()}::uuid,${owner}::uuid,1,now()+interval '1 day')`,
            );
          });
        },
      );
      // Attach rejection handling before releasing the paused provider callback.
      const rejected = assert.rejects(pending, /Account unavailable/);
      try {
        await entered.promise;
        await lifecycle.request(owner);
        assert.equal((await lifecycle.reconcile()).completed, 1);
      } finally {
        resume.resolve();
        await rejected;
      }
      assert.equal(
        (await pool.query("SELECT 1 FROM resume_profile_heads")).rowCount,
        0,
      );
      assert.equal(
        (await pool.query("SELECT 1 FROM app_operations")).rowCount,
        0,
      );
    });
  },
);
