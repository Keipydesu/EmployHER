import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { ProfileError } from "../../profile/errors.ts";
export type Identity = { issuer: string; subject: string };
export class Owners {
  constructor(private pool: Pool) {}
  async recordConsent(owner: string, version: string) {
    const result = await this.pool.query(
      "UPDATE app_users SET consent_version=$2,consent_at=clock_timestamp() WHERE id=$1 AND deletion_requested_at IS NULL RETURNING id",
      [owner, version],
    );
    if (!result.rowCount)
      throw new ProfileError(
        "ACCOUNT_DELETING",
        403,
        "Your account is unavailable for résumé processing.",
      );
  }
  async resolve(
    identity: Identity | null,
    write = false,
    allowDeleted = false,
  ) {
    if (!identity?.issuer || !identity.subject)
      throw new ProfileError("UNAUTHENTICATED", 401, "Sign in to continue.");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO app_users(id,auth_issuer,auth_subject) VALUES($1,$2,$3) ON CONFLICT(auth_issuer,auth_subject) DO NOTHING",
        [randomUUID(), identity.issuer, identity.subject],
      );
      const {
        rows: [owner],
      } = await client.query(
        "SELECT id,deletion_requested_at,consent_version FROM app_users WHERE auth_issuer=$1 AND auth_subject=$2 FOR UPDATE",
        [identity.issuer, identity.subject],
      );
      if (!owner || (owner.deletion_requested_at && !allowDeleted))
        throw new ProfileError(
          "ACCOUNT_DELETING",
          403,
          "Your data deletion is in progress or completed.",
        );
      if (write) {
        for (const [scope, limit] of [
          ["global", 1000],
          [owner.id, 30],
        ] as const) {
          const {
            rows: [quota],
          } = await client.query(
            `INSERT INTO app_request_quotas(scope,day,count) VALUES($1,CURRENT_DATE,1)
            ON CONFLICT(scope,day) DO UPDATE SET count=app_request_quotas.count+1 RETURNING count`,
            [scope],
          );
          if (quota.count > limit)
            throw new ProfileError(
              "RATE_LIMITED",
              429,
              "Daily processing limit reached. Try again later.",
            );
        }
      }
      await client.query("COMMIT");
      return owner.id as string;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
