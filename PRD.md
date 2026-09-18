# Career Roadmap & Mentor Match — MVP PRD

Status: Proposed scope for implementation; no application has been built or tested.
Date: 2026-09-18
Authors: Codex and Claude, coordinated through Talking Stick
Working title only; branding is undecided.

## 1. Product outcome

Help an early-career learner turn a career goal into a realistic learning plan grounded in a target job description, then identify mentors who can help with the specific gaps in that plan.

The core journey is **resume + goal + target job → evidence review → confirmed gaps → four-week learning plan → relevant mentor + outreach draft → progress**.

The original concept calls for Gemini to compare resumes with job descriptions, generate a personalized curriculum, and draft mentor icebreakers. It proposes Google Cloud hosting, Cloud Storage for resume PDFs and profile images, and Firestore for profiles, matches, and progress. This MVP preserves those outcomes while deferring profile images and a full mentorship marketplace. The operator has since specified Ruby on Rails as the application framework; section 7 records the resulting architecture, including where it departs from the concept's original datastore suggestion.

## 2. Audience, problem, and assumptions

Initial audience assumption: students and early-career job seekers pursuing an entry-level technical role. A women-in-tech pilot fits the supplied HackHers context, but audience restriction is not a confirmed requirement.

The user has disconnected inputs: a resume, a desired role, job requirements, learning resources, and potential mentors. They need to know what to work on next, what evidence to produce, and whom to ask for help.

Assumptions for this draft:

- Four weeks is a planning horizon, not a promise of job readiness.
- User selects 1–20 available learning hours per week; default is five.
- The operator has confirmed there is no deadline, a team of three including themselves, and an agentic build workflow. Build phases below are dependency order, not calendar commitments, and no phase assumes a fixed date.
- The demo uses synthetic data. Real users and real mentors require the pilot gates below.
- A job description defines the comparison target; the model does not invent a role standard from a title.

## 3. Scope and release modes

| Capability | Full-concept MVP requirement |
| --- | --- |
| Career goal | Goal statement, target role, and weekly time budget |
| Target requirements | Pasted job description or one of three authored, labeled sample descriptions |
| Resume input | Pilot: selectable text paste or text-based PDF; public demo: fixture selection only |
| Evidence review | Requirement quotes, resume evidence where present, and editable user confirmation |
| Learning roadmap | Up to three priority gaps (product cap applied before the hours budget), four weeks, concrete artifacts, dependencies, hours, editable tasks |
| Mentor matching | Top three qualifying profiles with gap-specific explanations; honest empty state |
| Icebreaker | Editable draft for the selected mentor and gap; copy action, no sending |
| Progress | Saved task status and roadmap version within the current anonymous session identity |

**Public demo:** synthetic resume/JD fixtures and synthetic mentors; prominent sample labels on input, result, and each mentor card. Do not accept arbitrary resume uploads, pasted personal resumes, or free-text personal goals in public demo mode. Samples have no fabricated contact details or booking actions. Outreach is labeled a sample draft.

**Private pilot:** enables real resume text/PDF and goal text only after data-handling gates pass. Uses opted-in mentor profiles with permission to display their information. A lack of mentor supply must produce an empty state, never synthetic profiles masquerading as real matches.

**Core-only fallback:** gap review and roadmap may be demoed if later features are incomplete, but must be presented as partial implementation. Mentor matching and icebreakers remain required to claim the full-concept MVP is complete.

Out of scope: automated outreach, scraping profiles, payments, scheduling, video calls, mentor onboarding portal, employer recruiting, profile-image uploads, live job ingestion, OCR for scanned resumes, complete course generation, job-fit scores, salary predictions, or hiring guarantees.

## 4. User journey and screens

