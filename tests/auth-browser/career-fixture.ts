import { readFile } from "node:fs/promises";
import type { Profile } from "../../src/profile/contracts";
import { CareerService } from "../../src/opportunities/career-service";
import { bridgeProfile } from "../../src/opportunities/profile-bridge";
import {
  derivePaths,
  validateCatalogBatch,
} from "../../src/opportunities/reviewed-catalog";
import { freshPlan, changePlan } from "../../src/opportunities/saved-plan";
import type { CareerAnalysis } from "../../src/opportunities/gemini-career";

// UI-only response fixture. This deliberately does not claim provider/DB coverage.
export async function careerFixture() {
  const vector = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
  const manifest = JSON.parse(
    await readFile("data/catalog/reviewed-2026-09-19.json", "utf8"),
  );
  const jobs = manifest.jobs.map((job: object) => ({
    ...job,
    embedding: vector,
  }));
  const catalog = validateCatalogBatch({
    ...manifest,
    jobs,
    paths: derivePaths(jobs),
    embeddingModel: "gemini-embedding-001",
    embeddingConfig: "profile-semantic-v1",
    dimension: 768,
  });
  const stored: Profile = {
    profileId: "c2ab95c1-7cd6-4ab0-af74-743e2a248e43",
    ownerId: "synthetic-owner",
    version: 1,
    status: "confirmed",
    facts: [
      {
        id: "git-fact",
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
    extractionModel: "synthetic",
    promptVersion: "synthetic",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const profile = bridgeProfile(stored, {
    ownerId: stored.ownerId,
    model: "gemini-embedding-001",
  }).profile;
  let saved = freshPlan(profile, catalog);
  saved.plan.pathId = "software";
  const service = new CareerService(
    { get: async () => stored },
    {
      read: async () => saved,
      update: async () => {
        throw new Error("Use fixture command handler");
      },
    },
    { active: async () => catalog, retrieve: async () => [] },
    "gemini-embedding-001",
    undefined,
    { read: async () => ({ version: 1, fields: ["software", "ml"] }) },
  );
  let analysis: CareerAnalysis | null = null;
  const contextHash = "b".repeat(64);
  const view = async () => ({
    ...(await service.read(stored.ownerId, stored.profileId, 1)),
    analysis,
    analysisContextHash: contextHash,
  });
  const source = (await view()).analysisSources[0];
  const recommendation: CareerAnalysis["recommendations"][number] = {
    title: "Build a small tested project",
    kind: "project",
    why: "Explore a requirement in this reviewed sample.",
    deliverable: "A repository with a short README and automated checks.",
    basis: "explore_requirement",
    factIds: [],
    sourceIds: [source.id],
    resourceIds: [],
    learningNeed: "needs_clarification",
    skill: null,
  };
  return {
    profileId: stored.profileId,
    contextHash,
    view,
    analyze: () => {
      analysis = { recommendations: [recommendation] };
    },
    command: (command: unknown) => {
      saved = changePlan(
        saved,
        profile,
        catalog,
        command,
        new Date(),
        recommendation,
      );
      if (
        ["path", "preferences", "confirm-gap"].includes(
          (command as { kind: string }).kind,
        )
      )
        analysis = null;
    },
  };
}
