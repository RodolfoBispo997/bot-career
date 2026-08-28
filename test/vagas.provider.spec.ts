import { describe, expect, it, jest } from '@jest/globals';
import { EmploymentType, WorkMode } from '@prisma/client';
import { VagasProvider } from '../src/sources/vagas.provider';
import { JobClassifierService } from '../src/job-classifier/job-classifier.service';

describe('VagasProvider', () => {
  it('normalizes a public Vagas.com.br job', () => {
    const result = new VagasProvider().normalize({
      id: '123',
      title: 'Desenvolvedor Node.js',
      company: 'Acme',
      description: 'Node.js e backend. CLT.',
      employmentType: 'CLT',
      location: 'São Paulo',
      url: 'https://www.vagas.com.br/vagas/v-123',
    });
    expect(result).toMatchObject({
      externalId: '123',
      title: 'Desenvolvedor Node.js',
      company: 'Acme',
      location: 'São Paulo',
      workMode: WorkMode.UNKNOWN,
      employmentType: EmploymentType.CLT,
      sourceUrl: 'https://www.vagas.com.br/vagas/v-123',
    });
  });

  it('collects matching jobs from mocked public HTML', async () => {
    const originalFetch = global.fetch;
    const mockedFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    mockedFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        '<li class="vaga" data-id-vaga="456"><a class="link-detalhes-vaga" href="/vagas/v-456">Backend Node.js</a><span class="emprVaga">Acme</span><span class="nivelVaga">Pleno</span><div class="vaga-local"><i class="bx bx-map"></i> São Paulo / SP <div class="tooltip-place">detalhes</div></div><span class="data-publicacao">2026-08-20</span></li>',
    } as Response);
    global.fetch = mockedFetch;
    try {
      const [job] = await new VagasProvider().search(10);
      expect(job).toMatchObject({ externalId: '456', location: 'São Paulo / SP' });
      expect(new JobClassifierService().classify(job).seniority).toBe('MID');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('preserves senior level and remote home office location', async () => {
    const originalFetch = global.fetch;
    const mockedFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    mockedFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        '<li class="vaga" data-id-vaga="457"><a class="link-detalhes-vaga" href="/vagas/v-457">Backend Node.js</a><span class="nivelVaga">Sênior</span><span class="vaga-local"><i class="bx bx-map"></i> 100% Home Office</span></li>',
    } as Response);
    global.fetch = mockedFetch;
    try {
      const [job] = await new VagasProvider().search(10);
      expect(job.location).toBe('100% Home Office');
      expect(job.workMode).toBe('REMOTE');
      expect(new JobClassifierService().classify(job).seniority).toBe('SENIOR');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
