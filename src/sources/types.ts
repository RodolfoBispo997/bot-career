import { EmploymentType, JobSource, WorkMode } from '@prisma/client';

export interface NormalizedJobInput {
  externalId: string | null;
  title: string;
  company: string | null;
  description: string;
  location: string | null;
  workMode: WorkMode;
  employmentType: EmploymentType;
  source: JobSource;
  sourceUrl: string;
  publishedAt: Date | null;
  discoveredAt: Date;
}

export interface JobProvider {
  search(limit: number): Promise<NormalizedJobInput[]>;
}
