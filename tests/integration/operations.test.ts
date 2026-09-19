import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { isolatedDatabase } from "./isolated-database.ts";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { PostgresOperations } from "../../src/server/platform/operations.ts";
import type { Profile } from "../../src/profile/contracts.ts";
const connectionString = process.env.TEST_DATABASE_URL;
test(
  "real PostgreSQL atomic replay, conflict, stale lease rollback and deletion guard",
  { skip: !connectionString },
  async () => {
    const { pool, cleanup } = await isolatedDatabase(connectionString!);
    const db = drizzle(pool);
    const operations = new PostgresOperations(pool);
    const owner = randomUUID();
    const p = {
      ownerId: owner,
      profileId: randomUUID(),
      version: 1,
      status: "draft",
      facts: [],
      embedding: null,
      extractionModel: "test",
      promptVersion: "v1",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    } satisfies Profile;
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        await readFile("migrations/007-account-interests.sql", "utf8"),
      );
      await pool.query(
        await readFile("migrations/008-backboard-storage.sql", "utf8"),
      );
      await pool.query(
        "CREATE TABLE IF NOT EXISTS test_operation_effects (id uuid PRIMARY KEY, value integer NOT NULL)",
      );
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1,$2,$3)",
        [owner, "test", owner],
      );
      let calls = 0;
      const work = async () => {
        calls++;
        await db.transaction(async (tx) => {
          await operations.lockOwner(tx);
          await tx.execute(
            sql`INSERT INTO test_operation_effects VALUES(${p.profileId}::uuid,1)`,
          );
          await operations.completeProfile(tx, p);
        });
        return p;
      };
      const first = await operations.run(
        owner,
        "intake",
        "key12345",
        "digest1",
        work,
      );
      await pool.query(
        "UPDATE test_operation_effects SET value=2 WHERE id=$1",
        [p.profileId],
      );
      const replay = await operations.run(
        owner,
        "intake",
        "key12345",
        "digest1",
        work,
      );
      assert.deepEqual(replay, first);
      assert.equal(calls, 1);
      await assert.rejects(
        () => operations.run(owner, "intake", "key12345", "different", work),
        /different input/,
      );
      const doomed = { ...p, profileId: randomUUID() };
      await assert.rejects(
        () =>
          operations.run(owner, "intake", "stale-key", "digest2", async () => {
            await pool.query(
              "UPDATE app_operations SET lease_token=$1 WHERE owner_id=$2 AND key='stale-key'",
              [randomUUID(), owner],
            );
            await db.transaction(async (tx) => {
              await operations.lockOwner(tx);
              await tx.execute(
                sql`INSERT INTO test_operation_effects VALUES(${doomed.profileId}::uuid,1)`,
              );
              await operations.completeProfile(tx, doomed);
            });
            return doomed;
          }),
        /Operation expired/,
      );
      assert.equal(
        (
          await pool.query("SELECT 1 FROM test_operation_effects WHERE id=$1", [
            doomed.profileId,
          ])
        ).rowCount,
        0,
      );
      await pool.query(
        "UPDATE app_users SET deletion_requested_at=now() WHERE id=$1",
        [owner],
      );
      await assert.rejects(
        () => operations.run(owner, "intake", "key12345", "digest1", work),
        /Account unavailable/,
      );
    } finally {
      await pool.query("DELETE FROM app_operations WHERE owner_id=$1", [owner]);
      await pool.query("DELETE FROM app_users WHERE id=$1", [owner]);
      await pool.query("DELETE FROM test_operation_effects WHERE id=$1", [
        p.profileId,
      ]);
      await cleanup();
    }
  },
);
test(
  "a concurrent request for the same key while the first is mid-flight observes OPERATION_PENDING, and later replays the committed result",
  { skip: !connectionString },
  async () => {
    const { pool, cleanup } = await isolatedDatabase(connectionString!);
    const db = drizzle(pool);
    const operations = new PostgresOperations(pool);
    const owner = randomUUID();
    const p = {
      ownerId: owner,
      profileId: randomUUID(),
      version: 1,
      status: "draft",
      facts: [],
      embedding: null,
      extractionModel: "test",
      promptVersion: "v1",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    } satisfies Profile;
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        await readFile("migrations/007-account-interests.sql", "utf8"),
      );
      await pool.query(
        await readFile("migrations/008-backboard-storage.sql", "utf8"),
      );
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1,$2,$3)",
        [owner, "test", owner],
      );
      let calls = 0;
      const slowWork = async () => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 200));
        await db.transaction(async (tx) => {
          await operations.lockOwner(tx);
          await operations.completeProfile(tx, p);
        });
        return p;
      };
      const first = operations.run(
        owner,
        "intake",
        "concurrent-key",
        "digestC",
        slowWork,
      );
      // Give the first call's short bootstrap transaction time to insert the
      // pending row and commit before the second call reads it.
      await new Promise((resolve) => setTimeout(resolve, 50));
      await assert.rejects(
        () =>
          operations.run(
            owner,
            "intake",
            "concurrent-key",
            "digestC",
            async () => {
              calls++;
              return p;
            },
          ),
        /still running/,
      );
      const firstResult = await first;
      assert.deepEqual(firstResult, p);
      assert.equal(calls, 1, "the concurrent caller must never run work()");
      const replay = await operations.run(
        owner,
        "intake",
        "concurrent-key",
        "digestC",
        async () => {
          calls++;
          return p;
        },
      );
      assert.deepEqual(replay, p);
      assert.equal(calls, 1, "a replay after completion must not run work()");
    } finally {
      await pool.query("DELETE FROM app_operations WHERE owner_id=$1", [owner]);
      await pool.query("DELETE FROM app_users WHERE id=$1", [owner]);
      await cleanup();
    }
  },
);
test(
  "a naturally expired lease (process died, no hand-forced token swap) can be stolen and completed by a fresh call",
  { skip: !connectionString },
  async () => {
    const { pool, cleanup } = await isolatedDatabase(connectionString!);
    const db = drizzle(pool);
    const operations = new PostgresOperations(pool);
    const owner = randomUUID();
    const p = {
      ownerId: owner,
      profileId: randomUUID(),
      version: 1,
      status: "draft",
      facts: [],
      embedding: null,
      extractionModel: "test",
      promptVersion: "v1",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    } satisfies Profile;
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        await readFile("migrations/007-account-interests.sql", "utf8"),
      );
      await pool.query(
        await readFile("migrations/008-backboard-storage.sql", "utf8"),
      );
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1,$2,$3)",
        [owner, "test", owner],
      );
      // Simulate a worker that took the lease and then crashed before ever
      // calling completeProfile: a pending row whose lease already expired.
      await pool.query(
        `INSERT INTO app_operations(owner_id,kind,key,digest,state,lease_token,lease_expires_at,expires_at)
         VALUES($1,'intake','abandoned-key','digestD','pending',$2,now()-interval '1 second',now()+interval '24 hours')`,
        [owner, randomUUID()],
      );
      let calls = 0;
      const result = await operations.run(
        owner,
        "intake",
        "abandoned-key",
        "digestD",
        async () => {
          calls++;
          await db.transaction(async (tx) => {
            await operations.lockOwner(tx);
            await operations.completeProfile(tx, p);
          });
          return p;
        },
      );
      assert.deepEqual(result, p);
      assert.equal(calls, 1);
      const row = await pool.query(
        "SELECT state FROM app_operations WHERE owner_id=$1 AND key='abandoned-key'",
        [owner],
      );
      assert.equal(row.rows[0].state, "done");
    } finally {
      await pool.query("DELETE FROM app_operations WHERE owner_id=$1", [owner]);
      await pool.query("DELETE FROM app_users WHERE id=$1", [owner]);
      await cleanup();
    }
  },
);
test(
  "a genuine failure inside work() force-expires the lease so an immediate retry does not have to wait out the full window",
  { skip: !connectionString },
  async () => {
    const { pool, cleanup } = await isolatedDatabase(connectionString!);
    const db = drizzle(pool);
    const operations = new PostgresOperations(pool);
    const owner = randomUUID();
    const p = {
      ownerId: owner,
      profileId: randomUUID(),
      version: 1,
      status: "draft",
      facts: [],
      embedding: null,
      extractionModel: "test",
      promptVersion: "v1",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    } satisfies Profile;
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        await readFile("migrations/007-account-interests.sql", "utf8"),
      );
      await pool.query(
        await readFile("migrations/008-backboard-storage.sql", "utf8"),
      );
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1,$2,$3)",
        [owner, "test", owner],
      );
      await assert.rejects(
        () =>
          operations.run(
            owner,
            "intake",
            "failing-key",
            "digestE",
            async () => {
              throw new Error("simulated transient failure");
            },
          ),
        /simulated transient failure/,
      );
      // No sleep for the 60s lease window: an immediate retry must succeed.
      const result = await operations.run(
        owner,
        "intake",
        "failing-key",
        "digestE",
        async () => {
          await db.transaction(async (tx) => {
            await operations.lockOwner(tx);
            await operations.completeProfile(tx, p);
          });
          return p;
        },
      );
      assert.deepEqual(result, p);
    } finally {
      await pool.query("DELETE FROM app_operations WHERE owner_id=$1", [owner]);
      await pool.query("DELETE FROM app_users WHERE id=$1", [owner]);
      await cleanup();
    }
  },
);
