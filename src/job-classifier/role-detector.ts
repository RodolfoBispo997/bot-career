import { RoleType } from '../search-profile/types';
import { hasTerm, normalizeText } from './text-normalizer';

export function detectRole(
  title: string,
  description: string,
): RoleType | 'OTHER' {
  const normalizedTitle = normalizeText(title);
  const text = normalizeText(`${title} ${description}`);

  if (hasTerm(normalizedTitle, ['fullstack', 'full-stack', 'full stack'])) {
    return RoleType.FULLSTACK;
  }

  if (hasTerm(normalizedTitle, ['backend', 'back-end', 'back end'])) {
    return RoleType.BACKEND;
  }

  if (
    hasTerm(normalizedTitle, [
      'software engineer',
      'engenheiro de software',
      'engenharia de software',
    ])
  ) {
    return RoleType.SOFTWARE_ENGINEERING;
  }

  const genericSoftwareDevelopmentTitle = hasTerm(normalizedTitle, [
    'software developer',
    'desenvolvedor de software',
    'desenvolvimento',
    'analista desenvolvedor',
  ]);

  if (
    genericSoftwareDevelopmentTitle &&
    hasTerm(normalizeText(description), ['backend', 'back-end', 'back end'])
  ) {
    return RoleType.BACKEND;
  }

  if (genericSoftwareDevelopmentTitle) {
    return RoleType.SOFTWARE_DEVELOPMENT;
  }

  if (hasTerm(text, ['fullstack', 'full-stack', 'full stack'])) {
    return RoleType.FULLSTACK;
  }

  if (
    hasTerm(text, [
      'backend',
      'back-end',
      'back end',
      'apis',
      'services',
      'server-side',
    ])
  ) {
    return RoleType.BACKEND;
  }

  if (
    hasTerm(text, [
      'software engineer',
      'engenheiro de software',
      'engenharia de software',
    ])
  ) {
    return RoleType.SOFTWARE_ENGINEERING;
  }

  if (
    hasTerm(text, [
      'software developer',
      'desenvolvedor de software',
      'desenvolvimento de software',
      'analista desenvolvedor',
    ])
  ) {
    return RoleType.SOFTWARE_DEVELOPMENT;
  }

  return 'OTHER';
}
