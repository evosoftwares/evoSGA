import React, { useState, useRef, useEffect } from 'react';
import { Check, Plus, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TagBadge from './TagBadge';

interface FileTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface TagSelectorProps {
  availableTags: FileTag[];
  selectedTags: FileTag[];
  onTagsChange: (tags: FileTag[]) => void;
  onCreateTag?: (tagData: { name: string; color: string; description?: string }) => Promise<FileTag>;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#059669', // Green
];

const TagSelector: React.FC<TagSelectorProps> = ({
  availableTags,
  selectedTags,
  onTagsChange,
  onCreateTag,
  placeholder = "Adicionar tags...",
  maxTags,
  disabled = false,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTagIds = selectedTags.map(tag => tag.id);
  const filteredTags = availableTags.filter(tag => 
    !selectedTagIds.includes(tag.id) &&
    tag.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const canAddMore = !maxTags || selectedTags.length < maxTags;
  const showCreateOption = onCreateTag && searchValue.trim() && 
    !availableTags.some(tag => tag.name.toLowerCase() === searchValue.toLowerCase()) &&
    canAddMore;

  useEffect(() => {
    if (!open) {
      setSearchValue('');
      setIsCreating(false);
      setNewTagName('');
    }
  }, [open]);

  const handleSelectTag = (tag: FileTag) => {
    if (!selectedTagIds.includes(tag.id) && canAddMore) {
      onTagsChange([...selectedTags, tag]);
    }
    setSearchValue('');
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!onCreateTag || !newTagName.trim()) return;

    try {
      const newTag = await onCreateTag({
        name: newTagName.trim(),
        color: newTagColor,
        description: `Tag criada automaticamente`
      });
      
      onTagsChange([...selectedTags, newTag]);
      setIsCreating(false);
      setNewTagName('');
      setSearchValue('');
      setOpen(false);
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const startCreating = () => {
    setIsCreating(true);
    setNewTagName(searchValue);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              variant="default"
              size="sm"
              removable={!disabled}
              onRemove={handleRemoveTag}
            />
          ))}
        </div>
      )}

      {/* Tag Selector */}
      {!disabled && canAddMore && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal h-9"
              disabled={disabled}
            >
              <Tag className="h-4 w-4 mr-2" />
              {selectedTags.length === 0 ? placeholder : "Adicionar mais tags..."}
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-80 p-0" align="start">
            {!isCreating ? (
              <Command>
                <CommandInput
                  placeholder="Buscar tags..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {showCreateOption ? (
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={startCreating}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar tag "{searchValue}"
                        </Button>
                      </div>
                    ) : (
                      "Nenhuma tag encontrada."
                    )}
                  </CommandEmpty>
                  
                  {filteredTags.length > 0 && (
                    <CommandGroup heading="Tags disponíveis">
                      {filteredTags.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          onSelect={() => handleSelectTag(tag)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1">{tag.name}</span>
                          {tag.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-24">
                              {tag.description}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            ) : (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Criar nova tag</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreating(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Nome</label>
                    <Input
                      ref={inputRef}
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Nome da tag"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateTag();
                        } else if (e.key === 'Escape') {
                          setIsCreating(false);
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Cor</label>
                    <div className="flex gap-2 mt-1">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            newTagColor === color 
                              ? 'border-gray-900 scale-110' 
                              : 'border-gray-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTagColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Criar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      {/* Max tags reached message */}
      {maxTags && selectedTags.length >= maxTags && (
        <p className="text-xs text-muted-foreground">
          Máximo de {maxTags} tags atingido
        </p>
      )}
    </div>
  );
};

export default TagSelector;