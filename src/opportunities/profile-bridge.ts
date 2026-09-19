import type { Fact, Profile as StoredProfile } from "../profile/contracts.ts";
import type { Profile, Skill } from "./contracts.ts";
import { OpportunityError, validVector } from "./engine.ts";

// Exact reviewed labels only. Never infer skills from a job title or free text.
export const mappingVersion = "explicit-skill-labels-v1";
const aliases: Record<string, Skill> = {
  python: "python",
  sql: "sql",
  git: "git",
  cloud: "cloud",
  "cloud computing": "cloud",
  "access control": "access",
  access: "access",
  monitoring: "monitoring",
  statistics: "statistics",
  modeling: "modeling",
  "machine learning": "modeling",
  testing: "testing",
  "software testing": "testing",
  research: "research",
  circuits: "circuits",
};
export function canonicalPathId(id: string) {
  return id === "data" ? "ml" : id;
}
export type Bridge = {
  profile: Profile;
  mappingVersion: typeof mappingVersion;
  evidenceLinks: { skill: Skill; factId: string; evidence: Fact["evidence"] }[];
  unmappedFacts: Fact[];
  embeddingSpace: {
    model: string;
    dimensions: 768;
    config: "profile-semantic-v1";
  };
};
export function bridgeProfile(
  stored: StoredProfile,
  expected: { ownerId: string; model: string },
  now = new Date(),
): Bridge {
  if (stored.ownerId !== expected.ownerId || !expected.ownerId)
    throw new OpportunityError("NOT_FOUND", "Profile unavailable.", 404);
  if (
    !Number.isFinite(Date.parse(stored.expiresAt)) ||
    Date.parse(stored.expiresAt) <= now.getTime()
  )
    throw new OpportunityError("PROFILE_EXPIRED", "Profile expired.", 410);
  if (stored.status !== "confirmed")
    throw new OpportunityError(
      "PROFILE_UNCONFIRMED",
      "Confirm your profile first.",
    );
  const embedding = stored.embedding;
  if (
    !embedding ||
    embedding.simulated ||
    embedding.model !== expected.model ||
    embedding.config !== "profile-semantic-v1" ||
    embedding.dimensions !== 768 ||
    !validVector(embedding.values, 768)
  )
    throw new OpportunityError(
      "INVALID_VECTOR",
      "A compatible provider embedding is required.",
    );
  const evidence: Profile["evidence"] = [];
  const evidenceLinks: Bridge["evidenceLinks"] = [];
  const unmappedFacts: Fact[] = [];
  for (const fact of stored.facts) {
    const skill =
      fact.kind === "skill"
        ? Object.hasOwn(aliases, fact.label.trim().toLowerCase())
          ? aliases[fact.label.trim().toLowerCase()]
          : undefined
        : undefined;
    if (!skill) {
      unmappedFacts.push(structuredClone(fact));
      continue;
    }
    evidence.push({
      skill,
      source: fact.evidence.source,
      excerpt:
        fact.evidence.source === "resume"
          ? fact.evidence.excerpt
          : [fact.label, fact.detail].filter(Boolean).join(": "),
    });
    evidenceLinks.push({
      skill,
      factId: fact.id,
      evidence: structuredClone(fact.evidence),
    });
  }
  return {
    profile: {
      id: stored.profileId,
      version: stored.version,
      status: "confirmed",
      name: "Your profile",
      evidence,
      embedding: [...embedding.values],
    },
    mappingVersion,
    evidenceLinks,
    unmappedFacts,
    embeddingSpace: {
      model: embedding.model,
      dimensions: 768,
      config: embedding.config,
    },
  };
}
