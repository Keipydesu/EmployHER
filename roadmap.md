# EmployHER delivery roadmap

Last assessed: 2026-09-19. Status: working synthetic profile and Opportunities slices; connected personal-résumé product acceptance is pending.

This is the current execution sequence from the existing app to the anonymous demo and personal-résumé product release, with all delivery milestones consolidated here. [Product scope and backlog](docs/product.md) remain authoritative; this roadmap does not expand them. R0–R3 below describe remaining work and map to the existing M0–M3 acceptance milestones. A/B/C below are responsibility areas, not claims of assigned people or permission for concurrent writes. In a shared workspace, use Talking Stick for writer turns.

## 1. Finish line and boundaries

EmployHER is a localhost career-development app: users upload their own résumés and learn which projects, skills and organizations can help them progress in a chosen field, informed by recurring requirements in relevant jobs and internships. The main output is a career-building plan; individual job matches provide optional supporting context. See [decision 004](docs/decisions/004-career-building-and-anonymous-demo.md).

There are two separate entry points:

- **Try the demo:** no sign-in; choose a supplied synthetic résumé and explore example guidance. Isolate sample state and clearly label fixtures. No personal upload or access to private account data is available through this route.
- **Use the real app:** sign in, review the processing explanation and upload your own résumé. Save personal evidence, interests and next steps under your account. Trying the demo is optional.

The real-user journey is:

1. Sign in and understand how personal résumé data will be processed.
2. Upload your own text-based PDF or paste its text.
3. Review extracted skills, education and experience; correct and confirm.
4. Choose a field, location, remote preference, internship/new-grad goal and optional resource categories.
5. Compare your evidence with recurring requirements across reviewed listings; inspect source dates, sample coverage and relevant roles.
6. Clarify missing evidence and choose up to three useful next steps: projects, skills to develop, or sourced organizations/mentorship resources. Inspect truthful résumé suggestions.
7. Return to saved choices, update your résumé evidence and see stale guidance invalidated.
8. Sign out; another user cannot access your private state.

R2 verifies connected services using synthetic test inputs and the anonymous demo. R3 completes the personal-data requirements needed to enable users’ own résumés; it is required for the real product release, not optional scope beyond the requested product. Keep real intake disabled until those checks pass. Coaching is P1; automated refresh and the research cache are later work. [Decision 003](docs/decisions/003-localhost-demo.md) keeps the current target on localhost.

## 2. Starting point: what exists

| Area | Implemented evidence | Remaining MVP gap |
| --- | --- | --- |
| App foundation | Next.js/TypeScript shell, navigation, checks and CI configuration | Revalidate integrated build and CI after wiring services |
| Profile | Five synthetic cases, PDF/text parsing, extraction validation, review/corrections, confirmation and suggestions | Bind authenticated runtime, durable operations and storage; verify live Gemini |
| Profile adapters | Gemini REST adapter, PostgreSQL repository and versioned schema | Integrate migrations, owner foreign keys, lifecycle and runtime bootstrap; verify database transactions |
| Identity | Optional Auth0 client, middleware and login/logout UI | Verify credentialed flow and resolve sessions to internal owners on every private route |
| Opportunities | Filters, fixture ranking, paths/checkpoints, uncertain qualifications and empty states | Consume the user's confirmed profile through authenticated endpoints |
| Catalog | 15 illustrative active roles plus edge cases and sourced resource starting points | Reviewed source-derived snapshot with real requirements, provenance and application links |
| Saved work | Actions, confirmations, version checks and local demo persistence | Shared authenticated database persistence for preferences, paths, actions and matches |
| Matching | Tested retrieval/grounding functions and adapter interfaces | Implement pgvector adapter and unify embedding configuration: B uses an 11-dimensional fixture basis; A uses 768-dimensional embeddings |

The profile harness uses in-memory state; Opportunities uses local JSON sessions. Navigating between their pages does not connect their data. `installProfileRuntime()` has no application bootstrap binding, and production matching routes remain unmounted. See the [profile handoff](docs/implementation/person-a.md) and [Opportunities handoff](docs/opportunities-implementation.md).

