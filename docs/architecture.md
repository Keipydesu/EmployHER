# Architecture and data flow

```text
Browser → Auth0 login → Next.js on Vercel
                           ├─ Zod validation + ownership + quotas
                           ├─ Drizzle → Tiger Data PostgreSQL / pgvector
                           ├─ Gemini: extraction, embeddings, gap analysis
                           └─ Backboard: private coaching assistant / threads
Curated GitHub source → Octokit ingestion → normalized roles + source evidence
                                              └─ Gemini role embeddings → database
```

## Boundaries

Auth0 authenticates people; each backend route still checks ownership. Resolve a validated issuer/subject pair to an internal user ID. Never trust a submitted user ID. Protect cookie-authenticated mutations against CSRF and origin abuse.

Tiger Data is the source of truth. Gemini suggests structured facts, semantic representations, and explanations; deterministic validators and user confirmation govern what is stored. Backboard owns conversational continuity, not authoritative skills, eligibility, permissions, or match state. Use a separate assistant per user because assistant memory may span threads. Resolve provider IDs on the server.

## End-to-end flow

1. Verify the session, consent, upload size/type, and quotas. Proposed MVP upload cap: 2 MB, five pages, or 20,000 text characters. Treat these as application limits to validate against hosting limits.
2. Parse text locally on the server, discard contact details unnecessary for analysis, and ask Gemini for structured skills, experience, and education. Validate using Zod plus exact excerpt checks. Offer review; never silently invent missing fields.
3. Save a versioned structured profile with minimal excerpts. Do not persist the raw PDF/full text. Process within a bounded request, dispose of temporary bytes in a finally block, and require re-upload after failure. No durable raw-file workflow is proposed for this MVP.
4. The user confirms/corrects the profile. Embed the minimized skill/experience summary with a pinned Gemini embedding configuration.
5. Ingestion reads only the configured GitHub repository/path/ref. Parse into a normalized contract, validate source links, record commit SHA and retrieval time, and upsert by stable source key. Embed changed role content only.
6. Filter roles by explicit user criteria, then retrieve a small semantic candidate set. Compare structured requirements and send only needed evidence to Gemini for explanations and bounded next steps. Persist versioned matches.
7. Show source links, freshness, evidence, uncertainty, and documented resources. Confirmed edits or role changes invalidate cached matches.
8. For coaching, send the user's message and selected minimized context to Backboard. Load current profile/match state from the database, and never let old memory override it.

## Ingestion contract

The curated source repository has not been supplied; configuring it is an implementation prerequisite, not a blocker to these docs. Verify reuse terms and format before selecting it. Start with a pinned synthetic snapshot, clearly labeled. GitHub is the discovery source; link the employer application page when present.

Store `sourceKey`, source URL, commit SHA, content hash, fetched/last-seen time, and job status. Require HTTPS and block unsafe URLs; do not fetch arbitrary user/model URLs. Honor pagination, rate limits, Retry-After, and ETag conditional requests. Deduplicate by source key and flag probable cross-source duplicates without destructive merging. Only mark missing jobs inactive after a complete successful snapshot; disappearance means unlisted, not verified filled. Failed/partial ingestion preserves the last good snapshot and displays staleness. Explicit source closures take precedence.

## Execution and failures

For the small demo, use bounded synchronous requests; do not launch unawaited work after responding. Set an overall request deadline below the verified Vercel limit, one validation repair at most, bounded transient retries, and per-user/global spending caps. Return explicit timeout/retry states. Keep model calls outside DB transactions; persist final results atomically after rechecking owner/version/deletion state.

Persist operation IDs and owner-scoped idempotency keys before expensive work. A duplicate completed operation returns its result; an active duplicate returns conflict/retry information. Same key with different input is a conflict. Expired processing leases may be retried explicitly. New intentional regeneration gets a new key.

A larger ingestion corpus can move to a separate scheduled worker. If it calls an ingestion API, use Auth0 M2M Client Credentials with the correct audience and `opportunities:ingest` scope; validate issuer, audience, expiration, and scope. It gets no access to private résumés. This is service authentication, not agent-to-agent auth. A durable queue for user processing is deferred and would require a separate storage/retention design.

Official references: [Auth0 Next.js](https://github.com/auth0/nextjs-auth0), [Client Credentials](https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Backboard architecture](https://docs.backboard.io/concepts/architecture), and [GitHub REST practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api). Checked 2026-09-18; integration behavior remains untested.
