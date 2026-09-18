import {
  JobSchema,
  ResourceSchema,
  ProfileSchema,
  skills,
  type Job,
  type Path,
  type Profile,
  type Resource,
  type Skill,
} from "./contracts.ts";

export const snapshot = "synthetic-opportunities-v1";
export const embeddingConfig = "synthetic-skill-basis-v1";
export const checkedAt = "2026-09-18T00:00:00.000Z";
export function vectorFor(input: Skill[]): number[] {
  return skills.map((skill) => (input.includes(skill) ? 1 : 0));
}
const definitions: {
  id: string;
  title: string;
  parentId: string | null;
  skills: Skill[];
}[] = [
  {
    id: "software",
    title: "Software Engineering",
    parentId: null,
    skills: ["python", "git", "testing"],
  },
  {
    id: "cloud",
    title: "Cloud / Infrastructure",
    parentId: "software",
    skills: ["python", "git", "cloud", "access", "monitoring"],
  },
  { id: "security", title: "Cybersecurity", parentId: "software", skills: [] },
  {
    id: "ml",
    title: "Data Science, AI & ML",
    parentId: null,
    skills: ["python", "sql", "statistics", "modeling"],
  },
  {
    id: "product",
    title: "Product Management",
    parentId: null,
    skills: ["research", "statistics"],
  },
  { id: "quant", title: "Quantitative Finance", parentId: null, skills: [] },
  {
    id: "hardware",
    title: "Hardware Engineering",
    parentId: null,
    skills: ["circuits", "testing"],
  },
];
// Deliberately invented employers and requirements, never source-derived vacancies.
export const jobs: Job[] = definitions
  .filter((p) => p.skills.length)
  .flatMap((path, p) =>
    Array.from({ length: 3 }, (_, i) => {
      const id = `demo-${path.id}-${i + 1}`;
      return JobSchema.parse({
        id,
        version: 1,
        sourceKey: id,
        sourceRepo: "synthetic-fixture",
        sourceCommit: snapshot,
        sourceUrl: "https://example.org",
        applyUrl: null,
        checkedAt,
        title: `${path.title} ${i === 0 ? "Intern" : "Associate"}`,
        company: `Illustrative Studio ${p + 1}`,
        pathId: path.id,
        roleType: i === 0 ? "internship" : "new-grad",
        location: i === 1 ? "Georgia" : i === 2 ? "unknown" : "US",
        remote: i === 1 ? "onsite" : i === 2 ? "unknown" : "remote",
        status: "open",
        requirements: path.skills.map((skill) => ({
          id: `${id}-${skill}`,
          skill,
          text: `Demonstrate ${skill} through a project or coursework.`,
          excerpt: `Demonstrate ${skill} through a project or coursework.`,
          importance: "required",
        })),
        embedding: vectorFor(path.skills),
        eligibility: {
          noSponsorship: i === 1 ? true : null,
          citizenship: null,
          advancedDegree: i === 2 ? true : null,
        },
        synthetic: true,
      });
    }),
  );
jobs.push({
  ...jobs[0],
  id: "demo-discovery",
  sourceKey: "demo-discovery",
  title: "Software Discovery Example",
  requirements: [],
  embedding: vectorFor(["git"]),
});
jobs.push({
  ...jobs[1],
  id: "demo-closed",
  sourceKey: "demo-closed",
  status: "closed",
});
export const paths: Path[] = definitions.map((p) => ({
  id: p.id,
  title: p.title,
  parentId: p.parentId,
  version: 1,
  checkpoints: p.skills.map((skill) => ({
    skill,
    requirementIds: jobs
      .filter((j) => j.pathId === p.id && j.status === "open")
      .flatMap((j) =>
        j.requirements.filter((r) => r.skill === skill).map((r) => r.id),
      ),
  })),
}));
const resource = (
  id: string,
  title: string,
  kind: Resource["kind"],
  url: string,
  pathIds: string[],
  skill: Skill | null,
  claim: string,
  inclusionCategory: Resource["inclusionCategory"] = null,
): Resource =>
  ResourceSchema.parse({
    id,
    version: 1,
    title,
    kind,
    url,
    pathIds,
    skill,
    claim,
    excerpt: title,
    checkedAt,
    expiresAt: "2026-10-02T00:00:00.000Z",
    reviewStatus: "reviewed",
    region: "Online; verify program location",
    eligibility: "Check the official site; availability is not guaranteed.",
    cost: "Cost not verified",
    prerequisites: "Check official prerequisites",
    inclusionCategory,
  });