Assessment verification: 131 tests passed under Node 24; formatting, lint and TypeScript checks passed; homepage/assets and Opportunities HTTP smoke passed on both loopback hostnames. Production build, browser suite and live services were not rerun in this assessment. Earlier recorded results are historical evidence, not proof of current integration.

## 3. R0: converge contracts and fix integration gaps (M0 closure)

Owners: A (profile), B (catalog/matching), C (platform). Some foundation work is already complete; close these gaps before connecting the slices.

- [ ] Define a reviewed, versioned mapping from A's `facts[]` to B's skill/evidence model, preserving fact IDs and provenance. Keep unmapped evidence explicit rather than guessing or silently dropping it. Reconcile the API/schema documents.
- [ ] Unify path identifiers, including A's `data` and B's `ml`, and preserve requirement/checklist references through the bridge.
- [ ] Add integration regressions for session expiry during an active profile workflow and confirmation-aware explanation validation. The current `validateExplanation()` does not receive current gap-confirmation state; require it before treating a gap as confirmed or personalizing learning advice.
- [ ] Define the aggregate-pattern and career-guidance contracts: path/cohort/filter scope, deduplicated source requirement IDs, known/unknown denominators, snapshot dates, evidence references, action/resource rationale, versions and invalidation. These are proposed contracts; per-job match endpoints alone do not implement them. A single snapshot cannot establish change over time.
- [ ] Agree current-profile reads, draft/confirmed rules, profile/job/checklist versions, preference filters and invalidation events.
- [ ] Specify persisted selected paths, saved actions and learning-gap confirmations, including stale and completed history behavior.
- [ ] Freeze one Gemini model/configuration and compatible 768-dimensional embedding space for profiles and roles; never reuse fixture vectors as provider embeddings.
- [ ] Agree anonymous sample versus authenticated personal-upload route boundaries, error shapes, owner resolution, durable idempotency and compare-and-set commit boundaries.
- [ ] Prepare success, no-match, missing-requirements, stale-version and provider-failure integration fixtures.
- [ ] Resolve source reuse terms and select snapshot commits for the two allowlisted repositories; prepare the reviewed catalog batch described in section 5.
- [ ] Follow [decision 006](docs/decisions/006-retain-drizzle-with-tiger-data.md): retain TypeScript, plan Tailwind CSS, and use Drizzle/pg with Tiger Data PostgreSQL/pgvector. Review existing schema/repository constraints and agree connection bootstrap, migration ordering and runtime bindings.
- [ ] Review dependency changes against the repository's exact-version security policy before installation.

**Contract-ready exit:** producer and consumer contracts agree, fixtures validate and the schema/migration sequence is reviewed. A/C infrastructure and B adapter implementation may proceed against those reviewed synthetic contracts immediately. **Catalog-ready exit:** source terms and the reviewed batch are ready; this blocks source-derived catalog publication and integrated acceptance, not unrelated implementation. Update [API](docs/api.md), [data model](docs/data-model.md) and handoff docs as contracts land.

## 4. R1: connect platform and profile (M1 workstreams A/C)

Owner: C for shared infrastructure; A for profile bindings. Depends on section 3's contract-ready exit, not catalog readiness. A builds the evidence/runtime bridge, B builds retrieval adapters and curates the catalog, and C builds auth/storage/operations concurrently against agreed ports. Shared writes still require coordinated turns.

