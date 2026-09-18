import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resumeFixtures, demoPaths } from '../src/profile/fixtures';
import {
  prepareText,
  validateEvidence,
  validateEmbedding,
  applyCorrections,
} from '../src/profile/evidence';
import { FixtureProfileAI } from '../src/profile/adapters/fixture-ai';
import { MemoryOperations, MemoryProfileRepository } from '../src/profile/adapters/memory';
import { ProfileService } from '../src/profile/service';
import { ProfileError } from '../src/profile/errors';
import type { Embedding, Profile, ProfileUpdate } from '../src/profile/contracts';
import type { ProfileAI } from '../src/profile/ports';
import { suggestResume } from '../src/profile/suggestions';

const user = randomUUID();
const code = (name: string) => (error: unknown) =>
  error instanceof ProfileError && error.code === name;
function setup(ai: ProfileAI = new FixtureProfileAI()) {
  const repo = new MemoryProfileRepository();
  const operations = new MemoryOperations();
  const service = new ProfileService(repo, ai, operations, {
    getReviewedPath: async (id) => demoPaths.find((p) => p.id === id) ?? null,
  });
  return { repo, service };
}
function update(p: Profile, confirm = true): ProfileUpdate {
  return {
    expectedVersion: p.version,
    confirm,
    corrections: p.facts.map(({ id, kind, label, detail, dateText }) => ({
      id,
      kind,
      label,
      detail,
      dateText,
    })),
  };
}
for (const fixture of resumeFixtures)
  test(`synthetic extraction: ${fixture.id}`, async () => {
    const { service } = setup();
    if (!fixture.facts.length)
      return assert.rejects(service.intake(user, randomUUID(), fixture.text), code('NO_EVIDENCE'));
    const p = await service.intake(user, randomUUID(), fixture.text);
    assert.equal(p.status, 'draft');
    assert.equal(p.embedding, null);
    assert.equal(p.facts.length, fixture.facts.length);
    for (const fact of p.facts) {
      assert.equal(fact.evidence.source, 'resume');
      if (fact.evidence.source === 'resume')
        assert.equal(
          prepareText(fixture.text).slice(fact.evidence.start, fact.evidence.end),
          fact.evidence.excerpt,
        );
    }
  });
