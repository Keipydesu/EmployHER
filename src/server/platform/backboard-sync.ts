import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { ProfileError } from "../../profile/errors.ts";
import { BackboardStorage } from "./backboard.ts";
export type MemorySnapshot = {
  profileId: string;
  interestVersion: number;
  profileVersion: number;
  catalogVersion: string;
  planVersion: number;
  content: string;
};
export class BackboardSync {
  constructor(
    private pool: Pool,
    private provider: Pick<
      BackboardStorage,
      | "createAssistant"
      | "addMemory"
      | "updateMemory"
      | "resetMemories"
      | "deleteAssistant"
    >,
    readonly configured: boolean,
  ) {}
  async status(owner: string) {
    const result = await this.pool.query(
      "SELECT b.enabled,b.status,b.version,b.applied_version FROM app_users u LEFT JOIN backboard_context b ON b.owner_id=u.id WHERE u.id=$1 AND u.deletion_requested_at IS NULL",
      [owner],
    );
    if (!result.rowCount)
      throw new ProfileError("NOT_FOUND", 404, "Account unavailable.");
    const row = result.rows[0];
    return {
      configured: this.configured,
      enabled: row.enabled ?? false,
      status: row.status ?? "disabled",
      version: row.version ?? 0,
      appliedVersion: row.applied_version ?? 0,
    };
  }
  async queue(owner: string, snapshot: MemorySnapshot | null) {
    if (snapshot && !this.configured)
      throw new ProfileError(
        "BACKBOARD_NOT_CONFIGURED",
        503,
        "Backboard storage is not configured.",
      );
    if (snapshot && Buffer.byteLength(snapshot.content) > 8000)
      throw new ProfileError(
        "INVALID_INPUT",
        400,
        "Choose a smaller plan to remember.",
      );
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const account = await client.query(
        "SELECT id,interest_version FROM app_users WHERE id=$1 AND deletion_requested_at IS NULL FOR UPDATE",
        [owner],
      );
      if (!account.rowCount)
        throw new ProfileError("NOT_FOUND", 404, "Account unavailable.");
      let expires = null;
      if (snapshot) {
        if (account.rows[0].interest_version !== snapshot.interestVersion)
          throw new ProfileError(
            "STALE_VERSION",
            409,
            "Your interests changed. Reload before saving memory.",
          );
        const profile = await client.query(
          "SELECT current_version,expires_at FROM resume_profile_heads WHERE owner_id=$1 AND id=$2 AND expires_at>clock_timestamp() FOR UPDATE",
          [owner, snapshot.profileId],
        );
        const catalog = await client.query(
          "SELECT version FROM opportunity_catalog_state WHERE singleton=true FOR SHARE",
        );
        const plan = await client.query(
          "SELECT version FROM career_plans WHERE owner_id=$1 FOR UPDATE",
          [owner],
        );
        if (
          profile.rows[0]?.current_version !== snapshot.profileVersion ||
          catalog.rows[0]?.version !== snapshot.catalogVersion ||
          (plan.rows[0]?.version ?? 0) !== snapshot.planVersion
        )
          throw new ProfileError(
            "STALE_VERSION",
            409,
            "Your plan changed. Reload before saving memory.",
          );
        expires = profile.rows[0].expires_at;
      }
      await client.query(
        `INSERT INTO backboard_context(owner_id,profile_id,version,enabled,desired,status,expires_at) VALUES($1,$2,1,$3,$4,$5,$6)
   ON CONFLICT(owner_id) DO UPDATE SET profile_id=EXCLUDED.profile_id,version=backboard_context.version+1,enabled=EXCLUDED.enabled,desired=EXCLUDED.desired,status=EXCLUDED.status,expires_at=EXCLUDED.expires_at,next_attempt_at=now()`,
        [
          owner,
          snapshot?.profileId ?? null,
          !!snapshot,
          snapshot ? JSON.stringify(snapshot) : null,
          snapshot ? "pending" : "deleting",
          expires,
        ],
      );
      await client.query("COMMIT");
      return this.status(owner);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async reconcile(limit = 10, owner: string | null = null) {
    if (!this.configured) return { checked: 0 };
    const pending = await this.pool.query(
      `SELECT b.owner_id FROM backboard_context b JOIN app_users u ON u.id=b.owner_id WHERE ($2::uuid IS NULL OR b.owner_id=$2::uuid) AND b.next_attempt_at<=now() AND (b.status IN ('pending','failed','deleting') OR (b.assistant_id IS NOT NULL AND (u.deletion_requested_at IS NOT NULL OR b.expires_at<=now() OR NOT EXISTS(SELECT 1 FROM resume_profile_heads p WHERE p.id=b.profile_id AND p.owner_id=b.owner_id)))) LIMIT $1`,
      [Math.min(20, limit), owner],
    );
    for (const { owner_id: owner } of pending.rows) await this.sync(owner);
    return { checked: pending.rowCount };
  }
  private async sync(owner: string) {
    const client = await this.pool.connect();
    let locked = false;
    try {
      locked = (
        await client.query(
          "SELECT pg_try_advisory_lock(hashtextextended($1,9981)) AS locked",
          [owner],
        )
      ).rows[0].locked;
      if (!locked) return;
      const result = await client.query(
        `SELECT b.*,u.deletion_requested_at,EXISTS(SELECT 1 FROM resume_profile_heads p WHERE p.id=b.profile_id AND p.owner_id=b.owner_id AND p.expires_at>now()) AS profile_exists FROM backboard_context b JOIN app_users u ON u.id=b.owner_id WHERE b.owner_id=$1`,
        [owner],
      );
      const row = result.rows[0];
      if (!row) return;
      if (
        !row.enabled ||
        row.deletion_requested_at ||
        !row.profile_exists ||
        new Date(row.expires_at) <= new Date()
      ) {
        if (row.assistant_id) {
          await this.provider.resetMemories(row.assistant_id);
          await this.provider.deleteAssistant(row.assistant_id);
        }
        await client.query(
          "UPDATE backboard_context SET assistant_id=NULL,memory_id=NULL,desired=CASE WHEN version=$2 THEN NULL ELSE desired END,enabled=CASE WHEN version=$2 THEN false ELSE enabled END,status=CASE WHEN version=$2 THEN 'disabled' ELSE 'pending' END,applied_version=CASE WHEN version=$2 THEN version ELSE applied_version END,profile_id=CASE WHEN version=$2 THEN NULL ELSE profile_id END WHERE owner_id=$1",
          [owner, row.version],
        );
        return;
      }
      let assistant = row.assistant_id;
      if (assistant && !row.memory_id) {
        // A prior attempt against this existing assistant may have written a
        // memory remotely and then died before persisting memory_id locally --
        // possible for any status, not only "failed" (a crash never reaches
        // the catch block that would have set it). Reset before retrying so
        // we never accumulate a duplicate memory.
        await this.provider.resetMemories(assistant);
      }
      if (!assistant) {
        assistant = await this.provider.createAssistant(`employher-${owner}`);
        // Persist the empty assistant ID even if opt-in changed, so cleanup can find it.
        await client.query(
          "UPDATE backboard_context SET assistant_id=$2 WHERE owner_id=$1",
          [owner, assistant],
        );
      }
      const current = await client.query(
        `SELECT 1 FROM backboard_context b JOIN app_users u ON u.id=b.owner_id
         WHERE b.owner_id=$1 AND b.version=$2 AND b.enabled AND u.deletion_requested_at IS NULL
         AND EXISTS(SELECT 1 FROM resume_profile_heads p WHERE p.id=b.profile_id AND p.owner_id=b.owner_id AND p.expires_at>clock_timestamp())`,
        [owner, row.version],
      );
      if (!current.rowCount) return;
      const desired = row.desired as MemorySnapshot;
      const metadata = {
        version: row.version,
        contextHash: createHash("sha256").update(desired.content).digest("hex"),
      };
      const memory = row.memory_id
        ? await this.provider.updateMemory(
            assistant,
            row.memory_id,
            desired.content,
            metadata,
          )
        : await this.provider.addMemory(assistant, desired.content, metadata);
      // Always retain the ID for cleanup; only mark the exact desired revision synced.
      await client.query(
        "UPDATE backboard_context SET memory_id=$2,applied_version=$3,status=CASE WHEN version=$3 THEN 'synced' ELSE status END,attempts=0 WHERE owner_id=$1",
        [owner, memory.id, row.version],
      );
    } catch {
      await client.query(
        "UPDATE backboard_context SET status='failed',attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' WHERE owner_id=$1",
        [owner],
      );
    } finally {
      if (locked)
        await client.query(
          "SELECT pg_advisory_unlock(hashtextextended($1,9981))",
          [owner],
        );
      client.release();
    }
  }
}