1. **Start:** choose demo or eligible private-pilot mode. Explain what is processed and retained. Offer a complete sample journey without registration.
2. **Inputs:** select/paste a resume, enter career goal and weekly hours, and paste/select a target JD. Samples include junior frontend, backend, and data analyst descriptions, clearly identified as authored examples rather than current vacancies.
3. **Review evidence:** display each extracted job requirement alongside an exact JD quote and the resume evidence, if any. Use statuses `evidenced`, `needs_confirmation`, and `not_evidenced`. Display “Not shown on your resume does not mean you lack this skill.”
4. **Confirm priorities:** user marks a skill as already possessed, still learning, or a priority to develop. Claimed experience is labeled user-reported; it does not become resume evidence. Already-possessed skills leave the gap queue. Confirm the final priority list before generating a plan.
5. **Roadmap:** show weekly hours, prerequisite order, deliverables, and completion criteria. User can edit task title, hours, order, and status or remove a task. If the hours cannot cover the selected gaps, show deferred gaps and ask the user to adjust scope or time.
6. **Mentors:** explain which selected gap each mentor can support. Offer an editable icebreaker based on the chosen goal and task. Copy is the terminal outreach action.
7. **Progress:** mark tasks not started, in progress, or done. Preserve edits and completed work across refreshes. Explicit regeneration creates a new plan version; it must not silently overwrite progress.

Example: a sample JD requires SQL window functions, while the resume mentions only introductory SQL. The user confirms the gap. A task asks them to write and explain three window-function queries against a sample dataset, produces a repository artifact, and suggests a sample mentor whose listed skills include SQL.

## 5. Functional requirements and acceptance criteria

| ID | Requirement | Observable acceptance |
| --- | --- | --- |
| F1 | Validate inputs | Goal and JD required; 1–20 hours/week; pilot PDF ≤5 MB and ≤5 pages; text/JD ≤20,000 characters each. Empty, encrypted, scanned, malformed, or oversized PDFs show a useful error and offer text paste. No OCR claim. |
| F2 | Extract grounded requirements | Every displayed requirement includes an exact source quote and source offsets. The quote must occur in the supplied JD. Invalid citations are rejected before display. |
| F3 | Represent uncertainty | Resume evidence is an actual source span or null. Missing evidence is never described as proof of inability. Ambiguous equivalence goes to confirmation. |
| F4 | Allow correction | A user can change skill status and priority before plan generation; subsequent ranking and mentor matching use the confirmed state. |
| F5 | Prioritize transparently | Explicit must-have JD requirements precede preferred requirements; prerequisites precede dependent tasks; user priorities are visible overrides. Missing must/preferred language remains unspecified. No opaque job-fit percentage. |
| F6 | Produce feasible work | Each task has one primary gap ID, an actionable title, hours, week, dependencies, deliverable, and completion check. Each week's total fits the user's budget. Every selected gap is covered or explicitly deferred, distinguishing gaps deferred by the three-gap product cap from gaps deferred because the weekly hours budget cannot cover them. |
| F7 | Explain mentor recommendations | Rank by the highest user-assigned gap priority the mentor matches, then by count of matching prioritized skill tags, then compatible availability when supplied, then stable ID. A mentor matching several low-priority gaps must not outrank one matching the user's top-priority gap. Exclude unavailable/non-opted-in real profiles. Return at most three profiles with ≥1 gap match; never fabricate expertise or availability. |
| F8 | Draft accurate outreach | Draft names the selected gap and a concrete request, references only supplied profile facts, and never includes contact details or private resume history in the MVP. User can edit/copy; nothing is sent. |
| F9 | Persist progress safely | Refresh restores the same anonymous user's current plan and statuses. Another identity cannot read or write it. Clearing the browser identity may lose access; the UI explains this limitation. Account linking is deferred. |
| F10 | Recover gracefully | Show processing status and failure reason. Preserve user inputs during recoverable failures. Allow one explicit retry; do not create duplicate plans from double submission. If extraction yields zero grounded requirements, including when the pasted text is valid prose but not a job description, show an explicit empty state naming the likely cause and offering a sample description, rather than generating a plan from nothing. |

Resource suggestions are optional. Only curated, verified links may be shown; otherwise provide a resource topic/search phrase. Watching a course alone is not a roadmap deliverable.

## 6. AI contract and failure behavior

Use Gemini server-side for extraction/comparison, roadmap drafting, and icebreaker drafting. Mentor filtering/ranking, hour totals, authorization, and citation checks are deterministic application logic.

Minimum structured contracts:

