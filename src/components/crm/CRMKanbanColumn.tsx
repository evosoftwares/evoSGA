import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GenerateProposalModal } from '@/components/sales/GenerateProposalModal';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { FixedSizeList as List } from 'react-window';
import { Plus, ChevronDown, ChevronRight, FolderOpen, Folder, MoreHorizontal, Tag, Loader2 } from 'lucide-react';
import { createLogger } from '@/utils/logger';
import { ProjectBadge } from '../projects/ProjectBadge';
import { SalesColumn, SalesOpportunity, Tag as SalesTag, TaskTag, Project, Profile } from '@/types/database';
import CRMOpportunityCard from './CRMOpportunityCard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useMultipleTagSelection } from '@/hooks/sales/useMultipleTagSelection';
import { useSalesTagMutations } from '@/hooks/sales/useSalesTags';
import { useSalesKanbanMutations } from '@/hooks/sales/useSalesKanbanMutations';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface CRMKanbanColumnProps {
  column: SalesColumn;
  opportunities: SalesOpportunity[];
  profiles: Profile[];
  projects: Project[];
  tags: SalesTag[];
  taskTags: TaskTag[];
  onOpportunityClick: (opportunity: SalesOpportunity) => void;
  onCreateOpportunity: (columnId: string) => void;
  createOpportunity?: (opportunityData: Partial<SalesOpportunity>) => Promise<void>;
}

const logger = createLogger('CRMKanbanColumn');

// Memoized opportunity item component for virtualized list
const OpportunityItem = React.memo(({
  index,
  style,
  data
}: {
  index: number;
  style: React.CSSProperties;
  data: any;
}) => {
  const {
    opportunities,
    tags,
    taskTags,
    profiles,
    isPropostaColumn,
    handleGenerateProposal,
    onOpportunityClick,
    isSelectionMode,
    selectedOpportunityIds,
    toggleOpportunitySelection
  } = data;
  
  const opportunity = opportunities[index];
  
  return (
    <div
      style={style}
      role="listitem"
      aria-label={`Opportunity ${opportunity.title}`}
    >
      <CRMOpportunityCard
        opportunity={opportunity}
        index={index}
        tags={tags}
        taskTags={taskTags}
        profiles={profiles}
        onClick={() => {
          if (!isSelectionMode) {
            onOpportunityClick(opportunity);
          }
        }}
        showGenerateProposalButton={isPropostaColumn}
        onGenerateProposal={handleGenerateProposal}
        commentCount={0}
        isSelected={selectedOpportunityIds.has(opportunity.id)}
        onToggleSelection={(e) => toggleOpportunitySelection(opportunity.id, e)}
      />
    </div>
  );
});

