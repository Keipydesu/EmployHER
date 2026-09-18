import type { Profile, ReviewedPath, ResumeSuggestion } from './contracts';
import { ProfileError } from './errors';

// Conservative first release: foreground confirmed facts verbatim. No generative claims,
// metrics, credentials, or future work can enter ready-to-use résumé copy.
export function suggestResume(profile: Profile, path: ReviewedPath): ResumeSuggestion[] {
  if (profile.status !== 'confirmed')
    throw new ProfileError(
      'CONFIRM_FIRST',
      409,
      'Confirm your profile before requesting résumé suggestions.',
    );
  return path.requirements
    .flatMap((requirement) => {
      if (!requirement.excerpt.trim() || !requirement.skill.trim()) return [];
      const escaped = requirement.skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const token = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu');
      const fact = profile.facts.find(
        (f) => f.kind === 'experience' && token.test(`${f.label} ${f.detail}`),
      );
      if (!fact) return [];
      return [
        {
          id: `${fact.id}:${requirement.id}`,
          factId: fact.id,
          requirementId: requirement.id,
          original: fact.detail || fact.label,
          proposed: fact.detail || fact.label,
          reason: `Foreground this confirmed experience for ${path.title}; its ${requirement.skill} evidence relates to the reviewed requirement.`,
          source: fact.evidence.source,
        } satisfies ResumeSuggestion,
      ];
    })
    .filter((s, i, all) => all.findIndex((x) => x.factId === s.factId) === i)
    .slice(0, 3);
}
