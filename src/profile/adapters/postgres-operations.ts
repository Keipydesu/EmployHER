import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { profileOperations } from "../../server/schema";
import type { Operations } from "../ports";
import { ProfileError } from "../errors";

// Durable equivalent of MemoryOperations: owner+kind+key identifies an
// idempotent operation; a lease lets a crashed claim be reclaimed instead of
// wedging the key forever.
const LEASE_MS = 90_000;

export class PostgresOperations implements Operations {
  constructor(private db: NodePgDatabase) {}
  async run<T>(
    ownerId: string,
    kind: string,
    key: string,
    digest: string,
    work: () => Promise<T>,
  ): Promise<T> {
    if (!/^[\w-]{8,100}$/.test(key))
      throw new ProfileError(
        "IDEMPOTENCY_REQUIRED",
        400,
        "Provide a valid Idempotency-Key.",
      );
    const match = and(
      eq(profileOperations.ownerId, ownerId),
      eq(profileOperations.kind, kind),
      eq(profileOperations.key, key),
    );
    const replay = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(profileOperations)
        .values({
          ownerId,
          kind,
          key,
          digest,
          pending: true,
          leaseExpiresAt: new Date(Date.now() + LEASE_MS),
        })
        .onConflictDoNothing()
        .returning();
      if (inserted.length) return undefined;
      const [existing] = await tx
        .select()
        .from(profileOperations)
        .where(match)
        .for("update");
      if (!existing)
        // Lost the insert race to a row deleted immediately after; caller retries.
        throw new ProfileError(
          "OPERATION_PENDING",
          409,
          "This request is still processing. Please wait.",
          true,
        );
      if (existing.digest !== digest)
        throw new ProfileError(
          "IDEMPOTENCY_CONFLICT",
          409,
          "This request key was already used for different input.",
        );
      if (!existing.pending) return { value: existing.value as T };
      if (existing.leaseExpiresAt.getTime() > Date.now())
        throw new ProfileError(
          "OPERATION_PENDING",
          409,
          "This request is still processing. Please wait.",
          true,
        );
      await tx
        .update(profileOperations)
        .set({ leaseExpiresAt: new Date(Date.now() + LEASE_MS) })
        .where(match);
      return undefined;
    });
    if (replay) return replay.value;
    try {
      const result = await work();
      await this.db
        .update(profileOperations)
        .set({ pending: false, value: result as object })
        .where(match);
      return result;
    } catch (error) {
      await this.db.delete(profileOperations).where(match);
      throw error;
    }
  }
}
