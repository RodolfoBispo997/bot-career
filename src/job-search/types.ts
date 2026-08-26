import { JobClassificationResult } from '../job-classifier/types';
import { JobDecisionResult } from '../job-decision/types';
import { JobScoreResult } from '../job-score/types';
import { NormalizedJobInput } from '../sources/types';

export interface JobSearchResultItem extends NormalizedJobInput {
  classification: JobClassificationResult;
  decision: JobDecisionResult;
  score: JobScoreResult;
}

export interface JobSearchResult {
  summary: {
    found: number;
    accepted: number;
    review: number;
    reviewLocation: number;
    rejected: number;
  };
  jobs: JobSearchResultItem[];
  sources: Record<
    string,
    {
      status: 'ok' | 'error';
      found: number;
      error?: string;
    }
  >;
}
