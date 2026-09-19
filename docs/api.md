# API contracts

Person A's résumé endpoints now have executable contracts in `src/profile/contracts.ts`; see [profile handoff](implementation/person-a.md). Their implementation returns one `facts[]` list with a `kind` discriminator, not separate skill/experience/education arrays. The standalone runtime is a gated synthetic local harness; production requires C's Auth0 binding. Other routes below remain proposals.

All production routes below require an Auth0 session except the separately authenticated optional ingestion route. Provider credentials and IDs remain server-side. Zod validates request and response payloads; reject unknown mutation fields. UUIDs are opaque references, never authorization.

| Method / route | Input | Result |
| --- | --- | --- |
| `GET /api/me` | Session | User ID, consent state, preferences |
| `PATCH /api/me/preferences` | Validated locations, remote mode, role types, inclusion categories, memory opt-in | Updated preferences; invalidates affected recommendations |
| `POST /api/resumes` | Multipart PDF or JSON `{text}`; idempotency header | `201 {profileId, version, status:"draft", facts, embedding:null}` after bounded extraction |
| `GET /api/resumes/:id` | Owned profile ID | Reviewed structured profile, evidence, version |
| `PATCH /api/resumes/:id` | `{expectedVersion, corrections, confirm}` | New profile version; re-embed before matching; stale version returns 409 |
| `POST /api/matches` | `{profileId, profileVersion}` + idempotency header | `201 {matches:[Match], catalogCheckedAt}`; only confirmed current profile |
| `GET /api/matches` | Cursor and bounded limit | Owned cached matches with stale flag |
| `GET /api/jobs/:id` | Catalog job ID | Job, source, requirements, freshness, apply URL |
| `GET /api/resources` | Category, optional company/job ID, cursor | Reviewed documented resources and source dates |
| `POST /api/coach/threads` | Optional owned match ID | `201 {threadId}` (application ID) |
| `POST /api/coach/threads/:id/messages` | `{text}` + idempotency header | `{messageId, text, memoryEnabled}` after bounded response |
| `GET /api/coach/threads/:id` | Owned application thread ID | Authorized conversation view fetched through server adapter |
| `DELETE /api/coach/memory` | Explicit user request | `202 {deletionId, status:"pending"}`; disables memory immediately, deletes provider memory asynchronously |
| `DELETE /api/me/data` | Explicit user request | `202 {deletionId, status:"pending"}`; blocks access/new work immediately |
| `GET /api/deletions/:id` | Session-bound deletion ID | Pending/completed/failed cleanup status |
| `POST /api/internal/ingest` | Optional worker bearer token; no arbitrary repo URL | Run summary for configured allowlisted source only |

Login/callback/logout use the pinned Auth0 SDK routes; do not build custom password handling. M2M tokens cannot access normal user routes. Delete My Data retains authentication only for cleanup status; deleting the Auth0 account is a separate explicitly requested operation.

## Shared shapes

```ts
// Illustrative contracts, not installed TypeScript code.
type Evidence = { excerpt: string; source: "resume" | "user_reported" };
type Match = {
  id: string; jobId: string; profileVersion: number; jobVersion: number;
  strengths: { requirementId: string; evidence: Evidence }[];
  gaps: { requirementId: string; state: "not_evidenced" | "needs_confirmation"; reason: string }[];
  nextSteps: { requirementId: string; action: string; deliverable: string; resourceId?: string }[];
  sourceUrl: string; checkedAt: string; stale: boolean;
};
type ApiError = { error: { code: string; message: string; requestId: string; retryable: boolean } };
```

No arbitrary URLs from model output. Resource IDs must resolve to reviewed catalog records; every requirement ID must belong to the matched job. Exact source excerpts are validated before raw upload disposal. Maximum three next steps; coach messages capped at 4,000 characters; list limits capped at 50. Escape all generated text.

Use 400 for invalid input, 401 unauthenticated, 403 insufficient service scope, 404 absent/foreign private record, 409 stale version/idempotency conflict, 413 oversized upload, 415 unsupported file, 422 unreadable/no-evidence input, 429 quota, and 502/504 provider failure/timeout. Never return provider credentials or raw upstream errors. Empty matches return 200 with an empty array on reads, or 201 with an empty array after a completed creation.

Expensive POST requests require an `Idempotency-Key`. Bind it to authenticated user, operation, and input digest. A replay returns the stored result; in-flight requests return 409 with safe retry guidance. Provider timeouts with unknown outcome require reconciliation before repeating side effects, especially coaching/thread creation. Do not promise exactly-once external calls.

## Implemented synthetic Opportunities API