```text
Requirement { id, skill, importance: required|preferred|unspecified,
  jdEvidence: { quote, start, end },
  resumeEvidence: { quote, start, end }|null,
  status: evidenced|needs_confirmation|not_evidenced, rationale }
ConfirmedGap { id, requirementId, userStatus, priority, userEvidence? }
RoadmapTask { id, primaryGapId, week: 1..4, title, hours,
  dependencyTaskIds[], deliverable, completionCheck, resourceId? }
OutreachDraft { mentorId, gapId, text }
```

Validate required fields, enum values, source spans, foreign-key references, finite positive hours, weekly totals, and acyclic dependencies. Treat model output as untrusted data. Retry schema/grounding failure once; if still invalid, show a recoverable error and no factual gap claims from the invalid output. Set an overall generation timeout and bounded retries; initial design budget is 60 seconds.

Generation must not run as in-process async work. On request-based billing Cloud Run disables or severely limits CPU outside a request, so a job started in the web process is not guaranteed to finish after the response is sent. Use one durable execution model and only one: a Cloud Tasks queue dispatching to an authenticated, owner-scoped Cloud Run endpoint that invokes the generation service. Cloud Tasks is then the single retry authority, and the handler must be idempotent, keyed on the analysis ID, so a redelivered task cannot produce a duplicate plan. Do not also configure a second background backend such as Solid Queue for this path; two queues means two independent retry budgets and no single owner of correctness. A Solid Queue worker on an always-allocated-CPU service is a valid alternative, but it is a choice between the two, not an addition, and it carries continuous worker cost against the spend cap. The client polls for status; F10's processing display reports that real state. Never silently replace a failed live run with a sample result.

Resume and JD contents are data, not instructions. Give the model no tools or browsing capability for these steps. Do not execute embedded commands or follow document instructions. Render generated content as escaped text; validate any curated URLs separately. Version prompts and model configuration with every analysis for reproducibility.

## 7. Proposed architecture and data

These are design choices, not verified deployment claims. Confirm supported gem, SDK, and model versions and deployment settings during implementation.

The application framework is **Ruby on Rails**, set by the operator. Rails supplies the request layer, ActiveRecord persistence, ActiveStorage file handling, ActiveJob background processing, and encrypted signed sessions; the sections below record how each cloud dependency maps onto it.

- **Cloud Run:** containerized Rails application and authenticated backend endpoints; server-side Gemini calls and PDF extraction. Recent Rails versions generate a production Dockerfile; confirm for the version actually used. No change to the hosting choice follows from the framework decision.
- **Rails encrypted signed session:** creates a per-browser identity for ownership without requiring email registration, replacing the managed anonymous-auth service. Same ownership semantics and the same browser-only recovery limitation already disclosed in F9, with one less external dependency. Rate-limit generation and impose a per-session quota (initially five analyses/day) plus a global spend limit. The per-browser quota deters casual overuse but is not a security control, since a user can reset the browser identity; the global spend limit is the actual enforcement boundary.
- **Cloud Storage via ActiveStorage:** private temporary PDF objects scoped by owner ID; short-lived authorized upload and download access only. Do not expose public object URLs. ActiveStorage's GCS service covers this directly, and its purge path serves the delete-after-extraction policy in section 8.
- **Cloud SQL for PostgreSQL via ActiveRecord:** owner-scoped structured profiles, analysis metadata, confirmed gaps, versioned roadmaps, progress, and mentor-match references. Curated mentor records are read-only for learners. This replaces the concept's Firestore suggestion. The records below are already relational — Roadmap references an analysis, Progress references a roadmap version and task, Match references a mentor and gap IDs — and section 6 requires foreign-key reference validation, so a relational store enforces with constraints and cascading deletes what would otherwise be hand-checked in application code. Rails without ActiveRecord also forfeits migrations, validations, and associations, which is most of the framework's value. Keeping Firestore behind the `google-cloud-firestore` gem remains possible if the operator prefers it; the cost is that trade.
- **Gemini API from Ruby:** configured from Rails encrypted credentials or Secret Manager; minimize submitted fields and choose data handling appropriate for pilot resume content before enabling that mode. Plan of record is a thin server-side REST client rather than a vendor SDK: Ruby has no official Google-supported Gemini SDK at the maturity of the Python and Node clients as far as this draft is aware, and that must be re-checked at implementation time. Section 6 already requires us to own schema validation and bounded retry regardless of which client is used, so the work is the same either way.

