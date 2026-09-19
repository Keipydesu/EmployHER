# Connected UI integration

PR #13 brings Jason’s scrolling homepage and sage visual style into the existing
application. The anonymous `/demo` remains an explicitly illustrated, browser-only
sample. Its next steps are curated examples, not live Gemini results.

The real journey starts at `/onboarding`, continues through consent and résumé
review at `/profile`, and opens versioned guidance at `/career`. Interests, profile,
career and account screens share navigation and styling. Career guidance includes
section links, source evidence, saved actions, community preferences, Backboard
controls and a retry control for failed context loads. `/account` retains the
confirmed deletion flow. Sample résumé and Opportunities tools remain accessible
from the homepage footer.

## Integration decisions

Current main’s runtime, authorization, consent, schema-compatibility fix, migrations
001–008 and exact dependency versions are retained. The PR’s older alternate
runtime/migration system and client-supplied profile import command are removed.
No provider contract or personal-data boundary is relaxed by this UI change.

Demo browser checks use `.next-demo-test` on port 3120, separate from the profile,
authenticated and production smoke outputs. `npm run test:browser:ui` includes all
three browser projects. No local credentials are required for the sample demo.

## Verification

- 167 unit tests and 16 disposable-PostgreSQL integration tests pass.
- Seven profile, five judge-demo and four authenticated browser checks pass.
- Formatting, lint, typecheck and production build pass.
- Production homepage/static assets, profile gates and Opportunities API smoke
  pass, including localhost and 127.0.0.1.
- Desktop/mobile screenshots are under `docs/screenshots/connected-*.png`;
  judge-demo screenshots and `home-mobile.png` cover the public entry points.

Authenticated UI tests use a test session and response fixtures for career
recommendations. They do not claim a fresh real Auth0 callback or live personal-PDF
Gemini walkthrough. Those previously pending service-acceptance items are unchanged.
