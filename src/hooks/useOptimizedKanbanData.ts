import { useBatchKanbanData } from './kanban/useBatchKanbanData';
import { useOptimizedKanbanMutations } from './kanban/useOptimizedKanbanMutations';
import { useTasksRealTime } from './useTasksRealTime';
import { useTagsRealTime } from './useTagsRealTime';
import { usePollingFallback } from './usePollingFallback';

export const useOptimizedKanbanData = (selectedProjectId?: string | null) => {
  // Use batch data fetching
  const {
    data,
    isLoading: loading,
    error,
    refetch: refreshData
  } = useBatchKanbanData(selectedProjectId);

  // Use optimized mutations
  const mutations = useOptimizedKanbanMutations(selectedProjectId);

  // Set up real-time subscriptions for tasks and tags
  useTasksRealTime(selectedProjectId);
  useTagsRealTime();
  
  // Add polling fallback for testing
  usePollingFallback(selectedProjectId);

  // Return data with fallbacks
  const columns = data?.columns || [];
  const tasks = data?.tasks || [];
  const profiles = data?.profiles || [];
  const tags = data?.tags || [];
  const taskTags = data?.taskTags || [];

  return {
    // Data
    columns,
    tasks,
    profiles,
    teamMembers: profiles, // Alias for compatibility
    tags,
    taskTags,
    
    // States
    loading,
    error: error?.message || null,
    
    // Actions
    refreshData,
    ...mutations
  };
};