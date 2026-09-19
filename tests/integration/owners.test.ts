import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isolatedDatabase } from "./isolated-database.ts";
import { Owners } from "../../src/server/platform/owners.ts";
const connectionString = process.env.TEST_DATABASE_URL;
test(
  "database owner mapping isolates issuers, persists identity, blocks deleted accounts and caps writes",
  { skip: !connectionString },
  async () => {
    const { pool, cleanup } = await isolatedDatabase(connectionString!);
    const owners = new Owners(pool);
    const subject = randomUUID();
    let first = "",
      second = "";
    try {
      await pool.query(await readFile("migrations/001-platform.sql", "utf8"));
      await pool.query(
        await readFile("migrations/007-account-interests.sql", "utf8"),
      );
      await pool.query(
        await readFile("migrations/008-backboard-storage.sql", "utf8"),
      );
      await assert.rejects(() => owners.resolve(null), /Sign in/);
      first = await owners.resolve({
        issuer: "https://issuer-a.test",
        subject,
      });
      assert.equal(
        await owners.resolve({ issuer: "https://issuer-a.test", subject }),
        first,
      );
      second = await owners.resolve({
        issuer: "https://issuer-b.test",
        subject,
      });
      assert.notEqual(second, first);
      await owners.recordConsent(first, "local-resume-v1");
      const consent = await pool.query(
        "SELECT consent_version,consent_at FROM app_users WHERE id=$1",
        [first],
      );
      assert.equal(consent.rows[0].consent_version, "local-resume-v1");
      assert(consent.rows[0].consent_at instanceof Date);
      assert.equal(
        (
          await pool.query(
            "SELECT consent_version FROM app_users WHERE id=$1",
            [second],
          )
        ).rows[0].consent_version,
        null,
      );
      for (let i = 0; i < 30; i++)
        await owners.resolve(
          { issuer: "https://issuer-a.test", subject },
          true,
        );
      await assert.rejects(
        () =>
          owners.resolve({ issuer: "https://issuer-a.test", subject }, true),
        /Daily processing limit/,
      );
      assert.equal(
        await owners.resolve({ issuer: "https://issuer-a.test", subject }),
        first,
      );
      await pool.query(
        "UPDATE app_users SET deletion_requested_at=now() WHERE id=$1",
        [second],
      );
      await assert.rejects(
        () => owners.resolve({ issuer: "https://issuer-b.test", subject }),
        /deletion/,
      );
      await assert.rejects(
        () => owners.recordConsent(second, "local-resume-v1"),
        /unavailable/,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT consent_version FROM app_users WHERE id=$1",
            [second],
          )
        ).rows[0].consent_version,
        null,
      );
    } finally {
      await pool.query("DELETE FROM app_request_quotas WHERE scope=ANY($1)", [
        [first, second],
      ]);
      await pool.query("DELETE FROM app_users WHERE auth_subject=$1", [
        subject,
      ]);
      await cleanup();
    }
  },
);
