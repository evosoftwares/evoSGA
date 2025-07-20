import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesComment } from '@/types/database';

interface SalesCommentWithProfile extends SalesComment {
  profile?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface CreateCommentData {
  opportunity_id: string;
  content: string;
  user_id: string;
}

const SALES_COMMENTS_QUERY_KEYS = {
  salesComments: (opportunityId: string) => ['sales-comments', opportunityId],
  salesCommentCounts: ['sales-comment-counts'],
} as const;

// Hook to get comments for a specific opportunity
export const useSalesComments = (opportunityId: string) => {
  return useQuery<SalesCommentWithProfile[]>({
    queryKey: SALES_COMMENTS_QUERY_KEYS.salesComments(opportunityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_comments')
        .select(`
          *,
          profile:profiles(id, name, avatar)
        `)
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!opportunityId,
    staleTime: 30000, // 30 seconds
  });
};

// Hook to get comment counts for all opportunities
export const useSalesCommentCounts = () => {
  return useQuery<Record<string, number>>({
    queryKey: SALES_COMMENTS_QUERY_KEYS.salesCommentCounts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_comments')
        .select('opportunity_id');

      if (error) throw error;

      // Count comments per opportunity
      const counts: Record<string, number> = {};
      data.forEach(comment => {
        counts[comment.opportunity_id] = (counts[comment.opportunity_id] || 0) + 1;
      });

      return counts;
    },
    staleTime: 60000, // 1 minute
  });
};

// Hook for comment mutations
export const useSalesCommentMutations = () => {
  const queryClient = useQueryClient();

  // Create comment
  const createCommentMutation = useMutation({
    mutationFn: async (data: CreateCommentData) => {
      const { data: newComment, error } = await supabase
        .from('sales_comments')
        .insert(data)
        .select(`
          *,
          profile:profiles(id, name, avatar)
        `)
        .single();

      if (error) throw error;
      return newComment;
    },
    onSuccess: (newComment) => {
      // Update comments for the specific opportunity
      queryClient.invalidateQueries({ 
        queryKey: SALES_COMMENTS_QUERY_KEYS.salesComments(newComment.opportunity_id) 
      });
      
      // Update comment counts
      queryClient.invalidateQueries({ 
        queryKey: SALES_COMMENTS_QUERY_KEYS.salesCommentCounts 
      });
    },
  });

  // Update comment
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { data, error } = await supabase
        .from('sales_comments')
        .update({ content })
        .eq('id', commentId)
        .select(`
          *,
          profile:profiles(id, name, avatar)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedComment) => {
      // Update comments for the specific opportunity
      queryClient.invalidateQueries({ 
        queryKey: SALES_COMMENTS_QUERY_KEYS.salesComments(updatedComment.opportunity_id) 
      });
    },
  });

  // Delete comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      // First get the comment to know which opportunity to invalidate
      const { data: comment, error: fetchError } = await supabase
        .from('sales_comments')
        .select('opportunity_id')
        .eq('id', commentId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('sales_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      return { opportunityId: comment.opportunity_id };
    },
    onSuccess: ({ opportunityId }) => {
      // Update comments for the specific opportunity
      queryClient.invalidateQueries({ 
        queryKey: SALES_COMMENTS_QUERY_KEYS.salesComments(opportunityId) 
      });
      
      // Update comment counts
      queryClient.invalidateQueries({ 
        queryKey: SALES_COMMENTS_QUERY_KEYS.salesCommentCounts 
      });
    },
  });

  return {
    createComment: {
      mutate: createCommentMutation.mutate,
      mutateAsync: createCommentMutation.mutateAsync,
      isLoading: createCommentMutation.isPending,
      error: createCommentMutation.error,
    },
    updateComment: {
      mutate: updateCommentMutation.mutate,
      mutateAsync: updateCommentMutation.mutateAsync,
      isLoading: updateCommentMutation.isPending,
      error: updateCommentMutation.error,
    },
    deleteComment: {
      mutate: deleteCommentMutation.mutate,
      mutateAsync: deleteCommentMutation.mutateAsync,
      isLoading: deleteCommentMutation.isPending,
      error: deleteCommentMutation.error,
    },
  };
};

export { SALES_COMMENTS_QUERY_KEYS };