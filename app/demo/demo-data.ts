export type DemoField = "ml" | "software";
export type DemoProfile = {
  id: string;
  name: string;
  initials: string;
  local: boolean;
  degree: string;
  school: string;
  graduation: string;
  summary: string;
  skills: string[];
  projects: { title: string; description: string }[];
  evidence: { title: string; detail: string; tag: string }[];
  researchBullet: string;
  softwareBullet: string;
};
export type DemoAction = {
  id: string;
  kind: string;
  title: string;
  why: string;
  deliverable: string;
  effort: string;
  evidence: string;
  source: string;
  firstSession: string;
  timing: string;
  steps: string[];
  artifacts: { name: string; detail: string }[];
  done: string[];
  example: { title: string; text: string };
  resource: { title: string; url: string; use: string };
};

// Operator-approved public profile from main. Contact details and source PDF are excluded.
export const sampleProfile: DemoProfile = {
  id: "julia-demo-v1",
  name: "Julia Thomas",
  initials: "JT",
  local: false,
  degree: "B.S. Computer Engineering · GPA 4.0",
  school: "Kennesaw State University · Journey Honors College",
  graduation: "May 2029",
  summary:
    "Research experience at Georgia Tech and KSU in hyperdimensional computing, robot fault diagnosis, language-guided robotics, and computer vision. Seeking machine learning and robotics opportunities.",
  skills: [
    "Python",
    "C/C++",
    "PyTorch",
    "TensorFlow",
    "OpenCV",
    "GroundingDINO",
    "Isaac Sim / Lab",
    "Ollama / MCP",
    "Ruby on Rails",
    "PostgreSQL",
    "Playwright",
    "Docker",
  ],
  projects: [
    {
      title: "Few-Shot Robot IMU Fault Diagnosis · Georgia Tech",
      description:
        "Developed an HDC pipeline for cross-axis fault diagnosis. Reported 79–81% timely diagnosis of injected abrupt faults on two held-out robot recording sessions, using one labeled example per fault type. Compared nearest-neighbor, centroid, and Extra Trees baselines.",
    },
    {
      title: "Language-guided robotics · KSU Research Assistant",
      description:
        "Integrates small language models, Ollama, MCP, OpenCV, GroundingDINO, and robotic hardware. Uses Isaac Sim/Lab, behavior trees, Python clients/servers, REST, and JSON-RPC.",
    },
    {
      title: "Otostoper carpool coordination platform",
      description:
        "Rails/PostgreSQL application with route-aware assignments, plan snapshots, Google Maps APIs, a local fallback provider, and background recalculation. Includes Rails, system, and Playwright end-to-end tests.",
    },
    {
      title: "Thermal-imaging drone & calendar automation",
      description:
        "Custom Pixhawk drone with a thermal camera payload and sensor processing; separate OCR tool parses dates and time zones into Google Calendar events.",
    },
  ],
  evidence: [
    {
      title: "You already evaluate few-shot ML systems",
      detail:
        "Benchmarked HDC against nearest-neighbor, centroid, and Extra Trees; analyzed accuracy, false alarms, latency, and model storage.",
      tag: "Georgia Tech · IMU fault diagnosis",
    },
    {
      title: "You connect language, vision, and robots",
      detail:
        "Integrate Python-based MCP clients and servers with REST APIs, JSON-RPC, Raspberry Pi hardware, servos, cameras, and physical robot actuators.",
      tag: "KSU · Research Assistant",
    },
    {
      title: "You already build and test full-stack software",
      detail:
        "Built a responsive interface using Hotwire, Stimulus, Bootstrap, and SCSS; added automated Rails, system, and Playwright end-to-end tests.",
      tag: "Otostoper · Rails/PostgreSQL",
    },
  ],
  researchBullet:
    "Developed a few-shot HDC pipeline for cross-axis robot IMU fault diagnosis; achieved 79–81% timely diagnosis of injected abrupt faults across two held-out recording sessions using one labeled example per fault type.",
  softwareBullet:
    "Built a Rails/PostgreSQL carpool coordination platform with route-aware assignments, plan snapshots, Google Maps API integration and fallback, background recalculation, and Rails/system/Playwright tests.",
};

