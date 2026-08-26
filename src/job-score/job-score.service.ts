import { Injectable } from '@nestjs/common';
import { EmploymentType, WorkMode } from '@prisma/client';
import {
  JobTrack,
  RoleType,
  SearchProfile,
  Seniority,
} from '../search-profile/types';
import {
  EMPLOYMENT_TYPE_WEIGHTS,
  INTERNSHIP_COMPLEMENTARY_MAX,
  LEGACY_SKILLS,
  NODE_COMPLEMENTARY_MAX,
  PHP_COMPLEMENTARY_MAX,
  ROLE_WEIGHTS,
  SENIORITY_WEIGHTS,
  STACK_WEIGHTS,
  WORK_MODE_WEIGHTS,
} from './scoring-rules';
import {
  JobPriority,
  JobScoreInput,
  JobScoreResult,
  ScoreComponent,
} from './types';

@Injectable()
export class JobScoreService {
  evaluate({
    job,
    classification,
    decision,
    profile,
  }: JobScoreInput): JobScoreResult {
    if (classification.track === JobTrack.OTHER) {
      return {
        score: 0,
        priority: decision.decision === 'REJECT' ? 'REJECTED' : 'LOW',
        breakdown: this.emptyBreakdown(),
        positives: [],
        penalties: [],
        warnings: [...decision.warnings],
      };
    }

    const breakdown = {
      stack: this.stackScore(classification),
      seniority: this.seniorityScore(classification),
      role: this.component(
        ROLE_WEIGHTS[classification.roleType],
        this.roleMax(classification.track),
      ),
      workMode: this.component(WORK_MODE_WEIGHTS[job.workMode], 10),
      employmentType: this.component(
        this.employmentScore(job.employmentType, classification.track),
        this.employmentMax(classification.track),
      ),
      complementarySkills: this.complementaryScore(classification, profile),
    };
    const positives = this.positiveMessages(job, classification, breakdown);
    const penalties = this.penaltyMessages(classification, profile);
    const score = this.clampScore(
      Object.values(breakdown).reduce((total, item) => total + item.score, 0) -
        this.legacyPenalty(classification),
    );

    return {
      score,
      priority: this.priorityFor(score, decision.decision),
      breakdown,
      positives,
      penalties,
      warnings: [...decision.warnings],
    };
  }

  private stackScore(
    classification: JobScoreInput['classification'],
  ): ScoreComponent {
    const weights = STACK_WEIGHTS[classification.track];
    const score = classification.detectedSkills.reduce(
      (total, skill) => total + (weights[skill] ?? 0),
      0,
    );
    return this.component(
      score,
      classification.track === JobTrack.NODE_INTERNSHIP ? 45 : 40,
    );
  }

  private seniorityScore(
    classification: JobScoreInput['classification'],
  ): ScoreComponent {
    const max =
      classification.track === JobTrack.PHP
        ? 25
        : classification.track === JobTrack.NODE_INTERNSHIP
          ? 15
          : 20;
    return this.component(
      SENIORITY_WEIGHTS[classification.track][classification.seniority] ?? 0,
      max,
    );
  }

  private complementaryScore(
    classification: JobScoreInput['classification'],
    profile: SearchProfile,
  ): ScoreComponent {
    const max =
      classification.track === JobTrack.NODE
        ? NODE_COMPLEMENTARY_MAX
        : classification.track === JobTrack.PHP
          ? PHP_COMPLEMENTARY_MAX
          : INTERNSHIP_COMPLEMENTARY_MAX;
    if (max === 0) return this.component(0, max);

    const configured =
      classification.track === JobTrack.NODE
        ? [
            ...(profile.node.technologies.strong ?? []),
            ...(profile.node.technologies.complementary ?? []),
          ]
        : [...(profile.php.technologies.strong ?? [])];
    const detected = classification.detectedSkills.filter((skill) =>
      configured.includes(skill),
    );
    return this.component(Math.min(max, detected.length), max);
  }

  private employmentScore(type: EmploymentType, track: JobTrack): number {
    if (track === JobTrack.NODE_INTERNSHIP)
      return type === EmploymentType.INTERNSHIP
        ? 10
        : type === EmploymentType.UNKNOWN
          ? 5
          : 0;
    return Math.min(5, EMPLOYMENT_TYPE_WEIGHTS[type]);
  }

  private employmentMax(track: JobTrack): number {
    return track === JobTrack.NODE_INTERNSHIP ? 10 : 5;
  }

  private roleMax(track: JobTrack): number {
    return track === JobTrack.NODE_INTERNSHIP ? 20 : 15;
  }

  private legacyPenalty(
    classification: JobScoreInput['classification'],
  ): number {
    if (classification.track !== JobTrack.PHP) return 0;
    const count = classification.detectedSkills.filter((skill) =>
      LEGACY_SKILLS.includes(skill),
    ).length;
    return Math.min(15, count * 5);
  }

  private positiveMessages(
    job: JobScoreInput['job'],
    classification: JobScoreInput['classification'],
    breakdown: JobScoreResult['breakdown'],
  ): string[] {
    const positives: string[] = [
      `${classification.primaryStack} faz parte da stack principal`,
    ];
    positives.push(
      ...classification.positiveSkills
        .slice(0, 5)
        .map((skill) => `${skill} detectado`),
    );
    if (classification.seniority !== Seniority.UNSPECIFIED) {
      positives.push(
        `Senioridade ${classification.seniority} considerada no perfil`,
      );
    }
    if (job.workMode === WorkMode.REMOTE) positives.push('Vaga remota');
    if (breakdown.complementarySkills.score > 0)
      positives.push('Skills complementares relevantes detectadas');
    return positives;
  }

  private penaltyMessages(
    classification: JobScoreInput['classification'],
    profile: SearchProfile,
  ): string[] {
    const penalties: string[] = [];
    if (
      classification.track === JobTrack.NODE &&
      classification.seniority === Seniority.MID
    ) {
      penalties.push('Senioridade Pleno está acima do foco principal Node.js');
    }
    if (this.legacyPenalty(classification) > 0)
      penalties.push('Stack PHP contém tecnologia legacy');
    if (
      classification.warnings.some((warning) =>
        warning.includes('força semelhante'),
      )
    ) {
      penalties.push('Stack principal possui sinais de ambiguidade');
    }
    return penalties;
  }

  private priorityFor(score: number, decision: string): JobPriority {
    if (decision === 'REJECT') return 'REJECTED';
    if (score >= 95) return 'TOP_PRIORITY';
    if (score >= 85) return 'HIGH_PRIORITY';
    if (score >= 75) return 'RECOMMENDED';
    if (score >= 60) return 'REVIEW';
    return 'LOW';
  }

  private component(score: number, max: number): ScoreComponent {
    return { score: Math.max(0, Math.min(max, Math.trunc(score))), max };
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.trunc(score)));
  }

  private emptyBreakdown(): JobScoreResult['breakdown'] {
    return {
      stack: this.component(0, 0),
      seniority: this.component(0, 0),
      role: this.component(0, 0),
      workMode: this.component(0, 0),
      employmentType: this.component(0, 0),
      complementarySkills: this.component(0, 0),
    };
  }
}
