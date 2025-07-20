import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileService, type FileItem, type FolderItem, type FileUploadOptions } from '@/services/fileService';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectContext } from '@/contexts/ProjectContext';

interface FileUpload {
  file: File;
  folderId?: string;
  tags?: string[];
  description?: string;
}

interface UseFileManagementOptions {
  folderId?: string;
  searchQuery?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: string[];
}

export const useFileManagement = (options: UseFileManagementOptions = {}) => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedProjectId } = useProjectContext();

  // Fetch files query
  const {
    data: filesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['files', selectedProjectId, options],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      return await fileService.getFiles({
        folderId: options.folderId,
        projectId: selectedProjectId || undefined,
        search: options.searchQuery,
        fileType: options.filters?.[0], // Use first filter as file type
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
      });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const files = filesData?.files || [];
  const totalCount = filesData?.count || 0;

  // Fetch folders query
  const {
    data: folders = [],
    isLoading: foldersLoading,
  } = useQuery({
    queryKey: ['folders', selectedProjectId, options.folderId],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      return await fileService.getFolders({
        parentId: options.folderId,
        projectId: selectedProjectId || undefined,
      });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch recent files
  const {
    data: recentFiles = [],
    isLoading: recentLoading,
  } = useQuery({
    queryKey: ['recent-files', selectedProjectId],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      return await fileService.getRecentFiles(10);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch storage usage
  const {
    data: storageUsage,
    isLoading: storageLoading,
  } = useQuery({
    queryKey: ['storage-usage', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      return await fileService.getStorageUsage();
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Upload files mutation
  const uploadMutation = useMutation({
    mutationFn: async (uploads: FileUpload[]) => {
      const uploadPromises = uploads.map(async (upload, index) => {
        const uploadId = `upload-${Date.now()}-${index}`;
        
        try {
          // Simulate progress updates
          setUploadProgress(prev => ({ ...prev, [uploadId]: 20 }));
          
          const uploadOptions: FileUploadOptions = {
            folderId: upload.folderId,
            projectId: selectedProjectId || undefined,
            description: upload.description,
            tags: upload.tags,
          };
          
          setUploadProgress(prev => ({ ...prev, [uploadId]: 60 }));
          
          const result = await fileService.uploadFile(upload.file, uploadOptions);
          
          setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));
          
          return result;
        } catch (error) {
          setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
          throw error;
        }
      });

      return Promise.all(uploadPromises);
    },
    onSuccess: () => {
      // More targeted invalidation for better performance
      queryClient.invalidateQueries({ queryKey: ['files', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['recent-files', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage', user?.id] });
      setUploadProgress({});
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      setUploadProgress({});
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await fileService.deleteFile(fileId);
      return fileId;
    },
    onSuccess: (fileId) => {
      // More targeted invalidation
      queryClient.invalidateQueries({ queryKey: ['files', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['recent-files', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage', user?.id] });

      // Optimistic UI update
      queryClient.setQueryData(['files', selectedProjectId, options], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          files: oldData.files.filter((file: FileItem) => file.id !== fileId),
        };
      });
    },
  });

  // Rename file mutation
  const renameMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: string; newName: string }) => {
      return await fileService.updateFile(fileId, { name: newName });
    },
    onSuccess: (updatedFile) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['recent-files'] });

      // Otimista UI update
      queryClient.setQueryData(['files', selectedProjectId, options], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          files: oldData.files.map((file: FileItem) => 
            file.id === updatedFile.id ? updatedFile : file
          ),
        };
      });
    },
  });

  // Star/Unstar file mutation
  const starMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return await fileService.toggleStar(fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['recent-files'] });
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: {
      name: string;
      description?: string;
      color: string;
      parentId?: string;
    }) => {
      // Validações de segurança
      if (!folderData.name?.trim()) {
        throw new Error('Nome da pasta é obrigatório');
      }
      
      if (folderData.name.trim().length < 2) {
        throw new Error('Nome deve ter pelo menos 2 caracteres');
      }
      
      if (folderData.name.trim().length > 50) {
        throw new Error('Nome deve ter no máximo 50 caracteres');
      }
      
      if (folderData.description && folderData.description.length > 200) {
        throw new Error('Descrição deve ter no máximo 200 caracteres');
      }

      // Verificar se pasta com mesmo nome já existe no diretório pai
      const existingFolders = await fileService.getFolders({
        parentId: folderData.parentId,
        projectId: selectedProjectId || undefined,
      });
      
      const duplicateName = existingFolders.some(
        folder => folder.name.toLowerCase() === folderData.name.trim().toLowerCase()
      );
      
      if (duplicateName) {
        throw new Error('Já existe uma pasta com este nome neste local');
      }

      // Operação atômica de criação
      return await fileService.createFolder({
        ...folderData,
        name: folderData.name.trim(),
        description: folderData.description?.trim(),
        projectId: selectedProjectId || undefined,
      });
    },
    onSuccess: (newFolder) => {
      // More targeted invalidation
      queryClient.invalidateQueries({ queryKey: ['folders', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['files', selectedProjectId] });

      // Optimistic UI update - add new folder to cache
      queryClient.setQueryData(['folders', selectedProjectId, options.folderId], (oldData: FolderItem[] = []) => {
        return [...oldData, newFolder];
      });
    },
    onError: (error) => {
      console.error('Erro ao criar pasta:', error);
      // O erro será propagado para o componente
    },
  });

  // Convenience methods
  const uploadFiles = useCallback(async (fileList: FileList, folderId?: string) => {
    const uploads: FileUpload[] = Array.from(fileList).map(file => ({
      file,
      folderId,
    }));
    
    return uploadMutation.mutateAsync(uploads);
  }, [uploadMutation]);

  const deleteFile = useCallback(async (fileId: string) => {
    return deleteMutation.mutateAsync(fileId);
  }, [deleteMutation]);

  const renameFile = useCallback(async (fileId: string, newName: string) => {
    return renameMutation.mutateAsync({ fileId, newName });
  }, [renameMutation]);

  const toggleStar = useCallback(async (fileId: string) => {
    return starMutation.mutateAsync(fileId);
  }, [starMutation]);

  const createFolder = useCallback(async (folderData: {
    name: string;
    description?: string;
    color: string;
    parentId?: string;
  }) => {
    return createFolderMutation.mutateAsync(folderData);
  }, [createFolderMutation]);

  const getFileUrl = useCallback(async (storagePath: string) => {
    return await fileService.getFileUrl(storagePath);
  }, []);

  return {
    // Data
    files,
    folders,
    recentFiles,
    storageUsage,
    uploadProgress,
    totalCount,
    
    // States
    isLoading: isLoading || foldersLoading,
    isLoadingRecent: recentLoading,
    isLoadingStorage: storageLoading,
    error,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRenaming: renameMutation.isPending,
    isCreatingFolder: createFolderMutation.isPending,
    
    // Actions
    uploadFiles,
    deleteFile,
    renameFile,
    toggleStar,
    createFolder,
    getFileUrl,
    refetch,
  };
};

export default useFileManagement;