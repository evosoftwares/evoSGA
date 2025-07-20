
import { useEffect, useCallback, useState } from 'react';
import { Task } from '@/types/database';
import { useKanbanDataFetch } from './kanban/useKanbanDataFetch';
import { useOptimizedKanbanMutations } from './kanban/useOptimizedKanbanMutations';

export const useKanbanData = (selectedProjectId?: string | null) => {
  const {
    columns,
    tasks,
    profiles, // Mudou de teamMembers para profiles
    tags,
    taskTags,
    loading,
    error,
    fetchAllData,
    setTasks,
    setColumns,
    setProfiles, // Mudou de setTeamMembers para setProfiles
    setTags,
    setTaskTags
  } = useKanbanDataFetch();

  const [internalError, setInternalError] = useState<string | null>(null);

  const { moveTask, createTask, updateTask, deleteTask } = useOptimizedKanbanMutations(selectedProjectId);

  const refreshData = useCallback(() => {
    fetchAllData(selectedProjectId);
  }, [selectedProjectId, fetchAllData]);

  useEffect(() => {
    fetchAllData(selectedProjectId);
  }, [selectedProjectId]); // Removida dependência de fetchAllData

  return {
    columns,
    tasks,
    teamMembers: profiles, // Alias para manter compatibilidade
    profiles,
    tags,
    taskTags,
    loading,
    error: error || internalError,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    refreshData
  };
};
