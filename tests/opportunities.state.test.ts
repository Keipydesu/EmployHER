import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  applyCommand,
  present,
  hasConfirmation,
} from "../src/opportunities/state.ts";
import { OpportunityError } from "../src/opportunities/engine.ts";
import type { Command } from "../src/opportunities/contracts.ts";

function apply(state: ReturnType<typeof initialState>, command: Command) {
  return applyCommand(state, command);
}

describe("applyCommand: versioning", () => {
  test("a stale expectedVersion is rejected with STALE_VERSION / 409", () => {
    const state = initialState();
    assert.throws(
      () => apply(state, { kind: "reset", expectedVersion: state.version + 1 }),
      (error: unknown) =>
        error instanceof OpportunityError &&
        error.code === "STALE_VERSION" &&
        error.status === 409,
    );
  });
  test("every successful command increments state and plan version together", () => {
    const state = initialState();
    const next = apply(state, {
      kind: "reset",
      expectedVersion: state.version,
    });
    assert.equal(next.version, state.version + 1);
    assert.equal(next.plan.version, next.version);
  });
});

describe("applyCommand: profile switching", () => {
  test("switching profiles clears learning-gap confirmations (they're tied to the old profile version)", () => {
    let state = initialState();
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "cloud",
    });
    assert.ok(state.plan.confirmations.length > 0);
    state = apply(state, {
      kind: "profile",
      expectedVersion: state.version,
      profileId: "maya",
    });
    assert.equal(state.plan.confirmations.length, 0);
    assert.equal(state.profile.id, "maya");
  });
});

describe("applyCommand: add-evidence", () => {
  test("adding evidence for a skill already evidenced does not duplicate it", () => {
    let state = initialState(); // starter profile has cloud path selected, no evidence
    state = apply(state, {
      kind: "add-evidence",
      expectedVersion: state.version,
      skill: "python",
    });
    const before = state.profile.evidence.filter(
      (e) => e.skill === "python",
    ).length;
    state = apply(state, {
      kind: "add-evidence",
      expectedVersion: state.version,
      skill: "python",
    });
    const after = state.profile.evidence.filter(
      (e) => e.skill === "python",
    ).length;
    assert.equal(before, 1);
    assert.equal(after, 1);
  });
  test("adding evidence re-embeds the profile and clears existing confirmations", () => {
    let state = initialState();
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "monitoring",
    });
    assert.ok(state.plan.confirmations.length > 0);
    state = apply(state, {
      kind: "add-evidence",
      expectedVersion: state.version,
      skill: "python",
    });
    assert.equal(state.plan.confirmations.length, 0);
  });
});

describe("applyCommand: confirm-gap", () => {
  test("throws ALREADY_EVIDENCED for a skill the profile already evidences", () => {
    let state = initialState();
    state = apply(state, {
      kind: "profile",
      expectedVersion: state.version,
      profileId: "cloud",
    });
    assert.throws(
      () =>
        apply(state, {
          kind: "confirm-gap",
          expectedVersion: state.version,
          skill: "python",
        }),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "ALREADY_EVIDENCED",
    );
  });
  test("records a confirmation tied to the current profile and checklist version", () => {
    let state = initialState();
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "cloud",
    });
    const confirmation = state.plan.confirmations.find(
      (c) => c.skill === "cloud",
    );
    assert.ok(confirmation);
    assert.equal(confirmation!.profileVersion, state.profile.version);
    assert.equal(hasConfirmation(state, "cloud"), true);
  });
  test("re-confirming the same skill replaces rather than duplicates the record", () => {
    let state = initialState();
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "cloud",
    });
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "cloud",
    });
    assert.equal(
      state.plan.confirmations.filter((c) => c.skill === "cloud").length,
      1,
    );
  });
  test("a bumped profile version makes a prior confirmation stale (hasConfirmation goes false without a new confirm)", () => {
    let state = initialState();
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "monitoring",
    });
    assert.equal(hasConfirmation(state, "monitoring"), true);
    // Any profile-affecting command bumps profile.version; this one specifically
    // still targets the same skill after evidence is unrelated, but a profile
    // switch is the clean way to move the version forward.
    state = apply(state, {
      kind: "profile",
      expectedVersion: state.version,
      profileId: "starter",
    });
    assert.equal(hasConfirmation(state, "monitoring"), false);
  });
});

