# EmployHER

A HackHers-focused career navigator: upload a résumé, review extracted skills, discover relevant internships and jobs, understand qualification gaps, and choose actionable next steps.

**Status: local synthetic Opportunities demo.** Explore paths, evidence, ranked fixture roles, saved next steps and reviewed resources at `/opportunities`. Authentication, real résumé intake, database/provider adapters and coaching remain integration work. See [implementation status](docs/opportunities-implementation.md).

## Run locally

Use Node 24 (see `.nvmrc`). No Docker, database, or credentials are needed for this initial page.

```sh
npm ci --ignore-scripts
npm run dev
```

Open [localhost:3000](http://localhost:3000). Source changes reload automatically. In another terminal, run `npm run smoke` to check the homepage and its static assets. Stop the server with Ctrl+C.

See [development](docs/development.md) for Node selection, ports, checks, and remaining integrations.

## Product and implementation plan

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

Chosen stack: Next.js + TypeScript, Tailwind/shadcn, Auth0, Tiger Data PostgreSQL with pgvector, Gemini, Backboard.io, GitHub API/Octokit, Drizzle, and Zod. The app will run on localhost for now; hosted deployment is deferred.

The latest user direction supersedes the earlier Rails/mentor-first planning baseline. Earlier PRD and formatted planning artifacts are available in Git history; [decision 001](docs/decisions/001-rails-mvp-baseline.md) remains historical context. Follow this README and current linked documents for implementation. No real résumé data or credentials belong in this repository.

## Profile sample workspace

Run `PROFILE_DEMO_MODE=true npm run dev` and open `/profile` to review supplied synthetic résumés. The root app also serves `/opportunities`. See [profile implementation and integration boundaries](docs/implementation/person-a.md). `npm test` runs both tracks; `npm run test:browser` runs the profile browser checks after `npx playwright install chromium`. Production profile processing stays disabled until the authenticated runtime is installed.
