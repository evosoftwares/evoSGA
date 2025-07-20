import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectContext } from '@/contexts/ProjectContext';

export const useFilesRealTime = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedProjectId } = useProjectContext();

  const handleFilesChange = useCallback((payload: any) => {
    console.log('🔥 [REAL-TIME] Files table change:', payload);
    
    // More targeted invalidation for better performance
    queryClient.invalidateQueries({ queryKey: ['files', selectedProjectId] });
    queryClient.invalidateQueries({ queryKey: ['recent-files', selectedProjectId] });
    queryClient.invalidateQueries({ queryKey: ['storage-usage', user.id] });
    queryClient.invalidateQueries({ queryKey: ['file-stats', user.id, selectedProjectId] });
  }, [queryClient, selectedProjectId, user.id]);

  const handleFoldersChange = useCallback((payload: any) => {
    console.log('🔥 [REAL-TIME] Folders table change:', payload);
    
    // More targeted invalidation for better performance
    queryClient.invalidateQueries({ queryKey: ['folders', selectedProjectId] });
    queryClient.invalidateQueries({ queryKey: ['file-stats', user.id, selectedProjectId] });
  }, [queryClient, selectedProjectId]);

  useEffect(() => {
    if (!user) return;

    console.log('🔥 [FILES-REAL-TIME] Setting up subscriptions for files system');

    // Subscribe to files changes
    const filesChannel = supabase
      .channel('files-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `owner_id=eq.${user.id}`,
        },
        handleFilesChange
      )
      .subscribe();

    // Subscribe to folders changes
    const foldersChannel = supabase
      .channel('folders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `owner_id=eq.${user.id}`,
        },
        handleFoldersChange
      )
      .subscribe();

    return () => {
      console.log('🔥 [FILES-REAL-TIME] Cleaning up subscriptions');
      try {
        supabase.removeChannel(filesChannel);
        supabase.removeChannel(foldersChannel);
      } catch (error) {
        console.warn('Error cleaning up channels:', error);
      }
    };
  }, [user, selectedProjectId, handleFilesChange, handleFoldersChange]);
};