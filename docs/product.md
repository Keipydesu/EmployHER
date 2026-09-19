# Product and hackathon plan

## Concept

Gemini is the primary recommendation engine: it analyzes résumé evidence, selected
interests and relevant SimplifyJobs context to propose prioritized next steps.
Tiger Data stores structured records, Backboard provides isolated user memory,
and Auth0 handles authentication. Retrieval/checklists support this analysis;
they do not replace it. See [decision 007](decisions/007-gemini-career-recommendations.md).

EmployHER is a career-building app for early-career people in tech. A user uploads their own résumé, reviews extracted experience, and receives a practical plan for developing relevant skills, building projects and connecting with useful organizations. Recurring requirements across reviewed jobs and internships inform that plan alongside the user's goals and existing evidence. The aim is to help users become stronger candidates over time; individual vacancies provide supporting examples and optional application opportunities.

Visitors can explore the experience without signing in using a supplied synthetic résumé. This optional demo is separate from the personal-résumé journey. See [decision 004](decisions/004-career-building-and-anonymous-demo.md).

Audience focus does not require gender inference or gender-based access restrictions. Users choose whether to see documented women's employee groups, mentorship programs, inclusive benefits, scholarships, communities, and organizations. Evidence and source dates accompany suggestions; lack of a documented signal is unknown, not a negative employer judgment.

The [career-path user story](user-story.md) expands this journey into a progress/tree view, path-specific résumé guidance and contextual learning/mentorship resources. Its progress bars measure transparent evidence-checklist coverage, never hiring probability.

## Screens and behavior

1. Offer two entry points: try a supplied synthetic résumé without sign-in, or sign in with Auth0 to use a personal résumé. Explain processing before personal upload.
2. In the real app, upload the user’s own text-based PDF or paste its text after the personal-data release checks pass. Show parse errors and a text fallback; scanned PDF/OCR is out of scope.
3. Review skills, experience, and education with evidence excerpts. Correct or add user-reported information before confirming the profile.
4. Choose location, remote preference, role type, career interests, and optional inclusion-resource categories.
5. Explore career paths and recurring requirements across the reviewed listing sample. See existing strengths, uncertain evidence and practical ways to develop, with sources, dates and sample scope. Relevant roles are optional supporting examples.
6. Choose up to three career-building actions with deliverables: projects to build, skills to practice, or sourced organizations/resources to investigate. A user does not need to open a job card to receive this plan. “Not evidenced” never means “you cannot do this.”
7. Open coaching for follow-up questions. Opt in separately to remembering selected preferences; allow correction and deletion.

Career guidance uses recurring requirements across relevant reviewed jobs and internships, compared with the user’s confirmed evidence. Suggest projects, skills and sourced organizations/mentorship opportunities for a selected field; individual job matches are supporting exploration, not the sole product output. Show deduplicated sample counts, the known-requirement denominator, missing-data counts, cohort/filters, sources and dates. One static snapshot supports sample-level patterns, not claims that demand is rising or falling.

A ranking value is a retrieval aid, not a probability of hiring. Do not show a misleading fit percentage. Eligibility requirements are quoted from the source and checked by the user; unknown eligibility stays unknown.

## Prioritized backlog

| Priority | Deliverable | Acceptance gate |
| --- | --- | --- |
| P0 / 1 | Freeze contracts, synthetic fixtures, allowlisted source | Five synthetic résumé cases and reviewed catalog fixtures exercise success, missing data, and no matches |
| P0 / 2 | Auth0 + database + ownership | Login/logout work; two users cannot access each other's records |
| P0 / 3 | Résumé extraction and review | Skills/education/experience validated; excerpts resolve; user corrections persist |
| P0 / 4 | Static catalog import from two selected sources | Versioned snapshot, reviewed requirement excerpts, repeatable seed without duplicates; missing requirements stay unavailable |
| P0 / 5 | Field patterns and career-building guidance | Deduplicated reviewed requirements, explicit sample/unknown counts, evidence-grounded actions; corrections invalidate guidance; role retrieval supports the plan |
| P0 / 6 | Next steps + inclusion resources | Three bounded actions; each factual resource claim has a checked source |
| P0 / 7 | Anonymous sample demo and connected integration checks | No sign-in for supplied samples; M2 verifies authenticated service boundaries using synthetic test data |
| P0 / 8 | Personal-résumé career guidance release | User uploads their own résumé; reviewed listing patterns drive next actions; M3 privacy/lifecycle gates pass before real input |
| P1 | Backboard coach | Separate user assistants; continued conversation; explicit memory opt-in and deletion |
| P2 | Automated catalog refresh, scheduled worker, Discord bot, richer resource curation | Separate follow-up PRs after the core flow is reliable |

