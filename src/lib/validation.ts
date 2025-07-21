import { z } from 'zod';

// ============================================================================
// SCHEMAS DE VALIDAÇÃO PARA TIPOS DE DADOS PRINCIPAIS
// ============================================================================

// Schema base para timestamps
const timestampSchema = z.string().datetime();

// Schema para UUID
const uuidSchema = z.string().uuid();

// ============================================================================
// SCHEMAS DE AUTENTICAÇÃO
// ============================================================================

export const UserSchema = z.object({
  id: uuidSchema,
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  avatar_url: z.string().url().optional(),
  role: z.enum(['admin', 'manager', 'user'], {
    errorMap: () => ({ message: 'Role deve ser admin, manager ou user' })
  }),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  last_login: timestampSchema.optional(),
  is_active: z.boolean().default(true)
});

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const RegisterSchema = LoginSchema.extend({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
});

// ============================================================================
// SCHEMAS DE PROJETOS
// ============================================================================

export const ProjectStatusSchema = z.enum(['active', 'completed', 'archived', 'on_hold'], {
  errorMap: () => ({ message: 'Status do projeto inválido' })
});

export const ProjectPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Prioridade do projeto inválida' })
});

// Schema base sem refinement
const BaseProjectSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1, 'Nome do projeto é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(1000, 'Descrição muito longa').optional(),
  status: ProjectStatusSchema,
  priority: ProjectPrioritySchema,
  start_date: z.string().date('Data de início inválida'),
  end_date: z.string().date('Data de fim inválida').optional(),
  budget: z.number().positive('Orçamento deve ser positivo').optional(),
  owner_id: uuidSchema,
  team_members: z.array(uuidSchema).default([]),
  tags: z.array(z.string()).default([]),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

// Schema com validação de datas
export const ProjectSchema = BaseProjectSchema.refine((data) => {
  if (data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['end_date']
});

// Schemas derivados do schema base (sem refinement)
export const CreateProjectSchema = BaseProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).refine((data) => {
  if (data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['end_date']
});

export const UpdateProjectSchema = BaseProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).partial().refine((data) => {
  if (data.end_date && data.start_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['end_date']
});

// ============================================================================
// SCHEMAS DE TAREFAS
// ============================================================================

export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'review', 'done'], {
  errorMap: () => ({ message: 'Status da tarefa inválido' })
});

export const TaskSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1, 'Título da tarefa é obrigatório').max(200, 'Título muito longo'),
  description: z.string().max(2000, 'Descrição muito longa').optional(),
  status: TaskStatusSchema,
  priority: ProjectPrioritySchema,
  project_id: uuidSchema,
  assignee_id: uuidSchema.optional(),
  reporter_id: uuidSchema,
  due_date: z.string().date('Data de vencimento inválida').optional(),
  estimated_hours: z.number().positive('Horas estimadas devem ser positivas').optional(),
  actual_hours: z.number().positive('Horas reais devem ser positivas').optional(),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.string().url()).default([]),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

// ============================================================================
// SCHEMAS DE VENDAS
// ============================================================================

export const SalesStatusSchema = z.enum(['lead', 'prospect', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], {
  errorMap: () => ({ message: 'Status de venda inválido' })
});

export const SalesOpportunitySchema = z.object({
  id: uuidSchema,
  title: z.string().min(1, 'Título da oportunidade é obrigatório').max(200, 'Título muito longo'),
  description: z.string().max(2000, 'Descrição muito longa').optional(),
  status: SalesStatusSchema,
  value: z.number().positive('Valor deve ser positivo'),
  probability: z.number().min(0, 'Probabilidade mínima é 0%').max(100, 'Probabilidade máxima é 100%'),
  client_name: z.string().min(1, 'Nome do cliente é obrigatório').max(200, 'Nome muito longo'),
  client_email: z.string().email('Email do cliente inválido'),
  client_phone: z.string().optional(),
  expected_close_date: z.string().date('Data de fechamento inválida'),
  assigned_to: uuidSchema,
  source: z.string().max(100, 'Fonte muito longa').optional(),
  notes: z.string().max(5000, 'Notas muito longas').optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const CreateSalesOpportunitySchema = SalesOpportunitySchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const UpdateSalesOpportunitySchema = CreateSalesOpportunitySchema.partial();

// ============================================================================
// SCHEMAS DE COMENTÁRIOS
// ============================================================================

export const CommentSchema = z.object({
  id: uuidSchema,
  content: z.string().min(1, 'Comentário não pode estar vazio').max(2000, 'Comentário muito longo'),
  author_id: uuidSchema,
  entity_type: z.enum(['project', 'task', 'sales_opportunity'], {
    errorMap: () => ({ message: 'Tipo de entidade inválido' })
  }),
  entity_id: uuidSchema,
  parent_id: uuidSchema.optional(), // Para respostas
  is_edited: z.boolean().default(false),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const CreateCommentSchema = CommentSchema.omit({
  id: true,
  is_edited: true,
  created_at: true,
  updated_at: true
});

export const UpdateCommentSchema = z.object({
  content: z.string().min(1, 'Comentário não pode estar vazio').max(2000, 'Comentário muito longo')
});

// ============================================================================
// SCHEMAS DE CONFIGURAÇÃO
// ============================================================================

export const AppConfigSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['pt-BR', 'en-US']).default('pt-BR'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    desktop: z.boolean().default(false)
  }).default({}),
  dashboard: z.object({
    defaultView: z.enum(['kanban', 'list', 'calendar']).default('kanban'),
    itemsPerPage: z.number().min(10).max(100).default(20),
    autoRefresh: z.boolean().default(true),
    refreshInterval: z.number().min(30).max(300).default(60) // segundos
  }).default({})
});

// ============================================================================
// TIPOS TYPESCRIPT DERIVADOS DOS SCHEMAS
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type Register = z.infer<typeof RegisterSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type ProjectPriority = z.infer<typeof ProjectPrioritySchema>;

export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export type SalesOpportunity = z.infer<typeof SalesOpportunitySchema>;
export type CreateSalesOpportunity = z.infer<typeof CreateSalesOpportunitySchema>;
export type UpdateSalesOpportunity = z.infer<typeof UpdateSalesOpportunitySchema>;
export type SalesStatus = z.infer<typeof SalesStatusSchema>;

export type Comment = z.infer<typeof CommentSchema>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;
export type UpdateComment = z.infer<typeof UpdateCommentSchema>;

export type AppConfig = z.infer<typeof AppConfigSchema>;

// ============================================================================
// UTILITÁRIOS DE VALIDAÇÃO
// ============================================================================

export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro de validação desconhecido'] };
  }
};

export const validatePartialData = <T>(schema: z.ZodObject<any>, data: unknown): { success: true; data: Partial<T> } | { success: false; errors: string[] } => {
  try {
    const partialSchema = schema.partial();
    const validatedData = partialSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro de validação desconhecido'] };
  }
};

// Hook para validação em tempo real
export const useValidation = <T>(schema: z.ZodSchema<T>) => {
  return {
    validate: (data: unknown) => validateData(schema, data),
    validatePartial: (data: unknown) => {
      // Só funciona com ZodObject
      if (schema instanceof z.ZodObject) {
        return validatePartialData(schema, data);
      }
      // Para outros tipos de schema, retorna erro
      return { success: false, errors: ['Validação parcial não suportada para este tipo de schema'] } as const;
    },
    safeParse: (data: unknown) => schema.safeParse(data)
  };
};