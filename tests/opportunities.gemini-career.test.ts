import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GeminiCareerAI,
  validateCareerAnalysis,
  type CareerContext,
} from "../src/opportunities/gemini-career.ts";
const context: CareerContext = {
  path: { id: "ml", title: "Machine Learning" },
  facts: [
    { id: "f1", label: "Python", detail: "Coursework", source: "resume" },
  ],
  sources: [
    {
      id: "s1",
      jobId: "job",
      text: "Python project experience",
      url: "https://example.org",
      importance: "preferred",
    },
  ],
  resources: [],
  confirmedSkills: [],
};
const recommendation = {
  title: "Build a reproducible analysis",
  kind: "project",
  why: "Extend your Python coursework into a small portfolio example.",
  deliverable: "Analyze a public dataset and document your assumptions.",
  basis: "build_on_evidence",
  factIds: ["f1"],
  sourceIds: ["s1"],
  resourceIds: [],
  learningNeed: "not_claimed",
  skill: "python",
};
test("Gemini authors structured next steps using bounded supplied context and header credentials", async () => {
  let calls = 0;
  const request: typeof fetch = async (url, options) => {
    calls++;
    assert.ok(!String(url).includes("secret"));
    assert.equal(new Headers(options?.headers).get("x-goog-api-key"), "secret");
    const body = JSON.parse(String(options?.body));
    assert.ok(body.systemInstruction.parts[0].text.includes("untrusted"));
    assert.equal(body.tools, undefined);
    assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), context);
    return Response.json({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { text: JSON.stringify({ recommendations: [recommendation] }) },
            ],
          },
        },
      ],
    });
  };
  const result = await new GeminiCareerAI(
    "secret",
    "test-model",
    request,
  ).analyze(context, AbortSignal.timeout(1000));
  assert.equal(
    result.recommendations[0].deliverable,
    recommendation.deliverable,
  );
  assert.equal(calls, 1);
});
test("model output cannot invent references, links or confirmed learning gaps", () => {
  for (const change of [
    { factIds: ["invented"] },
    { sourceIds: ["invented"] },
    { resourceIds: ["hidden-resource"] },
    { learningNeed: "confirmed" },
    { title: "Visit https://invented.example" },
    { kind: "community" },
  ])
    assert.throws(() =>
      validateCareerAnalysis(
        { recommendations: [{ ...recommendation, ...change }] },
        context,
      ),
    );
  assert.equal(
    validateCareerAnalysis(
      {
        recommendations: [
          { ...recommendation, learningNeed: "needs_clarification" },
        ],
      },
      context,
    ).recommendations.length,
    1,
  );
});
test("provider failures, truncated output and timeouts fail explicitly without raw upstream errors", async () => {
  const bad = new GeminiCareerAI(
    "secret",
    "test-model",
    async () => new Response("private upstream detail", { status: 429 }),
  );
  await assert.rejects(
    () => bad.analyze(context, AbortSignal.timeout(1000)),
    (error) =>
      error instanceof Error && !error.message.includes("private upstream"),
  );
  const truncated = new GeminiCareerAI("secret", "test-model", async () =>
    Response.json({
      candidates: [
        { finishReason: "MAX_TOKENS", content: { parts: [{ text: "{}" }] } },
      ],
    }),
  );
  await assert.rejects(
    () => truncated.analyze(context, AbortSignal.timeout(1000)),
    /unusable/,
  );
  const timeout = new GeminiCareerAI("secret", "test-model", async () => {
    throw new Error("aborted");
  });
  await assert.rejects(
    () => timeout.analyze(context, AbortSignal.abort()),
    /timed out/,
  );
});
