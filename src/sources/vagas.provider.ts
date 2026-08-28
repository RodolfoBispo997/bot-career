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

@Injectable()
export class VagasProvider implements JobProvider {
  private readonly endpoint =
    'https://www.vagas.com.br/vagas-de-emprego?term=Node.js';

  async search(limit: number): Promise<NormalizedJobInput[]> {
    const response = await fetch(this.endpoint, {
      headers: { Accept: 'text/html' },
    });
    if (!response.ok) throw new Error(`Vagas.com.br returned HTTP ${response.status}`);
    const html = await response.text();
    return this.parse(html).filter((job) => this.matches(job)).slice(0, limit);
  }

  normalize(job: VagasJob): NormalizedJobInput {
    const description = stripHtml(job.description ?? '');
    const context = `${job.title ?? ''} ${description} ${job.location ?? ''}`.toLowerCase();
    return {
      externalId: job.id ?? null,
      title: job.title?.trim() || 'Untitled job',
      company: job.company?.trim() || null,
      description,
      location: job.location?.trim() || null,
      workMode: this.workMode(context),
      employmentType: this.employmentType(context),
      source: JobSource.OTHER,
      sourceUrl: job.url ?? '',
      publishedAt: null,
      discoveredAt: new Date(),
    };
  }

  private parse(html: string): NormalizedJobInput[] {
    const jobs: NormalizedJobInput[] = [];
    const links = /<a[^>]+href=["']((?:https?:\/\/www\.vagas\.com\.br)?\/vagas\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(links)) {
      const card = match[2];
      const heading = card.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
      const title = stripHtml(heading?.[1] ?? card).replace(/\s+/g, ' ').trim();
      if (!title || /vencid[ao]/i.test(title)) continue;
      const description = stripHtml(card).replace(/\s+/g, ' ').trim();
      const url = match[1].startsWith('http')
        ? match[1]
        : `https://www.vagas.com.br${match[1]}`;
      jobs.push(
        this.normalize({
          id: match[1].match(/\/vagas\/(?:v-)?([^/?#]+)/i)?.[1],
          title,
          description,
          company: this.field(card, 'company|empresa'),
          location: this.field(card, 'location|local|cidade'),
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

  private matches(job: NormalizedJobInput): boolean {
    const text = `${job.title} ${job.description}`.toLowerCase();
    return SEARCH_TERMS.some((term) => text.includes(term));
  }

  private workMode(text: string): WorkMode {
    if (text.includes('híbrido') || text.includes('hybrid')) return WorkMode.HYBRID;
    if (text.includes('remoto') || text.includes('remote')) return WorkMode.REMOTE;
    if (text.includes('presencial') || text.includes('onsite')) return WorkMode.ONSITE;
    return WorkMode.UNKNOWN;
  }

  private employmentType(text: string): EmploymentType {
    if (text.includes('estágio') || text.includes('estagio')) return EmploymentType.INTERNSHIP;
    if (text.includes('trainee')) return EmploymentType.TRAINEE;
    if (/\bclt\b/.test(text)) return EmploymentType.CLT;
    if (/\bpj\b/.test(text)) return EmploymentType.PJ;
    return EmploymentType.UNKNOWN;
  }
}
