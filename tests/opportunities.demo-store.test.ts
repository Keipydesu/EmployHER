import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DemoStore } from "../src/server/demo-store.ts";
import { OpportunityError } from "../src/opportunities/engine.ts";

let dir: string;
let store: DemoStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "employher-demo-"));
  store = new DemoStore(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("DemoStore.create / read", () => {
  test("creates a session with a fresh initial state and a 64-hex-char token", () => {
    const created = store.create();
    assert.match(created.token, /^[a-f0-9]{64}$/);
    assert.equal(created.state.version, 1);
  });
  test("read() returns null for an unknown token", () => {
    assert.equal(store.read("a".repeat(64)), null);
  });
  test("read() expires and deletes a session past its TTL", () => {
    const created = store.create(0);
    assert.equal(store.read(created.token, created.expiresAt + 1), null);
    assert.equal(readdirSync(dir).length, 0);
  });
  test("rejects a malformed token instead of treating it as a valid path segment", () => {
    assert.throws(
      () => store.read("../../etc/passwd"),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "SESSION_REQUIRED",
    );
  });
  test("enforces a session-count capacity limit", () => {
    for (let i = 0; i < 100; i++) store.create(1_000_000 + i);
    assert.throws(
      () => store.create(1_000_000),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "DEMO_CAPACITY",
    );
  });
});

describe("DemoStore.update: version and validation", () => {
  test("rejects a malformed idempotency key", () => {
    const created = store.create();
    assert.throws(
      () =>
        store.update(
          created.token,
          { kind: "reset", expectedVersion: 1 },
          "short",
        ),
      (error: unknown) =>
        error instanceof OpportunityError &&
        error.code === "IDEMPOTENCY_KEY_REQUIRED",
    );
  });
  test("SESSION_EXPIRED for an unknown/expired token", () => {
    assert.throws(
      () =>
        store.update(
          "b".repeat(64),
          { kind: "reset", expectedVersion: 1 },
          "a-valid-key-1",
        ),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "SESSION_EXPIRED",
    );
  });
  test("a different input under the same key is an idempotency conflict, never a silent overwrite", () => {
    const created = store.create();
    store.update(
      created.token,
      { kind: "profile", expectedVersion: 1, profileId: "cloud" },
      "shared-key-0001",
    );
    assert.throws(
      () =>
        store.update(
          created.token,
          { kind: "profile", expectedVersion: 1, profileId: "maya" },
          "shared-key-0001",
        ),
      (error: unknown) =>
        error instanceof OpportunityError &&
        error.code === "IDEMPOTENCY_CONFLICT",
    );
  });
});

describe("DemoStore.update: idempotency replay must return the ORIGINAL result", () => {
  test("replaying an old key after later commands ran under different keys returns what that key originally produced, not the current state", () => {
    const created = store.create();
    const afterA = store.update(
      created.token,
      { kind: "profile", expectedVersion: 1, profileId: "cloud" },
      "key-aaaaaaaa",
    );
    const originalVersion = afterA.state.version;
    const originalPreferences = afterA.state.preferences;

    // A second, unrelated command runs under a different key and moves the
    // session forward.
    store.update(
      created.token,
      {
        kind: "preferences",
        expectedVersion: afterA.state.version,
        preferences: {
          roleType: "internship",
          remote: "any",
          location: "any",
          inclusion: [],
        },
      },
      "key-bbbbbbbb",
    );

    // Replaying the FIRST key must reproduce exactly what that operation
    // originally returned (api.md: "a replay returns the stored result"),
    // not whatever the session's latest state happens to be now.
    const replay = store.update(
      created.token,
      { kind: "profile", expectedVersion: 1, profileId: "cloud" },
      "key-aaaaaaaa",
    );
    assert.equal(replay.replayed, true);
    assert.equal(
      replay.state.version,
      originalVersion,
      "replay must return the state as of the original operation, not the session's current version",
    );
    assert.deepEqual(
      replay.state.preferences,
      originalPreferences,
      "replay leaked a later, unrelated command's effect (preferences) into an earlier operation's result",
    );
  });
});

describe("DemoStore.delete", () => {
  test("deletes a session file and is a no-op for an already-missing one", () => {
    const created = store.create();
    store.delete(created.token);
    assert.equal(store.read(created.token), null);
    assert.doesNotThrow(() => store.delete(created.token));
  });
});
