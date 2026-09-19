# 007. Gemini drives career recommendations

- Status: Accepted operator clarification, 2026-09-19.
- Supersedes: treating deterministic matching/checklists as the primary recommendation engine.

EmployHER is a Gemini-powered career-building application. The student supplies a
résumé and fields of interest. Gemini uses that evidence and relevant SimplifyJobs
listing context to propose the most useful next steps: projects, skills,
résumé improvements and communities. Auth0 authenticates users; Tiger Data stores
structured application records; Backboard supplies isolated user memory/context.
These are the identified partner services, not an unspecified set of vendors.

The app retrieves context, validates structured outputs and source references,
presents recommendations, and saves the student's choices. Vector similarity and
checklist counts are supporting mechanisms, not substitutes for Gemini's analysis.
Do not present a deterministic template as a Gemini-generated recommendation.

Return a small prioritized set of concrete actions with reasons, deliverables and
sources. Suggestions may explore a skill not evidenced in the résumé without
asserting the student lacks it. An explicit confirmed-gap claim still requires a
current user confirmation. Do not infer identity traits or hiring probabilities.
Reference validation checks grounding links; it cannot prove every model-written
sentence true. Label outputs as AI suggestions and let users correct context.

The anonymous supplied-résumé demo remains separate from authenticated personal
use. Keep the existing privacy/provider-tier handling and owner isolation. Gemini
failures must be visible; source exploration can remain available without silently
pretending that fallback content is personalized model analysis.
