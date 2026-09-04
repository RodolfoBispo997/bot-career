import { jest } from '@jest/globals';
import { EmploymentType, WorkMode } from '@prisma/client';
import { RecruteiProvider } from '../src/sources/recrutei.provider';

describe('RecruteiProvider', () => {
  it('collects matching public HTML links and normalizes JobPosting JSON-LD', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<a href="/vaga/acme/156923-desenvolvedor-node">Desenvolvedor Node.js</a><a href="/vaga/acme/1-designer">Designer</a>',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `<script type="application/ld+json">${JSON.stringify({
          '@type': 'JobPosting',
          title: 'Desenvolvedor Node.js',
          description: '<p>Backend com Node.js</p>',
          datePosted: '2026-09-03',
          employmentType: 'CLT',
          hiringOrganization: { name: 'Acme' },
          jobLocation: { address: { addressLocality: 'São Paulo', addressRegion: 'SP' } },
        })}</script><p>Presencial</p>`,
      } as Response);
    global.fetch = fetchMock;
    try {
      await expect(new RecruteiProvider().search(10)).resolves.toMatchObject([
        {
          externalId: '156923',
          company: 'Acme',
          location: 'São Paulo / SP',
          workMode: WorkMode.ONSITE,
          employmentType: EmploymentType.CLT,
          sourceUrl: 'https://empregos.recrutei.com.br/vaga/acme/156923-desenvolvedor-node',
          description: 'Backend com Node.js',
        },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('returns unknown optional fields without failing normalization', () => {
    const result = new RecruteiProvider().normalize({
      id: '2',
      title: 'Estágio em Desenvolvimento',
      description: 'Atuação remota',
      workMode: 'Remoto',
      employmentType: 'Estágio',
    });
    expect(result).toMatchObject({
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.INTERNSHIP,
      company: null,
      publishedAt: null,
    });
  });
});