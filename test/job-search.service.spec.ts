import { describe, expect, it, jest } from '@jest/globals';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { JobClassifierService } from '../src/job-classifier/job-classifier.service';
import { JobDecisionService } from '../src/job-decision/job-decision.service';
import { JobScoreService } from '../src/job-score/job-score.service';
import { JobSearchService } from '../src/job-search/job-search.service';
import { GreenhouseProvider } from '../src/sources/greenhouse.provider';
import { RemotiveProvider } from '../src/sources/remotive.provider';
import { ProgramathorProvider } from '../src/sources/programathor.provider';
import { NormalizedJobInput } from '../src/sources/types';

function normalizedJob(
  overrides: Partial<NormalizedJobInput> = {},
): NormalizedJobInput {
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
  it('normalizes a Greenhouse job', () => {
    const provider = new GreenhouseProvider();
    const result = provider.normalize({
      id: 77,
      title: 'Backend Node.js Developer',
      company_name: 'Stone',
      content: '<p>Node.js, TypeScript and PostgreSQL.</p>',
      location: { name: 'São Paulo, Brazil' },
      absolute_url: 'https://boards.greenhouse.io/stone/jobs/77',
      first_published: '2026-08-25T12:00:00Z',
    });

    expect(result).toMatchObject({
      externalId: '77',
      company: 'Stone',
      location: 'São Paulo, Brazil',
      workMode: WorkMode.UNKNOWN,
      employmentType: EmploymentType.UNKNOWN,
      source: JobSource.GREENHOUSE,
    });
  });

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

  it('normalizes a ProgramaThor job', () => {
    const provider = new ProgramathorProvider();
    const result = provider.normalize({
      id: 123,
      title: 'Desenvolvedor Backend Node.js',
      company: 'Thor Tech',
      description: '<p>Node.js e NestJS. Regime PJ.</p>',
      location: 'São Paulo',
      url: 'https://programathor.com.br/jobs/123-backend',
      publishedAt: '2026-08-25T12:00:00Z',
    });
    expect(result).toMatchObject({
      externalId: '123',
      title: 'Desenvolvedor Backend Node.js',
      company: 'Thor Tech',
      description: 'Node.js e NestJS. Regime PJ.',
      location: 'São Paulo',
      workMode: WorkMode.UNKNOWN,
      employmentType: EmploymentType.PJ,
      source: JobSource.OTHER,
    });
  });

  it('ignores a ProgramaThor expired job', async () => {
    const provider = new ProgramathorProvider();
    const originalFetch = global.fetch;
    const mockedFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    mockedFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        '<a href="/jobs/123-backend"><h2>Vencida Backend Node.js</h2></a>',
    } as Response);
    global.fetch = mockedFetch;
    await expect(provider.search(10)).resolves.toEqual([]);
    global.fetch = originalFetch;
  });

  it('classifies and scores provider results through the pipeline', async () => {
    const provider = new RemotiveProvider();
    const greenhouse = new GreenhouseProvider();
    const programathor = new ProgramathorProvider();
    jest
      .spyOn(greenhouse, 'search')
      .mockResolvedValue([
        normalizedJob({ source: JobSource.GREENHOUSE, externalId: '2' }),
      ]);
    jest.spyOn(provider, 'search').mockResolvedValue([normalizedJob()]);
    jest.spyOn(programathor, 'search').mockResolvedValue([
      normalizedJob({ externalId: '3', source: JobSource.OTHER }),
    ]);
    const service = new JobSearchService(
      provider,
      greenhouse,
      new JobClassifierService(),
      new JobDecisionService(),
      new JobScoreService(),
      programathor,
    );

    const result = await service.search(10);

    expect(result.summary.found).toBe(3);
    expect(result.jobs[0].classification.track).toBe('NODE');
    expect(result.jobs[0].decision.decision).toBe('ACCEPT');
    expect(result.jobs[0].score.score).toBeGreaterThan(0);
  });

  it('orders by acceptance and score and hides rejected jobs', async () => {
    const provider = new RemotiveProvider();
    const greenhouse = new GreenhouseProvider();
    const programathor = new ProgramathorProvider();
    jest.spyOn(programathor, 'search').mockResolvedValue([]);
    jest.spyOn(greenhouse, 'search').mockResolvedValue([]);
    jest.spyOn(provider, 'search').mockResolvedValue([
      normalizedJob({ externalId: 'low', description: 'Node.js.' }),
      normalizedJob({
        externalId: 'high',
        description:
          'Node.js, TypeScript, NestJS, PostgreSQL, Docker, APIs REST.',
      }),
      normalizedJob({
        externalId: 'reject',
        title: 'Backend Node.js Senior',
      }),
    ]);
    jest
      .spyOn(greenhouse, 'search')
      .mockResolvedValue([
        normalizedJob({ externalId: 'low', source: JobSource.GREENHOUSE }),
      ]);
    const service = new JobSearchService(
      provider,
      greenhouse,
      new JobClassifierService(),
      new JobDecisionService(),
      new JobScoreService(),
      programathor,
    );

    const result = await service.search();

    expect(result.summary.rejected).toBe(1);
    expect(result.jobs).toHaveLength(3);
    expect(result.jobs[0].externalId).toBe('high');
    expect(result.jobs.some((job) => job.externalId === 'reject')).toBe(false);
  });

  it('keeps the other source when one provider fails', async () => {
    const provider = new RemotiveProvider();
    const greenhouse = new GreenhouseProvider();
    const programathor = new ProgramathorProvider();
    jest
      .spyOn(greenhouse, 'search')
      .mockResolvedValue([normalizedJob({ source: JobSource.GREENHOUSE })]);
    jest
      .spyOn(provider, 'search')
      .mockRejectedValue(new Error('source unavailable'));
    jest.spyOn(programathor, 'search').mockRejectedValue(new Error('source unavailable'));
    const service = new JobSearchService(
      provider,
      greenhouse,
      new JobClassifierService(),
      new JobDecisionService(),
      new JobScoreService(),
      programathor,
    );

    const result = await service.search();

    expect(result.summary.found).toBe(1);
    expect(result.sources.remotive.status).toBe('error');
    expect(result.sources.greenhouse.status).toBe('ok');
  });
});
