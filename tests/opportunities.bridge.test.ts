import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bridgeProfile,
  canonicalPathId,
} from "../src/opportunities/profile-bridge.ts";
import type { Profile } from "../src/profile/contracts.ts";
import { validateExplanation } from "../src/opportunities/engine.ts";
import { jobs, profiles } from "../src/opportunities/catalog.ts";
import {
  defaultPreferences,
  ResourceSchema,
} from "../src/opportunities/contracts.ts";
const now = new Date("2026-09-19T12:00:00Z");
function profile(): Profile {
  return {
    profileId: "p",
    ownerId: "owner",
    version: 2,
    status: "confirmed",
    facts: [
      {
        id: "f1",
        kind: "skill",
        label: "Python",
        detail: "",
        dateText: null,
        evidence: { source: "resume", excerpt: "Python", start: 10, end: 16 },
      },
      {
        id: "f2",
        kind: "experience",
        label: "Python project",
        detail: "Built a tool",
        dateText: null,
        evidence: { source: "user_reported" },
      },
      {
        id: "f3",
        kind: "skill",
        label: "SQL",
        detail: "Coursework",
        dateText: null,
        evidence: { source: "user_reported" },
      },
    ],
    embedding: {
      values: Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0)),
      model: "test-model",
      dimensions: 768,
      config: "profile-semantic-v1",
      simulated: false,
    },
    extractionModel: "test",
    promptVersion: "v1",
    createdAt: "2026-09-18T12:00:00Z",
    expiresAt: "2026-10-18T12:00:00Z",
  };
}
const expected = { ownerId: "owner", model: "test-model" };
test("bridge keeps source spans, fact IDs, unmapped facts and truthful user reports", () => {
  const result = bridgeProfile(profile(), expected, now);
  assert.deepEqual(
    result.profile.evidence.map((e) => e.skill),
    ["python", "sql"],
  );
  assert.equal(result.evidenceLinks[0].factId, "f1");
  assert.deepEqual(
    result.evidenceLinks[0].evidence,
    profile().facts[0].evidence,
  );
  assert.equal(result.unmappedFacts[0].id, "f2");
  assert.equal(result.profile.evidence[1].source, "user_reported");
  assert.equal(canonicalPathId("data"), "ml");
});
test("bridge refuses foreign, expired, draft, simulated and incompatible profiles", () => {
  for (const mutate of [
    (p: Profile) => {
      p.ownerId = "other";
    },
    (p: Profile) => {
      p.expiresAt = now.toISOString();
    },
    (p: Profile) => {
      p.status = "draft";
    },
    (p: Profile) => {
      p.embedding!.simulated = true;
    },
    (p: Profile) => {
      p.embedding!.model = "different";
    },
    (p: Profile) => {
      p.embedding!.values = [1, 0];
    },
  ]) {
    const p = profile();
    mutate(p);
    assert.throws(() => bridgeProfile(p, expected, now));
  }
});
test("confirmed gap and personalized next step require current matching confirmation", () => {
  const p = profiles.find((p) => p.id === "maya")!;
  const job = jobs.find((j) => j.pathId === "cloud" && j.status === "open")!;
  const req = job.requirements.find(
    (r) => !p.evidence.some((e) => e.skill === r.skill),
  )!;
  const input = {
    strengths: [],
    gaps: [{ requirementId: req.id, state: "not_evidenced" }],
    nextSteps: [{ requirementId: req.id }],
  };
  assert.equal(validateExplanation(p, job, input, [], now), false);
  const context = {
    checklistVersion: 1,
    preferences: defaultPreferences,
    confirmations: [
      {
        skill: req.skill,
        pathId: job.pathId,
        profileVersion: p.version,
        checklistVersion: 1,
        confirmedAt: now.toISOString(),
      },
    ],
  };
  assert.equal(validateExplanation(p, job, input, [], now, context), true);
  context.confirmations[0].profileVersion++;
  assert.equal(validateExplanation(p, job, input, [], now, context), false);
});
test("a confirmation is scoped to its exact checklist version, path and timing — no cross-context reuse", () => {
  const p = profiles.find((p) => p.id === "maya")!;
  const job = jobs.find((j) => j.pathId === "cloud" && j.status === "open")!;
  const req = job.requirements.find(
    (r) => !p.evidence.some((e) => e.skill === r.skill),
  )!;
  const input = {
    strengths: [],
    gaps: [{ requirementId: req.id, state: "not_evidenced" }],
    nextSteps: [{ requirementId: req.id }],
  };
  const baseConfirmation = {
    skill: req.skill,
    pathId: job.pathId,
    profileVersion: p.version,
    checklistVersion: 1,
    confirmedAt: now.toISOString(),
  };
  const wrongChecklist = {
    checklistVersion: 1,
    preferences: defaultPreferences,
    confirmations: [{ ...baseConfirmation, checklistVersion: 2 }],
  };
  assert.equal(
    validateExplanation(p, job, input, [], now, wrongChecklist),
    false,
  );
  const wrongPath = {
    checklistVersion: 1,
    preferences: defaultPreferences,
    confirmations: [{ ...baseConfirmation, pathId: "different-path" }],
  };
  assert.equal(validateExplanation(p, job, input, [], now, wrongPath), false);
  const futureConfirmation = {
    checklistVersion: 1,
    preferences: defaultPreferences,
    confirmations: [
      {
        ...baseConfirmation,
        confirmedAt: new Date(now.getTime() + 1000).toISOString(),
      },
    ],
  };
  assert.equal(
    validateExplanation(p, job, input, [], now, futureConfirmation),
    false,
  );
});
test("an already-evidenced skill can never gate behind confirmation, and an unmapped skill alias is never silently coerced", () => {
  assert.equal(canonicalPathId("ml"), "ml");
  assert.equal(canonicalPathId("cloud"), "cloud");
  const p = profile();
  p.facts.push({
    id: "f4",
    kind: "skill",
    label: "Rust",
    detail: "",
    dateText: null,
    evidence: { source: "resume", excerpt: "Rust", start: 0, end: 4 },
  });
  const result = bridgeProfile(p, expected, now);
  assert.equal(
    result.unmappedFacts.some((f) => f.id === "f4"),
    true,
  );
  assert.equal(
    result.evidenceLinks.some((e) => e.factId === "f4"),
    false,
  );
});
test("a nextStep gated on an inclusion-category resource requires an explicit opt-in preference", () => {
  const p = profiles.find((p) => p.id === "maya")!;
  const job = jobs.find((j) => j.pathId === "cloud" && j.status === "open")!;
  const req = job.requirements.find(
    (r) => !p.evidence.some((e) => e.skill === r.skill),
  )!;
  const inclusionResource = ResourceSchema.parse({
    id: "inclusion-1",
    version: 1,
    title: "Women in cloud mentorship",
    kind: "mentorship",
    url: "https://example.org/mentorship",
    pathIds: [job.pathId],
    skill: req.skill,
    claim: "Mentorship for the reviewed cloud skill.",
    excerpt: "Women in cloud mentorship",
    checkedAt: new Date(now.getTime() - 1000).toISOString(),
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
    reviewStatus: "reviewed",
    region: "Online",
    eligibility: "Open enrollment",
    cost: "Free",
    prerequisites: "None",
    inclusionCategory: "women",
  });
  const input = {
    strengths: [],
    gaps: [{ requirementId: req.id, state: "not_evidenced" }],
    nextSteps: [{ requirementId: req.id, resourceId: inclusionResource.id }],
  };
  const confirmations = [
    {
      skill: req.skill,
      pathId: job.pathId,
      profileVersion: p.version,
      checklistVersion: 1,
      confirmedAt: now.toISOString(),
    },
  ];
  const optedOut = {
    checklistVersion: 1,
    preferences: defaultPreferences,
    confirmations,
  };
  assert.equal(
    validateExplanation(p, job, input, [inclusionResource], now, optedOut),
    false,
  );
  const optedIn = {
    checklistVersion: 1,
    preferences: { ...defaultPreferences, inclusion: ["women" as const] },
    confirmations,
  };
  assert.equal(
    validateExplanation(p, job, input, [inclusionResource], now, optedIn),
    true,
  );
});
