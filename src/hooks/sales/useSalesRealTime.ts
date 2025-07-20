import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

    // Subscribe to sales opportunities changes
    const opportunitiesSubscription = supabase
      .channel('sales_opportunities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_opportunities',
          filter: projectId ? `project_id=eq.${projectId}` : undefined,
        },
        (payload) => {
          console.log('Sales opportunity change:', payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunities(projectId) });
        }
      )
      .subscribe();

    // Subscribe to sales columns changes
    const columnsSubscription = supabase
      .channel('sales_columns_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_columns',
        },
        (payload) => {
          console.log('Sales column change:', payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesColumns });
        }
      )
      .subscribe();

    // Subscribe to sales tags changes
    const tagsSubscription = supabase
      .channel('sales_tags_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_tags',
        },
        (payload) => {
          console.log('Sales tag change:', payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesTags });
        }
      )
      .subscribe();

    // Subscribe to opportunity tags changes
    const opportunityTagsSubscription = supabase
      .channel('sales_opportunity_tags_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_opportunity_tags',
        },
        (payload) => {
          console.log('Sales opportunity tag change:', payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunityTags });
        }
      )
      .subscribe();

    // Subscribe to sales comments changes
    const commentsSubscription = supabase
      .channel('sales_comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_comments',
        },
        (payload) => {
          console.log('Sales comment change:', payload);
          
          // Invalidate comment-related queries
          queryClient.invalidateQueries({ queryKey: SALES_COMMENTS_QUERY_KEYS.salesCommentCounts });
          
          // If we have the opportunity_id, invalidate specific comments
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
      )
      .subscribe();

    // Subscribe to sales activities changes
    const activitiesSubscription = supabase
      .channel('sales_activities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_activities',
        },
        (payload) => {
          console.log('Sales activity change:', payload);
          
          // Invalidate activity-related queries
          // Add specific query keys when activity hooks are implemented
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      opportunitiesSubscription.unsubscribe();
      columnsSubscription.unsubscribe();
      tagsSubscription.unsubscribe();
      opportunityTagsSubscription.unsubscribe();
      commentsSubscription.unsubscribe();
      activitiesSubscription.unsubscribe();
    };
  }, [queryClient, projectId, enabled]);

  // Return subscription status
  return {
    isConnected: true, // You could track actual connection status if needed
  };
};