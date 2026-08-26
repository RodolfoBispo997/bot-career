import { SearchProfile } from '../search-profile/types';
import {
  JobClassificationInput,
  JobClassificationResult,
} from '../job-classifier/types';
import { JobDecisionResult } from '../job-decision/types';

export interface JobScoreInput {
  job: JobClassificationInput;
  classification: JobClassificationResult;
  decision: JobDecisionResult;
  profile: SearchProfile;
}

export type JobPriority =
  | 'TOP_PRIORITY'
  | 'HIGH_PRIORITY'
  | 'RECOMMENDED'
  | 'REVIEW'
  | 'LOW'
  | 'REJECTED';

export interface ScoreComponent {
  score: number;
  max: number;
}

export interface JobScoreResult {
  score: number;
  priority: JobPriority;
  breakdown: {
    stack: ScoreComponent;
    seniority: ScoreComponent;
    role: ScoreComponent;
    workMode: ScoreComponent;
    employmentType: ScoreComponent;
    complementarySkills: ScoreComponent;
  };
  positives: string[];
  penalties: string[];
  warnings: string[];
}
