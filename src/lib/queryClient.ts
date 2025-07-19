import { QueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/logger';

const logger = createLogger('QueryClient');

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // NO CACHE - dados sempre stale
      gcTime: 0, // NO CACHE - remove imediatamente
      retry: (failureCount, error: any) => {
        // Não retry em erros 4xx (cliente)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry até 2 vezes para outros erros
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true, // SEMPRE refetch
      refetchOnMount: true, // SEMPRE refetch
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
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taskTags })
      );
      break;
    case 'project':
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) })
      );
      break;
    case 'kanban':
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks(projectId) })
      );
      break;
  }

  await Promise.all(invalidations);
};