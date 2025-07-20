import React, { useState } from 'react';
import { FolderPlus, Folder } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folderData: {
    name: string;
    description?: string;
    color: string;
    parentId?: string;
  }) => Promise<void>;
  parentFolders?: Array<{
    id: string;
    name: string;
    path: string;
  }>;
}

const folderColors = [
  { value: 'blue', label: 'Azul', tailwindClass: 'bg-blue-500' },
  { value: 'green', label: 'Verde', tailwindClass: 'bg-green-500' },
  { value: 'red', label: 'Vermelho', tailwindClass: 'bg-red-500' },
  { value: 'purple', label: 'Roxo', tailwindClass: 'bg-purple-500' },
  { value: 'orange', label: 'Laranja', tailwindClass: 'bg-orange-500' },
  { value: 'pink', label: 'Rosa', tailwindClass: 'bg-pink-500' },
  { value: 'yellow', label: 'Amarelo', tailwindClass: 'bg-yellow-500' },
  { value: 'gray', label: 'Cinza', tailwindClass: 'bg-gray-500' },
  { value: 'brown', label: 'Marrom', tailwindClass: 'bg-amber-700' },
  { value: 'indigo', label: 'Índigo', tailwindClass: 'bg-indigo-500' },
  { value: 'rose', label: 'Rosa Escuro', tailwindClass: 'bg-rose-500' },
  { value: 'lime', label: 'Limão', tailwindClass: 'bg-lime-500' },
  { value: 'fuchsia', label: 'Fúcsia', tailwindClass: 'bg-fuchsia-500' },
];

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
  parentFolders = [],
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'blue',
    parentId: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da pasta é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Nome deve ter no máximo 50 caracteres';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Descrição deve ter no máximo 200 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    setErrors({}); // Limpar erros anteriores
    
    try {
      // Validação adicional de segurança
      const trimmedName = formData.name.trim();
      if (!trimmedName) {
        throw new Error('Nome da pasta é obrigatório');
      }

      // Preparar dados com atomicidade
      const folderData = {
        name: trimmedName,
        description: formData.description.trim() || undefined,
        color: formData.color,
        parentId: formData.parentId || undefined,
      };

      // Operação atômica - criar pasta
      await onCreateFolder(folderData);
      
      // Sucesso - resetar form apenas após confirmação
      resetForm();
      onClose();
      
    } catch (error: any) {
      console.error('Erro ao criar pasta:', error);
      
      // Tratamento específico de erros
      let errorMessage = 'Erro ao criar pasta. Tente novamente.';
      
      if (error?.message?.includes('duplicate')) {
        errorMessage = 'Já existe uma pasta com este nome neste local.';
      } else if (error?.message?.includes('permission')) {
        errorMessage = 'Você não tem permissão para criar pastas aqui.';
      } else if (error?.message?.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: 'blue',
      parentId: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    if (!isCreating) {
      resetForm();
      onClose();
    }
  };

  const selectedColor = folderColors.find(c => c.value === formData.color);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[98vw] max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-8 rounded-xl shadow-2xl transform transition-all duration-300 ease-out-expo">
        <DialogHeader className="flex-shrink-0 pb-6 sm:pb-8 border-b border-gray-200">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-gray-800">
            <FolderPlus className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 text-blue-600" />
            <span className="truncate">Criar Nova Pasta</span>
          </DialogTitle>
        </DialogHeader>

        <form id="create-folder-form" onSubmit={handleSubmit} className="space-y-6 flex-1 min-h-0 overflow-y-auto p-4">
          {/* Preview */}
          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-inner border border-gray-200">
            <div className="text-center space-y-5">
              <div 
                className={`w-24 h-24 ${selectedColor?.tailwindClass} rounded-3xl flex items-center justify-center mx-auto transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg`}
              >
                <Folder className="w-12 h-12 text-white" />
              </div>
              <p className="font-bold text-2xl text-gray-900 truncate max-w-full">
                {formData.name || 'Nova Pasta'}
              </p>
              {formData.description && (
                <p className="text-base text-gray-600 max-w-full text-center px-2 line-clamp-2">
                  {formData.description}
                </p>
              )}
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="folder-name" className="text-sm font-medium text-gray-700">Nome da Pasta <span className="text-red-500">*</span></Label>
            <Input
              id="folder-name"
              placeholder="Ex: Documentos Importantes, Projetos 2025"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`text-base p-3 rounded-lg transition-all duration-200 ${errors.name ? 'border-red-400 focus:border-red-500 ring-1 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'}`}
              disabled={isCreating}
              maxLength={50}
            />
            {errors.name && (
              <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                <span className="text-red-500">⚠️</span>
                {errors.name}
              </p>
            )}
            <p className="text-xs text-gray-500 text-right mt-1">
              {formData.name.length}/50 caracteres
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="folder-description" className="text-sm font-medium text-gray-700">Descrição (opcional)</Label>
            <Textarea
              id="folder-description"
              placeholder="Adicione uma breve descrição para esta pasta..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`resize-none text-base p-3 min-h-[80px] rounded-lg transition-all duration-200 ${errors.description ? 'border-red-400 focus:border-red-500 ring-1 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'}`}
              rows={3}
              disabled={isCreating}
              maxLength={200}
            />
            {errors.description && (
              <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                <span className="text-red-500">⚠️</span>
                {errors.description}
              </p>
            )}
            <p className="text-xs text-gray-500 text-right mt-1">
              {formData.description.length}/200 caracteres
            </p>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Cor da Pasta</Label>
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-7 gap-1">
              {folderColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`flex flex-col items-center justify-center p-1 rounded-xl border-2 transition-all duration-200 ease-in-out transform hover:scale-105 ${
                    formData.color === color.value
                      ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isCreating}
                >
                  <div className={`w-5 h-5 rounded-full ${color.tailwindClass} mb-0.5 shadow-sm`} />
                  <span className="text-xs font-medium text-gray-700 truncate">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pasta Pai */}
          {parentFolders.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Localização</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                disabled={isCreating}
              >
                <SelectTrigger className="text-base p-3 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200">
                  <SelectValue placeholder="Selecione uma pasta (opcional)" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="" className="text-base py-2 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-gray-500" /> <span className="font-medium">Raiz</span>
                  </SelectItem>
                  {parentFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id} className="text-base py-2 flex items-center gap-2">
                      <Folder className="w-5 h-5 text-gray-500" /> {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Erro Geral */}
          {errors.general && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg shadow-sm animate-fade-in">
              <div className="flex items-start gap-3">
                <span className="text-red-600 text-xl flex-shrink-0">🚨</span>
                <p className="text-sm text-red-800 font-medium">{errors.general}</p>
              </div>
            </div>
          )}
        </form>

        <DialogFooter className="flex-shrink-0 pt-5 border-t border-gray-200 mt-6">
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 sm:flex-initial text-base px-6 py-2.5 rounded-lg border-gray-300 hover:bg-gray-50 transition-colors duration-200"
              size="lg"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-folder-form"
              disabled={isCreating || !formData.name.trim()}
              className="gap-2 flex-1 sm:flex-initial text-base px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Criando Pasta...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-5 h-5" />
                  <span>Criar Pasta</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderModal;