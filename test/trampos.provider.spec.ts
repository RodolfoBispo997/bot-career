import { jest } from '@jest/globals';
import { EmploymentType, WorkMode } from '@prisma/client';
import { TramposProvider } from '../src/sources/trampos.provider';

describe('TramposProvider', () => {
  it('parses embedded opportunity groups and keeps only matching details', async () => {
    const provider = new TramposProvider();
    const originalFetch = global.fetch;
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `window.initialLoad = function(store) { return { highlighted_opportunities: [], opportunity_groups: [{ "opportunities": [
          { "id": 7, "name": "Desenvolvedor Fullstack", "type_name": ["Emprego"], "company_name": ["Acme"], "city": "São Paulo", "home_office": true, "published_at": "2026-09-03T12:00:00Z" },
          { "id": 7, "name": "Duplicada", "type_name": "Emprego" },
          { "id": 8, "name": "Designer", "type_name": "Emprego" }
        ] }] }; }`,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<h1>Desenvolvedor Fullstack</h1><p>Descrição Node.js</p>',
      } as Response);
    global.fetch = fetchMock;
    try {
      await expect(provider.search(10)).resolves.toMatchObject([
        {
          externalId: '7',
          title: 'Desenvolvedor Fullstack',
          company: 'Acme',
          location: 'São Paulo',
          workMode: WorkMode.REMOTE,
          employmentType: EmploymentType.OTHER,
          sourceUrl: 'https://trampos.co/oportunidades/7',
        },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('normalizes JobPosting JSON-LD details', async () => {
    const provider = new TramposProvider();
    const originalFetch = global.fetch;
    const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `window.initialLoad = function(store) { return { "opportunity_groups": [{ "opportunities": [{ "id": 774366, "name": "Desenvolvedor Fullstack" }] }] }; }`,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `<script type="application/ld+json">
        {"@type":"JobPosting","title":"Desenvolvedor(a) Full Stack","description":"Atue com produtos digitais. Experiência profissional com Ruby on Rails. Disponibilidade para trabalho híbrido em Bragança Paulista, SP.","datePosted":"2026-09-03","employmentType":"FULL_TIME","hiringOrganization":{"name":"Acme"},"jobLocation":{"address":{"addressLocality":"Bragança Paulista","addressRegion":"SP"}}}
      </script><h1>Desenvolvedor(a) Full Stack</h1>`,
      } as Response);
    global.fetch = fetchMock;
    try {
      const [result] = await provider.search(1);
      expect(result).toMatchObject({
        location: 'Bragança Paulista / SP',
        workMode: WorkMode.HYBRID,
        description: expect.stringContaining('Ruby on Rails'),
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});
