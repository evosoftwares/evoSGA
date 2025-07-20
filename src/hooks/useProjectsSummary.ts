import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project, Task, KanbanColumn as Column } from '@/types/database';

export interface ProjectSummary extends Project {
  taskCount: number;
  completedTaskCount: number;
  completionPercentage: number;
  totalFunctionPoints: number;
  completedFunctionPoints: number;
}

const isDoneColumn = (columnName: string) => {
  const lowerCaseName = columnName.toLowerCase();
  return lowerCaseName.includes('done') || lowerCaseName.includes('concluído') || lowerCaseName.includes('concluido') || lowerCaseName.includes('completed');
};

export const useProjectsSummary = () => {
  const [projectsSummary, setProjectsSummary] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedData, setCachedData] = useState<{
    projects: Project[];
    tasks: Task[];
    columns: Column[];
    doneColumnIds: string[];
  } | null>(null);

  const calculateSummary = (projects: Project[], tasks: Task[], doneColumnIds: string[]): ProjectSummary[] => {
    return projects.map(project => {
      const projectTasks = tasks.filter(task => task.project_id === project.id);
      const completedTasks = projectTasks.filter(task => task.column_id && doneColumnIds.includes(task.column_id));
      
      const taskCount = projectTasks.length;
      const completedTaskCount = completedTasks.length;
      const totalFunctionPoints = projectTasks.reduce((sum, task) => sum + (task.function_points || 0), 0);
      const completedFunctionPoints = completedTasks.reduce((sum, task) => sum + (task.function_points || 0), 0);
      const completionPercentage = totalFunctionPoints > 0 ? (completedFunctionPoints / totalFunctionPoints) * 100 : 0;

      return {
        ...project,
        taskCount,
        completedTaskCount,
        completionPercentage,
        totalFunctionPoints,
        completedFunctionPoints,
      };
    });
  };

  const fetchDataInternal = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: projects, error: projectsError } = await supabase.from('projects').select('*');
      if (projectsError) throw projectsError;

      const { data: tasks, error: tasksError } = await supabase.from('tasks').select('*');
      if (tasksError) throw tasksError;

      const { data: columns, error: columnsError } = await supabase.from('kanban_columns').select('*');
      if (columnsError) throw columnsError;
      
      const doneColumnIds = columns.filter(c => isDoneColumn(c.title)).map(c => c.id);
      
      setCachedData({ projects, tasks, columns, doneColumnIds });
      
      const summary = calculateSummary(projects, tasks, doneColumnIds);
      setProjectsSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Optimistic update function for task changes
  const handleTaskChange = async (payload: any) => {
    if (!cachedData) return;
    
    try {
      // Fetch only the updated task data
      const { data: updatedTasks, error: tasksError } = await supabase.from('tasks').select('*');
      if (tasksError) throw tasksError;
      
      // Update cached data without showing loading state
      const newCachedData = { ...cachedData, tasks: updatedTasks };
      setCachedData(newCachedData);
      
      // Immediately update the summary without loading state
      const summary = calculateSummary(cachedData.projects, updatedTasks, cachedData.doneColumnIds);
      setProjectsSummary(summary);
    } catch (err) {
      // If optimistic update fails, do full refresh
      fetchDataInternal();
    }
  };

  useEffect(() => {
    fetchDataInternal();

    const channelName = `projects-summary-realtime-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchDataInternal())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, handleTaskChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_columns' }, () => fetchDataInternal())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { projectsSummary, loading, error };
}; 