See the [delivery roadmap](../roadmap.md) for current status, work ownership and milestone gates.

## Demo script and pitch

Three-minute story: open the no-sign-in demo, choose a supplied synthetic résumé, review and correct its evidence, and choose a career path. Show a recurring requirement across reviewed listings, clarify missing experience, and select a concrete project or skill action. Open a relevant sourced organization or mentorship resource and explain the next step. An individual role can illustrate the requirement, but browsing vacancies is not the demo's main outcome. Label fixture/cached results and unavailable features. Explain that real users sign in and upload their own résumés to build and revisit a personal plan.

Pitch: “EmployHER helps you build your next career step. It connects your experience with what employers seek, then helps you choose the projects, skills and communities that can strengthen your career.”

## Decisions and non-goals

One web app, one database, two allowlisted job sources with a reviewed static snapshot for the MVP, a small corpus, and bounded model calls. Normal login is required for saved personal state. Backboard remains in the chosen architecture but its outage must not block matching. Demo fixtures may be used while real-data gates remain closed.

The app currently contains synthetic profile and Opportunities slices; integrated MVP acceptance remains pending. No automated applications, outreach, employer quality scores, gender inference, hiring guarantees, unrestricted scraping, agent swarm, agent-to-agent auth, payments, blockchain, OCR, or mentor marketplace. A full four-week curriculum is deferred in favor of three concrete next steps.

## Delivery and acceptance

The single [delivery roadmap](../roadmap.md) owns implementation ordering, A/B/C responsibilities, current status and milestone acceptance checklists. This document owns product scope and the prioritized backlog; the [user story](user-story.md), [API](api.md), [data model](data-model.md) and [privacy requirements](privacy.md) define the supporting behavior and contracts.

Product acceptance requires the personal-résumé journey with authentication, storage and providers, plus a separate anonymous sample demo. Test the connected service boundaries with synthetic résumés before enabling real inputs; synthetic-only integration is an intermediate milestone, not the product finish line. Use a reviewed static catalog. Target at least 15 reviewed tech roles across internship/new-grad tracks and three sourced support resources. Titles/icons cannot ground skill gaps; missing requirements remain unavailable. Source freshness alone does not prove a vacancy is open. Learning actions must never prevent a user from applying.

Keep real résumé intake disabled until the roadmap's personal-data release gates and applicable [development checks](development.md#verification-gates) pass. Optional coaching and later automated refresh require their own applicable checks. The [Developer B execution plan](plans/developer-b-opportunities.md) supplies track-specific detail; current ordering comes from the delivery roadmap.

## Shared resource-research cache (proposed, post-MVP-static feature)

To avoid re-researching the same learning/certification question for every student, a shared research cache can back path-checkpoint recommendations (certificates, courses, communities) beyond the MVP static seed set. This is separate from per-user Backboard coaching memory and holds no résumé content or personal search history.

- **Key**: normalized `(subdomain, resource query, locale)` — e.g. `("cloud-infrastructure", "cloud deployment certificate", "en-US")`.
- **Value**: candidate resource(s) with source URL, checked date, an expiry/refresh interval, and a review status (`pending` / `reviewed` / `rejected`).
- **Cache miss** queues a bounded research pass — it does not trigger a live, unreviewed answer shown directly to the user. Gemini/Backboard may assist the research pass, but the raw result stays in the cache as unreviewed until a review step promotes it.
- **Backboard is not the authority for factual truth.** It may hold the reusable research/candidate data with its source metadata; the application database is authoritative for what's actually shown — it records the reviewed resource's ID and version, not Backboard's raw cache entry.
- **Refresh before stale reuse**: an entry past its expiry is re-checked before being served again, not served silently stale.
- This feature is explicitly deferred past the MVP's static seed set (see the delivery roadmap) — implementation needs its own retrieval/refresh contract and verification of Backboard retrieval, updates and isolation before building.

## Future Discord integration

A bot could offer `/opportunities`, `/next-step`, and `/coach` using the same authorized backend. Link Discord to an existing Auth0 account using a short-lived, single-use confirmation flow. Use minimal bot permissions and verify platform request signatures. Keep résumé content and personal recommendations out of public channels; use ephemeral responses or direct users to the authenticated web app. Obtain separate notification consent, support unlink/delete, and keep bot credentials server-side. No bot token or Discord API is needed for the MVP.
