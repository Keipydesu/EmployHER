import type { Fact } from "../profile/contracts";
import type { Evidence, Skill } from "./contracts";

// Explicit keyword table, never inferred from experience/education prose:
// a skill only carries over if the résumé fact literally names it. Skills
// with no entry here (e.g. frontend/JS work) are honestly dropped rather
// than approximated to a nearby category.
export const SKILL_ALIASES: Record<Skill, string[]> = {
  python: ["python"],
  sql: ["sql"],
  git: ["git", "github", "version control"],
  cloud: ["cloud", "aws", "azure", "gcp", "google cloud"],
  access: ["iam", "access control", "least privilege", "permissions"],
  monitoring: ["monitoring", "observability", "logging", "alerting"],
  statistics: ["statistics", "stats"],
  modeling: ["machine learning", "modeling", "model training"],
  testing: ["testing", "unit test", "test automation", "qa"],
  research: ["user research", "research"],
  circuits: ["circuits", "electronics", "arduino", "embedded"],
};

function matchSkill(label: string): Skill | null {
  const normalized = ` ${label.trim().toLowerCase()} `;
  for (const [skill, aliases] of Object.entries(SKILL_ALIASES) as [
    Skill,
    string[],
  ][]) {
    if (aliases.some((alias) => normalized.includes(alias))) return skill;
  }
  return null;
}

// Only kind:"skill" facts are considered: experience/education prose is
// never mined for skills, matching the app's no-inferred-skills rule.
export function mapFactsToEvidence(facts: Fact[]): Evidence[] {
  const bySkill = new Map<Skill, Evidence>();
  for (const fact of facts) {
    if (fact.kind !== "skill") continue;
    const skill = matchSkill(fact.label);
    if (!skill || bySkill.has(skill)) continue;
    const excerpt =
      fact.evidence.source === "resume"
        ? fact.evidence.excerpt.slice(0, 500)
        : `Reported: ${fact.label}${fact.detail ? ` — ${fact.detail}` : ""}`.slice(
            0,
            500,
          );
    bySkill.set(skill, {
      skill,
      excerpt,
      source: fact.evidence.source,
    });
  }
  return [...bySkill.values()];
}
