import type { CareerAnalysis } from "../../opportunities/gemini-career.ts";
import type { Interests } from "../../opportunities/interests.ts";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Profile } from "../../opportunities/contracts.ts";
import { OpportunityError } from "../../opportunities/engine.ts";
import {
  changePlan,
  freshPlan,
  reconcilePlan,
  type SavedPlan,
  type VersionedCatalog,
} from "../../opportunities/saved-plan.ts";
import { PostgresOperations } from "./operations.ts";

type Transaction = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];
const unavailable = () =>
  new OpportunityError("NOT_FOUND", "Profile unavailable.", 404);
// Profiles and catalogs here come from trusted repositories/bridge, never request JSON.
export class CareerPlans {
  constructor(
    private db: NodePgDatabase,
    private operations: PostgresOperations,
  ) {}
  private async snapshot(
    tx: Transaction,
    owner: string,
    profile: Profile,
    catalog: VersionedCatalog,
  ) {
    const account = await tx.execute(
      sql`SELECT id FROM app_users WHERE id=${owner}::uuid AND deletion_requested_at IS NULL FOR UPDATE`,
    );
    if (!account.rowCount) throw unavailable();
    const head = await tx.execute(
      sql`SELECT current_version FROM resume_profile_heads WHERE id=${profile.id}::uuid AND owner_id=${owner}::uuid AND expires_at>clock_timestamp() FOR UPDATE`,
    );
    if (!head.rowCount) throw unavailable();
    if (head.rows[0].current_version !== profile.version)
      throw new OpportunityError(
        "STALE_VERSION",
        "Profile changed. Reload your plan.",
        409,
      );
    const active = await tx.execute(
      sql`SELECT version FROM opportunity_catalog_state WHERE singleton=true FOR SHARE`,
    );
    if (active.rows[0]?.version !== catalog.version)
      throw new OpportunityError(
        "STALE_CATALOG",
        "Catalog changed or is unavailable. Reload your plan.",
        409,
      );
    const row = await tx.execute(
      sql`SELECT payload FROM career_plans WHERE owner_id=${owner}::uuid FOR UPDATE`,
    );
    return row.rowCount
      ? (row.rows[0].payload as SavedPlan)
      : freshPlan(profile, catalog);
  }
  async read(owner: string, profile: Profile, catalog: VersionedCatalog) {
    return this.db.transaction(async (tx) =>
      reconcilePlan(
        await this.snapshot(tx, owner, profile, catalog),
        profile,
        catalog,
      ),
    );
  }
  async update(
    owner: string,
    profile: Profile,
    catalog: VersionedCatalog,
    command: unknown,
    key: string,
    interests?: Interests,
    recommendation?: CareerAnalysis["recommendations"][number],
  ) {
    // Even an idempotent replay must not expose an expired/foreign profile or
    // guidance from an obsolete catalog. The mutation rechecks under its locks.
    await this.read(owner, profile, catalog);
    const digest = createHash("sha256")
      .update(
        JSON.stringify([
          profile.id,
          profile.version,
          catalog.version,
          command,
          interests,
          recommendation,
        ]),
      )
      .digest("hex");
    const result = await this.operations.run(
      owner,
      "career-plan",
      key,
      digest,
      async () => {
        return this.db.transaction(async (tx) => {
          const saved = await this.snapshot(tx, owner, profile, catalog);
          if (interests) {
            const row = await tx.execute(
              sql`SELECT interest_version FROM app_users WHERE id=${owner}::uuid`,
            );
            if (row.rows[0].interest_version !== interests.version)
              throw new OpportunityError(
                "STALE_VERSION",
                "Your interests changed. Reload guidance.",
                409,
              );
            if (
              !interests.fields.includes(
                saved.plan.pathId as Interests["fields"][number],
              )
            ) {
              const pathId = interests.fields.find((id) =>
                catalog.paths.some((p) => p.id === id),
              );
              if (!pathId)
                throw new OpportunityError(
                  "FIELD_NOT_SELECTED",
                  "Choose an available interest first.",
                  409,
                );
              saved.plan.pathId = pathId;
            }
          }
          const next = changePlan(
            saved,
            profile,
            catalog,
            command,
            new Date(),
            recommendation,
          );
          await tx.execute(sql`INSERT INTO career_plans(owner_id,profile_id,version,payload) VALUES(${owner}::uuid,${profile.id}::uuid,${next.version},${JSON.stringify(next)}::jsonb)
          ON CONFLICT(owner_id) DO UPDATE SET profile_id=EXCLUDED.profile_id,version=EXCLUDED.version,payload=EXCLUDED.payload,updated_at=now()`);
          await this.operations.completeResult(tx, owner, next);
          return next;
        });
      },
    );
    await this.read(owner, profile, catalog);
    return result;
  }
}
