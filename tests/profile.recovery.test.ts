import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileAfterSessionRecovery } from "../src/profile/recovery.ts";
import type { PublicProfile } from "../src/profile/contracts.ts";

function freshProfile(
  facts: { id: string; kind: "skill" | "experience"; label: string }[],
): PublicProfile {
  return {
    profileId: "new-profile",
    version: 1,
    status: "draft",
    facts: facts.map((f) => ({
      id: f.id,
      kind: f.kind,
      label: f.label,
      detail: "",
      dateText: null,
      evidence: { source: "resume", excerpt: f.label, start: 0, end: 1 },
    })),
  } as unknown as PublicProfile;
}

test("unedited facts are reattached to the fresh extraction's IDs by position and content", () => {
  const original = [
    {
      id: "old-1",
      kind: "skill" as const,
      label: "Python",
      detail: "",
      dateText: null,
    },
    {
      id: "old-2",
      kind: "skill" as const,
      label: "SQL",
      detail: "",
      dateText: null,
    },
  ];
  const fresh = freshProfile([
    { id: "fresh-1", kind: "skill", label: "Python" },
    { id: "fresh-2", kind: "skill", label: "SQL" },
  ]);
  const reconciled = reconcileAfterSessionRecovery(fresh, original, original);
  assert.deepEqual(
    reconciled.map((e) => e.id),
    ["fresh-1", "fresh-2"],
  );
});

test("an edited fact keeps the user's edit but adopts the fresh extraction's ID at that position", () => {
  const original = [
    {
      id: "old-1",
      kind: "skill" as const,
      label: "Python",
      detail: "",
      dateText: null,
    },
  ];
  const edited = [
    {
      id: "old-1",
      kind: "skill" as const,
      label: "Python basics",
      detail: "",
      dateText: null,
    },
  ];
  const fresh = freshProfile([
    { id: "fresh-1", kind: "skill", label: "Python" },
  ]);
  const reconciled = reconcileAfterSessionRecovery(fresh, original, edited);
  assert.deepEqual(reconciled, [
    {
      id: "fresh-1",
      kind: "skill",
      label: "Python basics",
      detail: "",
      dateText: null,
    },
  ]);
});

test("a fact added after extraction (new- id) survives recovery untouched", () => {
  const original = [
    {
      id: "old-1",
      kind: "skill" as const,
      label: "Python",
      detail: "",
      dateText: null,
    },
  ];
  const edited = [
    ...original,
    {
      id: "new-abc",
      kind: "experience" as const,
      label: "Volunteered",
      detail: "",
      dateText: null,
    },
  ];
  const fresh = freshProfile([
    { id: "fresh-1", kind: "skill", label: "Python" },
  ]);
  const reconciled = reconcileAfterSessionRecovery(fresh, original, edited);
  assert.deepEqual(
    reconciled.map((e) => e.id),
    ["fresh-1", "new-abc"],
  );
});

test("a removed fact stays removed after recovery", () => {
  const original = [
    {
      id: "old-1",
      kind: "skill" as const,
      label: "Python",
      detail: "",
      dateText: null,
    },
    {
      id: "old-2",
      kind: "skill" as const,
      label: "SQL",
      detail: "",
      dateText: null,
    },
  ];
  const edited = [original[0]];
  const fresh = freshProfile([
    { id: "fresh-1", kind: "skill", label: "Python" },
    { id: "fresh-2", kind: "skill", label: "SQL" },
  ]);
  const reconciled = reconcileAfterSessionRecovery(fresh, original, edited);
  assert.deepEqual(
    reconciled.map((e) => e.id),
    ["fresh-1"],
  );
});

test("when position/content no longer lines up, the edit falls back to a fresh user-reported id instead of a wrong match", () => {
  const original = [
    {
      id: "old-1",
      kind: "skill" as const,
      label: "Python",
      detail: "",
      dateText: null,
    },
  ];
  const edited = [
    {
      id: "old-1",
      kind: "skill" as const,
      label: "Python",
      detail: "",
      dateText: null,
    },
  ];
  // Fresh extraction no longer has a matching slot at position 0 (different content).
  const fresh = freshProfile([{ id: "fresh-1", kind: "skill", label: "SQL" }]);
  const reconciled = reconcileAfterSessionRecovery(fresh, original, edited);
  assert.equal(reconciled.length, 1);
  assert.notEqual(reconciled[0].id, "fresh-1");
  assert.match(reconciled[0].id, /^new-/);
});
