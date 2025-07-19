import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/logger';
import { realtimeManager } from '@/services/realtimeManager';
import { cacheInvalidationManager } from '@/services/cacheInvalidationManager';

const logger = createLogger('useProjectsRealTime');

export const useProjectsRealTime = () => {
  const queryClient = useQueryClient();
  const channelKeyRef = useRef<string | null>(null);

  const handleInvalidation = useCallback((type: string) => {
    logger.info(`Requesting cache invalidation for ${type}`);
    cacheInvalidationManager.requestInvalidation(type);
  }, []);

  useEffect(() => {
    logger.info('Setting up real-time subscriptions for projects');

    // Initialize the cache invalidation manager
    cacheInvalidationManager.initialize(queryClient);

    const channelKey = realtimeManager.subscribe(
      'projects',
      [
        {
          table: 'projects',
          callback: (payload) => {
            logger.info('Projects table changed', payload);
            handleInvalidation('projects');
          }
        }
      ]
    );

    channelKeyRef.current = channelKey;

    // Cleanup function
    return () => {
      logger.info('Cleaning up projects real-time subscriptions');
      if (channelKeyRef.current) {
        realtimeManager.unsubscribe(channelKeyRef.current);
      }
    };
  }, [handleInvalidation, queryClient]);

  return {
    // This hook doesn't return anything, it just sets up subscriptions
    isSubscribed: true
  };
};