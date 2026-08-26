import { EmploymentType, WorkMode } from '@prisma/client';
import { SearchProfile } from '../search-profile/types';
import { JobClassificationInput, JobClassificationResult } from '../job-classifier/types';

export type JobDecision = 'ACCEPT' | 'REVIEW' | 'REVIEW_LOCATION' | 'REJECT';

export interface JobDecisionInput {
  job: JobClassificationInput;
  classification: JobClassificationResult;
  profile: SearchProfile;
}

export interface JobDecisionResult {
  decision: JobDecision;
  reasons: string[];
  warnings: string[];
  matchedRules: string[];
}

export type DecisionJobData = Pick<
  JobClassificationInput,
  'title' | 'description' | 'employmentType' | 'workMode' | 'location'
> & {
  employmentType: EmploymentType;
  workMode: WorkMode;
};
