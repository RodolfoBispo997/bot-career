import { Injectable } from '@nestjs/common';
import { JobTrack, Seniority } from '../search-profile/types';
import { detectSkills } from './skill-detector';
import { detectRole } from './role-detector';
import { detectPrimaryStack } from './stack-detector';
import { detectSeniority } from './seniority-detector';
import { combineJobText } from './text-normalizer';
import { JobClassificationInput, JobClassificationResult } from './types';

@Injectable()
export class JobClassifierService {
  classify(input: JobClassificationInput): JobClassificationResult {
    const combinedText = combineJobText(input.title, input.description);
    const detectedSkills = detectSkills(combinedText);
    const seniorityDetection = detectSeniority(input.title, input.description);
    const roleType = detectRole(input.title, input.description);
    const stackDetection = detectPrimaryStack(
      input.title,
      input.description,
      detectedSkills,
    );
    const isInternship = seniorityDetection.seniority === Seniority.INTERNSHIP;
    const track = this.detectTrack(isInternship, stackDetection.primaryStack, stackDetection.nodeIsReal);
    const signals = [
      ...this.skillSignals(detectedSkills),
      ...stackDetection.signals,
      ...this.senioritySignals(seniorityDetection.seniority, seniorityDetection.source),
    ];

    if (roleType !== 'OTHER') {
      signals.push(`Tipo de atuação identificado: ${roleType}`);
    }

    return {
      track,
      seniority: seniorityDetection.seniority,
      roleType,
      primaryStack: stackDetection.primaryStack,
      detectedSkills: detectedSkills.map((skill) => skill.name),
      positiveSkills: detectedSkills
        .filter((skill) => skill.positive)
        .map((skill) => skill.name),
      negativeSkills: detectedSkills
        .filter((skill) => !skill.positive)
        .map((skill) => skill.name),
      isPotentiallyEligible: track !== JobTrack.OTHER,
      signals,
      warnings: stackDetection.warnings.concat(
        seniorityDetection.source === 'none' ? ['Senioridade não explícita'] : [],
      ),
    };
  }

  private detectTrack(
    isInternship: boolean,
    primaryStack: string,
    nodeIsReal: boolean,
  ): JobTrack {
    if (isInternship) {
      return nodeIsReal && primaryStack === 'NODE'
        ? JobTrack.NODE_INTERNSHIP
        : JobTrack.OTHER;
    }

    if (primaryStack === 'NODE') {
      return JobTrack.NODE;
    }

    if (primaryStack === 'PHP') {
      return JobTrack.PHP;
    }

    return JobTrack.OTHER;
  }

  private skillSignals(skills: readonly { name: string }[]): string[] {
    return skills.slice(0, 4).map((skill) => `${skill.name} detectado`);
  }

  private senioritySignals(
    seniority: Seniority,
    source: 'title' | 'description' | 'none',
  ): string[] {
    return source === 'none'
      ? []
      : [`senioridade ${seniority} identificada em ${source === 'title' ? 'título' : 'descrição'}`];
  }
}
