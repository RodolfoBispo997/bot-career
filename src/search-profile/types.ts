export enum JobTrack {
  NODE = 'NODE',
  PHP = 'PHP',
  NODE_INTERNSHIP = 'NODE_INTERNSHIP',
  OTHER = 'OTHER',
}

export enum Seniority {
  INTERNSHIP = 'INTERNSHIP',
  TRAINEE = 'TRAINEE',
  JUNIOR = 'JUNIOR',
  JUNIOR_MID = 'JUNIOR_MID',
  MID = 'MID',
  MID_SENIOR = 'MID_SENIOR',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  STAFF = 'STAFF',
  PRINCIPAL = 'PRINCIPAL',
  UNSPECIFIED = 'UNSPECIFIED',
}

export enum RoleType {
  BACKEND = 'BACKEND',
  FULLSTACK = 'FULLSTACK',
  SOFTWARE_ENGINEERING = 'SOFTWARE_ENGINEERING',
  SOFTWARE_DEVELOPMENT = 'SOFTWARE_DEVELOPMENT',
}

export enum SkillCategory {
  CORE = 'CORE',
  STRONG = 'STRONG',
  COMPLEMENTARY = 'COMPLEMENTARY',
  LEGACY = 'LEGACY',
  EXCLUDED_WHEN_CENTRAL = 'EXCLUDED_WHEN_CENTRAL',
}

export interface TechnologyProfile {
  core: readonly string[];
  strong: readonly string[];
  complementary?: readonly string[];
  legacy?: readonly string[];
  excludedWhenCentral?: readonly string[];
}

export interface SearchProfile {
  node: {
    track: JobTrack.NODE;
    priority: 'MAXIMUM';
    targetSeniorities: readonly Seniority[];
    nonPrimarySeniorities: readonly Seniority[];
    technologies: TechnologyProfile;
  };
  php: {
    track: JobTrack.PHP;
    priority: 'HIGH';
    targetSeniorities: readonly Seniority[];
    excludedSeniorities: readonly Seniority[];
    technologies: TechnologyProfile;
  };
  internship: {
    track: JobTrack.NODE_INTERNSHIP;
    requiresNodeJs: true;
    acceptedRoleTypes: readonly RoleType[];
  };
  fullstack: {
    acceptedBackendTracks: readonly [JobTrack.NODE, JobTrack.PHP];
  };
  otherPrimaryStacks: readonly string[];
  modalities: {
    accepted: readonly ['REMOTE', 'HYBRID', 'ONSITE'];
    remote: {
      acceptedLocation: string;
    };
    hybrid: {
      acceptedLocation: string;
      locationRequiresManualReview: true;
    };
    onsite: {
      acceptedLocation: string;
      locationRequiresManualReview: true;
    };
    baseLocation: string;
  };
  acceptedEmploymentTypes: readonly ['CLT', 'PJ', 'INTERNSHIP'];
  nonTargetEmploymentTypes: readonly ['COOPERATIVE', 'TEMPORARY'];
  unknownEmploymentTypeIsAutomaticallyInvalid: false;
  salaryRequired: false;
  discoveryTitles: readonly string[];
  skillCategories: typeof SkillCategory;
}
