import { ReactNode } from 'react';
import { Task, Column, Profile, Project, Tag, TaskTag } from '@/types/database';

export interface KanbanDataHook {
  columns: Column[];
  tasks: Task[];
  profiles: Profile[];
  tags: Tag[];  
  taskTags: TaskTag[];
  loading: boolean;
  error: string | null;
  moveTask: (taskId: string, sourceColumnId: string, destColumnId: string, destIndex: number) => void;
  createTask: (params: { taskData: Partial<Task>; columnId: string; projectId?: string | null }) => Promise<void>;
  updateTask: (params: { taskId: string; updates: Partial<Omit<Task, 'id'>>; projectId?: string | null }) => Promise<void>;
  deleteTask: (params: { taskId: string; projectId?: string | null }) => Promise<void>;
  refreshData: () => void;
}

export interface CelebrationConfig {
  enabled: boolean;
  messages?: string[];
  duration?: number;
  confettiEnabled?: boolean;
  showPoints?: boolean;
  showAssignee?: boolean;
  getCustomMessage?: (task: Task) => string;
}

export interface TeamMemberStats {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  taskCount: number;
  functionPoints: number;
  earnedPoints: number;
}

export interface GenericKanbanProps {
  // Data source hook - pode ser qualquer hook que retorne os dados necessários
  useDataHook: (projectId?: string | null) => KanbanDataHook;
  
  // Project management
  selectedProjectId?: string | null;
  projects?: Project[];
  
  // UI customization
  TaskCardComponent?: React.ComponentType<{
    task: Task;
    index: number;
    onClick: () => void;
    teamMembers: Profile[];
    projects: Project[];
    tags: Tag[];
    taskTags: TaskTag[];
    columns: Column[];
    commentCounts: Record<string, number>;
    [key: string]: any;
  }>;
  
  ColumnComponent?: React.ComponentType<{
    column: Column;
    tasks: Task[];
    tags: Tag[];
    taskTags: TaskTag[];
    projects: Project[];
    profiles: Profile[];
    columns: Column[];
    commentCounts: Record<string, number>;
    onAddTask: (columnId: string, title: string) => void;
    onTaskClick: (task: Task) => void;
    [key: string]: any;
  }>;

  // Events
  onTaskClick?: (task: Task) => void;
  onTaskCreate?: (task: Partial<Task>) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  
  // Team members
  showTeamMembers?: boolean;
  teamMembersTitle?: string;
  getTeamMemberStats?: (profiles: Profile[], tasks: Task[], columns: Column[]) => TeamMemberStats[];
  
  // Projects summary
  showProjectsSummary?: boolean;
  ProjectsSummaryComponent?: React.ComponentType<any>;
  
  // Celebration system
  celebrationConfig?: CelebrationConfig;
  
  // Comments
  useCommentCounts?: (taskIds: string[]) => { data: Record<string, number> };
  
  // Security/Auth
  useSecurityCheck?: () => {
    isSecurityAlertOpen: boolean;
    showSecurityAlert: (callback: () => void, title: string, description: string) => void;
    hideSecurityAlert: () => void;
    confirmedCallback: (() => void) | null;
    securityTitle: string;
    securityDescription: string;
  };
  
  // Layout customization
  className?: string;
  columnClassName?: string;
  taskCardClassName?: string;
  
  // Feature flags
  enableDragAndDrop?: boolean;
  enableTaskCreation?: boolean;
  enableProjectGrouping?: boolean; // Para colunas concluídas
  enableRealTimeUpdates?: boolean;
  
  // Loading and error states
  LoadingComponent?: React.ComponentType<any>;
  ErrorComponent?: React.ComponentType<{ error: string }>;
  
  // Custom header actions
  headerActions?: ReactNode;
  
  // Column restrictions
  getColumnRestrictions?: (column: Column) => {
    allowDragIn: boolean;
    allowDragOut: boolean;
    allowTaskCreation: boolean;
  };
}