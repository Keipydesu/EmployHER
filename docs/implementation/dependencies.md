# Profile slice dependency review

Reviewed 2026-09-18. Dependencies are exact-pinned with a lockfile. Selected stable releases at least 14 days old (using npm registry publication times), rather than unreviewed newest releases. Dependencies were installed with lifecycle scripts disabled. Initial npm audit reported zero known vulnerabilities; this is not proof of absence of vulnerabilities.

| Runtime package | Version | Published |
| --- | --- | --- |
| Next.js | 16.3.4 | 2026-08-31 |
| React / React DOM | 19.2.8 | 2026-07-21 |
| Zod | 4.5.4 | 2026-08-29 |
| PDF.js (`pdfjs-dist`) | 6.3.289 | 2026-08-29 |
| Drizzle ORM | 0.45.2 | 2026-03-27 |
| PostgreSQL driver | 8.23.0 | 2026-08-08 |

TypeScript 5.9.3, tsx 4.20.6, Prettier 3.6.2, and Playwright 1.62.1 are pinned development tools. Type declarations are pinned too. `skipLibCheck` avoids validating declarations for Drizzle's unrelated optional database drivers; application code remains strict. Playwright installs its matching Chromium binary separately for tests.

Provider integration references: [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [generateContent REST](https://ai.google.dev/api/generate-content), [embeddings REST](https://ai.google.dev/api/embeddings), [PDF.js](https://github.com/mozilla/pdf.js), [Drizzle vector search](https://orm.drizzle.team/docs/guides/vector-similarity-search). Next.js route/client-boundary guidance was also read from the installed package's documentation. REST calls avoid adding an unneeded AI SDK dependency; model IDs remain configuration, not guessed availability claims.

Recheck advisories and supported versions at integration/deployment. No environment values or credentials are included in this record.
