# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

A minimal Next.js/TypeScript app runs directly on Node 24. Docker and a local database are not required. Product routes, provider integrations, and domain migrations remain planned. See `AGENTS.md` and `docs/development.md` for runnable commands and verification limits.

## Where to start reading

- `README.md` — entry point and index of the documents below.
- Read the decisions. One numbered file each in docs/decisions/ (NNN-short-slug.md). No index — search it: grep -ril <topic> docs/decisions/. Read every decision touching what you are about to change.
- Read the roadmap. roadmap.md gives the phase, what has landed, what is deferred, and what is a release blocker. §9 is the current priority order.
- `docs/product.md` — scope, screens, prioritized backlog, demo script, explicit non-goals.
- `docs/architecture.md` — data flow, provider boundaries, ingestion contract, execution/failure handling.
- `docs/data-model.md` — proposed relational schema (PostgreSQL/Drizzle), ownership patterns.
- `docs/api.md` — proposed route contracts, shared TypeScript shapes, error codes, idempotency rules.
- `docs/privacy.md` — retention, deletion, and inclusion-content rules (no gender inference, sourced claims only).
- `docs/development.md` — local Node setup, env var inventory, checks, verification gates.
- `TECH-STACK.md` — the chosen stack table.

## Product architecture (spans multiple docs)

EmployHER is a career-building app: a user uploads their own résumé, reviews extracted evidence, chooses a field, and receives grounded projects, skills and organization/mentorship suggestions based on recurring requirements across reviewed listings. Individual vacancies are supporting context, not the primary outcome. An optional supplied-sample demo works without sign-in; personal uploads and saved private state use authenticated routes. See [decision 004](docs/decisions/004-career-building-and-anonymous-demo.md).

Planned flow, synthesized across `architecture.md`, `data-model.md`, and `api.md`:

```
Browser → no-sign-in supplied-sample demo → isolated sample state
Browser → Auth0 login → personal résumé flow → Next.js on localhost
                           ├─ Zod validation + ownership + quota checks
                           ├─ Drizzle + pg → Tiger Data PostgreSQL / pgvector
                           ├─ Gemini: extraction, embeddings, gap analysis
                           └─ Backboard: per-user coaching assistant/threads
GitHub source repos → Octokit fetch → normalized roles + source evidence → Gemini embeddings → database
```

Key architectural boundaries a future implementer must preserve:

- **Auth0 authenticates personal use; every private route re-checks ownership.** Anonymous sample tokens cannot authorize personal uploads or private data. Never trust a client-submitted user ID — resolve it from the validated session on the server.
- **Tiger Data (Postgres) is the source of truth.** Gemini only *suggests* structured facts/embeddings/explanations; deterministic validation and explicit user confirmation govern what gets persisted. Backboard owns conversational continuity only — never authoritative skills, eligibility, or match state.
- **No raw résumé storage.** Parse and discard raw PDF/text within a bounded request (`finally`-block cleanup). A structured draft profile (with minimal excerpts) may be persisted before confirmation, but user confirmation is required before it feeds matching.
- **Grounding is mandatory, not cosmetic.** A skill/requirement match needs a reviewed evidence excerpt from the actual job posting. Title- or category-inferred "skills" are not sufficient for a gap claim — render such roles as discovery candidates with requirements marked unavailable instead of fabricating an explanation. No invented employers, contact details, salary, or hiring-probability numbers; a ranking score is a retrieval aid, never a fit percentage.
- **No gender inference, ever.** Inclusion-resource visibility is purely an opt-in category filter; do not derive it from résumé text, names, or behavior. Every inclusion-resource claim needs a source URL, excerpt, and checked date.
- **Ingestion source**: the two GitHub-hosted community lists `SimplifyJobs/Summer2027-Internships` and `SimplifyJobs/New-Grad-Positions`. Their content is Markdown **and embedded HTML tables** (not JSON/an API) on the `dev` branch — ingestion must parse both table styles and pin an explicit ref/commit per run. File layout differs between the two repos (e.g. the internships repo has a separate `README-Inactive.md`; the new-grad repo uses an `archived/` directory instead) — discover each source's actual files rather than assuming a shared layout. Their legend icons (🛂 no sponsorship, 🇺🇸 US citizenship required, 🔒 closed, 🔥 FAANG+, 🎓 advanced degree) are structured eligibility signals worth parsing directly. Neither repo has a LICENSE file — reuse/redistribution terms are unverified and must be resolved before shipping a public demo; this is an open legal question, not something extracting structured fields resolves on its own. Only mark a role inactive after a *complete* successful snapshot — a failed/partial fetch must preserve the last good snapshot.
- **Idempotency and versioning matter throughout.** Résumé profiles, jobs, and matches are all versioned; expensive POSTs require an `Idempotency-Key` bound to user + operation + input digest; corrections/new versions invalidate cached matches.

## Workflow

Develop features on feature branches and open pull requests; never commit directly to `main` or `master`.

Do not push automatically. Keep changes and commits local unless the operator explicitly requests a push; permission to edit or commit is not permission to push.

Prefer stable npm versions published at least 7-14 days earlier. A newer release is allowed after documented security review of the exact version (advisories, publisher/provenance, release/changelog, install scripts, changed dependencies). Pin the reviewed version and commit the lockfile. Age or a clean audit alone does not prove safety; never use a known-compromised version.

## Shared-workspace note

This repository is sometimes edited by multiple coordinating agent sessions (Talking Stick). If you are in such a session, acquire a live writer turn before editing files, verify your change, and release with a concrete handoff — see `AGENTS.md`'s "Security & Agent Coordination" section.

Profile routes share root `app/` with Opportunities. See `docs/implementation/person-a.md` for synthetic boundaries and A/C integration requirements. `npm test` runs both tracks through `tsx`.
