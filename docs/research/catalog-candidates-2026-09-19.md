# Catalog research candidates — 2026-09-19

Research artifact only. Not the shipped catalog (`src/opportunities/catalog.ts` is untouched by this file). Neither `SimplifyJobs/Summer2027-Internships` nor `SimplifyJobs/New-Grad-Positions` has a LICENSE file, and their `CONTRIBUTING.md` has no reuse/redistribution clause (re-checked 2026-09-19). Redistribution terms remain an open legal question per `CLAUDE.md`; this file records research findings only and does not authorize publishing this content as shipped product catalog data.

Source: `SimplifyJobs/Summer2027-Internships`, branch `dev`, repo HEAD commit `cd6d284e9ecba163966b8ded3c9d5bbd98113759` (checked 2026-09-19 via `gh api`). All rows below come from `README.md` in that repo at that ref. That file's own git blob commit is `c910f666f404fe8481c33fb108457ae457c25651`.

17 employer posting URLs were fetched read-only (`WebFetch`) across all 5 listed categories: 11 returned real, extractable requirement text; 6 failed honestly (blocked or JS-rendered ATS shells that did not deliver real content to a non-JS fetch) and are recorded as unavailable, not guessed. No fabricated requirement text appears below — every excerpt is a short, attributed quote from the fetched page, capped at 25 words.

## Software Engineering (2 of 4 fetched succeeded)

| Company | Role | Location | Application | Requirement excerpt (source, checked 2026-09-19) |
| --- | --- | --- | --- | --- |
| Together AI | Software Engineer Intern (Summer 2027) | SF | https://job-boards.greenhouse.io/togetherai/jobs/5232036007 | "Excellent programming skills" and "Experience with version control systems (e.g., Git) and collaborative development workflows." |
| Tyler Technologies | Software Development Intern, Summer 2027 | Lawrenceville, GA | https://jobs.jobvite.com/tylertech/job/oAVOAfwD | "Knowledge of a high-level language and coding principles"; willingness to learn C#, Node, Angular, QA, and cloud frameworks. |
| Epic Games | Tools Programmer Intern | Cary, NC | https://epicgames.com/careers/jobs/6200355004 | **Unavailable** — page returned HTTP 403 to the fetch. |
| CoBank | Software Engineer Intern | Greenwood Village, CO | https://careers.cobank.com/jobs/7940 | **Unavailable** — ATS page served only header/footer template, no rendered job description. |

## Product Management (3 of 4 fetched succeeded)

| Company | Role | Location | Application | Requirement excerpt (checked 2026-09-19) |
| --- | --- | --- | --- | --- |
| Klaviyo | Product Manager Co-op, Spring 2027 | Boston, MA | https://job-boards.greenhouse.io/klaviyocampus/jobs/7990059003 | "Currently pursuing a degree in Computer Science or an adjacent field" with "Strong analytical skills." |
| Duolingo | Associate Product Manager, Intern | — | https://job-boards.greenhouse.io/duolingounirecruitment/jobs/8806188002 | "An instinct for creating simple and intuitive user experiences"; use of "user insights, data, and statistical analyses." |
| Hudl | Product Management Intern | Lincoln, NE | https://job-boards.greenhouse.io/hudl/jobs/8155103 | "Some Product Management exposure" through classes, projects, clubs, or jobs; "comfort with ambiguity." |
| Publicis Groupe | Product Manager Intern - Class of 2028 | Chicago, IL | https://careers.publicisgroupe.com/jobs/172574 | **Unavailable** — page served corporate nav template, not the job description. |

## Data Science, AI & Machine Learning (2 of 3 fetched succeeded)

| Company | Role | Location | Application | Requirement excerpt (checked 2026-09-19) |
| --- | --- | --- | --- | --- |
| MetOx International | Data Science Intern, Spring 2027 | Houston, TX | https://job-boards.greenhouse.io/metoxinternationalinc/jobs/5427064008 | "Basic familiarity with relational databases such as PostgreSQL or MySQL, including writing simple queries." |
| Together AI | Systems Research Engineer Intern - GPU Programming | SF | https://job-boards.greenhouse.io/togetherai/jobs/5238460007 | "Strong background in GPU programming and parallel computing, such as CUDA and/or Triton." |
| DatologyAI | Research Intern | San Mateo, CA | https://jobs.ashbyhq.com/DatologyAI/0ced19c2-21ec-4bcc-92d2-68d448279f3f/application | **Unavailable** — fetch returned only the job title, no requirements content. |

