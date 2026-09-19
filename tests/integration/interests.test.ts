import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { AccountInterests } from "../../src/server/platform/interests.ts";
import { PostgresOperations } from "../../src/server/platform/operations.ts";
const connectionString = process.env.TEST_DATABASE_URL;
test(
  "account interests survive restart, isolate owners, reject stale writes and preserve replay",
  { skip: !connectionString },
  async () => {
    const admin = new Pool({ connectionString });
    const schema = `interests_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    const owner = randomUUID(),
      other = randomUUID();
    const make = () =>
      new AccountInterests(drizzle(pool), new PostgresOperations(pool));
    try {
      for (const file of ["001-platform", "007-account-interests"])
        await pool.query(await readFile(`migrations/${file}.sql`, "utf8"));
      for (const id of [owner, other])
        await pool.query(
          "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1::uuid,'test',$1::text)",
          [id],
        );
      assert.deepEqual(await make().read(owner), { version: 0, fields: [] });
      const first = await make().update(
        owner,
        { expectedVersion: 0, fields: ["ml", "software"] },
        "interest-key",
      );
      assert.deepEqual(await make().read(owner), first);
      assert.deepEqual(await make().read(other), { version: 0, fields: [] });
      await make().update(
        owner,
        { expectedVersion: 1, fields: ["hardware"] },
        "interest-next",
      );
      assert.deepEqual(
        await make().update(
          owner,
          { expectedVersion: 0, fields: ["ml", "software"] },
          "interest-key",
        ),
        first,
      );
      assert.deepEqual((await make().read(owner)).fields, ["hardware"]);
      await assert.rejects(
        () =>
          make().update(
            owner,
            { expectedVersion: 0, fields: ["quant"] },
            "stale-interest",
          ),
        /interests changed/,
      );
      await assert.rejects(() =>
        make().update(
          owner,
          { expectedVersion: 2, fields: ["ml", "ml"] },
          "duplicate-interest",
        ),
      );
      await pool.query(
        "UPDATE app_users SET deletion_requested_at=now() WHERE id=$1",
        [owner],
      );
      await assert.rejects(() => make().read(owner), /unavailable/);
      await assert.rejects(
        () =>
          make().update(
            owner,
            { expectedVersion: 0, fields: ["ml", "software"] },
            "interest-key",
          ),
        /unavailable/,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
