import { describe, expect, it } from '@jest/globals';
import { EmploymentType, WorkMode } from '@prisma/client';
import { JobClassifierService } from '../src/job-classifier/job-classifier.service';
import { JobDecisionService } from '../src/job-decision/job-decision.service';
import { JobDecisionInput } from '../src/job-decision/types';
import { SEARCH_PROFILE } from '../src/search-profile/search-profile.config';
import { JobTrack, RoleType, Seniority } from '../src/search-profile/types';

const classifier = new JobClassifierService();
const decisionService = new JobDecisionService();

function evaluate(
  title: string,
  description: string,
  employmentType: EmploymentType = EmploymentType.CLT,
  workMode: WorkMode = WorkMode.REMOTE,
): ReturnType<typeof decisionService.evaluate> {
  const job = {
    title,
    description,
    employmentType,
    workMode,
    location: 'São Paulo - SP',
  };
  const classification = classifier.classify(job);

  return decisionService.evaluate({
    job,
    classification,
    profile: SEARCH_PROFILE,
  });
}

describe('JobDecisionService', () => {
  it.each([
    [
      'Node.js Junior remoto CLT',
      'Backend Node.js Junior',
      'Node.js e TypeScript.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'ACCEPT',
    ],
    [
      'Node.js Junior/Pleno remoto PJ',
      'Backend Node.js Junior/Pleno',
      'Node.js e TypeScript.',
      EmploymentType.PJ,
      WorkMode.REMOTE,
      'ACCEPT',
    ],
    [
      'Node.js Pleno remoto',
      'Backend Node.js Pleno',
      'Node.js, TypeScript e PostgreSQL.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'REVIEW',
    ],
    [
      'Node.js Senior remoto',
      'Backend Node.js Senior',
      'Node.js e TypeScript.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'REJECT',
    ],
    [
      'PHP Pleno remoto CLT',
      'Desenvolvedor PHP Pleno',
      'PHP, Laravel e MySQL.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'ACCEPT',
    ],
    [
      'PHP Senior',
      'Desenvolvedor PHP Senior',
      'PHP, Laravel e MySQL.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'REJECT',
    ],
    [
      'Estágio Node.js',
      'Estágio em Desenvolvimento',
      'Backend com Node.js e TypeScript.',
      EmploymentType.INTERNSHIP,
      WorkMode.REMOTE,
      'ACCEPT',
    ],
    [
      'Estágio Java',
      'Estágio em Desenvolvimento',
      'Java e Spring Boot.',
      EmploymentType.INTERNSHIP,
      WorkMode.REMOTE,
      'REJECT',
    ],
    [
      'Fullstack Node.js',
      'Fullstack Developer Junior',
      'React no frontend e Node.js no backend.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'ACCEPT',
    ],
    [
      'Fullstack Python',
      'Fullstack Developer',
      'React no frontend e Python com Django no backend.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'REJECT',
    ],
    [
      'Node.js Junior híbrido',
      'Backend Node.js Junior',
      'Node.js e TypeScript.',
      EmploymentType.CLT,
      WorkMode.HYBRID,
      'REVIEW_LOCATION',
    ],
    [
      'PHP Pleno presencial',
      'Desenvolvedor PHP Pleno',
      'PHP, Laravel e MySQL.',
      EmploymentType.CLT,
      WorkMode.ONSITE,
      'REVIEW_LOCATION',
    ],
    [
      'Node.js Junior temporário',
      'Backend Node.js Junior',
      'Node.js e TypeScript.',
      EmploymentType.TEMPORARY,
      WorkMode.REMOTE,
      'REJECT',
    ],
    [
      'PHP Pleno cooperativo',
      'Desenvolvedor PHP Pleno',
      'PHP, Laravel e MySQL.',
      EmploymentType.COOPERATIVE,
      WorkMode.REMOTE,
      'REJECT',
    ],
    [
      'Node.js Junior regime desconhecido',
      'Backend Node.js Junior',
      'Node.js e TypeScript.',
      EmploymentType.UNKNOWN,
      WorkMode.REMOTE,
      'ACCEPT',
    ],
    [
      'PHP moderno com jQuery',
      'Desenvolvedor PHP',
      'PHP, Laravel, MySQL e jQuery para uma tela legada.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'ACCEPT',
    ],
    [
      'WordPress com PHP',
      'WordPress Developer',
      'PHP e WordPress.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'REJECT',
    ],
    [
      'Magento com PHP',
      'Magento Developer',
      'PHP e Magento.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'REJECT',
    ],
    [
      'Node sem senioridade',
      'Software Developer Node.js',
      'Node.js, TypeScript e PostgreSQL.',
      EmploymentType.CLT,
      WorkMode.REMOTE,
      'ACCEPT',
    ],
  ])(
    'returns %s for the expected scenario',
    (_name, title, description, employmentType, workMode, expected) => {
      expect(
        evaluate(title, description, employmentType, workMode).decision,
      ).toBe(expected);
    },
  );

  it('reviews an ambiguous primary stack', () => {
    const job = {
      title: 'Backend Developer',
      description: 'Node.js e Java aparecem com força semelhante.',
      employmentType: EmploymentType.CLT,
      workMode: WorkMode.REMOTE,
      location: 'São Paulo - SP',
    };
    const classification = {
      isSoftwareRole: true,
      softwareRoleConfidence: 'HIGH' as const,
      track: JobTrack.NODE,
      seniority: Seniority.UNSPECIFIED,
      roleType: RoleType.BACKEND,
      primaryStack: 'NODE',
      detectedSkills: ['Node.js', 'Java'],
      positiveSkills: ['Node.js'],
      negativeSkills: ['Java'],
      isPotentiallyEligible: true,
      signals: [],
      warnings: ['Duas stacks aparecem com força semelhante'],
    };

    const result = decisionService.evaluate({
      job,
      classification,
      profile: SEARCH_PROFILE,
    });

    expect(result.decision).toBe('REVIEW');
    expect(result.matchedRules).toContain('AMBIGUOUS_PRIMARY_STACK_REVIEW');
  });

  it('does not reject Java mentioned only as a differential', () => {
    const result = evaluate(
      'Backend Node.js Junior',
      'Node.js obrigatório. Java é diferencial.',
    );

    expect(result.decision).toBe('ACCEPT');
  });

  it('does not reject secondary jQuery in a modern PHP vacancy', () => {
    const result = evaluate(
      'Desenvolvedor PHP',
      'PHP, Laravel e MySQL. Manutenção secundária de uma tela com jQuery.',
    );

    expect(result.decision).toBe('ACCEPT');
    expect(result.warnings).toContain('Stack PHP possui sinais de legado');
  });

  it('does not infer seniority from a senior team mention', () => {
    const result = evaluate(
      'Backend Node.js Developer',
      'Você trabalhará com um time de desenvolvedores seniores em Node.js.',
    );

    expect(result.decision).toBe('ACCEPT');
  });

  it('does not accept frontend React without a supported backend', () => {
    const result = evaluate(
      'Frontend React Developer',
      'React, CSS e acessibilidade.',
    );

    expect(result.decision).toBe('REJECT');
    expect(result.matchedRules).toContain('OTHER_TRACK_REJECT');
  });

  it('lets hard rejection take precedence over location review', () => {
    const result = evaluate(
      'Backend Node.js Senior',
      'Node.js e TypeScript.',
      EmploymentType.CLT,
      WorkMode.HYBRID,
    );

    expect(result.decision).toBe('REJECT');
    expect(result.matchedRules).toContain('NODE_SENIOR_REJECT');
  });
});
