import { test } from "node:test";
import assert from "node:assert/strict";
import { jobs, resources } from "../src/opportunities/catalog.ts";
import {
  derivePaths,
  validateCatalogBatch,
} from "../src/opportunities/reviewed-catalog.ts";
function batch() {
  const rows = jobs
    .filter(
      (j) =>
        ["software", "ml", "product", "quant", "hardware"].includes(j.pathId) &&
        j.id !== "demo-discovery" &&
        j.status === "open",
    )
    .map((j, i) => ({
      ...structuredClone(j),
      synthetic: false,
      sourceRepo:
        i % 2
          ? "SimplifyJobs/New-Grad-Positions"
          : "SimplifyJobs/Summer2027-Internships",
      sourceCommit: "a".repeat(40),
      applyUrl: "https://example.org/apply",
      embedding: Array.from({ length: 768 }, (_, n) => (n === 0 ? 1 : 0)),
    }));
  const paths = derivePaths(rows);
  return {
    version: "test-catalog",
    embeddingModel: "gemini-embedding-001",
    embeddingConfig: "profile-semantic-v1",
    dimension: 768,
    jobs: rows,
    paths,
    resources: resources.slice(0, 3).map((r) => ({
      ...r,
      pathIds: ["software"],
      checkedAt: "2026-09-18T00:00:00.000Z",
      expiresAt: "2026-10-18T00:00:00.000Z",
    })),
  };
}
const now = new Date("2026-09-19T00:00:00.000Z");
test("reviewed catalog validation accepts complete batches and preserves exact checkpoint references", () => {
  const parsed = validateCatalogBatch(batch(), now);
  assert.equal(parsed.jobs.length, 15);
  for (const path of parsed.paths)
    for (const checkpoint of path.checkpoints)
      assert.ok(checkpoint.requirementIds.length);
});
test("catalog activation rejects duplicates, ungrounded requirements, expired resources and incompatible vectors before writes", () => {
  const duplicate = batch();
  duplicate.jobs[1] = duplicate.jobs[0];
  assert.throws(() => validateCatalogBatch(duplicate, now), /duplicate/);
  const source = batch();
  source.jobs[0].sourceCommit = "dev";
  assert.throws(() => validateCatalogBatch(source, now), /provenance/);
  const vector = batch();
  vector.jobs[0].embedding = Array(768).fill(0);
  assert.throws(() => validateCatalogBatch(vector, now), /vector/);
  const gap = batch();
  gap.paths[0].checkpoints[0].requirementIds = ["invented"];
  assert.throws(() => validateCatalogBatch(gap, now), /ungrounded/);
  const expired = batch();
  expired.resources[0].expiresAt = "2026-09-18T00:00:00.000Z";
  assert.throws(() => validateCatalogBatch(expired, now), /expired/);
});
