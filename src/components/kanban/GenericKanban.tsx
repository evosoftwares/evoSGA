import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Trophy, Star, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import { createLogger } from '@/utils/logger';
import { Task, Column } from '@/types/database';
import { SecurityAlert } from '@/components/ui/security-alert';
import ErrorBoundary from '../ErrorBoundary';
import { GenericKanbanProps, CelebrationConfig } from './types';

// Default components imports
import DefaultTaskCard from './TaskCard';
import DefaultKanbanColumn from './KanbanColumn';
import DefaultTeamMember from '../TeamMember';
import DefaultProjectsSummary from '../ProjectsSummary';

const logger = createLogger('GenericKanban');

const GenericKanban: React.FC<GenericKanbanProps> = ({
  useDataHook,
  selectedProjectId,
  projects = [],
  TaskCardComponent = DefaultTaskCard,
  ColumnComponent = DefaultKanbanColumn,
  onTaskClick,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  showTeamMembers = true,
  teamMembersTitle = "Equipe",
  getTeamMemberStats,
  showProjectsSummary = true,
  ProjectsSummaryComponent = DefaultProjectsSummary,
  celebrationConfig = { enabled: true },
  useCommentCounts,
  useSecurityCheck,
  className = "",
  columnClassName = "",
  taskCardClassName = "",
  enableDragAndDrop = true,
  enableTaskCreation = true,
  enableProjectGrouping = true,
  enableRealTimeUpdates = true,
  LoadingComponent,
  ErrorComponent,
  headerActions,
  getColumnRestrictions
}) => {
  // Use the provided data hook
  const {
    columns,
    tasks,
    profiles,
    tags,
    taskTags,
    loading,
    error,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    refreshData
  } = useDataHook(selectedProjectId);

  // Security check hook (optional)
  const securityHook = useSecurityCheck?.() || {
    isSecurityAlertOpen: false,
    showSecurityAlert: () => {},
    hideSecurityAlert: () => {},
    confirmedCallback: null,
    securityTitle: "",
    securityDescription: ""
  };

  // Comment counts hook (optional)
  const taskIds = useMemo(() => tasks.map(task => task.id), [tasks]);
  const commentCountsHook = useCommentCounts?.(taskIds);
  const commentCounts = commentCountsHook?.data || {};

  // Internal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [creatingTaskColumn, setCreatingTaskColumn] = useState<Column['id'] | null>(null);
  const [celebrationState, setCelebrationState] = useState({
    showConfetti: false,
    showCelebrationMessage: false,
    isMessageExiting: false,
    completedTask: null as Task | null,
    celebrationMessage: "",
    pointsAwarded: 0,
    assigneeName: ""
  });

  // Refs for cleanup
  const celebrationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Wrapper functions for task operations
  const updateTaskWrapper = useCallback(
    async (taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
      await updateTask({ 
        taskId, 
        updates, 
        projectId: selectedProjectId || null 
      });
      onTaskUpdate?.(taskId, updates as Partial<Task>);
    },
    [updateTask, selectedProjectId, onTaskUpdate]
  );

  const deleteTaskWrapper = useCallback(
    async (taskId: string) => {
      await deleteTask({ 
        taskId, 
        projectId: selectedProjectId || null 
      });
      onTaskDelete?.(taskId);
    },
    [deleteTask, selectedProjectId, onTaskDelete]
  );

  // Cleanup function for timeouts
  const clearAllTimeouts = useCallback(() => {
    celebrationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    celebrationTimeouts.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      celebrationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      celebrationTimeouts.current = [];
    };
  }, []);

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!enableDragAndDrop) return;

    const { destination, source, draggableId } = result;

    // Basic validations
    if (!destination) {
      logger.debug('Drag cancelled: no destination');
      return;
    }
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      logger.debug('Drag cancelled: same position');
      return;
    }

    // Find involved columns
    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destinationColumn = columns.find(col => col.id === destination.droppableId);
    
    if (!sourceColumn || !destinationColumn) {
      logger.error('Invalid columns in drag operation', { sourceColumn, destinationColumn });
      return;
    }

    // Check column restrictions
    const sourceRestrictions = getColumnRestrictions?.(sourceColumn) || { allowDragOut: true, allowDragIn: true, allowTaskCreation: true };
    const destRestrictions = getColumnRestrictions?.(destinationColumn) || { allowDragOut: true, allowDragIn: true, allowTaskCreation: true };

    if (!sourceRestrictions.allowDragOut) {
      logger.info('Drag blocked: Source column does not allow drag out');
      return;
    }

    if (!destRestrictions.allowDragIn) {
      logger.info('Drag blocked: Destination column does not allow drag in');
      return;
    }

    // Find the task being moved
    const taskBeingMoved = tasks.find(task => task.id === draggableId);
    if (!taskBeingMoved) {
      logger.error('Task not found for drag operation', draggableId);
      return;
    }

    // Check if destination is a success/completed column for celebration
    const isDestinationSuccess = destinationColumn?.title?.toLowerCase().includes('sucesso') || 
                                destinationColumn?.title?.toLowerCase().includes('success') ||
                                destinationColumn?.title?.toLowerCase().includes('concluído') ||
                                destinationColumn?.title?.toLowerCase().includes('concluido') ||
                                destinationColumn?.title?.toLowerCase().includes('completed') ||
                                destinationColumn?.title?.toLowerCase().includes('done');

    logger.info('Moving task', {
      taskId: draggableId,
      taskTitle: taskBeingMoved.title,
      from: { 
        columnId: source.droppableId, 
        columnTitle: sourceColumn.title,
        index: source.index 
      },
      to: { 
        columnId: destination.droppableId, 
        columnTitle: destinationColumn.title,
        index: destination.index 
      },
      isDestinationSuccess
    });

    try {
      // Execute the move
      moveTask(
        draggableId,
        source.droppableId,
        destination.droppableId,
        destination.index
      );

      // Trigger celebration if enabled and moving to success column
      if (celebrationConfig.enabled && isDestinationSuccess) {
        triggerEpicCelebration(taskBeingMoved);
      }
    } catch (error) {
      logger.error('Error during task move', error);
    }
  };

  // Epic celebration sequence function
  const triggerEpicCelebration = useCallback(async (completedTask: Task | null) => {
    if (!celebrationConfig.enabled) return;
    
    // Clear any existing timeouts first
    clearAllTimeouts();
    
    // Generate celebration message
    const celebrationMessage = celebrationConfig.getCustomMessage?.(completedTask!) ||
      (celebrationConfig.messages?.[Math.floor(Math.random() * celebrationConfig.messages.length)]) ||
      "🎉 Tarefa concluída com sucesso!";
    
    // Get assignee information
    let pointsAwarded = 0;
    let assigneeName = "";
    
    if (completedTask?.assignee && celebrationConfig.showAssignee) {
      const assignee = profiles.find(p => p.id === completedTask.assignee);
      assigneeName = assignee?.name || "";
    }

    if (celebrationConfig.showPoints) {
      pointsAwarded = completedTask?.function_points || 0;
    }
    
    // Start celebration
    setCelebrationState({
      showConfetti: celebrationConfig.confettiEnabled !== false,
      showCelebrationMessage: true,
      isMessageExiting: false,
      completedTask,
      celebrationMessage,
      pointsAwarded,
      assigneeName
    });

    const duration = celebrationConfig.duration || 5000;

    // Start exit animation
    const exitTimeout = setTimeout(() => {
      setCelebrationState(prev => ({
        ...prev,
        isMessageExiting: true
      }));
    }, duration - 500);
    celebrationTimeouts.current.push(exitTimeout);

    // Hide celebration message
    const hideTimeout = setTimeout(() => {
      setCelebrationState(prev => ({
        ...prev,
        showCelebrationMessage: false,
        isMessageExiting: false
      }));
    }, duration);
    celebrationTimeouts.current.push(hideTimeout);

    // Stop confetti
    const cleanupTimeout = setTimeout(() => {
      setCelebrationState({
        showConfetti: false,
        showCelebrationMessage: false,
        isMessageExiting: false,
        completedTask: null,
        celebrationMessage: "",
        pointsAwarded: 0,
        assigneeName: ""
      });
    }, duration + 5000);
    celebrationTimeouts.current.push(cleanupTimeout);
  }, [celebrationConfig, profiles, clearAllTimeouts]);

  // Handle add task
  const handleAddTask = (columnId: string) => {
    if (!enableTaskCreation) return;
    
    setCreatingTaskColumn(columnId);
    setIsCreatingTask(true);
  };

  const handleQuickAddTask = async (columnId: string, title: string) => {
    if (!enableTaskCreation) return;
    
    logger.info('Creating quick task', { columnId, title });
    try {
      await createTask({ taskData: { title }, columnId, projectId: selectedProjectId });
      onTaskCreate?.({ title });
      logger.info('Task creation completed');
    } catch (error) {
      logger.error('Task creation failed', error);
    }
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    if (!creatingTaskColumn || !enableTaskCreation) return;

    const performCreate = async () => {
      logger.info('Creating task', { columnId: creatingTaskColumn, data: taskData });
      await createTask({ taskData, columnId: creatingTaskColumn, projectId: selectedProjectId });
      onTaskCreate?.(taskData);
      setIsCreatingTask(false);
      setCreatingTaskColumn(null);
    };

    if (securityHook.showSecurityAlert) {
      securityHook.showSecurityAlert(
        performCreate,
        'Confirmar Criação',
        'Digite a senha para confirmar a criação da tarefa:'
      );
    } else {
      await performCreate();
    }
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    onTaskClick?.(task);
  };

  // Calculate team member stats
  const teamMembersWithStats = useMemo(() => {
    if (!showTeamMembers) return [];
    
    if (getTeamMemberStats) {
      return getTeamMemberStats(profiles, tasks, columns);
    }

    // Default stats calculation
    const completedColumnIds = new Set(
      columns
        .filter(col => {
          const title = col.title?.toLowerCase() || '';
          return (
            title.includes('concluído') ||
            title.includes('concluido') ||
            title.includes('completed') ||
            title.includes('done') ||
            title.includes('sucesso') ||
            title.includes('success')
          );
        })
        .map(col => col.id)
    );

    return profiles.map(member => {
      const memberTasks = tasks.filter(task => task.assignee === member.id);
      const activeTasks = memberTasks.filter(
        task => !completedColumnIds.has(task.column_id)
      );
      const currentTaskPoints = activeTasks.reduce(
        (sum, task) => sum + (task.function_points || 0),
        0
      );

      return {
        ...member,
        taskCount: activeTasks.length,
        functionPoints: currentTaskPoints,
        earnedPoints: 0, // Would need additional hook for this
      };
    });
  }, [profiles, tasks, columns, showTeamMembers, getTeamMemberStats]);

  // Loading state
  if (loading) {
    if (LoadingComponent) {
      return <LoadingComponent />;
    }
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    if (ErrorComponent) {
      return <ErrorComponent error={error} />;
    }
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Erro: {error}</div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col space-y-4 lg:space-y-6 ${className}`}>
      {/* Celebration Effects */}
      {celebrationState.showConfetti && celebrationConfig.enabled && typeof window !== 'undefined' && (
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
      
      {/* Celebration Message */}
      {celebrationState.showCelebrationMessage && celebrationConfig.enabled && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`relative ${celebrationState.isMessageExiting ? 'animate-fadeOutDown' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-3xl blur-lg opacity-75 animate-glowPulse scale-110"></div>
            
            <div className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white px-8 py-6 rounded-3xl shadow-2xl transform">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="h-8 w-8 text-yellow-300 animate-smoothBounce" />
                <Sparkles className="h-6 w-6 text-yellow-200 animate-sparkleRotate" />
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent">
                  {celebrationState.celebrationMessage}
                </h3>
                
                {celebrationState.completedTask && (
                  <p className="text-lg opacity-90 font-medium bg-gradient-to-r from-yellow-100 to-gray-100 bg-clip-text text-transparent">
                    "{celebrationState.completedTask.title}"
                  </p>
                )}
                
                {celebrationState.pointsAwarded > 0 && celebrationConfig.showPoints && (
                  <div className="mt-3 p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                    <p className="text-sm font-semibold text-yellow-100">
                      🎯 {celebrationState.pointsAwarded} pontos de função conquistados!
                    </p>
                    {celebrationState.assigneeName && celebrationConfig.showAssignee && (
                      <p className="text-xs text-yellow-200 mt-1">
                        Parabéns, {celebrationState.assigneeName}!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Actions */}
      {headerActions && (
        <div className="flex-shrink-0">
          {headerActions}
        </div>
      )}

      {/* Projects Summary */}
      {showProjectsSummary && ProjectsSummaryComponent && (
        <ProjectsSummaryComponent />
      )}

      {/* Team Members */}
      {showTeamMembers && teamMembersWithStats.length > 0 && (
        <div className="flex-shrink-0 space-y-3 lg:space-y-4">
          <h2 className="text-base lg:text-lg font-semibold text-gray-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            {teamMembersTitle} ({teamMembersWithStats.length})
          </h2>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
            {teamMembersWithStats.map((member) => (
              <DefaultTeamMember key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-grow w-full flex gap-4 lg:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
          {columns.map((column, index) => (
            <div 
              key={column.id} 
              className={`w-[calc(100vw-4rem)] sm:w-[320px] lg:w-[350px] xl:w-[380px] flex-shrink-0 snap-center
                ${index === 0 ? 'ml-4 sm:ml-0' : ''}
                ${index === columns.length - 1 ? 'mr-4 sm:mr-0' : ''}
                ${columnClassName}
              `}
            >
              <ErrorBoundary name={`KanbanColumn-${column.title}`}>
                <ColumnComponent
                  column={column}
                  tasks={tasks}
                  tags={tags}
                  taskTags={taskTags}
                  projects={projects}
                  profiles={profiles}
                  columns={columns}
                  commentCounts={commentCounts}
                  onAddTask={handleQuickAddTask}
                  onTaskClick={handleTaskClick}
                />
              </ErrorBoundary>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Security Alert */}
      {securityHook.isSecurityAlertOpen && (
        <SecurityAlert
          open={securityHook.isSecurityAlertOpen}
          onOpenChange={securityHook.hideSecurityAlert}
          onConfirm={securityHook.confirmedCallback || (() => {})}
          title={securityHook.securityTitle}
          description={securityHook.securityDescription}
        />
      )}
    </div>
  );
};

export default GenericKanban;