Logical records:

| Record | Key fields |
| --- | --- |
| Profile | ownerId, goal, weeklyHours, confirmedSkills, createdAt, expiresAt |
| Analysis | ownerId, inputHash, promptVersion, modelConfig, requirements, status |
| Roadmap | ownerId, analysisId, version, tasks, deferredGapIds, createdAt |
| Progress | ownerId, roadmapVersion, taskId, status, updatedAt |
| Mentor | id, displayName, skillTags, role, availability, sampleFlag, consentReference |
| Match | ownerId, roadmapVersion, mentorId, matchedGapIds, explanation |

Full raw resumes and full raw text are not persisted in the database. Minimal supporting resume excerpts remain sensitive structured data and follow the same retention policy as profiles. JDs and source text needed for validation exist only during processing; retain only cited requirement excerpts afterward. Outreach drafts may remain local until copied rather than adding another retained record.

## 8. Privacy and private-pilot gates

Public demos must use fixtures so judges and visitors do not accidentally submit real resumes. Pilot entry explains the processing purpose, that content is sent to the selected Gemini service, storage duration, deletion behavior, and the user's choices before upload.

Before real uploads are enabled, the implementer must verify and document the exact Gemini service/tier/configuration's data use and retention terms. Do not promise “no training” or zero provider retention without verifying that it applies. Application deletion does not imply immediate deletion from provider logs or backups; disclose any applicable limits.

Application policy for pilot:

- Delete raw PDF and extracted full text immediately after successful analysis or terminal failure. A cleanup job removes abandoned uploads within 24 hours; no real-data pilot without that job.
- Structured profiles, excerpts, analyses, plans, and progress expire 30 days after creation. No automatic extension unless the product later introduces an explicit policy.
- “Delete my data” removes owned application records and storage objects; make them inaccessible immediately and complete application deletion within 24 hours. Show completion/failure status and retry failures. Document backup retention separately before launch.
- Authorization covers every read, write, delete, and upload. Test cross-user access denial, including direct object access. ActiveStorage's default signed routes grant bearer access to whoever holds the URL, which is not owner authorization; serve resume files through authenticated owner-scoped controllers instead of relying on those routes. Disable ActiveStorage preview and analysis jobs for temporary resume uploads, so deletion scope and queue surface stay no wider than intended.
- Never log raw resume/JD bodies, sensitive excerpts, or generated outreach. Log request IDs, timing, validation failures, and model versions.
- Mentor content for a real pilot requires documented permission and a removal path. Product owner recruits at least three opted-in mentors before presenting a populated live directory. Synthetic profiles remain a separate demo dataset.

## 9. Success measures and verification plan

All targets below are proposed acceptance gates, not achieved results. These checks apply to the built application; writing this PRD does not satisfy them.

| Measure | Proposed check |
| --- | --- |
| Grounding | Five synthetic or redacted, hand-labeled resume/JD pairs; 100% of displayed requirement citations resolve to the supplied JD and zero invented requirements are displayed. Human reviewer also checks whether the quote supports the claimed skill. |
| Coverage | At least 90% of hand-labeled explicit must-have skill requirements are extracted across fixtures; inspect misses rather than hiding them. This small set is smoke coverage, not a general accuracy claim. |
| Plan integrity | All task gap IDs valid, no dependency cycles, every selected gap covered/deferred, every weekly total within budget, and every task has an inspectable artifact/check. |
| Demo speed | Provisional p95 ≤30 seconds for evidence review plus roadmap generation over 20 warm runs distributed across five fixtures. Report cold-start timing separately; re-scope if target is missed. |
| User value | Five representative testers: at least four can explain their next task and why it matters without facilitation. Collect usefulness rating and reasons for edits/deletions; edit rate alone is not a success metric. |
| Mentor integrity | Every recommendation has a supported shared skill; sample labeling always visible; zero-result and no-availability cases handled; no synthetic contact action. |
| Progress | Complete/edit tasks, refresh, verify persistence; regenerate explicitly, verify old version retained and no silent progress loss. |
| Resilience | Malformed PDF, scanned PDF, unsupported format, model timeout, invalid JSON, prompt injection, duplicate submit, empty mentor results, and storage cleanup failure have explicit test cases. |
| Access and deletion | Two identities cannot cross-access records/objects; deletion and expiration remove the intended data and preserve other users' records. Required before private pilot. |

