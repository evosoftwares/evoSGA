import { QueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/logger';

const logger = createLogger('QueryClient');

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - Cache curto para real-time
      gcTime: 5 * 60 * 1000, // 5 minutes - Garbage collection
      retry: (failureCount, error: any) => {
        // Não retry em erros 4xx (cliente)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry até 2 vezes para outros erros
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Evita refetch desnecessário
      refetchOnMount: false, // Usa cache se ainda estiver fresh
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: false, // Não retry mutations automaticamente
      onError: (error) => {
        logger.error('Mutation error', error);
      },
    },
  },
});

// Cache keys padronizados para evitar duplicação
export const QUERY_KEYS = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  kanban: (projectId?: string | null) => ['kanban', projectId] as const,
  tasks: (projectId?: string | null) => ['tasks', projectId] as const,
  columns: ['columns'] as const,
  profiles: ['profiles'] as const,
  tags: ['tags'] as const,
  taskTags: ['taskTags'] as const,
  referenceData: ['referenceData'] as const,
  projectsSummary: ['projectsSummary'] as const,
} as const;

// Utility para invalidar queries relacionadas
export const invalidateRelatedQueries = async (
  queryClient: QueryClient,
  entityType: 'task' | 'project' | 'kanban',
  projectId?: string | null
) => {
  const invalidations = [];

  switch (entityType) {
    case 'task':
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(projectId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taskTags }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsSummary })
      );
      break;
    case 'project':
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsSummary })
      );
      break;
    case 'kanban':
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(projectId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsSummary })
      );
      break;
  }

  await Promise.all(invalidations);
};