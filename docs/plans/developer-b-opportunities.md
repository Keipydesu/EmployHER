# Developer B plan: Opportunities track

Status: proposed execution plan, recorded 2026-09-18. Expands owner **B**'s slice from the [three-person roadmap](../product.md#three-person-parallel-mvp-roadmap) and the [user story](../user-story.md#delivery-alignment) into concrete, ordered tasks. Scope, contracts and acceptance gates already fixed in product.md/architecture.md/data-model.md/api.md/user-story.md are authoritative; this file sequences work against them and does not redefine them.

## Scope

B owns everything between a confirmed profile and an actionable opportunity: the static job/resource catalog, semantic retrieval, grounded requirement comparison, path taxonomy and checklist definitions, the progress/tree and results UI, next-step generation, and contextual learning/community resources. B owns `jobs`, `job_requirements`, `inclusion_resources`, `matches` at the schema level and the job/resource/match API routes. B does not own Auth0, navigation shell, shared DB wiring (C), or résumé extraction/profile confirmation (A) — B consumes A's confirmed-profile contract and C's ownership/idempotency primitives.

Explicitly out of scope for this plan: Backboard coaching (P1, owner A once B's slice integrates), automated catalog refresh/scheduled worker (P2), the shared resource-research cache (proposed, deferred past MVP static seed — see [product.md](../product.md#shared-resource-research-cache-proposed-post-mvp-static-feature)), Discord.

## Work breakdown

### M0 — Contracts and catalog manifest (blocks M1 for all three owners)

1. **Draft Zod DTOs** for `Job`, `JobRequirement`, `InclusionResource`, `Match` matching [data-model.md](../data-model.md) and the `Match` shape in [api.md](../api.md#shared-shapes). Circulate for A/C review before writing retrieval code against them — contract changes need producer+consumer review per the roadmap.
2. **Agree the embedding model/configuration and dimension with A** (proposed 768, [data-model.md](../data-model.md#pgvector-and-matching)) — both profile and role embeddings must share this space or matching cannot compare them.
3. **Freeze path/checkpoint contracts from user-story.md**: path/subpath IDs, orthogonal checkpoint evidence states (`resume_supported` / `user_reported` / `needs_confirmation` / `not_evidenced`) and action states (`unselected` / `selected` / `done`), versioned checklist definition shape, and the field-context panel's fact shape (`sampleSize`, `sourceUrl`, `checkedAt`, per-tag share). These are new contracts not yet in api.md/data-model.md — write them as an addition to those docs, not just in code, so A and C can review them too.
4. **Curate the catalog manifest**: pull static snapshots from [Summer2027-Internships](https://github.com/SimplifyJobs/Summer2027-Internships) and [New-Grad-Positions](https://github.com/SimplifyJobs/New-Grad-Positions) at a pinned ref/commit per repo (verify each selected snapshot's file layout; prior review found `README-Inactive.md` in internships and `archived/` in new-grad, with Markdown and embedded HTML tables). Target ≥15 reviewed tech roles spanning internship and new-grad tracks, each with recorded source repo/ref/commit, source and apply URLs, review date, cohort, and explicit requirement excerpts pulled from the linked posting — titles/icons alone cannot ground a gap claim, so a role without a reviewed excerpt becomes a discovery candidate with requirements marked unavailable, not a skipped row.
5. **Resolve reuse terms before publishing source-derived fixtures** — prior review did not find a LICENSE file in either source repo; recheck terms for the selected snapshots (open question, flagged in [CLAUDE.md](../../CLAUDE.md)). Use synthetic catalog fixtures to unblock M1 development in parallel with that resolution; do not block coding on it.
6. **Curate ≥3 sourced inclusion resources** (e.g., TAG, SWE mentoring per user-story.md) with source URL, excerpt, checked date, region, eligibility text — sign off the catalog batch per the M0 exit criteria.
7. **Map source categories to path taxonomy**: the five source-aligned top-level categories (Software Engineering; Product Management; Data Science, AI & ML; Quantitative Finance; Hardware Engineering) plus the two EmployHER-proposed subpaths (Cybersecurity, Cloud/Infrastructure) — only categories with curated checklist content get an assessed progress view; others show "Path being curated."
8. Propose schema module `catalog.ts` (jobs/requirements/resources) and `matches.ts` per product.md's M0 note; hand to C for migration ordering, not for C to author.

**Exit:** DTOs and path/checklist contracts reviewed by A/C; ≥15-role reviewed catalog batch (or clearly labeled synthetic equivalent while reuse terms are open) and ≥3 resources ready; embedding config agreed with A.

### M1 — Vertical slice (parallel with A/C)

Build against C's development adapters and A's confirmed-profile fixture (per product.md, B does not wait on A's real implementation).

1. **Static seed/import**: idempotent loader from the reviewed manifest into `jobs`/`job_requirements`/`inclusion_resources`/`companies`, upserted by stable source key so repeat seeds create no duplicates (acceptance gate). Record an `ingestion_runs` row per load with snapshot-complete flag.
2. **Role embeddings**: embed job content with the agreed Gemini config; embed changed content only on re-seed.
3. **pgvector retrieval**: implement the retrieval SQL shape from [data-model.md](../data-model.md#pgvector-and-matching) — filter to active jobs and explicit user criteria first, then `ORDER BY embedding <=> $1::vector LIMIT 20`, then deterministically compare structured requirements against evidenced/user-confirmed skills, returning at most 10 with a stable ID tie-break.
4. **Grounded explanation generation**: for each candidate, produce `strengths` (requirement ID + evidence excerpt) and `gaps` (requirement ID + `not_evidenced`/`needs_confirmation` + reason) per the `Match` shape in api.md. A missing skill is "not evidenced," never an invented failure; roles without reviewed requirements stay discovery candidates with no gap claim.
5. **Next-step generation**: at most three next steps per match, each with a concrete deliverable and optional `resourceId` resolving only to a reviewed catalog record — no arbitrary model-generated URLs (api.md constraint).
6. **Own routes**: `POST /api/matches`, `GET /api/matches`, `GET /api/jobs/:id`, `GET /api/resources` — validate ownership via C's helpers, require the idempotency header on `POST /api/matches`, return 404 for foreign/absent private records and 422 for no-evidence input per api.md's error table.
7. **Path/checklist backend**: versioned checklist definitions per path/subpath; coverage = supported checkpoints ÷ all reviewed checkpoints for that checklist version; deduplicate repeated skills so repeats don't inflate coverage; "Not enough evidence to assess" when the checklist lacks sufficient reviewed requirements instead of showing 0%.
8. **Field-context panel backend**: compute only sourced, dated, sample-sized catalog facts (count of source-marked-open roles in the path as of the snapshot; share explicitly tagging no-sponsorship/citizenship/advanced-degree). No acceptance-rate, applicant-competition, or ranking figure — return "Competition data unavailable" explicitly rather than omitting the field.
9. **Progress/tree and results UI**: expandable path cards with labeled progress bars, the checkpoint tree (or accessible list equivalent) from user-story.md's illustrative tree, per-checkpoint evidence/source/review-date/why-it-matters detail, and the field-context panel. Role result cards show source, last-checked date, apply link, matched evidence, and missing/uncertain qualifications (product.md screen 5).
10. **Résumé-path relevance surfacing**: within a path, show which of the user's confirmed projects/bullets are relevant and why (feeds A's résumé-suggestion UI with B's requirement relevance data — coordinate the interface, A owns the actual rewrite suggestions).
11. **Contextual resources UI**: category-filtered resource cards tied to a path or job, each showing documented claim, source URL, checked date, eligibility, region.
12. **Invalidation**: profile edits (new confirmed version) or catalog/job version changes invalidate cached matches — verify this round-trips through C's operation/versioning primitives.

**Acceptance gate (from product.md):** repeat seeds create no duplicates; filters and source status respected; no invented gaps for missing requirements; unknown eligibility stays visible; profile edits invalidate results.

### M2 — Integration (continuous small PRs)

- Replace mocked *service* responses (retrieval, embedding, explanation calls) with implemented ones. The *data* stays two clearly separate tiers throughout M2: the reviewed static catalog (real source rows with resolved reuse terms) versus synthetic fixture rows (unresolved reuse terms, or deliberately constructed edge cases like no-match/missing-requirement) — label which tier backs each demo screen and each test; never present a synthetic row as a reviewed catalog result.
- Verify the full profile-to-role evidence path end to end in the localhost demo using the reviewed static catalog where reuse terms are resolved (falling back to clearly labeled synthetic rows only where they are not): an application-ready example, a confirmed learning-gap example, and one sourced contextual resource — matching the demo script in product.md.
- Verify no-match, missing-requirements, unknown-eligibility, stale-version, and provider-timeout/retry states render correctly rather than crashing or fabricating data.
- Verify quotas, escaped output (no raw HTML/script injection from job/resource text or model output), and no sensitive data in logs.
- Cross-review C's track per the roadmap's rotation (A reviews B, B reviews C, C reviews A).

### M3 — Hardening

- Ranking/evidence regression fixtures covering the five synthetic profile cases from A against the seeded catalog.
- Filter-behavior tests (location, remote, role type); inclusion preferences affect resource visibility only, never job exclusion or ranking.
- Wrong-dimension/malformed vector rejection tests.
- Version-invalidation tests (profile version bump, catalog re-seed, checklist version bump each independently invalidate the right cached matches).
- Catalog provenance checks (every shown job/resource resolves to a recorded source commit/URL/checked date) and resource expiry handling.
- Verify learning advice always follows clarification of missing evidence — never a gap claim asserted before the user has had a chance to confirm/deny.
- After integration, coordinate the proposed five-user evaluation named in product.md (B leads while A/C observe): compare against unaided listings, measure role-choice reasoning and correct eligibility/evidence understanding, and record results — a confidence rating alone does not establish value.

## Coordination points

- **With A**: confirmed-profile schema/version contract and the embedding config (M0, blocking); résumé-path-relevance interface for tailoring suggestions (M1).
- **With C**: `catalog.ts`/`matches.ts` migration ordering; ownership/idempotency helper interfaces; shared operation/versioning primitives for invalidation.
- **Shared with all three**: path/checklist contracts and field-context-panel fact shape belong in api.md/data-model.md once agreed, not only in this plan or in code.

## Explicitly deferred (do not build in this plan)

Live/automated catalog refresh and its pagination/retry/dedup contract, the shared resource-research cache, Backboard-backed research reuse, Discord surfacing, any applicant-competition/acceptance-rate metric without a genuinely suitable data source, and any hiring-probability or fit-percentage figure.

## Implementation decisions to freeze in M0

The following are **proposed additions**, not existing routes or migrations. B drafts them in [api.md](../api.md) and [data-model.md](../data-model.md); A/C approve producer/consumer boundaries before implementation.

### Paths, evidence and saved actions

- B owns `career_paths`, immutable `path_checklist_versions`, `path_checkpoints`, checkpoint-to-requirement-version links, and private `user_path_selections`/`saved_actions`. C supplies ownership helpers and migration ordering; B implements domain persistence and deletion hooks.
- A checklist contains unique canonical skill checkpoints supported by reviewed requirement IDs. Eligibility is separate. An assessed checklist requires at least one reviewed checkpoint; show its actual small sample, never imply industry representativeness. Zero supported out of a nonempty checklist is valid; no reviewed checklist means unavailable, not zero.
- A checkpoint counts once when the confirmed profile contains resolving résumé evidence or explicit reviewed user-reported evidence. Retain the source label. Pending/uncertain evidence does not count. Versioned alias mappings determine canonical skill equivalence; do not infer that one technology implies another. Checklist version changes explain denominator changes.
- A "not evidenced" checkpoint requires an explicit, separately persisted **learning-gap confirmation** before it can drive personalized learning advice — a record of `(user, checkpoint, confirmed profile version, checklist version, confirmed_at)`, distinct from both the evidence state and the action state. It is not implied by opening a checkpoint, selecting an action, or marking an action done. A confirmation tied to a superseded profile or checklist version is stale: re-derive evidence state first and re-ask before showing personalized advice again; a stale confirmation never silently carries forward.
- Evidence state and action state are independent. Completing a course/action never updates skill coverage automatically. A owns added evidence and profile reconfirmation; B recomputes coverage from A's new confirmed version.
- Proposed routes: `GET /api/paths` for taxonomy, `GET /api/paths/:id?profileId=...&profileVersion=...` for owned assessment, and `GET /api/me/plan` / `PUT /api/me/plan` for selected path and up to three active actions across the plan. Mutation input includes `expectedVersion`, stable action/checkpoint/resource references and action state; validate all references and return 409 on version conflict. Switching paths retains saved actions with their original path labels; users can replace or remove them explicitly. Saving a fourth active action requires choosing a replacement.
- Persist choices server-side for return visits, with user ownership and optimistic plan versioning. Preserve completed actions as history without counting them toward three active actions. Superseded checklist/resource references stay labeled historical and require revalidation before reuse. User deletion removes private choices/action history but preserves public catalog/checklists.

### Retrieval and ranking baseline

1. Require the current confirmed profile and a compatible, valid embedding. Reject nonfinite, zero or wrong-dimension vectors before SQL. Freeze model/config/dimension with A; 768 remains a proposal until verified.
2. Apply explicit role-type, location and remote filters before retrieval. Treat an unspecified user preference as unrestricted. For a strict selected filter, unknown job metadata does not satisfy it; report exclusions and offer explicit relaxation, never silently broaden. Source-marked closed/unlisted roles cannot enter active recommendations. Snapshot-open is labeled with date, not a promise the vacancy remains open.
3. Retrieve at most 20 using exact cosine distance. Initial `rankingVersion=v1` preserves ascending cosine distance, with stable job ID as the final tie-break, and returns at most 10. Deterministic requirement comparison supplies annotations, not an uncalibrated second score. Any later reranking needs a separately reviewed formula and golden fixtures. Missing requirement sets do not receive a perfect score or inferred strengths.
4. Eligibility remains a sourced user check, including unknowns; do not infer citizenship, sponsorship needs, gender or degree equivalence. Inclusion-resource preferences do not alter job rank. Curators flag probable cross-source duplicates; only reviewed duplicate mappings collapse cards, retaining both provenance records.
5. Roles lacking reviewed requirements can remain discovery candidates, with an unavailable explanation and apply link. No skill-gap or checklist evidence is derived from title/similarity alone. Internal cosine values are not displayed as fit percentages.

### Grounding, failure and cache rules

Before accepting generated explanations, deterministic validation must prove each requirement belongs to that exact job version, each supporting evidence reference resolves to the current confirmed profile, and each resource reference resolves to a reviewed, unexpired catalog record. A syntactically valid model answer alone is insufficient. Untrusted résumé/posting text cannot issue instructions or choose tools/URLs. Escape text and validate curated outbound HTTPS links; no arbitrary model URLs or server-side fetches.

Absent evidence first produces a clarification action. Only the persisted learning-gap confirmation record above (never an inferred or implied confirmation) permits personalized learning advice; users can independently browse resources at any time. Application actions remain available while learning. For invalid model output allow at most one bounded repair, then use validated deterministic annotations with an explanation-unavailable state. Embedding/provider timeouts return the documented retryable error instead of fabricated matches. C provides configured deadlines, quotas and retry primitives; B bounds candidate count and explanation concurrency and measures request latency before M2.

Cache keys include user/profile ID and version, preference version, catalog snapshot/job versions, checklist and skill-mapping versions, embedding configuration, ranking version, and explanation prompt/model version. Resource expiry is checked at read time. Reads flag stale results and suppress obsolete actionable recommendations until regenerated. Before atomic persistence after any provider call, recheck ownership, deletion state and every input version; discard stale work and return conflict/retry guidance. Same idempotency key and input replays the stored result; changed input conflicts. B wires domain invalidation/cleanup into C's operations contract.

### Learning and community catalog

Extend the existing resource contract with `course`, `certification` and `project_guide` types, resource version, path/checkpoint associations, provider, prerequisites, cost/currency or explicit cost-unknown, availability, `checkedAt`, and a required review-expiry date for recommendations. Do not overload an employer association: community resources can stand alone. Add at least one reviewed learning/project option for every assessed path with a learning action, alongside the roadmap's three support resources. Offer a free/project alternative where reviewed evidence exists; never invent one to fill a card.

Expired or rejected resources cannot be recommended; show an honest unavailable state and queue manual re-review. Opted-in inclusion categories determine visibility without gender inference. Certifications are optional routes unless the actual role requirement says otherwise. Specific fees, prerequisites and availability require checked sources; static fixtures must distinguish illustrative values from verified facts.

Field-context denominators use unique reviewed roles in the selected path/cohort/filter slice, identified by snapshot. For each tag show explicit-tag count / full sample count plus unknown count; unknown does not mean the opposite. At N=0 show unavailable. Never compare these shares as competition scores.

## Small PR sequence and parallel work

Paths below are proposed organization, not existing modules. Keep [product.md](../product.md) as the authoritative backlog. Use feature branches, coordinate shared files, and keep pushes subject to operator authorization.

| PR | B output / proposed files | Depends on | Done when |
| --- | --- | --- | --- |
| B1 Contracts and fixtures | `src/contracts/opportunities.ts`, API/schema doc additions, synthetic fixtures | A evidence DTO; C adapter interfaces | Producer/consumer review; success, empty, missing-requirement, stale and failure fixtures validate |
| B2 Curated catalog | `data/catalog/`, `scripts/seed-catalog.ts`, `src/db/schema/catalog.ts` | B1; C DB/migration ordering | Manifest provenance and terms reviewed; repeat seed creates no duplicates; invalid batch leaves last valid data intact |
| B3 Matching service | `src/server/opportunities/`, `src/db/schema/matches.ts`, match/job routes | B2; A embedding contract; C operations/auth | Golden retrieval ordering, strict filters, grounding and stale-write tests pass |
| B4 Paths and saved plan | Path/checklist schema, path/plan routes, `app/opportunities/` and local components | B1; can begin with adapters alongside B2/B3 | Accessible tree/list; evidence detail; return-visit persistence; completion never changes coverage |
| B5 Actions and resources | Resource route/cards, next-action panel, A tailoring handoff | B2/B4; B3 real results | At most three active actions, clarification gate, resource expiry/opt-in behavior, source links |
| B6 Integration and regression | Synthetic end-to-end fixtures and documented verification | B3–B5 plus real A/C boundaries | M2 full journey, two-user isolation, error states and regression matrix pass |

B can curate sources and build fixture-backed UI while A implements extraction and C configures DB/auth. B does not wait for the whole app, but adapter-based demonstrations do not satisfy the integrated M2 gate. Shared config/dependency changes go through C; no new library is assumed installed. Choose and document a pinned test runner with C under the repository dependency-review policy before adding implementation tests.

## Verification matrix and handoff

| Fixture / action | Required assertion |
| --- | --- |
| Two candidates with equal cosine distance | Stable ID order; no arbitrary model reranking |
| High-similarity closed role or strict-filter mismatch | Excluded before top-20 retrieval |
| Unknown eligibility / requirements unavailable | Visible unknown/discovery state; no invented rejection or gap |
| Repeated requirement aliases across roles | One checkpoint; known denominator and traceable requirement IDs |
| Course marked done without new profile evidence | Coverage unchanged; action persisted separately |
| Foreign requirement/evidence ID or invented resource | Explanation rejected; safe fallback contains no unsupported claim |
| Profile/preference/catalog changes during provider call | Old response cannot become a current saved result |
| User deletion during provider call | No late private write; catalog remains intact |
| Second user guesses profile, match or plan IDs | 404 for foreign private records; no existence/content leak |
| Expired learning resource or absent opted-in category | No inappropriate recommendation; useful unavailable state |
| Empty catalog / provider outage / repeated idempotency key | Honest empty/error state; no duplicate operation or silent live scrape |
| Keyboard-only and narrow-screen journey | Expand/collapse, focus, readable text counts, status announcements and retry controls work without color |

Run existing `npm run check`, `npm run build`, and `npm run smoke` for implementation PRs, plus the agreed domain/integration runner. Extend the homepage-only smoke check when the opportunities routes exist; it currently proves no matching behavior. Capture screenshots/browser evidence for UI PRs and document any unavailable check honestly. B hands A requirement relevance references for truthful tailoring and hands C migration/cleanup hooks, fixtures, environment needs and measured provider-call bounds. M2 uses synthetic profiles only; real intake remains behind the separate M3 privacy gate.