const CRMKanbanColumnComponent: React.FC<CRMKanbanColumnProps> = ({
  column,
  opportunities,
  profiles,
  projects,
  tags,
  taskTags,
  onOpportunityClick,
  onCreateOpportunity,
  createOpportunity
}) => {
  const [isGeneratingProposal, setIsGeneratingProposal] = useState<string | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  
  // Verificar se estamos na coluna "Proposta"
  const isPropostaColumn = column.title?.toLowerCase().includes('proposta');
  
  // Função para abrir o modal de geração de proposta
  const handleGenerateProposal = useCallback((opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsProposalModalOpen(true);
  }, []);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newOpportunityTitle, setNewOpportunityTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  
  // Multiple selection state for opportunities
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  
  // Tag selection for bulk operations
  const tagSelection = useMultipleTagSelection('multiple');
  const { addTagToOpportunity, removeTagFromOpportunity } = useSalesTagMutations();
  const { updateOpportunity } = useSalesKanbanMutations();
  
  // Bulk operation progress state
  const [bulkOperationProgress, setBulkOperationProgress] = useState<number | null>(null);
  // Sort opportunities by position with fallback to created_at for consistency
  const columnOpportunities = opportunities
    .filter(opportunity => opportunity.column_id === column.id)
    .sort((a, b) => {
      // Primary sort: position (garantir que seja numérico)
      const posA = typeof a.position === 'number' ? a.position : 0;
      const posB = typeof b.position === 'number' ? b.position : 0;
      
      if (posA !== posB) {
        return posA - posB;
      }
      // Fallback sort: created_at for opportunities with same position
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  
  const totalDealValue = columnOpportunities.reduce((sum, opportunity) => sum + (opportunity.deal_value || 0), 0);
  
  // Verificar se é a coluna "Fechado" ou "Ganho"
  const isClosedColumn = column.title?.toLowerCase().includes('fechado') || 
                         column.title?.toLowerCase().includes('ganho') ||
                         column.title?.toLowerCase().includes('closed') ||
                         column.title?.toLowerCase().includes('won');
  
  // Agrupar oportunidades por projeto apenas se for coluna fechada (memoizado para estabilidade)
  const groupedOpportunities = useMemo(() => {
    if (!isClosedColumn) return null;
    
    return columnOpportunities.reduce((acc, opportunity) => {
      const projectId = opportunity.project_id || 'sem-projeto';
      if (!acc[projectId]) {
        acc[projectId] = [];
      }
      acc[projectId].push(opportunity);
      return acc;
    }, {} as Record<string, SalesOpportunity[]>);
  }, [isClosedColumn, columnOpportunities]);
  
  // Criar array de opportunities visíveis para colunas fechadas (memoizado)
  const visibleOpportunities = useMemo(() => {
    if (!isClosedColumn || !groupedOpportunities) return columnOpportunities;
    
    const visible: SalesOpportunity[] = [];
    Object.keys(groupedOpportunities).forEach(projectId => {
      const isCollapsed = !collapsedProjects.has(`open-${projectId}`);
      if (!isCollapsed) {
        visible.push(...groupedOpportunities[projectId]);
      }
    });
    return visible;
  }, [isClosedColumn, groupedOpportunities, collapsedProjects, columnOpportunities]);
  
  const toggleProjectCollapse = useCallback((projectId: string) => {
    const openKey = `open-${projectId}`;
    
    setCollapsedProjects(prev => {
      const wasCollapsed = !prev.has(openKey);
      const newCollapsed = new Set(prev);
      
      if (wasCollapsed) {
        // Opening the folder
        newCollapsed.add(openKey);
      } else {
        // Closing the folder
        newCollapsed.delete(openKey);
      }
      
      logger.info(`Toggling project ${projectId} in column ${column.title}`, { 
        wasCollapsed,
        nowCollapsed: !wasCollapsed
      });
      
      return newCollapsed;
    });
  }, [column.title]);
  
  const handleAddOpportunity = async () => {
    if (newOpportunityTitle.trim() && createOpportunity) {
      setIsCreating(true);
      try {
        // Criar oportunidade diretamente com dados básicos
        await createOpportunity({
          title: newOpportunityTitle.trim(),
          column_id: column.id,
          description: '',
          deal_value: 0,
          currency: 'BRL',
          probability: 50,
          position: columnOpportunities.length, // Adicionar no final
        });
        
        setNewOpportunityTitle('');
        setIsAdding(false);
        
        logger.info('Opportunity created successfully', {
           title: newOpportunityTitle.trim(),
           columnId: column.id,
         });
       } catch (error) {
         logger.error('Failed to create opportunity', {
           error: error instanceof Error ? error.message : 'Unknown error',
           title: newOpportunityTitle.trim(),
           columnId: column.id,
         });
      } finally {
        setIsCreating(false);
      }
    } else if (!createOpportunity) {
      // Fallback para o método antigo se createOpportunity não estiver disponível
      onCreateOpportunity(column.id);
      setNewOpportunityTitle('');
      setIsAdding(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddOpportunity();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewOpportunityTitle('');
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Toggle opportunity selection
  const toggleOpportunitySelection = useCallback((opportunityId: string, event: React.MouseEvent) => {
    if (!isSelectionMode) {
      // Enable selection mode on first click with Ctrl/Cmd or Shift
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        setIsSelectionMode(true);
      } else {
        // Normal click behavior
        return;
      }
    }
    
    setSelectedOpportunityIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(opportunityId)) {
        newSet.delete(opportunityId);
      } else {
        newSet.add(opportunityId);
      }
      return newSet;
    });
  }, [isSelectionMode]);
  
  // Select all opportunities in the column
  const selectAllOpportunities = useCallback(() => {
    const allIds = new Set(columnOpportunities.map(opp => opp.id));
    setSelectedOpportunityIds(allIds);
    setIsSelectionMode(true);
  }, [columnOpportunities]);
  
  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedOpportunityIds(new Set());
    setIsSelectionMode(false);
  }, []);
  
  // Apply tags to selected opportunities
  const applyTagsToSelectedOpportunities = useCallback(async () => {
    if (selectedOpportunityIds.size === 0 || tagSelection.selectedTagIds.length === 0) {
      toast.info('No opportunities or tags selected');
      return;
    }
    
    try {
      setBulkOperationProgress(0);
      const totalOperations = selectedOpportunityIds.size * tagSelection.selectedTagIds.length;
      let completedOperations = 0;
      
      const promises = Array.from(selectedOpportunityIds).flatMap(opportunityId =>
        tagSelection.selectedTagIds.map(tagId =>
          addTagToOpportunity.mutateAsync({ opportunityId, tagId }).then(() => {
            completedOperations++;
            setBulkOperationProgress((completedOperations / totalOperations) * 100);
          })
        )
      );
      
      await Promise.all(promises);
      setBulkOperationProgress(null);
      toast.success(`Tags applied to ${selectedOpportunityIds.size} opportunities`);
      clearSelection();
      tagSelection.clearSelection();
    } catch (error) {
      setBulkOperationProgress(null);
      console.error('Error applying tags:', error);
      toast.error('Failed to apply tags');
    }
  }, [selectedOpportunityIds, tagSelection.selectedTagIds, addTagToOpportunity, clearSelection, tagSelection]);
  
  // Remove tags from selected opportunities
  const removeTagsFromSelectedOpportunities = useCallback(async () => {
    if (selectedOpportunityIds.size === 0 || tagSelection.selectedTagIds.length === 0) {
      toast.info('No opportunities or tags selected');
      return;
    }
    
    try {
      setBulkOperationProgress(0);
      const totalOperations = selectedOpportunityIds.size * tagSelection.selectedTagIds.length;
      let completedOperations = 0;
      
      const promises = Array.from(selectedOpportunityIds).flatMap(opportunityId =>
        tagSelection.selectedTagIds.map(tagId =>
          removeTagFromOpportunity.mutateAsync({ opportunityId, tagId }).then(() => {
            completedOperations++;
            setBulkOperationProgress((completedOperations / totalOperations) * 100);
          })
        )
      );
      
      await Promise.all(promises);
      setBulkOperationProgress(null);
      toast.success(`Tags removed from ${selectedOpportunityIds.size} opportunities`);
      clearSelection();
      tagSelection.clearSelection();
    } catch (error) {
      setBulkOperationProgress(null);
      console.error('Error removing tags:', error);
      toast.error('Failed to remove tags');
    }
  }, [selectedOpportunityIds, tagSelection.selectedTagIds, removeTagFromOpportunity, clearSelection, tagSelection]);
  
  // Handle drag end for tag assignment
  const handleTagDragEnd = useCallback((result: any) => {
    if (!result.destination || result.destination.droppableId !== column.id) return;
    
    // This would handle drag-and-drop of tags onto opportunities
    // Implementation would depend on the specific drag-and-drop library used
  }, [column.id]);
  
  // Armazenar o conteúdo do retorno para uso posterior
  const renderedContent = (
    <div className="w-full h-full bg-gray-50 rounded-xl lg:rounded-2xl p-3 lg:p-4 xl:p-5 flex flex-col">
      {/* Column Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-3 lg:mb-4 xl:mb-5">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
          <div 
            className="w-2.5 h-2.5 lg:w-3 lg:h-3 xl:w-3.5 xl:h-3.5 rounded-full flex-shrink-0 bg-blue-500"
          />
          <h3 className="font-semibold text-blue-900 text-sm lg:text-base xl:text-lg truncate">{column.title}</h3>
          <span className="bg-white text-blue-600 text-xs lg:text-sm px-2 lg:px-2.5 xl:px-3 py-1 lg:py-1.5 rounded-full font-medium flex-shrink-0 border border-blue-200">
            {columnOpportunities.length}
          </span>
        </div>
        
        {/* Deal Value Badge */}
        <div className="bg-green-100 text-green-800 text-xs lg:text-sm px-2 lg:px-2.5 xl:px-3 py-1 lg:py-1.5 rounded-full font-medium border border-green-300 flex-shrink-0">
          {formatCurrency(totalDealValue)}
        </div>
      </div>
      
      {/* Selection toolbar */}
      {isSelectionMode && selectedOpportunityIds.size > 0 && (
        <div className="mb-3 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
          <div className="text-sm text-blue-800">
            {selectedOpportunityIds.size} opportunity{selectedOpportunityIds.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllOpportunities}
            >
              Select All
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={applyTagsToSelectedOpportunities}>
                  Apply Selected Tags
                </DropdownMenuItem>
                <DropdownMenuItem onClick={removeTagsFromSelectedOpportunities}>
                  Remove Selected Tags
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
      
      {/* Tag selector for bulk operations */}
      {isSelectionMode && selectedOpportunityIds.size > 0 && (
        <div className="mb-3">
          <div className="text-sm text-muted-foreground mb-1">Select tags for bulk operations:</div>
          <div className="text-xs text-muted-foreground p-2 border rounded bg-muted">
            Tag selector would appear here (using SalesTagSelector component)
          </div>
        </div>
      )}
      
      {/* Bulk operation progress */}
      {bulkOperationProgress !== null && (
        <div className="mb-3 p-2 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-blue-800">Processing bulk operation...</span>
            <span className="text-sm text-blue-800">{Math.round(bulkOperationProgress)}%</span>
          </div>
          <Progress value={bulkOperationProgress} className="h-2" />
        </div>
      )}
      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-grow space-y-2 lg:space-y-3 xl:space-y-4 min-h-0 rounded-lg lg:rounded-xl p-2 lg:p-3 xl:p-4
            ${
              snapshot.isDraggingOver
                ? 'bg-blue-50 border-2 border-blue-300 border-dashed'
                : 'border-2 border-transparent'
            }`}
          >
            {/* Opportunities - Organizadas por projeto se for coluna fechada */}
            {isClosedColumn && groupedOpportunities ? (
              <>
                {/* Render project headers and opportunities */}
                {Object.entries(groupedOpportunities).map(([projectId, projectOpportunities]) => {
                  const project = projects.find(p => p.id === projectId);
                  // Default to collapsed if not explicitly opened
                  const isCollapsed = !collapsedProjects.has(`open-${projectId}`);
                  
                  return (
                    <div key={`project-${projectId}`}>
                      {/* Project header */}
                      <div 
                        className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors mb-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleProjectCollapse(projectId);
                        }}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-blue-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-blue-400" />
                        )}
                        
                        {isCollapsed ? (
                          <Folder className="w-4 h-4 text-blue-400" />
                        ) : (
                          <FolderOpen className="w-4 h-4 text-blue-400" />
                        )}
                        
                        {project ? (
                          <ProjectBadge project={project} />
                        ) : (
                          <span className="text-sm text-blue-600 font-medium">Sem Projeto</span>
                        )}
                        
                        <span className="text-xs text-blue-400 ml-auto">
                          {projectOpportunities.length} oportunidade{projectOpportunities.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {/* Project opportunities */}
                      {!isCollapsed && (
                        <List
                          height={Math.min(400, projectOpportunities.length * 120)}
                          itemCount={projectOpportunities.length}
                          itemSize={120}
                          itemData={{
                            opportunities: projectOpportunities,
                            tags,
                            taskTags,
                            profiles,
                            isPropostaColumn,
                            handleGenerateProposal,
                            onOpportunityClick,
                            isSelectionMode,
                            selectedOpportunityIds,
                            toggleOpportunitySelection
                          }}
                          width="100%"
                        >
                          {OpportunityItem}
                        </List>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              /* Regular opportunities list */
              <List
                height={400}
                itemCount={columnOpportunities.length}
                itemSize={120}
                itemData={{
                  opportunities: columnOpportunities,
                  tags,
                  taskTags,
                  profiles,
                  isPropostaColumn,
                  handleGenerateProposal,
                  onOpportunityClick,
                  isSelectionMode,
                  selectedOpportunityIds,
                  toggleOpportunitySelection
                }}
                width="100%"
              >
                {OpportunityItem}
              </List>
            )}
            
            {provided.placeholder}
            
            {/* Add New Opportunity */}
            {isAdding ? (
              <div className="bg-white p-3 lg:p-4 rounded-lg lg:rounded-xl border-2 border-blue-300">
                <input
                  type="text"
                  value={newOpportunityTitle}
                  onChange={(e) => setNewOpportunityTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Digite o título da oportunidade..."
                  className="w-full text-sm lg:text-base border-none outline-none resize-none text-blue-900 placeholder-blue-400"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddOpportunity}
                    disabled={isCreating}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Criando...' : 'Adicionar'}
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewOpportunityTitle('');
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors border border-blue-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full p-3 lg:p-4 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg lg:rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2 text-sm lg:text-base"
              >
                <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                Adicionar oportunidade
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
  
  // Adicionar o modal de geração de proposta ao final do componente
  return (
    <>
      {renderedContent}
      {isProposalModalOpen && selectedOpportunity && (
        <GenerateProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => {
            setIsProposalModalOpen(false);
            setSelectedOpportunity(null);
          }}
          opportunity={selectedOpportunity}
        />
      )}
    </>
  );
};

export default React.memo(CRMKanbanColumnComponent);