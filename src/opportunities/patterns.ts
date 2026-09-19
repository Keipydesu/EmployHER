import type {
  Job,
  Path,
  Preferences,
  Profile,
  Plan,
  Resource,
  Skill,
} from "./contracts.ts";
import { eligibleJobs, visibleResources } from "./engine.ts";

export type RequirementReference = {
  jobId: string;
  jobVersion: number;
  requirementId: string;
  excerpt: string;
  sourceUrl: string;
  sourceRepo: string;
  sourceCommit: string;
  checkedAt: string;
};
// Counts are per distinct listing, never per repeated skill mention.
export function aggregatePatterns(
  path: Path,
  jobs: Job[],
  preferences: Preferences,
  catalogVersion: string,
) {
  const bySource = new Map<string, Job>();
  for (const job of eligibleJobs(jobs, preferences)
    .filter((j) => j.pathId === path.id)
    .sort(
      (a, b) =>
        b.version - a.version ||
        b.checkedAt.localeCompare(a.checkedAt) ||
        a.id.localeCompare(b.id),
    )) {
    const key = JSON.stringify([job.sourceRepo, job.sourceKey]);
    if (!bySource.has(key)) bySource.set(key, job);
  }
  const sample = [...bySource.values()];
  const patterns = new Map<
    Skill,
    { skill: Skill; listingIds: string[]; requirements: RequirementReference[] }
  >();
  let knownRequirements = 0;
  for (const job of sample) {
    const reviewed = job.requirements.filter(
      (r) => r.excerpt.trim() && r.text.trim(),
    );
    if (reviewed.length) knownRequirements++;
    for (const r of reviewed) {
      const pattern = patterns.get(r.skill) ?? {
        skill: r.skill,
        listingIds: [],
        requirements: [],
      };
      if (!pattern.listingIds.includes(job.id)) pattern.listingIds.push(job.id);
      if (
        !pattern.requirements.some(
          (ref) => ref.jobId === job.id && ref.requirementId === r.id,
        )
      )
        pattern.requirements.push({
          jobId: job.id,
          jobVersion: job.version,
          requirementId: r.id,
          excerpt: r.excerpt,
          sourceUrl: job.sourceUrl,
          sourceRepo: job.sourceRepo,
          sourceCommit: job.sourceCommit,
          checkedAt: job.checkedAt,
        });
      patterns.set(r.skill, pattern);
    }
  }
  return {
    version: "requirement-patterns-v1" as const,
    catalogVersion,
    scope: {
      pathId: path.id,
      checklistVersion: path.version,
      preferences: structuredClone(preferences),
    },
    sampleSize: sample.length,
    knownRequirements,
    unknownRequirements: sample.length - knownRequirements,
    snapshotDates: [...new Set(sample.map((j) => j.checkedAt))].sort(),
    synthetic: sample.some((j) => j.synthetic),
    limitation:
      "Counts describe this reviewed listing sample, not the whole market, competition, or changes over time. A listing without a reviewed excerpt is unknown, not evidence that a skill is unnecessary.",
    patterns: [...patterns.values()]
      .sort(
        (a, b) =>
          b.listingIds.length - a.listingIds.length ||
          a.skill.localeCompare(b.skill),
      )
      .map((p) => ({
        ...p,
        listingCount: p.listingIds.length,
        knownDenominator: knownRequirements,
      })),
  };
}
export function careerGuidance(
  profile: Profile,
  path: Path,
  plan: Plan,
  jobs: Job[],
  preferences: Preferences,
  resources: Resource[],
  catalogVersion: string,
  now = new Date(),
) {
  const patterns = aggregatePatterns(path, jobs, preferences, catalogVersion);
  const visible = visibleResources(path.id, preferences, resources, now);
  return {
    patterns,
    profileVersion: profile.version,
    checklistVersion: path.version,
    checkpoints: patterns.patterns.map((pattern) => {
      const evidence =
        profile.status === "confirmed"
          ? profile.evidence.filter((e) => e.skill === pattern.skill)
          : [];
      const confirmed =
        profile.status === "confirmed" &&
        evidence.length === 0 &&
        plan.confirmations.some(
          (c) =>
            c.pathId === path.id &&
            c.skill === pattern.skill &&
            c.profileVersion === profile.version &&
            c.checklistVersion === path.version &&
            Number.isFinite(Date.parse(c.confirmedAt)) &&
            Date.parse(c.confirmedAt) <= now.getTime(),
        );
      return {
        ...pattern,
        evidence,
        state: evidence.length
          ? ("evidenced" as const)
          : confirmed
            ? ("confirmed_learning_need" as const)
            : ("needs_clarification" as const),
        resourceIds: confirmed
          ? visible.filter((r) => r.skill === pattern.skill).map((r) => r.id)
          : [],
        rationale: `${pattern.listingCount} of ${patterns.knownRequirements} listings with reviewed requirements mention this skill.`,
      };
    }),
  };
}
