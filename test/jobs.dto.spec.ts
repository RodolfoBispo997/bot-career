import { validate } from 'class-validator';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { CreateJobDto } from '../src/jobs/dto/create-job.dto';

function validDto(): CreateJobDto {
  return Object.assign(new CreateJobDto(), {
    title: 'Backend Developer',
    description: 'Build APIs and services.',
    source: JobSource.GUPY,
    sourceUrl: 'https://example.com/jobs/123',
    workMode: WorkMode.REMOTE,
    employmentType: EmploymentType.CLT,
  });
}

describe('CreateJobDto', () => {
  it('accepts a valid job', async () => {
    await expect(validate(validDto())).resolves.toHaveLength(0);
  });

  it('rejects a job without title', async () => {
    const dto = validDto();
    dto.title = undefined as never;

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('title');
  });

  it('rejects an invalid source URL', async () => {
    const dto = validDto();
    dto.sourceUrl = 'not-a-url';

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('sourceUrl');
  });
});
