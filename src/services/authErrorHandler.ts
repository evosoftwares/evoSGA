import { createLogger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

const logger = createLogger('AuthErrorHandler');

export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private redirectCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  /**
   * Define o callback para redirecionamento quando houver erro de autenticação
   */
  setRedirectCallback(callback: () => void) {
    this.redirectCallback = callback;
  }

  /**
   * Verifica se um erro é relacionado à autenticação
   */
  isAuthError(error: any): boolean {
    if (!error) return false;

    // Verifica códigos de erro do Supabase relacionados à autenticação
    const authErrorCodes = [
      'invalid_credentials',
      'invalid_token',
      'token_expired',
      'session_expired',
      'unauthorized',
      'invalid_api_key',
      'invalid_jwt',
      'jwt_expired'
    ];

    // Verifica mensagens de erro comuns
    const authErrorMessages = [
      'Invalid login credentials',
      'JWT expired',
      'Invalid JWT',
      'Session expired',
      'User not authenticated',
      'Authentication required',
      'Access token expired',
      'Refresh token expired'
    ];

    const errorMessage = error.message || error.error_description || error.msg || '';
    const errorCode = error.error || error.code || error.status;

    // Verifica códigos HTTP de autenticação
    if (errorCode === 401 || errorCode === 403) {
      return true;
    }

    // Verifica códigos específicos do Supabase
    if (authErrorCodes.includes(errorCode)) {
      return true;
    }

    // Verifica mensagens de erro
    if (authErrorMessages.some(msg => 
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    )) {
      return true;
    }

    return false;
  }

  /**
   * Trata erros de autenticação
   */
  async handleAuthError(error: any, context?: string): Promise<void> {
    if (!this.isAuthError(error)) {
      return;
    }

    logger.warn(`Authentication error detected in ${context || 'unknown context'}:`, error);

    try {
      // Força o logout no Supabase
      await supabase.auth.signOut();
      logger.info('User signed out due to authentication error');
    } catch (signOutError) {
      logger.error('Error during forced sign out:', signOutError);
    }

    // Executa o callback de redirecionamento se definido
    if (this.redirectCallback) {
      this.redirectCallback();
    } else {
      // Fallback: redireciona diretamente
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    }
  }

  /**
   * Wrapper para requisições que adiciona tratamento de erro automático
   */
  async wrapRequest<T>(
    requestFn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      await this.handleAuthError(error, context);
      throw error; // Re-throw para que o código chamador possa tratar também
    }
  }

  /**
   * Monitora mudanças de estado de autenticação
   */
  startMonitoring() {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        logger.info(`Auth state changed: ${event}`);
        
        // Se não há sessão após um evento de token refresh, pode indicar expiração
        if (event === 'TOKEN_REFRESHED' && !session) {
          logger.warn('Token refresh resulted in no session - possible expiration');
          this.handleAuthError(
            { message: 'Session expired after token refresh' },
            'token_refresh_monitoring'
          );
        }
      }
    });
  }
}

// Instância singleton
export const authErrorHandler = AuthErrorHandler.getInstance();