## Quantitative Finance (2 of 2 fetched succeeded)

| Company | Role | Location | Application | Requirement excerpt (checked 2026-09-19) |
| --- | --- | --- | --- | --- |
| Rothesay | 2027 Summer Internship Programme - Quantitative Strategist | London, UK | https://job-boards.greenhouse.io/rothesaygraduates/jobs/8811533002 | "Advanced quantitative skills" and "excellence in applied programming skills - Python, C, C++." |
| Schonfeld | 2027 DMFI Quant Developer Intern | — | https://job-boards.greenhouse.io/schonfeld/jobs/8207942 | "Working knowledge of C++ and/or Python" and "basic understanding of APIs, databases, or distributed systems." |

Bank of Montreal (MFE Associate) and OCC (Model/Quantitative Risk Management Intern) are real listings in this category but use Workday ATS pages, which reliably fail non-JS fetches — not attempted this round to avoid a predictable third failure; noted here as known gaps instead.

## Hardware Engineering (2 of 4 fetched succeeded)

| Company | Role | Location | Application | Requirement excerpt (checked 2026-09-19) |
| --- | --- | --- | --- | --- |
| Belden | R&D Cable Internship | Carmel, IN | https://careers.belden.com/job/Carmel-R&D-Cable-Internship-IN-46032/1431653800/ | "Current enrollment with pursuit of bachelor's degree in Electrical Engineering, Electrical Engineering Technology, or related field." |
| Corning | Imaging Sciences Engineering Intern, Summer 2027 | Keene, NH | https://corningjobs.corning.com/job/Keene-Imaging-Sciences-Engineering-Intern-Summer-2027-NH-03431/1431391900/ | Pursuing a degree in "Optics, Electronics, or related discipline with concentration in Optics or Imaging Science." |
| Eaton | R&D Engineer Intern | Cleveland, TN | https://eaton.eightfold.ai/careers/job/687239185039 | **Unavailable** — Eightfold ATS shell only, no rendered requirements. |
| Qualcomm | IP Applications Engineering Intern | Toronto, ON, Canada | https://qualcomm.eightfold.ai/careers/job/446721156615 | **Unavailable** — same Eightfold JS-rendering limitation. |

## Coverage summary

| Category | Fetched | Succeeded | Target (3 each) |
| --- | --- | --- | --- |
| Software Engineering | 4 | 2 | short by 1 |
| Product Management | 4 | 3 | met |
| Data Science, AI & ML | 3 | 2 | short by 1 |
| Quantitative Finance | 2 | 2 | short by 1 |
| Hardware Engineering | 4 | 2 | short by 1 |
| **Total** | **17** | **11** | short by 4 of 15 |

The main wall is JS-rendered ATS platforms (Workday, Eightfold, and most corporate own-site careers pages): a plain HTML fetch gets a template/config shell, not the real posting. Greenhouse and Jobvite postings consistently rendered real content. Reaching the remaining 4 candidates would need either a JS-capable fetch or manual review of each Workday/Eightfold posting.

## Inclusion/mentorship resources (3 of 3 researched, re-verified 2026-09-19 for eligibility/cost)

| Organization | What they offer | Cost | Eligibility | Source |
| --- | --- | --- | --- | --- |
| Blacks In Technology | "a network for Black Techies to uplift and collaborate with one another through events, media, and various platforms" (LinkedIn/Slack communities) | **Not disclosed on the checked pages** — no fee mentioned, but no explicit "free" statement either; the join page (`https://foundation.blacksintechnology.net/join-bit`) was not fetched this round | **Not explicitly stated** beyond the mission focus ("increasing the representation and participation of Black people in the technology industry"); no formal gatekeeping criteria found | https://www.blacksintechnology.net/about |
| AnitaB.org | Mentorship Program ("89% of participants are promoted within two years"); community forums, networking events | **Tiered**: an "Essential Member" free-ish tier exists (community forums, networking events) but exact price for Essential/Premium/Lifetime tiers is not disclosed on the pages checked; mentorship specifically is a **Premium** membership benefit, not open to Essential members | **Not explicitly stated** — no stated eligibility gate found beyond joining the paid/free tier | https://anitab.org, https://anitab.org/membership/ |
| NCWIT | Research-based programs, mentorship, curriculum support, K-12 through career resources (e.g. TeachEngineering) | **Free** — explicitly stated ("a FREE library of classroom-tested, standards-aligned K-12 STEM resources") | **Broad / not gated**: students K-12 through career, educators, and 1,600+ member organizations; no individual eligibility restriction found | https://www.ncwit.org/about-ncwit/ |

