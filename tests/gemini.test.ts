import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiProfileAI } from '../src/profile/adapters/gemini';
import { resumeFixtures } from '../src/profile/fixtures';
import { ProfileError } from '../src/profile/errors';
const code = (name: string) => (e: unknown) => e instanceof ProfileError && e.code === name;
test('Gemini uses structured output and a header key without tools or raw logging', async () => {
  let sent: RequestInit | undefined;
  let url = '';
  const client = new GeminiProfileAI(
    'test-only-placeholder',
    'test-extract',
    'test-embed',
    async (input, init) => {
      url = String(input);
      sent = init;
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: { parts: [{ text: JSON.stringify({ facts: resumeFixtures[0].facts }) }] },
          },
        ],
      });
    },
  );
  assert.equal(
    (await client.extract(resumeFixtures[0].text, AbortSignal.timeout(1000))).facts.length,
    4,
  );
  assert(!url.includes('test-only-placeholder'));
  const body = JSON.parse(String(sent?.body));
  assert.equal(body.tools, undefined);
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert(body.generationConfig.responseJsonSchema);
  assert(body.systemInstruction);
});
test('Gemini truncated output fails and upstream errors never expose secrets', async () => {
  const blocked = new GeminiProfileAI('key', 'extract', 'embed', async () =>
    Response.json({
      candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }],
    }),
  );
  await assert.rejects(
    blocked.extract('sample', AbortSignal.timeout(1000)),
    code('EXTRACTION_BLOCKED'),
  );
  const failing = new GeminiProfileAI(
    'key',
    'extract',
    'embed',
    async () => new Response('private upstream information', { status: 500 }),
  );
  await assert.rejects(
    failing.extract('sample', AbortSignal.timeout(1000)),
    (e: unknown) => e instanceof ProfileError && !e.message.includes('private'),
  );
});
test('Gemini embeds a compatible 768-dimensional semantic vector and normalizes it', async () => {
  let body: any;
  const client = new GeminiProfileAI('key', 'extract', 'embed', async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return Response.json({ embedding: { values: Array(768).fill(2) } });
  });
  const vector = await client.embed('skill: Python', AbortSignal.timeout(1000));
  assert.equal(body.outputDimensionality, 768);
  assert.equal(body.taskType, 'SEMANTIC_SIMILARITY');
  assert.equal(vector.simulated, false);
  assert(Math.abs(Math.hypot(...vector.values) - 1) < 1e-10);
});
test('invalid and zero Gemini embeddings fail closed', async () => {
  for (const values of [[], Array(768).fill(0)]) {
    const client = new GeminiProfileAI('key', 'extract', 'embed', async () =>
      Response.json({ embedding: { values } }),
    );
    await assert.rejects(
      client.embed('sample', AbortSignal.timeout(1000)),
      code('INVALID_EMBEDDING'),
    );
  }
});
test('aborted provider calls produce safe retryable timeout', async () => {
  const signal = AbortSignal.abort();
  const client = new GeminiProfileAI('key', 'extract', 'embed', async () => {
    signal.throwIfAborted();
    return new Response();
  });
  await assert.rejects(client.extract('sample', signal), code('AI_TIMEOUT'));
});
