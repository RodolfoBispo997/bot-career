import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { NormalizedJobInput, JobProvider } from './types';
import { stripHtml } from './remotive.provider';

interface GreenhouseJob {
  id?: number;
  title?: string;
  content?: string;
  location?: { name?: string };
  absolute_url?: string;
  updated_at?: string;
  first_published?: string;
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

const SEARCH_TERMS = [
  'node',
  'nest',
  'backend',
  'back-end',
  'software engineer',
  'software developer',
  'fullstack',
  'full stack',
  'php',
  'laravel',
  'symfony',
  'estagio',
];

@Injectable()
export class GreenhouseProvider implements JobProvider {
  private readonly boardToken = 'stone';
  private readonly endpoint = `https://boards-api.greenhouse.io/v1/boards/${this.boardToken}/jobs?content=true`;

  async search(limit: number): Promise<NormalizedJobInput[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(this.endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok)
        throw new Error(`Greenhouse returned HTTP ${response.status}`);

      const payload = (await response.json()) as GreenhouseResponse;
      return (payload.jobs ?? [])
        .filter((job) => this.matchesSearchTerms(job))
        .slice(0, limit)
        .map((job) => this.normalize(job));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown provider error';
      throw new ServiceUnavailableException(
        `Unable to search Greenhouse: ${message}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  normalize(job: GreenhouseJob): NormalizedJobInput {
    const description = stripHtml(job.content ?? '');
    const context = `${job.title ?? ''} ${description}`.toLowerCase();
    return {
      externalId: job.id === undefined ? null : String(job.id),
      title: job.title?.trim() || 'Untitled job',
      company: 'Stone',
      description,
      location: job.location?.name?.trim() || null,
      workMode: this.detectWorkMode(context),
      employmentType: this.detectEmploymentType(context),
      source: JobSource.GREENHOUSE,
      sourceUrl: job.absolute_url ?? '',
      publishedAt: this.parseDate(job.first_published ?? job.updated_at),
      discoveredAt: new Date(),
    };
  }

  private matchesSearchTerms(job: GreenhouseJob): boolean {
    const text =
      `${job.title ?? ''} ${stripHtml(job.content ?? '')}`.toLowerCase();
    return SEARCH_TERMS.some((term) => text.includes(term));
  }

  private detectWorkMode(text: string): WorkMode {
    if (text.includes('hybrid') || text.includes('híbrido'))
      return WorkMode.HYBRID;
    if (
      text.includes('onsite') ||
      text.includes('on-site') ||
      text.includes('presencial')
    )
      return WorkMode.ONSITE;
    if (text.includes('remote') || text.includes('remoto'))
      return WorkMode.REMOTE;
    return WorkMode.UNKNOWN;
  }

  private detectEmploymentType(text: string): EmploymentType {
    if (
      text.includes('intern') ||
      text.includes('estágio') ||
      text.includes('estagio')
    )
      return EmploymentType.INTERNSHIP;
    if (text.includes('trainee')) return EmploymentType.TRAINEE;
    return EmploymentType.UNKNOWN;
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
