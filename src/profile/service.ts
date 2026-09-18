import { createHash, randomUUID } from 'node:crypto';
import { updateSchema, type Profile } from './contracts';
import {
  applyCorrections,
  prepareText,
  summaryForEmbedding,
  validateEmbedding,
  validateEvidence,
} from './evidence';
import { ProfileError, conflict, notFound } from './errors';
import type { Operations, PathCatalog, ProfileAI, ProfileRepository } from './ports';
import { suggestResume } from './suggestions';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export class ProfileService {
  constructor(
    private repo: ProfileRepository,
    private ai: ProfileAI,
    private operations: Operations,
    private catalog: PathCatalog,
  ) {}
  async get(owner: string, id: string) {
    const profile = await this.repo.get(owner, id);
    if (!profile || Date.parse(profile.expiresAt) <= Date.now()) throw notFound();
    return profile;
  }
  async intake(owner: string, key: string, input: string, signal = AbortSignal.timeout(45_000)) {
    const text = prepareText(input);
    const profile = await this.operations.run(
      owner,
      'resume-intake',
      key,
      digest(text),
      async () => {
        let facts;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            facts = validateEvidence(await this.ai.extract(text, signal), text);
            break;
          } catch (error) {
            if (
              attempt === 1 ||
              !(error instanceof ProfileError) ||
              !['INVALID_EXTRACTION', 'UNGROUNDED_EXTRACTION'].includes(error.code)
            )
              throw error;
          }
        }
        if (!facts)
          throw new ProfileError(
            'INVALID_EXTRACTION',
            502,
            'Unable to extract supported facts.',
            true,
          );
        signal.throwIfAborted();
        const now = new Date();
        const profile: Profile = {
          profileId: randomUUID(),
          ownerId: owner,
          version: 1,
          status: 'draft',
          facts,
          embedding: null,
          extractionModel: this.ai.model,
          promptVersion: 'verbatim-evidence-v1',
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 30 * 86400_000).toISOString(),
        };
        await this.repo.create(profile);
        return profile;
      },
    );
    // Replays cannot resurrect a deleted/expired profile.
    await this.get(owner, profile.profileId);
    return profile;
  }
  async update(
    owner: string,
    id: string,
    key: string,
    raw: unknown,
    signal = AbortSignal.timeout(45_000),
  ) {
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success)
      throw new ProfileError('INVALID_CORRECTIONS', 400, 'Check the profile fields and version.');
    const input = parsed.data;
    const result = await this.operations.run(
      owner,
      `resume-update:${id}`,
      key,
      digest(input),
      async () => {
        const current = await this.get(owner, id);
        if (current.version !== input.expectedVersion) throw conflict();
        const facts = applyCorrections(current.facts, input.corrections);
        const embedding = input.confirm
          ? validateEmbedding(await this.ai.embed(summaryForEmbedding(facts), signal))
          : null;
        signal.throwIfAborted();
        const next: Profile = {
          ...current,
          version: current.version + 1,
          facts,
          status: input.confirm ? 'confirmed' : 'draft',
          embedding,
        };
        await this.repo.replace(owner, current.version, next);
        return next;
      },
    );
    await this.get(owner, id);
    return result;
  }
  async suggestions(owner: string, id: string, pathId: string, version: number) {
    const current = await this.get(owner, id);
    if (current.version !== version) throw conflict();
    const path = await this.catalog.getReviewedPath(pathId);
    if (!path)
      throw new ProfileError(
        'PATH_UNAVAILABLE',
        404,
        'This path has no reviewed requirements yet.',
      );
    // Catalog lookup may await I/O: do not return suggestions for a deleted or superseded profile.
    const latest = await this.get(owner, id);
    if (latest.version !== version) throw conflict();
    return {
      profileVersion: current.version,
      pathId,
      pathVersion: path.version,
      suggestions: suggestResume(current, path),
    };
  }
  async matchingProfile(owner: string, id: string, version: number) {
    const current = await this.get(owner, id);
    if (current.version !== version) throw conflict();
    if (current.status !== 'confirmed' || !current.embedding)
      throw new ProfileError('CONFIRM_FIRST', 409, 'Confirm the current profile before matching.');
    if (current.embedding.simulated)
      throw new ProfileError(
        'SIMULATED_VECTOR',
        409,
        'Demo embeddings cannot be used for real semantic matching.',
      );
    return current;
  }
}
