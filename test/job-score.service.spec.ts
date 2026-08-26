import { describe, expect, it } from '@jest/globals';
import { EmploymentType, WorkMode } from '@prisma/client';
import { JobClassifierService } from '../src/job-classifier/job-classifier.service';
import { JobDecisionService } from '../src/job-decision/job-decision.service';
import { JobScoreService } from '../src/job-score/job-score.service';
import { JobScoreResult } from '../src/job-score/types';
import { SEARCH_PROFILE } from '../src/search-profile/search-profile.config';

const classifier = new JobClassifierService();
const decisionService = new JobDecisionService();
const scoreService = new JobScoreService();

type Employment = EmploymentType;
type Mode = WorkMode;

function evaluate(
  title: string,
  description: string,
  employmentType: Employment = EmploymentType.CLT,
  workMode: Mode = WorkMode.REMOTE,
): JobScoreResult {
  const job = {
    title,
    description,
    employmentType,
    workMode,
    location: 'São Paulo - SP',
  };
  const classification = classifier.classify(job);
  const decision = decisionService.evaluate({
    job,
    classification,
    profile: SEARCH_PROFILE,
  });

  return scoreService.evaluate({
    job,
    classification,
    decision,
    profile: SEARCH_PROFILE,
  });
}

describe('JobScoreService', () => {
  it('scores a rich Node.js Junior vacancy highly', () => {
    const result = evaluate(
      'Desenvolvedor Backend Node.js Jr',
      'Node.js, TypeScript, NestJS, PostgreSQL, Docker, APIs REST.',
    );

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(['HIGH_PRIORITY', 'TOP_PRIORITY']).toContain(result.priority);
    expect(result.breakdown.stack.max).toBe(40);
  });

  it('scores a poor Node.js vacancy below a rich one', () => {
    const rich = evaluate(
      'Desenvolvedor Backend Node.js Jr',
      'Node.js, TypeScript, NestJS, PostgreSQL, Docker, APIs REST.',
    );
    const poor = evaluate('Backend Node.js Jr', 'Node.js apenas.');

    expect(poor.score).toBeLessThan(rich.score);
  });

  it('gives Node Mid a reasonable score but keeps the decision review', () => {
    const result = evaluate(
      'Desenvolvedor Backend Node.js Pleno',
      'Node.js, TypeScript, NestJS, PostgreSQL, Docker, APIs REST.',
    );

    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.priority).not.toBe('REJECTED');
    expect(result.penalties).toContain('Senioridade Pleno está acima do foco principal Node.js');
  });

  it('keeps a rejected Node Senior vacancy rejected despite strong technical signals', () => {
    const result = evaluate(
      'Desenvolvedor Backend Node.js Senior',
      'Node.js, TypeScript, NestJS, PostgreSQL, Docker, APIs REST.',
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.priority).toBe('REJECTED');
  });

  it('scores a modern PHP vacancy higher than a legacy PHP vacancy', () => {
    const modern = evaluate(
      'Desenvolvedor PHP Pleno',
      'PHP 8, Laravel, MySQL, APIs REST, Docker e SQL.',
    );
    const legacy = evaluate(
      'Desenvolvedor PHP',
      'PHP 5, jQuery e CodeIgniter.',
    );

    expect(modern.score).toBeGreaterThan(legacy.score);
    expect(legacy.penalties).toContain('Stack PHP contém tecnologia legacy');
  });

  it('scores a Node internship using its dedicated weights', () => {
    const result = evaluate(
      'Estágio em Desenvolvimento',
      'Backend com Node.js, TypeScript e PostgreSQL.',
      EmploymentType.INTERNSHIP,
    );

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.breakdown.stack.max).toBe(45);
    expect(result.breakdown.employmentType.max).toBe(10);
  });

  it('scores a poor Node internship below a richer one', () => {
    const rich = evaluate(
      'Estágio em Desenvolvimento',
      'Backend com Node.js, TypeScript e PostgreSQL.',
      EmploymentType.INTERNSHIP,
    );
    const poor = evaluate(
      'Estágio em Desenvolvimento',
      'Node.js apenas.',
      EmploymentType.INTERNSHIP,
    );

    expect(poor.score).toBeLessThan(rich.score);
  });

  it('keeps a high score while preserving location review', () => {
    const result = evaluate(
      'Desenvolvedor Backend Node.js Jr',
      'Node.js, TypeScript, NestJS, PostgreSQL, Docker, APIs REST.',
      EmploymentType.CLT,
      WorkMode.HYBRID,
    );

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.priority).not.toBe('REJECTED');
    expect(result.warnings).toContain('Localização precisa de revisão manual');
  });

  it('forces rejected employment types to REJECTED priority', () => {
    const result = evaluate(
      'Desenvolvedor Backend Node.js Jr',
      'Node.js, TypeScript, NestJS, PostgreSQL.',
      EmploymentType.TEMPORARY,
    );

    expect(result.priority).toBe('REJECTED');
    expect(result.breakdown.employmentType.score).toBe(0);
  });

  it('does not strongly penalize Java used only as a differential', () => {
    const result = evaluate(
      'Backend Node.js Junior',
      'Node.js obrigatório. Java é diferencial.',
    );

    expect(result.priority).not.toBe('REJECTED');
    expect(result.penalties).not.toContain('Stack principal possui sinais de ambiguidade');
  });

  it('penalizes an explicitly ambiguous stack', () => {
    const clear = evaluate(
      'Backend Node.js Junior',
      'Node.js, TypeScript e PostgreSQL.',
    );
    const job = {
      title: 'Backend Developer',
      description: 'Node.js e Java aparecem com força semelhante.',
      employmentType: EmploymentType.CLT,
      workMode: WorkMode.REMOTE,
      location: 'São Paulo - SP',
    };
    const classification = classifier.classify(job);
    classification.warnings.push('Duas stacks aparecem com força semelhante');
    const decision = decisionService.evaluate({
      job,
      classification,
      profile: SEARCH_PROFILE,
    });
    const ambiguous = scoreService.evaluate({
      job,
      classification,
      decision,
      profile: SEARCH_PROFILE,
    });

    expect(ambiguous.penalties).toContain('Stack principal possui sinais de ambiguidade');
    expect(ambiguous.score).toBeLessThan(clear.score);
  });

  it('does not subtract points for an absent technology', () => {
    const result = evaluate('Backend Node.js Junior', 'Node.js.');

    expect(result.penalties).not.toContain('Redis ausente');
  });

  it('returns zero for OTHER', () => {
    const result = evaluate('Frontend React Developer', 'React, CSS e acessibilidade.');

    expect(result.score).toBe(0);
    expect(result.priority).toBe('REJECTED');
  });

  it('ranks Node Junior above Node Mid with equivalent stack', () => {
    const junior = evaluate('Backend Node.js Junior', 'Node.js, TypeScript, PostgreSQL.');
    const mid = evaluate('Backend Node.js Pleno', 'Node.js, TypeScript, PostgreSQL.');

    expect(junior.score).toBeGreaterThan(mid.score);
  });

  it('keeps every score an integer in the 0 to 100 range', () => {
    const results = [
      evaluate('Backend Node.js Junior', 'Node.js, TypeScript.'),
      evaluate('Desenvolvedor PHP Pleno', 'PHP, Laravel, MySQL.'),
      evaluate('Estágio em Desenvolvimento', 'Node.js.', EmploymentType.INTERNSHIP),
      evaluate('Frontend React Developer', 'React.'),
    ];

    for (const result of results) {
      expect(Number.isInteger(result.score)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });
});
