import { EmploymentType, WorkMode } from '@prisma/client';
import { JobTrack, RoleType, Seniority } from '../search-profile/types';

export const STACK_WEIGHTS: Record<JobTrack, Record<string, number>> = {
  [JobTrack.NODE]: {
    'Node.js': 14,
    TypeScript: 8,
    NestJS: 7,
    'REST API': 4,
    PostgreSQL: 3,
    MySQL: 2,
    Backend: 2,
  },
  [JobTrack.PHP]: {
    PHP: 12,
    Laravel: 10,
    Symfony: 7,
    'REST API': 4,
    MySQL: 3,
    PostgreSQL: 2,
    Backend: 2,
  },
  [JobTrack.NODE_INTERNSHIP]: {
    'Node.js': 20,
    TypeScript: 8,
    NestJS: 7,
    'REST API': 4,
    PostgreSQL: 3,
    MySQL: 3,
  },
  [JobTrack.OTHER]: {},
};

export const SENIORITY_WEIGHTS: Record<JobTrack, Record<Seniority, number>> = {
  [JobTrack.NODE]: {
    [Seniority.TRAINEE]: 18,
    [Seniority.JUNIOR]: 20,
    [Seniority.JUNIOR_MID]: 20,
    [Seniority.UNSPECIFIED]: 16,
    [Seniority.MID]: 10,
    [Seniority.MID_SENIOR]: 0,
    [Seniority.SENIOR]: 0,
    [Seniority.LEAD]: 0,
    [Seniority.STAFF]: 0,
    [Seniority.PRINCIPAL]: 0,
    [Seniority.INTERNSHIP]: 0,
  },
  [JobTrack.PHP]: {
    [Seniority.JUNIOR]: 22,
    [Seniority.JUNIOR_MID]: 25,
    [Seniority.MID]: 25,
    [Seniority.UNSPECIFIED]: 20,
    [Seniority.TRAINEE]: 10,
    [Seniority.MID_SENIOR]: 0,
    [Seniority.SENIOR]: 0,
    [Seniority.LEAD]: 0,
    [Seniority.STAFF]: 0,
    [Seniority.PRINCIPAL]: 0,
    [Seniority.INTERNSHIP]: 0,
  },
  [JobTrack.NODE_INTERNSHIP]: {
    [Seniority.INTERNSHIP]: 15,
    [Seniority.TRAINEE]: 0,
    [Seniority.JUNIOR]: 0,
    [Seniority.JUNIOR_MID]: 0,
    [Seniority.UNSPECIFIED]: 0,
    [Seniority.MID]: 0,
    [Seniority.MID_SENIOR]: 0,
    [Seniority.SENIOR]: 0,
    [Seniority.LEAD]: 0,
    [Seniority.STAFF]: 0,
    [Seniority.PRINCIPAL]: 0,
  },
  [JobTrack.OTHER]: {} as Record<Seniority, number>,
};

export const ROLE_WEIGHTS: Record<RoleType | 'OTHER', number> = {
  [RoleType.BACKEND]: 15,
  [RoleType.FULLSTACK]: 12,
  [RoleType.SOFTWARE_ENGINEERING]: 13,
  [RoleType.SOFTWARE_DEVELOPMENT]: 11,
  OTHER: 4,
};

export const WORK_MODE_WEIGHTS: Record<WorkMode, number> = {
  [WorkMode.REMOTE]: 10,
  [WorkMode.HYBRID]: 8,
  [WorkMode.ONSITE]: 6,
  [WorkMode.UNKNOWN]: 5,
};

export const EMPLOYMENT_TYPE_WEIGHTS: Record<EmploymentType, number> = {
  [EmploymentType.CLT]: 5,
  [EmploymentType.PJ]: 5,
  [EmploymentType.INTERNSHIP]: 10,
  [EmploymentType.TRAINEE]: 0,
  [EmploymentType.UNKNOWN]: 3,
  [EmploymentType.OTHER]: 1,
  [EmploymentType.COOPERATIVE]: 0,
  [EmploymentType.TEMPORARY]: 0,
};

export const NODE_COMPLEMENTARY_MAX = 10;
export const PHP_COMPLEMENTARY_MAX = 5;
export const INTERNSHIP_COMPLEMENTARY_MAX = 0;

export const LEGACY_SKILLS = ['PHP 5', 'CodeIgniter', 'Zend legado', 'jQuery'];
