# Foundation dependency review

Reviewed 2026-09-18. Exact direct pins are in `package.json`; the complete resolution and integrity hashes are in `package-lock.json`. This is a development foundation, not a production security sign-off.

| Package | Version | npm publication date |
| --- | --- | --- |
| next / eslint-config-next | 16.3.4 | 2026-08-31 |
| react / react-dom | 19.2.8 | 2026-07-21 |
| tailwindcss / @tailwindcss/postcss | 4.3.3 | 2026-07-16 |
| typescript | 5.9.3 | 2025-09-30 |
| eslint | 9.39.4 | 2026-03-06 |
| prettier | 3.9.6 | 2026-07-21 |
| @types/node | 24.13.3 | 2026-07-08 |
| @types/react | 19.2.18 | 2026-07-30 |
| @types/react-dom | 19.2.7 | 2026-09-03 |

Release dates were read from the npm registry. All direct pins are at least 14 days old. Node.js 24.21.0 and npm 11.19.0 were already installed on the workstation and used for verification.

Reviewed the official [August Next.js security release](https://nextjs.org/blog/august-2026-security-release), [16.3.4 release notes](https://github.com/vercel/next.js/releases/tag/v16.3.4), and [Next.js advisory index](https://github.com/vercel/next.js/security/advisories). Version 16.3.4 follows the patched 16.3.3 release. npm's install audit reported zero known vulnerabilities in the resolved tree. Release age and audit results are limited checks, not proof of package safety.

Installation and clean lockfile reproduction used `--ignore-scripts`. The lockfile marks `unrs-resolver` 1.12.2 as having an install script; it was not executed. Native dependencies worked using their distributed binaries. Prefer `npm ci --ignore-scripts` for this foundation.

Compatibility limitation: ESLint 9 is deprecated upstream. ESLint 10.9.1 was evaluated but Next.js's resolved React/import/accessibility plugins declare ESLint 9 peer ranges, and the React plugin fails under ESLint 10 (`contextOrFilename.getFilename`). Retain 9.39.4 temporarily, with no known vulnerability reported by the audit. Upgrade the configuration and plugins together before production; do not suppress peer checks to force ESLint 10.

No Auth0, database, AI, or deployment dependencies are installed. Review those independently when their implementation is approved.
