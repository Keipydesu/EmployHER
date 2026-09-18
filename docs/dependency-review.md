# Local foundation dependency review

Reviewed 2026-09-18. Direct npm versions are pinned, with a committed npm lockfile. Selection uses stable releases published more than fourteen days before review; age and an audit alone are not proof of safety.

| Package | Version | Published |
| --- | --- | --- |
| Next.js / eslint-config-next | 16.3.4 | 2026-08-31 |
| React / React DOM | 19.2.8 | 2026-07-21 |
| TypeScript | 5.9.3 | 2025-09-30 |
| ESLint | 9.39.5 | 2026-07-10 |
| Prettier | 3.9.6 | 2026-07-21 |
| @types/node | 24.13.3 | 2026-07-08 |
| @types/react | 19.2.18 | 2026-07-30 |
| @types/react-dom | 19.2.7 | 2026-09-03 |

Checked registry metadata and Next.js peer requirements. The [Next.js security release index](https://nextjs.org/blog) identifies 16.3.3 as the August security patch; the selected version is later in that release line. `npm audit` found zero known advisories for the initial locked graph. Installs use `npm ci --ignore-scripts`; no package lifecycle scripts are needed by this scaffold's build. Transitive versions and integrity hashes are recorded in the lockfile.

ESLint 9 is deprecated upstream but is retained for compatibility with the React, import, and accessibility plugins in the pinned Next.js lint configuration; those plugins do not declare ESLint 10 support. Revisit the lint stack together when upgrading. This limitation affects development tooling, not the app runtime.

Docker was removed from the current MVP workflow. Node 24 is selected through `.nvmrc`; CI uses pinned checkout and setup-node action commits.

## Opportunities validator — 2026-09-18

Added direct dependency `zod@4.1.5`, an older exact version, with lockfile integrity verification through npm. Registry metadata inspected; no install lifecycle scripts are defined (build/test/prepublish scripts are not invoked by `npm ci --ignore-scripts`). Installation used `--ignore-scripts`; npm audit reported zero vulnerabilities at this check. No new test framework: Node 24 built-in `node:test` and type stripping run TypeScript domain tests. Audit cleanliness and age do not prove absence of malicious code. No newer-release exception requested.
