
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn, Task, Profile, Tag, TaskTag } from '@/types/database';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useKanbanDataFetch');

export const useKanbanDataFetch = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchAllData = useCallback(async (selectedProjectId?: string | null) => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      logger.debug('Fetch already in progress, skipping');
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isFetchingRef.current) {
        logger.error('Fetch timeout - forcing completion');
        isFetchingRef.current = false;
        setLoading(false);
        setError('Timeout ao carregar dados');
      }
    }, 5000); // 5 second timeout
    
    try {
      logger.info('Starting data fetch...');
      
      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('position');

      if (columnsError) throw columnsError;
      setColumns(columnsData || []);

      // Fetch tasks with project filter
      let tasksQuery = supabase
        .from('tasks')
        .select('*')
        .order('position');

      if (selectedProjectId) {
        tasksQuery = tasksQuery.eq('project_id', selectedProjectId);
      }

      const { data: tasksData, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;
      
      // Converter os dados para o formato correto
      const convertedTasks = (tasksData || []).map(task => ({
        ...task,
        function_points: task.function_points || 0,
        complexity: task.complexity || 'medium',
        status_image_filenames: task.status_image_filenames || []
      }));
      
      setTasks(convertedTasks);

      // Fetch profiles (users) instead of team_members
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (tagsError) throw tagsError;
      setTags(tagsData || []);

      // Fetch task tags
      const { data: taskTagsData, error: taskTagsError } = await supabase
        .from('task_tags')
        .select('*');

      if (taskTagsError) throw taskTagsError;
      setTaskTags(taskTagsData || []);

      logger.info('Data loaded successfully', {
        columns: columnsData?.length,
        tasks: convertedTasks?.length,
        profiles: profilesData?.length,
        tags: tagsData?.length,
        taskTags: taskTagsData?.length
      });

    } catch (err: any) {
      logger.error('Error fetching data', err);
      setError(err.message);
    } finally {
      clearTimeout(timeoutId);
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  return {
    columns,
    tasks,
    profiles,
    tags,
    taskTags,
    loading,
    error,
    fetchAllData,
    setTasks,
    setColumns,
    setProfiles,
    setTags,
    setTaskTags
  };
};