- [ ] Add the reviewed Tailwind CSS setup to the TypeScript app and migrate styling with browser/visual verification; current screens use plain CSS.
- [ ] Bind the existing Drizzle profile schema/repository to the shared pg connection and authenticated runtime; verify ownership, atomic revisions, invalidation and deletion/expiry behavior against PostgreSQL.
- [ ] Configure Auth0 localhost callbacks/logout and verify login, session expiry and logout.
- [ ] Map Auth0 issuer/subject to internal user IDs; enforce ownership and same-origin/CSRF checks on private reads and writes.
- [ ] Connect Tiger Data with verified TLS, enable pgvector through a reviewed migration, and establish ordered migrations and repeatable setup commands using Drizzle and reviewed SQL.
- [ ] Integrate profile heads/versions, lifecycle rows and invalidation events with users, preferences, catalog, matches, plans and operation records.
- [ ] Implement atomic owner-scoped operations with input digests, leases, bounded replay and stale/deletion guards.
- [ ] Install `ProfileRuntime` with authenticated authorization, fixture-only intake, PostgreSQL storage, Gemini and B's reviewed path catalog.
- [ ] Apply bounded provider calls, user/global quotas and sanitized operational logs.
- [ ] Keep a no-sign-in sample journey separate from authenticated personal-state routes. Verify the latter with synthetic uploads until R3 enables personal input; sample tokens must never authorize private routes.
- [ ] Verify a correction persists across restart and creates a new current version; drafts, expired profiles and simulated vectors cannot enter real matching.

**Exit:** two synthetic users can sign in and independently extract, correct, confirm and reload durable profiles. Foreign IDs are denied. Retries do not duplicate completed application operations. Verify with real Auth0/database bindings and bounded synthetic provider calls, not mocks alone.

## 5. R1: connect reviewed catalog and matching (M1 workstream B)

Owner: B, with A supplying confirmed profiles and C supplying persistence/ownership. Curation starts during section 3. B can implement and test adapters against agreed ports before section 4 exits; connected runtime acceptance requires C's ownership/storage primitives and A's confirmed-profile bridge.

- [ ] Import a reviewed static snapshot from `SimplifyJobs/Summer2027-Internships` and `SimplifyJobs/New-Grad-Positions` after resolving reuse terms.
- [ ] Include at least 15 reviewed tech roles across internship/new-grad tracks and three reviewed support resources.
- [ ] Record repo/ref/commit, source and application URLs, checked date, cohort, status and exact requirement excerpts. Missing requirements remain unavailable; titles and icons do not establish skills.
- [ ] Make seeds repeatable without duplicates, validate batches before writes, and preserve provenance and record versions.
- [ ] Embed roles in the same model/configuration as confirmed profiles; reject wrong-length, zero, nonfinite and incompatible vectors.
- [ ] Implement filtered pgvector retrieval and version-guarded match persistence; retrieve at most 20 candidates and return at most 10 roles with stable ties.
- [ ] Implement the agreed aggregate-pattern and career-plan read/write contracts, then mount authenticated match, job and resource endpoints plus the agreed path/action/preference endpoints. Replace fixture service responses in the integrated UI.
- [ ] Aggregate recurring skill requirements across reviewed listings for each chosen field/cohort; show sample counts, sources, dates and missing-data limits. Prioritize career-development actions from these patterns and confirmed personal evidence, not just one matching job. Claims of rising/falling demand require comparable dated snapshots.
- [ ] Connect path coverage and résumé suggestions to reviewed requirement IDs. Keep uncertain eligibility visible and ask about omitted experience before confirming a learning gap.
- [ ] Persist up to three active actions and contextual resources; enforce resource review, expiry and opt-in rules.
- [ ] Check current versions on result reads and commits. Profile/preference/catalog/checklist changes invalidate affected results and label saved history honestly.

**Exit:** confirming a profile produces a career-development view grounded in patterns from the reviewed catalog, with supporting role links. Correcting it changes or invalidates results end to end. Every gap resolves to a reviewed requirement; every evidence claim resolves to profile evidence or clearly labeled user-reported information. Users can follow real application links without completing learning actions first.

## 6. R2: verify the anonymous demo and connected services (M2 integration)

Owners: A verifies intake/review, B verifies evidence/results, C verifies platform and cross-user behavior. Each area receives independent cross-review.

