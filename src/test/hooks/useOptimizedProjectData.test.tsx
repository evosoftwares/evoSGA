import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOptimizedProjectData } from '../../hooks/useOptimizedProjectData';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

// Mock do hook de real-time
vi.mock('../../hooks/useProjectsRealTime', () => ({
  useProjectsRealTime: vi.fn()
}));

// Mock do logger
vi.mock('../../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn()
  }))
}));

// Mock das query keys
vi.mock('@/lib/queryClient', () => ({
  QUERY_KEYS: {
    projects: ['projects']
  },
  invalidateRelatedQueries: vi.fn()
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useOptimizedProjectData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar estado inicial correto', () => {
    const { result } = renderHook(
      () => useOptimizedProjectData(),
      { wrapper: createWrapper() }
    );

    expect(result.current.projects).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.createProject).toBe('function');
    expect(typeof result.current.updateProject).toBe('function');
    expect(typeof result.current.deleteProject).toBe('function');
  });

  it('deve ter propriedades de estado de loading', () => {
    const { result } = renderHook(
      () => useOptimizedProjectData(),
      { wrapper: createWrapper() }
    );

    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });

  it('deve ter função fetchProjects', () => {
    const { result } = renderHook(
      () => useOptimizedProjectData(),
      { wrapper: createWrapper() }
    );

    expect(typeof result.current.fetchProjects).toBe('function');
  });

  it('deve retornar array vazio quando não há projetos', async () => {
    const { result } = renderHook(
      () => useOptimizedProjectData(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.projects).toEqual([]);
  });
});