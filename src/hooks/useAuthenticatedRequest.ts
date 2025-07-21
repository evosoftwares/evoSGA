import { useCallback } from 'react';
import { authErrorHandler } from '@/services/authErrorHandler';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAuthenticatedRequest');

/**
 * Hook para fazer requisições com tratamento automático de erros de autenticação
 */
export const useAuthenticatedRequest = () => {
  const executeRequest = useCallback(async <T>(
    requestFn: () => Promise<T>,
    context?: string
  ): Promise<T> => {
    try {
      return await requestFn();
    } catch (error) {
      logger.error(`Request error in ${context || 'unknown context'}:`, error);
      
      // Verifica se é erro de autenticação e trata automaticamente
      if (authErrorHandler.isAuthError(error)) {
        await authErrorHandler.handleAuthError(error, context);
      }
      
      // Re-throw para que o código chamador possa tratar também
      throw error;
    }
  }, []);

  return { executeRequest };
};