import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EmploymentType, WorkMode } from '@prisma/client';

export class ClassifyJobDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @IsEnum(WorkMode)
  workMode!: WorkMode;

  @IsOptional()
  @IsString()
  location?: string;
}
