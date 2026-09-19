import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { ProfileError } from "../../profile/errors.ts";
export class Lifecycle {
  constructor(private pool: Pool) {}
  async latest(owner: string) {
    const result = await this.pool.query(
      "SELECT id FROM app_deletions WHERE owner_id=$1",
      [owner],
    );
    return result.rowCount ? this.status(owner, result.rows[0].id) : null;
  }
  async request(owner: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const account = await client.query(
        "SELECT id FROM app_users WHERE id=$1 FOR UPDATE",
        [owner],
      );
      if (!account.rowCount)
        throw new ProfileError("NOT_FOUND", 404, "Account unavailable.");
      await client.query(
        "UPDATE app_users SET deletion_requested_at=COALESCE(deletion_requested_at,now()) WHERE id=$1",
        [owner],
      );
      await client.query(
        `INSERT INTO profile_owner_lifecycle(owner_id,deleted_at) VALUES($1,now()) ON CONFLICT(owner_id) DO UPDATE SET deleted_at=COALESCE(profile_owner_lifecycle.deleted_at,now())`,
        [owner],
      );
      const {
        rows: [row],
      } = await client.query(
        `INSERT INTO app_deletions(id,owner_id,status) VALUES($1,$2,'pending') ON CONFLICT(owner_id) DO UPDATE SET owner_id=EXCLUDED.owner_id RETURNING id,status,requested_at,completed_at`,
        [randomUUID(), owner],
      );
      await client.query("COMMIT");
      return {
        deletionId: row.id,
        status: row.status,
        requestedAt: row.requested_at,
        completedAt: row.completed_at,
        scope: "application-data",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async status(owner: string, id: string) {
    const {
      rows: [row],
    } = await this.pool.query(
      "SELECT id,status,requested_at,completed_at FROM app_deletions WHERE owner_id=$1 AND id=$2",
      [owner, id],
    );
    if (!row)
      throw new ProfileError("NOT_FOUND", 404, "Deletion request unavailable.");
    return {
      deletionId: row.id,
      status: row.status,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
      scope: "application-data",
      providerNotice:
        "Completion covers application content and tracked Backboard context cleanup. A minimal deletion record prevents late writes. Auth0 account deletion and provider/backup retention are separate.",
    };
  }
  async reconcile(limit = 20, owner: string | null = null) {
    const pending = await this.pool.query(
      "SELECT id,owner_id FROM app_deletions WHERE status<>'completed' AND next_attempt_at<=now() AND ($2::uuid IS NULL OR owner_id=$2::uuid) ORDER BY requested_at LIMIT $1",
      [Math.min(100, Math.max(1, limit)), owner],
    );
    let completed = 0;
    for (const deletion of pending.rows) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        // Same ordering as profile writes: owner -> lifecycle -> operation/data.
        await client.query("SELECT id FROM app_users WHERE id=$1 FOR UPDATE", [
          deletion.owner_id,
        ]);
        const {
          rows: [current],
        } = await client.query(
          "SELECT status FROM app_deletions WHERE id=$1 FOR UPDATE",
          [deletion.id],
        );
        if (current?.status === "completed") {
          await client.query("COMMIT");
          continue;
        }
        await client.query(
          "DELETE FROM resume_profile_heads WHERE owner_id=$1",
          [deletion.owner_id],
        );
        await client.query("DELETE FROM app_operations WHERE owner_id=$1", [
          deletion.owner_id,
        ]);
        await client.query("DELETE FROM app_request_quotas WHERE scope=$1", [
          deletion.owner_id,
        ]);
        await client.query(
          "UPDATE app_users SET consent_version=NULL,consent_at=NULL,interest_fields='[]'::jsonb,interest_version=interest_version+1 WHERE id=$1",
          [deletion.owner_id],
        );
        await client.query(
          "UPDATE backboard_context SET desired=NULL,enabled=false,version=version+1,status=CASE WHEN assistant_id IS NULL THEN 'disabled' ELSE 'deleting' END,next_attempt_at=now() WHERE owner_id=$1 AND (enabled OR desired IS NOT NULL)",
          [deletion.owner_id],
        );
        const remote = await client.query(
          "SELECT 1 FROM backboard_context WHERE owner_id=$1 AND assistant_id IS NOT NULL",
          [deletion.owner_id],
        );
        if (remote.rowCount) {
          await client.query(
            "UPDATE app_deletions SET status='pending',next_attempt_at=now()+interval '1 minute' WHERE id=$1",
            [deletion.id],
          );
          await client.query("COMMIT");
          continue;
        }
        await client.query(
          "UPDATE app_deletions SET status='completed',completed_at=now(),attempts=attempts+1 WHERE id=$1",
          [deletion.id],
        );
        await client.query("COMMIT");
        completed++;
      } catch {
        await client.query("ROLLBACK");
        await this.pool.query(
          "UPDATE app_deletions SET status='failed',attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' WHERE id=$1 AND status<>'completed'",
          [deletion.id],
        );
      } finally {
        client.release();
      }
    }
    return { checked: pending.rowCount, completed };
  }
  async expire() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const heads = await client.query(
        "DELETE FROM resume_profile_heads WHERE expires_at<=now() RETURNING id",
      );
      const operations = await client.query(
        "DELETE FROM app_operations WHERE expires_at<=now() RETURNING owner_id",
      );
      await client.query(
        "DELETE FROM app_request_quotas WHERE day<CURRENT_DATE-7",
      );
      await client.query("COMMIT");
      return {
        expiredProfiles: heads.rowCount,
        expiredOperations: operations.rowCount,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
