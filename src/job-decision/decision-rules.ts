import { EmploymentType, WorkMode } from '@prisma/client';
import { JobTrack, Seniority } from '../search-profile/types';
import { DecisionJobData } from './types';

export const NODE_REJECTED_SENIORITIES = [
  Seniority.MID_SENIOR,
  Seniority.SENIOR,
  Seniority.LEAD,
  Seniority.STAFF,
  Seniority.PRINCIPAL,
] as const;

export const PHP_REJECTED_SENIORITIES = [
  Seniority.MID_SENIOR,
  Seniority.SENIOR,
  Seniority.LEAD,
  Seniority.STAFF,
  Seniority.PRINCIPAL,
] as const;

export const ALTERNATIVE_STACKS = [
  'JAVA',
  'PYTHON',
  'CSHARP',
  'C#',
  'DOTNET',
  '.NET',
  'GO',
  'RUBY',
] as const;

export function isLocationReviewRequired(job: DecisionJobData): boolean {
  return job.workMode === WorkMode.HYBRID || job.workMode === WorkMode.ONSITE;
}

export function isHardRejectedEmploymentType(
  employmentType: EmploymentType,
): boolean {
  return (
    employmentType === EmploymentType.COOPERATIVE ||
    employmentType === EmploymentType.TEMPORARY
  );
}
