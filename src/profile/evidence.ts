import { randomUUID } from 'node:crypto';
import {
  extractionSchema,
  LIMITS,
  type Embedding,
  type Extracted,
  type Fact,
  type ProfileUpdate,
} from './contracts';
import { ProfileError } from './errors';

// Minimize contact lines before provider access. This is NOT comprehensive PII redaction.
export function prepareText(text: string): string {
  if (text.length > LIMITS.characters)
    throw new ProfileError('TEXT_TOO_LONG', 413, 'Use at most 20,000 characters.');
  const value = text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => {
      const email = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(line);
      const phone = (line.match(/\+?\d[\d(). -]{7,}\d/g) ?? []).some(
        (candidate) => candidate.replace(/\D/g, '').length >= 10,
      );
      return !email && !phone;
    })
    .join('\n')
    .trim();
  if (value.length < 20)
    throw new ProfileError(
      'EMPTY_RESUME',
      422,
      'Add readable experience, skills, or education. Scanned PDFs need text pasted instead.',
    );
  return value;
}
export function validateEvidence(raw: Extracted, text: string): Fact[] {
  const parsed = extractionSchema.safeParse(raw);
  if (!parsed.success)
    throw new ProfileError(
      'INVALID_EXTRACTION',
      502,
      'The extraction did not match the expected format. Please retry.',
      true,
    );
  if (!parsed.data.facts.length)
    throw new ProfileError(
      'NO_EVIDENCE',
      422,
      'No supported skills, experience, or education were found. Try clearer text.',
    );
  const seen = new Set<string>();
  return parsed.data.facts.map((fact) => {
    const start = text.indexOf(fact.excerpt);
    // Fields are deliberately verbatim. Semantic paraphrase still needs user review.
    if (
      start < 0 ||
      !fact.excerpt.includes(fact.label) ||
      (fact.detail && !fact.excerpt.includes(fact.detail)) ||
      (fact.dateText && !fact.excerpt.includes(fact.dateText))
    ) {
      throw new ProfileError(
        'UNGROUNDED_EXTRACTION',
        502,
        'The AI returned unsupported evidence. Please retry.',
        true,
      );
    }
    const key = `${fact.kind}:${fact.label.toLowerCase()}:${fact.detail.toLowerCase()}`;
    if (seen.has(key))
      throw new ProfileError(
        'INVALID_EXTRACTION',
        502,
        'The extraction contained duplicate facts. Please retry.',
        true,
      );
    seen.add(key);
    const { excerpt, ...fields } = fact;
    return {
      ...fields,
      id: randomUUID(),
      evidence: { source: 'resume', excerpt, start, end: start + excerpt.length },
    };
  });
}
export function applyCorrections(previous: Fact[], updates: ProfileUpdate['corrections']): Fact[] {
  const existing = new Map(previous.map((f) => [f.id, f]));
  const ids = new Set<string>();
  return updates.map((input) => {
    const old = input.id ? existing.get(input.id) : undefined;
    if (input.id && (!old || ids.has(input.id)))
      throw new ProfileError(
        'INVALID_FACT_ID',
        400,
        'A correction references an unknown or repeated fact.',
      );
    const id = input.id ?? randomUUID();
    ids.add(id);
    const same =
      old &&
      ['kind', 'label', 'detail', 'dateText'].every(
        (key) => old[key as keyof Fact] === input[key as keyof typeof input],
      );
    return { ...input, id, evidence: same ? old.evidence : { source: 'user_reported' } };
  });
}
export function summaryForEmbedding(facts: Fact[]): string {
  return facts.map((f) => `${f.kind}: ${f.label}${f.detail ? ` — ${f.detail}` : ''}`).join('\n');
}
export function validateEmbedding(embedding: Embedding): Embedding {
  if (
    embedding.dimensions !== LIMITS.dimensions ||
    embedding.values.length !== LIMITS.dimensions ||
    !embedding.model ||
    embedding.config !== 'profile-semantic-v1' ||
    !embedding.values.every(Number.isFinite) ||
    !embedding.values.some((v) => v !== 0)
  ) {
    throw new ProfileError(
      'INVALID_EMBEDDING',
      502,
      'The embedding was invalid. Your saved profile was not changed.',
      true,
    );
  }
  return embedding;
}
