import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { OpportunityError } from "../../opportunities/engine.ts";
import type { CareerAnalysis } from "../../opportunities/gemini-career.ts";
import { PostgresOperations } from "./operations.ts";
export type AnalysisScope = {
  owner: string;
  profileId: string;
  profileVersion: number;
  catalogVersion: string;
  planVersion: number;
  model: string;
  contextHash: string;
  interestVersion?: number;
};
type Transaction = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];
export class CareerAnalyses {
  constructor(
    private db: NodePgDatabase,
    private operations: PostgresOperations,
  ) {}
  private async check(tx: Transaction, s: AnalysisScope) {
    const owner = await tx.execute(
      sql`SELECT id FROM app_users WHERE id=${s.owner}::uuid AND deletion_requested_at IS NULL FOR UPDATE`,
    );
    if (!owner.rowCount)
      throw new OpportunityError("NOT_FOUND", "Account unavailable.", 404);
    if (s.interestVersion !== undefined) {
      const interests = await tx.execute(
        sql`SELECT interest_version FROM app_users WHERE id=${s.owner}::uuid`,
      );
      if (interests.rows[0].interest_version !== s.interestVersion)
        throw new OpportunityError(
          "STALE_VERSION",
          "Your interests changed. Reload your guidance.",
          409,
        );
    }
    const profile = await tx.execute(
      sql`SELECT current_version FROM resume_profile_heads WHERE id=${s.profileId}::uuid AND owner_id=${s.owner}::uuid AND expires_at>clock_timestamp() FOR UPDATE`,
    );
    if (!profile.rowCount)
      throw new OpportunityError("NOT_FOUND", "Profile unavailable.", 404);
    const catalog = await tx.execute(
      sql`SELECT version FROM opportunity_catalog_state WHERE singleton=true FOR SHARE`,
    );
    const plan = await tx.execute(
      sql`SELECT version FROM career_plans WHERE owner_id=${s.owner}::uuid FOR UPDATE`,
    );
    if (
      profile.rows[0].current_version !== s.profileVersion ||
      catalog.rows[0]?.version !== s.catalogVersion ||
      (plan.rows[0]?.version ?? 0) !== s.planVersion
    )
      throw new OpportunityError(
        "STALE_VERSION",
        "Your inputs changed. Generate an updated recommendation.",
        409,
      );
  }
  async read(scope: AnalysisScope): Promise<CareerAnalysis | null> {
    return this.db.transaction(async (tx) => {
      await this.check(tx, scope);
      const row = await tx.execute(
        sql`SELECT payload FROM career_analyses WHERE owner_id=${scope.owner}::uuid AND context_hash=${scope.contextHash}`,
      );
      return row.rowCount ? (row.rows[0].payload as CareerAnalysis) : null;
    });
  }
  async generate(
    scope: AnalysisScope,
    key: string,
    work: () => Promise<CareerAnalysis>,
  ) {
    const cached = await this.read(scope);
    const digest = createHash("sha256")
      .update(JSON.stringify(scope))
      .digest("hex");
    const result = await this.operations.run(
      scope.owner,
      "career-analysis",
      key,
      digest,
      async () => {
        // Provider calls run outside database transactions. Late results must
        // acquire the same owner/head/catalog/plan locks and recheck all versions.
        const proposed = cached ?? (await work());
        return this.db.transaction(async (tx) => {
          await this.check(tx, scope);
          const inserted = await tx.execute(
            sql`INSERT INTO career_analyses(owner_id,context_hash,profile_id,payload) VALUES(${scope.owner}::uuid,${scope.contextHash},${scope.profileId}::uuid,${JSON.stringify(proposed)}::jsonb) ON CONFLICT(owner_id,context_hash) DO NOTHING RETURNING payload`,
          );
          const row = inserted.rowCount
            ? inserted
            : await tx.execute(
                sql`SELECT payload FROM career_analyses WHERE owner_id=${scope.owner}::uuid AND context_hash=${scope.contextHash}`,
              );
          const winner = row.rows[0].payload as CareerAnalysis;
          await this.operations.completeResult(tx, scope.owner, winner);
          return winner;
        });
      },
    );
    await this.read(scope);
    return result;
  }
}