const validationGuide = {
  title: "scikit-learn: cross-validation",
  url: "https://scikit-learn.org/stable/modules/cross_validation.html",
  use: "Review grouped and time-aware splits before deciding how to keep recordings independent. This is a reference, not a course you need to complete.",
};
const simulationGuide = {
  title: "Isaac Lab: official quickstart",
  url: "https://isaac-sim.github.io/IsaacLab/main/source/setup/quickstart.html",
  use: "Use the environment/task structure as a reference for a small, repeatable simulation. Stay with the version your existing project supports.",
};
const testingGuide = {
  title: "Rails: testing applications",
  url: "https://guides.rubyonrails.org/testing.html",
  use: "Look up the job and system-test sections when translating each failure scenario into an automated regression.",
};

export function buildFields(profile: DemoProfile): Record<
  DemoField,
  {
    title: string;
    description: string;
    signal: string;
    target: string;
    timing: string;
    actions: DemoAction[];
    roles: {
      title: string;
      requirement: string;
      overlap: string;
      query: string;
      check: string;
    }[];
  }
> {
  return {
    ml: {
      title: "Applied ML & robotics",
      description:
        "Turn your sensor research and robot integrations into two inspectable technical artifacts and a focused internship pitch.",
      signal:
        "Your strongest story is the bridge between experimental ML and working robotic systems.",
      target:
        "Applied ML internships · Robotics software internships · Undergraduate research",
      timing: `Expected graduation: ${profile.graduation}. Check each role’s enrollment and graduation window; a new-grad listing may be premature.`,
      actions: [
        {
          id: "ml-evaluation",
          kind: "RESEARCH PORTFOLIO",
          title: "Package a reproducible sensor-fault benchmark",
          why: `Your résumé already describes evaluation in ${profile.projects[0].title}. Make that existing work inspectable: show the split, baselines, and tradeoffs behind the result. This is a packaging and extension task, not a claim that you lack evaluation skills.`,
          deliverable:
            "A runnable benchmark, a results table for every held-out recording, and a one-page analysis of failure cases.",
          effort: "6–8 hours across 3 sessions",
          timing: "Start here · Days 1–3",
          evidence: profile.evidence[0].detail,
          source:
            "ML research role: compare baselines, explain the evaluation split, and report failure modes.",
          firstSession:
            "In the next 45 minutes, create a benchmark folder and a manifest listing recording ID, sensor axis, fault type, and train/test assignment. Write down what counts as a timely detection before running anything.",
          steps: [
            "Create split-manifest.csv. Assign entire recording sessions to train or test so related windows do not appear on both sides. Document whether target-axis examples are excluded.",
            "Expose your existing method and two simple baselines through the same evaluation function. Reuse identical test recordings and preprocessing fitted only on training data.",
            "Export one row per method × test recording: fault count, timely detections, missed faults, false alerts per minute, median detection delay, inference time, and model size. Keep units and denominators explicit.",
            "Inspect at least three false alarms or missed detections. Plot the signal around each event and describe one plausible failure cause without claiming it is proven.",
            "Add a fixed seed, environment instructions, and a single run command. Ask a peer to reproduce one result. Use shareable or generated example data when the original research data cannot be distributed.",
          ],
          artifacts: [
            {
              name: "split-manifest.csv",
              detail:
                "recording_id, axis, fault_type, split; a short note explaining how leakage is avoided.",
            },
            {
              name: "results.csv",
              detail:
                "One row per method and recording; include denominators, time units, and the hardware used for timing.",
            },
            {
              name: "REPORT.md",
              detail:
                "Problem → experimental setup → comparison table → three failure plots → limitations.",
            },
          ],
          done: [
            "A second person can reproduce one result using the README.",
            "Every reported percentage includes its denominator and evaluation condition.",
            "The report distinguishes observed results from proposed improvements.",
          ],
          example: {
            title: "Example result schema — fill it with measurements",
            text: "method,recording_id,fault_count,timely_detected,false_alerts_per_min,median_delay_ms,model_kb\n<method>,<held-out-session>,<count>,<count>,<measured>,<measured>,<measured>\n\nInterview prompt: Why would a lower-accuracy model still be useful if its latency or storage cost is smaller?",
          },
          resource: validationGuide,
        },
        {
          id: "ml-robotics",
          kind: "ROBOTICS PROJECT",
          title: "Build a 20-command robot evaluation demo",
          why: "You already connect language, vision, and robot actions. Show where that pipeline succeeds, when it asks for clarification, and how it handles an unsupported command.",
          deliverable:
            "A 90-second simulation video, 20 repeatable command cases, and a trace from user instruction to robot action.",
          effort: "8–12 hours using your existing setup",
          timing: "Then build · Days 4–8",
          evidence: profile.evidence[1].detail,
          source:
            "robotics software role: integrate perception and control, validate behavior, and explain system failures.",
          firstSession:
            "Choose one existing simulated robot and one tabletop scene. Limit the demo to three supported actions: identify an object, approach a target, and stop. Write the supported command contract before adding more behaviors.",
          steps: [
            "Define a JSON action schema containing action, target, and status. Validate tool arguments before handing them to the simulator; keep the model’s free-form response separate from executable actions.",
            "Write 20 fixed prompts: 10 supported commands, 5 ambiguous references, and 5 unsupported requests. Specify the expected behavior for every prompt before testing.",
            "Log each stage: text request → parsed intent → detected object → planned action → simulator outcome. For ambiguity, return a clarification instead of guessing a target.",
            "Run every case from a reset scene. Record success by category, clarification correctness, invalid-action rejection, and end-to-end response time.",
            "Record a 90-second video showing a successful command, an ambiguous command, and an unsupported command. Add an architecture diagram and one known limitation.",
          ],
          artifacts: [
            {
              name: "commands.json",
              detail:
                "20 prompts with expected actions or clarification/rejection responses.",
            },
            {
              name: "traces.jsonl",
              detail:
                "One complete trace per run, with stage timing and outcome.",
            },
            {
              name: "demo.mp4 + architecture.svg",
              detail:
                "A short narrated walkthrough and a readable language/vision/planning/control diagram.",
            },
          ],
          done: [
            "All 20 prompts have an expected and observed outcome.",
            "Ambiguous targets do not silently select an object.",
            "The video includes one failure case and explains how the system responds.",
          ],
          example: {
            title: "Three cases to put in commands.json",
            text: 'Supported: “Identify the red cube.” → identify(target="red cube")\nAmbiguous: “Move toward that one.” → ask which target\nUnsupported: “Fly outside the room.” → reject; no simulator action\n\nThese are proposed test cases, not claims about your current implementation.',
          },
          resource: simulationGuide,
        },
        {
          id: "ml-packet",
          kind: "CAREER ACTION",
          title: "Prepare a research internship evidence packet",
          why: "Your research and integration work support a focused applied-ML/robotics story. Package those examples so a mentor or reviewer can understand your contribution quickly.",
          deliverable:
            "A one-page project brief, a 90-second interview story, and three verified internship or research targets.",
          effort: "2–3 hours, then one review conversation",
          timing: "Share the evidence · Days 9–10",
          evidence: profile.evidence[0].detail,
          source:
            "undergraduate research role: explain your contribution and experimental reasoning. Actual opportunities still require date and eligibility checks.",
          firstSession:
            "Draft a one-page brief with five headings: Problem, My contribution, Evaluation, Limitations, Next experiment. Use your existing results; add portfolio links once the earlier artifacts are ready.",
          steps: [
            "Write the research brief. Separate your individual work from team work and keep the original scope of each metric; do not turn a fault-detection result into a general robot accuracy claim.",
            "Rehearse a 90-second answer: 15 seconds for the problem, 30 for your contribution, 30 for evaluation, and 15 for the next experiment. Record it once and remove unexplained acronyms.",
            "Find three actual targets using the role searches below. Record the official URL, application deadline, location, degree level, graduation window, and the exact requirement you can evidence.",
            "Ask one existing research advisor or lab peer for a 15-minute review of the brief. Ask specifically whether your contribution and evaluation claims are understandable.",
            "Tailor one résumé version to the best verified target. Use the evidence-backed bullet below and send an application only after checking eligibility yourself.",
          ],
          artifacts: [
            {
              name: "research-brief.pdf",
              detail:
                "One page with one comparison table, one limitation, and links to shareable artifacts.",
            },
            {
              name: "targets.csv",
              detail:
                "role, official_url, deadline, enrollment_window, location, matched_evidence, question_to_verify.",
            },
            {
              name: "interview-notes.md",
              detail:
                "90-second explanation plus answers about data leakage, latency, and your individual contribution.",
            },
          ],
          done: [
            "Three targets have current official links and eligibility notes.",
            "A peer can explain what you personally contributed after reading the brief.",
            "Every résumé number matches the original evidence and conditions.",
          ],
          example: {
            title: "Draft review request — edit and send yourself",
            text: `Hi [advisor/peer], I’m preparing for applied ML and robotics opportunities. I put together a one-page brief on ${profile.projects[0].title}. Could you spend 15 minutes checking whether my individual contribution, evaluation setup, and limitations are clear? I’d especially value one question a reviewer is likely to ask. Thank you!\n\nSuggested résumé bullet:\n${profile.researchBullet}`,
          },
          resource: validationGuide,
        },
      ],
      roles: [
        {
          title: "Applied ML / Research Engineering Intern",
          requirement:
            "Explain experimental design, compare baselines, and communicate limitations.",
          overlap: "Sensor experiments · Python · model evaluation",
          query: '"machine learning intern" "undergraduate" "2027"',
          check:
            "Some research internships require graduate enrollment. Verify degree level and the employer’s exact graduation window.",
        },
        {
          title: "Robotics Software / Perception Intern",
          requirement:
            "Integrate perception with robot behavior and evaluate repeatable scenarios.",
          overlap: "Simulation · vision · Python/C++ · robot integration",
          query: '"robotics software intern" "undergraduate" "2027"',
          check:
            "Check location, hardware access, enrollment dates, and any explicit ROS/C++ requirements; none are inferred as missing skills.",
        },
      ],
    },
    software: {
      title: "Software engineering",
      description:
        "Use your existing Rails application to demonstrate reliable background work, explain a real design decision, and prepare a targeted application.",
      signal:
        "You already build and test applications. Make the failure handling and engineering decisions easy to inspect.",
      target:
        "Backend internships · Full-stack internships · Developer tools internships",
      timing: `Expected graduation: ${profile.graduation}. Focus searches on student internships and confirm each listing’s eligibility.`,
      actions: [
        {
          id: "swe-tests",
          kind: "RELIABILITY PROJECT",
          title: "Prove your background jobs handle failure",
          why: "Your résumé already includes background jobs, external API integration, fallback behavior, and automated tests. Extend that work with a small, documented failure matrix.",
          deliverable:
            "Five failure scenarios, repeatable job/system tests, and a table showing the expected recovery behavior.",
          effort: "4–6 hours",
          timing: "Start here · Days 1–3",
          evidence: profile.evidence[2].detail,
          source:
            "backend internship: test asynchronous workflows and explain how failures affect stored state.",
          firstSession:
            "Choose the job that recalculates a plan after an input changes. Write down the expected state before and after an external API timeout, then turn that one scenario into a test.",
          steps: [
            "Create a five-row matrix: API timeout, rate limit, duplicate job delivery, stale input while a job runs, and exhausted retries. Write the expected persisted state and user-visible message for each.",
            "Stub the external provider so every failure is reproducible. Keep successful and fallback responses visibly distinguishable in the test fixture.",
            "Run the same job twice with the same input. Assert that there is only one effective result and no duplicate assignment or other side effect.",
            "Change the input while an older job is pending. Assert that the older result cannot overwrite the new plan; document the version or freshness check you use.",
            "Add a system test for one recovery path and a short README showing the command to run the five cases. Record actual results without inventing uptime claims.",
          ],
          artifacts: [
            {
              name: "failure-matrix.md",
              detail:
                "Scenario, expected database state, expected UI state, retry/fallback behavior, and test name.",
            },
            {
              name: "job regression tests",
              detail:
                "Five repeatable scenarios with deterministic provider stubs.",
            },
            {
              name: "recovery-demo.mp4",
              detail:
                "A one-minute recording of a failure followed by a clear recovery.",
            },
          ],
          done: [
            "All five scenarios can be triggered without a live API.",
            "Duplicate delivery does not duplicate the effective result.",
            "An older job cannot silently replace a newer plan.",
          ],
          example: {
            title: "Example failure-matrix row",
            text: "Scenario: destination changes while recalculation is running\nExpected data: only the newest input version can become the active plan\nExpected UI: recalculating, then show the current plan\nTest: finish the newer job first, then the older one; assert the active version stays newer",
          },
          resource: testingGuide,
        },
        {
          id: "swe-story",
          kind: "TECHNICAL CASE STUDY",
          title: "Write the architecture story behind your app",
          why: "A framework list hides the interesting work. Show how a request moves through your application, what gets stored, and the tradeoff behind your fallback design.",
          deliverable:
            "A one-page architecture case study with a sequence diagram and a truthful project bullet.",
          effort: "2–3 hours",
          timing: "Explain the decisions · Days 4–5",
          evidence: profile.evidence[2].detail,
          source:
            "full-stack internship: explain data flow, API integration, and technical tradeoffs.",
          firstSession:
            "Sketch one path: user edits an input → database saves it → background job requests external data → plan snapshot updates → UI refreshes. Label where version checks and fallback decisions occur.",
          steps: [
            "Draw the five-stage request/job/data flow using your existing implementation.",
            "Choose one decision: storing plan snapshots, recalculating asynchronously, or falling back when a provider fails. Compare it with one alternative.",
            "Add a failure scenario from the previous task and link to its test.",
            "Write a 150-word explanation of your individual contribution. Include an observed limitation and what you would improve next.",
            "Ask a peer to trace one request through the diagram without your help, then revise any confusing labels.",
          ],
          artifacts: [
            {
              name: "architecture.svg",
              detail:
                "Request, database, background worker, external provider, and UI update with labeled arrows.",
            },
            {
              name: "CASE-STUDY.md",
              detail:
                "Context, one decision, alternative considered, failure behavior, evidence, and next improvement.",
            },
          ],
          done: [
            "The diagram matches the actual implementation.",
            "A test or code reference supports each behavior claim.",
            "Your personal contribution is distinct from the technology list.",
          ],
          example: {
            title: "A grounded résumé bullet",
            text: `${profile.softwareBullet}\n\nInterview prompt: What happens if the external provider fails after a user changes the input twice?`,
          },
          resource: testingGuide,
        },
        {
          id: "swe-review",
          kind: "CAREER ACTION",
          title: "Turn your case study into three targeted applications",
          why: "Your full-stack work gives you an example to discuss. A short target list helps you adapt that evidence to actual internship requirements instead of sending the same résumé everywhere.",
          deliverable:
            "Three verified targets, a tailored project section, and one mock technical conversation.",
          effort: "2–3 hours plus a 20-minute review",
          timing: "Use the evidence · Days 6–7",
          evidence: profile.evidence[2].detail,
          source:
            "software internship: demonstrate an application project and explain engineering decisions. Actual dates and eligibility must be checked on official listings.",
          firstSession:
            "Find one backend or full-stack student internship on an official employer site. Copy its enrollment window, deadline, and two exact requirements into targets.csv.",
          steps: [
            "Build a three-row target list with official links, deadlines, locations, and enrollment/graduation requirements.",
            "Map two exact requirements per role to existing project evidence. Mark anything unclear as a question rather than a confirmed gap.",
            "Tailor the project section to the most relevant requirement: asynchronous jobs, data modeling, testing, or API integration.",
            "Have a peer ask you to explain one request flow, one failure, and one tradeoff in 20 minutes.",
            "Apply to the verified target yourself and record the date and next follow-up. Keep track of applications and follow-ups in your own records.",
          ],
          artifacts: [
            {
              name: "targets.csv",
              detail:
                "Official URL, deadline, eligibility, two requirements, and the exact project evidence for each.",
            },
            {
              name: "targeted-project-section.md",
              detail:
                "One concise project paragraph and two truthful bullets tailored to one role.",
            },
          ],
          done: [
            "Each target has an official source and an eligibility check.",
            "Each tailored claim is supported by existing work.",
            "You can explain one failure scenario without reading your notes.",
          ],
          example: {
            title: "Peer review request",
            text: "Could you do a 20-minute mock interview on my application project? Please ask me to trace an input change through the database and background job, explain one provider failure, and defend one design tradeoff. I’ll send the one-page case study first.",
          },
          resource: testingGuide,
        },
      ],
      roles: [
        {
          title: "Backend Software Engineering Intern",
          requirement:
            "Build and test server-side workflows, data persistence, and API integrations.",
          overlap: "Rails · PostgreSQL · background jobs · testing",
          query: '"backend software intern" "2027" "undergraduate"',
          check:
            "Verify the language requirements, enrollment window, location, and whether the role accepts your graduation year.",
        },
        {
          title: "Full-stack Engineering Intern",
          requirement:
            "Explain a feature from user interaction through stored state and recovery from failure.",
          overlap: "Full-stack delivery · API fallback · system tests",
          query: '"full stack intern" "2027" "student"',
          check:
            "Compare the exact stack requirements with your evidence; a different framework is not automatically a disqualifier.",
        },
      ],
    },
  };
}

