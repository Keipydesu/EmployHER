import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiProfileAI } from "../src/profile/adapters/gemini.ts";
import { GeminiCareerAI } from "../src/opportunities/gemini-career.ts";
import { ProfileError } from "../src/profile/errors.ts";

test("both Gemini adapters distinguish configuration, access, quota and outages without reading private error bodies or retrying", async () => {
  for (const [upstream, code, status, retryable] of [
    [400, "AI_REQUEST_REJECTED", 502, false],
    [404, "AI_MODEL_UNAVAILABLE", 503, false],
    [403, "AI_ACCESS_DENIED", 503, false],
    [429, "AI_RATE_LIMITED", 429, true],
    [503, "AI_UNAVAILABLE", 503, true],
  ] as const) {
    for (const mode of ["profile", "career"] as const) {
      let calls = 0,
        cancelled = false;
      const request: typeof fetch = async () => {
        calls++;
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  "private upstream body and credential",
                ),
              );
            },
            cancel() {
              cancelled = true;
            },
          }),
          { status: upstream },
        );
      };
      const work =
        mode === "profile"
          ? new GeminiProfileAI(
              "synthetic-key",
              "test-model",
              "test-embed",
              request,
            ).extract("Synthetic input", AbortSignal.timeout(1000))
          : new GeminiCareerAI("synthetic-key", "test-model", request).analyze(
              {
                path: { id: "ml", title: "ML" },
                facts: [],
                resources: [],
                confirmedSkills: [],
                sources: [
                  {
                    id: "source",
                    jobId: "job",
                    text: "Python",
                    url: "https://example.org",
                    importance: "preferred",
                  },
                ],
              },
              AbortSignal.timeout(1000),
            );
      await assert.rejects(work, (error) => {
        assert(error instanceof ProfileError);
        assert.equal(error.code, code);
        assert.equal(error.status, status);
        assert.equal(error.retryable, retryable);
        assert(!error.message.includes("private"));
        return true;
      });
      assert.equal(calls, 1);
      assert.equal(cancelled, true);
    }
  }
});
