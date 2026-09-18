# EmployHER

A HackHers-focused career navigator: upload a résumé, review extracted skills, discover relevant internships and jobs, understand qualification gaps, and choose actionable next steps.

**Status: Person A’s profile slice is implemented with a local synthetic-data demo.** Production Auth0/database wiring, the opportunity flow, and deployment remain integration work. See the [profile implementation and handoff](docs/implementation/person-a.md).

## Run the profile demo

```sh
npm ci --ignore-scripts
PROFILE_DEMO_MODE=true npm run dev
```

Open `http://127.0.0.1:3000/profile`. Use a supplied sample; real résumé intake is disabled. Run `npm test`, `npm run typecheck`, and `npm run build` for local verification. [Browser checks and integration boundaries](docs/implementation/person-a.md) are documented separately.

## Implementation brain dump

- [Product, scope, backlog, and demo](docs/product.md)
- [Student journey and career-path user story](docs/user-story.md)
- [Architecture and data flow](docs/architecture.md)
- [Relational schema and semantic matching](docs/data-model.md)
- [API contracts](docs/api.md)
- [Development, configuration, and deployment](docs/development.md)
- [Privacy and inclusion](docs/privacy.md)
- [Stack](TECH-STACK.md)
- [Current decision](docs/decisions/002-hackhers-career-navigator.md)

Chosen stack: Next.js + TypeScript, Tailwind/shadcn, Auth0, Tiger Data PostgreSQL with pgvector, Gemini, Backboard.io, GitHub API/Octokit, Drizzle, Zod, and Vercel.

The latest user direction supersedes the earlier Rails/mentor-first planning baseline. Earlier PRD and formatted planning artifacts are available in Git history; [decision 001](docs/decisions/001-rails-mvp-baseline.md) remains historical context. Follow this README and current linked documents for implementation. No real résumé data or credentials belong in this repository.
