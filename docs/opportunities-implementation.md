# Opportunities implementation and integration handoff

Status: working synthetic B slice; **not M2 acceptance or a real-data pilot**.

## Run and test

Use Node 24, `npm ci --ignore-scripts`, then `npm run dev`. Open `/opportunities`. `npm run smoke:opportunities` checks the demo API on both loopback hostnames (set `SMOKE_OPPORTUNITIES_PORT` for a custom port); it cleans up its own sessions. `npm test` uses Node's built-in test runner against `tests/*.test.ts`; no additional test package. `npm run check`, `npm run build`, and `npm run smoke` remain the existing checks. Domain fixtures are deliberately synthetic.

## Implemented

- `src/opportunities/contracts.ts`: strict Zod job/profile/resource/preference/command validation.
- `catalog.ts`: 15 illustrative active roles, a missing-requirements discovery case, a closed case, five profile fixtures, seven paths (two unassessed), official learning/community starting points. Job rows contain no real application URLs. Source commits identify the synthetic fixture version, never a GitHub commit.
- `engine.ts`: strict filters before cosine retrieval, stable ID ties, requirement annotations, unique checkpoint coverage, field-context sample counts, resource review/expiry/opt-in gates, grounding validator and idempotent catalog merge.
- `state.ts`: versioned path/action selection, explicit learning-gap confirmation, synthetic reviewed-evidence correction, profile invalidation, maximum three active actions, historical completed actions. No free-text input or real résumé acceptance.
- `app/opportunities/page.tsx`: responsive path list and expandable evidence/results, profile/filter switching, clarification, saved actions, honest no-match/unassessed states, official resources and optional community categories. Native buttons, selects, details, progress and live announcements support keyboard use; visual/browser verification must be recorded separately.
- `src/server/demo-store.ts` and `/api/demo/opportunities`: local anonymous cookie session, JSON disk persistence, optimistic version conflicts, idempotency, expiry and delete. Host/origin checks, strict command validation, 4 KB body cap. This is **single-process local demo storage**, not Auth0 or a production database.

## Demo API contract

`GET /api/demo/opportunities` creates/loads a random HttpOnly SameSite=Strict session and returns the complete derived view. `POST` accepts the strict command union in contracts.ts, `expectedVersion`, and `Idempotency-Key`; it requires same origin and application/json. Commands select a synthetic profile, change preferences/path, confirm a gap, simulate reviewed evidence, select/complete/remove an action or reset. `DELETE` deletes the session's local state and clears its cookie. Private state is selected only by the session cookie, never a supplied user/profile ID. JSON files live in ignored `.local/opportunities/`, mode 0600; session lifespan is 30 days without extension, capped at 100 sessions. Expired records are removed on access/new session creation. This is not the scheduled deletion reconciliation required for real data.

A learning-gap confirmation records checkpoint, profile/checklist version and time within the session's owned state. Profile changes clear confirmations; historical actions remain labeled and cannot update evidence coverage. Checklist versions are static in this fixture catalog. Mutation retries are owner-scoped; stale edits return 409. The demo supports one Node process only; multiple replicas require C's transactional store.

## A/C integration contracts

`service.ts` exports `OpportunitiesPorts`, `generateMatches`, `snapshotToken`, and a parameterized pgvector retrieval query. C supplies authenticated owner resolution, owned profile snapshots, atomic idempotency acquisition, filtered retrieval and compare-and-set commit. A supplies only current confirmed profiles and compatible model/configured embeddings. The demo uses an 11-dimensional skill basis; it must **never** be mixed with proposed 768-dimensional Gemini vectors.

The service retrieves at most 20 and returns at most 10, uses deterministic annotations (no generative prose/provider call), validates vectors, and commits only through the version/deletion guard. C must bind operation keys to owner + full input + snapshot token, enforce deadlines/quotas, and implement transactional stale-write rejection. The SQL helper expects `opportunity_jobs(id, payload, status, embedding_config, role_type, remote_mode, location, embedding)`; this is an adapter proposal, not an applied migration. Map the query to C's approved database schema before integration. The catalog helper validates the whole incoming batch before returning a replacement; it does not itself persist to PostgreSQL.

Existing `/api/matches`, `/api/jobs`, `/api/resources`, path and saved-plan production routes in the design remain unmounted until C's ownership adapter is available. The demo does not install pretend authenticated endpoints. B's domain functions and port interfaces are the integration seam, not proof of real-provider execution.

## Remaining acceptance gates

- A/C producer-consumer review and real Auth0/profile/DB adapters, reviewed database migrations and Gemini compatible embeddings; real PostgreSQL query/ownership/deletion-race verification.
- Source-derived snapshot curation with resolved reuse terms, actual posting excerpts and application links; no live scraping or ingestion is enabled.
- The full B1 production DTO vocabulary/API/schema migration agreement; current fixture skills are a bounded enum.
- Real persisted matches and provider-failure reconciliation; currently the demo derives fresh results per request.
- Browser screenshots, mobile/keyboard visual QA, integrated A→B→C flow, and M3 privacy gates before real résumé intake.

No automatic pushes. No competition/hiring probabilities, unrestricted model links, coach, live resource cache, automatic applications or outreach.

## Recorded verification — 2026-09-18

Node 24.20.0: 94 independent domain/store/service/origin tests pass after fixing original-result idempotency replay and vector-norm overflow; formatting, lint, typecheck and production build pass. Production HTTP smoke on **both localhost and 127.0.0.1:3001** verified session creation, gap confirmation, saved-action completion without coverage inflation, original replay after later writes, persistence, two-session isolation, stale edit rejection, hostile-origin rejection, deletion of test-owned sessions, and all nine referenced JS/CSS assets for `/opportunities`. Next normalizes loopback URLs internally; origin validation now uses the validated actual Host header. Real Auth0/PostgreSQL/provider integration remains untested. CUA reports no available browsers, so no screenshot or browser interaction verification is claimed. Replacement CI has not run remotely.

Official resource starting points were checked on 2026-09-18. SWE mentoring requires active paid membership; the UI states this. ACM's student-chapter page could not be fetched, so the catalog uses the successfully checked [ACM-W community](https://women.acm.org/) page instead. Cost/prerequisite unknowns remain explicit; recommendations expire on 2026-10-02 pending re-review.