test('contact lines removed and oversized/empty inputs rejected', () => {
  assert(
    !prepareText(`${resumeFixtures[0].text}\nstudent@example.invalid\n+1 555 010 9999`).includes(
      '@',
    ),
  );
  assert.throws(() => prepareText('x'.repeat(20001)), code('TEXT_TOO_LONG'));
  assert.throws(() => prepareText(' '), code('EMPTY_RESUME'));
});
test('fabricated excerpts, labels, metrics, and dates never become evidence', () => {
  const original = resumeFixtures[0].facts[2];
  for (const patch of [
    { excerpt: 'invented excerpt' },
    { label: 'Senior engineer' },
    { detail: 'Improved performance by 90%' },
    { dateText: '2035' },
  ]) {
    assert.throws(
      () => validateEvidence({ facts: [{ ...original, ...patch }] }, resumeFixtures[0].text),
      code('UNGROUNDED_EXTRACTION'),
    );
  }
});
test('duplicate facts and extra model fields are rejected', () => {
  const fact = resumeFixtures[0].facts[0];
  assert.throws(
    () => validateEvidence({ facts: [fact, fact] }, resumeFixtures[0].text),
    code('INVALID_EXTRACTION'),
  );
  assert.throws(
    () => validateEvidence({ facts: [{ ...fact, secret: 'x' }] } as never, resumeFixtures[0].text),
    code('INVALID_EXTRACTION'),
  );
});
test('changing a fact makes it user-reported; untouched evidence survives', async () => {
  const { service, repo } = setup();
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  const input = update(p);
  input.corrections[0].label = 'Python basics';
  const next = await service.update(user, p.profileId, randomUUID(), input);
  assert.equal(next.version, 2);
  assert.equal(next.status, 'confirmed');
  assert(next.embedding);
  assert.equal(next.facts[0].evidence.source, 'user_reported');
  assert.equal(next.facts[1].evidence.source, 'resume');
  assert.deepEqual(
    repo.events.map((e) => [e.previousVersion, e.version]),
    [[1, 2]],
  );
  const draft = await service.update(user, p.profileId, randomUUID(), update(next, false));
  assert.equal(draft.embedding, null);
  assert.equal(draft.status, 'draft');
});
test('forged evidence, arbitrary owner IDs, unknown and repeated fact IDs are rejected', async () => {
  const { service } = setup();
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  await assert.rejects(
    service.update(user, p.profileId, randomUUID(), { ...update(p), ownerId: randomUUID() }),
    code('INVALID_CORRECTIONS'),
  );
  const input = update(p);
  (input.corrections[0] as unknown as Record<string, unknown>).evidence = {
    source: 'resume',
    excerpt: 'fake',
  };
  await assert.rejects(
    service.update(user, p.profileId, randomUUID(), input),
    code('INVALID_CORRECTIONS'),
  );
  assert.throws(
    () => applyCorrections(p.facts, [{ ...update(p).corrections[0], id: randomUUID() }]),
    code('INVALID_FACT_ID'),
  );
  assert.throws(
    () => applyCorrections(p.facts, [update(p).corrections[0], update(p).corrections[0]]),
    code('INVALID_FACT_ID'),
  );
});
test('another owner cannot read, update, or request suggestions', async () => {
  const { service } = setup();
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  const stranger = randomUUID();
  await assert.rejects(service.get(stranger, p.profileId), code('NOT_FOUND'));
  await assert.rejects(
    service.update(stranger, p.profileId, randomUUID(), update(p)),
    code('NOT_FOUND'),
  );
  await assert.rejects(service.suggestions(stranger, p.profileId, 'data', 1), code('NOT_FOUND'));
});
test('idempotency replay returns same profile; changed input conflicts', async () => {
  const { service } = setup();
  const key = randomUUID();
  const p = await service.intake(user, key, resumeFixtures[0].text);
  assert.equal((await service.intake(user, key, resumeFixtures[0].text)).profileId, p.profileId);
  await assert.rejects(
    service.intake(user, key, resumeFixtures[1].text),
    code('IDEMPOTENCY_CONFLICT'),
  );
  const updateKey = randomUUID();
  const next = await service.update(user, p.profileId, updateKey, update(p));
  assert.deepEqual(await service.update(user, p.profileId, updateKey, update(p)), next);
});
test('stale updates fail without overwriting newer state', async () => {
  const { service } = setup();
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  await service.update(user, p.profileId, randomUUID(), update(p));
  await assert.rejects(
    service.update(user, p.profileId, randomUUID(), update(p)),
    code('STALE_VERSION'),
  );
  assert.equal((await service.get(user, p.profileId)).version, 2);
});
test('invalid dimensions, nonfinite and zero vectors cannot confirm a profile', async () => {
  const valid = await new FixtureProfileAI().embed('sample');
  for (const values of [[], Array(768).fill(0), Array(768).fill(NaN), Array(768).fill(Infinity)])
    assert.throws(() => validateEmbedding({ ...valid, values }), code('INVALID_EMBEDDING'));
  const ai = new FixtureProfileAI();
  ai.embed = async () => ({ ...valid, values: [] });
  const { service } = setup(ai);
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  await assert.rejects(
    service.update(user, p.profileId, randomUUID(), update(p)),
    code('INVALID_EMBEDDING'),
  );
  assert.equal((await service.get(user, p.profileId)).version, 1);
});
test('matching rejects draft, simulated, stale, expired profiles', async () => {
  const { service, repo } = setup();
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  await assert.rejects(service.matchingProfile(user, p.profileId, 1), code('CONFIRM_FIRST'));
  await service.update(user, p.profileId, randomUUID(), update(p));
  await assert.rejects(service.matchingProfile(user, p.profileId, 1), code('STALE_VERSION'));
  await assert.rejects(service.matchingProfile(user, p.profileId, 2), code('SIMULATED_VECTOR'));
  const expired = { ...p, profileId: randomUUID(), expiresAt: new Date(0).toISOString() };
  await repo.create(expired);
  await assert.rejects(service.get(user, expired.profileId), code('NOT_FOUND'));
});
test('deletion prevents replay and late embedding writes', async () => {
  let resolve!: (value: Embedding) => void;
  let started!: () => void;
  const ready = new Promise<void>((r) => (started = r));
  const ai = new FixtureProfileAI();
  const vector = await ai.embed('sample');
  ai.embed = async () => {
    started();
    return new Promise((r) => (resolve = r));
  };
  const { service, repo } = setup(ai);
  const key = randomUUID();
  const p = await service.intake(user, key, resumeFixtures[0].text);
  const pending = service.update(user, p.profileId, randomUUID(), update(p));
  await ready;
  await repo.deleteOwner(user);
  resolve(vector);
  await assert.rejects(pending, code('NOT_FOUND'));
  await assert.rejects(service.intake(user, key, resumeFixtures[0].text), code('NOT_FOUND'));
  assert.equal(await repo.get(user, p.profileId), null);
});
test('two concurrent edits cannot both commit the same next version', async () => {
  const { service } = setup();
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  const results = await Promise.allSettled([
    service.update(user, p.profileId, randomUUID(), update(p)),
    service.update(user, p.profileId, randomUUID(), update(p)),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await service.get(user, p.profileId)).version, 2);
});
test('suggestions preserve confirmed text, require reviewed path, and reject stale profile', async () => {
  const { service } = setup();
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  await assert.rejects(service.suggestions(user, p.profileId, 'data', 1), code('CONFIRM_FIRST'));
  const next = await service.update(user, p.profileId, randomUUID(), update(p));
  const result = await service.suggestions(user, p.profileId, 'data', 2);
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].proposed, p.facts[2].detail);
  await assert.rejects(
    service.suggestions(user, p.profileId, 'unreviewed', 2),
    code('PATH_UNAVAILABLE'),
  );
  await assert.rejects(service.suggestions(user, p.profileId, 'data', 1), code('STALE_VERSION'));
  assert.deepEqual(
    suggestResume(next, {
      id: 'bad',
      version: 1,
      title: 'no evidence',
      requirements: [{ id: 'x', skill: 'Python', excerpt: '' }],
    }),
    [],
  );
});
test('short skill tokens do not match inside unrelated words', async () => {
  const { service } = setup();
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  const next = await service.update(user, p.profileId, randomUUID(), update(p));
  assert.deepEqual(
    suggestResume(next, {
      id: 'r',
      version: 1,
      title: 'R',
      requirements: [{ id: 'r', skill: 'R', excerpt: 'Use R.' }],
    }),
    [],
  );
});

