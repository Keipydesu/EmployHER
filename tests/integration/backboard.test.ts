import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { BackboardSync } from "../../src/server/platform/backboard-sync.ts";
const connectionString = process.env.TEST_DATABASE_URL;
test(
  "Backboard sync persists revisions, retries after restart, and cleans a late write after opt-out",
  { skip: !connectionString },
  async () => {
    const admin = new Pool({ connectionString });
    const schema = `memory_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    const owner = randomUUID(),
      other = randomUUID(),
      profile = randomUUID(),
      assistant = randomUUID();
    let adds = 0,
      deletes = 0,
      resets = 0,
      fail = false;
    const entered = Promise.withResolvers<void>(),
      resume = Promise.withResolvers<void>();
    let pause = false;
    const provider = {
      createAssistant: async () => assistant,
      addMemory: async (_id: string, content: string) => {
        adds++;
        if (pause) {
          entered.resolve();
          await resume.promise;
        }
        if (fail) throw new Error("provider failure");
        return { id: "memory-1", content };
      },
      updateMemory: async (_id: string, id: string, content: string) => ({
        id,
        content,
      }),
      resetMemories: async () => {
        resets++;
      },
      deleteAssistant: async () => {
        deletes++;
      },
    };
    const make = () => new BackboardSync(pool, provider, true);
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        "CREATE TABLE resume_profile_heads(id uuid PRIMARY KEY,owner_id uuid NOT NULL,current_version integer NOT NULL,expires_at timestamptz NOT NULL,UNIQUE(id,owner_id))",
      );
      for (const file of [
        "004-career-plans",
        "007-account-interests",
        "008-backboard-storage",
      ])
        await pool.query(await readFile(`migrations/${file}.sql`, "utf8"));
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1::uuid,'test',$1::text)",
        [owner],
      );
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,1,now()+interval '1 day')",
        [profile, owner],
      );
      await pool.query(
        "INSERT INTO opportunity_catalog_state VALUES(true,'v1')",
      );
      const snapshot = {
        profileId: profile,
        profileVersion: 1,
        catalogVersion: "v1",
        planVersion: 0,
        interestVersion: 0,
        content: '{"field":"software","steps":[]}',
      };
      await assert.rejects(
        () => make().queue(randomUUID(), snapshot),
        /unavailable/,
      );
      await make().queue(owner, snapshot);
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1::uuid,'test',$1::text)",
        [other],
      );
      await make().queue(other, null);
      fail = true;
      await make().reconcile(20, owner);
      assert.equal(
        (await make().status(other)).status,
        "deleting",
        "scoped smoke must not process another account's queue",
      );
      assert.equal((await make().status(owner)).status, "failed");
      assert.equal(
        (
          await pool.query(
            "SELECT assistant_id FROM backboard_context WHERE owner_id=$1",
            [owner],
          )
        ).rows[0].assistant_id,
        assistant,
        "provider ID survives failed writes",
      );
      fail = false;
      await pool.query("UPDATE backboard_context SET next_attempt_at=now()");
      await make().reconcile();
      assert.equal((await make().status(owner)).status, "synced");
      assert.equal(resets, 1, "uncertain initial write is reset before retry");
      await make().queue(owner, null);
      await make().reconcile();
      assert.equal((await make().status(owner)).status, "disabled");
      assert.equal(deletes, 1);
      pause = true;
      await make().queue(owner, snapshot);
      const pending = make().reconcile();
      await entered.promise;
      try {
        await make().queue(owner, null);
        await make().reconcile();
      } finally {
        resume.resolve();
        await pending;
      }
      assert.equal((await make().status(owner)).status, "deleting");
      await make().reconcile();
      assert.equal(deletes, 2);
      assert.equal((await make().status(owner)).status, "disabled");
      const row = (
        await pool.query(
          "SELECT desired,assistant_id,memory_id FROM backboard_context WHERE owner_id=$1",
          [owner],
        )
      ).rows[0];
      assert.deepEqual(row, {
        desired: null,
        assistant_id: null,
        memory_id: null,
      });
      assert.equal(adds, 3);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
test(
  "an existing assistant with no recorded memory is reset before retry even when the last recorded status is 'pending', not only 'failed'",
  { skip: !connectionString },
  async () => {
    const admin = new Pool({ connectionString });
    const schema = `memory_pending_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    const owner = randomUUID(),
      profile = randomUUID(),
      assistant = randomUUID();
    let adds = 0,
      resets = 0;
    const calls: string[] = [];
    const provider = {
      createAssistant: async () => assistant,
      addMemory: async (_id: string, content: string) => {
        adds++;
        calls.push("add");
        return { id: "memory-1", content };
      },
      updateMemory: async (_id: string, id: string, content: string) => ({
        id,
        content,
      }),
      resetMemories: async () => {
        resets++;
        calls.push("reset");
      },
      deleteAssistant: async () => {},
    };
    const make = () => new BackboardSync(pool, provider, true);
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        "CREATE TABLE resume_profile_heads(id uuid PRIMARY KEY,owner_id uuid NOT NULL,current_version integer NOT NULL,expires_at timestamptz NOT NULL,UNIQUE(id,owner_id))",
      );
      for (const file of [
        "004-career-plans",
        "007-account-interests",
        "008-backboard-storage",
      ])
        await pool.query(await readFile(`migrations/${file}.sql`, "utf8"));
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1::uuid,'test',$1::text)",
        [owner],
      );
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,1,now()+interval '1 day')",
        [profile, owner],
      );
      await pool.query(
        "INSERT INTO opportunity_catalog_state VALUES(true,'v1')",
      );
      const snapshot = {
        profileId: profile,
        profileVersion: 1,
        catalogVersion: "v1",
        planVersion: 0,
        interestVersion: 0,
        content: '{"field":"software","steps":[]}',
      };
      await make().queue(owner, snapshot);
      // Simulate a process that already created the remote assistant (and may
      // have already written a memory to it) but crashed before recording
      // memory_id locally -- status is still "pending", not "failed".
      await pool.query(
        "UPDATE backboard_context SET assistant_id=$2 WHERE owner_id=$1",
        [owner, assistant],
      );
      assert.equal(
        (
          await pool.query(
            "SELECT status FROM backboard_context WHERE owner_id=$1",
            [owner],
          )
        ).rows[0].status,
        "pending",
      );
      await make().reconcile();
      assert.deepEqual(
        calls,
        ["reset", "add"],
        "the existing assistant must be reset before a memory is added, even from 'pending'",
      );
      assert.equal(resets, 1);
      assert.equal(adds, 1);
      assert.equal((await make().status(owner)).status, "synced");
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
test(
  "a profile that expires while the assistant is being created must never receive memory content",
  { skip: !connectionString },
  async () => {
    const admin = new Pool({ connectionString });
    const schema = `memory_expiry_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    const owner = randomUUID(),
      profile = randomUUID(),
      assistant = randomUUID();
    let adds = 0;
    const entered = Promise.withResolvers<void>(),
      resume = Promise.withResolvers<void>();
    const provider = {
      createAssistant: async () => {
        entered.resolve();
        await resume.promise;
        return assistant;
      },
      addMemory: async (_id: string, content: string) => {
        adds++;
        return { id: "memory-1", content };
      },
      updateMemory: async (_id: string, id: string, content: string) => ({
        id,
        content,
      }),
      resetMemories: async () => {},
      deleteAssistant: async () => {},
    };
    const make = () => new BackboardSync(pool, provider, true);
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        "CREATE TABLE resume_profile_heads(id uuid PRIMARY KEY,owner_id uuid NOT NULL,current_version integer NOT NULL,expires_at timestamptz NOT NULL,UNIQUE(id,owner_id))",
      );
      for (const file of [
        "004-career-plans",
        "007-account-interests",
        "008-backboard-storage",
      ])
        await pool.query(await readFile(`migrations/${file}.sql`, "utf8"));
      await pool.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1::uuid,'test',$1::text)",
        [owner],
      );
      await pool.query(
        "INSERT INTO resume_profile_heads VALUES($1,$2,1,now()+interval '1 day')",
        [profile, owner],
      );
      await pool.query(
        "INSERT INTO opportunity_catalog_state VALUES(true,'v1')",
      );
      const snapshot = {
        profileId: profile,
        profileVersion: 1,
        catalogVersion: "v1",
        planVersion: 0,
        interestVersion: 0,
        content: '{"field":"software","steps":[]}',
      };
      await make().queue(owner, snapshot);
      const pending = make().reconcile();
      await entered.promise;
      // The profile expires while createAssistant() is still in flight.
      await pool.query(
        "UPDATE resume_profile_heads SET expires_at=now()-interval '1 second' WHERE id=$1",
        [profile],
      );
      resume.resolve();
      await pending;
      assert.equal(
        adds,
        0,
        "memory content must never be sent once the profile has expired mid-flight",
      );
      const status = (await make().status(owner)).status;
      assert.notEqual(
        status,
        "synced",
        "the revision must not be marked synced when it was never actually written",
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
