import { SEARCH_PROFILE } from '../search-profile/search-profile.config';
import { normalizeText, hasTerm } from './text-normalizer';

interface SkillDefinition {
  name: string;
  aliases: readonly string[];
  positive: boolean;
  stack: 'NODE' | 'PHP' | 'OTHER' | null;
}

const skillDefinitions: readonly SkillDefinition[] = [
  ...SEARCH_PROFILE.node.technologies.core.map((name) => ({
    name,
    aliases: [name],
    positive: true,
    stack: 'NODE' as const,
  })),
  ...SEARCH_PROFILE.node.technologies.strong.map((name) => ({
    name,
    aliases: [name],
    positive: true,
    stack: 'NODE' as const,
  })),
  ...SEARCH_PROFILE.node.technologies.complementary!.map((name) => ({
    name,
    aliases: [name],
    positive: true,
    stack: 'NODE' as const,
  })),
  ...SEARCH_PROFILE.php.technologies.core.map((name) => ({
    name,
    aliases: [name],
    positive: true,
    stack: 'PHP' as const,
  })),
  ...SEARCH_PROFILE.php.technologies.strong.map((name) => ({
    name,
    aliases: [name],
    positive: true,
    stack: 'PHP' as const,
  })),
  ...SEARCH_PROFILE.php.technologies.legacy!.map((name) => ({
    name,
    aliases: [name, name === 'Zend legado' ? 'zend' : name],
    positive: true,
    stack: 'PHP' as const,
  })),
  ...SEARCH_PROFILE.php.technologies.excludedWhenCentral!.map((name) => ({
    name,
    aliases: [name],
    positive: false,
    stack: 'PHP' as const,
  })),
  { name: 'Java', aliases: ['java'], positive: false, stack: 'OTHER' },
  { name: 'Spring', aliases: ['spring', 'spring boot'], positive: false, stack: 'OTHER' },
  { name: 'C#', aliases: ['c#'], positive: false, stack: 'OTHER' },
  { name: '.NET', aliases: ['.net', 'dotnet'], positive: false, stack: 'OTHER' },
  { name: 'Go', aliases: ['go', 'golang'], positive: false, stack: 'OTHER' },
  { name: 'Ruby', aliases: ['ruby'], positive: false, stack: 'OTHER' },
  { name: 'Python', aliases: ['python'], positive: false, stack: 'OTHER' },
];

export interface DetectedSkill {
  name: string;
  positive: boolean;
  stack: 'NODE' | 'PHP' | 'OTHER' | null;
}

export function detectSkills(text: string): DetectedSkill[] {
  const normalizedText = normalizeText(text);
  const detected: DetectedSkill[] = [];

  for (const definition of skillDefinitions) {
    if (hasTerm(normalizedText, definition.aliases)) {
      detected.push({
        name: definition.name,
        positive: definition.positive,
        stack: definition.stack,
      });
    }
  }

  return detected.filter(
    (skill, index, skills) =>
      skills.findIndex((candidate) => candidate.name === skill.name) === index,
  );
}
