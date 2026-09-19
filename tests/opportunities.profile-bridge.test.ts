import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mapFactsToEvidence } from "../src/opportunities/profile-bridge.ts";
import type { Fact } from "../src/profile/contracts.ts";

function skillFact(label: string, overrides: Partial<Fact> = {}): Fact {
  return {
    id: crypto.randomUUID(),
    kind: "skill",
    label,
    detail: "",
    dateText: null,
    evidence: {
      source: "resume",
      excerpt: `Skills: ${label}`,
      start: 0,
      end: 0,
    },
    ...overrides,
  };
}

describe("mapFactsToEvidence", () => {
  test("maps recognized skill facts to Opportunities evidence", () => {
    const evidence = mapFactsToEvidence([
      skillFact("Python"),
      skillFact("SQL"),
    ]);
    assert.deepEqual(evidence.map((e) => e.skill).sort(), ["python", "sql"]);
    assert.ok(evidence.every((e) => e.source === "resume"));
  });

  test("skips facts with no entry in the skill vocabulary (e.g. JavaScript)", () => {
    const evidence = mapFactsToEvidence([skillFact("JavaScript")]);
    assert.deepEqual(evidence, []);
  });

  test("never infers a skill from experience or education facts", () => {
    const evidence = mapFactsToEvidence([
      {
        id: crypto.randomUUID(),
        kind: "experience",
        label: "Research helper",
        detail: "Assisted a team using Python.",
        dateText: null,
        evidence: {
          source: "resume",
          excerpt: "Assisted a team using Python.",
          start: 0,
          end: 0,
        },
      },
    ]);
    assert.deepEqual(evidence, []);
  });

  test("an empty facts array (the honest no-evidence case) imports as empty evidence", () => {
    assert.deepEqual(mapFactsToEvidence([]), []);
  });

  test("dedupes to one evidence entry per skill, keeping the first match", () => {
    const evidence = mapFactsToEvidence([
      skillFact("Python", {
        evidence: {
          source: "resume",
          excerpt: "first mention",
          start: 0,
          end: 0,
        },
      }),
      skillFact("Python", {
        evidence: {
          source: "resume",
          excerpt: "second mention",
          start: 0,
          end: 0,
        },
      }),
    ]);
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].excerpt, "first mention");
  });

  test("a user-reported fact synthesizes a labeled excerpt instead of using resume evidence", () => {
    const evidence = mapFactsToEvidence([
      skillFact("cloud", { evidence: { source: "user_reported" } }),
    ]);
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].source, "user_reported");
    assert.match(evidence[0].excerpt, /^Reported: cloud/);
  });
});
