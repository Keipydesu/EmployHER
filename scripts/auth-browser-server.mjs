import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { Pool } from "pg";

// This harness never reads .env or connects to a non-loopback database.
const url = new URL(process.env.TEST_DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
  throw new Error("Use a disposable loopback TEST_DATABASE_URL.");
const admin = new Pool({ connectionString: url.toString() });
const schema = `auth_browser_${randomUUID().replaceAll("-", "")}`;
await admin.query(`CREATE SCHEMA ${schema}`);
url.searchParams.set("options", `-c search_path=${schema}`);
const db = new Pool({ connectionString: url.toString() });
let child;
let stopping = false;
async function cleanup() {
  await db.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
try {
  for (const name of ["001-platform", "003-lifecycle", "007-account-interests"])
    await db.query(await readFile(`migrations/${name}.sql`, "utf8"));
  await db.query(
    "CREATE TABLE profile_owner_lifecycle(owner_id uuid PRIMARY KEY, deleted_at timestamptz)",
  );
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3101",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_TEST_OUTPUT: "auth",
        APP_BASE_URL: "http://127.0.0.1:3101",
        AUTH0_DOMAIN: "employher-browser-test.invalid",
        AUTH0_CLIENT_ID: "synthetic-client",
        AUTH0_CLIENT_SECRET: "synthetic-secret",
        AUTH0_SECRET: "a".repeat(64),
        DATABASE_URL: url.toString(),
        DATABASE_ALLOW_INSECURE_LOCAL: "true",
        PLATFORM_ENABLED: "true",
        GEMINI_API_KEY: "synthetic-browser-test-not-a-real-key",
        GEMINI_MODEL: "synthetic-test-model",
        GEMINI_EMBEDDING_MODEL: "gemini-embedding-001",
        BACKBOARD_API_KEY: "",
      },
    },
  );
  const stop = () => {
    if (stopping) return;
    stopping = true;
    child.kill("SIGTERM");
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  process.exitCode = stopping ? 0 : (code ?? 1);
} finally {
  await cleanup();
}
