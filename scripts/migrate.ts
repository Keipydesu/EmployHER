import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createDatabase } from "../src/server/platform/database.ts";
async function main() {
  const { pool } = createDatabase();
  const files = [
    "migrations/001-platform.sql",
    "src/profile/schema.sql",
    "migrations/002-profile-ownership.sql",
    "migrations/003-lifecycle.sql",
    "migrations/004-career-plans.sql",
    "migrations/005-reviewed-catalog.sql",
    "migrations/006-career-analyses.sql",
    "migrations/007-account-interests.sql",
    "migrations/008-backboard-storage.sql",
  ];
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(76543521)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, digest text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const file of files) {
      const body = await readFile(file, "utf8");
      const digest = createHash("sha256").update(body).digest("hex");
      const prior = await client.query(
        "SELECT digest FROM app_migrations WHERE name=$1",
        [file],
      );
      if (prior.rowCount) {
        if (prior.rows[0].digest !== digest)
          throw new Error("Applied migration changed; create a new migration.");
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(body);
        await client.query(
          "INSERT INTO app_migrations(name,digest) VALUES($1,$2)",
          [file, digest],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      console.log(`Applied ${file}`);
    }
  } catch {
    console.error(
      "Migration failed. Check database access, pgvector availability and migration history. No connection details are logged.",
    );
    process.exitCode = 1;
  } finally {
    await client.query("SELECT pg_advisory_unlock(76543521)");
    client.release();
    await pool.end();
  }
}
void main().catch(() => {
  console.error("Migration could not start. Check database configuration.");
  process.exitCode = 1;
});
