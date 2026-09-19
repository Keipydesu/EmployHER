import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isolatedDatabase } from "./isolated-database.ts";
import { Lifecycle } from "../../src/server/platform/lifecycle.ts";
import { Owners } from "../../src/server/platform/owners.ts";
const connectionString = process.env.TEST_DATABASE_URL;
test(
  "deletion blocks access immediately, cleans records, exposes owned status and expiry is effective",
  { skip: !connectionString },
  async () => {
    const { pool, cleanup } = await isolatedDatabase(connectionString!);
    const owner = randomUUID(),
      other = randomUUID(),
      profile = randomUUID();
    const lifecycle = new Lifecycle(pool),
      owners = new Owners(pool);
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        await readFile("migrations/007-account-interests.sql", "utf8"),
      );
      await pool.query(
        await readFile("migrations/008-backboard-storage.sql", "utf8"),
      );
      // Exact non-vector lifecycle/head shapes; vector/version migration is a separate gate.
      await pool.query(
        "CREATE TABLE IF NOT EXISTS profile_owner_lifecycle(owner_id uuid PRIMARY KEY,deleted_at timestamptz)",
      );
      await pool.query(
        "CREATE TABLE IF NOT EXISTS resume_profile_heads(id uuid PRIMARY KEY,owner_id uuid NOT NULL,current_version integer NOT NULL CHECK(current_version>0),expires_at timestamptz NOT NULL)",
      );
      await pool.query(
        "ALTER TABLE app_deletions ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now()",
      );
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1,$2,$4),($3,$2,$5)",
        [owner, "test-lifecycle", other, owner, other],
      );
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,1,now()+interval '1 day')",
        [profile, owner],
      );
      const requested = await lifecycle.request(owner);
      assert.equal(requested.status, "pending");
      assert.equal(
        (await lifecycle.request(owner)).deletionId,
        requested.deletionId,
      );
      await assert.rejects(
        () => owners.resolve({ issuer: "test-lifecycle", subject: owner }),
        /deletion/,
      );
      assert.equal(
        await owners.resolve(
          { issuer: "test-lifecycle", subject: owner },
          false,
          true,
        ),
        owner,
      );
      await assert.rejects(
        () => lifecycle.status(other, requested.deletionId),
        /unavailable/,
      );
      const otherDeletion = await lifecycle.request(other);
      assert.equal((await lifecycle.reconcile(20, owner)).completed, 1);
      assert.equal(
        (await lifecycle.status(other, otherDeletion.deletionId)).status,
        "pending",
        "scoped smoke cleanup must not process another account",
      );
      assert.equal((await lifecycle.reconcile()).completed, 1);
      assert.equal(
        (await lifecycle.status(owner, requested.deletionId)).status,
        "completed",
      );
      assert.equal(
        (
          await pool.query("SELECT 1 FROM resume_profile_heads WHERE id=$1", [
            profile,
          ])
        ).rowCount,
        0,
      );
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,1,now()-interval '1 second')",
        [profile, other],
      );
      assert.equal((await lifecycle.expire()).expiredProfiles, 1);
    } finally {
      await pool.query(
        "DELETE FROM resume_profile_heads WHERE owner_id=ANY($1)",
        [[owner, other]],
      );
      await pool.query(
        "DELETE FROM profile_owner_lifecycle WHERE owner_id=ANY($1)",
        [[owner, other]],
      );
      await pool.query("DELETE FROM app_deletions WHERE owner_id=ANY($1)", [
        [owner, other],
      ]);
      await pool.query("DELETE FROM app_users WHERE id=ANY($1)", [
        [owner, other],
      ]);
      await cleanup();
    }
  },
);
