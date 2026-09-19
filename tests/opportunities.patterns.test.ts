import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregatePatterns,
  careerGuidance,
} from "../src/opportunities/patterns.ts";
import {
  jobs,
  paths,
  profiles,
  resources,
} from "../src/opportunities/catalog.ts";
import { defaultPreferences } from "../src/opportunities/contracts.ts";
const path = paths.find((p) => p.id === "cloud")!;
const job = jobs.find(
  (j) => j.pathId === path.id && j.status === "open" && j.requirements.length,
)!;
test("patterns count distinct listings, retain provenance, and expose missing requirements", () => {
  const empty = { ...job, id: "empty", sourceKey: "empty", requirements: [] };
  const repeated = {
    ...job,
    requirements: [...job.requirements, job.requirements[0]],
  };
  const result = aggregatePatterns(
    path,
    [job, repeated, empty],
    defaultPreferences,
    "catalog-v1",
  );
  assert.equal(result.sampleSize, 2);
  assert.equal(result.knownRequirements, 1);
  assert.equal(result.unknownRequirements, 1);
  for (const p of result.patterns) {
    assert.equal(p.listingCount, 1);
    assert.ok(p.requirements.every((r) => r.sourceCommit === job.sourceCommit));
  }
});
test("patterns apply cohort filters and represent empty samples honestly", () => {
  const result = aggregatePatterns(
    path,
    [{ ...job, status: "closed" }],
    defaultPreferences,
    "v1",
  );
  assert.equal(result.sampleSize, 0);
  assert.deepEqual(result.patterns, []);
  assert.deepEqual(result.snapshotDates, []);
  assert.equal(
    aggregatePatterns(
      path,
      [job],
      {
        ...defaultPreferences,
        roleType: job.roleType === "internship" ? "new-grad" : "internship",
      },
      "v1",
    ).sampleSize,
    0,
  );
});
test("pattern guidance only personalizes resources for current confirmed needs", () => {
  const profile = profiles.find((p) => p.id === "maya")!;
  const skill = job.requirements.find(
    (r) => !profile.evidence.some((e) => e.skill === r.skill),
  )!.skill;
  const plan = {
    version: 1,
    pathId: path.id,
    actions: [],
    confirmations: [
      {
        skill,
        pathId: path.id,
        profileVersion: profile.version,
        checklistVersion: path.version,
        confirmedAt: "2026-09-18T00:00:00Z",
      },
    ],
  };
  const result = careerGuidance(
    profile,
    path,
    plan,
    [job],
    defaultPreferences,
    resources,
    "v1",
    new Date("2026-09-19T00:00:00Z"),
  );
  assert.equal(
    result.checkpoints.find((c) => c.skill === skill)!.state,
    "confirmed_learning_need",
  );
  plan.confirmations[0].profileVersion++;
  const stale = careerGuidance(
    profile,
    path,
    plan,
    [job],
    defaultPreferences,
    resources,
    "v1",
  );
  assert.equal(
    stale.checkpoints.find((c) => c.skill === skill)!.state,
    "needs_clarification",
  );
  assert.deepEqual(
    stale.checkpoints.find((c) => c.skill === skill)!.resourceIds,
    [],
  );
});

test("product, quant and hardware have distinct demonstrable checklists and patterns", () => {
  for (const id of ["product", "quant", "hardware"]) {
    const path = paths.find((p) => p.id === id)!;
    assert.ok(path.checkpoints.length > 0);
    const result = aggregatePatterns(path, jobs, defaultPreferences, "v2");
    assert.equal(result.sampleSize, 3);
    assert.ok(result.patterns.length > 0);
    assert.equal(result.synthetic, true);
  }
});
