import { describe, expect, it, jest } from '@jest/globals';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { JobClassifierService } from '../src/job-classifier/job-classifier.service';
import { JobDecisionService } from '../src/job-decision/job-decision.service';
import { JobScoreService } from '../src/job-score/job-score.service';
import { JobSearchService } from '../src/job-search/job-search.service';
import { GreenhouseProvider } from '../src/sources/greenhouse.provider';
import { RemotiveProvider } from '../src/sources/remotive.provider';
import { NormalizedJobInput } from '../src/sources/types';

function job(overrides: Partial<NormalizedJobInput> = {}): NormalizedJobInput {
  return {
    externalId: '1',
    title: 'Backend Node.js Junior',
    company: 'Example',
    description: 'Node.js, TypeScript, NestJS and PostgreSQL.',
    location: 'Brazil',
    workMode: WorkMode.REMOTE,
    employmentType: EmploymentType.CLT,
    source: JobSource.OTHER,
    sourceUrl: 'https://example.com/job/1',
    publishedAt: new Date('2026-08-20T00:00:00Z'),
    discoveredAt: new Date('2026-08-26T00:00:00Z'),
    ...overrides,
  };
}

function service(jobs: NormalizedJobInput[]) {
  const remotive = new RemotiveProvider();
  const greenhouse = new GreenhouseProvider();
  jest.spyOn(remotive, 'search').mockResolvedValue(jobs);
  jest.spyOn(greenhouse, 'search').mockResolvedValue([]);
  return new JobSearchService(
    remotive,
    greenhouse,
    new JobClassifierService(),
    new JobDecisionService(),
    new JobScoreService(),
  );
}

describe('JobSearchService presentation', () => {
  it('sends PwD vacancies to eligibility review instead of recommendations', async () => {
    const result = await service([
      job({
        title: 'Software Engineer (PwD Applicants Only)',
        description: 'Node.js, TypeScript and PostgreSQL.',
      }),
    ]).search();

    expect(result.eligibilityReviewJobs).toHaveLength(1);
    expect(result.eligibilityReviewJobs[0].eligibilityReviewRequired).toBe(
      true,
    );
    expect(result.eligibilityReviewJobs[0].eligibilityWarnings).toHaveLength(1);
    expect(result.recommendedJobs).toHaveLength(0);
  });

  it('includes a non-restricted Node Junior score of at least 60 in recommendations', async () => {
    const result = await service([job()]).search();

    expect(result.recommendedJobs).toHaveLength(1);
    expect(result.recommendedJobs[0].score.score).toBeGreaterThanOrEqual(60);
  });

  it('keeps an accepted low-score vacancy out of recommendations', async () => {
    const result = await service([
      job({ title: 'Node.js Junior', description: 'Node.js.' }),
    ]).search();

    expect(result.recommendedJobs).toHaveLength(0);
    expect(result.lowScoreJobs).toHaveLength(1);
    expect(result.lowScoreJobs[0].decision.decision).toBe('ACCEPT');
  });

  it('does not warn ordinary vacancies about eligibility', async () => {
    const result = await service([job()]).search();

    expect(result.recommendedJobs[0].eligibilityReviewRequired).toBe(false);
    expect(result.recommendedJobs[0].eligibilityWarnings).toEqual([]);
  });

  it('keeps presentation counters consistent', async () => {
    const result = await service([
      job({ externalId: 'recommended' }),
      job({
        externalId: 'low',
        title: 'Backend Node.js Junior',
        description: 'Node.js.',
      }),
      job({
        externalId: 'eligibility',
        title: 'Software Engineer (PwD Applicants Only)',
      }),
      job({ externalId: 'rejected', title: 'Backend Node.js Senior' }),
    ]).search();

    expect(result.summary.found).toBe(4);
    expect(result.summary.recommended).toBe(result.recommendedJobs.length);
    expect(result.summary.lowScore).toBe(result.lowScoreJobs.length);
    expect(result.summary.eligibilityReview).toBe(
      result.eligibilityReviewJobs.length,
    );
    expect(result.summary.rejected).toBe(1);
  });
});
