import { describe, expect, it } from '@jest/globals';
import { EmploymentType, WorkMode } from '@prisma/client';
import { JobClassifierService } from '../src/job-classifier/job-classifier.service';
import { JobClassificationInput } from '../src/job-classifier/types';
import { JobTrack, RoleType, Seniority } from '../src/search-profile/types';

const service = new JobClassifierService();

function classify(
  title: string,
  description: string,
): ReturnType<typeof service.classify> {
  const input: JobClassificationInput = {
    title,
    description,
    employmentType: EmploymentType.CLT,
    workMode: WorkMode.REMOTE,
    location: 'São Paulo - SP',
  };

  return service.classify(input);
}

describe('JobClassifierService', () => {
  it.each([
    [
      'Desenvolvedor Backend Node.js Jr',
      'Node.js, TypeScript, NestJS, PostgreSQL, Docker, APIs REST.',
      JobTrack.NODE,
      Seniority.JUNIOR,
      RoleType.BACKEND,
      'NODE',
    ],
    [
      'Software Engineer',
      'Backend com Node.js, TypeScript, AWS, PostgreSQL e microsserviços.',
      JobTrack.NODE,
      Seniority.UNSPECIFIED,
      RoleType.SOFTWARE_ENGINEERING,
      'NODE',
    ],
    [
      'Estágio em Desenvolvimento de Software',
      'Desenvolvimento backend utilizando Node.js, TypeScript e PostgreSQL.',
      JobTrack.NODE_INTERNSHIP,
      Seniority.INTERNSHIP,
      RoleType.BACKEND,
      'NODE',
    ],
    [
      'Estágio em Desenvolvimento',
      'Java, Spring Boot e PostgreSQL.',
      JobTrack.OTHER,
      Seniority.INTERNSHIP,
      RoleType.SOFTWARE_DEVELOPMENT,
      'JAVA',
    ],
    [
      'Desenvolvedor PHP Pleno',
      'PHP 8, Laravel, MySQL, APIs REST e Docker.',
      JobTrack.PHP,
      Seniority.MID,
      RoleType.BACKEND,
      'PHP',
    ],
    [
      'Backend Developer',
      'Java, Spring Boot, Hibernate, Oracle. Node.js é apenas um diferencial.',
      JobTrack.OTHER,
      Seniority.UNSPECIFIED,
      RoleType.BACKEND,
      'JAVA',
    ],
    [
      'Fullstack Developer Jr',
      'React no frontend e Node.js/NestJS no backend.',
      JobTrack.NODE,
      Seniority.JUNIOR,
      RoleType.FULLSTACK,
      'NODE',
    ],
    [
      'Fullstack Developer',
      'React + Python/Django.',
      JobTrack.OTHER,
      Seniority.UNSPECIFIED,
      RoleType.FULLSTACK,
      'PYTHON',
    ],
    [
      'Software Developer',
      'PHP, Symfony, PostgreSQL e Vue.js.',
      JobTrack.PHP,
      Seniority.UNSPECIFIED,
      RoleType.SOFTWARE_DEVELOPMENT,
      'PHP',
    ],
    [
      'Backend Node.js Developer',
      'Node.js obrigatório. Java é desejável.',
      JobTrack.NODE,
      Seniority.UNSPECIFIED,
      RoleType.BACKEND,
      'NODE',
    ],
  ])(
    'classifies %s',
    (title, description, track, seniority, roleType, primaryStack) => {
      const result = classify(title, description);

      expect(result.track).toBe(track);
      expect(result.seniority).toBe(seniority);
      expect(result.roleType).toBe(roleType);
      expect(result.primaryStack).toBe(primaryStack);
      expect(result.isPotentiallyEligible).toBe(track !== JobTrack.OTHER);
    },
  );

  it('does not infer seniority from senior developers in the description', () => {
    const result = classify(
      'Backend Node.js Developer',
      'Você trabalhará com desenvolvedores seniores em Node.js.',
    );

    expect(result.seniority).toBe(Seniority.UNSPECIFIED);
  });

  it('does not make a differential Java mention the primary stack', () => {
    const result = classify(
      'Backend Node.js Developer',
      'Node.js obrigatório. Java é diferencial.',
    );

    expect(result.primaryStack).toBe('NODE');
    expect(result.negativeSkills).toContain('Java');
  });

  it('does not infer Node or PHP fullstack from frontend alone', () => {
    const result = classify(
      'Frontend React Developer',
      'React, CSS e acessibilidade.',
    );

    expect(result.roleType).toBe('OTHER');
    expect(result.track).toBe(JobTrack.OTHER);
    expect(result.primaryStack).toBe('OTHER');
  });
});
