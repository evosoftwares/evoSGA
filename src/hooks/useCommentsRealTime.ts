import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/logger';
import { realtimeManager } from '@/services/realtimeManager';

const logger = createLogger('useCommentsRealTime');

export const useCommentsRealTime = (taskId?: string | null) => {
  const queryClient = useQueryClient();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelKeyRef = useRef<string | null>(null);

  const debouncedInvalidate = (type: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      logger.info(`Invalidating cache after ${type} change`);
      // Invalidate task comments for the specific task
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      }
      // Invalidate all task comments as fallback
      queryClient.invalidateQueries({ queryKey: ['task-comments'] });
      // Invalidate comment counts
      queryClient.invalidateQueries({ queryKey: ['task-comment-counts'] });
    }, 300); // 300ms debounce for better batching
  };

  useEffect(() => {
    logger.info('Setting up real-time subscriptions for comments', { taskId });

    const channelKey = realtimeManager.subscribe(
      'comments',
      [
        {
          table: 'task_comments',
          callback: (payload) => {
            logger.info('Task comments table changed', payload);
            debouncedInvalidate('task_comments');
          }
        }
      ],
      taskId || undefined
    );

    channelKeyRef.current = channelKey;

    // Cleanup function
    return () => {
      logger.info('Cleaning up comments real-time subscriptions');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (channelKeyRef.current) {
        realtimeManager.unsubscribe(channelKeyRef.current);
      }
    };
  }, [taskId]); // Only depend on taskId to prevent re-subscriptions

  return {
    // This hook doesn't return anything, it just sets up subscriptions
    isSubscribed: true
  };
};