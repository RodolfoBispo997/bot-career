import { EmploymentType, WorkMode } from '@prisma/client';
import { JobTrack, RoleType, Seniority } from '../search-profile/types';

export interface JobClassificationInput {
  title: string;
  description: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  location?: string | null;
}

export interface JobClassificationResult {
  isSoftwareRole: boolean;
  softwareRoleConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  track: JobTrack;
  seniority: Seniority;
  roleType: RoleType | 'OTHER';
  primaryStack: string;
  detectedSkills: string[];
  positiveSkills: string[];
  negativeSkills: string[];
  isPotentiallyEligible: boolean;
  signals: string[];
  warnings: string[];
}
