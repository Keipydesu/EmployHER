import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  InterestUpdateSchema,
  type Interests,
} from "../../opportunities/interests.ts";
import { OpportunityError } from "../../opportunities/engine.ts";
import { PostgresOperations } from "./operations.ts";
type Transaction = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];
export class AccountInterests {
  constructor(
    private db: NodePgDatabase,
    private operations: PostgresOperations,
  ) {}
  private async snapshot(tx: Transaction, owner: string): Promise<Interests> {
    const result = await tx.execute(
      sql`SELECT interest_version,interest_fields FROM app_users WHERE id=${owner}::uuid AND deletion_requested_at IS NULL FOR UPDATE`,
    );
    if (!result.rowCount)
      throw new OpportunityError("NOT_FOUND", "Account unavailable.", 404);
    return {
      version: result.rows[0].interest_version as number,
      fields: result.rows[0].interest_fields as Interests["fields"],
    };
  }
  read(owner: string) {
    return this.db.transaction((tx) => this.snapshot(tx, owner));
  }
  async update(owner: string, raw: unknown, key: string) {
    const input = InterestUpdateSchema.parse(raw);
    await this.read(owner);
    const digest = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const result = await this.operations.run(
      owner,
      "account-interests",
      key,
      digest,
      async () =>
        this.db.transaction(async (tx) => {
          const current = await this.snapshot(tx, owner);
          if (current.version !== input.expectedVersion)
            throw new OpportunityError(
              "STALE_VERSION",
              "Your interests changed. Reload before saving.",
              409,
            );
          const next: Interests = {
            version: current.version + 1,
            fields: input.fields,
          };
          await tx.execute(
            sql`UPDATE app_users SET interest_version=${next.version},interest_fields=${JSON.stringify(next.fields)}::jsonb WHERE id=${owner}::uuid`,
          );
          await this.operations.completeResult(tx, owner, next);
          return next;
        }),
    );
    await this.read(owner);
    return result;
  }
}
