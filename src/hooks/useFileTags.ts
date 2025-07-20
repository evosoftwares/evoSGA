import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FileTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  owner_id: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

interface FileTagRelation {
  id: string;
  file_id: string;
  tag_id: string;
  created_at: string;
}

interface CreateTagData {
  name: string;
  color: string;
  description?: string;
  project_id?: string;
}

interface UpdateTagData {
  name?: string;
  color?: string;
  description?: string;
}

export const useFileTags = (projectId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all tags for the current user/project
  const {
    data: tags = [],
    isLoading: isLoadingTags,
    error: tagsError
  } = useQuery({
    queryKey: ['file-tags', user?.id, projectId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      let query = supabase
        .from('file_tags')
        .select('*')
        .eq('owner_id', user.id)
        .order('name');

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        query = query.is('project_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FileTag[];
    },
    enabled: !!user?.id,
  });

  // Fetch tag relations for a specific file
  const useFileTagRelations = (fileId: string) => {
    return useQuery({
      queryKey: ['file-tag-relations', fileId],
      queryFn: async () => {
        if (!fileId) return [];

        const { data, error } = await supabase
          .from('file_tag_relations')
          .select(`
            *,
            file_tags (
              id,
              name,
              color,
              description
            )
          `)
          .eq('file_id', fileId);

        if (error) throw error;
        return data as (FileTagRelation & { file_tags: FileTag })[];
      },
      enabled: !!fileId,
    });
  };

  // Create a new tag
  const createTagMutation = useMutation({
    mutationFn: async (tagData: CreateTagData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('file_tags')
        .insert({
          ...tagData,
          owner_id: user.id,
          project_id: tagData.project_id || null
        })
        .select()
        .single();

      if (error) throw error;
      return data as FileTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-tags'] });
    },
  });

  // Update a tag
  const updateTagMutation = useMutation({
    mutationFn: async ({ tagId, updates }: { tagId: string; updates: UpdateTagData }) => {
      const { data, error } = await supabase
        .from('file_tags')
        .update(updates)
        .eq('id', tagId)
        .eq('owner_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data as FileTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-tags'] });
    },
  });

  // Delete a tag
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('file_tags')
        .delete()
        .eq('id', tagId)
        .eq('owner_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-tags'] });
      queryClient.invalidateQueries({ queryKey: ['file-tag-relations'] });
    },
  });

  // Add tag to file
  const addTagToFileMutation = useMutation({
    mutationFn: async ({ fileId, tagId }: { fileId: string; tagId: string }) => {
      const { data, error } = await supabase
        .from('file_tag_relations')
        .insert({
          file_id: fileId,
          tag_id: tagId
        })
        .select()
        .single();

      if (error) throw error;
      return data as FileTagRelation;
    },
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: ['file-tag-relations', fileId] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  // Remove tag from file
  const removeTagFromFileMutation = useMutation({
    mutationFn: async ({ fileId, tagId }: { fileId: string; tagId: string }) => {
      const { error } = await supabase
        .from('file_tag_relations')
        .delete()
        .eq('file_id', fileId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: ['file-tag-relations', fileId] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  // Update file tags (replace all tags for a file)
  const updateFileTagsMutation = useMutation({
    mutationFn: async ({ fileId, tagIds }: { fileId: string; tagIds: string[] }) => {
      // First, remove all existing tags for this file
      const { error: deleteError } = await supabase
        .from('file_tag_relations')
        .delete()
        .eq('file_id', fileId);

      if (deleteError) throw deleteError;

      // Then, add the new tags
      if (tagIds.length > 0) {
        const relations = tagIds.map(tagId => ({
          file_id: fileId,
          tag_id: tagId
        }));

        const { error: insertError } = await supabase
          .from('file_tag_relations')
          .insert(relations);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: ['file-tag-relations', fileId] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  // Get tags statistics
  const useTagsStats = () => {
    return useQuery({
      queryKey: ['tags-stats', user?.id, projectId],
      queryFn: async () => {
        if (!user?.id) throw new Error('User not authenticated');

        // Get tag usage counts
        const { data, error } = await supabase
          .from('file_tag_relations')
          .select(`
            tag_id,
            file_tags!inner (
              id,
              name,
              color,
              owner_id,
              project_id
            )
          `)
          .eq('file_tags.owner_id', user.id);

        if (error) throw error;

        // Count usage per tag
        const tagCounts = data.reduce((acc, relation) => {
          const tag = relation.file_tags as unknown as FileTag;
          if (projectId ? tag.project_id === projectId : !tag.project_id) {
            acc[tag.id] = (acc[tag.id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        return tagCounts;
      },
      enabled: !!user?.id,
    });
  };

  return {
    // Data
    tags,
    isLoadingTags,
    tagsError,

    // Hooks
    useFileTagRelations,
    useTagsStats,

    // Mutations
    createTag: createTagMutation.mutateAsync,
    updateTag: updateTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,
    addTagToFile: addTagToFileMutation.mutateAsync,
    removeTagFromFile: removeTagFromFileMutation.mutateAsync,
    updateFileTags: updateFileTagsMutation.mutateAsync,

    // Loading states
    isCreatingTag: createTagMutation.isPending,
    isUpdatingTag: updateTagMutation.isPending,
    isDeletingTag: deleteTagMutation.isPending,
    isUpdatingFileTags: updateFileTagsMutation.isPending,
  };
};