import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, createLogger } from '../../utils/logger';

// Mock do console para capturar logs
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn()
};

vi.stubGlobal('console', mockConsole);

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logger.info', () => {
    it('deve registrar mensagens de informação corretamente', () => {
      const message = 'Informação importante';
      const options = { data: { userId: '123', action: 'login' } };

      logger.info(message, options);

      expect(mockConsole.log).toHaveBeenCalledWith(
        message,
        options.data
      );
    });

    it('deve registrar mensagem simples sem dados', () => {
      const message = 'Mensagem simples';

      logger.info(message);

      expect(mockConsole.log).toHaveBeenCalledWith(message, '');
    });
  });

  describe('logger.warn', () => {
    it('deve registrar avisos corretamente', () => {
      const message = 'Aviso importante';
      const options = { data: { component: 'TaskCard' } };

      logger.warn(message, options);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        message,
        options.data
      );
    });
  });

  describe('logger.error', () => {
    it('deve registrar erros corretamente', () => {
      const message = 'Erro crítico';
      const options = { data: { operation: 'database_query' } };

      logger.error(message, options);

      expect(mockConsole.error).toHaveBeenCalledWith(
        message,
        options.data
      );
    });

    it('deve lidar com erros sem contexto', () => {
      const message = 'Erro simples';

      logger.error(message);

      expect(mockConsole.error).toHaveBeenCalledWith(message, '');
    });
  });

  describe('logger.debug', () => {
    it('deve registrar mensagens de debug', () => {
      const message = 'Debug info';
      const options = { data: { step: 'validation' } };

      logger.debug(message, options);

      expect(mockConsole.debug).toHaveBeenCalledWith(
        message,
        options.data
      );
    });
  });

  describe('Formatação com prefix', () => {
    it('deve incluir prefix quando fornecido', () => {
      const message = 'Teste com prefix';
      const options = { prefix: 'TEST', data: { test: true } };

      logger.info(message, options);

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[TEST] Teste com prefix',
        options.data
      );
    });
  });

  describe('createLogger', () => {
    it('deve criar logger com prefix', () => {
      const prefixedLogger = createLogger('AUTH');
      const message = 'Login realizado';
      const data = { userId: '123' };

      prefixedLogger.info(message, data);

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[AUTH] Login realizado',
        data
      );
    });

    it('deve criar logger com métodos de grupo', () => {
      const prefixedLogger = createLogger('TEST');
      
      prefixedLogger.group('Grupo de teste');
      expect(mockConsole.group).toHaveBeenCalledWith('[TEST] Grupo de teste');

      prefixedLogger.groupEnd();
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });
  });

  describe('Métodos de grupo', () => {
    it('deve criar grupos corretamente', () => {
      const label = 'Operação complexa';

      logger.group(label);
      expect(mockConsole.group).toHaveBeenCalledWith(label);

      logger.groupEnd();
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });
  });
});