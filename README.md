# EmployHER

A HackHers-focused career navigator: upload a résumé, review extracted skills, discover relevant internships and jobs, understand qualification gaps, and choose actionable next steps.

**Status: documentation only. No application has been scaffolded, deployed, or tested.**

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
