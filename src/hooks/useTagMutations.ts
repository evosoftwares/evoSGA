
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { QUERY_KEYS } from '@/lib/queryClient';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TAG');

export const useTagMutations = (projectId?: string | null) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateTagsCache = useCallback(() => {
    // Invalidate all queries that depend on tags
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['taskTags'] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(projectId) });
    queryClient.invalidateQueries({ queryKey: ['kanban'] }); // Invalidate all kanban queries
    queryClient.invalidateQueries({ queryKey: ['referenceData'] });
  }, [queryClient, projectId]);

  const createTag = useCallback(async (name: string, color: string) => {
    logger.info('Starting tag creation', { name, color, user: user?.id });
    
    if (!user) {
      logger.error('No user found');
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      logger.debug('Calling Supabase insert');
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: name.trim(), color })
        .select()
        .single();

      if (error) {
        logger.error('Supabase error', error);
        throw error;
      }

      logger.info('Tag creation success', data);

      // Activity logging removed

      toast({
        title: 'Sucesso',
        description: 'Etiqueta criada com sucesso!',
        className: 'bg-green-50 border-green-200 text-green-900'
      });

      // Real-time subscription will handle cache invalidation
      // invalidateTagsCache(); // Removed to avoid duplicate fetches

      return data;
    } catch (error: any) {
      logger.error('Tag creation error', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, invalidateTagsCache]);

  const updateTag = useCallback(async (tagId: string, name: string, color: string) => {
    logger.info('Starting tag update', { tagId, name, color, user: user?.id });
    
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      // Get old data for logging
      const { data: oldData } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single();

      const { data, error } = await supabase
        .from('tags')
        .update({ name: name.trim(), color })
        .eq('id', tagId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Tag update success', data);

      // Activity logging removed

      toast({
        title: 'Sucesso',
        description: 'Etiqueta atualizada com sucesso!',
        className: 'bg-blue-50 border-blue-200 text-blue-900'
      });

      // Real-time subscription will handle cache invalidation
      // invalidateTagsCache(); // Removed to avoid duplicate fetches

      return data;
    } catch (error: any) {
      logger.error('Tag update error', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, invalidateTagsCache]);

  const deleteTag = useCallback(async (tagId: string) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    try {
      // Get old data for logging
      const { data: oldData } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single();

      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      // Activity logging removed

      toast({
        title: 'Sucesso',
        description: 'Etiqueta removida com sucesso!',
        className: 'bg-red-50 border-red-200 text-red-900'
      });

      // Real-time subscription will handle cache invalidation
      // invalidateTagsCache(); // Removed to avoid duplicate fetches
    } catch (error: any) {
      logger.error('Tag delete error', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover etiqueta',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, invalidateTagsCache]);

  const addTagToTask = useCallback(async (taskId: string, tagId: string) => {
    logger.info('Starting add tag to task', { taskId, tagId, user: user?.id });
    
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    // Optimistic update - immediately update cache
    const tempId = `temp-${Date.now()}`;
    const optimisticData = { id: tempId, task_id: taskId, tag_id: tagId };
    
    queryClient.setQueryData(QUERY_KEYS.kanban(projectId), (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        taskTags: [...(oldData.taskTags || []), optimisticData]
      };
    });

    try {
      const { data, error } = await supabase
        .from('task_tags')
        .insert({ task_id: taskId, tag_id: tagId })
        .select()
        .single();

      if (error) {
        // Revert optimistic update on error
        queryClient.setQueryData(QUERY_KEYS.kanban(projectId), (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            taskTags: oldData.taskTags.filter((tt: any) => tt.id !== tempId)
          };
        });
        
        // Check if it's a duplicate key error
        if (error.message?.includes('duplicate key') || error.code === '23505') {
          logger.debug('Tag already assigned, ignoring');
          return;
        }
        throw error;
      }

      // Replace optimistic data with real data
      queryClient.setQueryData(QUERY_KEYS.kanban(projectId), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          taskTags: oldData.taskTags.map((tt: any) => tt.id === tempId ? data : tt)
        };
      });

      logger.info('Add tag to task success', data);
      return data;
    } catch (error: any) {
      logger.error('Add tag to task error', error);
      toast({
        title: 'Erro',
        description: 'Falha ao adicionar etiqueta à tarefa',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, invalidateTagsCache]);

  const removeTagFromTask = useCallback(async (taskId: string, tagId: string) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    // Optimistic update - immediately remove from cache
    let removedItem: any = null;
    queryClient.setQueryData(QUERY_KEYS.kanban(projectId), (oldData: any) => {
      if (!oldData) return oldData;
      removedItem = oldData.taskTags.find((tt: any) => tt.task_id === taskId && tt.tag_id === tagId);
      return {
        ...oldData,
        taskTags: oldData.taskTags.filter((tt: any) => !(tt.task_id === taskId && tt.tag_id === tagId))
      };
    });

    try {
      const { error } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', taskId)
        .eq('tag_id', tagId);

      if (error) {
        // Revert optimistic update on error
        if (removedItem) {
          queryClient.setQueryData(QUERY_KEYS.kanban(projectId), (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              taskTags: [...(oldData.taskTags || []), removedItem]
            };
          });
        }
        throw error;
      }
    } catch (error: any) {
      logger.error('Remove tag from task error', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover etiqueta da tarefa',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, toast, invalidateTagsCache]);

  return {
    createTag,
    updateTag,
    deleteTag,
    addTagToTask,
    removeTagFromTask
  };
};
