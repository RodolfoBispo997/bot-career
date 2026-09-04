import { Injectable, Optional } from '@nestjs/common';
import { JobClassifierService } from '../job-classifier/job-classifier.service';
import { JobDecisionService } from '../job-decision/job-decision.service';
import { JobScoreService } from '../job-score/job-score.service';
import { SEARCH_PROFILE } from '../search-profile/search-profile.config';
import { RemotiveProvider } from '../sources/remotive.provider';
import { GreenhouseProvider } from '../sources/greenhouse.provider';
import { ProgramathorProvider } from '../sources/programathor.provider';
import { VagasProvider } from '../sources/vagas.provider';
import { TramposProvider } from '../sources/trampos.provider';
import { RecruteiProvider } from '../sources/recrutei.provider';
import { NormalizedJobInput } from '../sources/types';
import { JobSearchResult } from './types';
import { detectEligibilityReview } from './eligibility-review';

@Injectable()
export class JobSearchService {
  constructor(
    private readonly remotive: RemotiveProvider,
    private readonly greenhouse: GreenhouseProvider,
    private readonly classifier: JobClassifierService,
    private readonly decisionService: JobDecisionService,
    private readonly scoreService: JobScoreService,
    @Optional() private readonly programathor?: ProgramathorProvider,
    @Optional() private readonly vagas?: VagasProvider,
    @Optional() private readonly trampos?: TramposProvider,
    @Optional() private readonly recrutei?: RecruteiProvider,
  ) {}

  async search(limit = 100): Promise<JobSearchResult> {
    const boundedLimit = Math.max(1, Math.min(limit, 100));
    const results = await Promise.all([
      this.collect('remotive', () => this.remotive.search(100)),
      this.collect('greenhouse', () => this.greenhouse.search(boundedLimit)),
      this.collect(
        'programathor',
        () => this.programathor?.search(boundedLimit) ?? Promise.resolve([]),
      ),
      this.collect(
        'vagas',
        () => this.vagas?.search(boundedLimit) ?? Promise.resolve([]),
      ),
      this.collect(
        'trampos',
        () => this.trampos?.search(boundedLimit) ?? Promise.resolve([]),
      ),
      this.collect(
        'recrutei',
        () => this.recrutei?.search(boundedLimit) ?? Promise.resolve([]),
      ),
    ]);
    const sources = Object.fromEntries(
      results.map((result) => [
        result.name,
        result.name === 'greenhouse'
          ? { ...result.status, boards: this.greenhouse.getBoardStats() }
          : result.status,
      ]),
    );
    const normalizedJobs = this.deduplicate(
      results.flatMap((result) => result.jobs),
    );
    const jobs = normalizedJobs.map((job) => this.process(job));

    jobs.sort((left, right) => {
      const leftRejected = left.decision.decision === 'REJECT' ? 1 : 0;
      const rightRejected = right.decision.decision === 'REJECT' ? 1 : 0;
      if (leftRejected !== rightRejected) return leftRejected - rightRejected;
      if (left.score.score !== right.score.score)
        return right.score.score - left.score.score;
      return (
        (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0)
      );
    });

    const recommendedJobs = jobs
      .filter(
        (job) =>
          job.decision.decision !== 'REJECT' &&
          job.score.score >= 60 &&
          !job.eligibilityReviewRequired,
      )
      .slice(0, boundedLimit);
    const lowScoreJobs = jobs
      .filter(
        (job) =>
          job.decision.decision !== 'REJECT' &&
          job.score.score < 60 &&
          !job.eligibilityReviewRequired,
      )
      .slice(0, boundedLimit);
    const eligibilityReviewJobs = jobs
      .filter(
        (job) =>
          job.decision.decision !== 'REJECT' && job.eligibilityReviewRequired,
      )
      .slice(0, boundedLimit);

    return {
      summary: {
        found: normalizedJobs.length,
        recommended: recommendedJobs.length,
        lowScore: lowScoreJobs.length,
        eligibilityReview: eligibilityReviewJobs.length,
        accepted: jobs.filter((job) => job.decision.decision === 'ACCEPT')
          .length,
        review: jobs.filter((job) => job.decision.decision === 'REVIEW').length,
        reviewLocation: jobs.filter(
          (job) => job.decision.decision === 'REVIEW_LOCATION',
        ).length,
        rejected: jobs.filter((job) => job.decision.decision === 'REJECT')
          .length,
      },
      jobs: recommendedJobs,
      recommendedJobs,
      lowScoreJobs,
      eligibilityReviewJobs,
      sources,
    };
  }

  private async collect(
    name: string,
    search: () => Promise<NormalizedJobInput[]>,
  ) {
    try {
      const jobs = await search();
      return {
        name,
        jobs,
        status: { status: 'ok' as const, found: jobs.length },
      };
    } catch (error) {
      return {
        name,
        jobs: [],
        status: {
          status: 'error' as const,
          found: 0,
          error:
            error instanceof Error ? error.message : 'Unknown provider error',
        },
      };
    }
  }

  private deduplicate(jobs: NormalizedJobInput[]): NormalizedJobInput[] {
    const seenPrimary = new Set<string>();
    const crossSource = new Map<string, number[]>();
    const uniqueJobs: NormalizedJobInput[] = [];

    for (const job of jobs) {
      const primaryKey = job.externalId
        ? `${job.source}:${job.externalId}`
        : `${job.source}:${job.sourceUrl.toLowerCase()}`;
      if (seenPrimary.has(primaryKey)) continue;
      seenPrimary.add(primaryKey);

      const secondaryKey = this.crossSourceKey(job);
      const existingIndex = (crossSource.get(secondaryKey) ?? []).find(
        (index) =>
          uniqueJobs[index].source !== job.source &&
          this.locationsMatch(uniqueJobs[index].location, job.location),
      );
      if (
        existingIndex !== undefined &&
        uniqueJobs[existingIndex].source !== job.source
      ) {
        if (
          job.description.length > uniqueJobs[existingIndex].description.length
        ) {
          uniqueJobs[existingIndex] = job;
        }
        continue;
      }

      const indexes = crossSource.get(secondaryKey) ?? [];
      indexes.push(uniqueJobs.length);
      crossSource.set(secondaryKey, indexes);
      uniqueJobs.push(job);
    }

    return uniqueJobs;
  }

  private crossSourceKey(job: NormalizedJobInput): string {
    return [job.title, job.company ?? '']
      .map((value) => this.normalizeForDeduplication(value))
      .join('|');
  }

  private locationsMatch(left: string | null, right: string | null): boolean {
    const normalizedLeft = this.normalizeForDeduplication(left ?? '');
    const normalizedRight = this.normalizeForDeduplication(right ?? '');
    return !normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight;
  }

  private normalizeForDeduplication(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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

    const eligibility = detectEligibilityReview(job.title, job.description);
    return { ...job, classification, decision, score, ...eligibility };
  }
}
