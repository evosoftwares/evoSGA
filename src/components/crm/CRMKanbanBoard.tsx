import React, { useState, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { createLogger } from '@/utils/logger';
import { useToast } from '@/hooks/use-toast';
import { useDragAndDropFixed } from '../../hooks/useDragAndDropFixed';
import { SalesColumn, SalesOpportunity, Profile, Project, Tag, TaskTag } from '@/types/database';
import CRMKanbanColumn from '@/components/crm/CRMKanbanColumn';
import { CRMTaskDetailModal } from '@/components/crm/CRMTaskDetailModal';
import { SecurityAlert } from '@/components/ui/security-alert';
import CRMProjectsSummary from '@/components/crm/CRMProjectsSummary';
import CRMTeamMember from '@/components/crm/CRMTeamMember';
import { Trophy, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';

const logger = createLogger('CRMKanbanBoard');

interface CRMKanbanBoardProps {
  columns: SalesColumn[];
  opportunities: SalesOpportunity[];
  profiles: Profile[];
  projects: Project[];
  tags: Tag[];
  taskTags: TaskTag[];
  updateOpportunity: (opportunityId: string, updates: Partial<Omit<SalesOpportunity, 'id'>>) => Promise<void>;
  createOpportunity: (opportunityData: Partial<SalesOpportunity>) => Promise<void>;
  deleteOpportunity: (opportunityId: string) => Promise<void>;
  refreshData: () => void;
}

const CRMKanbanBoard: React.FC<CRMKanbanBoardProps> = ({
  columns,
  opportunities,
  profiles,
  projects,
  tags,
  taskTags,
  updateOpportunity,
  createOpportunity,
  deleteOpportunity,
  refreshData
}) => {
  const { toast } = useToast();
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [isSecurityAlertOpen, setIsSecurityAlertOpen] = useState(false);
  const [securityAlertMessage, setSecurityAlertMessage] = useState('');
  const [securityAlertProfile, setSecurityAlertProfile] = useState<Profile | null>(null);
  
  // Estados de celebração avançada (como no kanban principal)
  const [celebrationState, setCelebrationState] = useState({
    showConfetti: false,
    showCelebrationMessage: false,
    celebrationMessage: '',
    completedOpportunity: null as SalesOpportunity | null,
    isMessageExiting: false,
    dealValue: 0,
    assigneeName: ''
  });

  // Calcular estatísticas dos membros da equipe
  const teamMembersWithStats = useMemo(() => {
    return profiles.map(member => {
      const memberOpportunities = opportunities.filter(opp => opp.assignee === member.id);
      const totalValue = memberOpportunities.reduce((sum, opp) => sum + (opp.deal_value || 0), 0);
      const averageProbability = memberOpportunities.length > 0 
        ? memberOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / memberOpportunities.length
        : 0;

      return {
        ...member,
        opportunityCount: memberOpportunities.length,
        totalValue,
        averageProbability
      };
    }).filter(member => member.opportunityCount > 0); // Só mostrar membros com oportunidades
  }, [profiles, opportunities]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const opportunityId = draggableId;
    const newColumnId = destination.droppableId;
    const newPosition = destination.index;

    try {
      // Optimized approach: Batch update positions
      const sourceColumnId = source.droppableId;
      
      // Get all opportunities from both source and destination columns
      const sourceOpportunities = opportunities.filter(opp => opp.column_id === sourceColumnId);
      const destinationOpportunities = opportunities.filter(opp => opp.column_id === newColumnId);
      
      // Create a map to track all position updates
      const positionUpdates: Array<{id: string, position: number, column_id: string}> = [];
      
      if (sourceColumnId === newColumnId) {
        // Moving within the same column - reposition only
        const updatedOpportunities = [...sourceOpportunities];
        const movedOpportunity = updatedOpportunities.find(opp => opp.id === opportunityId);
        
        if (movedOpportunity) {
          // Remove from current position
          const currentIndex = updatedOpportunities.findIndex(opp => opp.id === opportunityId);
          updatedOpportunities.splice(currentIndex, 1);
          
          // Insert at new position
          updatedOpportunities.splice(newPosition, 0, movedOpportunity);
          
          // Generate position updates
          updatedOpportunities.forEach((opp, index) => {
            if (opp.position !== index) {
              positionUpdates.push({
                id: opp.id,
                position: index,
                column_id: opp.column_id
              });
            }
          });
        }
      } else {
        // Moving between columns
        // Update the moved opportunity
        positionUpdates.push({
          id: opportunityId,
          position: newPosition,
          column_id: newColumnId
        });
        
        // Update positions in destination column
        const updatedDestination = [...destinationOpportunities];
        const opportunityToMove = opportunities.find(opp => opp.id === opportunityId);
        
        if (opportunityToMove) {
          // Insert at new position
          updatedDestination.splice(newPosition, 0, opportunityToMove);
          
          // Generate position updates for destination column
          updatedDestination.forEach((opp, index) => {
            if (opp.position !== index || opp.column_id !== newColumnId) {
              positionUpdates.push({
                id: opp.id,
                position: index,
                column_id: newColumnId
              });
            }
          });
        }
        
        // Update positions in source column (if different)
        if (sourceColumnId !== newColumnId) {
          const updatedSource = sourceOpportunities.filter(opp => opp.id !== opportunityId);
          updatedSource.forEach((opp, index) => {
            if (opp.position !== index) {
              positionUpdates.push({
                id: opp.id,
                position: index,
                column_id: sourceColumnId
              });
            }
          });
        }
      }
      
      // Apply all updates in parallel for better performance
      await Promise.all(
        positionUpdates.map(update =>
          updateOpportunity(update.id, {
            position: update.position,
            column_id: update.column_id
          })
        )
      );

      // Verificar se a oportunidade foi movida para uma coluna de "fechado" ou "ganho"
      const destinationColumn = columns.find(col => col.id === newColumnId);
      const movedOpportunity = opportunities.find(opp => opp.id === opportunityId);
      
      if (destinationColumn && movedOpportunity) {
        const isClosedColumn = destinationColumn.title?.toLowerCase().includes('fechado') || 
                              destinationColumn.title?.toLowerCase().includes('ganho') ||
                              destinationColumn.title?.toLowerCase().includes('closed') ||
                              destinationColumn.title?.toLowerCase().includes('won');
        
        if (isClosedColumn) {
          // Encontrar o responsável
          const assignee = profiles.find(profile => profile.id === movedOpportunity.assignee);
          const assigneeName = assignee ? assignee.name : 'Equipe';
          
          // Configurar celebração
          setCelebrationState({
            showConfetti: true,
            showCelebrationMessage: true,
            isMessageExiting: false,
            celebrationMessage: '🎉 Oportunidade Fechada!',
            completedOpportunity: movedOpportunity,
            dealValue: movedOpportunity.deal_value || 0,
            assigneeName: assigneeName
          });

          // Programar a saída da mensagem
          setTimeout(() => {
            setCelebrationState(prev => ({
              ...prev,
              isMessageExiting: true
            }));
          }, 3000);

          // Limpar tudo após a animação
          setTimeout(() => {
            setCelebrationState({
              showConfetti: false,
              showCelebrationMessage: false,
              isMessageExiting: false,
              celebrationMessage: '',
              completedOpportunity: null,
              dealValue: 0,
              assigneeName: ''
            });
          }, 4000);
        }
      }

      logger.info('Opportunity moved successfully', {
        opportunityId,
        newColumnId,
        newPosition: destination.index
      });
    } catch (error) {
      logger.error('Failed to move opportunity', { error, opportunityId, newColumnId });
      toast({
        title: "Erro ao mover oportunidade",
        description: "Não foi possível mover a oportunidade. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Usar o hook de drag-and-drop melhorado
  const { handleDragEnd: handleDragEndFixed, handleDragStart } = useDragAndDropFixed({
    onDragEnd: handleDragEnd
  });

  const handleOpportunityClick = (opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleCreateOpportunity = (columnId: string) => {
    setSelectedOpportunity({
      id: '',
      title: '',
      description: '',
      column_id: columnId,
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignee: null,
      deal_value: 0,
      currency: 'BRL',
      probability: 50,
      expected_close_date: null,
      source: null,
      client_name: null,
      client_email: null,
      client_phone: null,
      client_company: null,
      client_website: null,
      client_industry: null,
      next_contact_date: null,
      contact_reminder_notes: null,
      project_id: null
    } as SalesOpportunity);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOpportunity(undefined);
    setIsCreating(false);
  };

  const getOpportunitiesForColumn = (columnId: string) => {
    return opportunities
      .filter(opportunity => opportunity.column_id === columnId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Epic Celebration Effects - Single Intense Confetti */}
      {celebrationState.showConfetti && typeof window !== 'undefined' && (
        <Confetti
          width={window.innerWidth || 1200}
          height={window.innerHeight || 800}
          recycle={false}
          numberOfPieces={800}
          gravity={0.15}
          colors={[
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', 
            '#98d8c8', '#f7dc6f', '#e74c3c', '#f39c12', '#27ae60', '#3498db', 
            '#9b59b6', '#e67e22', '#ffd700', '#ffed4e', '#f1c40f'
          ]}
          wind={0.05}
          initialVelocityX={8}
          initialVelocityY={-20}
          tweenDuration={5000}
        />
      )}
      
      {/* Celebration Message Overlay */}
      {celebrationState.showCelebrationMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`relative ${celebrationState.isMessageExiting ? 'animate-fadeOutDown' : ''}`}>
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-3xl blur-lg opacity-75 animate-glowPulse scale-110"></div>
            
            {/* Main celebration card */}
            <div className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white px-8 py-6 rounded-3xl shadow-2xl transform">
              
              {/* Icon group with enhanced staggered animations */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="h-8 w-8 text-yellow-300 animate-smoothBounce" />
                <Sparkles className="h-6 w-6 text-yellow-200 animate-sparkleRotate" />
              </div>
              
              {/* Text content with smooth animations */}
              <div className="text-center">
                <h3 className={`text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent ${
                  celebrationState.isMessageExiting ? 'animate-fadeOutDown' : ''
                }`} style={{animationDelay: celebrationState.isMessageExiting ? '0s' : '0.3s'}}>
                  {celebrationState.celebrationMessage}
                </h3>
                {celebrationState.completedOpportunity && (
                  <p className={`text-lg opacity-90 font-medium bg-gradient-to-r from-yellow-100 to-gray-100 bg-clip-text text-transparent ${
                    celebrationState.isMessageExiting ? 'animate-fadeOutDown' : ''
                  }`} style={{animationDelay: celebrationState.isMessageExiting ? '0.1s' : '0.5s'}}>
                    "{celebrationState.completedOpportunity.title}"
                  </p>
                )}
                
                {/* Deal value message */}
                {celebrationState.dealValue > 0 && celebrationState.assigneeName && (
                  <div className={`mt-3 p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm ${
                    celebrationState.isMessageExiting ? 'animate-fadeOutDown' : ''
                  }`} style={{animationDelay: celebrationState.isMessageExiting ? '0.2s' : '0.7s'}}>
                    <p className="text-sm font-semibold text-yellow-100">
                      💰 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(celebrationState.dealValue)} conquistados!
                    </p>
                    <p className="text-xs text-yellow-200 mt-1">
                      Parabéns, {celebrationState.assigneeName}!
                    </p>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* CRM Projects Summary Section */}
      <CRMProjectsSummary 
        opportunities={opportunities}
        projects={projects}
        loading={false}
        error={null}
      />

      {/* CRM Team Members Section */}
      {teamMembersWithStats.length > 0 && (
        <div className="flex-shrink-0 space-y-3 lg:space-y-4">
          <h2 className="text-base lg:text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Equipe CRM ({teamMembersWithStats.length})
          </h2>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
            {teamMembersWithStats.map((member) => (
              <CRMTeamMember key={member.id} member={member} opportunities={opportunities} />
            ))}
          </div>
        </div>
      )}

      {/* CRM Kanban Board */}
      <DragDropContext 
        onDragEnd={handleDragEndFixed}
        onDragStart={handleDragStart}
      >
        <div className="flex-grow w-full">
          <div className="flex gap-4 lg:gap-6 pb-4" style={{ height: 'calc(100vh - 350px)', overflowX: 'auto', overflowY: 'hidden' }}>
            {columns.map((column, index) => (
              <div 
                key={column.id} 
                className="w-[320px] lg:w-[350px] xl:w-[380px] flex-shrink-0 h-full"
              >
                <CRMKanbanColumn
                  key={column.id}
                  column={column}
                  opportunities={getOpportunitiesForColumn(column.id)}
                  profiles={profiles}
                  projects={projects}
                  tags={tags}
                  taskTags={taskTags}
                  onOpportunityClick={handleOpportunityClick}
                  onCreateOpportunity={handleCreateOpportunity}
                  createOpportunity={createOpportunity}
                />
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Modal de detalhes */}
      <CRMTaskDetailModal
        opportunity={selectedOpportunity}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        profiles={profiles}
        projects={projects}
        tags={tags}
        taskTags={taskTags}
        updateOpportunity={updateOpportunity}
        createOpportunity={createOpportunity}
        deleteOpportunity={deleteOpportunity}
        refreshData={refreshData}
      />

      {/* Alerta de segurança */}
      <SecurityAlert
        open={isSecurityAlertOpen}
        onOpenChange={setIsSecurityAlertOpen}
        onConfirm={() => {
          setIsSecurityAlertOpen(false);
          // Lógica de confirmação aqui
        }}
        title="Confirmação de Segurança"
        description={securityAlertMessage}
      />
    </div>
  );
};

export default CRMKanbanBoard;