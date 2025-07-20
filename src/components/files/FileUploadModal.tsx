import React, { useState, useCallback } from 'react';
import { Upload, X, File, Image, Video, Music, Archive, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList) => Promise<void>;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  id: string;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    if (file.type.startsWith('audio/')) return Music;
    if (file.type.includes('pdf') || file.type.includes('document')) return FileText;
    if (file.type.includes('zip') || file.type.includes('rar')) return Archive;
    return File;
  };

  const getFileTypeColor = (file: File) => {
    if (file.type.startsWith('image/')) return 'bg-green-100 text-green-700';
    if (file.type.startsWith('video/')) return 'bg-purple-100 text-purple-700';
    if (file.type.startsWith('audio/')) return 'bg-orange-100 text-orange-700';
    if (file.type.includes('pdf') || file.type.includes('document')) return 'bg-red-100 text-red-700';
    if (file.type.includes('zip') || file.type.includes('rar')) return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = (files: FileList) => {
    const newFiles: UploadFile[] = Array.from(files).map((file) => ({
      file,
      progress: 0,
      status: 'pending',
      id: Math.random().toString(36).substr(2, 9),
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  };

  const simulateUpload = async (uploadFile: UploadFile) => {
    setUploadFiles(prev =>
      prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)
    );

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadFiles(prev =>
        prev.map(f => f.id === uploadFile.id ? { ...f, progress } : f)
      );
    }

    setUploadFiles(prev =>
      prev.map(f => f.id === uploadFile.id ? { ...f, status: 'completed' } : f)
    );
  };

  const handleUpload = async () => {
    setIsUploading(true);
    
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    
    // Simulate uploads
    for (const uploadFile of pendingFiles) {
      await simulateUpload(uploadFile);
    }

    setIsUploading(false);
    
    // Close modal after upload
    setTimeout(() => {
      setUploadFiles([]);
      onClose();
    }, 1000);
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl lg:max-w-2xl xl:max-w-3xl max-h-[90vh] sm:max-h-[85vh] lg:max-h-[80vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-4">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
            <Upload className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 flex-shrink-0" />
            <span className="truncate">Fazer Upload de Arquivos</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 lg:space-y-6 min-h-0">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-4 sm:p-6 lg:p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-2 sm:mb-3 lg:mb-4 flex-shrink-0" />
            <p className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 mb-1 sm:mb-2">
              Arraste e solte arquivos aqui
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 px-2">
              ou clique para selecionar arquivos
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer text-xs sm:text-sm" size="sm" asChild>
                <span>Selecionar Arquivos</span>
              </Button>
            </label>
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h3 className="font-medium text-sm sm:text-base text-gray-900 px-1">
                Arquivos Selecionados ({uploadFiles.length})
              </h3>
              <div className="space-y-2 max-h-48 sm:max-h-60 lg:max-h-72 overflow-y-auto">
                {uploadFiles.map((uploadFile) => {
                  const Icon = getFileIcon(uploadFile.file);
                  return (
                    <div
                      key={uploadFile.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg bg-gray-50 min-w-0"
                    >
                      <div className={`p-1.5 sm:p-2 rounded flex-shrink-0 ${getFileTypeColor(uploadFile.file)}`}>
                        <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                        
                        {uploadFile.status === 'uploading' && (
                          <div className="mt-1.5 sm:mt-2">
                            <Progress value={uploadFile.progress} className="h-1 sm:h-1.5" />
                            <p className="text-xs text-gray-500 mt-1">
                              {uploadFile.progress}% enviado
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <Badge
                          variant={
                            uploadFile.status === 'completed'
                              ? 'default'
                              : uploadFile.status === 'uploading'
                              ? 'secondary'
                              : uploadFile.status === 'error'
                              ? 'destructive'
                              : 'outline'
                          }
                          className="text-xs whitespace-nowrap"
                        >
                          {uploadFile.status === 'completed'
                            ? 'Concluído'
                            : uploadFile.status === 'uploading'
                            ? 'Enviando'
                            : uploadFile.status === 'error'
                            ? 'Erro'
                            : 'Pendente'}
                        </Badge>
                        
                        {uploadFile.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(uploadFile.id)}
                            className="p-1 h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4 pt-3 sm:pt-4 border-t flex-shrink-0">
          <p className="text-xs sm:text-sm text-gray-500 truncate">
            {uploadFiles.length} arquivo(s) selecionado(s)
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isUploading}
              className="flex-1 sm:flex-initial text-xs sm:text-sm"
              size="sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadFiles.length === 0 || isUploading}
              className="flex-1 sm:flex-initial text-xs sm:text-sm whitespace-nowrap"
              size="sm"
            >
              {isUploading ? 'Enviando...' : 'Fazer Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadModal;