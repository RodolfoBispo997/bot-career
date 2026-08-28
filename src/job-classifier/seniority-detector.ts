import { Seniority } from '../search-profile/types';
import { hasTerm, normalizeText } from './text-normalizer';

const seniorityRules: readonly [Seniority, readonly string[]][] = [
  [Seniority.INTERNSHIP, ['estagio', 'estagiario', 'intern', 'internship']],
  [Seniority.TRAINEE, ['trainee']],
  [
    Seniority.JUNIOR_MID,
    ['junior/pleno', 'jr/pl', 'junior to mid', 'junior-mid'],
  ],
  [Seniority.MID_SENIOR, ['pleno/senior', 'mid/senior']],
  [Seniority.PRINCIPAL, ['principal']],
  [Seniority.STAFF, ['staff']],
  [Seniority.LEAD, ['tech lead', 'team lead', 'lead']],
  [Seniority.SENIOR, ['senior', 'sr']],
  [Seniority.MID, ['pleno', 'mid-level', 'mid level', 'mid']],
  [Seniority.JUNIOR, ['junior', 'jr']],
];

export function detectSeniority(
  title: string,
  description: string,
): {
  seniority: Seniority;
  source: 'title' | 'description' | 'none';
} {
  const normalizedTitle = normalizeText(title);
  const normalizedDescription = normalizeText(description);

  for (const [seniority, aliases] of seniorityRules) {
    if (hasTerm(normalizedTitle, aliases)) {
      return { seniority, source: 'title' };
    }
  }

  const positionContext =
    /(?:nivel|senioridade|vaga para|buscamos|procuramos|contratando).{0,35}/;
  const contextualDescription =
    normalizedDescription.match(positionContext)?.[0] ?? '';
  const shortDescription = normalizedDescription.slice(0, 240);
  const structuredDescription =
    /(?:ate\s+r\$|\b(?:startup|empresa|remoto|hibrido|presencial|clt|pj)\b)/.test(
      shortDescription,
    )
      ? shortDescription
      : '';

  for (const [seniority, aliases] of seniorityRules) {
    if (
      hasTerm(contextualDescription, aliases) ||
      hasTerm(structuredDescription, aliases)
    ) {
      return { seniority, source: 'description' };
    }
  }

  return { seniority: Seniority.UNSPECIFIED, source: 'none' };
}
