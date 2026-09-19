import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseConfig } from "../src/server/platform/database.ts";
test("database connections verify TLS unless explicitly allowed on loopback", () => {
  assert.deepEqual(
    databaseConfig({ DATABASE_URL: "postgres://host/db?sslmode=disable" }).ssl,
    { rejectUnauthorized: true },
  );
  assert.equal(
    databaseConfig({
      DATABASE_URL: "postgres://127.0.0.1/db",
      DATABASE_ALLOW_INSECURE_LOCAL: "true",
    }).ssl,
    false,
  );
  assert.deepEqual(
    databaseConfig({
      DATABASE_URL: "postgres://host/db",
      DATABASE_ALLOW_INSECURE_LOCAL: "true",
    }).ssl,
    { rejectUnauthorized: true },
  );
  assert.ok(
    !databaseConfig({
      DATABASE_URL: "postgres://host/db?sslmode=no-verify",
    }).connectionString!.includes("sslmode"),
  );
  assert.throws(() => databaseConfig({ DATABASE_URL: "https://host/db" }));
});
