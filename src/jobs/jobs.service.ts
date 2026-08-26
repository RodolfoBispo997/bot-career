import { Injectable, NotFoundException } from '@nestjs/common';
import { Job } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createJobDto: CreateJobDto): Promise<Job> {
    const { publishedAt, discoveredAt, ...jobData } = createJobDto;

    return this.prisma.job.create({
      data: {
        ...jobData,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        discoveredAt: discoveredAt ? new Date(discoveredAt) : undefined,
      },
    });
  }

  findAll(): Promise<Job[]> {
    return this.prisma.job.findMany({
      orderBy: { discoveredAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException(`Job with id ${id} not found`);
    }

    return job;
  }

  findBySourceAndExternalId(
    source: Job['source'],
    externalId: string,
  ): Promise<Job | null> {
    return this.prisma.job.findUnique({
      where: {
        source_externalId: { source, externalId },
      },
    });
  }
}
