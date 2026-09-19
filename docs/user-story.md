# User Story: From an Uncertain Student to a Clear Tech Career Path

Status: intended product experience, clarified 2026-09-19. Synthetic profile and Opportunities slices exist; the connected personal-résumé journey remains to be implemented. This story expands [product.md](product.md).

## Primary user story

**As an early-career person in tech, I want to upload my own résumé and understand which projects, skills and organizations can help me grow, using patterns in job and internship requirements alongside my goals and experience, so I can build a stronger career over time.**

## Meet Maya

Maya is a college student in Georgia. She has coursework, a class project and a hackathon on her résumé, but no tech internship yet. She is interested in machine learning and cybersecurity without knowing what either path expects of an entry-level applicant. She wonders whether to build another project, earn a cloud certificate, rewrite her résumé, or find a mentor who can help her decide.

Maya is a young woman, reflecting EmployHER's motivating audience. Her uncertainty is about navigating a new field, not a presumed lack of ability. The app does not infer or verify gender; anyone can explore paths and opt into women-focused resources.

## Try the app without signing in

A visitor can choose a supplied synthetic résumé and explore an example career-path assessment without an account. This is a separate demo, clearly labeled sample data; it does not accept personal résumés or create a personal saved profile. Trying it is optional, not a required step before using the real app.

## The real-user journey

### 1. Start with what she has done

Maya signs in, sees how her information will be used, and uploads her résumé or pastes its text. Her own résumé is the input for real use; the separate no-sign-in demo uses a supplied synthetic résumé. EmployHER extracts experience and skills with supporting excerpts, then asks her to correct the draft. Classwork, personal projects, volunteering and hackathons can all provide relevant evidence.

She confirms the profile. If extraction fails, she can retry or use the text fallback; the app does not invent a profile to keep the flow moving.

### 2. Explore a career-path tree

Instead of starting with an overwhelming job list, Maya sees expandable path cards with labeled progress bars and a tree of evidence checkpoints. She can browse every available path, select interests, and switch between internship and new-grad goals. Suggestions do not lock her into whichever path her current résumé resembles most.

