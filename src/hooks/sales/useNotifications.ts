import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarNotification } from '@/types/database';
import { toast } from 'sonner';
import { 
  SalesNotificationService,
  CreateSalesNotificationData,
  UpdateSalesNotificationData,
  SalesNotificationFilters,
  SalesNotificationStats,
  SalesNotificationWithRelations
} from '@/services/salesNotificationService';

export const SALES_NOTIFICATIONS_QUERY_KEYS = {
  all: ['sales-notifications'] as const,
  lists: () => [...SALES_NOTIFICATIONS_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: SalesNotificationFilters) => [...SALES_NOTIFICATIONS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...SALES_NOTIFICATIONS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SALES_NOTIFICATIONS_QUERY_KEYS.details(), id] as const,
  unread: (filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id' | 'type' | 'priority'>) => 
    [...SALES_NOTIFICATIONS_QUERY_KEYS.all, 'unread', filters] as const,
  scheduled: (filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id' | 'scheduled_after' | 'scheduled_before'>) => 
    [...SALES_NOTIFICATIONS_QUERY_KEYS.all, 'scheduled', filters] as const,
  overdue: (filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id'>) => 
    [...SALES_NOTIFICATIONS_QUERY_KEYS.all, 'overdue', filters] as const,
  upcoming: (hoursAhead: number, filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id'>) => 
    [...SALES_NOTIFICATIONS_QUERY_KEYS.all, 'upcoming', hoursAhead, filters] as const,
  withRelations: (filters?: SalesNotificationFilters) => 
    [...SALES_NOTIFICATIONS_QUERY_KEYS.all, 'with-relations', filters] as const,
  stats: (filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id'>) => 
    [...SALES_NOTIFICATIONS_QUERY_KEYS.all, 'stats', filters] as const,
};

/**
 * Hook para buscar notificações com filtros
 */
export function useSalesNotifications(filters?: SalesNotificationFilters) {
  return useQuery({
    queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.list(filters),
    queryFn: () => SalesNotificationService.getNotificationsWithFilters(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar uma notificação específica
 */
export function useSalesNotification(notificationId: string) {
  return useQuery({
    queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.detail(notificationId),
    queryFn: () => SalesNotificationService.getNotification(notificationId),
    enabled: !!notificationId,
  });
}

/**
 * Hook para buscar notificações com relações
 */
export function useSalesNotificationsWithRelations(filters?: SalesNotificationFilters) {
  return useQuery({
    queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.withRelations(filters),
    queryFn: () => SalesNotificationService.getNotificationsWithRelations(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar notificações não lidas
 */
export function useUnreadSalesNotifications(filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id' | 'type' | 'priority'>) {
  return useQuery({
    queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.unread(filters),
    queryFn: () => SalesNotificationService.getUnreadNotifications(filters),
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 5, // Atualizar a cada 5 minutos
  });
}

/**
 * Hook para buscar notificações agendadas
 */
export function useScheduledSalesNotifications(filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id' | 'scheduled_after' | 'scheduled_before'>) {
  return useQuery({
    queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.scheduled(filters),
    queryFn: () => SalesNotificationService.getScheduledNotifications(filters),
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para buscar notificações vencidas
 */
export function useOverdueSalesNotifications(filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id'>) {
  return useQuery({
    queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.overdue(filters),
    queryFn: () => SalesNotificationService.getOverdueNotifications(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60 * 10, // Atualizar a cada 10 minutos
  });
}

/**
 * Hook para buscar notificações próximas
 */
export function useUpcomingSalesNotifications(
  hoursAhead: number = 24,
  filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id'>
) {
  return useQuery({
    queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.upcoming(hoursAhead, filters),
    queryFn: () => SalesNotificationService.getUpcomingNotifications(hoursAhead, filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60 * 15, // Atualizar a cada 15 minutos
  });
}

/**
 * Hook para buscar estatísticas de notificações
 */
export function useSalesNotificationStats(filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id'>) {
  return useQuery({
    queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.stats(filters),
    queryFn: () => SalesNotificationService.getNotificationStats(filters),
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para mutações de notificações
 */
export function useSalesNotificationMutations() {
  const queryClient = useQueryClient();

  const createNotification = useMutation({
    mutationFn: (data: CreateSalesNotificationData) => 
      SalesNotificationService.createNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.all });
      toast.success('Notificação criada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar notificação:', error);
      toast.error('Erro ao criar notificação');
    },
  });

  const updateNotification = useMutation({
    mutationFn: ({ notificationId, updateData }: { notificationId: string; updateData: UpdateSalesNotificationData }) =>
      SalesNotificationService.updateNotification(notificationId, updateData),
    onSuccess: (_, { notificationId }) => {
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.detail(notificationId) });
      toast.success('Notificação atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar notificação:', error);
      toast.error('Erro ao atualizar notificação');
    },
  });

  const markAsRead = useMutation({
    mutationFn: (notificationId: string) => 
      SalesNotificationService.markAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.detail(notificationId) });
    },
    onError: (error) => {
      console.error('Erro ao marcar notificação como lida:', error);
      toast.error('Erro ao marcar notificação como lida');
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: (filters?: Pick<SalesNotificationFilters, 'user_id' | 'project_id'>) => 
      SalesNotificationService.markAllAsRead(filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.all });
      toast.success('Todas as notificações foram marcadas como lidas');
    },
    onError: (error) => {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      toast.error('Erro ao marcar todas as notificações como lidas');
    },
  });

  const deleteNotification = useMutation({
    mutationFn: (notificationId: string) => 
      SalesNotificationService.deleteNotification(notificationId),
    onSuccess: (_, notificationId) => {
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.all });
      queryClient.removeQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.detail(notificationId) });
      toast.success('Notificação excluída com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir notificação:', error);
      toast.error('Erro ao excluir notificação');
    },
  });

  const createActivityNotification = useMutation({
    mutationFn: (data: {
      activityId: string;
      activityTitle: string;
      activityType: string;
      opportunityId?: string;
      userId?: string;
      projectId?: string;
      type: 'created' | 'updated' | 'completed' | 'overdue';
    }) => SalesNotificationService.createActivityNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.all });
      toast.success('Notificação de atividade criada');
    },
    onError: (error) => {
      console.error('Erro ao criar notificação de atividade:', error);
      toast.error('Erro ao criar notificação de atividade');
    },
  });

  const createCommentNotification = useMutation({
    mutationFn: (data: {
      commentId: string;
      commentContent: string;
      opportunityId?: string;
      userId?: string;
      projectId?: string;
      mentionedUsers?: string[];
    }) => SalesNotificationService.createCommentNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.all });
      toast.success('Notificação de comentário criada');
    },
    onError: (error) => {
      console.error('Erro ao criar notificação de comentário:', error);
      toast.error('Erro ao criar notificação de comentário');
    },
  });

  const createStatusChangeNotification = useMutation({
    mutationFn: (data: {
      opportunityId: string;
      opportunityTitle: string;
      oldStatus: string;
      newStatus: string;
      userId?: string;
      projectId?: string;
    }) => SalesNotificationService.createStatusChangeNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.all });
      toast.success('Notificação de mudança de status criada');
    },
    onError: (error) => {
      console.error('Erro ao criar notificação de mudança de status:', error);
      toast.error('Erro ao criar notificação de mudança de status');
    },
  });

  const cleanupOldNotifications = useMutation({
    mutationFn: (daysOld: number = 30) => 
      SalesNotificationService.cleanupOldNotifications(daysOld),
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: SALES_NOTIFICATIONS_QUERY_KEYS.all });
      toast.success(`${deletedCount} notificações antigas foram removidas`);
    },
    onError: (error) => {
      console.error('Erro ao limpar notificações antigas:', error);
      toast.error('Erro ao limpar notificações antigas');
    },
  });

  return {
    createNotification,
    updateNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createActivityNotification,
    createCommentNotification,
    createStatusChangeNotification,
    cleanupOldNotifications,
  };
}

