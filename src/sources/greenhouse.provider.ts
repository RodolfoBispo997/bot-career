import { Injectable } from '@nestjs/common';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { stripHtml } from './remotive.provider';
import { JobProvider, NormalizedJobInput } from './types';

export interface GreenhouseJob {
  id?: number;
  title?: string;
  company_name?: string;
  content?: string;
  location?: { name?: string };
  absolute_url?: string;
  updated_at?: string;
  first_published?: string;
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

export interface GreenhouseBoard {
  company: string;
  token: string;
}

export interface GreenhouseBoardStat {
  status: 'ok' | 'error';
  found: number;
  error?: string;
}

export const GREENHOUSE_BOARDS: readonly GreenhouseBoard[] = [
  { company: 'Stone', token: 'stone' },
  { company: 'Grupo QuintoAndar', token: 'quintoandar' },
];

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
  'internship',
  'trainee',
];

@Injectable()
export class GreenhouseProvider implements JobProvider {
  private readonly boardStats = new Map<string, GreenhouseBoardStat>();

  async search(limit: number): Promise<NormalizedJobInput[]> {
    const results = await Promise.all(
      GREENHOUSE_BOARDS.map((board) => this.searchBoard(board)),
    );
    return results
      .flatMap((result) => result.jobs)
      .filter((job) => this.matchesSearchTerms(job))
      .slice(0, limit);
  }

  getBoardStats(): Record<string, GreenhouseBoardStat> {
    return Object.fromEntries(this.boardStats);
  }

  normalize(
    job: GreenhouseJob,
    company = job.company_name ?? null,
  ): NormalizedJobInput {
    const description = stripHtml(job.content ?? '');
    const context = `${job.title ?? ''} ${description}`.toLowerCase();
    return {
      externalId: job.id === undefined ? null : String(job.id),
      title: job.title?.trim() || 'Untitled job',
      company: company?.trim() || null,
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

  private async searchBoard(
    board: GreenhouseBoard,
  ): Promise<{ jobs: NormalizedJobInput[] }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const endpoint = `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`;

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Greenhouse returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as GreenhouseResponse;
      const jobs = (payload.jobs ?? []).map((job) =>
        this.normalize(job, job.company_name ?? board.company),
      );
      this.boardStats.set(board.company, { status: 'ok', found: jobs.length });
      return { jobs };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown provider error';
      this.boardStats.set(board.company, {
        status: 'error',
        found: 0,
        error: message,
      });
      return { jobs: [] };
    } finally {
      clearTimeout(timeout);
    }
  }

  private matchesSearchTerms(job: GreenhouseJob | NormalizedJobInput): boolean {
    const description =
      'description' in job ? job.description : stripHtml(job.content ?? '');
    const text = `${job.title ?? ''} ${description ?? ''}`.toLowerCase();
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