The source-aligned top-level categories are **Software Engineering; Product Management; Data Science, AI & Machine Learning; Quantitative Finance; and Hardware Engineering**. These come from the selected [internship list](https://github.com/SimplifyJobs/Summer2027-Internships) and [new-grad list](https://github.com/SimplifyJobs/New-Grad-Positions), reviewed on 2026-09-18. Only categories with curated content get an assessed progress view.

**Cybersecurity** and **Cloud/Infrastructure** are proposed EmployHER subpaths, not claimed top-level categories in those lists. Curators map relevant roles and reviewed posting requirements to them. If the seed set lacks that evidence, show “Path being curated” with an explanation rather than an invented assessment.

Illustrative tree, using synthetic values:

```text
Explore tech paths
├── Software Engineering
│   ├── Cloud/Infrastructure — 2 of 5 evidence checkpoints supported
│   │   ├── Programming project       Supported by résumé
│   │   ├── Version control           User-reported evidence
│   │   ├── Cloud deployment          Needs clarification
│   │   ├── Access controls           Learning action selected
│   │   └── Monitoring                Not yet evidenced
│   └── Cybersecurity — explore reviewed requirements
└── Data Science, AI & ML — compare path
```

The same information is available as a keyboard-accessible list; labels communicate status without relying on color.

### 3. Understand progress before choosing an action

A bar means **evidence coverage of this path's displayed, versioned checklist**: supported checkpoints divided by all reviewed checkpoints. Résumé-supported and user-reported evidence remain visibly distinct; uncertain items do not silently count as supported. Each checkpoint links to its underlying reviewed role requirements. Deduplicate repeated skills so repeated listings do not inflate progress.

Maya can inspect the denominator, evidence, review date and why each item matters. Eligibility conditions are separate from skill coverage. The bar is not a hiring probability, industry-wide readiness score, or verdict that she is “optimal.” Different path checklists are not directly comparable rankings. With insufficient requirements, show “Not enough evidence to assess” rather than 0%.

Completing an action and demonstrating a skill are separate: opening a course or ticking “done” does not automatically prove competence. Adding relevant evidence or correcting her profile updates coverage; changes to the checklist explain any change in the total.

### 3a. See the field's shape, honestly

Maya wants to know how competitive Cloud/Infrastructure feels before she invests time. The selected job catalog contains listing information, not applicant volume, so it cannot support an acceptance-rate or applicant-competition score. Show “Competition data unavailable” until an appropriate source is available.

Instead, the path card shows a **field-context panel** built only from facts already in the reviewed catalog, each with its sample size, source, and checked date: how many reviewed roles were source-marked open in this path as of the snapshot; what share explicitly state no sponsorship, U.S. citizenship, or an advanced degree. These are framed as "of the N listed roles we reviewed" facts, never as a competitiveness label, ranking, or prediction — a small sample says so explicitly, and the panel says plainly that real applicant-competition data is unavailable from this source.

If a comparable, reliable competition dataset becomes available, show its precise measure, sample, geography, career level, period and limitations separately from personal progress. Never infer applicant competition from listing counts or employer prestige.

### 3b. See patterns across relevant listings

For a chosen field and internship/new-grad cohort, Maya sees recurring skills and project-relevant requirements across reviewed job listings, compared with her confirmed evidence. Recommendations are career-development guidance across a field, not only advice for one vacancy. Each pattern shows source links, snapshot/review dates, filters, the number of distinct reviewed roles mentioning it and the number with available requirements. Listings without reviewed requirements are counted separately as unknown, not as evidence that a skill is unnecessary; duplicate listings must not inflate frequency.

A single snapshot supports “commonly requested in this reviewed sample,” not “demand is rising.” Claims of change over time require comparable dated snapshots. The catalog is a limited sample, not a census of the job market. Projects and skills connect to reviewed patterns; organizations and mentorship resources connect to her selected field, location and preferences, with their own checked sources.

### 4. Open a gap and find a useful next step

Maya opens “Cloud deployment.” The app first asks whether she has deployed something that her résumé omits. If yes, she adds user-reported details for review. If she confirms she has not, the node offers a small, relevant learning action: deploy a simple project and document the setup, access controls and results.

A curated certification route may also appear, with an official provider link, prerequisites, cost or “cost not verified,” and a checked date. Explain which reviewed requirement it helps address and offer a project or free learning alternative where available. Do not prescribe an arbitrary certificate as a universal job prerequisite or invent a credential recommendation from a title alone.

She selects up to three next actions, each with a concrete deliverable. She can still view relevant jobs and apply while learning; an incomplete tree does not block applications.

### 5. Tell an honest résumé story for each path

Within the selected path, Maya sees which existing projects and bullets to foreground. Suggestions explain their relevance to reviewed requirements and let her accept, edit or reject each change.

For example, if her confirmed project used Python to clean survey data, an ML-oriented draft can emphasize that work. It cannot turn the project into a deployed prediction model, add impact metrics she never supplied, or list a certificate she has not earned. Suggested future work stays separate from ready-to-use résumé text.

### 6. Find people and communities

Maya chooses Georgia-based communities and women-focused mentorship resources. EmployHER shows contextual cards using the existing curated resource catalog:

- [Technology Association of Georgia (TAG)](https://www.tagonline.org/) is a discovery starting point for Georgia tech communities, societies and events; it is not a promise of a mentor match.
- [Society of Women Engineers mentoring](https://swe.org/membership/mentoring/) is a mentorship discovery starting point. SWE here means the organization; a software-engineering mentor's availability is not assumed.

These official starting points were checked on 2026-09-18. Before a specific program is recommended, verify its current audience, membership/eligibility rules, location or remote access, fees, availability and application link. Display unknowns honestly. Resources may relate to a path or location without an employer association. No automatic outreach, enrolment or guaranteed placement occurs.

### 7. Leave with a direction, then return

Maya leaves with a chosen path, an explanation of her existing strengths, up to three prioritized actions, truthful résumé edits, relevant role links, and a community or mentorship resource to investigate. On return, her selected path and actions remain available; she can add evidence, revise a choice and see what changed.

Success means she can explain what she will do next and why it matters—not merely that a progress bar increased.

## Acceptance scenarios

| Given / when | Expected result |
| --- | --- |
| A visitor opens the demo | Supplied sample résumé and example guidance work without sign-in; no personal upload or private account data is exposed |
| Maya uses the real app | After sign-in and processing explanation, she uploads her own résumé and receives guidance based on confirmed evidence and reviewed listing patterns |
| Maya views recurring skill demand | Show deduplicated counts, known-requirement denominator, unknowns, sources, dates and cohort; no time-trend claim from one snapshot |
| A confirmed profile opens the path view | Curated paths show explainable coverage and expandable checkpoints; uncurated paths show unavailable status |
| A skill is absent from the résumé | Ask for clarification before treating it as a learning gap |
| A path lacks reviewed requirements | No fabricated percentage, readiness judgment or skill-gap claim |
| Maya adds relevant evidence | Recompute the affected versioned checklist; retain the evidence source and explain changes |
| Maya selects a cloud action | Show a deliverable and reviewed learning/certification options with costs and prerequisites where known |
| Maya views a path's field-context panel | Show only sample-sized, sourced, dated catalog facts (source-marked-open count, explicit eligibility-tag shares); applicant competition remains unavailable without a suitable separate source |
| Maya requests résumé tailoring | Use confirmed facts only; require review before accepting changes |
| Maya opts into mentorship resources | Show sourced, relevant programs with known eligibility and freshness; no inferred gender or promised mentor |
| Maya returns or switches paths | Preserve her saved choices, allow revisions, and keep learning separate from application eligibility |

## Delivery alignment

This refines [the delivery roadmap](../roadmap.md): **A** owns profile evidence/corrections and truthful résumé suggestions; **B** owns path taxonomy, reviewed checklist definitions, progress/tree UI, job links and contextual learning/community resources; **C** owns authenticated persistence, navigation, accessible shared components and localhost setup. All three agree checkpoint states, versioning and saved-action contracts in M0. Existing API/schema proposals need those contracts added before implementation; this story does not pretend they already exist.

The real product uses the user’s own résumé, a small reviewed static path/resource set and up to three next actions. A separate anonymous demo uses supplied synthetic profiles. Synthetic fixtures also support integration testing; they do not replace the real-user journey. Privacy and lifecycle checks are required before enabling personal uploads. It does not require a full curriculum, live job refresh, mentor marketplace or a hiring-probability score. Keep this file as the experience and acceptance reference; [product.md](product.md) remains the single backlog.