No claims about job placement, increased salary, mentor response rate, or improved long-term learning outcomes at this stage.

## 10. Delivery sequence and demonstration

1. **Foundations:** fixture datasets, authored sample JDs, synthetic mentor profiles, app shell, identity/ownership, structured contracts, and hand-labeled evaluation cases.
2. **Core evidence flow:** parse pilot text/PDF behind a disabled-by-default gate; run fixture extraction, citations, user correction, and gap prioritization.
3. **Learning plan:** generate and validate tasks, edit/save plans, persist progress, and verify budget/dependency invariants.
4. **Mentor preview:** deterministic matching, reasons, sample labels, editable icebreakers, and empty states. Feature flags isolate partial work but do not redefine full MVP completion.
5. **Demo hardening:** run acceptance suite, review latency and generation costs, and rehearse the fixture story. Consider a warm Cloud Run instance for the demo window only after checking cost and supported deployment settings.
6. **Private-pilot gate:** verify provider terms, consent, authorization, deletion, cleanup, and real mentor provenance before enabling real input.

Suggested demonstration: choose a synthetic learner and target job; show a cited requirement; correct one inferred gap; generate a time-bounded plan; mark a deliverable complete; show a matching sample mentor and an editable sample message. Explain what is live generation, what is fixture data, and which pilot gates remain.

## 11. Team split for three developers

The operator confirmed a team of three, including themselves. The split below assigns each developer a vertical slice with an owned data contract, so the three can work in parallel without editing the same files. Names are unassigned; A, B, and C are roles.

**Precondition, and the single most important sequencing decision:** freeze the structured contracts in section 6 (`Requirement`, `ConfirmedGap`, `RoadmapTask`, `OutreachDraft`) and the fixture set before parallel work begins. Every track below consumes or produces one of those shapes. If the contracts are still moving, the three tracks serialize and the parallelism is lost.

| Track | Owner | Requirements owned | Produces | Consumes |
| --- | --- | --- | --- | --- |
| A — Evidence and AI contract | Dev A | F1, F2, F3, F10; section 6 in full | `Requirement[]` with validated spans | Raw resume text/PDF, JD text |
| B — Plan, progress, and data model | Dev B | F4, F5, F6, F9 | `ConfirmedGap[]`, `RoadmapTask[]`, versioned progress | `Requirement[]` |
| C — Mentors, demo surface, and platform | Dev C | F7, F8; sections 7 and 8 operational work | Matches, `OutreachDraft`, deployed app | `ConfirmedGap[]` |

**Track A — evidence and AI contract.** Text and text-based PDF extraction, Gemini requirement extraction, citation and span validation, the three-state evidence model, schema validation with bounded retry, prompt and model-config versioning, and injection hardening. This track owns the product's core defensibility: if citations do not resolve, nothing downstream is trustworthy. A also owns the hand-labeled evaluation set, because that team defines extraction ground truth.

**Track B — plan, progress, and data model.** Gap confirmation and priority UI, transparent prioritization, roadmap generation plus the deterministic validators (weekly hours within budget, acyclic dependencies, every gap covered or explicitly deferred with the cap and budget causes distinguished), task editing, roadmap versioning, and progress persistence. The validators are deterministic application logic, not model output, so B can build and test them against fixture `Requirement[]` before A's extraction is finished.

**Track C — mentors, demo surface, and platform.** Synthetic mentor dataset and sample labeling, deterministic matching and ranking, icebreaker drafting, empty and no-availability states, the demo/pilot mode switch, session identity and ownership rules, Cloud Run deployment, quotas and the global spend cap, the abandoned-upload cleanup job, and cross-identity authorization tests. C is the least coupled track and can start immediately against an agreed `ConfirmedGap` shape.

