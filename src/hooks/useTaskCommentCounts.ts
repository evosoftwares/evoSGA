import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useTaskCommentCounts');

export const useTaskCommentCounts = (taskIds: string[]) => {
  return useQuery({
    queryKey: ['task-comment-counts', taskIds],
    queryFn: async () => {
      if (!taskIds.length) return {};

      try {
        const { data, error } = await supabase
          .from('task_comments')
          .select('task_id')
          .in('task_id', taskIds);

        if (error) throw error;

        // Count comments per task
        const commentCounts: Record<string, number> = {};
        
        // Initialize all tasks with 0 comments
        taskIds.forEach(taskId => {
          commentCounts[taskId] = 0;
        });

        // Count actual comments
        data?.forEach(comment => {
          commentCounts[comment.task_id] = (commentCounts[comment.task_id] || 0) + 1;
        });

        return commentCounts;
      } catch (error: any) {
        logger.error('Error fetching comment counts', error);
        throw error;
      }
    },
    enabled: taskIds.length > 0,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
};