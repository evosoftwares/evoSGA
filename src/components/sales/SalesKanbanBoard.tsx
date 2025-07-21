import React, { useState, useCallback, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { SalesColumn, SalesOpportunity, SalesTag, SalesOpportunityTag, Project, Profile } from '@/types/database';
import SalesKanbanColumn from './SalesKanbanColumn';
import OpportunityDetailModal from './OpportunityDetailModal';
import DeleteOpportunityConfirmationModal from './DeleteOpportunityConfirmationModal';

interface CreateOpportunityData {
  title: string;
  description?: string;
  column_id: string;
  deal_value?: number;
  currency?: string;
  probability?: number;
  assignee?: string;
  project_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  source?: string;
  expected_close_date?: string;
}

interface SalesKanbanBoardProps {
  columns: SalesColumn[];
  opportunities: SalesOpportunity[];
  tags: SalesTag[];
  opportunityTags: SalesOpportunityTag[];
  projects: Project[];
  profiles: Profile[];
  commentCounts: Record<string, number>;
  onMoveOpportunity: (opportunityId: string, destinationColumnId: string, newPosition: number) => Promise<void>;
  onAddOpportunity: (data: CreateOpportunityData) => Promise<void>;
  onUpdateOpportunity: (opportunityId: string, updates: Partial<SalesOpportunity>) => Promise<void>;
  onDeleteOpportunity: (opportunityId: string) => Promise<void>;
  onAddTag?: (opportunityId: string, tagId: string) => Promise<void>;
  onRemoveTag?: (opportunityId: string, tagId: string) => Promise<void>;
  selectedProjectId?: string;
}

const SalesKanbanBoard: React.FC<SalesKanbanBoardProps> = ({
  columns,
  opportunities,
  tags,
  opportunityTags,
  projects,
  profiles,
  commentCounts,
  onMoveOpportunity,
  onAddOpportunity,
  onUpdateOpportunity,
  onDeleteOpportunity,
  onAddTag,
  onRemoveTag,
  selectedProjectId
}) => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<SalesOpportunity | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

  // Filter opportunities by selected project if any
  const filteredOpportunities = useMemo(() => {
    if (!selectedProjectId) return opportunities;
    return opportunities.filter(opp => opp.project_id === selectedProjectId);
  }, [opportunities, selectedProjectId]);

  // Sort columns by position
  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.position - b.position);
  }, [columns]);

  // Calculate board metrics
  const boardMetrics = useMemo(() => {
    const totalValue = filteredOpportunities.reduce((sum, opp) => sum + opp.deal_value, 0);
    const totalCount = filteredOpportunities.length;
    
    // Calculate conversion rates between stages
    const stageMetrics = sortedColumns.map(column => {
      const stageOpportunities = filteredOpportunities.filter(opp => opp.column_id === column.id);
      const stageValue = stageOpportunities.reduce((sum, opp) => sum + opp.deal_value, 0);
      const stageCount = stageOpportunities.length;
      const avgProbability = stageCount > 0 ? stageOpportunities.reduce((sum, opp) => sum + opp.probability, 0) / stageCount : 0;
      
      return {
        columnId: column.id,
        columnTitle: column.title,
        count: stageCount,
        value: stageValue,
        avgProbability
      };
    });

    return { totalValue, totalCount, stageMetrics };
  }, [filteredOpportunities, sortedColumns]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // No destination or same position - no movement
    if (!destination || 
        (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const opportunityId = draggableId;
    const opportunity = opportunities.find(opp => opp.id === opportunityId);
    
    if (!opportunity) {
      console.error('Opportunity not found:', opportunityId);
      return;
    }

    // Check if opportunity is in a closed column and prevent movement
    const currentColumn = columns.find(col => col.id === opportunity.column_id);
    const isClosedColumn = currentColumn?.title?.toLowerCase().includes('fechado') ||
                          currentColumn?.title?.toLowerCase().includes('ganho') ||
                          currentColumn?.title?.toLowerCase().includes('perdido') ||
                          currentColumn?.title?.toLowerCase().includes('won') ||
                          currentColumn?.title?.toLowerCase().includes('lost');

    if (isClosedColumn) {
      console.log('Cannot move opportunities from closed columns');
      return;
    }

    try {
      await onMoveOpportunity(opportunityId, destination.droppableId, destination.index);
      
      // Show celebration for closed-won deals
      const destinationColumn = columns.find(col => col.id === destination.droppableId);
      const isWonColumn = destinationColumn?.title?.toLowerCase().includes('ganho') ||
                         destinationColumn?.title?.toLowerCase().includes('won');
      
      if (isWonColumn) {
        // Trigger celebration animation
        console.log('🎉 Deal closed successfully!');
        // You can add confetti or other celebration effects here
      }
    } catch (error) {
      console.error('Failed to move opportunity:', error);
    }
  }, [opportunities, columns, onMoveOpportunity]);

  const handleOpportunityClick = (opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedOpportunity(null);
    setIsDetailModalOpen(false);
  };

  const handleDeleteOpportunity = async () => {
    if (opportunityToDelete) {
      await onDeleteOpportunity(opportunityToDelete.id);
      setOpportunityToDelete(null);
      setIsDeleteConfirmationOpen(false);
      // Close detail modal if it's the same opportunity
      if (selectedOpportunity?.id === opportunityToDelete.id) {
        handleCloseDetailModal();
      }
    }
  };

  const handleDeleteClick = () => {
    if (selectedOpportunity) {
      setOpportunityToDelete(selectedOpportunity);
      setIsDeleteConfirmationOpen(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Board Header with Metrics */}
      <div className="flex-shrink-0 p-6 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h1>
            <p className="text-gray-600 mt-1">
              {selectedProjectId 
                ? `Projeto: ${projects.find(p => p.id === selectedProjectId)?.name || 'Projeto selecionado'}`
                : 'Todas as oportunidades'
              }
            </p>
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Pipeline</p>
                <p className="text-2xl font-bold text-blue-900">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(boardMetrics.totalValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Oportunidades</p>
                <p className="text-2xl font-bold text-emerald-900">{boardMetrics.totalCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-amber-900">
                  {boardMetrics.totalCount > 0 
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(boardMetrics.totalValue / boardMetrics.totalCount)
                    : 'R$ 0'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Prob. Média</p>
                <p className="text-2xl font-bold text-purple-900">
                  {boardMetrics.totalCount > 0 
                    ? Math.round(filteredOpportunities.reduce((sum, opp) => sum + opp.probability, 0) / boardMetrics.totalCount)
                    : 0
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="h-full overflow-x-auto">
            <div className="flex gap-6 p-6 h-full min-w-max">
              {sortedColumns.map((column) => (
                <SalesKanbanColumn
                  key={column.id}
                  column={column}
                  opportunities={filteredOpportunities}
                  tags={tags}
                  opportunityTags={opportunityTags}
                  projects={projects}
                  profiles={profiles}
                  columns={columns}
                  commentCounts={commentCounts}
                  onAddOpportunity={onAddOpportunity}
                  onOpportunityClick={handleOpportunityClick}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* Opportunity Detail Modal */}
      {selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          onUpdate={(updates) => onUpdateOpportunity(selectedOpportunity.id, updates)}
          onDelete={handleDeleteClick}
          onAddTag={onAddTag ? (tagId) => onAddTag(selectedOpportunity.id, tagId) : undefined}
          onRemoveTag={onRemoveTag ? (tagId) => onRemoveTag(selectedOpportunity.id, tagId) : undefined}
          tags={tags}
          opportunityTags={opportunityTags}
          projects={projects}
          profiles={profiles}
          columns={columns}
        />
      )}

      <DeleteOpportunityConfirmationModal
        opportunity={opportunityToDelete}
        isOpen={isDeleteConfirmationOpen}
        onClose={() => {
          setOpportunityToDelete(null);
          setIsDeleteConfirmationOpen(false);
        }}
        onConfirm={handleDeleteOpportunity}
      />
    </div>
  );
};

export default SalesKanbanBoard;