export const demoCommunities = [
  {
    name: "Rewriting the Code",
    tag: "Find your student community",
    description:
      "A community for university students and early-career technologists, with peer interview practice, résumé reviews, and career events.",
    next: "Explore the student community, then prepare a short introduction about your current project and ask for a peer interview-practice partner.",
    access: "Free student membership; applications are reviewed.",
    url: "https://rewritingthecode.org/students/",
    link: "Explore RTC membership",
  },
  {
    name: "Women in Robotics",
    tag: "Meet people in your field",
    description:
      "A global network for women working in robotics or interested in entering it, with local chapters and an online community. Non-binary people are welcome.",
    next: "Explore a chapter or the online community. Bring your robot evaluation diagram and one question about testing language-guided robots to a conversation.",
    access: "Check the current chapter and event details before joining.",
    url: "https://www.womeninrobotics.org/chapters/",
    link: "Find a robotics community",
  },
  {
    name: "AnitaB.org",
    tag: "Grow your professional network",
    description:
      "A tech community offering discussion forums, networking events, and volunteer opportunities. Mentorship is listed among Premium membership benefits.",
    next: "Compare membership options and choose a relevant networking event. Prepare a 30-second project introduction and two questions for someone in your target role.",
    access:
      "Benefits vary by membership tier; check current pricing and event access.",
    url: "https://www.anitab.org/membership",
    link: "Explore AnitaB.org membership",
  },
];
