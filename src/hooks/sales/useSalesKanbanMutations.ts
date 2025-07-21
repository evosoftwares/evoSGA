import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesOpportunity } from '@/types/database';
import { SALES_QUERY_KEYS } from './useSalesKanbanData';
import { useSalesTagMutations } from './useSalesTagMutations';

interface CreateOpportunityData {
  title: string;
  column_id: string;
  description?: string;
  deal_value?: number;
  currency?: string;
  probability?: number;
  assignee?: string;
  project_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  source?: string;
  expected_close_date?: string;
}

interface MoveOpportunityData {
  opportunityId: string;
  destinationColumnId: string;
  newPosition: number;
}

interface UpdateOpportunityData {
  opportunityId: string;
  updates: Partial<SalesOpportunity>;
}

export const useSalesKanbanMutations = (projectId?: string) => {
  const queryClient = useQueryClient();
  const salesTagMutations = useSalesTagMutations();

  // Create new opportunity
  const createOpportunityMutation = useMutation({
    mutationFn: async (data: CreateOpportunityData) => {
      // Get the highest position in the target column
      const { data: existingOpportunities, error: positionError } = await supabase
        .from('sales_opportunities')
        .select('position')
        .eq('column_id', data.column_id)
        .order('position', { ascending: false })
        .limit(1);

      if (positionError) throw positionError;

      const nextPosition = existingOpportunities.length > 0 
        ? existingOpportunities[0].position + 1 
        : 0;

      const { data: newOpportunity, error } = await supabase
        .from('sales_opportunities')
        .insert({
          ...data,
          position: nextPosition,
          deal_value: data.deal_value || 0,
          currency: data.currency || 'BRL',
          probability: data.probability || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return newOpportunity;
    },
    onMutate: async (data) => {
      console.log('🚀 [SALES-OPTIMISTIC] Creating opportunity optimistically');
      
      await queryClient.cancelQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
      const previousData = queryClient.getQueryData(SALES_QUERY_KEYS.salesKanban(projectId));

      // Create temporary opportunity for optimistic update
      const tempOpportunity: SalesOpportunity = {
        id: `temp-${Date.now()}`,
        title: data.title,
        description: data.description,
        column_id: data.column_id,
        position: 999, // Will be corrected by server
        assignee: data.assignee,
        project_id: data.project_id,
        deal_value: data.deal_value || 0,
        currency: data.currency || 'BRL',
        probability: data.probability || 0,
        expected_close_date: data.expected_close_date,
        source: data.source,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        client_company: data.client_company,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(SALES_QUERY_KEYS.salesKanban(projectId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          opportunities: [...old.opportunities, tempOpportunity],
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SALES-OPTIMISTIC] Create error, rolling back:', err);
      if (context?.previousData) {
        queryClient.setQueryData(SALES_QUERY_KEYS.salesKanban(projectId), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunities(projectId) });
    },
  });

  // Move opportunity between columns
  const moveOpportunityMutation = useMutation({
    mutationFn: async ({ opportunityId, destinationColumnId, newPosition }: MoveOpportunityData) => {
      const { data, error } = await supabase
        .rpc('move_sales_opportunity', {
          p_opportunity_id: opportunityId,
          p_new_column_id: destinationColumnId,
          p_new_position: newPosition
        });

      if (error) throw error;
      return data;
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ opportunityId, destinationColumnId, newPosition }) => {
      console.log('🚀 [SALES-OPTIMISTIC] Starting optimistic update for opportunity:', opportunityId);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(SALES_QUERY_KEYS.salesKanban(projectId));

      // Optimistically update the cache
      queryClient.setQueryData(SALES_QUERY_KEYS.salesKanban(projectId), (old: any) => {
        if (!old) return old;

        const updatedOpportunities = old.opportunities.map((opp: SalesOpportunity) => {
          if (opp.id === opportunityId) {
            return {
              ...opp,
              column_id: destinationColumnId,
              position: newPosition,
            };
          }
          
          // Update positions of other opportunities in the destination column
          if (opp.column_id === destinationColumnId && opp.id !== opportunityId) {
            const currentPos = old.opportunities
              .filter((o: SalesOpportunity) => o.column_id === destinationColumnId && o.id !== opportunityId)
              .sort((a: SalesOpportunity, b: SalesOpportunity) => a.position - b.position)
              .findIndex((o: SalesOpportunity) => o.id === opp.id);
            
            const adjustedPosition = currentPos >= newPosition ? currentPos + 1 : currentPos;
            return { ...opp, position: adjustedPosition };
          }
          
          return opp;
        });

        return {
          ...old,
          opportunities: updatedOpportunities,
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SALES-OPTIMISTIC] Error occurred, rolling back:', err);
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(SALES_QUERY_KEYS.salesKanban(projectId), context.previousData);
      }
    },
    onSettled: () => {
      console.log('🔄 [SALES-OPTIMISTIC] Mutation settled, invalidating queries');
      
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunities(projectId) });
    },
  });

  // Update opportunity
  const updateOpportunityMutation = useMutation({
    mutationFn: async ({ opportunityId, updates }: UpdateOpportunityData) => {
      const { data, error } = await supabase
        .from('sales_opportunities')
        .update(updates)
        .eq('id', opportunityId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ opportunityId, updates }) => {
      console.log('🚀 [SALES-OPTIMISTIC] Updating opportunity optimistically:', opportunityId);
      
      await queryClient.cancelQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
      const previousData = queryClient.getQueryData(SALES_QUERY_KEYS.salesKanban(projectId));

      queryClient.setQueryData(SALES_QUERY_KEYS.salesKanban(projectId), (old: any) => {
        if (!old) return old;
        
        const updatedOpportunities = old.opportunities.map((opp: SalesOpportunity) => 
          opp.id === opportunityId ? { ...opp, ...updates, updated_at: new Date().toISOString() } : opp
        );

        return {
          ...old,
          opportunities: updatedOpportunities,
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SALES-OPTIMISTIC] Update error, rolling back:', err);
      if (context?.previousData) {
        queryClient.setQueryData(SALES_QUERY_KEYS.salesKanban(projectId), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunities(projectId) });
    },
  });

  // Delete opportunity
  const deleteOpportunityMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      // Deletar tags relacionadas primeiro
      const { error: tagsError } = await supabase
        .from('sales_opportunity_tags')
        .delete()
        .eq('opportunity_id', opportunityId);
  
      if (tagsError) throw tagsError;
  
      const { error } = await supabase
        .from('sales_opportunities')
        .delete()
        .eq('id', opportunityId);
  
      if (error) throw error;
      return { success: true };
    },
    onMutate: async (opportunityId) => {
      console.log('🚀 [SALES-OPTIMISTIC] Deleting opportunity optimistically:', opportunityId);
      
      await queryClient.cancelQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
      const previousData = queryClient.getQueryData(SALES_QUERY_KEYS.salesKanban(projectId));
  
      queryClient.setQueryData(SALES_QUERY_KEYS.salesKanban(projectId), (old: any) => {
        if (!old) return old;
        
        const filteredOpportunities = old.opportunities.filter((opp: SalesOpportunity) => opp.id !== opportunityId);
  
        return {
          ...old,
          opportunities: filteredOpportunities,
        };
      });
  
      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SALES-OPTIMISTIC] Delete error, rolling back:', err);
      if (context?.previousData) {
        queryClient.setQueryData(SALES_QUERY_KEYS.salesKanban(projectId), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunities(projectId) });
    },
  });

  // Add tag to opportunity
  const addTagToOpportunityMutation = useMutation({
    mutationFn: async ({ opportunityId, tagId }: { opportunityId: string; tagId: string }) => {
      const { error } = await supabase
        .from('sales_opportunity_tags')
        .insert({ opportunity_id: opportunityId, tag_id: tagId });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunityTags });
    },
  });

  // Remove tag from opportunity
  const removeTagFromOpportunityMutation = useMutation({
    mutationFn: async ({ opportunityId, tagId }: { opportunityId: string; tagId: string }) => {
      const { error } = await supabase
        .from('sales_opportunity_tags')
        .delete()
        .eq('opportunity_id', opportunityId)
        .eq('tag_id', tagId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban(projectId) });
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesOpportunityTags });
    },
  });

  return {
    createOpportunity: {
      mutate: createOpportunityMutation.mutate,
      mutateAsync: createOpportunityMutation.mutateAsync,
      isLoading: createOpportunityMutation.isPending,
      error: createOpportunityMutation.error,
    },
    moveOpportunity: {
      mutate: moveOpportunityMutation.mutate,
      mutateAsync: moveOpportunityMutation.mutateAsync,
      isLoading: moveOpportunityMutation.isPending,
      error: moveOpportunityMutation.error,
    },
    updateOpportunity: {
      mutate: updateOpportunityMutation.mutate,
      mutateAsync: updateOpportunityMutation.mutateAsync,
      isLoading: updateOpportunityMutation.isPending,
      error: updateOpportunityMutation.error,
    },
    deleteOpportunity: {
      mutate: deleteOpportunityMutation.mutate,
      mutateAsync: deleteOpportunityMutation.mutateAsync,
      isLoading: deleteOpportunityMutation.isPending,
      error: deleteOpportunityMutation.error,
    },
    addTagToOpportunity: {
      mutate: addTagToOpportunityMutation.mutate,
      mutateAsync: addTagToOpportunityMutation.mutateAsync,
      isLoading: addTagToOpportunityMutation.isPending,
      error: addTagToOpportunityMutation.error,
    },
    removeTagFromOpportunity: {
      mutate: removeTagFromOpportunityMutation.mutate,
      mutateAsync: removeTagFromOpportunityMutation.mutateAsync,
      isLoading: removeTagFromOpportunityMutation.isPending,
      error: removeTagFromOpportunityMutation.error,
    },
    // Tag management functions
    createSalesTag: salesTagMutations.createSalesTag,
    updateSalesTag: salesTagMutations.updateSalesTag,
    deleteSalesTag: salesTagMutations.deleteSalesTag,
  };
};