# 002. HackHers career navigator documentation direction

- Status: Accepted user direction for product scope and chosen stack; schema/contracts/limits are implementation proposals.
- Date: 2026-09-18
- Supersedes: decision 001's Rails framework and previous product/stack roadmap authority.

## Context

The latest user request is a documentation-only brain dump pushed to GitHub, explicitly choosing a résumé-to-opportunity HackHers navigator and the Next.js stack. Earlier Rails/mentor-first documents exist, and the original local checkout contains unrelated uncommitted edits.

## Decision

Use Next.js/TypeScript, Tailwind/shadcn, Auth0, Tiger Data PostgreSQL/pgvector, Gemini, Backboard.io, GitHub API/Octokit, Drizzle, Zod, and Vercel. Use normal user authentication; defer agent-to-agent auth entirely. Optional scheduled ingestion may use narrowly scoped Auth0 Client Credentials.

The README indexes current focused docs. Product scope and the single current backlog live in `docs/product.md`; implementation detail lives in the linked architecture/schema/API/development docs and TECH-STACK.md. The earlier PRD and formatted PRD were removed upstream and remain available in Git history; do not restore their competing implementation plan. Preserve accepted decision 001 as history. Current user instructions take precedence over older choices.

## Consequences

No app code, dependencies, migrations, infrastructure, bot, or deployment is created by this task. The plan prioritizes explainable job matching and documented support resources; full mentor marketplace and four-week curriculum are deferred. Retain grounding, synthetic-demo, ownership, deletion, and honest-failure principles. Implementation must validate versions, providers, source licensing, and real-data gates before launch.
