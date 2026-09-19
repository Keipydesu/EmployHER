import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type { Operations } from "../../profile/ports.ts";
import type { Profile } from "../../profile/contracts.ts";
import { ProfileError } from "../../profile/errors.ts";

type Lease = { owner: string; kind: string; key: string; token: string };
type Transaction = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];
const unavailable = () =>
  new ProfileError("NOT_FOUND", 404, "Account unavailable.");
export class PostgresOperations implements Operations {
  private context = new AsyncLocalStorage<Lease>();
  constructor(private pool: Pool) {}
  async lockOwner(tx: Transaction) {
    const lease = this.context.getStore();
    if (!lease) throw unavailable();
    const owner = await tx.execute(
      sql`SELECT id FROM app_users WHERE id=${lease.owner}::uuid AND deletion_requested_at IS NULL FOR UPDATE`,
    );
    if (!owner.rowCount) throw unavailable();
  }
  // Called inside the same transaction as the profile insert/revision. A worker
  // whose lease was superseded cannot commit either data or its replay result.
  async completeProfile(tx: Transaction, profile: Profile) {
    return this.completeResult(tx, profile.ownerId, profile);
  }
  async completeResult(tx: Transaction, ownerId: string, value: unknown) {
    const lease = this.context.getStore();
    if (!lease || lease.owner !== ownerId) throw unavailable();
    const result =
      await tx.execute(sql`UPDATE app_operations SET state='done', result=${JSON.stringify(value)}::jsonb
      WHERE owner_id=${lease.owner}::uuid AND kind=${lease.kind} AND key=${lease.key}
      AND lease_token=${lease.token}::uuid AND state='pending'
      AND lease_expires_at > clock_timestamp() AND expires_at > clock_timestamp()
      AND EXISTS(SELECT 1 FROM app_users WHERE id=${lease.owner}::uuid AND deletion_requested_at IS NULL)
      RETURNING owner_id`);
    if (!result.rowCount)
      throw new ProfileError(
        "OPERATION_EXPIRED",
        409,
        "Operation expired. Retry with the same key.",
        true,
      );
  }
  async run<T>(
    owner: string,
    kind: string,
    key: string,
    digest: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const token = randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const account = await client.query(
        "SELECT id FROM app_users WHERE id=$1 AND deletion_requested_at IS NULL FOR UPDATE",
        [owner],
      );
      if (!account.rowCount) throw unavailable();
      const prior = await client.query(
        "SELECT *, expires_at > clock_timestamp() AS replay_valid, lease_expires_at > clock_timestamp() AS lease_valid FROM app_operations WHERE owner_id=$1 AND kind=$2 AND key=$3 FOR UPDATE",
        [owner, kind, key],
      );
      const row = prior.rows[0];
      if (row && row.digest !== digest)
        throw new ProfileError(
          "IDEMPOTENCY_CONFLICT",
          409,
          "This key was already used for different input.",
        );
      if (row && !row.replay_valid)
        throw new ProfileError(
          "OPERATION_EXPIRED",
          409,
          "This operation is outside its replay window. Use a new key.",
        );
      if (row?.state === "done") {
        await client.query("COMMIT");
        return row.result as T;
      }
      if (row?.lease_valid)
        throw new ProfileError(
          "OPERATION_PENDING",
          409,
          "This operation is still running.",
          true,
        );
      await client.query(
        `INSERT INTO app_operations(owner_id,kind,key,digest,state,lease_token,lease_expires_at,expires_at)
        VALUES($1,$2,$3,$4,'pending',$5,now()+interval '60 seconds',now()+interval '24 hours')
        ON CONFLICT(owner_id,kind,key) DO UPDATE SET lease_token=$5,lease_expires_at=now()+interval '60 seconds'`,
        [owner, kind, key, digest, token],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    try {
      const value = await this.context.run({ owner, kind, key, token }, work);
      const saved = await this.pool.query(
        "SELECT result FROM app_operations WHERE owner_id=$1 AND kind=$2 AND key=$3 AND lease_token=$4 AND state='done'",
        [owner, kind, key, token],
      );
      if (!saved.rowCount)
        throw new ProfileError(
          "OPERATION_NOT_COMMITTED",
          500,
          "Operation result was not committed atomically.",
        );
      return value;
    } catch (error) {
      // Keep the input digest/window even after failure; a retry cannot change
      // intent under the same key. Never erase another worker's completed result.
      await this.pool.query(
        "UPDATE app_operations SET lease_expires_at=now() WHERE owner_id=$1 AND kind=$2 AND key=$3 AND lease_token=$4 AND state='pending'",
        [owner, kind, key, token],
      );
      throw error;
    }
  }
}
