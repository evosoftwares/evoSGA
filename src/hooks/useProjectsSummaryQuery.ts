import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project, Task, KanbanColumn as Column } from '@/types/database';
import { QUERY_KEYS } from '@/lib/queryClient';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useProjectsSummaryQuery');

export interface ProjectSummary extends Project {
  taskCount: number;
  completedTaskCount: number;
  completionPercentage: number;
  totalFunctionPoints: number;
  completedFunctionPoints: number;
}

const isDoneColumn = (columnName: string) => {
  const lowerCaseName = columnName.toLowerCase();
  return lowerCaseName.includes('done') || 
         lowerCaseName.includes('concluído') || 
         lowerCaseName.includes('concluido') || 
         lowerCaseName.includes('completed');
};

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

const fetchProjectsSummary = async (): Promise<ProjectSummary[]> => {
  logger.info('Fetching projects summary data');
  
  try {
    // Fetch all required data in parallel for better performance
    const [projectsResult, tasksResult, columnsResult] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('kanban_columns').select('*')
    ]);

    if (projectsResult.error) throw projectsResult.error;
    if (tasksResult.error) throw tasksResult.error;
    if (columnsResult.error) throw columnsResult.error;

    const projects = projectsResult.data || [];
    const tasks = tasksResult.data || [];
    const columns = columnsResult.data || [];
    
    const doneColumnIds = columns.filter(c => isDoneColumn(c.title)).map(c => c.id);
    
    const summary = calculateSummary(projects, tasks, doneColumnIds);
    
    logger.info('Projects summary calculated successfully', {
      projectCount: projects.length,
      taskCount: tasks.length,
      columnCount: columns.length,
      doneColumnCount: doneColumnIds.length
    });
    
    return summary;
  } catch (error) {
    logger.error('Error fetching projects summary', error);
    throw error;
  }
};

export const useProjectsSummaryQuery = () => {
  return useQuery({
    queryKey: QUERY_KEYS.projectsSummary,
    queryFn: fetchProjectsSummary,
    staleTime: 30 * 1000, // 30 seconds - shorter than default for more frequent updates
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter garbage collection for memory efficiency
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};