import { z } from "zod";

export const skills = [
  "python",
  "sql",
  "git",
  "cloud",
  "access",
  "monitoring",
  "statistics",
  "modeling",
  "testing",
  "research",
  "circuits",
] as const;
export const SkillSchema = z.enum(skills);
export type Skill = z.infer<typeof SkillSchema>;
export const EvidenceSchema = z
  .object({
    skill: SkillSchema,
    excerpt: z.string().min(1).max(600),
    source: z.enum(["resume", "user_reported"]),
  })
  .strict();
export const ProfileSchema = z
  .object({
    id: z.string(),
    version: z.number().int().positive(),
    status: z.enum(["draft", "confirmed"]),
    name: z.string(),
    evidence: z.array(EvidenceSchema),
    embedding: z.array(z.number().finite()),
  })
  .strict();
export type Profile = z.infer<typeof ProfileSchema>;
const url = z
  .string()
  .url()
  .refine((value) => {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "HTTPS URL required");
export const RequirementSchema = z
  .object({
    id: z.string(),
    skill: SkillSchema,
    text: z.string(),
    excerpt: z.string(),
    importance: z.enum(["required", "preferred", "unspecified"]),
  })
  .strict();
export const JobSchema = z
  .object({
    id: z.string(),
    version: z.number().int().positive(),
    sourceKey: z.string(),
    sourceRepo: z.string(),
    sourceCommit: z.string(),
    sourceUrl: url,
    applyUrl: url.nullable(),
    checkedAt: z.string().datetime(),
    title: z.string(),
    company: z.string(),
    pathId: z.string(),
    roleType: z.enum(["internship", "new-grad"]),
    location: z.enum(["Georgia", "US", "unknown"]),
    remote: z.enum(["remote", "onsite", "unknown"]),
    status: z.enum(["open", "closed", "unlisted"]),
    requirements: z.array(RequirementSchema),
    qualificationNotes: z.array(z.string().max(800)).max(20).optional(),
    embedding: z.array(z.number().finite()),
    eligibility: z.object({
      noSponsorship: z.boolean().nullable(),
      citizenship: z.boolean().nullable(),
      advancedDegree: z.boolean().nullable(),
    }),
    synthetic: z.boolean(),
  })
  .strict();
export type Job = z.infer<typeof JobSchema>;
export const ResourceSchema = z
  .object({
    id: z.string(),
    version: z.number().int().positive(),
    title: z.string(),
    kind: z.enum([
      "project_guide",
      "course",
      "certification",
      "community",
      "mentorship",
    ]),
    pathIds: z.array(z.string()),
    skill: SkillSchema.nullable(),
    url,
    claim: z.string(),
    excerpt: z.string(),
    checkedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    reviewStatus: z.enum(["reviewed", "pending", "rejected"]),
    region: z.string(),
    eligibility: z.string(),
    cost: z.string(),
    prerequisites: z.string(),
    inclusionCategory: z.enum(["women", "community"]).nullable(),
  })
  .strict();
export type Resource = z.infer<typeof ResourceSchema>;
export type Path = {
  id: string;
  title: string;
  parentId: string | null;
  version: number;
  checkpoints: { skill: Skill; requirementIds: string[] }[];
};
export const PreferencesSchema = z
  .object({
    roleType: z.enum(["any", "internship", "new-grad"]),
    remote: z.enum(["any", "remote", "onsite"]),
    location: z.enum(["any", "Georgia", "US"]),
    inclusion: z.array(z.enum(["women", "community"])).max(2),
  })
  .strict();
export type Preferences = z.infer<typeof PreferencesSchema>;
export const defaultPreferences: Preferences = {
  roleType: "any",
  remote: "any",
  location: "any",
  inclusion: [],
};
export type Confirmation = {
  skill: Skill;
  profileVersion: number;
  checklistVersion: number;
  pathId: string;
  confirmedAt: string;
};
export type Action = {
  recommendation?: {
    contextHash: string;
    index: number;
    why: string;
    factIds: string[];
    sourceIds: string[];
    resourceIds: string[];
  };
  id: string;
  pathId: string;
  skill: Skill | null;
  title: string;
  deliverable: string;
  resourceId: string | null;
  state: "selected" | "done";
  profileVersion: number;
  checklistVersion: number;
};
export type Plan = {
  version: number;
  pathId: string;
  actions: Action[];
  confirmations: Confirmation[];
};
export const CommandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("select-recommendation"),
      expectedVersion: z.number().int(),
      contextHash: z.string().regex(/^[a-f0-9]{64}$/),
      index: z.number().int().min(0).max(2),
    })
    .strict(),
  z
    .object({
      kind: z.literal("profile"),
      expectedVersion: z.number().int(),
      profileId: z.enum(["maya", "cloud", "starter", "reported", "draft"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("preferences"),
      expectedVersion: z.number().int(),
      preferences: PreferencesSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("path"),
      expectedVersion: z.number().int(),
      pathId: z.string().max(80),
    })
    .strict(),
  z
    .object({
      kind: z.literal("confirm-gap"),
      expectedVersion: z.number().int(),
      skill: SkillSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("add-evidence"),
      expectedVersion: z.number().int(),
      skill: SkillSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("select-action"),
      expectedVersion: z.number().int(),
      skill: SkillSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("action-state"),
      expectedVersion: z.number().int(),
      actionId: z.string().max(100),
      state: z.enum(["done", "remove"]),
    })
    .strict(),
  z
    .object({ kind: z.literal("reset"), expectedVersion: z.number().int() })
    .strict(),
]);
export type Command = z.infer<typeof CommandSchema>;
