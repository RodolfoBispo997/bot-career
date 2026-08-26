import { describe, expect, it, jest } from '@jest/globals';
import { GreenhouseProvider } from '../src/sources/greenhouse.provider';

function greenhouseResponse(id: number, company: string) {
  return {
    jobs: [
      {
        id,
        title: 'Backend Node.js Developer',
        company_name: company,
        content: '<p>Node.js, TypeScript and PostgreSQL.</p>',
        location: { name: 'Brazil' },
        absolute_url: `https://example.com/jobs/${id}`,
        first_published: '2026-08-26T00:00:00Z',
      },
    ],
  };
}

describe('GreenhouseProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('aggregates public boards and applies limit after consolidation', async () => {
    const provider = new GreenhouseProvider();
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const isStone = url.includes('/stone/');
      return new Response(
        JSON.stringify(
          greenhouseResponse(
            isStone ? 1 : 2,
            isStone ? 'Stone' : 'Grupo QuintoAndar',
          ),
        ),
        { status: 200 },
      );
    });

    const jobs = await provider.search(1);

    expect(jobs).toHaveLength(1);
    expect(provider.getBoardStats()).toEqual({
      Stone: { status: 'ok', found: 1 },
      'Grupo QuintoAndar': { status: 'ok', found: 1 },
    });
  });

  it('keeps the successful board when another board fails', async () => {
    const provider = new GreenhouseProvider();
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('/stone/'))
        return new Response('', { status: 503 });
      return new Response(
        JSON.stringify(greenhouseResponse(2, 'Grupo QuintoAndar')),
        { status: 200 },
      );
    });

    const jobs = await provider.search(10);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe('Grupo QuintoAndar');
    expect(provider.getBoardStats().Stone.status).toBe('error');
    expect(provider.getBoardStats()['Grupo QuintoAndar'].status).toBe('ok');
  });
});
