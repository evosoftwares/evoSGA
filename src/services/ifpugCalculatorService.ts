import { logger } from '@/utils/logger';

// Interfaces para cálculo IFPUG
export interface IFPUGInputs {
  // Funções de Dados
  internalLogicalFiles: number; // Arquivos Lógicos Internos (ALI)
  externalInterfaceFiles: number; // Arquivos de Interface Externa (AIE)
  
  // Funções Transacionais
  externalInputs: number; // Entradas Externas (EE)
  externalOutputs: number; // Saídas Externas (SE)
  externalInquiries: number; // Consultas Externas (CE)
  
  // Fatores de Ajuste
  complexityFactor: 'low' | 'medium' | 'high'; // Fator de complexidade geral
  teamExperience: 'junior' | 'pleno' | 'senior'; // Experiência da equipe
  technologyComplexity: 'low' | 'medium' | 'high'; // Complexidade tecnológica
}

export interface IFPUGResult {
  unadjustedFunctionPoints: number;
  adjustmentFactor: number;
  adjustedFunctionPoints: number;
  estimatedHours: number;
  estimatedDays: number;
  estimatedWeeks: number;
  timeline: string;
  breakdown: {
    dataFunctions: number;
    transactionalFunctions: number;
    complexityAdjustment: number;
  };
}

export interface ProjectEstimate {
  functionPoints: IFPUGResult;
  phases: {
    analysis: { days: number; description: string };
    design: { days: number; description: string };
    development: { days: number; description: string };
    testing: { days: number; description: string };
    deployment: { days: number; description: string };
  };
  totalDays: number;
  totalWeeks: number;
  timeline: string;
}

class IFPUGCalculatorService {
  // Pesos padrão IFPUG para complexidade média
  private readonly weights = {
    internalLogicalFiles: 10, // ALI
    externalInterfaceFiles: 7, // AIE
    externalInputs: 4, // EE
    externalOutputs: 5, // SE
    externalInquiries: 4 // CE
  };

  // Fatores de produtividade (horas por ponto de função)
  private readonly productivityFactors = {
    junior: 12, // 12 horas por PF
    pleno: 8,   // 8 horas por PF
    senior: 6   // 6 horas por PF
  };

  // Fatores de complexidade
  private readonly complexityFactors = {
    low: 0.85,
    medium: 1.0,
    high: 1.15
  };

  // Fatores de tecnologia
  private readonly technologyFactors = {
    low: 0.9,
    medium: 1.0,
    high: 1.2
  };

  calculateIFPUG(inputs: IFPUGInputs): IFPUGResult {
    try {
      logger.info('Calculating IFPUG function points', inputs);

      // Calcular Pontos de Função Não Ajustados
      const dataFunctions = 
        (inputs.internalLogicalFiles * this.weights.internalLogicalFiles) +
        (inputs.externalInterfaceFiles * this.weights.externalInterfaceFiles);

      const transactionalFunctions = 
        (inputs.externalInputs * this.weights.externalInputs) +
        (inputs.externalOutputs * this.weights.externalOutputs) +
        (inputs.externalInquiries * this.weights.externalInquiries);

      const unadjustedFunctionPoints = dataFunctions + transactionalFunctions;

      // Calcular Fator de Ajuste
      const complexityAdjustment = 
        this.complexityFactors[inputs.complexityFactor] *
        this.technologyFactors[inputs.technologyComplexity];

      const adjustmentFactor = complexityAdjustment;
      const adjustedFunctionPoints = Math.round(unadjustedFunctionPoints * adjustmentFactor);

      // Calcular estimativas de tempo
      const hoursPerFP = this.productivityFactors[inputs.teamExperience];
      const estimatedHours = adjustedFunctionPoints * hoursPerFP;
      const estimatedDays = Math.ceil(estimatedHours / 8); // 8 horas por dia
      const estimatedWeeks = Math.ceil(estimatedDays / 5); // 5 dias úteis por semana

      // Gerar timeline textual
      const timeline = this.generateTimeline(estimatedWeeks);

      const result: IFPUGResult = {
        unadjustedFunctionPoints,
        adjustmentFactor,
        adjustedFunctionPoints,
        estimatedHours,
        estimatedDays,
        estimatedWeeks,
        timeline,
        breakdown: {
          dataFunctions,
          transactionalFunctions,
          complexityAdjustment
        }
      };

      logger.info('IFPUG calculation completed', result);
      return result;

    } catch (error) {
      logger.error('Error calculating IFPUG', error);
      throw new Error('Erro ao calcular pontos de função IFPUG');
    }
  }

