import { Injectable } from '@nestjs/common';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { stripHtml } from './remotive.provider';
import { JobProvider, NormalizedJobInput } from './types';

export interface TramposJob {
  id?: string | number;
  title?: string;
  company?: string | string[];
  description?: string;
  location?: string | string[];
  workMode?: string | boolean;
  employmentType?: string | string[];
  url?: string;
  publishedAt?: string;
  name?: string;
  type_name?: string | string[];
  type_slug?: string;
  company_name?: string | string[];
  state?: string;
  city?: string;
  home_office?: boolean;
  published_at?: string;
  opportunities?: TramposJob[];
}

const SEARCH_TERMS = [
  'node',
  'backend',
  'fullstack',
  'php',
  'estágio',
  'estagio',
  'desenvolvimento',
];

@Injectable()
export class TramposProvider implements JobProvider {
  private readonly endpoint = 'https://trampos.co/oportunidades';

  async search(limit: number): Promise<NormalizedJobInput[]> {
    const response = await fetch(this.endpoint, {
      headers: { Accept: 'text/html' },
    });
    if (!response.ok)
      throw new Error(`Trampos returned HTTP ${response.status}`);
    const html = await response.text();
    const links = this.listOpportunities(html).filter((job) =>
      this.matches(job),
    );
    const jobs = await Promise.all(
      links.slice(0, limit).map((job) => this.load(job)),
    );
    return jobs.filter((job): job is NormalizedJobInput => job !== null);
  }

  normalize(job: TramposJob): NormalizedJobInput {
    const description = stripHtml(job.description ?? '');
    const context =
      `${job.title ?? ''} ${description} ${job.location ?? ''} ${job.workMode ?? ''} ${job.employmentType ?? ''}`.toLowerCase();
    return {
      externalId: job.id === undefined ? null : String(job.id),
      title: job.title?.trim() || 'Untitled job',
      company: this.text(job.company) || null,
      description,
      location: this.text(job.location) || null,
      workMode: this.workMode(context),
      employmentType: this.employment(context),
      source: JobSource.OTHER,
      sourceUrl: job.url ?? '',
      publishedAt: this.date(job.publishedAt),
      discoveredAt: new Date(),
    };
  }

  private listOpportunities(html: string): TramposJob[] {
    const groups = this.embeddedArray(html, 'opportunity_groups');
    const grouped = groups.flatMap((group) =>
      Array.isArray(group.opportunities) ? group.opportunities : [],
    );
    const highlighted = this.embeddedArray(html, 'highlighted_opportunities');
    const opportunities = grouped.length > 0 ? grouped : highlighted;
    const seen = new Set<string>();
    return opportunities.flatMap((opportunity) => {
      const id = opportunity.id;
      if (id === undefined || seen.has(String(id))) return [];
      seen.add(String(id));
      return [
        {
          ...opportunity,
          title: opportunity.name,
          company: opportunity.company_name,
          location: opportunity.city ?? opportunity.state,
          workMode: opportunity.home_office ? 'Remoto' : undefined,
          employmentType: opportunity.type_name,
          publishedAt: opportunity.published_at,
          url: `https://trampos.co/oportunidades/${id}`,
        },
      ];
    });
  }

