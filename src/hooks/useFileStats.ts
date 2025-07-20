import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectContext } from '@/contexts/ProjectContext';

export interface FileStats {
  totalFiles: number;
  totalFolders: number;
  starredFiles: number;
  recentFiles: number;
  filesByType: {
    image: number;
    document: number;
    video: number;
    audio: number;
    archive: number;
    other: number;
  };
  publicFiles: number;
}

export const useFileStats = () => {
  const { user } = useAuth();
  const { selectedProjectId } = useProjectContext();

  return useQuery({
    queryKey: ['file-stats', user?.id, selectedProjectId],
    queryFn: async (): Promise<FileStats> => {
      if (!user) throw new Error('User not authenticated');

      // Build base query
      let filesQuery = supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      // Add project filter if specified
      if (selectedProjectId) {
        filesQuery = filesQuery.eq('project_id', selectedProjectId);
      } else {
        filesQuery = filesQuery.is('project_id', null);
      }

      // Get total files count
      const { count: totalFiles, error: filesError } = await filesQuery;
      
      if (filesError) {
        console.error('Error fetching files count:', filesError);
      }

      // Build folders query
      let foldersQuery = supabase
        .from('folders')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      if (selectedProjectId) {
        foldersQuery = foldersQuery.eq('project_id', selectedProjectId);
      } else {
        foldersQuery = foldersQuery.is('project_id', null);
      }

      // Get total folders count  
      const { count: totalFolders, error: foldersError } = await foldersQuery;
      
      if (foldersError) {
        console.error('Error fetching folders count:', foldersError);
      }

      // Build starred files query
      let starredQuery = supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('is_starred', true);

      if (selectedProjectId) {
        starredQuery = starredQuery.eq('project_id', selectedProjectId);
      } else {
        starredQuery = starredQuery.is('project_id', null);
      }

      // Get starred files count
      const { count: starredFiles, error: starredError } = await starredQuery;
      
      if (starredError) {
        console.error('Error fetching starred files:', starredError);
      }

      // Get recent files (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      let recentQuery = supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      if (selectedProjectId) {
        recentQuery = recentQuery.eq('project_id', selectedProjectId);
      } else {
        recentQuery = recentQuery.is('project_id', null);
      }
      
      const { count: recentFiles, error: recentError } = await recentQuery;
      
      if (recentError) {
        console.error('Error fetching recent files:', recentError);
      }

      // Build public files query
      let publicQuery = supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('is_public', true);

      if (selectedProjectId) {
        publicQuery = publicQuery.eq('project_id', selectedProjectId);
      } else {
        publicQuery = publicQuery.is('project_id', null);
      }

      // Get public files count
      const { count: publicFiles, error: publicError } = await publicQuery;
      
      if (publicError) {
        console.error('Error fetching public files:', publicError);
      }

      // Build file types query
      let typesQuery = supabase
        .from('files')
        .select('file_type')
        .eq('owner_id', user.id);

      if (selectedProjectId) {
        typesQuery = typesQuery.eq('project_id', selectedProjectId);
      } else {
        typesQuery = typesQuery.is('project_id', null);
      }

      // Get files by type
      const { data: fileTypesData, error: typesError } = await typesQuery;
      
      if (typesError) {
        console.error('Error fetching file types:', typesError);
      }

      const filesByType = {
        image: 0,
        document: 0,
        video: 0,
        audio: 0,
        archive: 0,
        other: 0,
      };

      fileTypesData?.forEach(file => {
        const type = file.file_type as keyof typeof filesByType;
        if (filesByType[type] !== undefined) {
          filesByType[type]++;
        } else {
          filesByType.other++;
        }
      });

      return {
        totalFiles: totalFiles || 0,
        totalFolders: totalFolders || 0,
        starredFiles: starredFiles || 0,
        recentFiles: recentFiles || 0,
        filesByType,
        publicFiles: publicFiles || 0,
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};