describe("applyCommand: select-action", () => {
  test("requires a persisted confirmation first (CONFIRMATION_REQUIRED)", () => {
    const state = initialState();
    assert.throws(
      () =>
        apply(state, {
          kind: "select-action",
          expectedVersion: state.version,
          skill: "cloud",
        }),
      (error: unknown) =>
        error instanceof OpportunityError &&
        error.code === "CONFIRMATION_REQUIRED",
    );
  });
  test("caps active (selected) actions at three", () => {
    let state = initialState();
    // "starter" has no evidence at all, so every cloud-path checkpoint is a gap.
    state = apply(state, {
      kind: "profile",
      expectedVersion: state.version,
      profileId: "starter",
    });
    const skills = ["cloud", "access", "monitoring", "python"] as const;
    for (const skill of skills.slice(0, 3)) {
      state = apply(state, {
        kind: "confirm-gap",
        expectedVersion: state.version,
        skill,
      });
      state = apply(state, {
        kind: "select-action",
        expectedVersion: state.version,
        skill,
      });
    }
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: skills[3],
    });
    assert.throws(
      () =>
        apply(state, {
          kind: "select-action",
          expectedVersion: state.version,
          skill: skills[3],
        }),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "ACTION_LIMIT",
    );
  });
  test("marking an action done never changes evidence-based coverage (evidence state and action state are independent)", () => {
    let state = initialState();
    const before = present(state).paths.find((p) => p.id === "cloud")!.coverage;
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "cloud",
    });
    state = apply(state, {
      kind: "select-action",
      expectedVersion: state.version,
      skill: "cloud",
    });
    const action = state.plan.actions[0];
    state = apply(state, {
      kind: "action-state",
      expectedVersion: state.version,
      actionId: action.id,
      state: "done",
    });
    const after = present(state).paths.find((p) => p.id === "cloud")!.coverage;
    assert.equal(before, after);
    assert.equal(state.plan.actions[0].state, "done");
  });
  test("removing an action drops it from the plan", () => {
    let state = initialState();
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "cloud",
    });
    state = apply(state, {
      kind: "select-action",
      expectedVersion: state.version,
      skill: "cloud",
    });
    const action = state.plan.actions[0];
    state = apply(state, {
      kind: "action-state",
      expectedVersion: state.version,
      actionId: action.id,
      state: "remove",
    });
    assert.equal(state.plan.actions.length, 0);
  });
  test("NOT_FOUND for an action ID that doesn't exist", () => {
    const state = initialState();
    assert.throws(
      () =>
        apply(state, {
          kind: "action-state",
          expectedVersion: state.version,
          actionId: "does-not-exist",
          state: "done",
        }),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "NOT_FOUND",
    );
  });
});

describe("applyCommand: path", () => {
  test("NOT_FOUND for an unknown path ID", () => {
    const state = initialState();
    assert.throws(
      () =>
        apply(state, {
          kind: "path",
          expectedVersion: state.version,
          pathId: "not-a-real-path",
        }),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "NOT_FOUND",
    );
  });
});

describe("present: staleActions", () => {
  test("a saved action becomes stale once the profile version moves past it, and is reported, not silently dropped", () => {
    let state = initialState();
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "cloud",
    });
    state = apply(state, {
      kind: "select-action",
      expectedVersion: state.version,
      skill: "cloud",
    });
    const actionId = state.plan.actions[0].id;
    state = apply(state, {
      kind: "add-evidence",
      expectedVersion: state.version,
      skill: "git",
    });
    const view = present(state);
    assert.ok(view.staleActions.includes(actionId));
    assert.ok(state.plan.actions.some((a) => a.id === actionId));
  });
});

describe("present: confirmed gaps become not_evidenced (never before confirmation)", () => {
  test("a match's gap stays needs_confirmation until the user persists a confirmation for that skill", () => {
    const state = initialState();
    const before = present(state)
      .matches.flatMap((m) => m.gaps)
      .find((g) => g.skill === "cloud");
    assert.ok(before);
    assert.equal(before!.state, "needs_confirmation");
  });
  test("confirming a gap flips its state to not_evidenced in match results, scoped to that skill only", () => {
    let state = initialState();
    state = apply(state, {
      kind: "confirm-gap",
      expectedVersion: state.version,
      skill: "cloud",
    });
    const gaps = present(state).matches.flatMap((m) => m.gaps);
    const confirmed = gaps.find((g) => g.skill === "cloud");
    const untouched = gaps.find((g) => g.skill === "access");
    assert.equal(confirmed!.state, "not_evidenced");
    assert.equal(untouched!.state, "needs_confirmation");
  });
});

describe("present: matchError", () => {
  test("an evidence-free profile surfaces an honest matchError instead of throwing through present()", () => {
    let state = initialState();
    state = apply(state, {
      kind: "profile",
      expectedVersion: state.version,
      profileId: "starter",
    });
    const view = present(state);
    assert.equal(view.matches.length, 0);
    assert.ok(view.matchError);
  });
});
