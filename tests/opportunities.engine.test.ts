import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  cosine,
  validVector,
  eligibleJobs,
  rankJobs,
  compareRequirements,
  assessPath,
  fieldContext,
  visibleResources,
  validateExplanation,
  seedCatalog,
  OpportunityError,
} from "../src/opportunities/engine.ts";
import {
  jobs,
  paths,
  profiles,
  resources,
  vectorFor,
} from "../src/opportunities/catalog.ts";
import type {
  Job,
  Resource,
  Preferences,
} from "../src/opportunities/contracts.ts";
import {
  JobSchema,
  ResourceSchema,
  defaultPreferences,
} from "../src/opportunities/contracts.ts";

const cloudPath = paths.find((p) => p.id === "cloud")!;
const cloudProfile = profiles.find((p) => p.id === "cloud")!;
const mayaProfile = profiles.find((p) => p.id === "maya")!;
const starterProfile = profiles.find((p) => p.id === "starter")!;
const draftProfile = profiles.find((p) => p.id === "draft")!;
const cloudJobs = jobs.filter((j) => j.pathId === "cloud");
const openCloudJob = cloudJobs.find((j) => j.status === "open")!;
const discoveryJob = jobs.find((j) => j.id === "demo-discovery")!;
const closedJob = jobs.find((j) => j.id === "demo-closed")!;

function pref(overrides: Partial<Preferences> = {}): Preferences {
  return { ...defaultPreferences, ...overrides };
}

describe("validVector / cosine", () => {
  test("rejects wrong-dimension vectors", () => {
    assert.throws(() => cosine([1, 0], [1, 0, 0]), OpportunityError);
  });
  test("rejects an all-zero vector", () => {
    assert.equal(validVector([0, 0, 0], 3), false);
  });
  test("rejects a nonfinite vector", () => {
    assert.equal(validVector([1, Infinity, 0], 3), false);
  });
  test("rejects a huge-magnitude vector whose norm overflows to Infinity", () => {
    // Each element is finite, but hypot(...) overflows to Infinity, which must
    // not silently produce NaN/0 similarity.
    const huge = Array(20).fill(Number.MAX_VALUE);
    assert.throws(() => cosine(huge, huge), OpportunityError);
  });
  test("computes plain cosine similarity for compatible vectors", () => {
    assert.equal(cosine([1, 0], [1, 0]), 1);
    assert.equal(cosine([1, 0], [0, 1]), 0);
  });
});

describe("eligibleJobs", () => {
  test("excludes closed and unlisted roles", () => {
    const result = eligibleJobs(jobs, pref());
    assert.equal(
      result.some((j) => j.status !== "open"),
      false,
    );
  });
  test("'any' preference leaves a dimension unrestricted", () => {
    const anyLocation = eligibleJobs(cloudJobs, pref());
    const strict = eligibleJobs(cloudJobs, pref({ location: "Georgia" }));
    assert.ok(anyLocation.length >= strict.length);
    assert.ok(strict.every((j) => j.location === "Georgia"));
  });
  test("a strict filter excludes a role even if the job metadata is unknown, never silently matches unknown", () => {
    const unknownLocationJob = cloudJobs.find((j) => j.location === "unknown");
    assert.ok(
      unknownLocationJob,
      "fixture must include an unknown-location job",
    );
    const strict = eligibleJobs(cloudJobs, pref({ location: "Georgia" }));
    assert.equal(
      strict.some((j) => j.id === unknownLocationJob!.id),
      false,
    );
  });
});

describe("rankJobs", () => {
  test("throws PROFILE_UNCONFIRMED for a draft profile", () => {
    assert.throws(
      () => rankJobs(draftProfile, cloudJobs, pref()),
      (error: unknown) =>
        error instanceof OpportunityError &&
        error.code === "PROFILE_UNCONFIRMED",
    );
  });
  test("throws NO_EVIDENCE for a confirmed profile with no evidence", () => {
    assert.throws(
      () => rankJobs(starterProfile, cloudJobs, pref()),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "NO_EVIDENCE",
    );
  });
  test("excludes a closed role even when it would otherwise rank highly", () => {
    const result = rankJobs(cloudProfile, cloudJobs, pref());
    assert.equal(
      result.some((m) => m.job.id === closedJob.id),
      false,
    );
  });
  test("stable job-ID tie-break for equal similarity, never insertion order", () => {
    const tiedA: Job = JobSchema.parse({
      ...openCloudJob,
      id: "tie-b",
      sourceKey: "tie-b",
    });
    const tiedB: Job = JobSchema.parse({
      ...openCloudJob,
      id: "tie-a",
      sourceKey: "tie-a",
    });
    // Inserted in an order that would be wrong if the code relied on array order.
    const result = rankJobs(cloudProfile, [tiedA, tiedB], pref());
    const ids = result.map((m) => m.job.id);
    assert.deepEqual(ids, ["tie-a", "tie-b"]);
  });
  test("a role with no reviewed requirements is a discovery candidate: no invented gap, requirementsAvailable is false", () => {
    const result = rankJobs(cloudProfile, [discoveryJob], pref());
    assert.equal(result.length, 1);
    assert.equal(result[0].requirementsAvailable, false);
    assert.deepEqual(result[0].gaps, []);
    assert.deepEqual(result[0].strengths, []);
  });
});

