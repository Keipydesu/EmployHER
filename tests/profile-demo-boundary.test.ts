import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resumeFixtures } from '../src/profile/fixtures';
import { createDemoSession } from '../src/profile/runtime';
import { createProfileHandlers } from '../src/profile/http';
import { factLine } from '../src/profile/evidence';

test('live demo embeds only approved summaries; HTTP corrections stay simulated', async () => {
  const names = ['PROFILE_DEMO_MODE', 'PROFILE_DEMO_GEMINI', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_EMBEDDING_MODEL', 'NODE_ENV', 'VERCEL'];
  const previous = names.map((name) => [name, process.env[name]] as const);
  const originalFetch = globalThis.fetch;
  const embedded: string[] = [];
  try {
    Object.assign(process.env, { PROFILE_DEMO_MODE: 'true', PROFILE_DEMO_GEMINI: 'true', GEMINI_API_KEY: 'test-only', GEMINI_MODEL: 'test', GEMINI_EMBEDDING_MODEL: 'test', NODE_ENV: 'test' });
    delete process.env.VERCEL;
    Reflect.deleteProperty(globalThis, 'employherProfileDemo');
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (body.taskType) {
        embedded.push(body.content.parts[0].text);
        return Response.json({ embedding: { values: Array(768).fill(0.1) } });
      }
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ facts: resumeFixtures[0].facts }) }] } }] });
    };
    const token = createDemoSession();
    const handlers = createProfileHandlers();
    const request = (method: string, body: unknown) => new Request('http://localhost/api/resumes', { method, headers: { origin: 'http://localhost', cookie: `profile_demo=${token}`, 'content-type': 'application/json', 'idempotency-key': randomUUID() }, body: JSON.stringify(body) });
    const intake = await handlers.post(request('POST', { text: resumeFixtures[0].text }));
    assert.equal(intake.status, 201);
    const profile = await intake.json();
    const corrections = profile.facts.map(({ id, kind, label, detail, dateText }: Record<string, unknown>) => ({ id, kind, label, detail, dateText }));
    const approved = await handlers.patch(request('PATCH', { expectedVersion: 1, confirm: true, corrections }), profile.profileId);
    assert.equal(approved.status, 200);
    assert.equal((await approved.json()).embedding.simulated, false);
    assert.deepEqual(embedded, [resumeFixtures[0].facts.map(factLine).join('\n')]);
    corrections[0].label = 'Arbitrary correction outside the approved fixtures';
    const edited = await handlers.patch(request('PATCH', { expectedVersion: 2, confirm: true, corrections }), profile.profileId);
    assert.equal(edited.status, 200);
    const result = await edited.json();
    assert.equal(result.embedding.simulated, true);
    assert.equal(result.facts[0].evidence.source, 'user_reported');
    assert.equal(embedded.length, 1, 'edited summary must not reach live embedding');
    const draft = await handlers.patch(request('PATCH', { expectedVersion: 3, confirm: false, corrections }), profile.profileId);
    assert.equal(draft.status, 200);
    assert.equal((await draft.json()).embedding, null);
    assert.equal(embedded.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, 'employherProfileDemo');
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
