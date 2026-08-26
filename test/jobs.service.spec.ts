import { NotFoundException } from '@nestjs/common';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { JobsService } from '../src/jobs/jobs.service';
import { CreateJobDto } from '../src/jobs/dto/create-job.dto';

const validJob: CreateJobDto = {
  title: 'Backend Developer',
  description: 'Build APIs and services.',
  source: JobSource.GUPY,
  sourceUrl: 'https://example.com/jobs/123',
  workMode: WorkMode.REMOTE,
  employmentType: EmploymentType.CLT,
};

function createJobRecord(overrides = {}) {
  return {
    id: 'a7c3c7a6-6df4-4e5c-a6b6-2d83cbd7c3d6',
    externalId: null,
    title: validJob.title,
    company: null,
    description: validJob.description,
    location: null,
    workMode: WorkMode.REMOTE,
    employmentType: EmploymentType.CLT,
    source: JobSource.GUPY,
    sourceUrl: validJob.sourceUrl,
    publishedAt: null,
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('JobsService', () => {
  const prisma = {
    job: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const service = new JobsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a valid job', async () => {
    const created = createJobRecord();
    prisma.job.create.mockResolvedValue(created);

    await expect(service.create(validJob)).resolves.toEqual(created);
    expect(prisma.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: validJob.title,
        description: validJob.description,
        source: validJob.source,
      }),
    });
  });

  it('lists jobs ordered by discovery date', async () => {
    const jobs = [createJobRecord()];
    prisma.job.findMany.mockResolvedValue(jobs);

    await expect(service.findAll()).resolves.toEqual(jobs);
    expect(prisma.job.findMany).toHaveBeenCalledWith({
      orderBy: { discoveredAt: 'desc' },
    });
  });

  it('finds a job by id', async () => {
    const job = createJobRecord();
    prisma.job.findUnique.mockResolvedValue(job);

    await expect(service.findById(job.id)).resolves.toEqual(job);
  });

  it('throws when a job id does not exist', async () => {
    prisma.job.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