- [ ] Verify the supplied-résumé demo works without sign-in and cannot read private data or accept personal uploads.
- [ ] Rehearse the real-user journey from section 1 with signed-in test users, synthetic uploads and implemented endpoints/providers. These are integration tests, not the anonymous demo entry point.
- [ ] Demonstrate recurring requirements across reviewed roles, one application-ready example, one user-confirmed learning gap, a project/skill action and a contextual sourced organization or mentorship resource.
- [ ] Verify two-user isolation, CSRF, upload/body limits, prompt injection handling, escaped output and absence of sensitive logs.
- [ ] Exercise no matches, missing requirements, unknown eligibility, invalid vectors, stale edits/results, provider timeouts, retry/idempotency behavior and quotas. Verify expiry recovery during an active session, original-result replay after later writes, and stale/deletion guards blocking late result commits.
- [ ] Prove explanation validation rejects a confirmed-gap claim without a current user confirmation; profile/checklist changes invalidate old confirmations. Apply resource expiry and opt-in at read time.
- [ ] Verify saved preferences/actions survive reload/restart; completing an action does not manufacture skill evidence or inflate coverage.
- [ ] Add browser coverage for the connected journey and its key error paths. Check mobile layout, keyboard access and meaningful status announcements; capture screenshots.
- [ ] Run Node 24 checks, tests, production build and applicable HTTP smoke tests; record exact commands, runtime mode and results. Test the authenticated synthetic flow separately from checks that expect an unconfigured runtime to return 503.
- [ ] Rehearse the three-minute demo and label fixtures, cached data and unavailable features accurately. Update stale README/stack/development status statements.
- [ ] Record A→B, B→C and C→A review outcomes and close acceptance blockers.

**Integration done:** anonymous sample exploration works without sign-in, and the authenticated service journey passes with two isolated synthetic test users. This is not yet completion of the personal-résumé product. Passing unit tests, a build or two disconnected pages is insufficient; real input remains disabled until R3.

## 7. R3: enable the personal-résumé product (M3 release requirements)

Depends on M2. Owners: A for extraction/input robustness, B for ranking/catalog regression, C for privacy and lifecycle operations.

