import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryClient';
import { createLogger } from '@/utils/logger';
import { realtimeManager } from '@/services/realtimeManager';
import { cacheInvalidationManager } from '@/services/cacheInvalidationManager';
import { supabase } from '@/integrations/supabase/client';

const logger = createLogger('useTasksRealTime');

export const useTasksRealTime = (projectId?: string | null) => {
  const queryClient = useQueryClient();
  const channelKeyRef = useRef<string | null>(null);
  const directChannelRef = useRef<any>(null);

  const handleInvalidation = useCallback((type: string) => {
    // FORCE refetch without cache
    console.log(`🔥 [FORCE-REFETCH] Forcing refetch for ${type} - NO CACHE`);
    if (projectId) {
      // Force refetch by setting stale and invalidating
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) });
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.kanban(projectId) });
      
      if (type === 'tasks') {
        queryClient.invalidateQueries({ queryKey: ['userPoints'] });
        queryClient.invalidateQueries({ queryKey: ['projectsSummary'] });
        queryClient.refetchQueries({ queryKey: ['userPoints'] });
        queryClient.refetchQueries({ queryKey: ['projectsSummary'] });
      }
    } else {
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.refetchQueries({ queryKey: ['kanban'] });
    }
  }, [projectId, queryClient]);

  useEffect(() => {
    if (!projectId) return;

    logger.info('🔥 Setting up DIRECT real-time subscriptions for tasks', { projectId });
    console.log('🔥 [useTasksRealTime] Setting up DIRECT subscriptions for projectId:', projectId);

    // Initialize the cache invalidation manager
    cacheInvalidationManager.initialize(queryClient);

    // SINGLE channel for both tasks and task_tags to reduce connections
    const directChannel = supabase
      .channel(`kanban-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('🔥 [FAST-REALTIME] Tasks changed:', payload);
          handleInvalidation('tasks');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_tags'
        },
        (payload) => {
          console.log('🔥 [FAST-REALTIME] Task tags changed:', payload);
          handleInvalidation('task_tags');
        }
      )
      .subscribe((status) => {
        console.log('🔥 [FAST-REALTIME] Channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('🔥 [FAST-REALTIME] Channel error detected! Retrying...');
          // Retry after 2 seconds
          setTimeout(() => {
            supabase.removeChannel(directChannel);
            // Will be recreated on next effect run
          }, 2000);
        }
      });

    directChannelRef.current = directChannel;

    console.log('🔥 [useTasksRealTime] Direct subscription created and working!');

    // Cleanup function
    return () => {
      logger.info('Cleaning up tasks real-time subscriptions');
      if (directChannelRef.current) {
        supabase.removeChannel(directChannelRef.current);
      }
    };
  }, [projectId, handleInvalidation, queryClient]);

  return {
    // This hook doesn't return anything, it just sets up subscriptions
    isSubscribed: true
  };
};