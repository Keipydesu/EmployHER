import { z } from "zod";
import {
  JobSchema,
  ResourceSchema,
  SkillSchema,
  type Path,
} from "./contracts.ts";
import { validVector } from "./engine.ts";
const PathSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    parentId: z.string().nullable(),
    version: z.number().int().positive(),
    checkpoints: z.array(
      z
        .object({
          skill: SkillSchema,
          requirementIds: z.array(z.string()).min(1),
        })
        .strict(),
    ),
  })
  .strict();
export const CatalogBatchSchema = z
  .object({
    version: z.string().min(1).max(120),
    embeddingModel: z.literal("gemini-embedding-001"),
    embeddingConfig: z.literal("profile-semantic-v1"),
    dimension: z.literal(768),
    jobs: z.array(JobSchema).min(15).max(500),
    paths: z.array(PathSchema).min(5).max(30),
    resources: z.array(ResourceSchema).min(3).max(100),
  })
  .strict();
export type CatalogBatch = z.infer<typeof CatalogBatchSchema>;
export function validateCatalogBatch(
  raw: unknown,
  now = new Date(),
): CatalogBatch {
  const batch = CatalogBatchSchema.parse(raw);
  const unique = (values: string[]) => new Set(values).size === values.length;
  const fail = (message: string): never => {
    throw new Error(`Invalid reviewed catalog: ${message}`);
  };
  if (
    !unique(batch.jobs.map((j) => j.id)) ||
    !unique(
      batch.jobs.map((j) => JSON.stringify([j.sourceRepo, j.sourceKey])),
    ) ||
    !unique(batch.paths.map((p) => p.id)) ||
    !unique(batch.resources.map((r) => r.id))
  )
    fail("duplicate records");
  const repos = new Set([
    "SimplifyJobs/Summer2027-Internships",
    "SimplifyJobs/New-Grad-Positions",
  ]);
  if (
    new Set(batch.jobs.map((j) => j.sourceRepo)).size !== 2 ||
    new Set(batch.jobs.map((j) => j.roleType)).size !== 2
  )
    fail("both source repositories and cohorts are required");
  for (const job of batch.jobs) {
    if (
      job.synthetic ||
      !repos.has(job.sourceRepo) ||
      !/^[a-f0-9]{40}$/.test(job.sourceCommit) ||
      !job.applyUrl ||
      !validVector(job.embedding, 768)
    )
      fail("source provenance or provider vector unavailable");
    if (Date.parse(job.checkedAt) > now.getTime()) fail("future source check");
    if (!batch.paths.some((p) => p.id === job.pathId)) fail("unknown path");
    if (!unique(job.requirements.map((r) => r.id)))
      fail("duplicate requirements");
    for (const requirement of job.requirements)
      if (!requirement.excerpt.trim() || !requirement.text.trim())
        fail("empty requirement evidence");
  }
  for (const path of batch.paths) {
    if (path.parentId && !batch.paths.some((p) => p.id === path.parentId))
      fail("unknown parent path");
    if (!unique(path.checkpoints.map((c) => c.skill)))
      fail("duplicate checkpoint");
    for (const checkpoint of path.checkpoints)
      for (const id of checkpoint.requirementIds) {
        if (
          !batch.jobs.some(
            (j) =>
              j.pathId === path.id &&
              j.requirements.some(
                (r) => r.id === id && r.skill === checkpoint.skill,
              ),
          )
        )
          fail("ungrounded checkpoint");
      }
  }
  for (const resource of batch.resources) {
    if (
      resource.reviewStatus !== "reviewed" ||
      Date.parse(resource.checkedAt) > now.getTime() ||
      Date.parse(resource.expiresAt) <= now.getTime() ||
      !resource.excerpt.trim()
    )
      fail("unreviewed or expired resource");
    if (resource.pathIds.some((id) => !batch.paths.some((p) => p.id === id)))
      fail("unknown resource path");
  }
  return batch;
}
export function derivePaths(jobs: CatalogBatch["jobs"]): Path[] {
  const labels: Record<string, string> = {
    software: "Software Engineering",
    ml: "Data Science, AI & ML",
    product: "Product Management",
    quant: "Quantitative Finance",
    hardware: "Hardware Engineering",
  };
  return Object.entries(labels).map(([id, title]) => ({
    id,
    title,
    parentId: null,
    version: 1,
    checkpoints: [
      ...new Set(
        jobs
          .filter((j) => j.pathId === id)
          .flatMap((j) => j.requirements.map((r) => r.skill)),
      ),
    ].map((skill) => ({
      skill,
      requirementIds: jobs
        .filter((j) => j.pathId === id)
        .flatMap((j) =>
          j.requirements.filter((r) => r.skill === skill).map((r) => r.id),
        ),
    })),
  }));
}
