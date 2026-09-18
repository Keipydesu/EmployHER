import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createProfileHandlers } from '../src/profile/http';
import { ProfileService } from '../src/profile/service';
import { MemoryOperations, MemoryProfileRepository } from '../src/profile/adapters/memory';
import { FixtureProfileAI } from '../src/profile/adapters/fixture-ai';
import { ProfileError } from '../src/profile/errors';
import { resumeFixtures } from '../src/profile/fixtures';
import { demoEnabled, getProfileRuntime } from '../src/profile/runtime';
const service = new ProfileService(
  new MemoryProfileRepository(),
  new FixtureProfileAI(),
  new MemoryOperations(),
  { getReviewedPath: async () => null },
);
const routes = createProfileHandlers(() => ({
  service,
  authorize: async (r) => {
    // Test-only identity adapter; production never accepts a caller-provided owner.
    const owner = r.headers.get('x-test-owner');
    if (!owner) throw new ProfileError('UNAUTHENTICATED', 401, 'Sign in.');
    return owner;
  },
  authorizeIntake: async () => {},
}));
const owner = randomUUID();
function post(extra: Record<string, string> = {}) {
  return new Request('http://localhost/api/resumes', {
    method: 'POST',
    headers: {
      origin: 'http://localhost',
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
      'x-test-owner': owner,
      ...extra,
    },
    body: JSON.stringify({ text: resumeFixtures[0].text }),
  });
}
test('HTTP requires authenticated owner, same origin and idempotency', async () => {
  assert.equal((await routes.post(post({ 'x-test-owner': '' }))).status, 401);
  assert.equal((await routes.post(post({ origin: 'https://attacker.invalid' }))).status, 403);
  assert.equal((await routes.post(post({ 'idempotency-key': '' }))).status, 400);
});
test('HTTP strips owner/vector data and hides foreign records', async () => {
  const response = await routes.post(post());
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const p = await response.json();
  assert(!('ownerId' in p));
  assert.equal(p.embedding, null);
  assert.equal(
    (
      await routes.get(
        new Request('http://localhost', { headers: { 'x-test-owner': randomUUID() } }),
        p.profileId,
      )
    ).status,
    404,
  );
});
test('demo cannot run in production and runtime fails closed by default', () => {
  const env = process.env as Record<string, string | undefined>;
  const oldMode = env.PROFILE_DEMO_MODE,
    oldNode = env.NODE_ENV;
  try {
    env.PROFILE_DEMO_MODE = 'true';
    env.NODE_ENV = 'production';
    assert.equal(demoEnabled(), false);
    assert.throws(
      () => getProfileRuntime(),
      (e: unknown) => e instanceof ProfileError && e.status === 503,
    );
  } finally {
    if (oldMode === undefined) delete env.PROFILE_DEMO_MODE;
    else env.PROFILE_DEMO_MODE = oldMode;
    if (oldNode === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = oldNode;
  }
});
