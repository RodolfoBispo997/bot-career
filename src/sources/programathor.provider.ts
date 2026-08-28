import { Injectable } from '@nestjs/common';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { JobProvider, NormalizedJobInput } from './types';
import { stripHtml } from './remotive.provider';

export interface ProgramathorJob {
  id?: string | number;
  title?: string;
  company?: string;
  description?: string;
  location?: string;
  url?: string;
  publishedAt?: string;
  workMode?: string;
  employmentType?: string;
}

const SEARCH_TERMS = [
  'node.js', 'node', 'nestjs', 'backend', 'back-end', 'software engineer',
  'software developer', 'fullstack', 'full stack', 'php', 'laravel',
  'symfony', 'estágio', 'estagio', 'trainee',
];

@Injectable()
export class ProgramathorProvider implements JobProvider {
  private readonly endpoint = 'https://programathor.com.br/jobs-node-js';

  async search(limit: number): Promise<NormalizedJobInput[]> {
    const response = await fetch(this.endpoint, {
      headers: { Accept: 'text/html' },
    });
    if (!response.ok) throw new Error(`ProgramaThor returned HTTP ${response.status}`);
    const html = await response.text();
    return this.parse(html).filter((job) => this.matches(job)).slice(0, limit);
  }

  normalize(job: ProgramathorJob): NormalizedJobInput {
    const description = stripHtml(job.description ?? '');
    const context = `${job.title ?? ''} ${description} ${job.location ?? ''} ${job.workMode ?? ''}`.toLowerCase();
    return {
      externalId: job.id === undefined ? null : String(job.id),
      title: job.title?.trim() || 'Untitled job',
      company: job.company?.trim() || null,
      description,
      location: job.location?.trim() || null,
      workMode: this.workMode(context),
      employmentType: this.employment(context),
      source: JobSource.OTHER,
      sourceUrl: job.url ?? '',
      publishedAt: this.date(job.publishedAt),
      discoveredAt: new Date(),
    };
  }

  private parse(html: string): NormalizedJobInput[] {
    const jobs: NormalizedJobInput[] = [];
    const links = /<a[^>]+href=["']((?:https?:\/\/programathor\.com\.br)?\/jobs\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(links)) {
      const card = match[2];
      if (/vencida/i.test(stripHtml(card))) continue;
      const heading = card.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
      const title = stripHtml(heading?.[1] ?? card)
        .replace(/\s+/g, ' ')
        .trim();
      if (!title) continue;
      const description = stripHtml(card).replace(/\s+/g, ' ').trim();
      const id = match[1].match(/\/jobs\/(\d+)/i)?.[1];
      const location =
        this.extractField(card, 'location|local|cidade') ??
        this.findLocation(description);
      const company =
        this.extractField(card, 'company|empresa') ??
        this.findCompany(description, title, location);
      jobs.push(
        this.normalize({
          id,
          title,
          description,
          company,
          location,
          url: match[1].startsWith('http')
            ? match[1]
            : `https://programathor.com.br${match[1]}`,
        }),
      );
    }
    return jobs;
  }

  private extractField(card: string, names: string): string | undefined {
    const field = card.match(
      new RegExp(
        `<[^>]+class=["'][^"']*(?:${names})[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
        'i',
      ),
    );
    const value = field ? stripHtml(field[1]).replace(/\s+/g, ' ').trim() : '';
    return value || undefined;
  }

  private findCompany(
    text: string,
    title: string,
    location?: string,
  ): string | undefined {
    const remainder = text.slice(text.indexOf(title) + title.length).trim();
    const boundary = location
      ? remainder.toLowerCase().indexOf(location.toLowerCase())
      : -1;
    const candidate = (boundary >= 0
      ? remainder.slice(0, boundary)
      : remainder.split(/\b(?:remoto|h[ií]brido|presencial|clt|pj)\b/i)[0]
    )
      .replace(/[|•·-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return candidate || undefined;
  }

  private findLocation(text: string): string | undefined {
    const locations = [
      'São Paulo',
      'São Bernardo do Campo',
      'Barueri',
      'Osasco',
      'Alphaville',
      'Cajamar',
      'Guarulhos',
      'remoto Brasil',
    ];
    return locations.find((location) =>
      text.toLowerCase().includes(location.toLowerCase()),
    );
  }

  private matches(job: NormalizedJobInput): boolean {
    const text = `${job.title} ${job.description}`.toLowerCase();
    return SEARCH_TERMS.some((term) => text.includes(term));
  }

  private workMode(text: string): WorkMode {
    if (text.includes('hybrid') || text.includes('híbrido')) return WorkMode.HYBRID;
    if (text.includes('remote') || text.includes('remoto')) return WorkMode.REMOTE;
    if (text.includes('presencial') || text.includes('onsite')) return WorkMode.ONSITE;
    return WorkMode.UNKNOWN;
  }

  private employment(text: string): EmploymentType {
    if (/(?<![a-z])pj(?![a-z])/i.test(text)) return EmploymentType.PJ;
    if (/(?<![a-z])clt(?![a-z])/i.test(text)) return EmploymentType.CLT;
    if (text.includes('estágio') || text.includes('estagio')) return EmploymentType.INTERNSHIP;
    if (text.includes('trainee')) return EmploymentType.TRAINEE;
    return EmploymentType.UNKNOWN;
  }

  private date(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
