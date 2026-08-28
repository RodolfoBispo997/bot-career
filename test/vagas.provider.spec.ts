import { describe, expect, it, jest } from '@jest/globals';
import { EmploymentType, WorkMode } from '@prisma/client';
import { VagasProvider } from '../src/sources/vagas.provider';

describe('VagasProvider', () => {
  it('normalizes a public Vagas.com.br job', () => {
    const result = new VagasProvider().normalize({
      id: '123',
      title: 'Desenvolvedor Node.js',
      company: 'Acme',
      description: 'Node.js e backend. CLT.',
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
        '<a href="/vagas/v-456"><h2>Backend Node.js</h2>Acme São Paulo</a>',
    } as Response);
    global.fetch = mockedFetch;
    try {
      await expect(new VagasProvider().search(10)).resolves.toMatchObject([
        { externalId: '456', title: 'Backend Node.js' },
      ]);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