  private embeddedArray(html: string, property: string): TramposJob[] {
    const marker = new RegExp(`["']?${property}["']?\\s*:\\s*\\[`, 'm').exec(
      html,
    );
    if (!marker || marker.index === undefined) return [];
    const start = marker.index + marker[0].lastIndexOf('[');
    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let index = start; index < html.length; index += 1) {
      const character = html[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = '';
        continue;
      }
      if (character === '"' || character === "'") quote = character;
      else if (character === '[') depth += 1;
      else if (character === ']' && --depth === 0) {
        try {
          return JSON.parse(html.slice(start, index + 1)) as TramposJob[];
        } catch {
          return this.embeddedObjects(html.slice(start, index + 1));
        }
      }
    }
    return [];
  }

  private embeddedObjects(value: string): TramposJob[] {
    return [
      ...value.matchAll(/\{[^{}]*["']?id["']?\s*:\s*\d+[^{}]*\}/g),
    ].flatMap((match) => {
      try {
        return [JSON.parse(match[0]) as TramposJob];
      } catch {
        return [];
      }
    });
  }

  private text(value?: string | string[]): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  }

  private async load(link: TramposJob): Promise<NormalizedJobInput | null> {
    const response = await fetch(link.url ?? '', {
      headers: { Accept: 'text/html' },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const jobPosting = this.jobPosting(html);
    const text = stripHtml(html).replace(/\s+/g, ' ').trim();
    const description = this.section(text, 'Descrição', 'Requisitos') ?? text;
    const company = text.match(/#\S[\s\S]*?\s+([\wÀ-ÿ .&-]+)\s+\|\s+/)?.[1];
    const location = text.match(
      /\|\s+([^|]+?)\s+\((?:Híbrido|Remoto|Presencial)\)/i,
    )?.[1];
    const workMode = text.match(/\((Híbrido|Remoto|Presencial)\)/i)?.[1];
    const employmentType = text.match(/Contratação\s*([A-ZÁÉÍÓÚÃÕÇ]+)/i)?.[1];
    const publishedAt = text.match(
      /há\s+(\d+)\s+(minuto|hora|dia|semana|mês|mes|ano)s?/i,
    )?.[0];
    return this.normalize({
      ...link,
      title: jobPosting?.title || this.heading(html) || link.title,
      company:
        this.jsonText(jobPosting?.hiringOrganization?.name) ??
        company ??
        link.company,
      description: jobPosting?.description || description,
      location: this.jsonLocation(jobPosting) ?? location ?? link.location,
      workMode:
        jobPosting?.description &&
        /h[ií]brido|trabalho h[ií]brido/i.test(jobPosting.description)
          ? 'Híbrido'
          : jobPosting?.jobLocation
            ? jobPosting.jobLocation.home_office
              ? 'Remoto'
              : (workMode ?? link.workMode)
            : (workMode ?? link.workMode),
      employmentType:
        jobPosting?.employmentType || employmentType || link.employmentType,
      publishedAt:
        jobPosting?.datePosted ||
        this.relativeDate(publishedAt) ||
        link.publishedAt,
    });
  }

  private jobPosting(html: string): Record<string, any> | null {
    const scripts = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );
    for (const script of scripts ?? []) {
      const content = script.replace(/^<script[^>]*>|<\/script>$/gi, '').trim();
      try {
        const value = JSON.parse(content) as
          Record<string, any> | Record<string, any>[];
        const candidates = Array.isArray(value) ? value : [value];
        const posting = candidates.find((candidate) =>
          Array.isArray(candidate['@type'])
            ? candidate['@type'].includes('JobPosting')
            : candidate['@type'] === 'JobPosting',
        );
        if (posting) return posting;
      } catch {
        continue;
      }
    }
    return null;
  }

  private jsonText(value: unknown): string | undefined {
    if (typeof value === 'string') return value.trim() || undefined;
    if (Array.isArray(value) && typeof value[0] === 'string')
      return value[0].trim() || undefined;
    return undefined;
  }

  private jsonLocation(
    jobPosting: Record<string, any> | null,
  ): string | undefined {
    const address = jobPosting?.jobLocation?.address;
    if (!address) return undefined;
    const locality = this.jsonText(address.addressLocality);
    const region = this.jsonText(address.addressRegion);
    return [locality, region].filter(Boolean).join(' / ') || undefined;
  }

  private heading(html: string): string | undefined {
    const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    return match ? stripHtml(match[1]).replace(/^#/, '').trim() : undefined;
  }

  private section(
    text: string,
    start: string,
    end: string,
  ): string | undefined {
    const match = text.match(new RegExp(`${start}([\\s\\S]*?)${end}`, 'i'));
    return match?.[1].trim();
  }

  private matches(job: TramposJob): boolean {
    const text =
      `${job.title ?? job.name ?? ''} ${this.text(job.company ?? job.company_name)} ${job.type_name ?? ''}`.toLowerCase();
    return SEARCH_TERMS.some((term) => text.includes(term));
  }

  private workMode(text: string): WorkMode {
    if (text.includes('híbrido') || text.includes('hybrid'))
      return WorkMode.HYBRID;
    if (text.includes('remoto') || text.includes('home office'))
      return WorkMode.REMOTE;
    if (text.includes('presencial') || text.includes('onsite'))
      return WorkMode.ONSITE;
    return WorkMode.UNKNOWN;
  }

  private employment(text: string): EmploymentType {
    if (text.includes('estágio') || text.includes('estagio'))
      return EmploymentType.INTERNSHIP;
    if (text.includes('trainee')) return EmploymentType.TRAINEE;
    if (text.includes('clt')) return EmploymentType.CLT;
    if (text.includes('pj')) return EmploymentType.PJ;
    if (text.includes('emprego')) return EmploymentType.OTHER;
    return EmploymentType.UNKNOWN;
  }

  private relativeDate(value?: string): string | undefined {
    const match = value?.match(
      /há\s+(\d+)\s+(minuto|hora|dia|semana|mês|mes|ano)/i,
    );
    if (!match) return undefined;
    const units: Record<string, number> = {
      minuto: 60_000,
      hora: 3_600_000,
      dia: 86_400_000,
      semana: 604_800_000,
      mês: 2_592_000_000,
      mes: 2_592_000_000,
      ano: 31_536_000_000,
    };
    return new Date(
      Date.now() - Number(match[1]) * (units[match[2].toLowerCase()] ?? 0),
    ).toISOString();
  }

  private date(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