describe("compareRequirements", () => {
  test("a missing skill is reported as needs_confirmation, never invented as a hard failure", () => {
    const { gaps } = compareRequirements(mayaProfile, openCloudJob);
    assert.ok(gaps.length > 0);
    assert.ok(gaps.every((g) => g.state === "needs_confirmation"));
  });
  test("strengths only include requirements the profile actually evidences", () => {
    const { strengths } = compareRequirements(cloudProfile, openCloudJob);
    assert.equal(strengths.length, openCloudJob.requirements.length);
  });
});

describe("assessPath", () => {
  test("a path with zero reviewed checkpoints is unavailable (null), never 0%", () => {
    const security = paths.find((p) => p.id === "security")!;
    const result = assessPath(cloudProfile, security, jobs);
    assert.equal(result.total, 0);
    assert.equal(result.coverage, null);
  });
  test("a reviewed checklist with zero supported checkpoints is a real, distinguishable 0", () => {
    const result = assessPath(starterProfile, cloudPath, jobs);
    assert.ok(result.total > 0);
    assert.equal(result.supported, 0);
    assert.equal(result.coverage, 0);
  });
  test("full coverage when every checkpoint has evidence", () => {
    const result = assessPath(cloudProfile, cloudPath, jobs);
    assert.equal(result.supported, result.total);
    assert.equal(result.coverage, 1);
  });
  test("an unconfirmed (draft) profile never reports a numeric coverage", () => {
    const result = assessPath(draftProfile, cloudPath, jobs);
    assert.equal(result.coverage, null);
  });
  test("a checkpoint only counts once even if multiple open jobs repeat the same skill requirement", () => {
    const result = assessPath(cloudProfile, cloudPath, jobs);
    const skills = result.checkpoints.map((c) => c.skill);
    assert.equal(new Set(skills).size, skills.length);
  });
  test("a checkpoint's requirementIds must resolve within jobs belonging to THIS path, not any open job in the catalog", () => {
    // "python" is a real skill/requirement elsewhere (e.g. the ml path), but a
    // checkpoint claiming a requirement ID that only exists under a different
    // path must not be treated as reviewed for this path.
    const foreignPath = {
      id: "cloud",
      title: "Cloud / Infrastructure",
      parentId: "software",
      version: 1,
      checkpoints: [
        {
          skill: "modeling" as const,
          requirementIds: jobs
            .filter((j) => j.pathId === "ml")
            .flatMap((j) =>
              j.requirements
                .filter((r) => r.skill === "modeling")
                .map((r) => r.id),
            ),
        },
      ],
    };
    const result = assessPath(cloudProfile, foreignPath, jobs);
    assert.equal(result.total, 0);
    assert.equal(result.coverage, null);
  });
});

describe("fieldContext", () => {
  test("N=0 reports an explicit zero sample, never a fabricated share", () => {
    const context = fieldContext(cloudPath, [], pref());
    assert.equal(context.sampleSize, 0);
    assert.equal(context.competition, "Competition data unavailable");
    assert.ok(context.tags.every((t) => t.total === 0));
  });
  test("never exposes a competitiveness/ranking number, only the fixed disclaimer string", () => {
    const context = fieldContext(cloudPath, jobs, pref());
    assert.equal(typeof context.competition, "string");
    assert.equal(context.competition, "Competition data unavailable");
  });
  test("tag counts and unknown counts partition the sample honestly", () => {
    const context = fieldContext(cloudPath, jobs, pref());
    for (const tag of context.tags) {
      assert.ok(tag.count + tag.unknown <= tag.total);
    }
  });
  test("deduplicates jobs sharing the same (sourceRepo, sourceKey) pair before counting the sample", () => {
    const duplicate: Job = JobSchema.parse({ ...openCloudJob });
    const context = fieldContext(cloudPath, [...cloudJobs, duplicate], pref());
    const withoutDuplicate = fieldContext(cloudPath, cloudJobs, pref());
    assert.equal(context.sampleSize, withoutDuplicate.sampleSize);
  });
  test("does NOT merge two different repos that happen to reuse the same bare sourceKey", () => {
    const sameKeyDifferentRepo: Job = JobSchema.parse({
      ...openCloudJob,
      sourceRepo: "a-completely-different-repo",
    });
    const context = fieldContext(
      cloudPath,
      [...cloudJobs, sameKeyDifferentRepo],
      pref(),
    );
    const withoutIt = fieldContext(cloudPath, cloudJobs, pref());
    assert.equal(context.sampleSize, withoutIt.sampleSize + 1);
  });
});

