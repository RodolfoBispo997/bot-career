import { Injectable } from '@nestjs/common';
import { EmploymentType, WorkMode } from '@prisma/client';
import { JobTrack, Seniority } from '../search-profile/types';
import {
  ALTERNATIVE_STACKS,
  isHardRejectedEmploymentType,
  isLocationReviewRequired,
  NODE_REJECTED_SENIORITIES,
  PHP_REJECTED_SENIORITIES,
} from './decision-rules';
import { JobDecisionInput, JobDecisionResult } from './types';

@Injectable()
export class JobDecisionService {
  evaluate({
    job,
    classification,
    profile,
  }: JobDecisionInput): JobDecisionResult {
    const reasons: string[] = [];
    const warnings: string[] = [...classification.warnings];
    const matchedRules: string[] = [];

    const hardReject = this.evaluateHardRejects(
      job,
      classification,
      profile,
      reasons,
      warnings,
      matchedRules,
    );
    if (hardReject) {
      return { decision: 'REJECT', reasons, warnings, matchedRules };
    }

    if (isLocationReviewRequired(job)) {
      reasons.push(
        'Vaga híbrida ou presencial exige revisão manual da localização',
      );
      warnings.push('Localização precisa de revisão manual');
      matchedRules.push('WORK_MODE_LOCATION_REVIEW');
      return { decision: 'REVIEW_LOCATION', reasons, warnings, matchedRules };
    }

    if (job.workMode === WorkMode.UNKNOWN) {
      reasons.push('Modalidade da vaga não foi informada');
      matchedRules.push('WORK_MODE_UNKNOWN_REVIEW');
      return { decision: 'REVIEW', reasons, warnings, matchedRules };
    }

    if (this.isAmbiguous(classification)) {
      reasons.push('Stack principal apresenta sinais ambíguos');
      matchedRules.push('AMBIGUOUS_PRIMARY_STACK_REVIEW');
      return { decision: 'REVIEW', reasons, warnings, matchedRules };
    }

    if (
      this.requiresSeniorityReview(
        classification.track,
        classification.seniority,
      )
    ) {
      reasons.push(
        `Senioridade ${classification.seniority} exige revisão para esta trilha`,
      );
      matchedRules.push(
        classification.track === JobTrack.NODE
          ? 'NODE_MID_REVIEW'
          : 'PHP_TRAINEE_REVIEW',
      );
      return { decision: 'REVIEW', reasons, warnings, matchedRules };
    }

    if (job.employmentType === EmploymentType.OTHER) {
      reasons.push('Regime de contratação não está definido no perfil');
      matchedRules.push('EMPLOYMENT_TYPE_OTHER_REVIEW');
      return { decision: 'REVIEW', reasons, warnings, matchedRules };
    }

    if (job.employmentType === EmploymentType.UNKNOWN) {
      warnings.push('Regime de contratação não informado');
    }

    reasons.push(this.acceptReason(classification));
    matchedRules.push(this.acceptRule(classification));
    if (job.employmentType !== EmploymentType.UNKNOWN) {
      reasons.push(`Regime ${job.employmentType} aceito`);
      matchedRules.push('EMPLOYMENT_TYPE_ALLOWED');
    } else {
      matchedRules.push('EMPLOYMENT_TYPE_UNKNOWN_ALLOWED');
    }

    return { decision: 'ACCEPT', reasons, warnings, matchedRules };
  }

