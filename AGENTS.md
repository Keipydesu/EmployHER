# EmployHER — agent instructions

EmployHER connects evidence-based resume analysis, a personalized learning roadmap,
and relevant mentors. This is the standing brief for agents working in this repository.
`CLAUDE.md` is a relative symlink to this file; edit `AGENTS.md` only.

**Current state: documentation only. No Rails application, Gemfile, database, test
suite, CI workflow, or deployed application exists yet.** Conventions below guide
implementation; they are not a description of already-built software. Update this
status when the scaffold and verification actually land.

## Before planning or editing

1. Read relevant numbered records in [docs/decisions](docs/decisions). Search with
   `rg -n -i '<topic>' docs/decisions`. Distinguish accepted choices from proposals.
2. Read [PRD.md](PRD.md) for product behavior, F1–F10 acceptance criteria, privacy
   gates, and scope. Section 10 is the single home for the delivery sequence;
   section 11 defines the three-developer split. Do not duplicate the roadmap.
3. Read [TECH-STACK.md](TECH-STACK.md) for implementation choices and their status.
   Ruby on Rails is user-selected; PostgreSQL replacing Firestore is proposed.
4. Inspect the actual branch, working tree, and existing files. Preserve unrelated
   edits and never infer an installed dependency or completed feature from this brief.

## Stack and source of truth

Use the decision-status table in `TECH-STACK.md` rather than maintaining another
version list here. The proposed design is one Rails app with Hotwire, Active Record
on PostgreSQL, Cloud Run, private GCS through Active Storage, Cloud Tasks for queued
generation, and a server-side Gemini REST client. Anonymous browser ownership uses
a Rails encrypted session and server-side owned records. No user identity or
authorization may come from an untrusted request parameter.

Recheck official documentation when selecting versions and write chosen versions
to the actual dependency/configuration files. Do not provision cloud resources,
invent credentials, or switch infrastructure merely because a proposal exists.

## Commands and verification

The commands available today are documentation and Git checks:

```sh
git status --short
git diff --check
git diff --stat
rg --files
```

After scaffolding, record the commands that actually exist in `README.md`, including
setup, local server, database preparation, focused tests, full tests, lint, and
security checks. Rails commonly provides `bin/rails test` and
`bin/rails zeitwerk:check`; verify the generated files and test configuration before
using or documenting them. Do not claim `bin/ci`, `bin/rubocop`, seeding tasks, or a
model-map generator exists until it has been added and run successfully.

Documentation changes need link, consistency, and diff checks. Behavioral changes
need focused tests of the requirement, including failure and authorization cases;
run the applicable broader suite before handoff. Report exact checks and results,
including anything not run. Never present a planned PRD acceptance gate as passed.

## Architecture and team boundaries

- Controllers authenticate, authorize, validate input, and delegate. Models and
  database constraints enforce persisted invariants. Domain services own multi-step
  workflows; the task handler invokes those same services through a durable boundary.
- Dev A owns extraction and shared contracts/fixtures; Dev B owns planning, progress,
  and all migrations; Dev C owns mentors and platform integration. Full ownership
  mapping is in PRD section 11. Agree on contracts before independent work begins.
- Keep domain workflows under `app/services/extraction`, `app/services/planning`,
  and `app/services/mentors` when these directories are introduced. These are proposed
  paths, not an instruction to create empty abstractions.
- Route schema changes through Dev B and deployment/configuration changes through
  Dev C. Coordinate shared route/config edits. File ownership does not grant exclusive
  review authority or justify bypassing another agent's current write turn.
- Prefer conventional Rails associations, scopes, validations, and REST routes.
  Keep the Hotwire UI in the same application; do not add a separate SPA or extra
  service without a concrete requirement and a recorded architectural decision.

## Product and data invariants

- Every displayed skill requirement must resolve to evidence in the supplied JD.
  Resume evidence is a real span or null; absence of evidence is not absence of skill.
  User corrections are labeled user-reported and affect subsequent planning.
- Roadmap tasks trace to confirmed gaps, produce concrete deliverables, respect the
  time budget, and preserve prior versions/progress on explicit regeneration.
- Match explanations use actual mentor facts and confirmed gap priorities. Synthetic
  profiles always show sample labels. Outreach is an editable draft, never auto-sent.
- Treat all uploaded text and model output as untrusted data. Validate schemas,
  references, source spans, hours, and dependencies before showing claims. Model
  content cannot issue tool commands, change system instructions, or inject markup.
- Follow the queued-processing contract in PRD section 6: persisted generation
  requests, operation-specific idempotency, separate internal/transport retry budgets,
  bounded deadlines, owner checks, and safe handling of duplicate or late deliveries.
  Do not run work after an HTTP response and assume Cloud Run will keep it alive.
- Scope every read and write to the authenticated owner, including files and polling
  endpoints. Signed blob links are bearer access, not owner authorization. Worker
  service authentication does not replace resolving the owner from stored records.
- Preserve the demo/pilot distinction and the retention/deletion gates in PRD section
  8. Queue payloads and logs carry identifiers, not resume/JD contents. User deletion
  must prevent later callbacks from recreating deleted data.
- Never commit personal resumes, real contact details, credentials, Rails master keys,
  or local coordination state. Use synthetic fixtures. Review staged files before push;
  an ignore rule does not remove content already tracked by Git.

## Interface and testing principles

Make empty, processing, failed, confirmed, deferred, and completed states explicit.
Show controls only when the flow can fulfill them; describe unavailable pilot features
honestly. Reuse components and accessible labels. Evidence, sample labels, errors, and
privacy information must remain visible and usable without hover or color alone.

Map tests to F1–F10 and PRD section 9. Prioritize grounded extraction, user correction,
budget/dependency invariants, regeneration, priority-sensitive matching, cross-owner
isolation, retries, and deletion races. Mock model responses for deterministic tests;
use a separate bounded fixture evaluation for live-model quality. Do not call paid
APIs from ordinary unit tests. Browser behavior needs browser-level verification when
the harness exists; inspect actual results, not only generated summaries.

## Decisions, branches, and coordination

Write significant durable choices in `docs/decisions/NNN-short-slug.md`, with a title,
status, date, context, decision, and consequences. Preserve accepted records; supersede
them with a new numbered record when the choice changes. Proposals must not silently
become accepted decisions. Keep product behavior in the PRD and implementation detail
in the stack document; link rather than maintain competing copies.

Current explicit user instructions take precedence over older decisions. When a request
changes a recorded choice, identify the change and update the decision record. Ask only
if consequential ambiguity remains; do not re-request authorization already supplied.

`main` is the integration branch. Check the actual branch before starting. Use a focused
feature branch for application work; preserve other contributors' changes. Commit and
push within the user's authorized scope, review the exact diff, and never force-push or
rewrite shared history as routine cleanup.

When a Talking Stick room is active, follow its current skill/instructions: acquire the
write turn before any shared edits, generated output, build, or mutation; keep read-only
review independent; verify before handoff; and communicate findings and concrete next
steps. Do not spawn agents simply because this file describes three developer roles.
After a completed milestone, suggest the next applicable item from PRD section 10.

## Data-model map

No implemented models or generated map exist yet. The logical records in PRD sections
6–7 are design proposals, not Active Record reflection. After real models exist, a
reflection-based map and stale-map check can be introduced with tests and documented
commands. Never fabricate a generated model graph or copy one from another project.
