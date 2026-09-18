# EmployHER

A HackHers-focused career navigator: upload a résumé, review extracted skills, discover relevant internships and jobs, understand qualification gaps, and choose actionable next steps.

**Status: local Docker foundation.** A minimal Next.js page and PostgreSQL/pgvector environment are implemented. Authentication, résumé intake, matching, and coaching remain planned.

## Run locally

Requires Docker with Compose v2 or newer.

```sh
cp .env.example .env
# Set POSTGRES_PASSWORD to a private local value in .env.
docker compose up --build --wait
```

Open [localhost:3000](http://localhost:3000). Source changes in `app/` reload automatically. Run `sh scripts/smoke.sh` to check the page and vector queries. Stop with `docker compose down`; database data is preserved.

See [development](docs/development.md) for ports, checks, rebuilding, and database access.

## Product and implementation plan

- [Product, scope, backlog, and demo](docs/product.md)
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
