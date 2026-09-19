export type DemoField = "ml" | "software";
export type DemoAction = {
  id: string;
  kind: string;
  title: string;
  why: string;
  deliverable: string;
  effort: string;
  evidence: string;
  source: string;
  steps: string[];
};

export const sampleProfile = {
  name: "Maya Chen",
  initials: "MC",
  degree: "B.S. Computer Science",
  school: "Sample State University",
  graduation: "May 2028",
  skills: ["Python", "pandas", "scikit-learn", "SQL", "React", "Git"],
  evidence: [
    {
      title: "You turn data into useful answers",
      detail:
        "Compared three classifiers for a campus energy project using Python and scikit-learn.",
      tag: "Campus energy project",
    },
    {
      title: "You can build a complete application",
      detail:
        "Built a React study-group finder and used SQL to organize course and meeting data.",
      tag: "Study-group finder",
    },
    {
      title: "You know how to work with a team",
      detail:
        "Collaborated with three classmates using Git branches and pull requests.",
      tag: "Team project",
    },
  ],
};

export const fields: Record<
  DemoField,
  {
    title: string;
    description: string;
    signal: string;
    actions: DemoAction[];
    roles: { title: string; requirement: string; overlap: string }[];
  }
> = {
  ml: {
    title: "Data science & machine learning",
    description:
      "Build on your Python projects. Make your experiments easier to trust, reproduce, and share.",
    signal:
      "Your next step is showing how you evaluate a model—not starting Python from scratch.",
    actions: [
      {
        id: "ml-evaluation",
        kind: "PROJECT",
        title: "Give your model a proper report card",
        why: "You have already compared three classifiers. Turn that experience into a clear demonstration of how you choose and evaluate a model.",
        deliverable:
          "A reproducible notebook with a baseline, held-out evaluation, and a one-page error analysis.",
        effort: "One focused weekend",
        evidence:
          "Compared three classifiers for a campus energy project using Python and scikit-learn.",
        source:
          "Sample ML internship A: Explain model evaluation choices and communicate experimental results.",
        steps: [
          "Document the train/test split and a simple baseline.",
          "Compare the models using a metric you can explain.",
          "Inspect five errors and write what you would try next.",
        ],
      },
      {
        id: "ml-story",
        kind: "RÉSUMÉ",
        title: "Make the thinking behind your project visible",
        why: "Your project is more specific than “worked with machine learning.” Let a reviewer see the problem, your contribution, and how you evaluated the work.",
        deliverable:
          "One evidence-backed résumé bullet and a short project README.",
        effort: "30–45 minutes",
        evidence:
          "Compared three classifiers for a campus energy project using Python and scikit-learn.",
        source:
          "Sample data internship B: Communicate analytical methods and findings clearly.",
        steps: [
          "Name the problem and the models you compared.",
          "Explain your contribution and evaluation method.",
          "Add a result only if you can verify it; do not invent a metric.",
        ],
      },
      {
        id: "ml-feedback",
        kind: "COMMUNITY",
        title: "Practice explaining your model to a peer",
        why: "You already have team experience. A short walkthrough can help you spot assumptions that are obvious to you but unclear to someone else.",
        deliverable:
          "A five-minute project walkthrough and three notes from a peer review.",
        effort: "One conversation",
        evidence:
          "Collaborated with three classmates using Git branches and pull requests.",
        source:
          "Sample data internship B: Communicate analytical methods and findings clearly.",
        steps: [
          "Invite a classmate to review your notebook.",
          "Explain the model choice without relying on jargon.",
          "Record three questions and improve your README.",
        ],
      },
    ],
    roles: [
      {
        title: "Machine Learning Intern",
        requirement:
          "Explain model evaluation choices and communicate experimental results.",
        overlap: "Python · model comparison",
      },
      {
        title: "Data Science Intern",
        requirement:
          "Use Python or SQL to analyze data; communicate analytical methods and findings clearly.",
        overlap: "Python · SQL · data projects",
      },
    ],
  },
  software: {
    title: "Software engineering",
    description:
      "Build on your study-group app. Show how you turn a useful idea into reliable software.",
    signal:
      "You have a working app. Now show the care that makes it dependable for someone else.",
    actions: [
      {
        id: "swe-tests",
        kind: "PROJECT",
        title: "Make your study-group app dependable",
        why: "Your React and SQL project is a useful starting point. Demonstrate what happens when someone enters unexpected data or a request fails.",
        deliverable:
          "Three meaningful user-flow tests, clear error states, and a short test guide.",
        effort: "One focused weekend",
        evidence:
          "Built a React study-group finder and used SQL to organize course and meeting data.",
        source:
          "Sample software internship A: Build web features and test important user workflows.",
        steps: [
          "Choose the create, join, and search workflows.",
          "Test a successful case and an invalid-input case.",
          "Document how to run the tests and reproduce a failure.",
        ],
      },
      {
        id: "swe-story",
        kind: "RÉSUMÉ",
        title: "Tell the story behind your full-stack app",
        why: "You can connect your frontend work to how the data is organized. Describe your specific contribution so reviewers do not have to guess.",
        deliverable:
          "A concise project description with an architecture sketch and one truthful résumé bullet.",
        effort: "30–45 minutes",
        evidence:
          "Built a React study-group finder and used SQL to organize course and meeting data.",
        source:
          "Sample software internship B: Explain technical decisions and collaborate through code review.",
        steps: [
          "Sketch the path from a screen to a database query.",
          "Describe one tradeoff you made.",
          "Write a bullet using only work you actually completed.",
        ],
      },
      {
        id: "swe-review",
        kind: "COMMUNITY",
        title: "Turn a pull request into a learning moment",
        why: "You have already used branches and pull requests with classmates. Ask for focused feedback on a small change and show how you respond.",
        deliverable:
          "One reviewed pull request with a clear description and a response to feedback.",
        effort: "One conversation",
        evidence:
          "Collaborated with three classmates using Git branches and pull requests.",
        source:
          "Sample software internship B: Explain technical decisions and collaborate through code review.",
        steps: [
          "Pick one small improvement in the study-group app.",
          "Ask a classmate to review readability and edge cases.",
          "Resolve the feedback and summarize what changed.",
        ],
      },
    ],
    roles: [
      {
        title: "Software Engineering Intern",
        requirement: "Build web features and test important user workflows.",
        overlap: "React · SQL · web development",
      },
      {
        title: "Full-stack Engineering Intern",
        requirement:
          "Explain technical decisions and collaborate through code review.",
        overlap: "Git · collaboration · application design",
      },
    ],
  },
};
