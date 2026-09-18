import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateMatches,
  snapshotToken,
  retrievalQuery,
  type OpportunitiesPorts,
  type MatchSnapshot,
  type MatchInput,
  type MatchResult,
} from "../src/opportunities/service.ts";
import { OpportunityError } from "../src/opportunities/engine.ts";
import { jobs, profiles, vectorFor } from "../src/opportunities/catalog.ts";
import { defaultPreferences } from "../src/opportunities/contracts.ts";

const cloudProfile = profiles.find((p) => p.id === "cloud")!;
const cloudJobs = jobs.filter((j) => j.pathId === "cloud");
const dimension = cloudProfile.embedding.length;

function snapshot(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
  return {
    profile: cloudProfile,
    preferences: defaultPreferences,
    preferenceVersion: 1,
    catalogVersion: "v1",
    checklistVersion: "v1",
    embeddingConfig: "synthetic-skill-basis-v1",
    dimension,
    deleting: false,
    ...overrides,
  };
}

function input(overrides: Partial<MatchInput> = {}): MatchInput {
  return {
    ownerId: "owner-1",
    profileId: cloudProfile.id,
    profileVersion: cloudProfile.version,
    idempotencyKey: "test-key-0001",
    ...overrides,
  };
}

class FakePorts implements OpportunitiesPorts {
  snapshot: MatchSnapshot | null;
  rows: typeof jobs;
  committed: MatchResult | null = null;
  failed = false;
  beginCalls = 0;
  retrieveCalls = 0;
  commitResult = true;
  operationLog = new Map<string, MatchResult>();
  constructor(snap: MatchSnapshot | null, rows = cloudJobs) {
    this.snapshot = snap;
    this.rows = rows;
  }
  async loadOwnedSnapshot() {
    return this.snapshot;
  }
  async retrieve() {
    this.retrieveCalls++;
    return this.rows;
  }
  begin: OpportunitiesPorts["begin"] = async (matchInput) => {
    this.beginCalls++;
    const stored = this.operationLog.get(matchInput.idempotencyKey);
    if (stored) return { state: "completed", result: stored };
    return { state: "acquired" };
  };
  async commit(matchInput: MatchInput, _token: string, result: MatchResult) {
    if (!this.commitResult) return false;
    this.committed = result;
    this.operationLog.set(matchInput.idempotencyKey, result);
    return true;
  }
  async fail() {
    this.failed = true;
  }
}

describe("generateMatches: guard order and validation", () => {
  test("NOT_FOUND when no owned snapshot exists", async () => {
    const ports = new FakePorts(null);
    await assert.rejects(
      generateMatches(ports, input()),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "NOT_FOUND",
    );
  });
  test("NOT_FOUND when the profile is mid-deletion", async () => {
    const ports = new FakePorts(snapshot({ deleting: true }));
    await assert.rejects(
      generateMatches(ports, input()),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "NOT_FOUND",
    );
  });
  test("STALE_VERSION when the requested profile version no longer matches the snapshot", async () => {
    const ports = new FakePorts(snapshot());
    await assert.rejects(
      generateMatches(
        ports,
        input({ profileVersion: cloudProfile.version + 1 }),
      ),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "STALE_VERSION",
    );
    assert.equal(
      ports.beginCalls,
      0,
      "must fail before acquiring an operation",
    );
  });
  test("PROFILE_UNCONFIRMED for a draft profile snapshot", async () => {
    const draft = profiles.find((p) => p.id === "draft")!;
    const ports = new FakePorts(
      snapshot({ profile: draft, dimension: draft.embedding.length }),
    );
    await assert.rejects(
      generateMatches(
        ports,
        input({ profileId: draft.id, profileVersion: draft.version }),
      ),
      (error: unknown) =>
        error instanceof OpportunityError &&
        error.code === "PROFILE_UNCONFIRMED",
    );
  });
  test("NO_EVIDENCE for a confirmed profile with no evidence", async () => {
    const starter = profiles.find((p) => p.id === "starter")!;
    const ports = new FakePorts(
      snapshot({ profile: starter, dimension: starter.embedding.length }),
    );
    await assert.rejects(
      generateMatches(
        ports,
        input({ profileId: starter.id, profileVersion: starter.version }),
      ),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "NO_EVIDENCE",
    );
  });
  test("INVALID_VECTOR when the profile embedding dimension doesn't match the snapshot's declared dimension", async () => {
    const ports = new FakePorts(snapshot({ dimension: dimension + 1 }));
    await assert.rejects(
      generateMatches(ports, input()),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "INVALID_VECTOR",
    );
    assert.equal(ports.beginCalls, 0);
  });
});

