# Proposed relational schema

The table below is the original conceptual design. Person A now implements profile heads, immutable versions, lifecycle tombstones, and invalidation events in `src/profile/schema.ts` and `schema.sql`; see [the integration handoff](implementation/person-a.md). C must integrate and verify those domain migrations before deployment. Other tables remain design proposals. Use UUID primary keys, `timestamptz` timestamps, foreign keys, constrained enums/checks, and indexes on owner and lookup fields. Public catalog data and private user data have separate access paths.

| Table | Important columns / constraints |
| --- | --- |
| `users` | `id`, `auth_issuer`, `auth_subject`, `created_at`, `deletion_requested_at`; unique issuer + subject; no gender column |
| `user_preferences` | `user_id` PK/FK, locations, remote preference, role types, inclusion categories, `coach_memory_opt_in`, `updated_at` |
| `resume_profiles` | `id`, `user_id`, `version`, `status` (draft/confirmed), experience JSONB, education JSONB, minimized summary, `embedding vector(768)`, embedding model/config, prompt version, created/expiry times; unique user + version |
| `skills` | `id`, canonical name, normalized name unique, aliases JSONB |
| `profile_skills` | profile FK, skill FK, source (resume/user_reported), evidence excerpt nullable, confirmation state; composite PK profile + skill |
| `companies` | `id`, name, canonical domain nullable, source URL; unknown company facts remain null |
| `ingestion_runs` | `id`, repo/ref/path, commit SHA, started/finished times, status, sanitized counts/errors, snapshot complete flag |
| `jobs` | `id`, company FK nullable, source key unique within repo, title, location, remote mode, role type, description, apply/source URLs, content hash, source commit, last_seen_at, checked_at, status, embedding/model/config, version |
| `job_requirements` | `id`, job FK, skill FK nullable, text, importance (required/preferred/unspecified), exact source excerpt; captures non-skill qualifications too |
| `inclusion_resources` | `id`, company FK nullable, type (employee_group/mentorship/benefit/scholarship/community/organization), title, documented claim, source URL, source excerpt, region, published_at nullable, checked_at, expires_at nullable, eligibility text, review status |
| `matches` | `id`, user FK, profile FK, job FK, profile/job versions, ranking version, retrieval score, validated explanation JSONB, next_steps JSONB, model/prompt version, created/expiry times; unique profile + job version + ranking version |
| `coach_assistants` | user FK unique, provider assistant ID unique, memory consent version, created/expiry times |
| `coach_threads` | `id`, user FK, assistant mapping FK, provider thread ID unique, title, created/expiry times; no raw transcript replication by default |
| `operations` | `id`, user FK, kind, idempotency key, input digest, state, lease deadline, result reference, sanitized error, created/expiry times; unique user + kind + key |
| `deletion_requests` | `id`, user reference nullable, state, encrypted provider cleanup references, retry count, requested/completed time; minimal temporary audit only |

Experience entries: title, organization, dates as supplied, skill IDs, and minimal supporting excerpts. Education entries: credential, institution, dates as supplied, and evidence. Unknown values are null. Do not persist names, email, phone, address, full résumé text, or original files unless a future requirement explicitly justifies them.

Enforce ownership through composite foreign keys where records contain both user and parent IDs: for example `(profile_id, user_id)` references a unique `(id, user_id)` profile pair. Apply the same pattern to thread/assistant mapping. Reads and writes always constrain user ID derived from the session. Row-level security can provide additional protection only with tested policies and non-bypass roles.

Deleting a profile cascades private skill links and matches; deleting user data removes profiles, preferences, matches, operation payloads, and coaching references after external cleanup identifiers are secured. Catalog skills/jobs/companies/resources survive user deletion. Keep cleanup state until provider deletion is reconciled; never orphan provider data by dropping IDs first.

## pgvector and matching

Enable `CREATE EXTENSION IF NOT EXISTS vector` in a reviewed migration after verifying availability. Proposed starting dimension is 768; choose a supported Gemini embedding model/configuration that returns exactly that length and record it. Reject nonfinite, zero, wrong-length, or incompatible vectors. Profile and role representations must use the same versioned compatible embedding space; model changes require re-embedding both sides before switching reads.

Start with exact cosine distance search on the small catalog, filtered to active jobs and explicit user criteria. SQL shape: `ORDER BY embedding <=> $1::vector LIMIT $2`, with parameterized filters and a capped limit. Add an HNSW cosine index only when corpus size and measurement justify it; verify filtered-search recall. Drizzle is retained under [decision 006](decisions/006-retain-drizzle-with-tiger-data.md) for schema/query integration with the pg driver. Integrate ordered migrations and preserve reviewed SQL, transaction and ownership constraints; existing profile adapters still require runtime binding and database verification.

Use semantic similarity to retrieve up to 20 candidates, then deterministically compare evidenced/user-confirmed skills and source requirements. Return at most 10 roles with a stable ID tie-break. Unknown eligibility is a visible check, not an invented rejection. Inclusion preferences surface sourced resources separately; absence of evidence does not penalize an employer. Explanations cite requirement IDs and résumé excerpts or user-reported evidence. A missing skill is “not evidenced,” with user confirmation before treating it as a learning gap.

Official references: [Tiger Data extensions](https://docs.tigerdata.com/use-timescale/latest/extensions), and [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings). Dimension, indexing, and ranking choices above are project proposals, not provider guarantees.

## Opportunities implementation boundary

The [B implementation handoff](opportunities-implementation.md) documents current typed catalog/checklist/action/confirmation records and the `OpportunitiesPorts` persistence boundary. The running synthetic demo uses isolated local JSON sessions, not these proposed relational tables. A/C review and Drizzle/SQL migration integration are still required before production-backed matching; the fixture's 11-dimensional basis must not be used with the proposed Gemini embedding space.

### Implemented saved-plan persistence

`career_plans` stores one current plan per internal owner, including selected path,
preferences, preference version, actions, confirmations and persistent stale-action
IDs. The record carries profile identity/version, catalog version and checklist
versions. Reads invalidate old confirmations without silently advancing the stored
compare-and-set version. Mutations commit the new state and idempotent replay
result in one transaction; completing an action never changes profile evidence.

The composite profile/owner foreign key prevents cross-owner references. Saved
plans currently share their attached profile's retention window: deleting or
expiring that profile cascades to its plan, including completed action history.
This is application retention, not indefinite career-history storage. Source
catalog activation, authenticated endpoint/UI wiring and live-service verification
remain separate integration work.
