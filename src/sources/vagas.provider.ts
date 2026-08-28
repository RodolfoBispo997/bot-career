import { Injectable } from '@nestjs/common';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { JobProvider, NormalizedJobInput } from './types';
import { stripHtml } from './remotive.provider';

interface VagasJob {
  id?: string;
  title?: string;
  company?: string;
  description?: string;
  location?: string;
  url?: string;
  publishedAt?: string;
  employmentType?: string;
}

const SEARCH_TERMS = [
  'node.js',
  'node',
  'backend',
  'back-end',
  'fullstack',
  'full stack',
  'php',
  'estágio',
  'estagio',
];
const SEARCH_QUERIES = [
  'Desenvolvedor',
  'Desenvolvedor Backend',
  'Software Engineer',
  'Full Stack',
  'PHP',
  'Estágio Desenvolvimento',
];

@Injectable()
export class VagasProvider implements JobProvider {
  private readonly endpoint = 'https://www.vagas.com.br/vagas/pesquisas?q=';

  async search(limit: number): Promise<NormalizedJobInput[]> {
    const results = await Promise.all(
      SEARCH_QUERIES.map(async (query) => {
        try {
          const response = await fetch(
            `${this.endpoint}${encodeURIComponent(query)}`,
            {
              headers: { Accept: 'text/html' },
            },
          );
          if (!response.ok)
            throw new Error(`Vagas.com.br returned HTTP ${response.status}`);
          return this.parse(await response.text());
        } catch {
          return [];
        }
      }),
    );
    const seen = new Set<string>();
    return results
      .flat()
      .filter((job) => this.matches(job))
      .filter((job) => {
        const key = job.externalId ?? job.sourceUrl;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  }

  normalize(job: VagasJob): NormalizedJobInput {
    const description = stripHtml(job.description ?? '');
    const context =
      `${job.title ?? ''} ${description} ${job.location ?? ''}`.toLowerCase();
    return {
      externalId: job.id ?? null,
      title: job.title?.trim() || 'Untitled job',
      company: job.company?.trim() || null,
      description,
      location: job.location?.trim() || null,
      workMode: this.workMode(context),
      employmentType: this.employmentType(job.employmentType),
      source: JobSource.OTHER,
      sourceUrl: job.url ?? '',
      publishedAt: job.publishedAt ? this.date(job.publishedAt) : null,
      discoveredAt: new Date(),
    };
  }

  private parse(html: string): NormalizedJobInput[] {
    const jobs: NormalizedJobInput[] = [];
    const cards =
      /<li[^>]+class=["'][^"']*\bvaga\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
    for (const match of html.matchAll(cards)) {
      const card = match[0];
      const link = card.match(
        /<a[^>]+class=["'][^"']*link-detalhes-vaga[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
      );
      if (!link) continue;
      const title = stripHtml(link[2]).replace(/\s+/g, ' ').trim();
      if (!title || /vencid[ao]/i.test(title)) continue;
      const description = stripHtml(card).replace(/\s+/g, ' ').trim();
      const url = link[1].startsWith('http')
        ? link[1]
        : `https://www.vagas.com.br${link[1]}`;
      const id = card.match(/data-id-vaga=["']([^"']+)["']/i)?.[1];
      jobs.push(
        this.normalize({
          id,
          title,
          description,
          company: this.field(card, 'emprVaga'),
          location: this.field(card, 'vaga-local'),
          employmentType: this.field(
            card,
            'tipo-contratacao|regime|contratacao',
          ),
          publishedAt: this.field(card, 'data-publicacao'),
          url,
        }),
      );
    }
    return jobs;
  }

  private field(card: string, names: string): string | undefined {
    const match = card.match(
      new RegExp(
        `<[^>]+class=["'][^"']*(?:${names})[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
        'i',
      ),
    );
    const value = match ? stripHtml(match[1]).replace(/\s+/g, ' ').trim() : '';
    return value || undefined;
  }

  private date(value: string): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private matches(job: NormalizedJobInput): boolean {
    const text = `${job.title} ${job.description}`.toLowerCase();
    return SEARCH_TERMS.some((term) => text.includes(term));
  }

  private workMode(text: string): WorkMode {
    if (text.includes('híbrido') || text.includes('hybrid'))
      return WorkMode.HYBRID;
    if (text.includes('remoto') || text.includes('remote'))
      return WorkMode.REMOTE;
    if (text.includes('presencial') || text.includes('onsite'))
      return WorkMode.ONSITE;
    return WorkMode.UNKNOWN;
  }

  private employmentType(explicit?: string): EmploymentType {
    const value = explicit?.toLowerCase() ?? '';
    if (value.includes('trainee')) return EmploymentType.TRAINEE;
    if (value.includes('estágio') || value.includes('estagio'))
      return EmploymentType.INTERNSHIP;
    if (/\bclt\b/.test(value)) return EmploymentType.CLT;
    if (/\bpj\b/.test(value)) return EmploymentType.PJ;
    return EmploymentType.UNKNOWN;
  }
}
