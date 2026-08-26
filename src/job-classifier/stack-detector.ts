import { countTerm, hasTerm, normalizeText } from './text-normalizer';
import { DetectedSkill } from './skill-detector';

interface StackEvidence {
  name: string;
  aliases: readonly string[];
  relatedSkills: readonly string[];
  titleWeight: number;
}

const stacks: readonly StackEvidence[] = [
  {
    name: 'NODE',
    aliases: ['node', 'node.js', 'nodejs'],
    relatedSkills: ['Node.js', 'TypeScript', 'NestJS', 'Express', 'Fastify', 'Prisma'],
    titleWeight: 6,
  },
  {
    name: 'PHP',
    aliases: ['php'],
    relatedSkills: ['PHP', 'Laravel', 'Symfony', 'CodeIgniter'],
    titleWeight: 6,
  },
  {
    name: 'JAVA',
    aliases: ['java'],
    relatedSkills: ['Java', 'Spring'],
    titleWeight: 5,
  },
  {
    name: 'PYTHON',
    aliases: ['python'],
    relatedSkills: ['Python'],
    titleWeight: 5,
  },
  { name: 'C#', aliases: ['c#'], relatedSkills: ['C#', '.NET'], titleWeight: 5 },
  { name: '.NET', aliases: ['.net', 'dotnet'], relatedSkills: ['.NET', 'C#'], titleWeight: 5 },
  { name: 'GO', aliases: ['go', 'golang'], relatedSkills: ['Go'], titleWeight: 5 },
  { name: 'RUBY', aliases: ['ruby'], relatedSkills: ['Ruby'], titleWeight: 5 },
];

export interface StackDetection {
  primaryStack: string;
  nodeIsReal: boolean;
  signals: string[];
  warnings: string[];
}

export function detectPrimaryStack(
  title: string,
  description: string,
  detectedSkills: readonly DetectedSkill[],
): StackDetection {
  const normalizedTitle = normalizeText(title);
  const normalizedDescription = normalizeText(description);
  const fullText = `${normalizedTitle} ${normalizedDescription}`;
  const scores = new Map<string, number>();

  for (const stack of stacks) {
    const titleMatch = hasTerm(normalizedTitle, stack.aliases);
    const occurrences = countTerm(fullText, stack.aliases);
    const relatedSkillCount = detectedSkills.filter(
      (skill) => stack.relatedSkills.includes(skill.name),
    ).length;
    let score = occurrences + relatedSkillCount * 2 + (titleMatch ? stack.titleWeight : 0);

    const differentialPattern = new RegExp(
      `(?:${stack.aliases.map(escapeRegex).join('|')}).{0,35}(diferencial|plus|nice to have|desejavel)`,
    );
    if (differentialPattern.test(fullText)) {
      score -= 8;
    }

    scores.set(stack.name, score);
  }

  const ranked = [...scores.entries()].sort((left, right) => right[1] - left[1]);
  const [primaryStack, primaryScore] = ranked[0] ?? ['OTHER', 0];
  const secondScore = ranked[1]?.[1] ?? 0;
  const warnings: string[] = [];

  if (primaryScore === 0) {
    return {
      primaryStack: 'OTHER',
      nodeIsReal: false,
      signals: [],
      warnings: ['Nenhuma stack principal identificada'],
    };
  }

  if (primaryScore === secondScore && secondScore > 0) {
    warnings.push('Duas stacks aparecem com força semelhante');
  }

  const nodeScore = scores.get('NODE') ?? 0;
  const nodeIsReal = nodeScore > 0 && !isDifferential(normalizedDescription, ['node', 'node.js', 'nodejs']);

  return {
    primaryStack,
    nodeIsReal,
    signals: [`Stack principal provável: ${primaryStack}`],
    warnings,
  };
}

function isDifferential(text: string, aliases: readonly string[]): boolean {
  return new RegExp(
    `(?:${aliases.map(escapeRegex).join('|')}).{0,35}(diferencial|plus|nice to have|desejavel)`,
  ).test(text);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
