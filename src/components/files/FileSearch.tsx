import React, { useState } from 'react';
import { Search, Filter, SortDesc, Grid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface FileSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  activeFilters: string[];
  onFilterChange: (filters: string[]) => void;
}

const FileSearch: React.FC<FileSearchProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  activeFilters,
  onFilterChange,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const sortOptions = [
    { value: 'name', label: 'Nome' },
    { value: 'modified', label: 'Data de Modificação' },
    { value: 'size', label: 'Tamanho' },
    { value: 'type', label: 'Tipo' },
  ];

  const filterOptions = [
    { value: 'folder', label: 'Pastas', color: 'blue' },
    { value: 'image', label: 'Imagens', color: 'green' },
    { value: 'document', label: 'Documentos', color: 'red' },
    { value: 'video', label: 'Vídeos', color: 'purple' },
    { value: 'audio', label: 'Áudios', color: 'orange' },
    { value: 'archive', label: 'Arquivos', color: 'gray' },
    { value: 'starred', label: 'Favoritos', color: 'yellow' },
  ];

  const toggleFilter = (filterValue: string) => {
    const newFilters = activeFilters.includes(filterValue)
      ? activeFilters.filter(f => f !== filterValue)
      : [...activeFilters, filterValue];
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Search and Controls Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Pesquisar arquivos e pastas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 relative">
              <SortDesc className="w-4 h-4" />
              {sortOptions.find(opt => opt.value === sortBy)?.label || 'Ordenar'}
              {sortBy !== 'name' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={`flex items-center justify-between ${sortBy === option.value ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <span>{option.label}</span>
                {sortBy === option.value && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter Dropdown */}
        <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center justify-between">
              Filtrar por tipo
              {activeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs h-auto p-1"
                >
                  Limpar
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {filterOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => toggleFilter(option.value)}
                className="flex items-center justify-between"
              >
                <span>{option.label}</span>
                {activeFilters.includes(option.value) && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Toggle */}
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="rounded-none"
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="rounded-none"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Filtros ativos:</span>
          {activeFilters.map((filter) => {
            const filterOption = filterOptions.find(f => f.value === filter);
            return (
              <Badge
                key={filter}
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => toggleFilter(filter)}
              >
                {filterOption?.label}
                <span className="ml-1">×</span>
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs h-6 px-2"
          >
            Limpar todos
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileSearch;