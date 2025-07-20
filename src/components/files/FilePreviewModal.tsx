import React, { useState, useEffect } from 'react';
import { X, Download, Share, Edit, Trash2, Star, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FilePreviewModalProps {
  file: {
    id: string;
    name: string;
    type: 'folder' | 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other';
    size?: string;
    modified: string;
    owner: {
      name: string;
      initials: string;
    };
    tag?: string;
    preview?: string | Promise<string>; // Pode ser string ou Promise<string>
    isStarred?: boolean;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, fileId: string) => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onAction,
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (file?.type === 'image' && file.preview instanceof Promise) {
      file.preview.then(url => setImageSrc(url)).catch(console.error);
    } else if (typeof file?.preview === 'string') {
      setImageSrc(file.preview);
    }
  }, [file?.preview, file?.type]);

  if (!file) return null;

  const handleAction = (action: string) => {
    onAction?.(action, file.id);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const renderPreview = () => {
    switch (file.type) {
      case 'image':
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
            {imageSrc ? (
              <img 
                src={imageSrc} 
                alt={file.name} 
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ 
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              />
            ) : (
              <div className="bg-white/20 rounded-lg p-6">
                <div className="w-16 h-16 text-white flex items-center justify-center text-4xl">
                  🖼️
                </div>
              </div>
            )}
          </div>
        );
      
      case 'document':
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
                <div className="text-4xl">📄</div>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">Documento PDF</p>
                <Button variant="outline" className="mt-2">
                  Visualizar Documento
                </Button>
              </div>
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="flex-1 flex items-center justify-center bg-black rounded-lg">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                <div className="text-4xl">🎥</div>
              </div>
              <div className="text-white">
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm text-gray-300">Arquivo de vídeo</p>
                <Button variant="secondary" className="mt-2">
                  ▶️ Reproduzir
                </Button>
              </div>
            </div>
          </div>
        );
      
      case 'audio':
        return (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-orange-200 rounded-full flex items-center justify-center mx-auto">
                <div className="text-4xl">🎵</div>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-600">Arquivo de áudio</p>
                <div className="mt-4 space-y-2">
                  <div className="w-64 h-1 bg-orange-300 rounded-full mx-auto">
                    <div className="w-1/3 h-full bg-orange-500 rounded-full"></div>
                  </div>
                  <div className="flex justify-center space-x-2">
                    <Button variant="ghost" size="sm">⏪</Button>
                    <Button variant="ghost" size="sm">▶️</Button>
                    <Button variant="ghost" size="sm">⏩</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                <div className="text-4xl">📦</div>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">Preview não disponível</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DialogTitle className="text-xl font-semibold truncate max-w-md">
                {file.name}
              </DialogTitle>
              {file.tag && (
                <Badge variant="secondary">#{file.tag}</Badge>
              )}
              {file.isStarred && (
                <Star className="w-5 h-5 fill-current text-yellow-500" />
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {file.type === 'image' && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-500 min-w-[3rem] text-center">
                    {zoom}%
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRotate}>
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              <Button variant="ghost" size="sm" onClick={() => handleAction('download')}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleAction('share')}>
                <Share className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleAction('star')}>
                <Star className={`w-4 h-4 ${file.isStarred ? 'fill-current text-yellow-500' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleAction('rename')}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleAction('delete')}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Preview Area */}
          <div className="flex-1 p-6">
            {renderPreview()}
          </div>

          {/* Sidebar with Details */}
          <div className="w-80 border-l bg-gray-50 p-6">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                {/* File Info */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Informações do Arquivo</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500">Tipo:</span>
                      <span className="ml-2 capitalize">{file.type}</span>
                    </div>
                    {file.size && (
                      <div>
                        <span className="text-gray-500">Tamanho:</span>
                        <span className="ml-2">{file.size}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Modificado:</span>
                      <span className="ml-2">{file.modified}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500">Proprietário:</span>
                      <div className="ml-2 flex items-center space-x-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-xs">
                            {file.owner.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{file.owner.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sharing */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Compartilhamento</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Acesso público</span>
                      <Badge variant="outline" className="text-xs">Privado</Badge>
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      Gerenciar Permissões
                    </Button>
                  </div>
                </div>

                {/* Activity */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Atividade Recente</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-gray-600">Arquivo criado</p>
                        <p className="text-xs text-gray-400">{file.modified}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-gray-600">Última visualização</p>
                        <p className="text-xs text-gray-400">há 2 horas</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {file.tag && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">#{file.tag}</Badge>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;