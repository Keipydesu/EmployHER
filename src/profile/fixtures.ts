import type { Extracted, ReviewedPath } from "./contracts";
export const resumeFixtures = [
  {
    id: "data-student",
    title: "Maya · Data explorer",
    description: "Coursework, a survey project, and Python.",
    text: "SYNTHETIC RESUME — DATA STUDENT\nSkills: Python, SQL\nSurvey project: Cleaned survey data with Python and wrote SQL queries.\nEducation: BSc Computer Science, Example University, expected 2027.",
    facts: [
      {
        kind: "skill",
        label: "Python",
        detail: "",
        dateText: null,
        excerpt: "Skills: Python, SQL",
      },
      {
        kind: "skill",
        label: "SQL",
        detail: "",
        dateText: null,
        excerpt: "Skills: Python, SQL",
      },
      {
        kind: "experience",
        label: "Survey project",
        detail: "Cleaned survey data with Python and wrote SQL queries.",
        dateText: null,
        excerpt:
          "Survey project: Cleaned survey data with Python and wrote SQL queries.",
      },
      {
        kind: "education",
        label: "BSc Computer Science",
        detail: "Example University",
        dateText: "expected 2027",
        excerpt:
          "Education: BSc Computer Science, Example University, expected 2027.",
      },
    ],
  },
  {
    id: "frontend-builder",
    title: "Alex · Frontend builder",
    description: "A class website and accessible interfaces.",
    text: "SYNTHETIC RESUME — FRONTEND STUDENT\nSkills: JavaScript, HTML, CSS\nClass website: Built a keyboard-accessible website with JavaScript.\nEducation: BSc Computing, Sample College.",
    facts: [
      {
        kind: "skill",
        label: "JavaScript",
        detail: "",
        dateText: null,
        excerpt: "Skills: JavaScript, HTML, CSS",
      },
      {
        kind: "experience",
        label: "Class website",
        detail: "Built a keyboard-accessible website with JavaScript.",
        dateText: null,
        excerpt:
          "Class website: Built a keyboard-accessible website with JavaScript.",
      },
      {
        kind: "education",
        label: "BSc Computing",
        detail: "Sample College",
        dateText: null,
        excerpt: "Education: BSc Computing, Sample College.",
      },
    ],
  },
  {
    id: "volunteer",
    title: "Sam · Community organizer",
    description: "Transferable experience without assumed tech skills.",
    text: "SYNTHETIC RESUME — VOLUNTEER\nCommunity project: Organized weekly volunteer meetings and documented action items.\nEducation: BA Communication, Example University.",
    facts: [
      {
        kind: "experience",
        label: "Community project",
        detail:
          "Organized weekly volunteer meetings and documented action items.",
        dateText: null,
        excerpt:
          "Community project: Organized weekly volunteer meetings and documented action items.",
      },
      {
        kind: "education",
        label: "BA Communication",
        detail: "Example University",
        dateText: null,
        excerpt: "Education: BA Communication, Example University.",
      },
    ],
  },
  {
    id: "ambiguous",
    title: "Jordan · Clarify the evidence",
    description: "Assisted a project; ownership is not inferred.",
    text: "SYNTHETIC RESUME — PROJECT CONTRIBUTOR\nResearch helper: Assisted a team using Python. My individual technical contribution is not described.\nEducation: Studying Statistics.",
    facts: [
      {
        kind: "experience",
        label: "Research helper",
        detail:
          "Assisted a team using Python. My individual technical contribution is not described.",
        dateText: null,
        excerpt:
          "Research helper: Assisted a team using Python. My individual technical contribution is not described.",
      },
      {
        kind: "education",
        label: "Studying Statistics",
        detail: "",
        dateText: null,
        excerpt: "Education: Studying Statistics.",
      },
    ],
  },
  {
    id: "no-evidence",
    title: "Empty evidence case",
    description: "Exercises an honest no-evidence response.",
    text: "SYNTHETIC RESUME — EMPTY CASE\nI am exploring what I want to do next. No skills, education or experience are described.",
    facts: [],
  },
] satisfies {
  id: string;
  title: string;
  description: string;
  text: string;
  facts: Extracted["facts"];
}[];
export const demoPaths: ReviewedPath[] = [
  {
    id: "data",
    version: 1,
    title: "Data exploration (synthetic checklist)",
    requirements: [
      {
        id: "sample-python",
        skill: "Python",
        excerpt: "Use Python to clean and inspect data.",
      },
    ],
  },
  {
    id: "software",
    version: 1,
    title: "Software engineering (synthetic checklist)",
    requirements: [
      {
        id: "sample-js",
        skill: "JavaScript",
        excerpt: "Build interfaces with JavaScript.",
      },
    ],
  },
];
