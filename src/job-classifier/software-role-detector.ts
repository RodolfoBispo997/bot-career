import { hasTerm, normalizeText } from './text-normalizer';

export type SoftwareRoleConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SoftwareRoleDetection {
  isSoftwareRole: boolean;
  confidence: SoftwareRoleConfidence;
  signals: string[];
}

const strongTitleSignals = [
  'backend',
  'back-end',
  'back end',
  'developer',
  'desenvolvedor',
  'software engineer',
  'engenheiro de software',
  'software developer',
  'analista desenvolvedor',
  'fullstack',
  'full-stack',
  'full stack',
  'node',
  'node.js',
  'nestjs',
  'php',
  'laravel',
  'symfony',
  'estagio em desenvolvimento',
  'estagio desenvolvimento',
  'estagio em engenharia de software',
];

const nonTechnicalTitleSignals = [
  'enfermeiro',
  'enfermagem',
  'medico',
  'advogado',
  'juridico',
  'marketing',
  'vendas',
  'vendedor',
  'comercial',
  'atendimento',
  'customer success',
  'recursos humanos',
  'recrutador',
  'recruiter',
  'financeiro',
  'contabilidade',
  'designer',
  'conteudo',
  'social media',
  'logistica',
  'operador',
  'motorista',
];

const descriptionSignals = [
  'desenvolvimento de api',
  'desenvolvimento backend',
  'desenvolvimento de software',
  'implementar api',
  'desenvolver servicos',
  'arquitetura de software',
  'aplicacoes web',
  'sistemas distribuidos',
  'codigo',
  'programacao',
  'api rest',
  'apis rest',
  'microservicos',
  'desenvolvimento server-side',
];

export function detectSoftwareRole(
  title: string,
  description: string,
): SoftwareRoleDetection {
  const normalizedTitle = normalizeText(title);
  const normalizedDescription = normalizeText(description);
  const hasStrongTitleSignal = hasTerm(normalizedTitle, strongTitleSignals);
  const hasNonTechnicalTitleSignal = hasTerm(
    normalizedTitle,
    nonTechnicalTitleSignals,
  );
  const descriptionSignalCount = descriptionSignals.filter((signal) =>
    normalizedDescription.includes(signal),
  ).length;

  if (hasNonTechnicalTitleSignal && !hasStrongTitleSignal) {
    return {
      isSoftwareRole: false,
      confidence: 'HIGH',
      signals: ['Cargo identificado como não relacionado a desenvolvimento'],
    };
  }

  if (hasStrongTitleSignal) {
    return {
      isSoftwareRole: true,
      confidence: 'HIGH',
      signals: ['Cargo contém sinal explícito de desenvolvimento de software'],
    };
  }

  if (descriptionSignalCount >= 2) {
    return {
      isSoftwareRole: true,
      confidence: 'MEDIUM',
      signals: ['Descrição contém múltiplos sinais de desenvolvimento'],
    };
  }

  return {
    isSoftwareRole: false,
    confidence: 'LOW',
    signals: ['Cargo não possui evidência suficiente de desenvolvimento'],
  };
}
