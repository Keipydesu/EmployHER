import type { CareerAnalysis } from "../src/opportunities/gemini-career.ts";
import type { Interests } from "../src/opportunities/interests.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CareerService } from "../src/opportunities/career-service.ts";
import { GeminiCareerAI } from "../src/opportunities/gemini-career.ts";
import {
  derivePaths,
  validateCatalogBatch,
} from "../src/opportunities/reviewed-catalog.ts";
import {
  freshPlan,
  reconcilePlan,
  changePlan,
} from "../src/opportunities/saved-plan.ts";
import type { Profile } from "../src/profile/contracts.ts";
const vector = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
test("authenticated career service consumes the confirmed profile, scopes retrieval, hides vectors and preserves source references", async () => {
  const manifest = JSON.parse(
    await readFile("data/catalog/reviewed-2026-09-19.json", "utf8"),
  );
  const jobs = manifest.jobs.map((j: object) => ({ ...j, embedding: vector }));
  const batch = validateCatalogBatch({
    ...manifest,
    jobs,
    paths: derivePaths(jobs),
    embeddingModel: "gemini-embedding-001",
    embeddingConfig: "profile-semantic-v1",
    dimension: 768,
  });
  const stored: Profile = {
    profileId: "profile",
    ownerId: "owner",
    version: 1,
    status: "confirmed",
    facts: [
      {
        id: "fact",
        kind: "skill",
        label: "Git",
        detail: "",
        dateText: null,
        evidence: { source: "user_reported" },
      },
    ],
    embedding: {
      model: "gemini-embedding-001",
      config: "profile-semantic-v1",
      dimensions: 768,
      values: vector,
      simulated: false,
    },
    extractionModel: "test",
    promptVersion: "test",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  let saved: ReturnType<typeof freshPlan> | undefined;
  let cachedAnalysis: CareerAnalysis | null = null;
  const scopes: string[] = [];
  let interests: Interests = { version: 1, fields: ["software", "ml"] };
  const service = new CareerService(
    {
      get: async (owner) =>
        owner === "owner" ? structuredClone(stored) : null,
    },
    {
      read: async (_owner, p, c) =>
        reconcilePlan(saved ?? freshPlan(p, c), p, c),
      update: async (
        _owner,
        p,
        c,
        command,
        _key,
        _interests,
        recommendation,
      ) => {
        saved = changePlan(
          saved ?? freshPlan(p, c),
          p,
          c,
          command,
          new Date(),
          recommendation,
        );
        return saved;
      },
    },
    {
      active: async () => batch,
      retrieve: async (_batch, _vector, _preferences, path) => {
        scopes.push(path);
        return batch.jobs.filter((j) => j.pathId === path);
      },
    },
    "gemini-embedding-001",
    {
      ai: new GeminiCareerAI("test-key", "test-model", async () => {
        throw new Error("Saving must not call Gemini");
      }),
      authorize: async () => {},
      store: {
        read: async () => cachedAnalysis,
        generate: async () => {
          throw new Error("Saving must not generate");
        },
      },
    },
    { read: async () => interests },
  );
  const view = await service.read("owner", "profile", 1);
  assert.deepEqual(scopes, ["software"]);
  assert.equal(view.profile.evidenceLinks[0].factId, "fact");
  assert.ok(view.guidance.patterns.patterns.some((p) => p.skill === "git"));
  assert.ok(!("embedding" in view.profile));
  assert.ok(view.matches.every((m) => !("embedding" in m.job)));
  assert.equal(view.resources.length, 0, "inclusion resources remain opt-in");
  await assert.rejects(
    () => service.read("other", "profile", 1),
    /unavailable/,
  );
  await assert.rejects(
    () => service.read("owner", "profile", 2),
    /Profile changed/,
  );
  await assert.rejects(
    () =>
      service.update(
        "owner",
        "profile",
        1,
        "old",
        { kind: "path", pathId: "ml", expectedVersion: 0 },
        "request-key",
      ),
    /Catalog changed/,
  );
  const changed = await service.update(
    "owner",
    "profile",
    1,
    batch.version,
    { kind: "path", pathId: "ml", expectedVersion: 0 },
    "request-key",
  );
  assert.equal(changed.guidance.patterns.scope.pathId, "ml");
  assert.deepEqual(scopes, ["software", "ml"]);
  interests = { version: 2, fields: ["hardware"] };
  const restricted = await service.read("owner", "profile", 1);
  assert.deepEqual(
    restricted.paths.map((p) => p.id),
    ["hardware"],
  );
  assert.equal(scopes.at(-1), "hardware");
  await assert.rejects(
    () =>
      service.update(
        "owner",
        "profile",
        1,
        batch.version,
        { kind: "path", pathId: "ml", expectedVersion: 1 },
        "not-selected",
      ),
    /Add this field/,
  );
  interests = { version: 3, fields: [] };
  const calls = scopes.length;
  await assert.rejects(
    () => service.read("owner", "profile", 1),
    /Choose your fields/,
  );
  assert.equal(scopes.length, calls);
  interests = { version: 4, fields: ["software"] };
  const beforeSave = await service.read("owner", "profile", 1);
  cachedAnalysis = {
    recommendations: [
      {
        title: "Build a focused project",
        kind: "project",
        why: "Practice a sourced requirement",
        deliverable: "Publish a small example",
        basis: "explore_requirement",
        factIds: [],
        sourceIds: [beforeSave.analysisSources[0].id],
        resourceIds: [],
        learningNeed: "needs_clarification",
        skill: null,
      },
    ],
  };
  await assert.rejects(
    () =>
      service.update(
        "owner",
        "profile",
        1,
        batch.version,
        {
          kind: "select-recommendation",
          contextHash: "0".repeat(64),
          index: 0,
          expectedVersion: beforeSave.saved.version,
        },
        "wrong-context",
      ),
    /current recommendation/,
  );
  const selected = await service.update(
    "owner",
    "profile",
    1,
    batch.version,
    {
      kind: "select-recommendation",
      contextHash: beforeSave.analysisContextHash,
      index: 0,
      expectedVersion: beforeSave.saved.version,
    },
    "save-gemini",
  );
  assert.equal(
    selected.saved.plan.actions[0].title,
    cachedAnalysis.recommendations[0].title,
  );
  assert.equal(selected.saved.plan.actions[0].skill, null);
  assert.equal(
    selected.analysisContextHash,
    beforeSave.analysisContextHash,
    "saving an action does not change actual model context",
  );
  assert.deepEqual(selected.analysis, cachedAnalysis);
  const completed = await service.update(
    "owner",
    "profile",
    1,
    batch.version,
    {
      kind: "action-state",
      actionId: selected.saved.plan.actions[0].id,
      state: "done",
      expectedVersion: selected.saved.version,
    },
    "complete-gemini",
  );
  assert.equal(completed.saved.plan.actions[0].state, "done");
  assert.equal(completed.analysisContextHash, beforeSave.analysisContextHash);
  assert.deepEqual(completed.profile.evidence, beforeSave.profile.evidence);
});
test("analyze() enforces AI-not-configured, stale-catalog, and fixture-only-authorization boundaries before ever reaching the provider or the analysis store", async () => {
  const manifest = JSON.parse(
    await readFile("data/catalog/reviewed-2026-09-19.json", "utf8"),
  );
  const jobs = manifest.jobs.map((j: object) => ({ ...j, embedding: vector }));
  const batch = validateCatalogBatch({
    ...manifest,
    jobs,
    paths: derivePaths(jobs),
    embeddingModel: "gemini-embedding-001",
    embeddingConfig: "profile-semantic-v1",
    dimension: 768,
  });
  const stored: Profile = {
    profileId: "profile",
    ownerId: "owner",
    version: 1,
    status: "confirmed",
    facts: [
      {
        id: "fact",
        kind: "skill",
        label: "Git",
        detail: "",
        dateText: null,
        evidence: { source: "user_reported" },
      },
    ],
    embedding: {
      model: "gemini-embedding-001",
      config: "profile-semantic-v1",
      dimensions: 768,
      values: vector,
      simulated: false,
    },
    extractionModel: "test",
    promptVersion: "test",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  let saved: ReturnType<typeof freshPlan> | undefined;
  const neverCalled: typeof fetch = async () => {
    throw new Error("provider must not be called across a rejected boundary");
  };
  const noGenerate = {
    read: async () => null,
    generate: async () => {
      throw new Error("generate must not be called across a rejected boundary");
    },
  };
  function makeService(
    synthesis?: ConstructorParameters<typeof CareerService>[4],
  ) {
    return new CareerService(
      {
        get: async (owner) =>
          owner === "owner" ? structuredClone(stored) : null,
      },
      {
        read: async (_owner, p, c) =>
          reconcilePlan(saved ?? freshPlan(p, c), p, c),
        update: async () => {
          throw new Error("not used in this test");
        },
      },
      {
        active: async () => batch,
        retrieve: async () => [],
      },
      "gemini-embedding-001",
      synthesis,
    );
  }
  await assert.rejects(
    () => makeService().analyze("owner", "profile", 1, batch.version, "key"),
    /not configured/i,
  );
  let authorizeCalls = 0;
  await assert.rejects(
    () =>
      makeService({
        ai: new GeminiCareerAI("secret", "test-model", neverCalled),
        store: noGenerate,
        authorize: async () => {
          authorizeCalls++;
        },
      }).analyze("owner", "profile", 1, "wrong-version", "key"),
    /Catalog changed/,
  );
  assert.equal(
    authorizeCalls,
    0,
    "a stale catalog must be rejected before authorization or generation run",
  );
  await assert.rejects(
    () =>
      makeService({
        ai: new GeminiCareerAI("secret", "test-model", neverCalled),
        store: noGenerate,
        authorize: async () => {
          throw new Error("fixture-only boundary");
        },
      }).analyze("owner", "profile", 1, batch.version, "key"),
    /fixture-only boundary/,
  );
});
