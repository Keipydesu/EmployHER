# EmployHER

A HackHers-focused career-building app: use your résumé and patterns across job and internship requirements to choose projects, skills and organizations that can help you grow. Try supplied sample data without signing in; the planned personal experience uses your own résumé.

**Status: local synthetic Opportunities demo.** Explore paths, evidence, ranked fixture roles, saved next steps and reviewed resources at `/opportunities`. Authentication, real résumé intake, database/provider adapters and coaching remain integration work. See [implementation status](docs/opportunities-implementation.md).

## Run locally

For the judge walkthrough, open `/demo`: a polished sample résumé → career plan →
saved steps flow with no sign-in or live providers. See the
[two-minute demo guide](docs/judges-demo.md). Run its browser checks with
`npm run test:demo` (or add `-- --ui` for Playwright UI).

Use Node 24 (see `.nvmrc`). No Docker, database, or credentials are needed for this initial page.

```sh
npm ci --ignore-scripts
npm run dev
```

Open [localhost:3000](http://localhost:3000). Source changes reload automatically. In another terminal, run `npm run smoke` to check the homepage and its static assets. Stop the server with Ctrl+C.

See [development](docs/development.md) for Node selection, ports, checks, and remaining integrations.

## Product and implementation plan

- [Start-to-finish delivery roadmap](roadmap.md)
- [Product, scope, backlog, and demo](docs/product.md)
- [Developer B: Opportunities implementation plan](docs/plans/developer-b-opportunities.md)
- [Student journey and career-path user story](docs/user-story.md)
- [Architecture and data flow](docs/architecture.md)
- [Relational schema and semantic matching](docs/data-model.md)
- [API contracts](docs/api.md)
- [Local development and configuration](docs/development.md)
- [Privacy and inclusion](docs/privacy.md)
- [Stack](TECH-STACK.md)
- [Stack decision](docs/decisions/002-hackhers-career-navigator.md)
- [Localhost demo decision](docs/decisions/003-localhost-demo.md)

Chosen stack: Next.js + TypeScript, Tailwind CSS/shadcn, Auth0, Tiger Data PostgreSQL with pgvector, Gemini, Backboard.io, GitHub API/Octokit, Drizzle, and Zod. The app will run on localhost for now; hosted deployment is deferred. Drizzle handles database queries/schema alongside TypeScript and Tailwind CSS; see [decision 006](docs/decisions/006-retain-drizzle-with-tiger-data.md).

The latest user direction supersedes the earlier Rails/mentor-first planning baseline. Earlier PRD and formatted planning artifacts are available in Git history; [decision 001](docs/decisions/001-rails-mvp-baseline.md) remains historical context. Follow this README and current linked documents for implementation. No real résumé data or credentials belong in this repository.

## Profile sample workspace

Run `PROFILE_DEMO_MODE=true npm run dev` and open `/profile` to review supplied synthetic résumés. The root app also serves `/opportunities`. See [profile implementation and integration boundaries](docs/implementation/person-a.md). `npm test` runs both tracks; `npm run test:browser` runs the profile browser checks after `npx playwright install chromium`. Production profile processing stays disabled until the authenticated runtime is installed.
