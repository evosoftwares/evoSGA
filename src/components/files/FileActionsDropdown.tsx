import React from 'react';
import { 
  MoreVertical, 
  Download, 
  Share, 
  Edit, 
  Trash2, 
  Star, 
  Copy, 
  Move, 
  Info,
  Eye,
  FolderOpen
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface FileActionsDropdownProps {
  file: {
    id: string;
    name: string;
    type: 'folder' | 'image' | 'document' | 'video' | 'audio' | 'archive';
    isStarred?: boolean;
    permissions?: {
      read: boolean;
      write: boolean;
      delete: boolean;
      share: boolean;
    };
  };
  onAction: (action: string, fileId: string) => void;
  trigger?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

const FileActionsDropdown: React.FC<FileActionsDropdownProps> = ({
  file,
  onAction,
  trigger,
  align = 'end',
}) => {
  const permissions = file.permissions || {
    read: true,
    write: true,
    delete: true,
    share: true,
  };

  const handleAction = (action: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onAction(action, file.id);
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={(e) => e.stopPropagation()}
    >
      <MoreVertical className="w-4 h-4" />
      <span className="sr-only">Mais ações</span>
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate">
              {file.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {file.type === 'folder' ? 'Pasta' : file.type}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Ações de Visualização */}
        <DropdownMenuItem onClick={(e) => handleAction('preview', e)}>
          <Eye className="w-4 h-4 mr-2" />
          {file.type === 'folder' ? 'Abrir' : 'Visualizar'}
        </DropdownMenuItem>

        {file.type === 'folder' && (
          <DropdownMenuItem onClick={(e) => handleAction('open', e)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Navegar para pasta
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={(e) => handleAction('info', e)}>
          <Info className="w-4 h-4 mr-2" />
          Informações
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Ações de Arquivo */}
        {permissions.read && file.type !== 'folder' && (
          <DropdownMenuItem onClick={(e) => handleAction('download', e)}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </DropdownMenuItem>
        )}

        {permissions.share && (
          <DropdownMenuItem onClick={(e) => handleAction('share', e)}>
            <Share className="w-4 h-4 mr-2" />
            Compartilhar
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={(e) => handleAction('star', e)}>
          <Star className={`w-4 h-4 mr-2 ${
            file.isStarred ? 'fill-current text-yellow-500' : ''
          }`} />
          {file.isStarred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Ações de Edição */}
        {permissions.write && (
          <>
            <DropdownMenuItem onClick={(e) => handleAction('rename', e)}>
              <Edit className="w-4 h-4 mr-2" />
              Renomear
            </DropdownMenuItem>

            <DropdownMenuItem onClick={(e) => handleAction('copy', e)}>
              <Copy className="w-4 h-4 mr-2" />
              Fazer uma cópia
            </DropdownMenuItem>

            <DropdownMenuItem onClick={(e) => handleAction('move', e)}>
              <Move className="w-4 h-4 mr-2" />
              Mover para...
            </DropdownMenuItem>
          </>
        )}

        {/* Ação de Exclusão */}
        {permissions.delete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => handleAction('delete', e)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {file.type === 'folder' ? 'Excluir pasta' : 'Excluir arquivo'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FileActionsDropdown;