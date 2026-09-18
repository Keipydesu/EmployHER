import type { Embedding, Extracted, Profile, ReviewedPath } from './contracts';

export interface ProfileAI {
  readonly model: string;
  extract(text: string, signal: AbortSignal): Promise<Extracted>;
  embed(summary: string, signal: AbortSignal): Promise<Embedding>;
}
export interface ProfileRepository {
  create(profile: Profile): Promise<void>;
  get(ownerId: string, profileId: string): Promise<Profile | null>;
  // Atomically compare current version, write version + head, emit invalidation event.
  replace(ownerId: string, expectedVersion: number, next: Profile): Promise<void>;
  // Person C calls during lifecycle cleanup. Must prevent in-flight writes.
  deleteOwner(ownerId: string): Promise<void>;
}
export interface Operations {
  run<T>(
    ownerId: string,
    kind: string,
    key: string,
    digest: string,
    work: () => Promise<T>,
  ): Promise<T>;
}
export interface PathCatalog {
  getReviewedPath(pathId: string): Promise<ReviewedPath | null>;
}