test('contact minimization preserves ordinary year ranges', () => {
  const text = 'Intern: Built a Python project, 2023 - 2024.\nSkills: Python';
  assert(prepareText(text).includes('2023 - 2024'));
});
test('extraction validation retries at most once under the same deadline', async () => {
  const ai = new FixtureProfileAI();
  let calls = 0;
  ai.extract = async () => {
    calls++;
    return { facts: [{ ...resumeFixtures[0].facts[0], excerpt: 'invented' }] };
  };
  const { service } = setup(ai);
  await assert.rejects(
    service.intake(user, randomUUID(), resumeFixtures[0].text),
    code('UNGROUNDED_EXTRACTION'),
  );
  assert.equal(calls, 2);
});

test('suggestions recheck version after an asynchronous catalog lookup', async () => {
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>((r) => (entered = r));
  const gate = new Promise<void>((r) => (release = r));
  const repo = new MemoryProfileRepository();
  const service = new ProfileService(repo, new FixtureProfileAI(), new MemoryOperations(), {
    getReviewedPath: async () => {
      entered();
      await gate;
      return demoPaths[0];
    },
  });
  const p = await service.intake(user, randomUUID(), resumeFixtures[0].text);
  const confirmed = await service.update(user, p.profileId, randomUUID(), update(p));
  const pending = service.suggestions(user, p.profileId, 'data', 2);
  await ready;
  await service.update(user, p.profileId, randomUUID(), update(confirmed, false));
  release();
  await assert.rejects(pending, code('STALE_VERSION'));
});
