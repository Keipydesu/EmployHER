# Hackathon judge demo

`/demo` is a hard-coded product walkthrough on the scrolling résumé site. It needs
no sign-in, API keys, database, personal uploads, or provider calls. The committed
profile uses Julia Thomas’s selected résumé evidence, explicitly approved by the
operator for publication. Phone numbers, email addresses, contact links, and the
source PDF are excluded. Role descriptions are illustrative and recommendations
are curated examples, not live Gemini output.

## Run and present

Use Node 24, install with `npm ci --ignore-scripts`, run `npm run dev`, and open
`http://127.0.0.1:3000/demo`. **Try the demo** on the homepage also opens this route.

A three-minute walkthrough:

1. **Your story:** review evidence of sensor research, robot integration, and tested
   full-stack software. The question about a shareable demo is self-reported and
   does not invent résumé evidence. Choose Applied ML & robotics or Software
   engineering.
2. **Career plan:** inspect the suggested sequence, time estimates, and role
   directions. Every card shows the first work session before opening a dialog.
3. **Open the work plan:** see five concrete tasks, named portfolio files, completion
   criteria, a worked example or outreach draft, and a relevant official reference.
   Check off a task. The benchmark includes split-manifest/results/report artifacts;
   the robotics task defines 20 prompts and traces; the backend task defines five
   failure scenarios. Counts and schedules are proposed scopes, not past results.
4. **Saved steps:** save up to three milestones, mark progress, refresh, and download
   a text plan containing tasks, deliverables, criteria, and reference links.
5. **Reset demo:** confirm a reset before the next judge. It clears the current
   profile’s choices under `employher-judges-demo-v2-<profile-id>` in browser storage.

Role cards provide search queries and eligibility questions, not live openings.
The career tasks include a three-target worksheet, an interview outline, and a
review-request draft. No applications or messages are sent. With browser storage
blocked, exploration still works for the current visit.

## Optional provided-résumé preview (local only)

Keep the PDF and any derived personal content outside tracked files. The demo can
read a minimized, manually reviewed profile JSON from an ignored local file:

```sh
EMPLOYHER_DEMO_PROFILE=.local/judges-profile.json npm run dev -- --port 3131
```

Only loopback Host values are accepted for this override; Vercel always uses the
public demo profile. Do not configure the override on other hosted servers. The route
is dynamic so a local profile is not embedded into build-time static HTML. The
file is read at request time, validated, and never sent to an AI provider.
The browser receives the selected profile for presentation; anyone with access to
that local demo can see it. Keep contact details and full raw text out of this file.

The schema is in `app/demo/load-profile.ts`; use `sampleProfile` in
`app/demo/demo-data.ts` as its structural reference. Set `local` to `true` and use a
unique `id`. Include at least three projects and exactly three evidence groups in
this order: research, robotics integration, full-stack software. These are curated
scenarios, not a general-purpose résumé parser. Preserve original conditions and
denominators in any résumé metric. Additional private profiles and their screenshots must not be
committed without explicit publication authorization. The operator authorized
the selected Julia evidence used by the default demo on September 19, 2026. Unset the variable to return to the public demo profile.

## Verification

Run `npm run test:demo`, or `npm run test:demo -- --ui`. Playwright scenarios in
`tests/judges-demo/` use port 3120 and Webpack. They cover the walkthrough, evidence
and work-plan dialogs, task persistence, detailed plan downloads, field switching,
the three-step limit, completion, reset/cancel, keyboard access, mobile layout,
unavailable storage, and the homepage entry point. The walkthrough asserts no
`/api/` requests. Public screenshots use the approved public demo profile only and are written
to `docs/screenshots/judges-demo-*.png`.

Official task references checked September 19, 2026:

- [scikit-learn cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html)
  for choosing an evaluation split and preparing to explain it.
- [Isaac Lab quickstart](https://isaac-sim.github.io/IsaacLab/main/source/setup/quickstart.html)
  for organizing a repeatable simulation in an existing setup.
- [Rails testing](https://guides.rubyonrails.org/testing.html) for job/system test
  references when implementing a failure matrix.

The work plans and proposed acceptance criteria are authored demo content; these
references do not claim that an employer requires a particular project. Tests do
not establish live AI, authentication, provider memory, or production guidance.
See [decision 003](decisions/003-localhost-demo.md) for the localhost boundary.

The suite runs in CI. The shared instrumentation guard keeps Node-only database
modules out of Edge bundles. Profile errors use a shared symbol brand to preserve
safe messages across server bundles; existing profile browser tests cover this.

## Women in tech community recommendations

The career plan highlights three optional women-led organizations with official
links and curated first steps. This is resource discovery, not enrollment or a
promise of mentorship. Membership conditions remain on each provider’s site.

Official sources reviewed September 19, 2026:

- Rewriting the Code: [student benefits and free membership](https://rewritingthecode.org/students/), [founder and CEO Sue Harnett](https://rewritingthecode.org/about-us/).
- Women in Robotics: [chapters and online community](https://www.womeninrobotics.org/chapters/), [leadership](https://www.womeninrobotics.org/about/), [audience](https://www.womeninrobotics.org/).
- AnitaB.org: [membership tiers and benefits](https://www.anitab.org/membership), [leadership](https://www.anitab.org/our-team).
