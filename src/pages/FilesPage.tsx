import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Plus, Upload, FolderOpen, File, Image, FileText, Video, Music, Archive, Star, Clock, Share2, Folder } from 'lucide-react';
import FileUploadModal from '@/components/files/FileUploadModal';
import FileCard from '@/components/files/FileCard';
import FileBreadcrumb from '@/components/files/FileBreadcrumb';
import FileSearch from '@/components/files/FileSearch';
import FilePreviewModal from '@/components/files/FilePreviewModal';
import DeleteConfirmationModal from '@/components/files/DeleteConfirmationModal';
import RenameModal from '@/components/files/RenameModal';
import CreateFolderModal from '@/components/files/CreateFolderModal';
import StorageUsage from '@/components/files/StorageUsage';
import useFileManagement from '@/hooks/useFileManagement';
import { useFilesRealTime } from '@/hooks/useFilesRealTime';
import { useFileStats } from '@/hooks/useFileStats';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DisplayFileItem {
  id: string;
  name: string;
  type: 'folder' | 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other';
  size?: string;
  modified: string;
  owner: {
    name: string;
    avatar?: string;
    initials: string;
  };
  tag?: string;
  preview?: string;
  isStarred?: boolean;
  storagePath?: string; // Adicionado para armazenar o caminho do Supabase Storage
  rawUpdatedAt?: string; // Raw date for sorting
  rawSizeBytes?: number; // Raw size for sorting
}

