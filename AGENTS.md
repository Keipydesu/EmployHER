# Repository Guidelines

## Project Structure & Current Status

EmployHER is a career navigator for early-career tech roles. Person A's profile slice and a synthetic local Next.js harness now exist; production Auth0/database wiring, catalog matching and deployment remain integration work. See `docs/implementation/person-a.md`. Start with `README.md` and `TECH-STACK.md`. `docs/product.md` owns scope; `docs/architecture.md`, `docs/data-model.md`, and `docs/api.md` define proposed contracts. Read `docs/development.md` for implementation gates and `docs/privacy.md` for data handling. Number architecture decisions under `docs/decisions/`; decision `002` supersedes the historical Rails baseline.

The planned stack is Next.js/TypeScript, Tailwind/shadcn, Auth0, Tiger Data PostgreSQL/pgvector, Drizzle, Zod, Gemini, Backboard, and Vercel.

## Build, Test, and Development Commands

- `git status --short`: inspect local changes before editing.
- `git diff --check`: check tracked changes for whitespace errors.
- `git diff --stat`: review change scope before submitting.

Profile verification: `npm test`, `npm run typecheck`, `npm run build`, `npm run format:check`, and `npm run test:browser` (requires Playwright Chromium). Start the local-only synthetic harness with `PROFILE_DEMO_MODE=true npm run dev`. Never enable this harness in production.

## Style & Naming

Keep Markdown concise, use relative links, and distinguish proposals from implemented behavior. Use descriptive lowercase hyphenated documentation names and numbered decisions such as `003-topic.md`.

For future TypeScript, use two-space indentation, camelCase variables/functions, and PascalCase components/types. Establish formatter/linter configuration with the scaffold; none is configured today. Keep provider adapters server-side and validate external payloads with Zod.

## Testing Guidelines

Profile tests use Node's test runner with tsx and Playwright browser tests. No coverage threshold is established. For documentation, verify relative links, contract consistency, and whitespace. Prioritize evidence grounding, profile corrections, two-user isolation, ingestion failures, provider timeouts, and deletion races. Use synthetic fixtures; report checks actually run and remaining limitations.

## Commits & Pull Requests

Use focused, imperative commits (`Add ...`, `Fix ...`, or `docs: ...`). Develop features on feature branches and submit pull requests; never commit directly to `main` or `master`. PRs should explain the problem, changed behavior, verification, and unresolved assumptions; link relevant issues or decisions. Include screenshots for UI changes.

Do not push automatically. Keep changes and commits local unless the operator explicitly requests a push; permission to edit or commit is not permission to push.

## Security & Agent Coordination

Never commit credentials or real résumés. Keep examples synthetic and configuration placeholders explicit. Requirement-level gap claims need sourced requirement evidence, not inferred job-title skills.

Prefer stable npm versions published at least 7-14 days earlier. A newer release is allowed after documented security review of the exact version (advisories, publisher/provenance, release/changelog, install scripts, changed dependencies). Pin the reviewed version and commit the lockfile. Age or a clean audit alone does not prove safety; never use a known-compromised version.

In Talking Stick sessions, acquire a live writer turn before edits or builds, verify changes, and release with a concrete handoff. Follow current operator instructions over historical notes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
