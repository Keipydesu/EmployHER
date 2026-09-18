import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePdf, readResumeInput, readBoundedBody } from '../src/profile/intake';
import { syntheticPdf } from '../src/profile/demo-pdf';
import { resumeFixtures } from '../src/profile/fixtures';
import { ProfileError } from '../src/profile/errors';
import { FixtureProfileAI } from '../src/profile/adapters/fixture-ai';
import { validateEvidence, prepareText } from '../src/profile/evidence';
const code = (name: string) => (e: unknown) => e instanceof ProfileError && e.code === name;
test('text-based PDF can be extracted and grounded without saving raw bytes', async () => {
  const text = await parsePdf(syntheticPdf(resumeFixtures[0].text));
  assert(text.includes('Python'));
  const clean = prepareText(text);
  const facts = await new FixtureProfileAI().extract(clean);
  assert.equal(validateEvidence(facts, clean).length, 4);
});
test('oversize, non-PDF, malformed, too many pages and no-text PDFs fail', async () => {
  await assert.rejects(parsePdf(new Uint8Array(2 * 1024 * 1024 + 1)), code('FILE_TOO_LARGE'));
  await assert.rejects(parsePdf(new TextEncoder().encode('not pdf')), code('UNSUPPORTED_FILE'));
  await assert.rejects(
    parsePdf(new TextEncoder().encode('%PDF-1.4 broken')),
    code('UNREADABLE_PDF'),
  );
  await assert.rejects(
    parsePdf(syntheticPdf('Sample content in a six-page document.', 6)),
    code('UNREADABLE_PDF'),
  );
  await assert.rejects(parsePdf(syntheticPdf('')), code('SCANNED_PDF'));
});
test('JSON input is strict and malformed requests produce useful errors', async () => {
  const request = (body: string) =>
    new Request('http://localhost/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  assert.equal(
    await readResumeInput(request(JSON.stringify({ text: resumeFixtures[0].text }))),
    resumeFixtures[0].text,
  );
  await assert.rejects(readResumeInput(request('{')), code('INVALID_JSON'));
  await assert.rejects(
    readResumeInput(request(JSON.stringify({ text: 'sample', ownerId: 'forged' }))),
    code('INVALID_INPUT'),
  );
});
test('stream limit works even without Content-Length', async () => {
  await assert.rejects(
    readBoundedBody(new Request('http://localhost', { method: 'POST', body: '123456789' }), 5),
    code('FILE_TOO_LARGE'),
  );
});
test('multipart accepts only a single PDF with matching magic', async () => {
  const form = new FormData();
  form.set(
    'file',
    new File([Buffer.from(syntheticPdf(resumeFixtures[0].text))], 'sample.pdf', {
      type: 'application/pdf',
    }),
  );
  assert(
    (
      await readResumeInput(new Request('http://localhost', { method: 'POST', body: form }))
    ).includes('Python'),
  );
  form.append('file', new File(['x'], 'bad.txt', { type: 'text/plain' }));
  await assert.rejects(
    readResumeInput(new Request('http://localhost', { method: 'POST', body: form })),
    code('INVALID_FORM'),
  );
});