describe("generateMatches: idempotency and atomic commit", () => {
  test("happy path retrieves, ranks, and commits, returning at most 10 results", async () => {
    const ports = new FakePorts(snapshot());
    const result = await generateMatches(ports, input());
    assert.ok(result.length > 0);
    assert.ok(result.length <= 10);
    assert.equal(ports.retrieveCalls, 1);
    assert.deepEqual(ports.committed, result);
  });
  test("a completed prior operation short-circuits: retrieve/commit are never called again", async () => {
    const ports = new FakePorts(snapshot());
    const first = await generateMatches(ports, input());
    const second = await generateMatches(ports, input());
    assert.deepEqual(second, first);
    assert.equal(ports.retrieveCalls, 1, "must not re-retrieve on replay");
  });
  test("an inflight operation throws INFLIGHT/409 rather than racing a second computation", async () => {
    const ports = new FakePorts(snapshot());
    ports.begin = async () => ({ state: "inflight" as const });
    await assert.rejects(
      generateMatches(ports, input()),
      (error: unknown) =>
        error instanceof OpportunityError &&
        error.code === "INFLIGHT" &&
        error.status === 409,
    );
  });
  test("a failed compare-and-set commit (stale write) throws STALE_VERSION and calls fail(), never returns a result silently", async () => {
    const ports = new FakePorts(snapshot());
    ports.commitResult = false;
    await assert.rejects(
      generateMatches(ports, input()),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "STALE_VERSION",
    );
    assert.equal(ports.failed, true);
  });
  test("a retrieval failure (simulated provider outage) calls fail() and propagates the error, never fabricates a result", async () => {
    const ports = new FakePorts(snapshot());
    ports.retrieve = async () => {
      throw new Error("simulated provider outage");
    };
    await assert.rejects(
      generateMatches(ports, input()),
      /simulated provider outage/,
    );
    assert.equal(ports.failed, true);
    assert.equal(ports.committed, null);
  });
});

describe("snapshotToken", () => {
  test("changes when catalog, checklist, preference, or embedding config differ (cache identity)", () => {
    const base = snapshot();
    const token = snapshotToken(base);
    assert.notEqual(token, snapshotToken({ ...base, catalogVersion: "v2" }));
    assert.notEqual(token, snapshotToken({ ...base, checklistVersion: "v2" }));
    assert.notEqual(token, snapshotToken({ ...base, preferenceVersion: 2 }));
    assert.notEqual(
      token,
      snapshotToken({ ...base, embeddingConfig: "other-config" }),
    );
  });
  test("is stable for an identical snapshot", () => {
    const base = snapshot();
    assert.equal(snapshotToken(base), snapshotToken(snapshot()));
  });
});

describe("retrievalQuery", () => {
  test("throws on an incompatible embedding dimension before building any SQL", () => {
    assert.throws(
      () => retrievalQuery(snapshot({ dimension: dimension + 1 })),
      (error: unknown) =>
        error instanceof OpportunityError && error.code === "INVALID_VECTOR",
    );
  });
  test("parameterizes preference filters rather than concatenating them into the query text", () => {
    const query = retrievalQuery(
      snapshot({ preferences: { ...defaultPreferences, location: "Georgia" } }),
    );
    assert.equal(query.text.includes("Georgia"), false);
    assert.ok(query.values.includes("Georgia"));
    assert.match(query.text, /\$1::vector/);
  });
});

test("vectorFor stays compatible with the declared demo dimension", () => {
  assert.equal(vectorFor(["python"]).length, dimension);
});
