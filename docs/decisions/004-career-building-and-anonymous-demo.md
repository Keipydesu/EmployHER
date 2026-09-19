# 004. Career building and an anonymous sample demo

- Status: Accepted operator direction.
- Date: 2026-09-19.
- Supersedes: decision 002's job-matching-first emphasis and earlier documentation requiring demo sign-in or treating synthetic-only integration as the product finish line. Decision 003's localhost target remains unchanged.

## Decision

EmployHER helps people build their careers by identifying relevant projects, skills and organizations using their own résumé, goals and patterns across job/internship requirements. A career-building plan is the primary outcome. Individual roles support explanation and optional application exploration; users need not select a vacancy to obtain guidance. No hiring outcome is guaranteed.

Offer two distinct journeys:

- An optional no-sign-in demo uses supplied synthetic résumés to show how the app works.
- The real app accepts the user's own résumé and supports ongoing personal progress. Existing authentication requirements for personal state remain; the operator removed sign-in from the demo, not account ownership from real use.

## Consequences

The anonymous demo must remain isolated from personal uploads and private account state. Synthetic authenticated integration tests verify service boundaries before real inputs are enabled; they are an intermediate gate, not the finished personal product. Consent, retention, deletion and provider-handling requirements must pass before personal uploads are enabled.

Guidance uses sourced recurring requirements across a deduplicated reviewed listing sample, with scope, dates, known/unknown counts and evidence references. A static snapshot supports sample-level patterns; rising/falling demand claims need comparable dated snapshots. Organizations and mentorship resources need independently checked relevance and eligibility, not invented employer requirements.

The single [roadmap](../../roadmap.md) owns execution order; [product scope](../product.md) and the [user story](../user-story.md) describe the experience. Aggregate-pattern and career-guidance API/storage contracts remain implementation work. This decision updates documentation, not current app behavior.
