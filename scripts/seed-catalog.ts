import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { JobSchema, ResourceSchema } from "../src/opportunities/contracts.ts";
import {
  derivePaths,
  validateCatalogBatch,
} from "../src/opportunities/reviewed-catalog.ts";
import { GeminiProfileAI } from "../src/profile/adapters/gemini.ts";
import { createDatabase } from "../src/server/platform/database.ts";
import { ReviewedCatalog } from "../src/server/platform/catalog.ts";
const manifestSchema = z
  .object({
    version: z.string().min(1),
    jobs: z.array(JobSchema.omit({ embedding: true })).min(15),
    resources: z.array(ResourceSchema).min(3),
  })
  .strict();
async function main() {
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile("data/catalog/reviewed-2026-09-19.json", "utf8")),
  );
  const model = "gemini-embedding-001";
  if (process.env.GEMINI_EMBEDDING_MODEL !== model)
    throw new Error("Set the agreed embedding model before seeding.");
  const ai = new GeminiProfileAI(
    process.env.GEMINI_API_KEY ?? "",
    process.env.GEMINI_MODEL ?? "",
    model,
  );
  await mkdir(".catalog-cache", { recursive: true });
  const jobs = [];
  for (const job of manifest.jobs) {
    const text = JSON.stringify({
      title: job.title,
      path: job.pathId,
      requirements: job.requirements.map((r) => r.text),
      qualifications: job.qualificationNotes ?? [],
    });
    const hash = createHash("sha256")
      .update(JSON.stringify([model, "profile-semantic-v1", 768, text]))
      .digest("hex");
    const cache = `.catalog-cache/${hash}.json`;
    let embedding;
    try {
      embedding = JSON.parse(await readFile(cache, "utf8"));
    } catch {
      embedding = await ai.embed(text, AbortSignal.timeout(20000));
      await writeFile(cache, JSON.stringify(embedding));
    }
    if (
      embedding.model !== model ||
      embedding.config !== "profile-semantic-v1" ||
      embedding.dimensions !== 768 ||
      embedding.simulated
    )
      throw new Error("Cached embedding is incompatible.");
    jobs.push({ ...job, embedding: embedding.values });
  }
  const batch = validateCatalogBatch({
    ...manifest,
    jobs,
    paths: derivePaths(jobs),
    embeddingModel: model,
    embeddingConfig: "profile-semantic-v1",
    dimension: 768,
  });
  if (process.argv.includes("--validate-only")) {
    console.log(
      `Validated ${batch.jobs.length} provider-embedded roles and ${batch.resources.length} resources; no database writes.`,
    );
    return;
  }
  const { pool } = createDatabase();
  try {
    console.log(await new ReviewedCatalog(pool).activate(batch));
  } finally {
    await pool.end();
  }
}
void main().catch(() => {
  console.error(
    "Catalog seed failed. Check reviewed data, provider quota and database migrations. No credentials are logged.",
  );
  process.exitCode = 1;
});
