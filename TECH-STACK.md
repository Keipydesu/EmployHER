# EmployHER — Tech stack

Companion to [PRD.md](PRD.md). The PRD defines *what* the MVP does; this document records *what we build it with* and why. Status: proposed stack for implementation. Nothing here has been provisioned, installed, or run.

Ruby on Rails is an operator decision. Everything else below is a proposal by the implementing agents, and each row says so where it departs from the original concept.

## 1. Decisions at a glance

| Layer | Choice | Status |
| --- | --- | --- |
| Language / framework | Ruby on Rails | **Operator-instructed** |
| Hosting | Cloud Run, containerized | From original concept |
| Database | Cloud SQL for PostgreSQL via ActiveRecord | **Proposed substitution** for Firestore |
| File storage | Cloud Storage via ActiveStorage | From original concept |
| Background work | Cloud Tasks to an authenticated Cloud Run endpoint | Proposed |
| Model access | Gemini API over a thin REST client | From original concept; client approach proposed |
| Identity | Rails encrypted signed session, anonymous per browser | **Proposed substitution** for managed anonymous auth |
| Secrets | Rails encrypted credentials or Secret Manager | Proposed |
| Front end | Hotwire (Turbo + Stimulus) on the Rails default asset pipeline | Proposed |
| Tests | Rails default test framework, plus the PRD section 9 acceptance suite | Proposed |
| CI | GitHub Actions, in this repository | Proposed |

## 2. Why Postgres instead of Firestore

The original concept named Firestore. We propose replacing it, and the operator can override.

The PRD's logical records are already relational. A roadmap references an analysis; progress references a roadmap version and a task; a match references a mentor and a set of gap IDs. PRD section 6 requires foreign-key reference validation as a hard rule. A relational store enforces that with constraints and cascading deletes instead of hand-written application checks, and it makes the access-and-deletion gates in section 9 materially easier to prove.

Rails without ActiveRecord also gives up migrations, validations, and associations, which is most of what the framework is for. There is no mature ActiveRecord adapter for Firestore. Driving Firestore from the `google-cloud-firestore` gem remains possible if the operator prefers to keep the original choice; the cost is that trade, not a technical impossibility.

## 3. Background execution — pick exactly one

This is the stack's sharpest constraint and the easiest thing to get wrong.

On request-based billing, Cloud Run disables or severely limits CPU outside of a request ([Cloud Run general tips](https://docs.cloud.google.com/run/docs/tips/general)). A generation job started in the web process is therefore **not guaranteed to continue after the response is sent**. Any design that says "run it in ActiveJob and poll" without naming a durable backend is claiming reliability it does not have.

**Plan of record:** a Cloud Tasks queue dispatching to an authenticated, owner-scoped Cloud Run endpoint that invokes the generation service ([Cloud Tasks with Cloud Run](https://docs.cloud.google.com/run/docs/triggering/using-tasks)). Cloud Tasks owns retry. The handler must be idempotent, keyed on the analysis ID, so a redelivered task cannot create a duplicate plan. The client polls for status, which is what PRD F10's processing display reports.

**Valid alternative:** Solid Queue — the ActiveJob default from Rails 8 ([Active Job basics](https://guides.rubyonrails.org/active_job_basics.html)) — running on a worker service with CPU always allocated. This costs a continuously running instance, which is why it is the second choice against the PRD's spend cap.

These are alternatives, not layers. Configuring both produces two independent retry budgets and no single owner of correctness.

## 4. Files and the authorization trap

ActiveStorage supports Google Cloud Storage directly ([Active Storage overview](https://guides.rubyonrails.org/active_storage_overview.html)).

Two requirements that are easy to miss and that the PRD's privacy gates depend on:

- ActiveStorage's default signed routes grant **bearer access** to anyone holding the URL. That is not owner authorization. Serve resume files through authenticated, owner-scoped controllers instead.
- Disable preview and analysis jobs for temporary resume uploads. Otherwise deletion scope and background-queue surface grow wider than the retention policy in PRD section 8 describes.

Raw PDFs and extracted full text are deleted immediately after successful analysis or terminal failure; a cleanup job removes abandoned uploads within 24 hours.

## 5. Model access from Ruby

The vendor's library page lists official Gemini SDKs for Python, JS/TS, Go, Java, and C# — **no Ruby** ([Gemini API libraries](https://ai.google.dev/gemini-api/docs/libraries)). Re-check this at implementation time; it is the kind of fact that changes.

Plan of record is a thin server-side REST client. This costs less than it sounds: PRD section 6 already requires us to own structured-output schema validation, span verification, and bounded retry regardless of which client wraps the HTTP call. Model configuration and prompt version are recorded with every analysis for reproducibility.

Resume and job-description text are treated as data, never instructions. The model gets no tools and no browsing for these steps.

## 6. Repository and environment conventions

- One Rails application, not three services. Domain logic namespaced by track: `app/services/extraction` (Dev A), `app/services/planning` (Dev B), `app/services/mentors` (Dev C).
- `db/schema.rb` and every migration are owned by **Dev B alone**. This is the classic three-developer Rails merge conflict and it is avoided by ownership, not by care.
- Each track keeps its routes in its own drawn routes file.
- Secrets never enter the repository. `.gitignore` already excludes `.env` files.
- Demo mode ships fixture resumes and synthetic mentors only. Real uploads stay behind the pilot gates in PRD section 8.

## 7. Verify before relying on any version claim

This document deliberately avoids pinning versions. Rails, the Ruby runtime, the Cloud Run contract, and the Gemini API surface all move. At implementation time, confirm: the Rails version and whether it generates the production Dockerfile you expect; the ActiveJob default backend for that version; current Cloud Run CPU-allocation and billing behavior; and whether an official Ruby Gemini SDK now exists.

The linked pages above were checked against primary sources on 2026-09-18. Treat them as accurate on that date and no later.
