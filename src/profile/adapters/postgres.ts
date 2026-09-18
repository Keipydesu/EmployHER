import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  profileHeads,
  profileVersions,
  profileEvents,
  profileOwnerLifecycle,
} from "../schema";
import type { Profile } from "../contracts";
import type { ProfileRepository } from "../ports";
import { conflict, notFound, ProfileError } from "../errors";

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private db: NodePgDatabase) {}
  private values(p: Profile) {
    if (p.embedding?.simulated)
      throw new ProfileError(
        "SIMULATED_VECTOR",
        400,
        "Simulated vectors cannot be stored in the application database.",
      );
    return {
      profileId: p.profileId,
      version: p.version,
      status: p.status,
      facts: p.facts,
      embedding: p.embedding?.values ?? null,
      embeddingModel: p.embedding?.model ?? null,
      extractionModel: p.extractionModel,
      promptVersion: p.promptVersion,
      createdAt: new Date(p.createdAt),
    };
  }
  async create(p: Profile) {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(profileOwnerLifecycle)
        .values({ ownerId: p.ownerId })
        .onConflictDoNothing();
      const [owner] = await tx
        .select()
        .from(profileOwnerLifecycle)
        .where(eq(profileOwnerLifecycle.ownerId, p.ownerId))
        .for("update");
      if (!owner || owner.deletedAt) throw notFound();
      await tx.insert(profileHeads).values({
        id: p.profileId,
        ownerId: p.ownerId,
        currentVersion: 1,
        expiresAt: new Date(p.expiresAt),
      });
      await tx.insert(profileVersions).values(this.values(p));
    });
  }
  async get(ownerId: string, id: string): Promise<Profile | null> {
    const [row] = await this.db
      .select()
      .from(profileHeads)
      .innerJoin(
        profileOwnerLifecycle,
        eq(profileOwnerLifecycle.ownerId, profileHeads.ownerId),
      )
      .innerJoin(
        profileVersions,
        and(
          eq(profileVersions.profileId, profileHeads.id),
          eq(profileVersions.version, profileHeads.currentVersion),
        ),
      )
      .where(
        and(
          eq(profileHeads.id, id),
          eq(profileHeads.ownerId, ownerId),
          gt(profileHeads.expiresAt, new Date()),
          isNull(profileOwnerLifecycle.deletedAt),
        ),
      );
    if (!row) return null;
    const v = row.resume_profile_versions;
    return {
      profileId: id,
      ownerId,
      version: v.version,
      status: v.status,
      facts: v.facts,
      embedding:
        v.embedding && v.embeddingModel
          ? {
              values: v.embedding,
              model: v.embeddingModel,
              dimensions: 768,
              config: "profile-semantic-v1",
              simulated: false,
            }
          : null,
      extractionModel: v.extractionModel,
      promptVersion: v.promptVersion,
      createdAt: v.createdAt.toISOString(),
      expiresAt: row.resume_profile_heads.expiresAt.toISOString(),
    };
  }
  async replace(ownerId: string, expected: number, p: Profile) {
    if (p.ownerId !== ownerId || p.version !== expected + 1) throw conflict();
    await this.db.transaction(async (tx) => {
      const [owner] = await tx
        .select()
        .from(profileOwnerLifecycle)
        .where(eq(profileOwnerLifecycle.ownerId, ownerId))
        .for("update");
      if (!owner || owner.deletedAt) throw notFound();
      const [head] = await tx
        .select()
        .from(profileHeads)
        .where(
          and(
            eq(profileHeads.id, p.profileId),
            eq(profileHeads.ownerId, ownerId),
          ),
        )
        .for("update");
      if (!head || head.expiresAt <= new Date()) throw notFound();
      if (head.currentVersion !== expected) throw conflict();
      await tx.insert(profileVersions).values(this.values(p));
      await tx
        .update(profileHeads)
        .set({ currentVersion: p.version })
        .where(eq(profileHeads.id, p.profileId));
      await tx.insert(profileEvents).values({
        id: randomUUID(),
        ownerId,
        profileId: p.profileId,
        previousVersion: expected,
        version: p.version,
        createdAt: new Date(),
      });
    });
  }
  async deleteOwner(ownerId: string) {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(profileOwnerLifecycle)
        .values({ ownerId, deletedAt: new Date() })
        .onConflictDoUpdate({
          target: profileOwnerLifecycle.ownerId,
          set: { deletedAt: new Date() },
        });
      await tx.delete(profileHeads).where(eq(profileHeads.ownerId, ownerId));
    });
  }
}