**One Rails-specific caution.** A single Rails application collides far more than three separate services would, because the three tracks share `db/`, `config/`, and the route table. Namespace the domain logic under `app/services/extraction` (A), `app/services/planning` (B), and `app/services/mentors` (C), keep each track's routes in its own drawn file, and route every schema change through B. Track ownership of requirements does not change; this is purely about keeping three developers out of the same files.

**Critical path is A then B.** C runs parallel to both. If a track slips, C's mentor preview is the only one that can be feature-flagged off for an interim demo, and doing so means presenting partial implementation rather than the full concept.

**Shared boundaries that need one owner each, to avoid merge collisions:** the contract definitions and fixtures (A), the ActiveRecord schema and every migration (B, with C reviewing the ownership and authorization model), and the deployment configuration and credentials (C). Migrations need a single owner because `db/schema.rb` is the classic three-developer Rails merge conflict. Any change to a frozen contract is a three-way decision, not a unilateral edit.

**Integration checkpoints.** Integrate when A can emit a validated `Requirement[]` for all five fixtures; again when B can turn that into a validated roadmap with progress surviving a refresh; again when C can rank mentors from real `ConfirmedGap[]` and render labeled samples. The acceptance suite in section 9 is the final gate and belongs to whoever is not the author of the code under test.

## 12. Risks, owners, and unresolved decisions

Owners are roles mapped to the three-developer split above, not assumed named commitments.

| Risk or decision | Owner | Default / resolution |
| --- | --- | --- |
| Audience and career focus | Product owner | Early-career technical learner; confirm before tailoring language |
| Deadline and team capacity | Product owner | Operator confirmed no deadline, a team of three, and an agentic build workflow; use the phase ordering and the three-track split above |
| Mentor supply | Product owner | Synthetic demo only; real pilot needs opted-in supply |
| Hallucinated gaps and weak evidence | AI/backend implementer + reviewer | Citations, deterministic validation, human-confirmed gaps, fixture evaluation |
| PDF complexity | Backend implementer | Text-based PDFs only and equal-status text input for pilot |
| Unrealistic plan estimates | Product/AI implementer | User-editable hours, explicit deferral, no proficiency guarantees |
| Provider processing terms and deletion | Deployment owner | Document chosen settings/terms and test gates before real data |
| Datastore substitution | Product owner | **Proposed decision, not operator-instructed.** Cloud SQL Postgres with ActiveRecord replaces the concept's Firestore; rationale in section 7. Operator may override back to Firestore, accepting the loss of ActiveRecord |
| Ruby Gemini client | Deployment owner + Dev A | No official Ruby SDK is listed by the vendor; plan of record is a thin REST client with our own schema validation and bounded retry. Re-check at implementation |
| Background execution model | Deployment owner | Cloud Tasks to an authenticated Cloud Run endpoint, chosen over an always-on Solid Queue worker on cost grounds. Pick exactly one |
| Latency and cost | Deployment owner | Quotas, bounded retries, measured timing, spend cap |
| Browser identity recovery | Product owner | Disclose limitation; defer account linking unless pilot requires it |
| Mentor pillar importance | Product owner | Keep required preview; change emphasis if operator prioritizes live mentorship |

These are implementation decisions and pilot dependencies, not blockers to completing this PRD.

## 13. Competitive context and completion definition

Prior research reviewed all 15 listings in the [HackHers GSU gallery](https://hackhers-gsu.devpost.com/project-gallery). No exact match for the combined workflow was found in those descriptions. PitchHer was the closest career-development listing, describing mock interviews and AI feedback. Some individual detail pages were unavailable, so this is incomplete detail-page coverage and not a global originality claim.

The intended distinction is traceability: **job requirement → confirmed gap → tangible learning artifact → mentor qualified for that gap**. Cloud hosting and model choice support that experience; they are not themselves product differentiation.

The full-concept demo MVP is complete only when F1–F10's applicable demo behaviors and demo verification gates pass, mentor/icebreaker preview works, fixture labeling is visible, and unimplemented pilot features are disclosed. Real-input behaviors in F1 and security/deletion checks are additional private-pilot release requirements.

PRD completion requires independent author/reviewer agreement on scope, consistency, acceptance criteria, and unresolved assumptions. Application verification remains future work.
