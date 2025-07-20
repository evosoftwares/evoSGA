import React, { useState, useEffect } from 'react';
import { Star, Folder, FolderOpen, File, Image, FileText, Film, Music, Archive, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFileStats } from '@/hooks/useFileStats';

interface FileCardProps {
  file: {
    id: string;
    name: string;
    type: 'folder' | 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other';
    size?: string;
    modified: string;
    preview?: string | Promise<string>; // Pode ser string ou Promise<string>
    tag?: string;
    isStarred?: boolean;
  };
  onClick: () => void;
  onAction?: (action: string, fileId: string) => void;
  onDelete: (fileId: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onClick, onAction, onDelete }) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isHovered, setIsHovered] = useState(false);
  const { data: fileStats } = useFileStats();

  useEffect(() => {
    if (file.type === 'image' && file.preview instanceof Promise) {
      file.preview.then(url => setImageSrc(url)).catch(console.error);
    } else if (typeof file.preview === 'string') {
      setImageSrc(file.preview);
    }
  }, [file.preview, file.type]);

  // Extract color from preview gradient for folders
  const getFolderColor = () => {
    if (file.type === 'folder' && typeof file.preview === 'string') {
      if (file.preview.includes('blue')) return 'blue';
      if (file.preview.includes('green')) return 'green';
      if (file.preview.includes('red')) return 'red';
      if (file.preview.includes('purple')) return 'purple';
      if (file.preview.includes('orange')) return 'orange';
      if (file.preview.includes('pink')) return 'pink';
      if (file.preview.includes('yellow')) return 'yellow';
      if (file.preview.includes('gray')) return 'gray';
    }
    return 'blue'; // default
  };

  const renderFolderCard = () => {
    const color = getFolderColor();
    const totalFiles = fileStats?.totalFiles || 0;

    const colorVariants = {
      blue: { 
        bg: 'bg-gradient-to-br from-blue-400 to-blue-600', 
        light: 'bg-gradient-to-br from-blue-50 to-blue-100',
        text: 'text-white',
        accent: 'from-blue-300 to-blue-500'
      },
      green: { 
        bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', 
        light: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
        text: 'text-white',
        accent: 'from-emerald-300 to-emerald-500'
      },
      red: { 
        bg: 'bg-gradient-to-br from-red-400 to-red-600', 
        light: 'bg-gradient-to-br from-red-50 to-red-100',
        text: 'text-white',
        accent: 'from-red-300 to-red-500'
      },
      purple: { 
        bg: 'bg-gradient-to-br from-purple-400 to-purple-600', 
        light: 'bg-gradient-to-br from-purple-50 to-purple-100',
        text: 'text-white',
        accent: 'from-purple-300 to-purple-500'
      },
      orange: { 
        bg: 'bg-gradient-to-br from-orange-400 to-orange-600', 
        light: 'bg-gradient-to-br from-orange-50 to-orange-100',
        text: 'text-white',
        accent: 'from-orange-300 to-orange-500'
      },
      pink: { 
        bg: 'bg-gradient-to-br from-pink-400 to-pink-600', 
        light: 'bg-gradient-to-br from-pink-50 to-pink-100',
        text: 'text-white',
        accent: 'from-pink-300 to-pink-500'
      },
      yellow: { 
        bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', 
        light: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
        text: 'text-white',
        accent: 'from-yellow-300 to-yellow-500'
      },
      gray: { 
        bg: 'bg-gradient-to-br from-gray-400 to-gray-600', 
        light: 'bg-gradient-to-br from-gray-50 to-gray-100',
        text: 'text-white',
        accent: 'from-gray-300 to-gray-500'
      },
    };

    const variant = colorVariants[color as keyof typeof colorVariants];

    return (
      <div className={`relative w-full h-28 sm:h-32 rounded-xl ${variant.light} shadow-inner overflow-hidden`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-2 left-2 w-3 h-3 bg-white/40 rounded-full"></div>
          <div className="absolute top-5 right-4 w-2 h-2 bg-white/30 rounded-full"></div>
          <div className="absolute bottom-4 left-4 w-2.5 h-2.5 bg-white/35 rounded-full"></div>
        </div>
        
        {/* Main folder icon container */}
        <div className="relative w-full h-full flex items-center justify-center">
          <div className={`${variant.bg} p-3 sm:p-4 rounded-2xl shadow-lg transform transition-all duration-300 group-hover:scale-115 group-hover:-translate-y-1 group-hover:rotate-3`}>
            <FolderOpen className={`w-8 h-8 sm:w-10 sm:h-10 ${variant.text} transition-transform duration-300`} />
          </div>
          
          {/* File count badge */}
          {totalFiles > 0 && (
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-white to-gray-100 border-2 border-white rounded-full px-2.5 py-1 shadow-lg">
              <span className="text-xs font-bold text-gray-700">{totalFiles}</span>
            </div>
          )}
          
          {/* Decorative elements */}
          <div className={`absolute top-3 right-3 w-6 h-6 bg-gradient-to-r ${variant.accent} rounded-lg opacity-80 transform rotate-12`}></div>
          <div className={`absolute bottom-4 left-3 w-4 h-4 bg-gradient-to-r ${variant.accent} rounded-full opacity-60`}></div>
        </div>
      </div>
    );
  };


  return (
    <Card
      className={`cursor-pointer group relative overflow-hidden rounded-xl border border-gray-100 shadow-sm 
        transition-all duration-300 ease-in-out hover:shadow-lg hover:border-blue-200 hover:-translate-y-1
        ${isHovered ? 'scale-[1.05] shadow-xl border-blue-300 ring-2 ring-blue-400' : ''} backdrop-blur-sm bg-white/95
        active:scale-[0.98] active:transition-transform active:duration-100`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-3 sm:p-4 flex flex-col h-full">
        {/* Preview Area */}
        <div className={`relative w-full h-28 sm:h-32 rounded-xl mb-3 sm:mb-4 overflow-hidden shadow-inner
          flex items-center justify-center`}>
          {file.type === 'image' && imageSrc ? (
            <img src={imageSrc} alt={file.name} className="w-full h-full object-cover rounded-xl shadow-sm" />
          ) : file.type === 'folder' ? (
            renderFolderCard()
          ) : (
            <div className={`flex flex-col items-center justify-center w-full h-full rounded-xl
              ${file.type === 'document' ? 'bg-gradient-to-br from-red-50 to-red-100' :
                file.type === 'video' ? 'bg-gradient-to-br from-purple-50 to-purple-100' :
                file.type === 'audio' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100' :
                file.type === 'archive' ? 'bg-gradient-to-br from-orange-50 to-orange-100' :
                'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
              {file.type === 'document' && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-2.5 sm:p-3 rounded-xl shadow-md">
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              )}
              {file.type === 'video' && (
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-2.5 sm:p-3 rounded-xl shadow-md">
                  <Film className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              )}
              {file.type === 'audio' && (
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-2.5 sm:p-3 rounded-xl shadow-md">
                  <Music className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              )}
              {file.type === 'archive' && (
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-2.5 sm:p-3 rounded-xl shadow-md">
                  <Archive className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              )}
              {file.type === 'other' && (
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-2.5 sm:p-3 rounded-xl shadow-md">
                  <File className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              )}
            </div>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
          
          {/* Star indicator */}
          {file.isStarred && (
            <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-yellow-400 to-amber-500 p-1.5 rounded-full shadow-lg 
              animate-pulse hover:animate-none transition-all duration-200 hover:scale-110">
              <Star className="w-4 h-4 text-white fill-current transform transition-transform duration-200" />
            </div>
          )}
          
          {/* Action buttons */}
          <div className={`absolute top-3 right-3 z-10 flex gap-2 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}>
            
            
            {/* Delete button */}
            <div 
              className="p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg hover:shadow-xl 
                transition-all duration-200 hover:scale-110 cursor-pointer hover:from-red-600 hover:to-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.id);
              }}
            >
              <Trash2 className="w-4 h-4 text-white transition-transform duration-200 hover:scale-110" />
            </div>
          </div>
        </div>

        {/* File Info */}
        <div className="flex-grow space-y-3">
          <h3 className="font-semibold text-xs sm:text-sm text-gray-900 truncate leading-tight group-hover:text-blue-600 
            transition-colors duration-200" title={file.name}>
            {file.name}
          </h3>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full 
              transition-all duration-200 group-hover:bg-blue-50 group-hover:shadow-sm">
              <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700 transition-colors duration-200">
                {file.size || (file.type === 'folder' ? 'Pasta' : 'Arquivo')}
              </span>
            </div>
            {file.tag && (
              <Badge 
                variant="secondary" 
                className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 
                  rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 transition-all duration-200 hover:from-blue-100 hover:to-indigo-100 
                  hover:border-blue-300 hover:shadow-sm"
              >
                #{file.tag}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs text-gray-500">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-400 rounded-full group-hover:bg-emerald-500 
              transition-all duration-200 group-hover:shadow-sm group-hover:scale-125"></div>
            <span className="font-medium group-hover:text-gray-700 transition-colors duration-200">
              {file.modified}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileCard;