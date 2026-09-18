import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateLocalOrigin } from "../src/server/origin.ts";
import { OpportunityError } from "../src/opportunities/engine.ts";

describe("validateLocalOrigin: host/hostname gating", () => {
  test("accepts a loopback host with no Origin header (a plain GET)", () => {
    const origin = validateLocalOrigin("127.0.0.1:3000", "http:");
    assert.equal(origin, "http://127.0.0.1:3000");
  });
  test("accepts localhost and IPv6 loopback too", () => {
    assert.equal(
      validateLocalOrigin("localhost:3000", "http:"),
      "http://localhost:3000",
    );
    assert.equal(
      validateLocalOrigin("[::1]:3000", "http:"),
      "http://[::1]:3000",
    );
  });
  test("rejects a non-loopback Host header, even a syntactically valid one", () => {
    assert.throws(
      () => validateLocalOrigin("example.com:3000", "http:"),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "DEMO_LOCAL_ONLY",
    );
  });
  test("rejects a malformed Host header rather than throwing an unhandled error", () => {
    assert.throws(
      () => validateLocalOrigin("not a valid host!!", "http:"),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "DEMO_LOCAL_ONLY",
    );
  });
  test("rejects a missing Host header", () => {
    assert.throws(
      () => validateLocalOrigin(null, "http:"),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "DEMO_LOCAL_ONLY",
    );
  });
});

describe("validateLocalOrigin: same-origin gating for mutating requests", () => {
  test("127.0.0.1 Host with a matching 127.0.0.1 Origin succeeds (the originally reported bug)", () => {
    const origin = validateLocalOrigin(
      "127.0.0.1:3002",
      "http:",
      "http://127.0.0.1:3002",
    );
    assert.equal(origin, "http://127.0.0.1:3002");
  });
  test("localhost Host with a matching localhost Origin succeeds", () => {
    const origin = validateLocalOrigin(
      "localhost:3002",
      "http:",
      "http://localhost:3002",
    );
    assert.equal(origin, "http://localhost:3002");
  });
  test("a Host/Origin hostname MISMATCH is rejected (127.0.0.1 Host, localhost Origin) even though both are loopback", () => {
    assert.throws(
      () =>
        validateLocalOrigin("127.0.0.1:3002", "http:", "http://localhost:3002"),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "INVALID_ORIGIN",
    );
  });
  test("a hostile cross-site Origin is rejected", () => {
    assert.throws(
      () =>
        validateLocalOrigin("127.0.0.1:3002", "http:", "https://evil.example"),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "INVALID_ORIGIN",
    );
  });
  test("a missing Origin header on what should be a same-origin request is rejected", () => {
    assert.throws(
      () => validateLocalOrigin("127.0.0.1:3002", "http:", null),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "INVALID_ORIGIN",
    );
  });
});