  calculateProjectEstimate(inputs: IFPUGInputs): ProjectEstimate {
    try {
      const functionPoints = this.calculateIFPUG(inputs);
      
      // Distribuição das fases baseada em boas práticas
      const totalDays = functionPoints.estimatedDays;
      
      const phases = {
        analysis: {
          days: Math.ceil(totalDays * 0.15), // 15% para análise
          description: 'Levantamento de requisitos e análise'
        },
        design: {
          days: Math.ceil(totalDays * 0.20), // 20% para design
          description: 'Arquitetura e design do sistema'
        },
        development: {
          days: Math.ceil(totalDays * 0.45), // 45% para desenvolvimento
          description: 'Codificação e implementação'
        },
        testing: {
          days: Math.ceil(totalDays * 0.15), // 15% para testes
          description: 'Testes e validação'
        },
        deployment: {
          days: Math.ceil(totalDays * 0.05), // 5% para deploy
          description: 'Implantação e go-live'
        }
      };

      const phasesTotalDays = Object.values(phases).reduce((sum, phase) => sum + phase.days, 0);
      const totalWeeks = Math.ceil(phasesTotalDays / 5);
      
      const timeline = this.generateDetailedTimeline(phases);

      return {
        functionPoints,
        phases,
        totalDays: phasesTotalDays,
        totalWeeks,
        timeline
      };

    } catch (error) {
      logger.error('Error calculating project estimate', error);
      throw new Error('Erro ao calcular estimativa do projeto');
    }
  }

  private generateTimeline(weeks: number): string {
    if (weeks <= 4) {
      return `${weeks} semana${weeks > 1 ? 's' : ''} (projeto pequeno)`;
    } else if (weeks <= 12) {
      const months = Math.ceil(weeks / 4);
      return `${months} ${months > 1 ? 'meses' : 'mês'} (${weeks} semanas)`;
    } else if (weeks <= 24) {
      const months = Math.ceil(weeks / 4);
      return `${months} meses (projeto médio)`;
    } else {
      const months = Math.ceil(weeks / 4);
      return `${months} meses (projeto grande)`;
    }
  }

  private generateDetailedTimeline(phases: ProjectEstimate['phases']): string {
    const phaseDescriptions = [
      `Análise: ${phases.analysis.days} dias`,
      `Design: ${phases.design.days} dias`,
      `Desenvolvimento: ${phases.development.days} dias`,
      `Testes: ${phases.testing.days} dias`,
      `Implantação: ${phases.deployment.days} dias`
    ];

    return phaseDescriptions.join(' | ');
  }

  // Método para estimar baseado em descrição textual (usando IA)
  estimateFromDescription(description: string, teamExperience: IFPUGInputs['teamExperience'] = 'pleno'): IFPUGInputs {
    // Análise heurística simples baseada em palavras-chave
    const text = description.toLowerCase();
    
    // Contar entidades/tabelas mencionadas
    const entityKeywords = ['tabela', 'entidade', 'cadastro', 'registro', 'dados', 'informação'];
    const entities = entityKeywords.reduce((count, keyword) => {
      const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
      return count + matches;
    }, 0);

    // Contar funcionalidades transacionais
    const transactionKeywords = ['formulário', 'tela', 'página', 'funcionalidade', 'operação', 'processo'];
    const transactions = transactionKeywords.reduce((count, keyword) => {
      const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
      return count + matches;
    }, 0);

    // Determinar complexidade baseada em palavras-chave
    const complexKeywords = ['integração', 'api', 'complexo', 'avançado', 'inteligência', 'machine learning'];
    const hasComplexFeatures = complexKeywords.some(keyword => text.includes(keyword));

    const simpleKeywords = ['simples', 'básico', 'crud', 'listagem'];
    const hasSimpleFeatures = simpleKeywords.some(keyword => text.includes(keyword));

    let complexityFactor: IFPUGInputs['complexityFactor'] = 'medium';
    if (hasComplexFeatures) {
      complexityFactor = 'high';
    } else if (hasSimpleFeatures) {
      complexityFactor = 'low';
    }

    // Estimar valores baseados na análise
    const internalLogicalFiles = Math.max(1, Math.ceil(entities * 0.6));
    const externalInterfaceFiles = Math.max(0, Math.ceil(entities * 0.2));
    const externalInputs = Math.max(1, Math.ceil(transactions * 0.8));
    const externalOutputs = Math.max(1, Math.ceil(transactions * 0.4));
    const externalInquiries = Math.max(1, Math.ceil(transactions * 0.6));

    return {
      internalLogicalFiles,
      externalInterfaceFiles,
      externalInputs,
      externalOutputs,
      externalInquiries,
      complexityFactor,
      teamExperience,
      technologyComplexity: complexityFactor // Usar a mesma complexidade
    };
  }

  // Método para validar inputs
  validateInputs(inputs: IFPUGInputs): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (inputs.internalLogicalFiles < 0) {
      errors.push('Arquivos Lógicos Internos não pode ser negativo');
    }

    if (inputs.externalInterfaceFiles < 0) {
      errors.push('Arquivos de Interface Externa não pode ser negativo');
    }

    if (inputs.externalInputs < 0) {
      errors.push('Entradas Externas não pode ser negativo');
    }

    if (inputs.externalOutputs < 0) {
      errors.push('Saídas Externas não pode ser negativo');
    }

    if (inputs.externalInquiries < 0) {
      errors.push('Consultas Externas não pode ser negativo');
    }

    const totalFunctions = inputs.internalLogicalFiles + inputs.externalInterfaceFiles + 
                          inputs.externalInputs + inputs.externalOutputs + inputs.externalInquiries;

    if (totalFunctions === 0) {
      errors.push('Pelo menos uma função deve ser especificada');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const ifpugCalculator = new IFPUGCalculatorService();