import { Injectable } from '@nestjs/common';
import { JobClassifierService } from '../job-classifier/job-classifier.service';
import { JobDecisionService } from '../job-decision/job-decision.service';
import { JobScoreService } from '../job-score/job-score.service';
import { SEARCH_PROFILE } from '../search-profile/search-profile.config';
import { RemotiveProvider } from '../sources/remotive.provider';
import { NormalizedJobInput } from '../sources/types';
import { JobSearchResult } from './types';

@Injectable()
export class JobSearchService {
  constructor(
    private readonly provider: RemotiveProvider,
    private readonly classifier: JobClassifierService,
    private readonly decisionService: JobDecisionService,
    private readonly scoreService: JobScoreService,
  ) {}

  async search(limit = 100): Promise<JobSearchResult> {
    const normalizedJobs = await this.provider.search(Math.max(1, Math.min(limit, 100)));
    const jobs = normalizedJobs.map((job) => this.process(job));

    jobs.sort((left, right) => {
      const leftRejected = left.decision.decision === 'REJECT' ? 1 : 0;
      const rightRejected = right.decision.decision === 'REJECT' ? 1 : 0;
      if (leftRejected !== rightRejected) return leftRejected - rightRejected;
      if (left.score.score !== right.score.score) return right.score.score - left.score.score;
      return (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);
    });

    return {
      summary: {
        found: jobs.length,
        accepted: jobs.filter((job) => job.decision.decision === 'ACCEPT').length,
        review: jobs.filter((job) => job.decision.decision === 'REVIEW').length,
        reviewLocation: jobs.filter((job) => job.decision.decision === 'REVIEW_LOCATION').length,
        rejected: jobs.filter((job) => job.decision.decision === 'REJECT').length,
      },
      jobs: jobs.filter((job) => job.decision.decision !== 'REJECT'),
    };
  }

  private process(job: NormalizedJobInput) {
    const classification = this.classifier.classify(job);
    const decision = this.decisionService.evaluate({
      job,
      classification,
      profile: SEARCH_PROFILE,
    });
    const score = this.scoreService.evaluate({
      job,
      classification,
      decision,
      profile: SEARCH_PROFILE,
    });

    return { ...job, classification, decision, score };
  }
}
