import {
  compareRequirements,
  cosine,
  eligibleJobs,
  OpportunityError,
} from "./engine.ts";
import type { Job, Preferences, Profile } from "./contracts.ts";

// C supplies a trusted session subject; never map this from request JSON.
export type MatchInput = {
  ownerId: string;
  profileId: string;
  profileVersion: number;
  idempotencyKey: string;
};
export type MatchSnapshot = {
  profile: Profile;
  preferences: Preferences;
  preferenceVersion: number;
  catalogVersion: string;
  checklistVersion: string;
  embeddingConfig: string;
  dimension: number;
  deleting: boolean;
};
export type MatchResult = {
  jobId: string;
  jobVersion: number;
  profileVersion: number;
  strengths: ReturnType<typeof compareRequirements>["strengths"];
  gaps: ReturnType<typeof compareRequirements>["gaps"];
  requirementsAvailable: boolean;
}[];
export interface OpportunitiesPorts {
  loadOwnedSnapshot(
    ownerId: string,
    profileId: string,
  ): Promise<MatchSnapshot | null>;
  // Filter BEFORE LIMIT 20. Select only vectors in exactly this embedding space.
  retrieve(snapshot: MatchSnapshot, limit: number): Promise<Job[]>;
  // Shared operation acquisition is atomic, owner scoped, binds key to input digest.
  begin(
    input: MatchInput,
    snapshotToken: string,
  ): Promise<
    | { state: "acquired" }
    | { state: "completed"; result: MatchResult }
    | { state: "inflight" }
  >;
  // Atomic compare-and-set checks owner/deletion/profile/preferences/catalog versions.
  // False means no writes. No external calls may run inside that transaction.
  commit(
    input: MatchInput,
    snapshotToken: string,
    result: MatchResult,
  ): Promise<boolean>;
  fail(input: MatchInput): Promise<void>;
}
export function snapshotToken(s: MatchSnapshot) {
  return JSON.stringify({
    profile: s.profile.id,
    profileVersion: s.profile.version,
    preferences: s.preferenceVersion,
    catalog: s.catalogVersion,
    checklist: s.checklistVersion,
    embedding: s.embeddingConfig,
    ranking: "v1",
    explanation: "deterministic-v1",
  });
}
export async function generateMatches(
  ports: OpportunitiesPorts,
  input: MatchInput,
): Promise<MatchResult> {
  if (!input.ownerId || !input.idempotencyKey)
    throw new OpportunityError(
      "INVALID_INPUT",
      "Session and idempotency key required.",
      400,
    );
  const snapshot = await ports.loadOwnedSnapshot(
    input.ownerId,
    input.profileId,
  );
  if (!snapshot || snapshot.deleting)
    throw new OpportunityError("NOT_FOUND", "Profile unavailable.", 404);
  if (snapshot.profile.version !== input.profileVersion)
    throw new OpportunityError("STALE_VERSION", "Profile changed.", 409);
  if (snapshot.profile.status !== "confirmed")
    throw new OpportunityError(
      "PROFILE_UNCONFIRMED",
      "Confirm profile before matching.",
    );
  if (!snapshot.profile.evidence.length)
    throw new OpportunityError(
      "NO_EVIDENCE",
      "Add reviewed evidence before matching.",
    );
  if (snapshot.profile.embedding.length !== snapshot.dimension)
    throw new OpportunityError(
      "INVALID_VECTOR",
      "Incompatible profile embedding.",
    );
  cosine(snapshot.profile.embedding, snapshot.profile.embedding);
  const token = snapshotToken(snapshot);
  const operation = await ports.begin(input, token);
  if (operation.state === "completed") return operation.result;
  if (operation.state === "inflight")
    throw new OpportunityError(
      "INFLIGHT",
      "Matching is already running; retry later.",
      409,
    );
  try {
    const rows = await ports.retrieve(snapshot, 20);
    const result = eligibleJobs(rows, snapshot.preferences)
      .map((job) => ({
        job,
        similarity: cosine(snapshot.profile.embedding, job.embedding),
      }))
      .sort(
        (a, b) =>
          b.similarity - a.similarity || a.job.id.localeCompare(b.job.id),
      )
      .slice(0, 10)
      .map(({ job }) => ({
        jobId: job.id,
        jobVersion: job.version,
        profileVersion: snapshot.profile.version,
        ...compareRequirements(snapshot.profile, job),
      }));
    if (!(await ports.commit(input, token, result)))
      throw new OpportunityError(
        "STALE_VERSION",
        "Inputs changed during matching. Refresh and retry.",
        409,
      );
    return result;
  } catch (error) {
    await ports.fail(input);
    throw error;
  }
}

// C can execute this parameterized query through the chosen PostgreSQL/Drizzle adapter.
// Table contract is deliberately namespaced and documented; never concatenate filters.
export function retrievalQuery(snapshot: MatchSnapshot) {
  if (snapshot.profile.embedding.length !== snapshot.dimension)
    throw new OpportunityError(
      "INVALID_VECTOR",
      "Incompatible embedding dimension.",
    );
  cosine(snapshot.profile.embedding, snapshot.profile.embedding);
  const { preferences: p } = snapshot;
  return {
    text: `SELECT payload FROM opportunity_jobs
WHERE status = 'open' AND embedding_config = $2
AND ($3 = 'any' OR role_type = $3)
AND ($4 = 'any' OR remote_mode = $4)
AND ($5 = 'any' OR location = $5)
ORDER BY embedding <=> $1::vector, id ASC LIMIT 20`,
    values: [
      `[${snapshot.profile.embedding.join(",")}]`,
      snapshot.embeddingConfig,
      p.roleType,
      p.remote,
      p.location,
    ],
  };
}