/**
 * Hook principal que combina todas as funcionalidades de notificações
 * Usado pelos componentes principais para ter acesso completo ao sistema de notificações
 */
export function useNotifications(filters?: SalesNotificationFilters) {
  const notifications = useSalesNotifications(filters);
  const unreadNotifications = useUnreadSalesNotifications(filters);
  const stats = useSalesNotificationStats(filters);
  const mutations = useSalesNotificationMutations();

  // Calcular contagem de não lidas
  const unreadCount = unreadNotifications.data?.length || 0;

  // Agrupar notificações por tipo
  const notificationsByPriority = useMemo(() => {
    if (!notifications.data) return { high: [], medium: [], low: [] };
    
    return notifications.data.reduce((acc, notification) => {
      // Usar notification_type para determinar prioridade
      const priority = notification.notification_type === 'push' ? 'high' : 
                     notification.notification_type === 'email' ? 'medium' : 'low';
      if (!acc[priority]) acc[priority] = [];
      acc[priority].push(notification);
      return acc;
    }, { high: [], medium: [], low: [] } as Record<string, any[]>);
  }, [notifications.data]);

  return {
    notifications: notifications.data || [],
    unreadNotifications: unreadNotifications.data || [],
    unreadCount,
    notificationsByPriority,
    stats: stats.data,
    mutations,
    isLoading: notifications.isLoading || unreadNotifications.isLoading || stats.isLoading,
    error: notifications.error || unreadNotifications.error || stats.error,
    refetch: () => {
      notifications.refetch();
      unreadNotifications.refetch();
      stats.refetch();
    }
  };
}