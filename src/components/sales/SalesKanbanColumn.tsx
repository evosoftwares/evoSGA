import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, ChevronDown, ChevronRight, FolderOpen, Folder, DollarSign, TrendingUp, Target } from 'lucide-react';
import OpportunityCard from './OpportunityCard';
import CreateOpportunityModal from './CreateOpportunityModal';
import { ProjectBadge } from '@/components/projects/ProjectBadge';
import { SalesColumn, SalesOpportunity, SalesTag, SalesOpportunityTag, Project, Profile } from '@/types/database';

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

interface SalesKanbanColumnProps {
  column: SalesColumn;
  opportunities: SalesOpportunity[];
  tags: SalesTag[];
  opportunityTags: SalesOpportunityTag[];
  projects: Project[];
  profiles: Profile[];
  columns: SalesColumn[];
  commentCounts: Record<string, number>;
  onAddOpportunity: (data: CreateOpportunityData) => Promise<void>;
  onOpportunityClick: (opportunity: SalesOpportunity) => void;
}

const SalesKanbanColumn: React.FC<SalesKanbanColumnProps> = ({ 
  column, 
  opportunities, 
  tags, 
  opportunityTags, 
  projects,
  profiles,
  columns,
  commentCounts,
  onAddOpportunity,
  onOpportunityClick
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newOpportunityTitle, setNewOpportunityTitle] = useState('');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Sort opportunities by position with fallback to created_at for consistency
  const columnOpportunities = opportunities
    .filter(opportunity => opportunity.column_id === column.id)
    .sort((a, b) => {
      // Primary sort: position
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      // Fallback sort: created_at for opportunities with same position
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  // Check if this is a completed column (won or lost)
  const isCompletedColumn = column.title.toLowerCase().includes('fechado') || 
                           column.title.toLowerCase().includes('ganho') ||
                           column.title.toLowerCase().includes('perdido') ||
                           column.title.toLowerCase().includes('won') ||
                           column.title.toLowerCase().includes('lost');

  // Group opportunities by project for completed columns
  const opportunitiesByProject = useMemo(() => {
    if (!isCompletedColumn) {
      return { ungrouped: columnOpportunities };
    }

    const grouped: Record<string, SalesOpportunity[]> = {};
    const ungrouped: SalesOpportunity[] = [];

    columnOpportunities.forEach(opportunity => {
      if (opportunity.project_id) {
        if (!grouped[opportunity.project_id]) {
          grouped[opportunity.project_id] = [];
        }
        grouped[opportunity.project_id].push(opportunity);
      } else {
        ungrouped.push(opportunity);
      }
    });

    return { ...grouped, ungrouped };
  }, [columnOpportunities, isCompletedColumn]);

  // Calculate total value and count for the column
  const columnMetrics = useMemo(() => {
    const totalValue = columnOpportunities.reduce((sum, opp) => sum + opp.deal_value, 0);
    const count = columnOpportunities.length;
    const avgProbability = count > 0 ? columnOpportunities.reduce((sum, opp) => sum + opp.probability, 0) / count : 0;
    
    return { totalValue, count, avgProbability };
  }, [columnOpportunities]);

  // Format currency
  const formatCurrency = (value: number, currency: string = 'BRL') => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toggleProjectCollapse = useCallback((projectId: string) => {
    setCollapsedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  }, []);

  const handleAddOpportunity = useCallback(async () => {
    if (newOpportunityTitle.trim()) {
      await onAddOpportunity({
        title: newOpportunityTitle.trim(),
        column_id: column.id,
        deal_value: 0,
        currency: 'BRL',
        probability: 50
      });
      setNewOpportunityTitle('');
      setIsAdding(false);
    }
  }, [newOpportunityTitle, column.id, onAddOpportunity]);

  const handleCreateOpportunity = useCallback(async (data: CreateOpportunityData) => {
    await onAddOpportunity(data);
    setIsCreateModalOpen(false);
  }, [onAddOpportunity]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddOpportunity();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewOpportunityTitle('');
    }
  }, [handleAddOpportunity]);

  // Get column background color
  const getColumnColor = () => {
    // Always return white background with a light blue border
    return 'bg-white border-blue-100';
  };

  // Render opportunities by project (for completed columns)
  const renderOpportunitiesByProject = () => {
    return Object.entries(opportunitiesByProject).map(([projectKey, projectOpportunities]) => {
      if (projectKey === 'ungrouped') {
        return projectOpportunities.map((opportunity, index) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            index={index}
            onClick={() => onOpportunityClick(opportunity)}
            teamMembers={profiles}
            projects={projects}
            tags={tags}
            opportunityTags={opportunityTags}
            columns={columns}
            commentCounts={commentCounts}
          />
        ));
      }

      const project = projects.find(p => p.id === projectKey);
      if (!project) return null;

      const isCollapsed = collapsedProjects.has(projectKey);
      const projectTotal = projectOpportunities.reduce((sum, opp) => sum + opp.deal_value, 0);

      return (
        <div key={projectKey} className="mb-4">
          {/* Project Header */}
          <div 
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors mb-2"
            onClick={() => toggleProjectCollapse(projectKey)}
          >
            <div className="flex items-center gap-3">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
              {isCollapsed ? (
                <Folder className="w-4 h-4 text-gray-500" />
              ) : (
                <FolderOpen className="w-4 h-4 text-gray-500" />
              )}
              <ProjectBadge project={project} size="sm" />
              <span className="text-sm font-medium text-gray-700">
                {projectOpportunities.length} oportunidade{projectOpportunities.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 px-2 py-1 rounded-full">
                <span className="text-xs font-semibold text-emerald-700">
                  {formatCurrency(projectTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Project Opportunities */}
          {!isCollapsed && (
            <div className="space-y-2 ml-6">
              {projectOpportunities.map((opportunity, index) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  index={index}
                  onClick={() => onOpportunityClick(opportunity)}
                  teamMembers={profiles}
                  projects={projects}
                  tags={tags}
                  opportunityTags={opportunityTags}
                  columns={columns}
                  commentCounts={commentCounts}
                />
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  // Auto-focus input when adding
  useEffect(() => {
    if (isAdding) {
      const input = document.querySelector(`input[data-column="${column.id}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }
  }, [isAdding, column.id]);

  return (
    <div className={`bg-white rounded-xl border-2 ${getColumnColor()} shadow-sm h-full flex flex-col min-w-72 max-w-72`}>
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <h3 className="font-semibold text-gray-900 text-sm">{column.title}</h3>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
              {columnMetrics.count}
            </span>
          </div>
        </div>
        
        {/* Column Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Total</span>
            </div>
            <p className="text-sm font-bold text-blue-800 mt-0.5">
              {formatCurrency(columnMetrics.totalValue)}
            </p>
          </div>
          
          <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Média</span>
            </div>
            <p className="text-sm font-bold text-blue-800 mt-0.5">
              {columnMetrics.avgProbability.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Add Opportunity Buttons */}
        {!isCompletedColumn && (
          <div className="space-y-2">
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors border border-dashed border-gray-300 hover:border-gray-400"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Adicionar Rápido</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
            >
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Nova Oportunidade</span>
            </button>
          </div>
        )}
      </div>

      {/* Column Content */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 p-4 overflow-y-auto"
          >
            {/* Add Opportunity Input */}
            {isAdding && (
              <div className="mb-3">
                <input
                  type="text"
                  value={newOpportunityTitle}
                  onChange={(e) => setNewOpportunityTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={() => {
                    if (!newOpportunityTitle.trim()) {
                      setIsAdding(false);
                    }
                  }}
                  placeholder="Título da oportunidade..."
                  data-column={column.id}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleAddOpportunity}
                    className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewOpportunityTitle('');
                    }}
                    className="px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Opportunities */}
            {isCompletedColumn ? (
              renderOpportunitiesByProject()
            ) : (
              columnOpportunities.map((opportunity, index) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  index={index}
                  onClick={() => onOpportunityClick(opportunity)}
                  teamMembers={profiles}
                  projects={projects}
                  tags={tags}
                  opportunityTags={opportunityTags}
                  columns={columns}
                  commentCounts={commentCounts}
                />
              ))
            )}
            
            {provided.placeholder}

            {/* Empty State */}
            {columnOpportunities.length === 0 && !isAdding && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <DollarSign className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-sm text-gray-500">
                  {isCompletedColumn ? 'Nenhuma oportunidade fechada' : 'Nenhuma oportunidade'}
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Create Opportunity Modal */}
      <CreateOpportunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateOpportunity}
        columns={columns}
        projects={projects}
        profiles={profiles}
        initialColumnId={column.id}
      />
    </div>
  );
};

export default SalesKanbanColumn;