import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jobs,
  paths,
  resources,
  profiles,
} from "../src/opportunities/catalog.ts";
import {
  freshPlan,
  changePlan,
  reconcilePlan,
} from "../src/opportunities/saved-plan.ts";
const catalog = { jobs, paths, resources, version: "test-v1" };
const profile = profiles[0];
function withAction() {
  let plan = freshPlan(profile, catalog);
  plan.plan.pathId = "cloud";
  plan = changePlan(plan, profile, catalog, {
    kind: "confirm-gap",
    skill: "cloud",
    expectedVersion: 0,
  });
  return changePlan(plan, profile, catalog, {
    kind: "select-action",
    skill: "cloud",
    expectedVersion: 1,
  });
}
test("profile identity, version, catalog and checklist changes retain stale action history and clear confirmations", () => {
  const saved = withAction();
  for (const [p, c] of [
    [{ ...profile, id: "different-profile" }, catalog],
    [{ ...profile, version: profile.version + 1 }, catalog],
    [profile, { ...catalog, version: "test-v2" }],
    [
      profile,
      {
        ...catalog,
        paths: paths.map((p) => ({ ...p, version: p.version + 1 })),
      },
    ],
  ] as const) {
    const next = reconcilePlan(saved, p, c);
    assert.equal(next.version, saved.version);
    assert.equal(next.plan.confirmations.length, 0);
    assert.deepEqual(
      next.staleActionIds,
      saved.plan.actions.map((a) => a.id),
    );
    assert.deepEqual(next.plan.actions, saved.plan.actions);
    assert.deepEqual(
      reconcilePlan(next, p, c).staleActionIds,
      next.staleActionIds,
    );
  }
});
test("preference changes invalidate confirmations; completing an action never manufactures evidence", () => {
  const saved = withAction();
  const originalEvidence = structuredClone(profile.evidence);
  const changed = changePlan(saved, profile, catalog, {
    kind: "preferences",
    expectedVersion: saved.version,
    preferences: { ...saved.preferences, remote: "remote" },
  });
  assert.equal(changed.plan.confirmations.length, 0);
  assert.equal(changed.preferenceVersion, 2);
  assert.equal(changed.staleActionIds.length, 1);
  const done = changePlan(changed, profile, catalog, {
    kind: "action-state",
    expectedVersion: changed.version,
    actionId: changed.plan.actions[0].id,
    state: "done",
  });
  assert.equal(done.plan.actions[0].state, "done");
  assert.deepEqual(done.staleActionIds, changed.staleActionIds);
  assert.deepEqual(profile.evidence, originalEvidence);
});
test("private planning rejects fixture evidence commands, stale writes and duplicate actions", () => {
  const saved = withAction();
  assert.throws(
    () =>
      changePlan(saved, profile, catalog, {
        kind: "add-evidence",
        skill: "cloud",
        expectedVersion: saved.version,
      }),
    /profile review/,
  );
  assert.throws(
    () =>
      changePlan(saved, profile, catalog, {
        kind: "confirm-gap",
        skill: "cloud",
        expectedVersion: 0,
      }),
    /view changed/,
  );
  assert.throws(
    () =>
      changePlan(saved, profile, catalog, {
        kind: "select-action",
        skill: "cloud",
        expectedVersion: saved.version,
      }),
    /already saved/,
  );
});

test("Gemini actions require verified server content, share the active cap, and preserve completion history", () => {
  const recommendation = {
    title: "Explore a community",
    kind: "community" as const,
    why: "Find project feedback",
    deliverable: "Attend one session",
    basis: "explore_requirement" as const,
    factIds: [],
    sourceIds: ["reviewed"],
    resourceIds: ["community"],
    learningNeed: "not_claimed" as const,
    skill: null,
  };
  let saved = freshPlan(profile, catalog);
  const command = {
    kind: "select-recommendation",
    contextHash: "a".repeat(64),
    index: 0,
    expectedVersion: 0,
  };
  assert.throws(
    () => changePlan(saved, profile, catalog, command),
    /verified recommendation/,
  );
  for (let index = 0; index < 3; index++)
    saved = changePlan(
      saved,
      profile,
      catalog,
      { ...command, index, expectedVersion: saved.version },
      new Date(),
      recommendation,
    );
  assert.equal(saved.plan.actions.length, 3);
  assert.throws(
    () =>
      changePlan(
        saved,
        profile,
        catalog,
        {
          ...command,
          contextHash: "b".repeat(64),
          expectedVersion: saved.version,
        },
        new Date(),
        recommendation,
      ),
    /three active/,
  );
  saved = changePlan(saved, profile, catalog, {
    kind: "action-state",
    expectedVersion: saved.version,
    actionId: saved.plan.actions[0].id,
    state: "done",
  });
  saved = changePlan(
    saved,
    profile,
    catalog,
    { ...command, contextHash: "b".repeat(64), expectedVersion: saved.version },
    new Date(),
    recommendation,
  );
  assert.equal(saved.plan.actions.length, 4);
  assert.equal(
    saved.plan.actions.filter((a) => a.state === "selected").length,
    3,
  );
  assert.equal(saved.plan.actions[0].state, "done");
});
