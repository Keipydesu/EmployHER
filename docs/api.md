# Proposed API contracts

All routes below require an Auth0 session except the separately authenticated optional ingestion route. Provider credentials and IDs remain server-side. Zod validates request and response payloads; reject unknown mutation fields. UUIDs are opaque references, never authorization.

| Method / route | Input | Result |
| --- | --- | --- |
| `GET /api/me` | Session | User ID, consent state, preferences |
| `PATCH /api/me/preferences` | Validated locations, remote mode, role types, inclusion categories, memory opt-in | Updated preferences; invalidates affected recommendations |
| `POST /api/resumes` | Multipart PDF or JSON `{text}`; idempotency header | `201 {profileId, version, status:"draft", skills, experience, education}` after bounded extraction |
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
