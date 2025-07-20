import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createLogger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

const logger = createLogger('useTagsRealTime');

export const useTagsRealTime = () => {
  const queryClient = useQueryClient();
  const channelKeyRef = useRef<string | null>(null);

  const handleInvalidation = useCallback((type: string) => {
    console.log(`🔥 [INSTANT-INVALIDATION] Invalidating ${type} immediately`);
    // Direct invalidation for immediate response
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['kanban'] });
  }, [queryClient]);

  useEffect(() => {
    console.log('🔥 [useTagsRealTime] Setting up FAST real-time subscriptions');

    // Global channel for tags (no project filter needed)
    const directChannel = supabase
      .channel('tags-global')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tags'
      }, (payload) => {
        console.log('🔥 [FAST-TAGS] Tags changed:', payload);
        handleInvalidation('tags');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_tags'
      }, (payload) => {
        console.log('🔥 [FAST-TAGS] Task tags changed:', payload);
        handleInvalidation('task_tags');
      })
      .subscribe((status) => {
        console.log('🔥 [FAST-TAGS] Channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('🔥 [FAST-TAGS] Channel error detected!');
        }
      });

    channelKeyRef.current = directChannel;

    return () => {
      console.log('🔥 [useTagsRealTime] Cleaning up');
      if (channelKeyRef.current) {
        supabase.removeChannel(channelKeyRef.current);
      }
    };
  }, [handleInvalidation]);
};