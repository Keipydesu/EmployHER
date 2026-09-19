import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiProfileAI } from "../src/profile/adapters/gemini.ts";
import { ProfileError } from "../src/profile/errors.ts";

test("Gemini extraction omits expensive wire array bound but still rejects more than 60 facts locally", async () => {
  const fact = {
    kind: "skill",
    label: "Python",
    detail: "",
    dateText: null,
    excerpt: "Python",
  };
  let count = 1;
  const request: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const schema = body.generationConfig.responseJsonSchema;
    assert.equal(schema.properties.facts.maxItems, undefined);
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.facts.items.additionalProperties, false);
    return Response.json({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: JSON.stringify({
                  facts: Array.from({ length: count }, () => fact),
                }),
              },
            ],
          },
        },
      ],
    });
  };
  const ai = new GeminiProfileAI("synthetic", "test", "test", request);
  assert.equal(
    (await ai.extract("Python", AbortSignal.timeout(1000))).facts.length,
    1,
  );
  count = 61;
  await assert.rejects(
    () => ai.extract("Python", AbortSignal.timeout(1000)),
    (error: unknown) =>
      error instanceof ProfileError && error.code === "INVALID_EXTRACTION",
  );
});