export const resources: Resource[] = [
  resource(
    "python",
    "Python tutorial",
    "course",
    "https://docs.python.org/3/tutorial/",
    ["software", "cloud", "ml"],
    "python",
    "Official Python language tutorial.",
  ),
  resource(
    "git",
    "Learn Git",
    "project_guide",
    "https://git-scm.com/book/en/v2",
    ["software", "cloud"],
    "git",
    "The Pro Git book is available to read online.",
  ),
  resource(
    "cloud",
    "Cloud learning starting point",
    "course",
    "https://aws.amazon.com/training/",
    ["cloud"],
    "cloud",
    "AWS training discovery page; specific course costs and prerequisites need checking.",
  ),
  resource(
    "ml",
    "Machine learning course",
    "course",
    "https://developers.google.com/machine-learning/crash-course",
    ["ml"],
    "modeling",
    "Google Machine Learning Crash Course.",
  ),
  resource(
    "research",
    "User research guidance",
    "project_guide",
    "https://www.gov.uk/service-manual/user-research",
    ["product"],
    "research",
    "UK Government Service Manual guidance on user research.",
  ),
  resource(
    "hardware",
    "Arduino documentation",
    "project_guide",
    "https://docs.arduino.cc/",
    ["hardware"],
    "circuits",
    "Arduino hardware and software documentation.",
  ),
  resource(
    "tag",
    "Technology Association of Georgia",
    "community",
    "https://www.tagonline.org/",
    ["software", "cloud", "security", "ml", "product", "hardware", "quant"],
    null,
    "Georgia technology community discovery; no mentor match is promised.",
    "community",
  ),
  resource(
    "swe",
    "Society of Women Engineers mentoring",
    "mentorship",
    "https://swe.org/membership/mentoring/",
    ["software", "cloud", "security", "ml", "product", "hardware", "quant"],
    null,
    "Mentoring discovery through the Society of Women Engineers; verify current access.",
    "women",
  ),
  resource(
    "acm",
    "ACM student chapters",
    "community",
    "https://www.acm.org/chapters/students",
    ["software", "cloud", "security", "ml", "product", "hardware", "quant"],
    null,
    "Student computing chapter discovery.",
    "community",
  ),
];
const profile = (
  id: string,
  name: string,
  input: Skill[],
  reported = false,
  status: Profile["status"] = "confirmed",
): Profile =>
  ProfileSchema.parse({
    id,
    version: 1,
    name,
    status,
    evidence: input.map((skill) => ({
      skill,
      excerpt: `Synthetic project: practiced ${skill} and documented the work.`,
      source: reported ? "user_reported" : "resume",
    })),
    embedding: vectorFor(input),
  });
export const profiles: Profile[] = [
  profile("maya", "Maya · class projects", ["python", "git", "sql"]),
  profile("cloud", "Alex · cloud projects", [
    "python",
    "git",
    "cloud",
    "access",
    "monitoring",
  ]),
  profile("starter", "Sam · exploring tech", []),
  profile(
    "reported",
    "Jordan · reviewed self-report",
    ["python", "research"],
    true,
  ),
  profile("draft", "Taylor · unconfirmed draft", ["python"], false, "draft"),
];

// Review overrides record concrete facts instead of implying unknown membership rules.
resources.find((r) => r.id === "swe")!.eligibility =
  "Active paid SWE membership is required for the Mentor Network.";
resources.find((r) => r.id === "swe")!.excerpt =
  "The SWE Mentor Network is an exclusive members-only community";
resources.find((r) => r.id === "python")!.excerpt = "The Python Tutorial";
resources.find((r) => r.id === "git")!.excerpt = "Pro Git";
resources.find((r) => r.id === "cloud")!.excerpt =
  "AWS Training and Certification";
resources.find((r) => r.id === "ml")!.excerpt = "Machine Learning Crash Course";
resources.find((r) => r.id === "research")!.excerpt = "User research";
resources.find((r) => r.id === "hardware")!.excerpt = "Arduino Documentation";
resources.find((r) => r.id === "tag")!.excerpt =
  "Technology Association of Georgia";
Object.assign(
  resources.find((r) => r.id === "acm")!,
  {
    title: "ACM-W community",
    url: "https://women.acm.org/",
    claim:
      "ACM-W provides programs and community supporting women in computing. Participation is welcomed from anyone interested in its mission.",
    excerpt: "Supporting, celebrating, and advocating for Women in Computing",
    inclusionCategory: "women",
  },
);

resources.find((r) => r.id === "tag")!.region = "Georgia, US";
resources.find((r) => r.id === "acm")!.region =
  "International; check local chapter availability";
