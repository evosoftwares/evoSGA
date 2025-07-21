import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesTag } from '@/types/database';
import { SALES_QUERY_KEYS } from './useSalesKanbanData';

interface CreateSalesTagData {
  name: string;
  color: string;
}

interface UpdateSalesTagData {
  tagId: string;
  name: string;
  color: string;
}

export const useSalesTagMutations = () => {
  const queryClient = useQueryClient();

  // Create new sales tag
  const createSalesTagMutation = useMutation({
    mutationFn: async (data: CreateSalesTagData) => {
      // Check if tag with same name already exists
      const { data: existingTag, error: checkError } = await supabase
        .from('sales_tags')
        .select('id')
        .eq('name', data.name.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingTag) {
        throw new Error('Uma tag com este nome já existe');
      }

      const { data: newTag, error } = await supabase
        .from('sales_tags')
        .insert({
          name: data.name.trim(),
          color: data.color,
        })
        .select()
        .single();

      if (error) throw error;
      return newTag;
    },
    onMutate: async (data) => {
      console.log('🚀 [SALES-TAG-OPTIMISTIC] Creating tag optimistically');
      
      await queryClient.cancelQueries({ queryKey: SALES_QUERY_KEYS.salesTags });
      const previousData = queryClient.getQueryData(SALES_QUERY_KEYS.salesTags);

      // Create temporary tag for optimistic update
      const tempTag: SalesTag = {
        id: `temp-${Date.now()}`,
        name: data.name.trim(),
        color: data.color,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(SALES_QUERY_KEYS.salesTags, (old: SalesTag[] | undefined) => {
        if (!old) return [tempTag];
        return [...old, tempTag].sort((a, b) => a.name.localeCompare(b.name));
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SALES-TAG-OPTIMISTIC] Create error, rolling back:', err);
      if (context?.previousData) {
        queryClient.setQueryData(SALES_QUERY_KEYS.salesTags, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesTags });
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban() });
    },
  });

  // Update sales tag
  const updateSalesTagMutation = useMutation({
    mutationFn: async ({ tagId, name, color }: UpdateSalesTagData) => {
      // Check if another tag with same name already exists
      const { data: existingTag, error: checkError } = await supabase
        .from('sales_tags')
        .select('id')
        .eq('name', name.trim())
        .neq('id', tagId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingTag) {
        throw new Error('Uma tag com este nome já existe');
      }

      const { data: updatedTag, error } = await supabase
        .from('sales_tags')
        .update({
          name: name.trim(),
          color: color,
        })
        .eq('id', tagId)
        .select()
        .single();

      if (error) throw error;
      return updatedTag;
    },
    onMutate: async ({ tagId, name, color }) => {
      console.log('🚀 [SALES-TAG-OPTIMISTIC] Updating tag optimistically:', tagId);
      
      await queryClient.cancelQueries({ queryKey: SALES_QUERY_KEYS.salesTags });
      const previousData = queryClient.getQueryData(SALES_QUERY_KEYS.salesTags);

      queryClient.setQueryData(SALES_QUERY_KEYS.salesTags, (old: SalesTag[] | undefined) => {
        if (!old) return old;
        
        return old.map(tag => 
          tag.id === tagId 
            ? { ...tag, name: name.trim(), color: color }
            : tag
        ).sort((a, b) => a.name.localeCompare(b.name));
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SALES-TAG-OPTIMISTIC] Update error, rolling back:', err);
      if (context?.previousData) {
        queryClient.setQueryData(SALES_QUERY_KEYS.salesTags, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesTags });
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban() });
    },
  });

  // Delete sales tag
  const deleteSalesTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      // First, check if tag is being used by any opportunities
      const { data: usageCheck, error: usageError } = await supabase
        .from('sales_opportunity_tags')
        .select('opportunity_id')
        .eq('tag_id', tagId)
        .limit(1);

      if (usageError) throw usageError;

      if (usageCheck && usageCheck.length > 0) {
        throw new Error('Esta tag está sendo usada por oportunidades e não pode ser excluída. Remova-a das oportunidades primeiro.');
      }

      const { error } = await supabase
        .from('sales_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
      return { success: true };
    },
    onMutate: async (tagId) => {
      console.log('🚀 [SALES-TAG-OPTIMISTIC] Deleting tag optimistically:', tagId);
      
      await queryClient.cancelQueries({ queryKey: SALES_QUERY_KEYS.salesTags });
      const previousData = queryClient.getQueryData(SALES_QUERY_KEYS.salesTags);

      queryClient.setQueryData(SALES_QUERY_KEYS.salesTags, (old: SalesTag[] | undefined) => {
        if (!old) return old;
        return old.filter(tag => tag.id !== tagId);
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SALES-TAG-OPTIMISTIC] Delete error, rolling back:', err);
      if (context?.previousData) {
        queryClient.setQueryData(SALES_QUERY_KEYS.salesTags, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesTags });
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEYS.salesKanban() });
    },
  });

  return {
    createSalesTag: {
      mutate: createSalesTagMutation.mutate,
      mutateAsync: createSalesTagMutation.mutateAsync,
      isLoading: createSalesTagMutation.isPending,
      error: createSalesTagMutation.error,
    },
    updateSalesTag: {
      mutate: updateSalesTagMutation.mutate,
      mutateAsync: updateSalesTagMutation.mutateAsync,
      isLoading: updateSalesTagMutation.isPending,
      error: updateSalesTagMutation.error,
    },
    deleteSalesTag: {
      mutate: deleteSalesTagMutation.mutate,
      mutateAsync: deleteSalesTagMutation.mutateAsync,
      isLoading: deleteSalesTagMutation.isPending,
      error: deleteSalesTagMutation.error,
    },
  };
};