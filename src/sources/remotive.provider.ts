import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { NormalizedJobInput, JobProvider } from './types';

export interface RemotiveJob {
  id?: number | string;
  title?: string;
  company_name?: string;
  description?: string;
  candidate_required_location?: string;
  url?: string;
  publication_date?: string;
  job_type?: string;
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

const SEARCH_TERMS = [
  'node.js',
  'node',
  'backend',
  'back-end',
  'software engineer',
  'software developer',
  'desenvolvedor de software',
  'desenvolvedor backend',
  'fullstack',
  'full stack',
  'php',
  'laravel',
  'symfony',
  'estagio desenvolvimento',
  'estagio node.js',
];

@Injectable()
export class RemotiveProvider implements JobProvider {
  private readonly endpoint = 'https://remotive.com/api/remote-jobs';

  async search(limit: number): Promise<NormalizedJobInput[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${this.endpoint}?search=node&limit=${Math.min(limit, 100)}`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error(`Remotive returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as RemotiveResponse;
      const jobs = (payload.jobs ?? [])
        .filter((job) => this.matchesSearchTerms(job))
        .slice(0, limit);

      return jobs.map((job) => this.normalize(job));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown provider error';
      throw new ServiceUnavailableException(
        `Unable to search Remotive: ${message}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  normalize(job: RemotiveJob): NormalizedJobInput {
    const description = stripHtml(job.description ?? '');
    return {
      externalId: job.id === undefined ? null : String(job.id),
      title: job.title?.trim() || 'Untitled job',
      company: job.company_name?.trim() || null,
      description,
      location: job.candidate_required_location?.trim() || null,
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.UNKNOWN,
      source: JobSource.OTHER,
      sourceUrl: job.url ?? '',
      publishedAt: job.publication_date ? new Date(job.publication_date) : null,
      discoveredAt: new Date(),
    };
  }

  private matchesSearchTerms(job: RemotiveJob): boolean {
    const text =
      `${job.title ?? ''} ${stripHtml(job.description ?? '')}`.toLowerCase();
    return SEARCH_TERMS.some((term) => text.includes(term));
  }
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