  private evaluateHardRejects(
    job: JobDecisionInput['job'],
    classification: JobDecisionInput['classification'],
    profile: JobDecisionInput['profile'],
    reasons: string[],
    warnings: string[],
    matchedRules: string[],
  ): boolean {
    if (isHardRejectedEmploymentType(job.employmentType)) {
      reasons.push(`Regime ${job.employmentType} não é um regime alvo`);
      matchedRules.push(`EMPLOYMENT_${job.employmentType}_REJECT`);
      return true;
    }

    if (
      classification.seniority === Seniority.INTERNSHIP &&
      classification.track !== JobTrack.NODE_INTERNSHIP
    ) {
      reasons.push('Estágios fora da trilha Node.js não fazem parte do perfil');
      matchedRules.push('INTERNSHIP_NON_NODE_REJECT');
      return true;
    }

    if (
      classification.roleType === 'FULLSTACK' &&
      !profile.fullstack.acceptedBackendTracks.some(
        (allowedTrack) => allowedTrack === classification.track,
      )
    ) {
      reasons.push(
        `Fullstack com backend principal ${classification.primaryStack} está fora do perfil`,
      );
      matchedRules.push('FULLSTACK_UNSUPPORTED_BACKEND_REJECT');
      return true;
    }

    if (
      classification.track === JobTrack.OTHER &&
      ALTERNATIVE_STACKS.includes(
        classification.primaryStack as (typeof ALTERNATIVE_STACKS)[number],
      )
    ) {
      reasons.push(
        `Stack principal ${classification.primaryStack} está fora do objetivo do perfil`,
      );
      matchedRules.push('ALTERNATIVE_PRIMARY_STACK_REJECT');
      return true;
    }

    if (classification.track === JobTrack.OTHER) {
      reasons.push('Vaga não pertence às trilhas Node.js ou PHP do perfil');
      matchedRules.push('OTHER_TRACK_REJECT');
      return true;
    }

    if (
      classification.track === JobTrack.NODE &&
      NODE_REJECTED_SENIORITIES.includes(
        classification.seniority as (typeof NODE_REJECTED_SENIORITIES)[number],
      )
    ) {
      reasons.push(
        `Senioridade ${classification.seniority} está fora do objetivo para Node.js`,
      );
      matchedRules.push(`NODE_${classification.seniority}_REJECT`);
      return true;
    }

    if (
      classification.track === JobTrack.PHP &&
      PHP_REJECTED_SENIORITIES.includes(
        classification.seniority as (typeof PHP_REJECTED_SENIORITIES)[number],
      )
    ) {
      reasons.push(
        `Senioridade ${classification.seniority} está fora do objetivo para PHP`,
      );
      matchedRules.push(`PHP_${classification.seniority}_REJECT`);
      return true;
    }

    const centralLegacy = profile.php.technologies.excludedWhenCentral?.find(
      (skill) =>
        classification.negativeSkills.includes(skill) &&
        new RegExp(skill, 'i').test(job.title),
    );
    if (centralLegacy) {
      reasons.push(`${centralLegacy} aparece como foco principal da vaga`);
      matchedRules.push(`${centralLegacy.toUpperCase()}_PRIMARY_REJECT`);
      return true;
    }

    if (classification.track === JobTrack.PHP) {
      const legacySkills = ['PHP 5', 'CodeIgniter', 'Zend legado', 'jQuery'];
      if (
        classification.detectedSkills.some((skill) =>
          legacySkills.includes(skill),
        )
      ) {
        warnings.push('Stack PHP possui sinais de legado');
      }
    }

    return false;
  }

  private requiresSeniorityReview(
    track: JobTrack,
    seniority: Seniority,
  ): boolean {
    return (
      (track === JobTrack.NODE && seniority === Seniority.MID) ||
      (track === JobTrack.PHP && seniority === Seniority.TRAINEE)
    );
  }

  private isAmbiguous(
    classification: JobDecisionInput['classification'],
  ): boolean {
    return classification.warnings.some((warning) =>
      warning.includes('força semelhante'),
    );
  }

  private acceptReason(
    classification: JobDecisionInput['classification'],
  ): string {
    const label =
      classification.track === JobTrack.NODE_INTERNSHIP
        ? 'Node.js Estágio'
        : classification.track;
    return `Vaga ${label} dentro das trilhas do perfil`;
  }

  private acceptRule(
    classification: JobDecisionInput['classification'],
  ): string {
    if (classification.track === JobTrack.NODE_INTERNSHIP)
      return 'NODE_INTERNSHIP_ACCEPT';
    if (classification.track === JobTrack.NODE)
      return `NODE_${classification.seniority}_ACCEPT`;
    return `PHP_${classification.seniority}_ACCEPT`;
  }
}
