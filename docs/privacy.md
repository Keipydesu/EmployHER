# Privacy, safety, and inclusion

## Résumé data

Use synthetic fixtures in the public hackathon demo. Enable real input only after consent text, provider handling, ownership, retention, and deletion are verified. Explain that minimized résumé content is processed by Gemini, structured data lives in Tiger Data, and selected coaching messages/context go to Backboard. Do not promise no training or zero retention without confirming the actual service/tier terms.

Raw PDF/full text lives only for bounded request processing, with temporary files removed on success/failure; no raw résumé storage or document upload to Backboard. Structured profiles, excerpts, vectors, matches, and coaching state are sensitive data. Proposed application retention: 30 days from creation, without automatic extension. Expire access immediately at the deadline and reconcile provider cleanup. Provider and backup retention must be documented separately before pilot launch.

Delete My Data blocks access and new work immediately, then removes app records, vectors, and external assistant/thread/message/memory copies within the proposed 24-hour application cleanup target. Track pending/failed cleanup honestly; retain minimal encrypted cleanup IDs until reconciled. A provider outage may delay completion and must be surfaced. Check owner tombstones/version before any late model result writes. Memory opt-out stops new memory writes; deleting existing memory is an explicit available action. Memory-off does not imply chat history is not retained.

Logs contain request IDs, timings, model versions, and sanitized errors, never résumé bodies, excerpts, tokens, or coach messages. Secrets stay server-side. Minimize employer and provider disclosures; no automated applications or outreach.

## Inclusive recommendations

Surface documented women's employee groups, mentorship programs, inclusive benefits, scholarships, communities, and organizations according to user-selected categories. Every claim carries a URL, excerpt, checked date, and applicable region/eligibility text. Prefer official program/employer pages. Do not infer gender from names, pronouns, photos, résumé text, or behavior. Do not collect gender merely to rank jobs.

Do not label an employer safe, inclusive, or discriminatory based on missing data or a model's judgment. “The employer documents this mentorship program” is supportable; “this employer treats women better” is not established by that fact. An expired or unverified resource is hidden or visibly stale. Scholarships may have eligibility restrictions; quote them and let the user assess eligibility without inferring protected traits.

No invented employers, programs, contact details, credentials, salary outcomes, or hiring probabilities. Separate résumé evidence from user-reported skills and uncertain model interpretation. User corrections matter more than stale conversational memory.

Treat source files, résumé text, and model output as untrusted. Model calls get no unrestricted tools, network browsing, SQL, or authorization powers. Render escaped text, validate links against the curated catalog, rate-limit costly operations, and provide accessible empty/error/uncertainty states.
