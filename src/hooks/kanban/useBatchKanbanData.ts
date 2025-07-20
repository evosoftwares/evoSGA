import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/lib/queryClient';
import { KanbanColumn, Task, Profile, Tag, TaskTag } from '@/types/database';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useBatchKanbanData');

interface BatchKanbanData {
  columns: KanbanColumn[];
  tasks: Task[];
  profiles: Profile[];
  tags: Tag[];
  taskTags: TaskTag[];
}

const fetchBatchKanbanData = async (selectedProjectId?: string | null): Promise<BatchKanbanData> => {
  logger.info('Starting batch data fetch for project', selectedProjectId);
  
  // Execute todas as queries em paralelo usando Promise.all
  const [
    columnsResult,
    tasksResult,
    profilesResult,
    tagsResult,
    taskTagsResult
  ] = await Promise.all([
    supabase
      .from('kanban_columns')
      .select('*')
      .order('position'),
    
    selectedProjectId 
      ? supabase
          .from('tasks')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('position')
      : supabase
          .from('tasks')
          .select('*')
          .order('position'),
    
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('name'),
    
    supabase
      .from('tags')
      .select('*')
      .order('name'),
    
    supabase
      .from('task_tags')
      .select('*')
  ]);

  // Verificar erros
  const errors = [
    columnsResult.error,
    tasksResult.error,
    profilesResult.error,
    tagsResult.error,
    taskTagsResult.error
  ].filter(Boolean);

  if (errors.length > 0) {
    logger.error('Batch fetch errors found', errors);
    throw new Error(`Batch fetch failed: ${errors[0]?.message}`);
  }

  // Converter tasks para o formato correto
  const convertedTasks = (tasksResult.data || []).map(task => ({
    ...task,
    function_points: task.function_points || 0,
    complexity: task.complexity || 'medium',
    status_image_filenames: task.status_image_filenames || []
  }));

  logger.info('Data loaded successfully', {
    columns: columnsResult.data?.length,
    tasks: convertedTasks.length,
    profiles: profilesResult.data?.length,
    tags: tagsResult.data?.length,
    taskTags: taskTagsResult.data?.length
  });

  return {
    columns: columnsResult.data || [],
    tasks: convertedTasks,
    profiles: profilesResult.data || [],
    tags: tagsResult.data || [],
    taskTags: taskTagsResult.data || []
  };
};

export const useBatchKanbanData = (selectedProjectId?: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.kanban(selectedProjectId),
    queryFn: () => fetchBatchKanbanData(selectedProjectId),
    staleTime: 2 * 60 * 1000, // 2 minutes - increased to reduce unnecessary refetches
    gcTime: 10 * 60 * 1000, // 10 minutes - increased garbage collection time
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Only refetch if data is stale - improved caching
    refetchOnReconnect: 'always', // Always refetch on reconnect for data consistency
    // Só refetch se o projectId mudou
    enabled: true,
  });
};