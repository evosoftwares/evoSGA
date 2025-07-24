
import React, { useState, useCallback, useMemo } from 'react';
import { useOptimizedKanbanData } from '@/hooks/useOptimizedKanbanData';
import { useProjectData } from '@/hooks/useProjectData';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useSecurityCheck } from '@/hooks/useSecurityCheck';
import { useUserPoints } from '@/hooks/useUserPoints';
import { useTaskCommentCounts } from '@/hooks/useTaskCommentCounts';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { Task, KanbanColumn as Column } from '@/types/database';
import ErrorBoundary from '../ErrorBoundary';
import GenericKanban from './GenericKanban';
import { CelebrationConfig } from './types';

const KanbanBoard = () => {
  const { selectedProjectId } = useProjectContext();
  const { projects } = useProjectData();
  const { userPoints } = useUserPoints();
  
  // Internal state for task modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Custom celebration config
  const celebrationConfig: CelebrationConfig = {
    enabled: true,
    messages: [
      "🎉O cara é o Vitinho",
      "🔥 Vitinho é o cara!"
    ],
    duration: 5000,
    confettiEnabled: true,
    showPoints: true,
    showAssignee: true
  };

  // Custom team member stats calculation
  const getTeamMemberStats = useCallback((profiles: any[], tasks: any[], columns: any[]) => {
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
      const earnedPointsData = userPoints.find(up => up.user_id === member.id);
      const earnedPoints = earnedPointsData?.total_points || 0;

      return {
        ...member,
        taskCount: activeTasks.length,
        functionPoints: currentTaskPoints,
        earnedPoints: earnedPoints,
      };
    });
  }, [userPoints]);

  // Column restrictions
  const getColumnRestrictions = useCallback((column: Column) => {
    const isCompleted = column?.title?.toLowerCase().includes('concluído') || 
                       column?.title?.toLowerCase().includes('concluido') ||
                       column?.title?.toLowerCase().includes('completed') ||
                       column?.title?.toLowerCase().includes('done');
    
    return {
      allowDragIn: true,
      allowDragOut: !isCompleted, // Cannot drag out of completed columns
      allowTaskCreation: !isCompleted
    };
  }, []);

  // Task modal handlers
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };


  // Get data hook instance
  const dataHook = useOptimizedKanbanData(selectedProjectId);

  // Wrapper functions for task operations
  const updateTaskWrapper = useCallback(
    async (taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
      return dataHook.updateTask({ 
        taskId, 
        updates, 
        projectId: selectedProjectId || null 
      });
    },
    [dataHook.updateTask, selectedProjectId]
  );

  const deleteTaskWrapper = useCallback(
    async (taskId: string) => {
      return dataHook.deleteTask({ 
        taskId, 
        projectId: selectedProjectId || null 
      });
    },
    [dataHook.deleteTask, selectedProjectId]
  );

  return (
    <>
      <GenericKanban
        useDataHook={useOptimizedKanbanData}
        selectedProjectId={selectedProjectId}
        projects={projects}
        onTaskClick={handleTaskClick}
        showTeamMembers={true}
        teamMembersTitle="Equipe"
        getTeamMemberStats={getTeamMemberStats}
        showProjectsSummary={true}
        celebrationConfig={celebrationConfig}
        useCommentCounts={useTaskCommentCounts}
        useSecurityCheck={useSecurityCheck}
        enableDragAndDrop={true}
        enableTaskCreation={true}
        enableProjectGrouping={true}
        enableRealTimeUpdates={true}
        getColumnRestrictions={getColumnRestrictions}
      />

      {/* Task Detail Modal */}
      {selectedTask && (
        <ErrorBoundary>
          <TaskDetailModal
            task={selectedTask}
            isOpen={true}
            onClose={() => setSelectedTask(null)}
            teamMembers={dataHook.profiles}
            projects={projects}
            tags={dataHook.tags}
            taskTags={dataHook.taskTags}
            updateTask={updateTaskWrapper}
            deleteTask={deleteTaskWrapper}
            refreshData={dataHook.refreshData}
          />
        </ErrorBoundary>
      )}
    </>
  );
};

export default KanbanBoard;
