import React, { useState } from 'react';
import { X, Plus, Tag, Edit2, Trash2, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SalesTag } from '@/types/database';
import { useSalesTagMutations } from '@/hooks/sales/useSalesTagMutations';
import { useToast } from '@/hooks/use-toast';

interface SalesTagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tags: SalesTag[];
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6B7280', // Gray
];

const SalesTagManager: React.FC<SalesTagManagerProps> = ({
  isOpen,
  onClose,
  tags,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<SalesTag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');
  
  const { toast } = useToast();
  const { createSalesTag, updateSalesTag, deleteSalesTag } = useSalesTagMutations();

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "Erro",
        description: "O nome da tag não pode estar vazio",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSalesTag.mutateAsync({
        name: newTagName.trim(),
        color: newTagColor,
      });
      
      setNewTagName('');
      setNewTagColor(DEFAULT_COLORS[0]);
      setIsCreating(false);
      
      toast({
        title: "Sucesso",
        description: "Tag criada com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar tag",
        variant: "destructive",
      });
    }
  };

  const handleEditTag = (tag: SalesTag) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editTagName.trim()) {
      toast({
        title: "Erro",
        description: "O nome da tag não pode estar vazio",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSalesTag.mutateAsync({
        tagId: editingTag.id,
        name: editTagName.trim(),
        color: editTagColor,
      });
      
      setEditingTag(null);
      setEditTagName('');
      setEditTagColor('');
      
      toast({
        title: "Sucesso",
        description: "Tag atualizada com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar tag",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTag = async (tag: SalesTag) => {
    if (!confirm(`Tem certeza que deseja excluir a tag "${tag.name}"?`)) {
      return;
    }

    try {
      await deleteSalesTag.mutateAsync(tag.id);
      
      toast({
        title: "Sucesso",
        description: "Tag excluída com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir tag",
        variant: "destructive",
      });
    }
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewTagName('');
    setNewTagColor(DEFAULT_COLORS[0]);
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setEditTagName('');
    setEditTagColor('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Gerenciar Tags de Vendas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Create New Tag Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Nova Tag</h3>
              {!isCreating && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Criar Tag
                </Button>
              )}
            </div>

            {isCreating && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Tag
                  </label>
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Digite o nome da tag..."
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor da Tag
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newTagColor === color
                            ? 'border-gray-900 scale-110'
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="mt-2">
                    <Input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-20 h-8"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCreateTag}
                    disabled={createSalesTag.isLoading || !newTagName.trim()}
                    size="sm"
                  >
                    {createSalesTag.isLoading ? 'Criando...' : 'Criar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelCreate}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>

                {/* Preview */}
                {newTagName.trim() && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-600">Preview:</span>
                    <div className="mt-1">
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: `${newTagColor}20`, color: newTagColor }}
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {newTagName.trim()}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Existing Tags */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Tags Existentes ({tags.length})
            </h3>
            
            {tags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma tag criada ainda</p>
                <p className="text-sm">Crie sua primeira tag para organizar as oportunidades</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {editingTag?.id === tag.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editTagName}
                            onChange={(e) => setEditTagName(e.target.value)}
                            className="h-8"
                            maxLength={50}
                          />
                          <div className="flex gap-1">
                            {DEFAULT_COLORS.slice(0, 5).map((color) => (
                              <button
                                key={color}
                                onClick={() => setEditTagColor(color)}
                                className={`w-6 h-6 rounded-full border ${
                                  editTagColor === color
                                    ? 'border-gray-900'
                                    : 'border-gray-300'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            <Palette className="w-4 h-4 text-gray-400 ml-1" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="font-medium text-gray-900">{tag.name}</span>
                          <Badge
                            variant="secondary"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag.name}
                          </Badge>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {editingTag?.id === tag.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleUpdateTag}
                            disabled={updateSalesTag.isLoading || !editTagName.trim()}
                            className="h-8 px-3"
                          >
                            {updateSalesTag.isLoading ? 'Salvando...' : 'Salvar'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                            className="h-8 px-3"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTag(tag)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTag(tag)}
                            disabled={deleteSalesTag.isLoading}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesTagManager;