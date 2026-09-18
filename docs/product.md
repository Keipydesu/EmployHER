# Product and hackathon plan

## Concept

EmployHER helps HackHers participants turn existing experience into a practical search for tech internships and new-grad roles. A user uploads a résumé; Gemini extracts skills, experience, and education; the user reviews the result; the app matches curated GitHub internships/jobs and explains both relevant evidence and qualifications not yet evidenced. Each gap leads to a concrete next step, such as building a small SQL project, revising a résumé bullet, or checking a program's eligibility.

Audience focus does not require gender inference or gender-based access restrictions. Users choose whether to see documented women's employee groups, mentorship programs, inclusive benefits, scholarships, communities, and organizations. Evidence and source dates accompany suggestions; lack of a documented signal is unknown, not a negative employer judgment.

## Screens and behavior

1. Sign in with Auth0. Explain data processing; default the public demo to synthetic résumé fixtures.
2. Upload a text-based PDF or paste text in an approved pilot. Show parse errors and a text fallback; scanned PDF/OCR is out of scope.
3. Review skills, experience, and education with evidence excerpts. Correct or add user-reported information before confirming the profile.
4. Choose location, remote preference, role type, career interests, and optional inclusion-resource categories.
5. Browse ranked active roles. Each card shows source, last checked date, apply link, matched evidence, and missing or uncertain qualifications.
6. Open a role for up to three practical next steps with deliverables. “Not evidenced” never means “you cannot do this.”
7. Open coaching for follow-up questions. Opt in separately to remembering selected preferences; allow correction and deletion.

A ranking value is a retrieval aid, not a probability of hiring. Do not show a misleading fit percentage. Eligibility requirements are quoted from the source and checked by the user; unknown eligibility stays unknown.

## Prioritized backlog

| Priority | Deliverable | Acceptance gate |
| --- | --- | --- |
| P0 / 1 | Freeze contracts, synthetic fixtures, allowlisted source | Five synthetic résumé cases and reviewed catalog fixtures exercise success, missing data, and no matches |
| P0 / 2 | Auth0 + database + ownership | Login/logout work; two users cannot access each other's records |
| P0 / 3 | Résumé extraction and review | Skills/education/experience validated; excerpts resolve; user corrections persist |
| P0 / 4 | Static catalog import from two selected sources | Versioned snapshot, reviewed requirement excerpts, repeatable seed without duplicates; missing requirements stay unavailable |
| P0 / 5 | Semantic retrieval and gap explanation | Active roles only; grounded evidence; useful empty/error states; corrections invalidate old matches |
| P0 / 6 | Next steps + inclusion resources | Three bounded actions; each factual resource claim has a checked source |
| P0 / 7 | Integrated synthetic demo | M2 gates pass; real résumé intake stays disabled |
| P1 | Backboard coach | Separate user assistants; continued conversation; explicit memory opt-in and deletion |
| P1 | Real-data pilot readiness | M3 privacy, deletion, ownership and reliability gates pass before real input |
| P2 | Automated catalog refresh, scheduled worker, Discord bot, richer resource curation | Separate follow-up PRs after the core flow is reliable |

See "Three-person parallel MVP roadmap" below for the current milestone-gated work split; this is a proposed human work split, not a claim that work has started.

## Demo script and pitch

Three-minute story: sign in with a demo account, choose a synthetic student résumé, correct one extracted item, and compare two tech roles. For one, show evidence supporting an application and an honest résumé improvement. For the other, clarify a qualification not yet evidenced before suggesting a learning action. Open a sourced support resource relevant to the role or user goal. If coaching is implemented, ask it to remember a learning preference and demonstrate continuity. Label cached or fixture results and disclose incomplete features.

Pitch: “EmployHER connects what you have done to what you can do next. It turns a résumé into explainable opportunities, practical skill-building steps, and documented support resources—so an early-career job seeker has a next action instead of another overwhelming job list.”

## Decisions and non-goals

One web app, one database, two allowlisted job sources with a reviewed static snapshot for the MVP, a small corpus, and bounded model calls. Normal login is required for saved personal state. Backboard remains in the chosen architecture but its outage must not block matching. Demo fixtures may be used while real-data gates remain closed.

No application scaffold in this documentation task. No automated applications, outreach, employer quality scores, gender inference, hiring guarantees, unrestricted scraping, agent swarm, agent-to-agent auth, payments, blockchain, OCR, or mentor marketplace. A full four-week curriculum is deferred in favor of three concrete next steps.

## Three-person parallel MVP roadmap

The MVP is a working synthetic-data web demo: profile review → relevant tech roles → evidence and up to three next actions → contextual support resources. Backboard coaching remains P1; real résumé intake is a separate pilot gate. Milestones express dependencies, not time estimates. A/B/C are proposed owners to map to the three people at kickoff.

### M0 — Shared foundation and contracts

Begin concurrently: **A** owns profile/evidence DTOs and five synthetic résumé cases; **B** owns job/requirement/match/resource DTOs and the catalog manifest; **C** creates the minimal runnable Next.js shell, lockfile, CI checks, database connection and adapter interfaces. All three review the API/Zod contracts together and share curation work; B signs off the catalog.

