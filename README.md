# EmployHER

A career-development platform that connects resume-based skill-gap analysis,
personalized learning roadmaps, and relevant mentors.

## Product documentation

- [MVP product requirements](PRD.md) — scope, user journeys, acceptance criteria,
  architecture, and a three-developer work split.
- [Tech stack](TECH-STACK.md) — framework and infrastructure decisions, what is
  operator-instructed versus proposed, and what must be re-verified at implementation.
- [Formatted PRD](prd-artifact.html) — download and open in a browser.

The PRD is the reviewed planning baseline. Application implementation has not started.
The documents retain their original working title, Career Roadmap & Mentor Match.

## Stack

Ruby on Rails on Cloud Run, with Cloud SQL for PostgreSQL via ActiveRecord, Cloud Storage
via ActiveStorage, Cloud Tasks for durable background generation, and the Gemini API over a
thin REST client. Rails is an operator decision; the Postgres substitution for the concept's
original Firestore is a proposed decision with the rationale and override recorded in the PRD.

See [TECH-STACK.md](TECH-STACK.md) for the reasoning and [PRD.md](PRD.md) for demo scope and
pilot gates.