- [ ] Verify provider data handling and retention for the actual service tiers; publish accurate consent and processing explanations.
- [ ] Implement the proposed 30-day application retention, immediate expiry access denial, scheduled cleanup and durable cleanup retries.
- [ ] Implement Delete My Data with immediate access/write blocking, truthful pending/failed/completed status, deletion reconciliation and late-result prevention. Verify the proposed 24-hour application cleanup target and document provider/backup limitations.
- [ ] Test malicious and malformed résumés, extraction accuracy, timeouts, quotas, ownership and deletion races against connected services.
- [ ] Regress ranking, preference filters, catalog provenance, resource expiry, dimension/model changes and version invalidation.
- [ ] Verify operational recovery and sanitized observability; complete all applicable [privacy](docs/privacy.md) and [development gates](docs/development.md#verification-gates).
- [ ] Enable authenticated personal uploads after the data-handling gates pass and the release decision is recorded; keep the anonymous demo sample-only.
- [ ] Verify a consenting user can upload their own résumé, confirm evidence, see source-grounded field patterns and choose/save relevant projects, skills and organizations. A supplied sample must not be required for this flow.

After integration, conduct the proposed five-user evaluation using synthetic data until personal-data release checks pass. Compare against the same unaided listings; assess career-action reasoning, evidence/eligibility understanding and completion of a useful project, skill or community step. Do not infer hiring outcomes from this short evaluation. Record findings and revise the product.

**Product release done:** the own-résumé journey and anonymous demo both work, applicable M2/M3 checks pass, consent/lifecycle behavior are verified, and enabled intake modes are documented. This does not authorize hosted deployment.

## 8. Optional work after the core flow

| Priority | Work | Required gate |
| --- | --- | --- |
| P1 | Backboard coaching | Per-user assistants/threads, conversation continuity, explicit memory opt-in, correction/deletion reconciliation and outage isolation; matching must work without it |
| P2 | Automated catalog refresh | Pagination/retry/deduplication, changed/closed records, complete-snapshot detection and preservation on partial failure |
| P2 | Shared resource-research cache | Agreed cache/review/refresh contracts, verified provider retrieval/isolation, human-reviewed promotion and no personal résumé/search data |
| P2 | Scheduled workers or Discord | Separate scoped work; narrow service authorization, account linking, privacy and notification consent where applicable |
| Deferred decision | Hosting | Explicitly revisit decision 003 and verify deployment-specific auth, secrets, database and PDF-worker behavior |

No automated applications/outreach, mentor marketplace, OCR, gender inference, employer quality scores, hiring probabilities or full curriculum are required for this roadmap's MVP.

## 9. Current priority order and delivery checklist

Operator clarification ([decision 007](docs/decisions/007-gemini-career-recommendations.md)):
Gemini must author the prioritized career recommendations. Complete structured
Gemini synthesis, versioned persistence and the connected recommendation UI;
deterministic checklist/matching output alone does not satisfy the product.

1. **Close shared contracts and platform setup** — agree the profile bridge, schema, embedding configuration and ownership/operation interfaces.
2. **Finish catalog curation alongside platform work** — source terms, reviewed excerpts, provenance and application links are MVP blockers.
3. **Connect authenticated profile persistence** — bind Auth0, PostgreSQL, operations and Gemini with synthetic inputs.
4. **Connect career guidance and saved plans** — turn listing patterns and current profile evidence into durable next actions, with role matches as supporting context.
5. **Run M2 acceptance and rehearse** — fix end-to-end failures, record evidence and update implementation status.
6. **Enable the real product** — complete personal-data checks and verify own-résumé career guidance.
7. **Then expand** — optional coaching and P2 features follow separate scopes.

Suggested PR sequence: contracts → platform/migrations → profile runtime → reviewed catalog/import → career guidance and saved plans → integrated browser/reliability checks → personal-data release checks and own-résumé acceptance. Catalog research can start immediately; merge dependencies must remain explicit. Keep each PR focused, list remaining mocks and include screenshots for UI changes. No automatic push or deployment.

For every completed item, record the implementing PR/commit, checks actually run and unresolved limitations. Do not mark an item complete based only on adapter code or mocked tests. When scope changes, update [product.md](docs/product.md) first and align this sequence, contracts and acceptance gates.

## 10. Execution evidence — active implementation

The two active agents agreed to implement deterministic integration contracts first, followed by platform/runtime, catalog/guidance and connected acceptance. The additional Codex harness is inactive; primary Codex owns implementation and Claude independently reviews/tests. No automatic push.

- Profile bridge and confirmation-aware explanations: implemented in `src/opportunities/profile-bridge.ts` and `engine.ts`, independently reviewed by Claude. Exact aliases preserve unmapped evidence and provenance; authenticated route wiring remains pending.
- Field-level patterns: `patterns.ts` and the synthetic Opportunities UI expose reviewed-source counts, unknowns and per-skill references. This is a reusable implementation, not proof of source-derived catalog or private persistence readiness.
- Session-expiry recovery: draft reconciliation and browser regression pass under Node 24 with isolated `.next-test` output. Changed input preserves the draft and requires restoring the original input before recovery.
- Durable operations: real isolated PostgreSQL test proves original-result replay, digest conflict, lease fencing/transaction rollback and account-deletion denial. Full profile/pgvector migrations, live Tiger Data and Auth0 remain unverified.
- Live prerequisites: configure Gemini API key/extraction model and DATABASE_URL locally, verify Auth0 callbacks, and complete provider-tier/personal-data checks. Use supplied synthetic inputs on the free API tier. Public source reading proceeds with attribution; source-derived publication terms and reviewed catalog excerpts remain distinct acceptance work.

- Runtime/route split: Node instrumentation now opt-in binds Auth0 owner resolution, verified-TLS pool, existing Drizzle profile repository and durable operation hooks. `/api/resumes` is private-only; sample handlers are explicitly mounted under `/api/demo/resumes`, with browser UI at `/demo/profile`. `/profile` reports the personal-release gate accurately. Seven browser cases and 147 unit tests pass; five isolated PostgreSQL integration cases pass. Full production build/check pass.
- Live provider evidence: the configured Gemini key successfully embedded one synthetic sentence with `gemini-embedding-001`, returning 768 finite, non-simulated values. No personal input was sent.
- Migration verification: the migration CLI executes correctly and applies platform migration 001 on the disposable PostgreSQL 14 cluster, then fails closed at the unavailable pgvector extension. Full profile/vector/ownership migration and private end-to-end acceptance remain open; a successful adapter test does not close that gate.
- Lifecycle regression evidence: eight isolated PostgreSQL tests pass, including cleanup transaction rollback after a forced failure, persisted backoff and retry through a new worker instance, and rejection of a provider callback arriving after deletion. Formatting, lint and type checks pass. These tests use non-vector profile-head tables; they do not close the full migration or live-service gates.
- Saved plans: `saved-plan.ts`, `platform/career-plans.ts` and migration 004 implement durable preferences/actions, profile/catalog/checklist invalidation, permanent stale-history labels, atomic original-result replay and ownership checks. Nine PostgreSQL and 151 unit tests pass. Plans cascade on profile deletion/expiry. Endpoint/UI integration and source-catalog activation remain pending; this does not yet provide a connected personal career-plan journey.
- Catalog research now covers 15 employer-reviewed roles across both source repositories (three per category), with pinned source commits and explicit qualification caveats in `docs/research/catalog-candidates-2026-09-19.md`. Batch validation and atomic activation/filtered pgvector retrieval adapters are implemented, with two validator tests passing. Source seed construction, resource re-review, provider embeddings and pgvector execution remain unverified.
- Onboarding update: collect editable fields of interest during account setup and scope guidance/retrieval to selected tracks. Optional versus mandatory demographic questions for community suggestions remains a separate product clarification; no demographic fields are implemented yet.
- Reviewed seed and career API: `catalog:seed -- --validate-only` successfully embedded/validated 15 public role summaries with the configured Gemini service and three reviewed resources, without DB writes. `/api/career` now binds owned confirmed profiles, selected-path guidance, supporting roles and durable plans; bootstrap also supplies reviewed requirements to profile suggestions. 154 unit tests, code checks and isolated production build pass. Catalog seed source review is AGREE; final career-service review, pgvector/Tiger Data acceptance, onboarding and personal UI remain pending.
- Gemini synthesis: `gemini-career.ts` now asks the configured model to author up to three prioritized actions with reasons/deliverables and validates supplied evidence/source/resource references. Three adapter tests and code checks pass; peer review is AGREE. A bounded live synthetic test received provider HTTP 503 `UNAVAILABLE`, so live recommendation acceptance is not claimed. Persistence, API/UI wiring and later retry remain required. This differs from the already-successful embedding calls.

- Live database acceptance (2026-09-19): the configured application database connected with certificate-verified TLS; its initially empty public schema now has all seven ordered migration records, including the real pgvector profile schema and migrations 001–006. `npm run db:migrate` succeeded and a second run was a no-op. `npm run catalog:seed` activated `reviewed-2026-09-19-v1` (15 provider-embedded roles, three resources). Read-only calls through `ReviewedCatalog.retrieve()` returned three scoped roles in each of five categories, repeated ordering matched, and a stale catalog version was rejected. This closes the previously missing live vector/migration evidence; Auth0, private profile writes and the complete connected journey remain unverified.

- Interest onboarding: migration007, `AccountInterests`, `/api/me/interests` and `/onboarding` now persist editable account fields, with signup routing and private-profile onboarding enforcement. Career retrieval/context only use selected paths; analysis and plan writes check interest versions under the owner lock. Migration007 applied to the live app database. 158 unit tests and 11 isolated PostgreSQL tests pass, including interest replay/isolation/stale edits and rejection of a model result after interests change. Auth0 browser acceptance, account-preference retention and complete Gemini action-selection UI remain open.

- Gemini action selection: private career UI now saves recommendations by server-validated context hash/index and renders saved steps with complete/remove controls. Actions retain rationale/provenance, share active/history limits and never manufacture evidence on completion. Cache identity excludes action-only plan version changes while transactional version guards remain. 159 unit tests, 12 PostgreSQL tests and code checks pass; authenticated browser and live recommendation acceptance remain open.
