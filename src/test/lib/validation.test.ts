import { describe, it, expect } from 'vitest';
import {
  UserSchema,
  LoginSchema,
  RegisterSchema,
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  TaskSchema,
  SalesOpportunitySchema,
  CommentSchema,
  AppConfigSchema,
  validateData,
  validatePartialData,
  useValidation
} from '../../lib/validation';

describe('Sistema de Validação', () => {
  describe('UserSchema', () => {
    it('deve validar usuário válido', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        name: 'João Silva',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'user',
        is_active: true,
        last_login: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(UserSchema, validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('deve rejeitar email inválido', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'email-invalido',
        name: 'João Silva'
      };

      const result = validateData(UserSchema, invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(error => error.includes('email'))).toBe(true);
      }
    });
  });

  describe('LoginSchema', () => {
    it('deve validar login válido', () => {
      const validLogin = {
        email: 'user@example.com',
        password: 'senha123'
      };

      const result = validateData(LoginSchema, validLogin);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar senha muito curta', () => {
      const invalidLogin = {
        email: 'user@example.com',
        password: '123'
      };

      const result = validateData(LoginSchema, invalidLogin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(error => error.includes('password'))).toBe(true);
      }
    });
  });

  describe('ProjectSchema', () => {
    it('deve validar projeto válido', () => {
      const validProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Projeto Teste',
        description: 'Descrição do projeto',
        status: 'active',
        priority: 'high',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        budget: 10000,
        owner_id: '123e4567-e89b-12d3-a456-426614174000',
        team_members: [],
        tags: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(ProjectSchema, validProject);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar data de fim anterior à data de início', () => {
      const invalidProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Projeto Teste',
        status: 'active',
        priority: 'high',
        start_date: '2024-12-31',
        end_date: '2024-01-01', // Data de fim anterior à de início
        owner_id: '123e4567-e89b-12d3-a456-426614174000',
        team_members: [],
        tags: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(ProjectSchema, invalidProject);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(error => error.includes('Data de fim deve ser posterior'))).toBe(true);
      }
    });
  });

  describe('CreateProjectSchema', () => {
    it('deve validar criação de projeto sem id e timestamps', () => {
      const validCreateProject = {
        name: 'Novo Projeto',
        status: 'active',
        priority: 'medium',
        start_date: '2024-01-01',
        owner_id: '123e4567-e89b-12d3-a456-426614174000',
        team_members: [],
        tags: []
      };

      const result = validateData(CreateProjectSchema, validCreateProject);
      expect(result.success).toBe(true);
    });

    it('deve ignorar campos não permitidos como id', () => {
      const createProjectWithId = {
        id: '123e4567-e89b-12d3-a456-426614174000', // Campo será ignorado
        name: 'Novo Projeto',
        status: 'active',
        priority: 'medium',
        start_date: '2024-01-01',
        owner_id: '123e4567-e89b-12d3-a456-426614174000',
        team_members: [],
        tags: []
      };

      const result = validateData(CreateProjectSchema, createProjectWithId);
      expect(result.success).toBe(true);
      if (result.success) {
        // O id não deve estar presente no resultado
        expect('id' in result.data).toBe(false);
        expect(result.data.name).toBe('Novo Projeto');
      }
    });
  });

  describe('TaskSchema', () => {
    it('deve validar tarefa válida', () => {
      const validTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Tarefa de Teste',
        description: 'Descrição da tarefa',
        status: 'todo',
        priority: 'high',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        reporter_id: '123e4567-e89b-12d3-a456-426614174000',
        tags: [],
        attachments: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(TaskSchema, validTask);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar título vazio', () => {
      const invalidTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: '', // Título vazio
        status: 'todo',
        priority: 'high',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        reporter_id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(TaskSchema, invalidTask);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(error => error.includes('Título da tarefa é obrigatório'))).toBe(true);
      }
    });
  });

  describe('SalesOpportunitySchema', () => {
    it('deve validar oportunidade de venda válida', () => {
      const validSales = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Oportunidade Teste',
        status: 'lead',
        value: 50000,
        probability: 75,
        client_name: 'Cliente Teste',
        client_email: 'cliente@example.com',
        expected_close_date: '2024-06-01',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(SalesOpportunitySchema, validSales);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar probabilidade inválida', () => {
      const invalidSales = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Oportunidade Teste',
        status: 'lead',
        value: 50000,
        probability: 150, // Probabilidade > 100%
        client_name: 'Cliente Teste',
        client_email: 'cliente@example.com',
        expected_close_date: '2024-06-01',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(SalesOpportunitySchema, invalidSales);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(error => error.includes('Probabilidade máxima é 100%'))).toBe(true);
      }
    });
  });

  describe('AppConfigSchema', () => {
    it('deve validar configuração com valores padrão', () => {
      const validConfig = {};

      const result = validateData(AppConfigSchema, validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.theme).toBe('system');
        expect(result.data.language).toBe('pt-BR');
      }
    });

    it('deve validar configuração personalizada', () => {
      const customConfig = {
        theme: 'dark',
        language: 'en-US',
        notifications: {
          email: false,
          push: true,
          desktop: true
        },
        dashboard: {
          defaultView: 'list',
          itemsPerPage: 50,
          autoRefresh: false,
          refreshInterval: 120
        }
      };

      const result = validateData(AppConfigSchema, customConfig);
      expect(result.success).toBe(true);
    });
  });

  describe('Utilitários de Validação', () => {
    it('validatePartialData deve funcionar com schemas de objeto', () => {
      const partialUser = {
        name: 'João Atualizado'
      };

      // Usando o schema base sem refinement
      const BaseUserSchema = UserSchema;
      const result = validatePartialData(BaseUserSchema, partialUser);
      expect(result.success).toBe(true);
    });

    it('useValidation deve retornar funções de validação', () => {
      const validation = useValidation(UserSchema);
      
      expect(typeof validation.validate).toBe('function');
      expect(typeof validation.validatePartial).toBe('function');
      expect(typeof validation.safeParse).toBe('function');
    });

    it('useValidation.safeParse deve funcionar', () => {
      const validation = useValidation(LoginSchema);
      
      const validLogin = {
        email: 'test@example.com',
        password: 'senha123'
      };

      const result = validation.safeParse(validLogin);
      expect(result.success).toBe(true);
    });
  });

  describe('Validação de Comentários', () => {
    it('deve validar comentário válido', () => {
      const validComment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Este é um comentário de teste',
        author_id: '123e4567-e89b-12d3-a456-426614174000',
        entity_type: 'project',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        is_edited: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(CommentSchema, validComment);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar comentário vazio', () => {
      const invalidComment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: '', // Conteúdo vazio
        author_id: '123e4567-e89b-12d3-a456-426614174000',
        entity_type: 'project',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(CommentSchema, invalidComment);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(error => error.includes('Comentário não pode estar vazio'))).toBe(true);
      }
    });
  });
});