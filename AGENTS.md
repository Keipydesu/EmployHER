# Repository Guidelines

## Project Structure & Current Status

EmployHER is an early-career tech navigator with synthetic profile and Opportunities demos running directly on Node 24. Production integrations remain proposed. `app/` owns the UI, `scripts/smoke.mjs` checks the local HTTP app. Start with `README.md` and `TECH-STACK.md`. `docs/product.md` owns scope; `docs/architecture.md`, `docs/data-model.md`, and `docs/api.md` define proposed contracts. Read `docs/development.md` for implementation gates and `docs/privacy.md` for data handling. Number architecture decisions under `docs/decisions/`; decision `002` supersedes the historical Rails baseline.

The planned stack is Next.js/TypeScript, Tailwind/shadcn, Auth0, Tiger Data PostgreSQL/pgvector, Drizzle, Zod, Gemini, and Backboard. Run the app on localhost for now; hosted deployment is deferred under decision `003`.

## Build, Test, and Development Commands

- `git status --short`: inspect local changes before editing.
- `git diff --check`: check tracked changes for whitespace errors.
- `git diff --stat`: review change scope before submitting.

Use Node 24, `npm ci --ignore-scripts`, and `npm run dev` for local startup. `npm run smoke` checks a running server. `npm run check` runs formatting, lint, and TypeScript checks; `npm run build` builds the app. See `docs/development.md` for local commands. `npm test` runs both tracks using Node’s test runner through `tsx`; `npm run test:browser` runs Playwright profile checks.

## Style & Naming

Keep Markdown concise, use relative links, and distinguish proposals from implemented behavior. Use descriptive lowercase hyphenated documentation names and numbered decisions such as `003-topic.md`.

For future TypeScript, use two-space indentation, camelCase variables/functions, and PascalCase components/types. Use the checked-in Prettier and ESLint configuration. Keep provider adapters server-side and validate external payloads with Zod.

## Testing Guidelines

Unit tests use Node’s test runner through `tsx`; browser tests use Playwright. The smoke runner is `npm run smoke` (Node built-ins). No coverage threshold is established. For documentation, verify relative links, contract consistency, and whitespace. For implementation, choose a framework and document its runner and naming convention before adding tests. Prioritize evidence grounding, profile corrections, two-user isolation, ingestion failures, provider timeouts, and deletion races. Use synthetic fixtures; report checks actually run and remaining limitations.

## Commits & Pull Requests

Use focused, imperative commits (`Add ...`, `Fix ...`, or `docs: ...`). Develop features on feature branches and submit pull requests; never commit directly to `main` or `master`. PRs should explain the problem, changed behavior, verification, and unresolved assumptions; link relevant issues or decisions. Include screenshots for UI changes.

Do not push automatically. Keep changes and commits local unless the operator explicitly requests a push; permission to edit or commit is not permission to push.

## Security & Agent Coordination

Never commit credentials or real résumés. Keep examples synthetic and configuration placeholders explicit. Requirement-level gap claims need sourced requirement evidence, not inferred job-title skills.

Prefer stable npm versions published at least 7-14 days earlier. A newer release is allowed after documented security review of the exact version (advisories, publisher/provenance, release/changelog, install scripts, changed dependencies). Pin the reviewed version and commit the lockfile. Age or a clean audit alone does not prove safety; never use a known-compromised version.

In Talking Stick sessions, acquire a live writer turn before edits or builds, verify changes, and release with a concrete handoff. Follow current operator instructions over historical notes.
