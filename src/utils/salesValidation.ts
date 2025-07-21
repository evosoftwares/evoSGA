/**
 * Utilitários de validação para o sistema de vendas
 * Previne bugs comuns relacionados a IDs e integridade de dados
 */

import { SalesOpportunity } from '@/types/database';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida se um ID existe em uma lista de entidades
 */
export const validateEntityExists = <T extends { id: string }>(
  entityId: string,
  entities: T[],
  entityType: string
): ValidationResult => {
  const exists = entities.find(entity => entity.id === entityId);
  if (!exists) {
    return {
      isValid: false,
      error: `${entityType} com ID ${entityId} não encontrado`
    };
  }
  return { isValid: true };
};

/**
 * Valida IDs básicos (não vazios, formato UUID)
 */
export const validateBasicId = (id: string, fieldName: string): ValidationResult => {
  if (!id || id.trim() === '') {
    return {
      isValid: false,
      error: `${fieldName} é obrigatório`
    };
  }

  // Validação básica de formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return {
      isValid: false,
      error: `${fieldName} deve ter formato UUID válido`
    };
  }

  return { isValid: true };
};

/**
 * Valida dados de oportunidade antes de operações
 */
export const validateOpportunityData = (opportunity: Partial<SalesOpportunity>): ValidationResult => {
  if (!opportunity.title || opportunity.title.trim() === '') {
    return {
      isValid: false,
      error: 'Título da oportunidade é obrigatório'
    };
  }

  if (opportunity.deal_value !== undefined && opportunity.deal_value < 0) {
    return {
      isValid: false,
      error: 'Valor do negócio não pode ser negativo'
    };
  }

  if (opportunity.probability !== undefined && (opportunity.probability < 0 || opportunity.probability > 100)) {
    return {
      isValid: false,
      error: 'Probabilidade deve estar entre 0 e 100'
    };
  }

  return { isValid: true };
};

/**
 * Utilitário para logging de validação
 */
export const logValidationError = (context: string, error: string, data?: any) => {
  console.error(`❌ [VALIDATION] ${context}: ${error}`);
  if (data) {
    console.error(`❌ [VALIDATION] Data:`, data);
  }
};

/**
 * Utilitário para logging de validação bem-sucedida
 */
export const logValidationSuccess = (context: string, data?: any) => {
  console.log(`✅ [VALIDATION] ${context}: Validation passed`);
  if (data) {
    console.log(`✅ [VALIDATION] Data:`, data);
  }
};