# Product and hackathon plan

## Concept

EmployHER helps HackHers participants turn existing experience into a practical career search. A user uploads a résumé; Gemini extracts skills, experience, and education; the user reviews the result; the app matches curated GitHub internships/jobs and explains both relevant evidence and qualifications not yet evidenced. Each gap leads to a concrete next step, such as building a small SQL project, revising a résumé bullet, or checking a program's eligibility.

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
| P0 / 1 | Freeze contracts, synthetic fixtures, allowlisted source | One résumé and a small role set exercise success, missing data, and no matches |
| P0 / 2 | Auth0 + database + ownership | Login/logout work; two users cannot access each other's records |
| P0 / 3 | Résumé extraction and review | Skills/education/experience validated; excerpts resolve; user corrections persist |
| P0 / 4 | GitHub ingestion | Repeat run is idempotent; changed rows update; failed fetch never closes all jobs |
| P0 / 5 | Semantic retrieval and gap explanation | Active roles only; grounded evidence; useful empty/error states; corrections invalidate old matches |
| P0 / 6 | Next steps + inclusion resources | Three bounded actions; each factual resource claim has a checked source |
| P1 / 7 | Backboard coach | Separate user assistants; continued conversation; explicit memory opt-in and deletion |
| P1 / 8 | Demo and pilot hardening | Rate limits, timeout UX, refresh, deletion races, and provider outages checked |
| P2 | Scheduled worker, Discord bot, richer resource curation | Only after the core flow is reliable |

See "Three-person parallel MVP roadmap" below for the current milestone-gated work split; this is a proposed human work split, not a claim that work has started.

## Demo script and pitch

Three-minute story: sign in with a demo account, choose a synthetic student résumé, show extracted Python/SQL skills and correct one item, retrieve an internship, point to one supported qualification and one uncertain qualification, show a small project that could provide evidence, then open a sourced mentorship/community resource. If coaching is implemented, ask it to remember a learning preference and demonstrate continuity. Label cached or fixture results and disclose incomplete features.

Pitch: “EmployHER connects what you have done to what you can do next. It turns a résumé into explainable opportunities, practical skill-building steps, and documented support resources—so an early-career job seeker has a next action instead of another overwhelming job list.”

## Decisions and non-goals

One web app, one database, one curated ingestion source, a small corpus, and bounded model calls. Normal login is required for saved personal state. Backboard remains in the chosen architecture but its outage must not block matching. Demo fixtures may be used while real-data gates remain closed.

No application scaffold in this documentation task. No automated applications, outreach, employer quality scores, gender inference, hiring guarantees, unrestricted scraping, agent swarm, agent-to-agent auth, payments, blockchain, OCR, or mentor marketplace. A full four-week curriculum is deferred in favor of three concrete next steps.

## Three-person parallel MVP roadmap

Splits the P0/P1 backlog above into three vertical workstreams that can run concurrently after a short shared foundation session. Supersedes the "Build owners" line above with a milestone-gated plan.

**M0 — Foundation (all three together, one session).** Freeze the Zod/API contracts in `docs/api.md`. Draft per-domain Drizzle schema files so parallel edits don't collide: `profiles.ts` (Track A), `catalog.ts`/`matches.ts` (Track B), `operations.ts`/user/session tables (Track C). Produce committed fixtures: 5 synthetic résumés; a one-time parse of the two SimplifyJobs source repos into ≥15 curated roles that include real, reviewed requirement excerpts (not just title/legend-icon data — see `docs/architecture.md`'s ingestion contract for why bare rows can't support a grounded gap claim); and the inclusion-resource seed set (each entry sourced, dated, per `docs/privacy.md`). Gate: all three can build independently against frozen contracts and fixtures without further sync.

**M1 — Parallel vertical slices.**
- **Track A — Profile intake.** Résumé upload, Gemini structured extraction, review/correction UI, profile confirmation and versioning, embedding generation. Stretch (after this track's core is integrated): Backboard coaching (P1) — not required for the MVP demo.
- **Track B — Catalog and matching.** Loads the M0 static snapshot into `jobs`/`job_requirements`/`inclusion_resources`; semantic retrieval via pgvector; grounded gap explanation restricted to roles with a reviewed requirement excerpt (roles without one show as discovery candidates with requirements marked unavailable, not an inferred gap); next-steps generation; match persistence and invalidation on profile correction.
- **Track C — Platform.** Next.js/Tailwind/shadcn app shell; Auth0 integration and session/ownership middleware; Tiger Data provisioning and migration ordering across A's and B's schema files; `operations`/idempotency table and CSRF protection; Vercel deployment config.

Each track's acceptance gate is its corresponding row in the backlog table above (e.g. Track B: "active roles only, grounded evidence, useful empty/error states").

**M2 — Integration and demo.** Wire the three tracks together and remove mocks/fixture-only paths. Gate: the demo script below runs end-to-end against real (non-mock) endpoints — one apply-ready role, one role with a genuine gap, and one inclusion resource shown contextually on a matched role card (not a disconnected generic list).

**M3 — Parallel hardening.** Split again across three people using `docs/development.md`'s verification-gate list (two-user ownership/CSRF, idempotency and timeout recovery, deletion races, provider outages, no sensitive logs, etc.) as the acceptance bar. Backboard coaching, if not already done in Track A's stretch slot, lands here as an explicit stretch item — never a blocker for the core demo.

The one-time source snapshot in M0 is a static fixture, not a live/scheduled ingestion pipeline; the fuller ingestion contract in `docs/architecture.md` (pagination, ETag, retry, dedup) is explicitly deferred past the MVP.

## Future Discord integration

A bot could offer `/opportunities`, `/next-step`, and `/coach` using the same authorized backend. Link Discord to an existing Auth0 account using a short-lived, single-use confirmation flow. Use minimal bot permissions and verify platform request signatures. Keep résumé content and personal recommendations out of public channels; use ephemeral responses or direct users to the authenticated web app. Obtain separate notification consent, support unlink/delete, and keep bot credentials server-side. No bot token or Discord API is needed for the MVP.
