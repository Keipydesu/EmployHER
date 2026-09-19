# 008. Explicit local personal-résumé demo

- Status: Accepted operator direction, 2026-09-19.
- Supersedes: the unconditional synthetic-only restriction for the operator's local MVP, not anonymous-demo isolation or hosted release requirements.

The operator requested real résumé uploads for the local MVP after confirming
the Gemini key uses unpaid API quota. Provide a default-off
`PERSONAL_RESUME_ENABLED` flag, usable only with a loopback `APP_BASE_URL`.
Authenticated users explicitly acknowledge processing before submitting text or
a text-based PDF. Extraction, corrected-profile embeddings and career synthesis
must all honor the same mode. Anonymous routes remain sample-only.

This decision does not establish provider-term compatibility. Google's unpaid
API terms prohibit submitting personal information; running locally and obtaining
consent do not change those terms. Disclose external processing and the unpaid
tier's review/training handling. Do not enable billing or claim production release
readiness. Existing owner isolation, input limits, expiry and deletion remain.

The MVP override is separate from R3's hosted/pilot release verification. Functional
tests use synthetic data even when exercising arbitrary-upload behavior. Provider
failures remain visible; an enabled upload control is not proof of successful
live extraction or end-to-end Auth0 acceptance.
