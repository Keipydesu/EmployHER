import type { DemoField } from "./demo-data";

// Fictional people and reserved example.com addresses for the public demo.
export const demoPeers: Record<
  DemoField,
  {
    name: string;
    field: string;
    background: string;
    shared: string[];
    goal: string;
    email: string;
  }[]
> = {
  ml: [
    {
      name: "Priya Shah",
      field: "Applied machine learning",
      background:
        "Computer engineering student studying anomaly detection in wearable sensor recordings.",
      shared: ["Python", "PyTorch", "Sensor research"],
      goal: "Compare evaluation splits and review a sensor benchmark together.",
      email: "priya.shah@example.com",
    },
    {
      name: "Elena Brooks",
      field: "Robotics & perception",
      background:
        "Robotics club developer building language-guided object sorting in simulation.",
      shared: ["Isaac Lab", "OpenCV", "Robot simulation"],
      goal: "Trade feedback on robot traces and a short portfolio demo.",
      email: "elena.brooks@example.com",
    },
    {
      name: "Jordan Rivera",
      field: "ML systems engineering",
      background:
        "Computer science student connecting lightweight classifiers to tested Python applications.",
      shared: ["Python", "Model evaluation", "Automated testing"],
      goal: "Practice explaining baselines, false alerts, and failure cases.",
      email: "jordan.rivera@example.com",
    },
  ],
  software: [
    {
      name: "Amara Lewis",
      field: "Full-stack engineering",
      background:
        "Computer science student building a campus volunteer planner with Rails and PostgreSQL.",
      shared: ["Ruby on Rails", "PostgreSQL", "Campus applications"],
      goal: "Review each other’s portfolio walkthrough and application design.",
      email: "amara.lewis@example.com",
    },
    {
      name: "Sofia Park",
      field: "Backend engineering",
      background:
        "Software engineering student adding background jobs and reliable API fallbacks to a student project.",
      shared: ["Background jobs", "API integration", "PostgreSQL"],
      goal: "Pair on a five-scenario failure matrix and regression tests.",
      email: "sofia.park@example.com",
    },
    {
      name: "Alex Morgan",
      field: "Software quality engineering",
      background:
        "Computer engineering student writing browser tests for a club event application.",
      shared: ["Playwright", "System tests", "Full-stack applications"],
      goal: "Exchange test plans and practice a project interview together.",
      email: "alex.morgan@example.com",
    },
  ],
};