const FilesPage = () => {
  const [selectedFile, setSelectedFile] = useState<DisplayFileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('storage');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DisplayFileItem | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<DisplayFileItem | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('name');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>(['Armazenamento']);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderPathMap, setFolderPathMap] = useState<Record<string, string[]>>({});
  const [isNavigatingFromHistory, setIsNavigatingFromHistory] = useState(false);

  // Setup real-time subscriptions for files and folders
  useFilesRealTime();

  // Handle browser navigation (back/forward buttons)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.filesPage) {
        const { path, folderId } = event.state.filesPage;
        setIsNavigatingFromHistory(true);
        setCurrentPath(path);
        setCurrentFolderId(folderId);
        
        // Update folder path map if needed
        if (folderId && path.length > 1) {
          setFolderPathMap(prev => ({
            ...prev,
            [folderId]: path
          }));
        }
        
        // Reset flag after state update
        setTimeout(() => setIsNavigatingFromHistory(false), 0);
      } else {
        // If no state, go back to root
        setIsNavigatingFromHistory(true);
        setCurrentPath(['Armazenamento']);
        setCurrentFolderId(undefined);
        setTimeout(() => setIsNavigatingFromHistory(false), 0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Update browser history when path changes (but not when navigating from history)
  const updateBrowserHistory = useCallback((newPath: string[], newFolderId?: string) => {
    if (!isNavigatingFromHistory) {
      window.history.pushState(
        { filesPage: { path: newPath, folderId: newFolderId } },
        '',
        window.location.pathname
      );
    }
  }, [isNavigatingFromHistory]);

  // Set initial browser state
  useEffect(() => {
    if (!window.history.state || !window.history.state.filesPage) {
      window.history.replaceState(
        { filesPage: { path: currentPath, folderId: currentFolderId } }, 
        '', 
        window.location.pathname
      );
    }
  }, []);

  // Get file statistics for dynamic sidebar
  const { data: fileStats, isLoading: statsLoading } = useFileStats();

  // Use real file management hook
  const {
    files,
    folders,
    recentFiles,
    storageUsage,
    isLoading,
    isLoadingRecent,
    isLoadingStorage,
    uploadFiles,
    deleteFile,
    renameFile,
    toggleStar,
    createFolder,
    getFileUrl,
  } = useFileManagement({
    folderId: currentFolderId,
    searchQuery,
    sortBy,
    sortOrder: sortBy === 'modified' ? 'desc' : 'asc',
    filters: activeFilters,
  });

  // Dynamic categories based on file stats
  const categories = useMemo(() => {
    // Always show basic categories, all at the same level
    const baseCategories = [
      { 
        id: 'storage', 
        name: 'Armazenamento', 
        icon: FolderOpen, 
        count: fileStats ? fileStats.totalFiles + fileStats.totalFolders : undefined 
      },
    ];

    // Only add file type categories if there are files of that type
    if (fileStats?.filesByType) {
      const typeCategories = [
        { 
          id: 'images', 
          name: 'Imagens', 
          icon: Image, 
          count: fileStats.filesByType.image,
          filterType: 'image' as const,
          isSubItem: true 
        },
        { 
          id: 'documents', 
          name: 'Documentos', 
          icon: FileText, 
          count: fileStats.filesByType.document,
          filterType: 'document' as const,
          isSubItem: true 
        },
        { 
          id: 'videos', 
          name: 'Vídeos', 
          icon: Video, 
          count: fileStats.filesByType.video,
          filterType: 'video' as const,
          isSubItem: true 
        },
        { 
          id: 'audio', 
          name: 'Áudio', 
          icon: Music, 
          count: fileStats.filesByType.audio,
          filterType: 'audio' as const,
          isSubItem: true 
        },
        { 
          id: 'archives', 
          name: 'Arquivos', 
          icon: Archive, 
          count: fileStats.filesByType.archive,
          filterType: 'archive' as const,
          isSubItem: true 
        },
      ].filter(cat => cat.count && cat.count > 0); // Only show categories with files

      return [...baseCategories, ...typeCategories];
    }

    return baseCategories;
  }, [fileStats]);

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'há alguns minutos';
    if (diffInHours < 24) return `há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('pt-BR');
  };

  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPreviewForFileType = (type: string): string => {
    const previews = {
      image: 'bg-gradient-to-br from-green-400 to-green-600',
      document: 'bg-gradient-to-br from-red-400 to-red-600',
      video: 'bg-gradient-to-br from-purple-400 to-purple-600',
      audio: 'bg-gradient-to-br from-orange-400 to-orange-600',
      archive: 'bg-gradient-to-br from-gray-400 to-gray-600',
      other: 'bg-gradient-to-br from-blue-400 to-blue-600',
    };
    return previews[type as keyof typeof previews] || previews.other;
  };


  const getFolderPreview = (color: string): string => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      yellow: 'bg-yellow-500',
      gray: 'bg-gray-500',
    };
    return colorMap[color] || colorMap.blue;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'folder': return FolderOpen;
      case 'image': return Image;
      case 'document': return FileText;
      case 'video': return Video;
      case 'audio': return Music;
      case 'archive': return Archive;
      default: return File;
    }
  };

  const getFileColor = (type: string) => {
    switch (type) {
      case 'folder': return 'text-blue-500';
      case 'image': return 'text-green-500';
      case 'document': return 'text-red-500';
      case 'video': return 'text-purple-500';
      case 'audio': return 'text-orange-500';
      case 'archive': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  // Transform Supabase data to display format
  

  const transformedFiles: DisplayFileItem[] = useMemo(() => {
    // Ensure we have arrays to work with
    const safeFolders = folders || [];
    const safeFiles = files || [];
    let allItems = [...safeFolders, ...safeFiles];
    
    // Filter based on active category
    const category = categories.find(cat => cat.id === activeCategory);
    
    if (activeCategory === 'storage') {
      // Show everything (folders + files) for storage
      allItems = [...safeFolders, ...safeFiles];
    } else if (category && 'filterType' in category) {
      // Show files by type
      allItems = safeFiles.filter(file => file.file_type === category.filterType);
    } else {
      // Default: show everything
      allItems = [...safeFolders, ...safeFiles];
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      allItems = allItems.filter(item => {
        return item.name.toLowerCase().includes(query);
      });
    }
    
    // Transform to display format
    let transformedItems = allItems.map(item => {
      if ('color' in item) {
        // It's a folder
        return {
          id: item.id,
          name: item.name,
          type: 'folder' as const,
          modified: formatDate(item.updated_at),
          owner: {
            name: 'Usuário',
            initials: 'US',
          },
          preview: getFolderPreview(item.color),
          rawUpdatedAt: item.updated_at,
          rawSizeBytes: 0, // Folders have no size
        };
      } else {
        // It's a file
        return {
          id: item.id,
          name: item.name,
          type: item.file_type,
          size: formatFileSize(item.size_bytes),
          modified: formatDate(item.updated_at),
          owner: {
            name: 'Usuário',
            initials: 'US',
          },
          tag: item.tags?.[0]?.name,
          preview: getPreviewForFileType(item.file_type),
          isStarred: item.is_starred,
          storagePath: item.storage_path,
          rawUpdatedAt: item.updated_at,
          rawSizeBytes: item.size_bytes,
        };
      }
    });
    
    // Apply activeFilters filtering
    if (activeFilters.length > 0) {
      transformedItems = transformedItems.filter(item => {
        // Check if any active filter matches
        return activeFilters.some(filter => {
          if (filter === 'starred') {
            return item.isStarred === true;
          }
          return item.type === filter;
        });
      });
    }
    
    // Apply sorting
    transformedItems.sort((a, b) => {
      // Always put folders first unless sorting by type
      if (sortBy !== 'type') {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
      }
      
      // Then sort by the selected criteria
      switch (sortBy) {
        case 'name':
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        
        case 'modified': {
          const dateA = new Date(a.rawUpdatedAt || a.modified);
          const dateB = new Date(b.rawUpdatedAt || b.modified);
          return dateB.getTime() - dateA.getTime(); // Newest first
        }
        
        case 'size':
          // Only files have size, folders are always 0
          if (a.type === 'folder' && b.type === 'folder') {
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          }
          if (a.type === 'folder') return -1;
          if (b.type === 'folder') return 1;
          return (b.rawSizeBytes || 0) - (a.rawSizeBytes || 0); // Largest first
        
        case 'type':
          if (a.type === b.type) {
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          }
          return a.type.localeCompare(b.type);
        
        default:
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }
    });
    
    // Debug info (comment out in production)
    // console.log('Transformed items:', transformedItems.length, 'Filters:', activeFilters, 'Sort:', sortBy);
    
    return transformedItems;
  }, [folders, files, activeCategory, categories, searchQuery, activeFilters, sortBy]);

  const handleUpload = async (fileList: FileList) => {
    try {
      await uploadFiles(fileList, currentFolderId);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleFileAction = async (action: string, fileId: string) => {
    const file = transformedFiles.find(f => f.id === fileId);
    
    try {
      switch (action) {
        case 'preview':
          if (file) {
            setSelectedFile(file);
            setIsPreviewModalOpen(true);
          }
          break;
        case 'download':
          // Implement download logic
          console.log('Downloading file:', fileId);
          break;
        case 'share':
          console.log('Sharing file:', fileId);
          break;
        case 'star':
          await toggleStar(fileId);
          break;
        case 'rename': {
          if (file) {
            setFileToRename(file);
            setIsRenameModalOpen(true);
          }
          break;
        }
        case 'delete':
          if (file) {
            setFileToDelete(file);
            setIsDeleteModalOpen(true);
          }
          break;
        case 'open':
          if (file?.type === 'folder') {
            const newPath = [...currentPath, file.name];
            setCurrentFolderId(fileId);
            setCurrentPath(newPath);
            setFolderPathMap(prev => ({
              ...prev,
              [fileId]: newPath
            }));
            updateBrowserHistory(newPath, fileId);
          }
          break;
        default:
          console.log('File action:', action, 'for file:', fileId);
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleCreateFolder = async (folderData: {
    name: string;
    description?: string;
    color: string;
    parentId?: string;
  }) => {
    try {
      await createFolder({
        ...folderData,
        parentId: currentFolderId,
      });
    } catch (error) {
      console.error('Create folder failed:', error);
    }
  };

  const breadcrumbItems = [
    { id: '1', name: 'Início', path: '/', type: 'root' as const },
    ...currentPath.map((pathName, index) => ({
      id: (index + 2).toString(),
      name: pathName,
      path: `/${currentPath.slice(0, index + 1).join('/')}`,
      type: index === currentPath.length - 1 ? 'current' as const : 'folder' as const,
    })),
  ];


  const handleBreadcrumbNavigate = (path: string) => {
    // Navigate to root
    if (path === '/') {
      const newPath = ['Armazenamento'];
      const newFolderId = undefined;
      setCurrentFolderId(newFolderId);
      setCurrentPath(newPath);
      updateBrowserHistory(newPath, newFolderId);
      return;
    }

    // Navigate to specific path
    const pathParts = path.split('/').filter(Boolean);
    const targetIndex = pathParts.length;
    
    if (targetIndex > 0 && targetIndex <= currentPath.length) {
      const newPath = currentPath.slice(0, targetIndex);
      
      // Reset to root folder when navigating to "Armazenamento"
      if (newPath.length === 1 && newPath[0] === 'Armazenamento') {
        const newFolderId = undefined;
        setCurrentFolderId(newFolderId);
        setCurrentPath(newPath);
        updateBrowserHistory(newPath, newFolderId);
      } else {
        // Find the folder ID for this path
        const folderEntry = Object.entries(folderPathMap).find(([, folderPath]) => 
          folderPath.join('/') === newPath.join('/')
        );
        
        if (folderEntry) {
          const newFolderId = folderEntry[0];
          setCurrentFolderId(newFolderId);
          setCurrentPath(newPath);
          updateBrowserHistory(newPath, newFolderId);
        } else {
          // If we can't find the folder ID, reset to root
          const defaultPath = ['Armazenamento'];
          const defaultFolderId = undefined;
          setCurrentFolderId(defaultFolderId);
          setCurrentPath(defaultPath);
          updateBrowserHistory(defaultPath, defaultFolderId);
        }
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="w-full p-2 sm:p-3 md:p-4 lg:p-6 flex-1">
        <div className="flex flex-col lg:flex-row min-h-0 flex-1 bg-white rounded-lg">
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden bg-white border-b border-gray-200 p-3 sm:p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">frame.box</h2>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateFolderModalOpen(true)}
                  className="p-2"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 p-2"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>


          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Desktop Content Header - Hidden on mobile */}
            <div className="hidden lg:block bg-white border-b border-gray-200 p-4 lg:p-5 xl:p-6 flex-shrink-0">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 xl:gap-4">
                <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                  <FolderOpen className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400 flex-shrink-0" />
                  <h1 className="text-lg lg:text-xl font-semibold text-gray-900 truncate">
                    {categories.find(c => c.id === activeCategory)?.name || 'Armazenamento'}
                  </h1>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Pesquisar aqui..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full sm:w-48 lg:w-56 xl:w-64"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setIsCreateFolderModalOpen(true)}
                      className="flex-1 sm:flex-initial whitespace-nowrap"
                    >
                      <FolderOpen className="w-4 h-4 lg:mr-2" />
                      <span className="hidden lg:inline">Nova Pasta</span>
                    </Button>
                    <Button 
                      className="bg-blue-500 hover:bg-blue-600 flex-1 sm:flex-initial whitespace-nowrap"
                      onClick={() => setIsUploadModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 lg:mr-2" />
                      <span className="hidden lg:inline">Upload</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 sm:p-4 lg:p-5 xl:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
                  {/* Mobile Search - Only visible on mobile */}
                  <div className="lg:hidden">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Pesquisar arquivos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                  </div>

              {/* Breadcrumb - Responsive */}
              <div className="overflow-x-auto">
                <FileBreadcrumb 
                  items={breadcrumbItems}
                  onNavigate={handleBreadcrumbNavigate}
                />
              </div>

              {/* Search and Filters - Hidden on mobile, compact on tablet */}
              <div className="hidden lg:block">
                <FileSearch
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  activeFilters={activeFilters}
                  onFilterChange={setActiveFilters}
                />
              </div>

                  {/* Mobile Filters - Compact version for mobile/tablet */}
                  <div className="lg:hidden flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      Grid
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      Lista
                    </Button>
                  </div>
                  

                  {/* Loading state - Responsive */}
                  {isLoading && (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-3 sm:mb-4"></div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-28 sm:h-32 lg:h-40 xl:h-48 bg-gray-200 rounded-lg"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

              {/* My Files Section - Responsive Table/Cards */}
              <div>
                <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
                  {activeCategory === 'storage' && currentFolderId 
                    ? 'Arquivos na Pasta' 
                    : categories.find(c => c.id === activeCategory)?.name || 'Arquivos'
                  }
                </h2>
                
                {transformedFiles.length === 0 && !isLoading ? (
                  <Card>
                    <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
                      <FolderOpen className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 mb-2">
                        Nenhum arquivo encontrado
                      </h3>
                      <p className="text-xs sm:text-sm lg:text-base text-gray-500 mb-4 max-w-md mx-auto">
                        Comece fazendo upload de seus primeiros arquivos
                      </p>
                      <Button 
                        onClick={() => setIsUploadModalOpen(true)}
                        className="w-full sm:w-auto text-sm"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Fazer Upload
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4">
                          {transformedFiles.map((file) => (
                            <FileCard
                              key={file.id}
                              file={file}
                              onClick={() => handleFileAction(file.type === 'folder' ? 'open' : 'preview', file.id)}
                              onAction={handleFileAction}
                              onDelete={(fileId) => handleFileAction('delete', fileId)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[180px] lg:min-w-[200px] xl:min-w-[240px]">Nome do Arquivo</TableHead>
                                <TableHead className="min-w-[70px] lg:min-w-[80px]">Tag</TableHead>
                                <TableHead className="min-w-[100px] lg:min-w-[120px]">Criado</TableHead>
                                <TableHead className="min-w-[120px] lg:min-w-[150px]">Proprietário</TableHead>
                                <TableHead className="min-w-[120px] lg:min-w-[140px]">Última Modificação</TableHead>
                                <TableHead className="w-10 lg:w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transformedFiles.map((file) => {
                                const Icon = getFileIcon(file.type);
                                return (
                                  <TableRow
                                    key={file.id}
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleFileAction(file.type === 'folder' ? 'open' : 'preview', file.id)}
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                                        <Icon className={`w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 ${getFileColor(file.type)}`} />
                                        <span className="font-medium text-sm lg:text-base truncate min-w-0">{file.name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {file.tag && (
                                        <Badge variant="secondary" className="text-xs truncate max-w-full">
                                          #{file.tag}
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs lg:text-sm text-gray-500">
                                      <span className="truncate">{file.modified}</span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1 lg:gap-2 min-w-0">
                                        <Avatar className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0">
                                          <AvatarFallback className="text-xs">
                                            {file.owner.initials}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs lg:text-sm truncate min-w-0">{file.owner.name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs lg:text-sm text-gray-500">
                                      <span className="truncate">{file.modified}</span>
                                    </TableCell>
                                    <TableCell>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
        </div>
      </main>

      {/* Modals */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      <FilePreviewModal
        file={selectedFile}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onAction={handleFileAction}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (fileToDelete) {
            await deleteFile(fileToDelete.id);
            setFileToDelete(null);
          }
        }}
        itemName={fileToDelete?.name || ''}
        itemType={fileToDelete?.type === 'folder' ? 'folder' : 'file'}
      />

      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onRename={async (newName) => {
          if (fileToRename) {
            await renameFile(fileToRename.id, newName);
            setFileToRename(null);
          }
        }}
        currentItemName={fileToRename?.name || ''}
        itemType={fileToRename?.type === 'folder' ? 'folder' : 'file'}
      />

          {/* Right Panel - File Details - Responsive visibility */}
          {selectedFile && (
            <div className="hidden xl:flex w-72 2xl:w-80 bg-white border-l border-gray-200 flex-col overflow-hidden">
              <div className="p-4 xl:p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 truncate pr-2 min-w-0 flex-1">
                    {selectedFile.name}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 h-8 w-8 flex-shrink-0"
                    onClick={() => setSelectedFile(null)}
                  >
                    ×
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 xl:p-6 space-y-6">
                  {/* Preview - Responsive sizing */}
                  {selectedFile.preview && (
                    <div className={`w-full h-32 xl:h-40 rounded-lg ${selectedFile.preview} flex items-center justify-center flex-shrink-0`}>
                      <div className="bg-white/20 rounded-lg p-3 xl:p-4">
                        <Image className="w-8 h-8 xl:w-12 xl:h-12 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Access Info - Responsive spacing */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 text-sm xl:text-base">Quem tem acesso</h4>
                    <div className="flex -space-x-1 xl:-space-x-2">
                      <Avatar className="w-7 h-7 xl:w-8 xl:h-8 border-2 border-white">
                        <AvatarFallback className="bg-red-100 text-red-700 text-xs">SA</AvatarFallback>
                      </Avatar>
                      <Avatar className="w-7 h-7 xl:w-8 xl:h-8 border-2 border-white">
                        <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">JS</AvatarFallback>
                      </Avatar>
                      <Avatar className="w-7 h-7 xl:w-8 xl:h-8 border-2 border-white">
                        <AvatarFallback className="bg-gray-100 text-gray-800">FR</AvatarFallback>
                      </Avatar>
                      <Avatar className="w-7 h-7 xl:w-8 xl:h-8 border-2 border-white">
                        <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">JB</AvatarFallback>
                      </Avatar>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs xl:text-sm">
                      Gerenciar acesso
                    </Button>
                  </div>

                  {/* File Details - Improved spacing and truncation */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 text-sm xl:text-base">Detalhes do arquivo</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs xl:text-sm text-gray-500 mb-1">Localização</div>
                        <div className="text-xs xl:text-sm text-gray-900 truncate">Meus Arquivos</div>
                      </div>

                      <div>
                        <div className="text-xs xl:text-sm text-gray-500 mb-1">Tipo</div>
                        <div className="text-xs xl:text-sm text-gray-900 capitalize truncate">{selectedFile.type}</div>
                      </div>

                      {selectedFile.size && (
                        <div>
                          <div className="text-xs xl:text-sm text-gray-500 mb-1">Tamanho</div>
                          <div className="text-xs xl:text-sm text-gray-900 truncate">{selectedFile.size}</div>
                        </div>
                      )}

                      <div>
                        <div className="text-xs xl:text-sm text-gray-500 mb-1">Proprietário</div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {selectedFile.owner.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs xl:text-sm text-gray-900 truncate min-w-0">
                            {selectedFile.owner.name}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs xl:text-sm text-gray-500 mb-1">Modificado</div>
                        <div className="text-xs xl:text-sm text-gray-900 truncate">{selectedFile.modified}</div>
                      </div>

                      <div>
                        <div className="text-xs xl:text-sm text-gray-500 mb-1">Criado</div>
                        <div className="text-xs xl:text-sm text-gray-900 truncate">{selectedFile.modified}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
    </div>
  );
};

export default FilesPage;