Correction from the first pass: AnitaB.org's mentorship is **not** freely accessible as initially implied — it requires the Premium membership tier specifically, which is a materially different access claim than "membership required" alone. This must be reflected accurately if AnitaB.org is ever used as an inclusion-category resource (do not present the mentorship program as open/free).

None of the three pages disclose an exact price, so "cost" cannot be marked verified-and-final for Blacks In Technology or AnitaB.org — before shipping, this needs either a fetch of the actual join/pricing page or manual confirmation, consistent with `docs/privacy.md`'s requirement that every inclusion-resource claim carry a source URL, excerpt, and checked date (not an assumed cost).

Note: Women Who Code (womenwhocode.com) was also checked and found to have **closed in April 2024** per its own about page; it is deliberately excluded here rather than listed as an active resource, and should not be added to the catalog as a current organization.

## What is still needed before any of this can become shipped catalog data

1. Resolve the source-repo reuse/redistribution terms (open legal question, not something this research resolves).
2. Decide whether to accept the 11/15 role coverage above or invest in JS-capable fetching / manual review to close the remaining 4 gaps, honestly retained as "requirements unavailable" discovery candidates if not closed.
3. Independently re-verify resource eligibility/relevance before any inclusion-category resource is exposed to a user, per `docs/privacy.md`.

## New-grad supplement — independently checked 2026-09-19

Source snapshot: `SimplifyJobs/New-Grad-Positions`, `README.md` at commit
`f996f85487afba30365b19f8188d7682cbecb4ad`. The entries below supplement
the internship-only research above; they do not replace unavailable rows.

| Category | Employer / role | Location | Reviewed excerpt | Employer source |
| --- | --- | --- | --- | --- |
| Software Engineering | Together AI — Software Engineer, New Grad (2027) | San Francisco, CA; onsite | “Experience with version control systems (e.g., Git) and collaborative development workflows.” | https://job-boards.greenhouse.io/togetherai/jobs/5211582007 |
| Data Science / AI / ML | ID.me — Summer 2027 Data Scientist (New Grad) | Mountain View, CA; onsite | “Strong technical skills in Python, SQL, and data analysis libraries (pandas, numpy, scikit-learn).” | https://job-boards.greenhouse.io/idmeuniversityrecruiting/jobs/7986505003 |
| Quantitative Finance | Maven — Graduate Quant Researcher 2027 | Chicago; initial training in London | “Relevant programming experience in at least one language (Python, C++, C#)” | https://job-boards.greenhouse.io/mavensecuritiesholdingltd/jobs/8048830 |

These three employer pages returned requirements and active application forms.
ID.me explicitly requires a master's degree; that constraint must remain visible.
Maven's languages are alternatives: the excerpt must not become an assertion that
Python specifically is mandatory. Rocket Lab posting 7992129003 returned an error
in this check and is not counted as reviewed. Hardware coverage is completed by the independently reviewed row below.

| Category | Employer / role | Location | Reviewed preferred qualification | Employer source |
| --- | --- | --- | --- | --- |
| Hardware Engineering (source category) | Anduril — 2027 Early Career Flight Software Engineer | Costa Mesa, CA | “Basic familiarity with electrical test equipment (such as multimeters or oscilloscopes) and post-flight data analysis using tools like Python or MATLAB.” | https://job-boards.greenhouse.io/andurilindustries/jobs/5228868007 |

Anduril's posting requires U.S.-person status and may require clearance eligibility;
this must not be collapsed into a blanket citizenship-only boolean. The quoted
qualification is preferred and Python/MATLAB are alternatives. It is categorized
as Hardware by the source repository, although the title is Flight Software.

Combined research coverage is now **15 reviewed roles: 11 internships and four
new-grad roles, three in each source category**, plus three researched resources.
This closes the role-count research gap, not seed/schema, excerpt-to-skill mapping,
resource eligibility review, or connected runtime acceptance.
