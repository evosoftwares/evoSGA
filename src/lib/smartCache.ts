import { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryClient';

/**
 * Smart cache configuration for real-time features
 * Balances performance with real-time updates
 */
export const createSmartCacheConfig = (queryClient: QueryClient) => {
  return {
    // Real-time queries - shorter cache for immediate updates
    kanban: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 2 * 60 * 1000, // 2 minutes
    },
    
    // User-specific queries - medium cache
    userPoints: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
    
    // Projects summary - medium cache for dashboard
    projectsSummary: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
    
    // Reference data - longer cache (rarely changes)
    projects: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    },
    
    tags: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    },
    
    profiles: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 60 * 60 * 1000, // 1 hour
    }
  };
};

/**
 * Smart invalidation that respects cache tiers
 */
export const smartInvalidate = (
  queryClient: QueryClient,
  type: 'kanban' | 'userPoints' | 'projects' | 'tags' | 'profiles' | 'projectsSummary',
  projectId?: string | null
) => {
  console.log(`🔥 [SMART-CACHE] Invalidating ${type} for project ${projectId}`);
  
  switch (type) {
    case 'kanban':
      // High priority - immediate refetch for active queries
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.kanban(projectId),
        refetchType: 'active'
      });
      break;
      
    case 'userPoints':
      // Medium priority - invalidate but don't refetch immediately
      queryClient.invalidateQueries({ 
        queryKey: ['userPoints'],
        refetchType: 'none'
      });
      break;
      
    case 'projects':
      // Low priority - invalidate but don't refetch immediately
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.projects,
        refetchType: 'none'
      });
      break;
      
    case 'tags':
      // Medium priority - invalidate active queries
      queryClient.invalidateQueries({ 
        queryKey: ['tags'],
        refetchType: 'active'
      });
      break;
      
    case 'profiles':
      // Low priority - invalidate but don't refetch immediately
      queryClient.invalidateQueries({ 
        queryKey: ['profiles'],
        refetchType: 'none'
      });
      break;
      
    case 'projectsSummary':
      // Medium priority - invalidate active queries for dashboard updates
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.projectsSummary,
        refetchType: 'active'
      });
      break;
  }
};