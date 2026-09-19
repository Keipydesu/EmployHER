import { test } from "node:test";
import assert from "node:assert/strict";
import { BackboardStorage } from "../src/server/platform/backboard.ts";
const id = "123e4567-e89b-42d3-a456-426614174000";
test("Backboard stores context through bounded direct memory operations without chat calls", async () => {
  const seen: { url: string; method: string; body: unknown }[] = [];
  const api = new BackboardStorage("synthetic-key", async (input, init) => {
    const url = String(input);
    assert.equal(new Headers(init?.headers).get("X-API-Key"), "synthetic-key");
    assert.equal(init?.redirect, "error");
    assert.ok(init?.signal);
    seen.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (url.endsWith("/assistants")) return Response.json({ assistant_id: id });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    if (init?.method === "POST")
      return Response.json({
        success: true,
        memory_id: "memory/a",
        content: "Opted-in synthetic plan",
      });
    return Response.json({
      id: "memory/a",
      content: "Opted-in synthetic plan",
      metadata: { version: 1 },
    });
  });
  assert.equal(await api.createAssistant(`employher-${id}`), id);
  assert.equal(
    (await api.addMemory(id, "Opted-in synthetic plan", { version: 1 })).id,
    "memory/a",
  );
  await api.updateMemory(id, "memory/a", "Opted-in synthetic plan", {
    version: 1,
  });
  await api.getMemory(id, "memory/a");
  await api.deleteMemory(id, "memory/a");
  await api.deleteAssistant(id);
  assert.deepEqual(
    seen.map((r) => r.method),
    ["POST", "POST", "PUT", "GET", "DELETE", "DELETE"],
  );
  assert.ok(seen[2].url.endsWith("/memories/memory%2Fa"));
  assert.ok(seen.every((r) => !r.url.includes("messages")));
  assert.ok(
    !JSON.stringify(seen[0].body).includes("Opted-in synthetic plan"),
    "empty assistant creation precedes user context storage",
  );
});
test("Backboard fails closed on bad identifiers, oversized bodies, foreign memory IDs and provider errors", async () => {
  for (const response of [
    { success: false, memory_id: "memory", content: "context" },
    { success: true, content: "context" },
    { id: "memory", content: "context" },
  ]) {
    const api = new BackboardStorage("synthetic-key", async () =>
      Response.json(response),
    );
    await assert.rejects(
      () => api.addMemory(id, "context", {}),
      /did not confirm/,
    );
  }
  let calls = 0;
  const invalid = new BackboardStorage("key", async () => {
    calls++;
    return Response.json({ id: "foreign", content: "context" });
  });
  await assert.rejects(() => invalid.getMemory("not-an-id", "memory"));
  assert.equal(calls, 0);
  await assert.rejects(
    () => invalid.getMemory(id, "memory"),
    /different context identifier/,
  );
  const oversized = new BackboardStorage(
    "key",
    async () => new Response("x".repeat(129 * 1024)),
  );
  await assert.rejects(
    () => oversized.getMemory(id, "memory"),
    /could not be verified/,
  );
  const fail = new BackboardStorage(
    "key",
    async () => new Response("secret upstream detail", { status: 500 }),
  );
  await assert.rejects(
    () => fail.getMemory(id, "memory"),
    (e) =>
      e instanceof Error &&
      !e.message.includes("secret") &&
      e.message.includes("unavailable"),
  );
  const gone = new BackboardStorage(
    "key",
    async () => new Response(null, { status: 404 }),
  );
  await gone.deleteAssistant(id);
  await assert.rejects(
    () => new BackboardStorage("").createAssistant(`employher-${id}`),
    /not configured/,
  );
});
