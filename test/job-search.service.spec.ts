import { describe, expect, it, jest } from '@jest/globals';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { JobClassifierService } from '../src/job-classifier/job-classifier.service';
import { JobDecisionService } from '../src/job-decision/job-decision.service';
import { JobScoreService } from '../src/job-score/job-score.service';
import { JobSearchService } from '../src/job-search/job-search.service';
import { RemotiveProvider } from '../src/sources/remotive.provider';
import { NormalizedJobInput } from '../src/sources/types';

function normalizedJob(overrides: Partial<NormalizedJobInput> = {}): NormalizedJobInput {
  return {
    externalId: '1',
    title: 'Backend Node.js Junior',
    company: 'Example',
    description: 'Node.js, TypeScript, NestJS, PostgreSQL.',
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

describe('JobSearchService', () => {
  it('normalizes a Remotive job', () => {
    const provider = new RemotiveProvider();
    const result = provider.normalize({
      id: 42,
      title: 'Backend Node.js Developer',
      company_name: 'Acme',
      description: '<p>Node.js &amp; TypeScript</p>',
      candidate_required_location: 'Brazil',
      url: 'https://remotive.com/jobs/42',
      publication_date: '2026-08-25T12:00:00Z',
      job_type: 'full_time',
    });

    expect(result).toMatchObject({
      externalId: '42',
      title: 'Backend Node.js Developer',
      company: 'Acme',
      description: 'Node.js & TypeScript',
      location: 'Brazil',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.UNKNOWN,
      source: JobSource.OTHER,
      sourceUrl: 'https://remotive.com/jobs/42',
    });
    expect(result.publishedAt).toEqual(new Date('2026-08-25T12:00:00Z'));
  });

  it('classifies and scores provider results through the pipeline', async () => {
    const provider = new RemotiveProvider();
    jest.spyOn(provider, 'search').mockResolvedValue([normalizedJob()]);
    const service = new JobSearchService(
      provider,
      new JobClassifierService(),
      new JobDecisionService(),
      new JobScoreService(),
    );

    const result = await service.search(10);

    expect(result.summary.found).toBe(1);
    expect(result.jobs[0].classification.track).toBe('NODE');
    expect(result.jobs[0].decision.decision).toBe('ACCEPT');
    expect(result.jobs[0].score.score).toBeGreaterThan(0);
  });

  it('orders by acceptance and score and hides rejected jobs', async () => {
    const provider = new RemotiveProvider();
    jest.spyOn(provider, 'search').mockResolvedValue([
      normalizedJob({ externalId: 'low', description: 'Node.js.' }),
      normalizedJob({ externalId: 'high', description: 'Node.js, TypeScript, NestJS, PostgreSQL, Docker, APIs REST.' }),
      normalizedJob({ externalId: 'reject', title: 'Backend Node.js Senior' }),
    ]);
    const service = new JobSearchService(
      provider,
      new JobClassifierService(),
      new JobDecisionService(),
      new JobScoreService(),
    );

    const result = await service.search();

    expect(result.summary.rejected).toBe(1);
    expect(result.jobs).toHaveLength(2);
    expect(result.jobs[0].externalId).toBe('high');
    expect(result.jobs.some((job) => job.externalId === 'reject')).toBe(false);
  });

  it('propagates provider failures as controlled errors', async () => {
    const provider = new RemotiveProvider();
    jest.spyOn(provider, 'search').mockRejectedValue(new Error('source unavailable'));
    const service = new JobSearchService(
      provider,
      new JobClassifierService(),
      new JobDecisionService(),
      new JobScoreService(),
    );

    await expect(service.search()).rejects.toThrow('source unavailable');
  });
});