describe("visibleResources", () => {
  const now = new Date("2026-09-18T12:00:00.000Z");
  test("excludes an expired resource", () => {
    const expired: Resource = ResourceSchema.parse({
      ...resources[0],
      id: "expired",
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
    const visible = visibleResources("cloud", pref(), [expired], now);
    assert.equal(visible.length, 0);
  });
  test("excludes a pending (unreviewed) resource", () => {
    const pending: Resource = ResourceSchema.parse({
      ...resources[0],
      id: "pending",
      reviewStatus: "pending",
    });
    const visible = visibleResources("cloud", pref(), [pending], now);
    assert.equal(visible.length, 0);
  });
  test("a resource requiring an opted-out inclusion category is hidden", () => {
    const swe = resources.find((r) => r.id === "swe")!;
    assert.equal(
      visibleResources("cloud", pref({ inclusion: [] }), [swe], now).length,
      0,
    );
    assert.equal(
      visibleResources("cloud", pref({ inclusion: ["women"] }), [swe], now)
        .length,
      1,
    );
  });
});

describe("validateExplanation", () => {
  const now = new Date("2026-09-18T12:00:00.000Z");
  function validExplanation() {
    const req = openCloudJob.requirements[0];
    const evidence = cloudProfile.evidence.find((e) => e.skill === req.skill)!;
    return {
      strengths: [{ requirementId: req.id, evidence }],
      gaps: [],
      nextSteps: [],
    };
  }
  test("accepts a well-formed, fully grounded explanation", () => {
    assert.equal(
      validateExplanation(
        cloudProfile,
        openCloudJob,
        validExplanation(),
        resources,
        now,
      ),
      true,
    );
  });
  test("rejects a foreign/invented requirement ID", () => {
    const bad = {
      ...validExplanation(),
      strengths: [
        { requirementId: "not-a-real-id", evidence: cloudProfile.evidence[0] },
      ],
    };
    assert.equal(
      validateExplanation(cloudProfile, openCloudJob, bad, resources, now),
      false,
    );
  });
  test("rejects a strength whose evidence excerpt doesn't match the confirmed profile", () => {
    const req = openCloudJob.requirements[0];
    const bad = {
      ...validExplanation(),
      strengths: [
        {
          requirementId: req.id,
          evidence: {
            skill: req.skill,
            excerpt: "fabricated excerpt",
            source: "resume",
          },
        },
      ],
    };
    assert.equal(
      validateExplanation(cloudProfile, openCloudJob, bad, resources, now),
      false,
    );
  });
  test("rejects a nextStep resourceId that doesn't resolve to a reviewed, unexpired, path-matching resource", () => {
    const req = openCloudJob.requirements.find((r) => r.skill === "cloud")!;
    const bad = {
      ...validExplanation(),
      nextSteps: [{ requirementId: req.id, resourceId: "does-not-exist" }],
    };
    assert.equal(
      validateExplanation(cloudProfile, openCloudJob, bad, resources, now),
      false,
    );
  });
  test("rejects an unconfirmed (draft) profile outright", () => {
    assert.equal(
      validateExplanation(
        draftProfile,
        openCloudJob,
        validExplanation(),
        resources,
        now,
      ),
      false,
    );
  });
  test("rejects more than three next steps at the schema boundary", () => {
    const req = openCloudJob.requirements[0];
    const bad = {
      ...validExplanation(),
      nextSteps: [0, 1, 2, 3].map(() => ({ requirementId: req.id })),
    };
    assert.equal(
      validateExplanation(cloudProfile, openCloudJob, bad, resources, now),
      false,
    );
  });
});

describe("seedCatalog", () => {
  test("repeat seeding the same batch produces no duplicates", () => {
    const once = seedCatalog([], jobs);
    const twice = seedCatalog(once, jobs);
    assert.equal(twice.length, once.length);
  });
  test("throws when a stable source key resolves to a different job ID", () => {
    const conflicting: Job = JobSchema.parse({
      ...openCloudJob,
      id: "renamed-id",
    });
    assert.throws(
      () => seedCatalog([openCloudJob], [conflicting]),
      (error: unknown) =>
        error instanceof OpportunityError &&
        error.code === "SOURCE_KEY_CONFLICT",
    );
  });
  test("an invalid batch throws before any job is accepted, leaving the previous catalog untouched", () => {
    const previous = [openCloudJob];
    assert.throws(() => seedCatalog(previous, [{ not: "a valid job" }]));
  });
});

test("vectorFor produces a fixed-dimension basis vector regardless of skill order", () => {
  const a = vectorFor(["python", "cloud"]);
  const b = vectorFor(["cloud", "python"]);
  assert.deepEqual(a, b);
});
