import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeManager } from '@/services/realtimeManager';
import { SALES_QUERY_KEYS } from './useSalesKanbanData';
import { SALES_COMMENTS_QUERY_KEYS } from './useSalesComments';

interface UseSalesRealTimeProps {
  projectId?: string;
  enabled?: boolean;
}

export const useSalesRealTime = ({ projectId, enabled = true }: UseSalesRealTimeProps = {}) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const subscriptionConfigs = [
      {
        table: 'sales_opportunities',
        filter: projectId ? { filter: `project_id=eq.${projectId}` } : undefined,
        callback: (payload: any) => {
          console.log('Sales opportunity change:', payload);
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunities(projectId) });
        }
      },
      {
        table: 'sales_columns',
        callback: (payload: any) => {
          console.log('Sales column change:', payload);
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesColumns });
        }
      },
      {
        table: 'sales_tags',
        callback: (payload: any) => {
          console.log('Sales tag change:', payload);
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesTags });
        }
      },
      {
        table: 'sales_opportunity_tags',
        callback: (payload: any) => {
          console.log('Sales opportunity tag change:', payload);
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunityTags });
        }
      },
      {
        table: 'sales_comments',
        callback: (payload: any) => {
          console.log('Sales comment change:', payload);
          queryClient.invalidateQueries({ queryKey: SALES_COMMENTS_QUERY_KEYS.salesCommentCounts });
          
          if (payload.new && 'opportunity_id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: SALES_COMMENTS_QUERY_KEYS.salesComments(payload.new.opportunity_id as string) 
            });
          }
          if (payload.old && 'opportunity_id' in payload.old) {
            queryClient.invalidateQueries({ 
              queryKey: SALES_COMMENTS_QUERY_KEYS.salesComments(payload.old.opportunity_id as string) 
            });
          }
        }
      },
      {
        table: 'sales_activities',
        callback: (payload: any) => {
          console.log('Sales activity change:', payload);
          // Add specific query keys when activity hooks are implemented
        }
      }
    ];

    const channelKey = realtimeManager.subscribe('sales', subscriptionConfigs, projectId);

    return () => {
      realtimeManager.unsubscribe(channelKey);
    };
  }, [queryClient, projectId, enabled]);

  return {
    isConnected: true,
  };
};