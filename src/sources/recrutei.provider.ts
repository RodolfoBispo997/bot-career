import { Injectable } from '@nestjs/common';
import { EmploymentType, JobSource, WorkMode } from '@prisma/client';
import { JobProvider, NormalizedJobInput } from './types';
import { stripHtml } from './remotive.provider';

interface RecruteiJob {
  id?: string;
  title?: string;
  company?: string;
  description?: string;
  location?: string;
  workMode?: string;
  employmentType?: string;
  sourceUrl?: string;
  publishedAt?: string;
}

interface JobPosting {
  '@type'?: string | string[];
  title?: string;
  description?: string;
  datePosted?: string;
  employmentType?: string | string[];
  hiringOrganization?: { name?: string };
  jobLocation?:
    | { address?: { addressLocality?: string; addressRegion?: string } }
    | Array<{ address?: { addressLocality?: string; addressRegion?: string } }>;
}

const SEARCH_TERMS = [
  'node',
  'backend',
  'back-end',
  'fullstack',
  'full stack',
  'php',
  'desenvolvimento',
  'software',
  'estágio',
  'estagio',
];

@Injectable()
export class RecruteiProvider implements JobProvider {
  private readonly endpoint = 'https://empregos.recrutei.com.br/vagas';
  private readonly baseUrl = 'https://empregos.recrutei.com.br';

  async search(limit: number): Promise<NormalizedJobInput[]> {
    const response = await fetch(this.endpoint, {
      headers: { Accept: 'text/html' },
    });
    if (!response.ok)
      throw new Error(`Recrutei returned HTTP ${response.status}`);

    const links = this.listJobs(await response.text())
      .filter((job) => this.matches(job.title))
      .slice(0, limit);
    const jobs = await Promise.all(links.map((job) => this.load(job)));
    return jobs.filter((job): job is NormalizedJobInput => job !== null);
  }

  normalize(job: RecruteiJob): NormalizedJobInput {
    const context = `${job.title ?? ''} ${job.description ?? ''} ${job.location ?? ''} ${job.workMode ?? ''}`.toLowerCase();
    return {
      externalId: job.id ?? null,
      title: job.title?.trim() || 'Untitled job',
      company: job.company?.trim() || null,
      description: stripHtml(job.description ?? ''),
      location: job.location?.trim() || null,
      workMode: this.workMode(context),
      employmentType: this.employmentType(job.employmentType),
      source: JobSource.OTHER,
      sourceUrl: job.sourceUrl ?? '',
      publishedAt: this.date(job.publishedAt),
      discoveredAt: new Date(),
    };
  }

  private listJobs(html: string): RecruteiJob[] {
    const seen = new Set<string>();
    return [...html.matchAll(/<a\b[^>]*href=["']([^"']*\/vaga\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap(
      (match) => {
        const sourceUrl = this.absoluteUrl(match[1]).split('?')[0];
        const id = sourceUrl.match(/\/([0-9]+)-[^/]+$/)?.[1];
        const title = stripHtml(match[2]).replace(/\s+/g, ' ').trim();
        if (!id || !title || seen.has(id)) return [];
        seen.add(id);
        return [{ id, title, sourceUrl }];
      },
    );
  }

  private async load(link: RecruteiJob): Promise<NormalizedJobInput | null> {
    const response = await fetch(link.sourceUrl ?? '', {
      headers: { Accept: 'text/html' },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const posting = this.jobPosting(html);
    const text = stripHtml(html).replace(/\s+/g, ' ').trim();
    const location = this.jsonLocation(posting) ??
      text.match(/(?:Localiza[cç][aã]o|Cidade)\s*:?\s*([^|]+?)(?=\s+(?:CLT|PJ|Est[aá]gio|Presencial|Remoto|H[ií]brido)\b)/i)?.[1];
    return this.normalize({
      ...link,
      title: posting?.title ?? link.title,
      company: posting?.hiringOrganization?.name ?? this.label(text, 'Empresa'),
      description: posting?.description ?? text,
      location,
      workMode: text,
      employmentType: this.jsonEmployment(posting) ?? text,
      publishedAt: posting?.datePosted,
    });
  }

  private jobPosting(html: string): JobPosting | null {
    const scripts = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );
    for (const script of scripts ?? []) {
      try {
        const value = JSON.parse(
          script.replace(/^<script[^>]*>|<\/script>$/gi, '').trim(),
        ) as (JobPosting & { '@graph'?: JobPosting[] }) | JobPosting[];
        const candidates: JobPosting[] = Array.isArray(value)
          ? value
          : value['@graph'] ?? [value];
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

  private jsonLocation(posting: JobPosting | null): string | undefined {
    const location = Array.isArray(posting?.jobLocation)
      ? posting.jobLocation[0]
      : posting?.jobLocation;
    const address = location?.address;
    if (!address) return undefined;
    return [address.addressLocality, address.addressRegion]
      .filter(Boolean)
      .join(' / ') || undefined;
  }

  private jsonEmployment(posting: JobPosting | null): string | undefined {
    const value = posting?.employmentType;
    return Array.isArray(value) ? value[0] : value;
  }

  private label(text: string, name: string): string | undefined {
    return text.match(new RegExp(`${name}\\s*:?\\s*([^|]+)`, 'i'))?.[1]?.trim();
  }

  private absoluteUrl(value: string): string {
    return value.startsWith('http') ? value : `${this.baseUrl}${value}`;
  }

  private matches(title?: string): boolean {
    const value = title?.toLowerCase() ?? '';
    return SEARCH_TERMS.some((term) => value.includes(term));
  }

  private workMode(value: string): WorkMode {
    if (value.includes('híbrido') || value.includes('hybrid')) return WorkMode.HYBRID;
    if (value.includes('remoto') || value.includes('remote')) return WorkMode.REMOTE;
    if (value.includes('presencial') || value.includes('onsite')) return WorkMode.ONSITE;
    return WorkMode.UNKNOWN;
  }

  private employmentType(value?: string): EmploymentType {
    const normalized = value?.toLowerCase() ?? '';
    if (normalized.includes('estágio') || normalized.includes('estagio')) return EmploymentType.INTERNSHIP;
    if (normalized.includes('trainee')) return EmploymentType.TRAINEE;
    if (/\bclt\b/.test(normalized)) return EmploymentType.CLT;
    if (/\bpj\b|pessoa jur[ií]dica/.test(normalized)) return EmploymentType.PJ;
    if (normalized.includes('tempor')) return EmploymentType.TEMPORARY;
    return EmploymentType.UNKNOWN;
  }

  private date(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}