import { createHash } from "node:crypto";
import type { Pool } from "pg";
import {
  validateCatalogBatch,
  type CatalogBatch,
} from "../../opportunities/reviewed-catalog.ts";
import { OpportunityError, validVector } from "../../opportunities/engine.ts";
import type { Preferences } from "../../opportunities/contracts.ts";
export class ReviewedCatalog {
  constructor(private pool: Pool) {}
  async activate(raw: unknown) {
    const batch = validateCatalogBatch(raw);
    const digest = createHash("sha256")
      .update(JSON.stringify(batch))
      .digest("hex");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(76543522)");
      const prior = await client.query(
        "SELECT digest FROM opportunity_catalog_batches WHERE version=$1",
        [batch.version],
      );
      if (prior.rowCount && prior.rows[0].digest !== digest)
        throw new Error("Catalog version already contains different data.");
      // Take the same catalog lock readers use before replacing any active rows.
      await client.query(
        "SELECT version FROM opportunity_catalog_state WHERE singleton=true FOR UPDATE",
      );
      await client.query(
        "INSERT INTO opportunity_catalog_batches(version,digest,payload) VALUES($1,$2,$3) ON CONFLICT(version) DO NOTHING",
        [batch.version, digest, JSON.stringify(batch)],
      );
      await client.query("DELETE FROM opportunity_jobs");
      for (const job of batch.jobs)
        await client.query(
          "INSERT INTO opportunity_jobs(id,catalog_version,status,role_type,remote_mode,location,path_id,embedding_config,embedding,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10)",
          [
            job.id,
            batch.version,
            job.status,
            job.roleType,
            job.remote,
            job.location,
            job.pathId,
            JSON.stringify([
              batch.embeddingModel,
              batch.embeddingConfig,
              batch.dimension,
            ]),
            `[${job.embedding.join(",")}]`,
            JSON.stringify(job),
          ],
        );
      await client.query(
        "INSERT INTO opportunity_catalog_state(singleton,version) VALUES(true,$1) ON CONFLICT(singleton) DO UPDATE SET version=EXCLUDED.version",
        [batch.version],
      );
      await client.query("COMMIT");
      return {
        version: batch.version,
        jobs: batch.jobs.length,
        resources: batch.resources.length,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async active(): Promise<CatalogBatch> {
    const result = await this.pool.query(
      "SELECT payload FROM opportunity_catalog_batches b JOIN opportunity_catalog_state s ON s.version=b.version WHERE s.singleton=true",
    );
    if (!result.rowCount)
      throw new OpportunityError(
        "CATALOG_UNAVAILABLE",
        "Reviewed catalog is not configured.",
        503,
      );
    // Expired resource visibility is enforced by the rendering layer, not by
    // refusing all catalog reads when a single community link reaches its TTL.
    return result.rows[0].payload as CatalogBatch;
  }
  async retrieve(
    batch: CatalogBatch,
    vector: number[],
    preferences: Preferences,
    pathId: string,
  ) {
    if (!validVector(vector, 768))
      throw new OpportunityError(
        "INVALID_VECTOR",
        "Incompatible profile embedding.",
      );
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        "SELECT version FROM opportunity_catalog_state WHERE singleton=true FOR SHARE",
      );
      if (current.rows[0]?.version !== batch.version)
        throw new OpportunityError(
          "STALE_CATALOG",
          "Catalog changed. Reload guidance.",
          409,
        );
      const rows = await client.query(
        `SELECT payload FROM opportunity_jobs WHERE catalog_version=$2 AND embedding_config=$3 AND status='open' AND path_id=$4 AND ($5='any' OR role_type=$5) AND ($6='any' OR remote_mode=$6) AND ($7='any' OR location=$7) ORDER BY embedding <=> $1::vector,id ASC LIMIT 20`,
        [
          `[${vector.join(",")}]`,
          batch.version,
          JSON.stringify([
            batch.embeddingModel,
            batch.embeddingConfig,
            batch.dimension,
          ]),
          pathId,
          preferences.roleType,
          preferences.remote,
          preferences.location,
        ],
      );
      await client.query("COMMIT");
      return rows.rows.map(
        (row) => row.payload as CatalogBatch["jobs"][number],
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
