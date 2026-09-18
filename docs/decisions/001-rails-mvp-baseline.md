# 001. Rails MVP documentation baseline

- Status: Accepted for the Rails framework and documentation conventions; supporting infrastructure remains proposed as noted below.
- Date: 2026-09-18

## Context

The user specified Ruby on Rails after the initial MVP PRD and requested a companion
tech-stack document and shared agent instructions. The repository currently contains
planning documents only. The original concept included Gemini, Google Cloud hosting,
Cloud Storage, and Firestore.

## Decision

Use Ruby on Rails as the application framework. `AGENTS.md` is the authoritative
standing brief, with `CLAUDE.md` as a relative symlink. The PRD owns product scope,
acceptance criteria, delivery order, and team responsibilities. `TECH-STACK.md` owns
implementation choices and their decision status. Do not create a duplicate roadmap.

Keep PostgreSQL via Active Record as a **proposed replacement** for the original
Firestore suggestion, with rationale and an override path in the stack document.
This record does not claim the user explicitly selected PostgreSQL. Cloud Tasks,
session ownership, Hotwire, and related technical defaults retain their proposed
status. No infrastructure is provisioned by adopting this documentation baseline.

## Consequences

Future scaffolding should use Rails and follow the verified product contract.
Implementation must verify current dependencies, pin actual versions, and run the
relevant checks before claiming a working feature. Update repository status when
application code lands; never present proposed commands or schemas as implemented.

Keep later durable decisions in new numbered records. An accepted decision can be
superseded explicitly; user instructions are not overridden by this historical record.
