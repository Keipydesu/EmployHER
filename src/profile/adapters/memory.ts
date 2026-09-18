import type { Profile } from "../contracts";
import type { Operations, ProfileRepository } from "../ports";
import { conflict, notFound, ProfileError } from "../errors";

// Synthetic local harness only. Person C supplies durable operations/auth lifecycle.
export class MemoryProfileRepository implements ProfileRepository {
  private heads = new Map<string, Profile>();
  private deletedOwners = new Set<string>();
  readonly events: {
    profileId: string;
    ownerId: string;
    previousVersion: number;
    version: number;
  }[] = [];
  async create(profile: Profile) {
    if (this.deletedOwners.has(profile.ownerId)) throw notFound();
    if (this.heads.has(profile.profileId)) throw conflict();
    this.heads.set(profile.profileId, structuredClone(profile));
  }
  async get(owner: string, id: string) {
    const profile = this.heads.get(id);
    return profile?.ownerId === owner &&
      !this.deletedOwners.has(owner) &&
      Date.parse(profile.expiresAt) > Date.now()
      ? structuredClone(profile)
      : null;
  }
  async replace(owner: string, expected: number, next: Profile) {
    const current = this.heads.get(next.profileId);
    if (
      !current ||
      current.ownerId !== owner ||
      this.deletedOwners.has(owner) ||
      Date.parse(current.expiresAt) <= Date.now()
    )
      throw notFound();
    if (
      current.version !== expected ||
      next.version !== expected + 1 ||
      next.ownerId !== owner
    )
      throw conflict();
    this.heads.set(next.profileId, structuredClone(next));
    this.events.push({
      ownerId: owner,
      profileId: next.profileId,
      previousVersion: expected,
      version: next.version,
    });
  }
  async deleteOwner(owner: string) {
    this.deletedOwners.add(owner);
    for (const [id, profile] of this.heads)
      if (profile.ownerId === owner) this.heads.delete(id);
  }
}
export class MemoryOperations implements Operations {
  private entries = new Map<
    string,
    { digest: string; pending: boolean; value?: unknown }
  >();
  async run<T>(
    owner: string,
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
    const id = JSON.stringify([owner, kind, key]);
    const previous = this.entries.get(id);
    if (previous) {
      if (previous.digest !== digest)
        throw new ProfileError(
          "IDEMPOTENCY_CONFLICT",
          409,
          "This request key was already used for different input.",
        );
      if (previous.pending)
        throw new ProfileError(
          "OPERATION_PENDING",
          409,
          "This request is still processing. Please wait.",
          true,
        );
      return structuredClone(previous.value) as T;
    }
    this.entries.set(id, { digest, pending: true });
    try {
      const result = await work();
      this.entries.set(id, {
        digest,
        pending: false,
        value: structuredClone(result),
      });
      return result;
    } catch (error) {
      this.entries.delete(id);
      throw error;
    }
  }
}
