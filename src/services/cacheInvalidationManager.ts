import { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryClient';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CacheInvalidationManager');

interface InvalidationRequest {
  type: string;
  projectId?: string | null;
  timestamp: number;
}

class CacheInvalidationManager {
  private queryClient: QueryClient | null = null;
  private pendingInvalidations: Map<string, InvalidationRequest> = new Map();
  private debounceTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_TIME = 0; // Immediate processing for real-time

  initialize(queryClient: QueryClient): void {
    console.log('🔥 [CACHE-INVALIDATION] Initializing manager with queryClient:', !!queryClient);
    this.queryClient = queryClient;
  }

  requestInvalidation(type: string, projectId?: string | null): void {
    if (!this.queryClient) {
      logger.warn('QueryClient not initialized, skipping invalidation');
      console.log('🔥 [CACHE-INVALIDATION] QueryClient not initialized!');
      return;
    }

    const key = `${type}-${projectId || 'global'}`;
    
    console.log(`🔥 [CACHE-INVALIDATION] Adding to pending: ${key}`);
    
    // Add to pending invalidations
    this.pendingInvalidations.set(key, {
      type,
      projectId,
      timestamp: Date.now()
    });

    // Clear existing timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Set new timeout for batched invalidation
    this.debounceTimeout = setTimeout(() => {
      this.processPendingInvalidations();
    }, this.DEBOUNCE_TIME);
  }

  private processPendingInvalidations(): void {
    if (!this.queryClient || this.pendingInvalidations.size === 0) {
      console.log('🔥 [CACHE-INVALIDATION] Nothing to process or no queryClient');
      return;
    }

    const invalidations = Array.from(this.pendingInvalidations.values());
    this.pendingInvalidations.clear();

    logger.info(`Processing ${invalidations.length} batched invalidations`);
    console.log(`🔥 [CACHE-INVALIDATION] Processing ${invalidations.length} invalidations:`, invalidations);

    // Group by project for efficient invalidation
    const projectGroups = new Map<string, InvalidationRequest[]>();
    
    invalidations.forEach(inv => {
      const projectKey = inv.projectId || 'global';
      if (!projectGroups.has(projectKey)) {
        projectGroups.set(projectKey, []);
      }
      projectGroups.get(projectKey)!.push(inv);
    });

    // Process each project group
    projectGroups.forEach((invs, projectKey) => {
      const projectId = projectKey === 'global' ? null : projectKey;
      const types = invs.map(inv => inv.type);
      
      logger.info(`Invalidating for project ${projectKey}: ${types.join(', ')}`);
      console.log(`🔥 [CACHE-INVALIDATION] Invalidating for project ${projectKey}: ${types.join(', ')}`);
      
      // Invalidate kanban data for this project
      if (projectId) {
        console.log(`🔥 [CACHE-INVALIDATION] Invalidating kanban for project: ${projectId}`);
        this.queryClient!.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) });
      } else {
        console.log(`🔥 [CACHE-INVALIDATION] Invalidating all kanban queries`);
        this.queryClient!.invalidateQueries({ queryKey: ['kanban'] });
      }
      
      // Conditionally invalidate related queries
      if (types.some(t => ['tasks', 'task_tags'].includes(t))) {
        console.log(`🔥 [CACHE-INVALIDATION] Invalidating userPoints and projectsSummary`);
        this.queryClient!.invalidateQueries({ queryKey: ['userPoints'] });
        this.queryClient!.invalidateQueries({ queryKey: QUERY_KEYS.projectsSummary });
      }
      
      // Add sales invalidation support
      if (types.some(t => ['sales_opportunities', 'sales_columns', 'sales_tags', 'sales_opportunity_tags', 'sales_comments', 'sales_activities'].includes(t))) {
        console.log(`🔥 [CACHE-INVALIDATION] Invalidating sales queries`);
        // Import SALES_QUERY_KEYS if available
        this.queryClient!.invalidateQueries({ queryKey: ['salesKanban'] });
        this.queryClient!.invalidateQueries({ queryKey: ['salesOpportunities'] });
        this.queryClient!.invalidateQueries({ queryKey: ['salesColumns'] });
        this.queryClient!.invalidateQueries({ queryKey: ['salesTags'] });
      }
      
      if (types.includes('tags')) {
        console.log(`🔥 [CACHE-INVALIDATION] Invalidating tags`);
        this.queryClient!.invalidateQueries({ queryKey: QUERY_KEYS.tags });
      }
      
      if (types.includes('projects')) {
        console.log(`🔥 [CACHE-INVALIDATION] Invalidating projects`);
        this.queryClient!.invalidateQueries({ queryKey: QUERY_KEYS.projects });
        this.queryClient!.invalidateQueries({ queryKey: QUERY_KEYS.projectsSummary });
      }
    });
  }

  cleanup(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    this.pendingInvalidations.clear();
  }
}

// Export singleton instance
export const cacheInvalidationManager = new CacheInvalidationManager();