import { z } from "zod";

export const LIMITS = {
  bytes: 2 * 1024 * 1024,
  characters: 20_000,
  pages: 5,
  facts: 60,
  dimensions: 768,
} as const;
export const factKind = z.enum(["skill", "experience", "education"]);
const shortText = z.string().trim().min(1).max(160);
export const extractedFactSchema = z.strictObject({
  kind: factKind,
  label: shortText,
  detail: z.string().trim().max(400),
  dateText: z.string().trim().min(1).max(80).nullable(),
  excerpt: z.string().trim().min(1).max(600),
});
export const extractionSchema = z.strictObject({
  facts: z.array(extractedFactSchema).max(LIMITS.facts),
});
export type Extracted = z.infer<typeof extractionSchema>;
export type FactKind = z.infer<typeof factKind>;
export type Fact = Omit<Extracted["facts"][number], "excerpt"> & {
  id: string;
  evidence:
    | { source: "resume"; excerpt: string; start: number; end: number }
    | { source: "user_reported" };
};
export const correctionSchema = z.strictObject({
  id: z.uuid().optional(),
  kind: factKind,
  label: shortText,
  detail: z.string().trim().max(400),
  dateText: z.string().trim().min(1).max(80).nullable(),
});
export const updateSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
  corrections: z.array(correctionSchema).min(1).max(LIMITS.facts),
  confirm: z.boolean(),
});
export type ProfileUpdate = z.infer<typeof updateSchema>;
export type Embedding = {
  values: number[];
  model: string;
  dimensions: 768;
  config: "profile-semantic-v1";
  simulated: boolean;
};
export type Profile = {
  profileId: string;
  ownerId: string;
  version: number;
  status: "draft" | "confirmed";
  facts: Fact[];
  embedding: Embedding | null;
  extractionModel: string;
  promptVersion: string;
  createdAt: string;
  expiresAt: string;
};
export type PublicProfile = Omit<Profile, "ownerId" | "embedding"> & {
  embedding: { model: string; dimensions: number; simulated: boolean } | null;
};
export function publicProfile(profile: Profile): PublicProfile {
  const {
    embedding,
    profileId,
    version,
    status,
    facts,
    extractionModel,
    promptVersion,
    createdAt,
    expiresAt,
  } = profile;
  return {
    profileId,
    version,
    status,
    facts,
    extractionModel,
    promptVersion,
    createdAt,
    expiresAt,
    embedding: embedding
      ? {
          model: embedding.model,
          dimensions: embedding.dimensions,
          simulated: embedding.simulated,
        }
      : null,
  };
}
export type ReviewedRequirement = {
  id: string;
  skill: string;
  excerpt: string;
};
// Person B resolves this server-side from its reviewed, versioned catalog.
export type ReviewedPath = {
  id: string;
  version: number;
  title: string;
  requirements: ReviewedRequirement[];
};
export type ResumeSuggestion = {
  id: string;
  factId: string;
  requirementId: string;
  original: string;
  proposed: string;
  reason: string;
  source: Fact["evidence"]["source"];
};
