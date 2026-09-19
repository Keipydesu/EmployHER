import { z } from "zod";
import {
  type Job,
  type Profile,
  type Preferences,
  type Path,
  type Resource,
  type Skill,
  type Confirmation,
} from "./contracts.ts";

const opportunityErrorBrand = Symbol.for("employher.OpportunityError");
export class OpportunityError extends Error {
  readonly [opportunityErrorBrand] = true;
  static [Symbol.hasInstance](value: unknown) {
    return (
      !!value &&
      typeof value === "object" &&
      Symbol.for("employher.OpportunityError") in value &&
      Reflect.get(value, Symbol.for("employher.OpportunityError")) === true
    );
  }
  code: string;
  status: number;
  constructor(code: string, message: string, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function validVector(vector: number[], dimension: number) {
  return (
    vector.length === dimension &&
    vector.every(Number.isFinite) &&
    vector.some((v) => v !== 0) &&
    Number.isFinite(Math.hypot(...vector))
  );
}
export function cosine(a: number[], b: number[]) {
  if (!validVector(a, b.length) || !validVector(b, a.length))
    throw new OpportunityError(
      "INVALID_VECTOR",
      "Embedding configuration is incompatible.",
    );
  return a.reduce(
    (n, v, i) => n + (v / Math.hypot(...a)) * (b[i] / Math.hypot(...b)),
    0,
  );
}
export function eligibleJobs(jobs: Job[], preferences: Preferences) {
  return jobs.filter(
    (j) =>
      j.status === "open" &&
      (preferences.roleType === "any" || j.roleType === preferences.roleType) &&
      (preferences.remote === "any" || j.remote === preferences.remote) &&
      (preferences.location === "any" || j.location === preferences.location),
  );
}
export function rankJobs(
  profile: Profile,
  jobs: Job[],
  preferences: Preferences,
) {
  if (profile.status !== "confirmed")
    throw new OpportunityError(
      "PROFILE_UNCONFIRMED",
      "Confirm the profile before matching.",
    );
  if (!profile.evidence.length)
    throw new OpportunityError(
      "NO_EVIDENCE",
      "No evidence is available for matching. Explore paths and add reviewed evidence first.",
    );
  const candidates = eligibleJobs(jobs, preferences);
  return candidates
    .map((job) => ({
      job,
      similarity: cosine(profile.embedding, job.embedding),
    }))
    .sort(
      (a, b) => b.similarity - a.similarity || a.job.id.localeCompare(b.job.id),
    )
    .slice(0, 10)
    .map((candidate) => ({
      ...candidate,
      ...compareRequirements(profile, candidate.job),
    }));
}
export function compareRequirements(profile: Profile, job: Job) {
  const strengths = job.requirements.flatMap((r) => {
    const evidence = profile.evidence.find((e) => e.skill === r.skill);
    return evidence ? [{ requirementId: r.id, evidence }] : [];
  });
  const gaps = job.requirements
    .filter((r) => !profile.evidence.some((e) => e.skill === r.skill))
    .map((r) => ({
      requirementId: r.id,
      skill: r.skill,
      state: "needs_confirmation" as const,
      reason:
        "Not yet evidenced. Have you done relevant work that is missing from your profile?",
    }));
  return {
    strengths,
    gaps,
    requirementsAvailable: job.requirements.length > 0,
  };
}
export function assessPath(profile: Profile, path: Path, jobs: Job[]) {
  const currentRequirements = new Map(
    jobs
      .filter((j) => j.status === "open" && j.pathId === path.id)
      .flatMap((j) => j.requirements.map((r) => [r.id, r] as const)),
  );
  const seen = new Set<Skill>();
  const checkpoints = path.checkpoints
    .filter((c) => {
      if (
        seen.has(c.skill) ||
        !c.requirementIds.some(
          (id) => currentRequirements.get(id)?.skill === c.skill,
        )
      )
        return false;
      seen.add(c.skill);
      return true;
    })
    .map((checkpoint) => {
      const evidence =
        profile.status === "confirmed"
          ? profile.evidence.find((e) => e.skill === checkpoint.skill)
          : undefined;
      return {
        ...checkpoint,
        evidence: evidence ?? null,
        state: evidence
          ? evidence.source === "resume"
            ? "resume_supported"
            : "user_reported"
          : "needs_confirmation",
      };
    });
  const supported = checkpoints.filter((c) => c.evidence).length;
  return {
    path,
    checkpoints,
    supported,
    total: checkpoints.length,
    coverage:
      checkpoints.length && profile.status === "confirmed"
        ? supported / checkpoints.length
        : null,
  };
}
export function fieldContext(
  path: Path,
  jobs: Job[],
  preferences: Preferences,
) {
  const sample = [
    ...new Map(
      eligibleJobs(jobs, preferences)
        .filter((j) => j.pathId === path.id)
        .map((j) => [`${j.sourceRepo}:${j.sourceKey}`, j]),
    ).values(),
  ];
  return {
    sampleSize: sample.length,
    checkedAt: sample[0]?.checkedAt ?? null,
    competition: "Competition data unavailable",
    tags: (["noSponsorship", "citizenship", "advancedDegree"] as const).map(
      (key) => ({
        key,
        count: sample.filter((j) => j.eligibility[key] === true).length,
        unknown: sample.filter((j) => j.eligibility[key] === null).length,
        total: sample.length,
      }),
    ),
  };
}
export function visibleResources(
  pathId: string,
  preferences: Preferences,
  resources: Resource[],
  now = new Date(),
) {
  return resources.filter(
    (r) =>
      r.pathIds.includes(pathId) &&
      r.reviewStatus === "reviewed" &&
      Date.parse(r.checkedAt) <= now.getTime() &&
      Date.parse(r.expiresAt) > now.getTime() &&
      (!r.inclusionCategory ||
        preferences.inclusion.includes(r.inclusionCategory)),
  );
}
const ExplanationSchema = z
  .object({
    strengths: z.array(
      z
        .object({
          requirementId: z.string(),
          evidence: z
            .object({
              skill: z.string(),
              excerpt: z.string(),
              source: z.enum(["resume", "user_reported"]),
            })
            .strict(),
        })
        .strict(),
    ),
    gaps: z.array(
      z
        .object({
          requirementId: z.string(),
          state: z.enum(["not_evidenced", "needs_confirmation"]),
        })
        .strict(),
    ),
    nextSteps: z
      .array(
        z
          .object({
            requirementId: z.string(),
            resourceId: z.string().optional(),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();
export function validateExplanation(
  profile: Profile,
  job: Job,
  input: unknown,
  resources: Resource[],
  now = new Date(),
  context?: {
    checklistVersion: number;
    confirmations: Confirmation[];
    preferences: Preferences;
  },
) {
  const result = ExplanationSchema.safeParse(input);
  if (!result.success || profile.status !== "confirmed") return false;
  const owns = (id: string) => job.requirements.some((r) => r.id === id);
  const confirmed = (id: string) => {
    const requirement = job.requirements.find((r) => r.id === id);
    return (
      !!requirement &&
      !!context &&
      !profile.evidence.some((e) => e.skill === requirement.skill) &&
      context.confirmations.some(
        (c) =>
          c.pathId === job.pathId &&
          c.skill === requirement.skill &&
          c.profileVersion === profile.version &&
          c.checklistVersion === context.checklistVersion &&
          Number.isFinite(Date.parse(c.confirmedAt)) &&
          Date.parse(c.confirmedAt) <= now.getTime(),
      )
    );
  };
  return (
    result.data.strengths.every(
      (s) =>
        owns(s.requirementId) &&
        job.requirements.find((r) => r.id === s.requirementId)?.skill ===
          s.evidence.skill &&
        profile.evidence.some(
          (e) =>
            e.skill === s.evidence.skill &&
            e.excerpt === s.evidence.excerpt &&
            e.source === s.evidence.source,
        ),
    ) &&
    result.data.gaps.every(
      (g) =>
        owns(g.requirementId) &&
        (g.state !== "not_evidenced" || confirmed(g.requirementId)) &&
        !profile.evidence.some(
          (e) =>
            e.skill ===
            job.requirements.find((r) => r.id === g.requirementId)?.skill,
        ),
    ) &&
    result.data.nextSteps.every(
      (s) =>
        owns(s.requirementId) &&
        confirmed(s.requirementId) &&
        (!s.resourceId ||
          resources.some(
            (r) =>
              r.id === s.resourceId &&
              (!r.inclusionCategory ||
                context?.preferences.inclusion.includes(r.inclusionCategory)) &&
              r.reviewStatus === "reviewed" &&
              Date.parse(r.checkedAt) <= now.getTime() &&
              Date.parse(r.expiresAt) > now.getTime() &&
              r.pathIds.includes(job.pathId) &&
              r.skill ===
                job.requirements.find((req) => req.id === s.requirementId)
                  ?.skill,
          )),
    )
  );
}
// Static import validates the entire batch before replacing the last-good catalog.
export function seedCatalog(previous: Job[], incoming: unknown[]): Job[] {
  const batch = incoming.map((value) => JobSchema.parse(value));
  const map = new Map(
    previous.map((job) => [`${job.sourceRepo}:${job.sourceKey}`, job]),
  );
  for (const job of batch) {
    const key = `${job.sourceRepo}:${job.sourceKey}`;
    const prior = map.get(key);
    if (prior && prior.id !== job.id)
      throw new OpportunityError(
        "SOURCE_KEY_CONFLICT",
        "Stable source identity changed.",
      );
    map.set(key, job);
  }
  return [...map.values()];
}
import { JobSchema } from "./contracts.ts";
