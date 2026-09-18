# Repository Guidelines

## Project Structure & Current Status

EmployHER is a documentation-only career navigator for early-career tech roles. No application source, tests, assets, or package manifest exists yet. Start with `README.md` and `TECH-STACK.md`. `docs/product.md` owns scope; `docs/architecture.md`, `docs/data-model.md`, and `docs/api.md` define proposed contracts. Read `docs/development.md` for implementation gates and `docs/privacy.md` for data handling. Number architecture decisions under `docs/decisions/`; decision `002` supersedes the historical Rails baseline.

The planned stack is Next.js/TypeScript, Tailwind/shadcn, Auth0, Tiger Data PostgreSQL/pgvector, Drizzle, Zod, Gemini, Backboard, and Vercel.

## Build, Test, and Development Commands

- `git status --short`: inspect local changes before editing.
- `git diff --check`: check tracked changes for whitespace errors.
- `git diff --stat`: review change scope before submitting.

There are no runnable build, development, lint, or test commands yet. Do not claim `npm test` or `npm run build` works. When scaffolding is authorized, add scripts and a lockfile, then document verified commands in `docs/development.md`.

## Style & Naming

Keep Markdown concise, use relative links, and distinguish proposals from implemented behavior. Use descriptive lowercase hyphenated documentation names and numbered decisions such as `003-topic.md`.

For future TypeScript, use two-space indentation, camelCase variables/functions, and PascalCase components/types. Establish formatter/linter configuration with the scaffold; none is configured today. Keep provider adapters server-side and validate external payloads with Zod.

## Testing Guidelines

No test framework or coverage threshold is established. For documentation, verify relative links, contract consistency, and whitespace. For implementation, choose a framework and document its runner and naming convention before adding tests. Prioritize evidence grounding, profile corrections, two-user isolation, ingestion failures, provider timeouts, and deletion races. Use synthetic fixtures; report checks actually run and remaining limitations.

## Commits & Pull Requests

History uses imperative subjects such as `Add ...`, `Fix ...`, and occasionally `docs: ...`; no mandatory prefix scheme exists. Keep commits focused. Develop features on feature branches and submit pull requests; never commit directly to `main`. PRs should explain the problem, changed behavior, verification, and unresolved assumptions; link relevant issues or decisions. Include screenshots for UI changes once a UI exists.

## Security & Agent Coordination

Never commit credentials or real résumés. Keep examples synthetic and configuration placeholders explicit. Requirement-level gap claims need sourced requirement evidence, not inferred job-title skills.

In Talking Stick sessions, acquire a live writer turn before edits or builds, verify changes, and release with a concrete handoff. Follow current operator instructions over historical notes.