Use static snapshots from [Summer2027-Internships](https://github.com/SimplifyJobs/Summer2027-Internships) and [New-Grad-Positions](https://github.com/SimplifyJobs/New-Grad-Positions). Target at least 15 reviewed tech roles spanning internship/new-grad tracks and three sourced support resources. Store repository/ref/commit, source and application URLs, review date, per-role cohort, and explicit requirements. Titles/icons alone cannot ground skill-gap explanations. Resolve reuse terms before publishing source-derived fixtures; synthetic fixtures can unblock development while that remains open.

Freeze profile/job versions, requirement IDs, draft/confirmed states, preference filters, error shapes and invalidation events from [api.md](api.md). Agree one embedding model/configuration and dimension shared by A and B. Provide success, no-match, missing-requirements, stale-version and provider-failure adapter fixtures. Proposed schema modules: A `profiles.ts`; B `catalog.ts`/`matches.ts`; C user/shared/`operations.ts`. C owns migration ordering, not every domain implementation.

**Exit:** the scaffold runs, contract fixtures validate, each owner can exercise their slice using adapters, and a reviewed catalog batch is ready. Contract changes still require both producer and consumer review; fixtures prevent blocking, not coordination.

### M1 — Three parallel vertical slices

| Owner | Deliverables and boundaries | Acceptance gate |
| --- | --- | --- |
| A — Profile | PDF/text intake, Gemini extraction, evidence validation, review/correction UI, confirmed versioned profiles and profile embeddings; owns résumé routes | Synthetic cases cover supported facts, absent evidence, malformed input and corrections; exact excerpts resolve; only confirmed current profiles feed matching |
| B — Opportunities | Static seed/import, role embeddings, pgvector retrieval, requirement comparison, grounded explanations, results/detail UI, next steps, contextual resources; owns job/resource/match routes | Repeat seeds create no duplicates; filters and source status respected; no invented gaps for missing requirements; unknown eligibility visible; profile edits invalidate results |
| C — Platform | Auth0, app navigation/layout, shared database/migration integration, ownership helpers, CSRF, operation/idempotency primitives, CI and Vercel preview; owns shared config | Two synthetic users cannot access each other's records; retries do not duplicate completed operations; provider keys stay server-side; preview/build/checks pass |

A and B integrate C's shared primitives into their own routes and test ownership locally; C does not become the author of every route. B can build against A's confirmed-profile fixture while A builds against B's sample results. C provides development adapters early; authentication and ownership must be real before M2 acceptance. A may start optional coaching only after their core slice integrates.

### M2 — Integration and synthetic demo

Integrate continuously as small PRs land. A verifies intake through confirmation; B verifies profile-to-role evidence and results; C runs deployment and cross-user browser checks. Replace mocked *service responses* with implemented endpoints/providers, while retaining clearly labeled synthetic résumé fixtures and the static catalog. Do not enable real résumé intake.

**Exit:** deployed demo shows an application-ready example, a confirmed learning-gap example and a contextual sourced resource. Also verify correction invalidation, no matches, missing requirements, unknown eligibility, timeout/retry states, quotas, escaped output and no sensitive logs. No hiring probabilities or implication that repository freshness proves a vacancy is open. The model may suggest an application action without making further learning a prerequisite. Each owner cross-reviews another track (A reviews B, B reviews C, C reviews A).

### M3 — Parallel pilot hardening and optional coaching

- **A:** extraction quality, upload limits, provider failure recovery, malicious résumé inputs; optional Backboard adapter/UI with per-user isolation, explicit memory opt-in and deletion checks.
- **B:** ranking/evidence regression fixtures, filter behavior, wrong-dimension vectors, version invalidation, catalog provenance and resource expiry. Check that learning advice follows clarification of missing evidence.
- **C:** retention/expiry scheduler, deletion reconciliation and late-write prevention, authorization/CSRF, quotas and operational observability. A/B implement domain cleanup hooks against C's lifecycle contract.

**Exit for real-data pilot:** [privacy.md](privacy.md) consent, provider handling, retention and deletion are verified, plus the applicable [development checks](development.md#verification-gates). Coaching checks are required only if enabled; automated-refresh checks belong to its later milestone. Keep unavailable features disabled rather than pretending their gates passed.

After integration, B coordinates a proposed five-user evaluation while A/C observe: compare with the same unaided listings, measure role-choice reasoning, correct eligibility/evidence understanding and completion of a useful next action. Record results and revise the product; confidence ratings alone do not establish value.

### Delivery and follow-up

Use feature branches and PRs; never commit directly to `main` or `master`. Merge the foundation PR first, then separate A/profile, B/opportunities and C/platform PRs, followed by integration and domain hardening PRs. Each PR names its contract dependencies, verification and remaining mocks. C integrates shared configuration and migrations; no simultaneous edits to shared schema/config files without coordination. Independent clones/worktrees allow concurrent coding; a shared Talking Stick workspace still has one writer at a time.

After core acceptance, P2 adds automated snapshot refresh with pagination/retry/deduplication and partial-failure preservation, then scheduled workers or Discord as separately scoped features. Static-source curation is part of this MVP; a live ingestion pipeline is not.

## Future Discord integration

A bot could offer `/opportunities`, `/next-step`, and `/coach` using the same authorized backend. Link Discord to an existing Auth0 account using a short-lived, single-use confirmation flow. Use minimal bot permissions and verify platform request signatures. Keep résumé content and personal recommendations out of public channels; use ephemeral responses or direct users to the authenticated web app. Obtain separate notification consent, support unlink/delete, and keep bot credentials server-side. No bot token or Discord API is needed for the MVP.
