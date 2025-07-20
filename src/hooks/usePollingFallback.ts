import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryClient';
import { createLogger } from '@/utils/logger';
import { realtimeStatusManager } from '@/services/realtimeStatusManager';

const logger = createLogger('useSmartPolling');

export const usePollingFallback = (projectId?: string | null) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    if (intervalRef.current) return; // Already polling
    
    logger.info('Starting fallback polling due to real-time failure');
    setIsPolling(true);
    
    intervalRef.current = setInterval(() => {
      logger.info('Polling for updates...');
      
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) });
      } else {
        queryClient.invalidateQueries({ queryKey: ['kanban'] });
      }
    }, 5000); // Poll every 5 seconds (less aggressive)
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPolling(false);
      logger.info('Stopped fallback polling - real-time is working');
    }
  };

  const checkRealtimeHealth = () => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }
    
    checkTimeoutRef.current = setTimeout(() => {
      const isHealthy = realtimeStatusManager.areAnyChannelsHealthy();
      
      if (isHealthy) {
        stopPolling();
      } else {
        startPolling();
      }
    }, 10000); // Wait 10 seconds before checking if we need fallback
  };

  useEffect(() => {
    // Initial check
    checkRealtimeHealth();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
    };
  }, [projectId, queryClient]);

  return {
    isPolling
  };
};