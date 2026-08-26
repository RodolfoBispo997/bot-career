import { normalizeText } from '../job-classifier/text-normalizer';

const ELIGIBILITY_TERMS = [
  'pwd',
  'pcd',
  'pessoa com deficiencia',
  'pessoas com deficiencia',
  'applicants with disabilities',
  'pwd applicants only',
  'vaga afirmativa',
  'exclusively for',
  'exclusivo para',
  'exclusiva para',
  'somente para',
  'apenas para',
];

export interface EligibilityReview {
  eligibilityReviewRequired: boolean;
  eligibilityWarnings: string[];
}

export function detectEligibilityReview(
  title: string,
  description: string,
): EligibilityReview {
  const text = normalizeText(`${title} ${description}`);
  const detected = ELIGIBILITY_TERMS.some((term) => text.includes(term));

  return {
    eligibilityReviewRequired: detected,
    eligibilityWarnings: detected
      ? [
          'Vaga possui requisito específico de elegibilidade que deve ser verificado manualmente',
        ]
      : [],
  };
}
