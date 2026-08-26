import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';

export class CreateJobDto {
  @IsOptional()
  @IsString()
  externalId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsEnum(JobSource)
  source!: JobSource;

  @IsUrl()
  sourceUrl!: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsDateString()
  discoveredAt?: string;
}
