# Hackathon judge demo

`/demo` is a self-contained, hard-coded product walkthrough on top of the scrolling
résumé site. It needs no sign-in, API keys, database, personal uploads, or provider
calls. Maya Chen, the résumé, role requirements, and recommendations are synthetic.
The UI labels them as samples; it does not claim that Gemini generated them.

## Run and present

Use Node 24, install the lockfile with `npm ci --ignore-scripts`, and run
`npm run dev`. Open `http://127.0.0.1:3000/demo`, or use **Try the demo** on the
homepage. The production flow and existing profile routes remain separate.

A two-minute walkthrough:

1. **Your story:** show the supplied résumé beside three evidence-linked strengths.
   Add the sample testing experience to demonstrate that omitted evidence does not
   mean a missing skill. Select Data science & ML or Software engineering.
2. **Career plan:** build the sample plan. Open **Why this step?** to connect résumé
   evidence, a labeled sample requirement, and an actionable deliverable. Switch
   fields to show different recommendations. Expand a role for its sample context.
3. **Saved steps:** save up to three steps, mark one complete, then refresh. Choices
   persist in this browser. Completion does not create new résumé evidence.
4. **Reset demo:** confirm a reset before the next judge. It clears only the
   `employher-judges-demo-v1` local-storage entry's sample choices.

The demo has no fake upload or application controls. Role cards are illustrative,
not current openings. Community steps are peer-feedback activities, not invented
organizations. Browser-storage failure falls back to the current visit.

## Verification

Playwright is the existing browser runner. Demo regressions are named `*.spec.ts`
in `tests/judges-demo/`. Run `npm run test:demo`, or
`npm run test:demo -- --ui`. Its isolated server uses port 3120 and Webpack.
The suite covers the full walkthrough, evidence dialogs, field changes, the
three-step limit, completion and refresh, reset/cancel, keyboard access, mobile
layout, and unavailable local storage. It also asserts no `/api/` calls during
the walkthrough. Screenshots are written to `docs/screenshots/judges-demo-*.png`.

These checks verify the hard-coded presentation, not live AI, authentication,
provider memory, or production career guidance. See the localhost boundary in
[decision 003](decisions/003-localhost-demo.md).

The demo browser suite is included in CI. The shared instrumentation guard keeps
Node-only database modules out of the Edge bundle. Profile errors use a shared
symbol brand so the existing sample-session routes preserve safe error messages
across Next.js bundles; the profile browser regressions cover those messages.