The local fixture workflow is isolated at `/api/demo/opportunities`; see [implementation and adapter contract](opportunities-implementation.md). Its anonymous demo cookie is not an Auth0 session, and the production routes above remain proposals. Exact command schemas live in `src/opportunities/contracts.ts`. Saved path/actions and explicit profile/checklist-versioned learning-gap confirmations live in server-side demo state; the A/C-backed production schema remains an integration gate.

## Career-guidance contracts to define

The personal product needs field-level requirement patterns and a career-building plan, not only per-job matches. These contracts are not yet implemented: R0 must agree path/cohort/filter scope, distinct reviewed requirement references, sample and unknown counts, snapshot dates, profile/catalog versions, personalized action rationale and invalidation. Organizations/resources keep their own checked sources; they are not inferred to be employer requirements. R1 implements the agreed endpoints/storage and the UI can show guidance without requiring a job-card selection.

The no-sign-in supplied-sample demo is separate from the authenticated personal APIs above. Demo credentials cannot authorize personal uploads or private account state; the same distinction applies when an authenticated integration test uses synthetic input. See [decision 004](decisions/004-career-building-and-anonymous-demo.md).

## Implemented integration primitives (not mounted private endpoints)

`src/opportunities/profile-bridge.ts` maps explicit skill labels from confirmed, unexpired profiles to guidance evidence. It retains fact IDs, source spans and unmapped facts; `data` aliases to `ml`. Only compatible, non-simulated 768-dimensional provider vectors pass the bridge. The chosen low-cost text model is `gemini-embedding-001`; the same model/configuration must embed both profiles and roles.

`aggregatePatterns()` groups reviewed requirement excerpts by skill across source-deduplicated filtered listings, returning sample/known/unknown counts, source references, all checked dates and catalog/checklist versions. `careerGuidance()` adds evidence and current learning-gap confirmations. The anonymous Opportunities view now displays these synthetic patterns. Private route/storage integration is still pending.

`validateExplanation()` requires a current context containing checklist version, confirmations and inclusion preferences for confirmed gaps and personalized learning steps. Omitted context fails closed. `PostgresOperations` stores profile writes and replay results in the same transaction via repository hooks; its connection/migration/runtime integration remains separately verified work.

### Authenticated career guidance (implemented, live acceptance pending)

`GET /api/career?profileId=<uuid>&profileVersion=<integer>` resolves the Auth0 owner,
loads the owned confirmed profile and active reviewed catalog, and returns the
saved plan, selected-path patterns, evidence references, up to ten supporting roles
and currently visible resources. Embedding vectors are not returned.

`POST /api/career` requires same-origin JSON and an `Idempotency-Key` header. Its
body contains `profileId`, `profileVersion`, `catalogVersion` and `command` (with
`expectedVersion`). Supported plan commands are `path`, `preferences`,
`confirm-gap`, `select-action`, and `action-state`; fixture profile/evidence/reset
commands are rejected. Stale profile/catalog/state versions fail explicitly.
The saved state and original replay result commit atomically. Read-time resource
expiry and opt-in checks apply when rendering a response.

This route requires platform initialization, migrations and an activated catalog.
It is separate from `/api/demo/*`; a sample cookie grants no private access.
Onboarding interest selection and the personal career UI remain integration work.

### Account interests (implemented)

Authenticated `GET /api/me/interests` returns `{version, fields}`. `PUT` accepts
`{expectedVersion, fields}` with a same-origin request, JSON body (2 KiB maximum)
and an idempotency key. Choose one to five distinct catalog field IDs: `software`,
`ml`, `product`, `quant`, `hardware`. Account ownership comes from Auth0, never the
body. Stale edits return 409; retries return the stored operation result.

`/onboarding` collects these choices after signup and allows later edits. Private
profile intake redirects there if choices are empty. Career reads, retrieval and
Gemini context use only selected fields. Interest versions fence late analysis
and plan writes; removing a field selects an available remaining field for reads
without rewriting the saved plan. Deletion clears account interests. Personal-data
retention acceptance and authenticated browser verification remain release work.

### Saving Gemini recommendations (implemented)

`POST /api/career` accepts a `select-recommendation` command with
`expectedVersion`, `contextHash` and a zero-based `index` (0–2). The server loads
its persisted analysis and validates current evidence/resource references before
saving; request bodies cannot supply recommendation prose or citations. Saved
actions preserve the model rationale and source IDs, share the three-active-action
limit, and support existing `action-state` completion/removal commands. Completion
does not create skill evidence. The analysis content hash includes actual context
and preferences, while plan versions still guard reads/commits, allowing unchanged
analysis to survive action-only changes without another Gemini call.
