import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useOptimizedProjectData } from '@/hooks/useOptimizedProjectData';
import { useSalesKanbanData } from '@/hooks/sales/useSalesKanbanData';
import { useSalesKanbanMutations } from '@/hooks/sales/useSalesKanbanMutations';
import { useSalesCommentCounts } from '@/hooks/sales/useSalesComments';
import { useSalesRealTime } from '@/hooks/sales/useSalesRealTime';
import SalesKanbanBoard from '@/components/sales/SalesKanbanBoard';
import Header from '@/components/layout/Header';
import { Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { SalesOpportunity } from '@/types/database';
import { Button } from '@/components/ui/button';

const SalesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectContext();
  
  // Fetch projects data
  const { projects } = useOptimizedProjectData();
  
  // Get selected project from projects data
  const selectedProject = useMemo(() => {
    if (!selectedProjectId || !projects) return null;
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);
  
  // Set up real-time subscriptions
  useSalesRealTime({ projectId: selectedProjectId });

  // Fetch sales data
  const {
    data: salesData,
    isLoading,
    error,
    refetch
  } = useSalesKanbanData(selectedProjectId);

  // Get comment counts
  const {
    data: commentCounts = {},
    isLoading: isLoadingComments
  } = useSalesCommentCounts();

  // Set up mutations
  const {
    createOpportunity,
    moveOpportunity,
    updateOpportunity,
    deleteOpportunity
  } = useSalesKanbanMutations(selectedProjectId);

  // Handle creating new opportunity
  const handleAddOpportunity = useCallback(async (data: any) => {
    try {
      // Find Jefferson's profile by email
      const jeffersonProfile = salesData?.profiles.find(
        profile => profile.email?.toLowerCase() === 'jefferson@evosoftwares.com'
      );

      await createOpportunity.mutateAsync({
        ...data,
        project_id: data.project_id || selectedProjectId,
        assignee: data.assignee || jeffersonProfile?.id, // Assign to Jefferson by default
      });
    } catch (error) {
      console.error('Failed to create opportunity:', error);
    }
  }, [createOpportunity, selectedProjectId, salesData?.profiles]);

  // Handle moving opportunity
  const handleMoveOpportunity = useCallback(async (
    opportunityId: string,
    destinationColumnId: string,
    newPosition: number
  ) => {
    try {
      await moveOpportunity.mutateAsync({
        opportunityId,
        destinationColumnId,
        newPosition,
      });
    } catch (error) {
      console.error('Failed to move opportunity:', error);
    }
  }, [moveOpportunity]);

  // Handle updating opportunity
  const handleUpdateOpportunity = useCallback(async (
    opportunityId: string,
    updates: Partial<SalesOpportunity>
  ) => {
    try {
      await updateOpportunity.mutateAsync({
        opportunityId,
        updates,
      });
    } catch (error) {
      console.error('Failed to update opportunity:', error);
    }
  }, [updateOpportunity]);

  // Handle deleting opportunity
  const handleDeleteOpportunity = useCallback(async (opportunityId: string) => {
    try {
      await deleteOpportunity.mutateAsync(opportunityId);
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
    }
  }, [deleteOpportunity]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!salesData) return null;

    const { opportunities } = salesData;
    const totalValue = opportunities.reduce((sum, opp) => sum + opp.deal_value, 0);
    const totalCount = opportunities.length;
    const avgProbability = totalCount > 0 
      ? opportunities.reduce((sum, opp) => sum + opp.probability, 0) / totalCount 
      : 0;

    // Count opportunities by stage
    const stageDistribution = salesData.columns.map(column => ({
      name: column.title,
      count: opportunities.filter(opp => opp.column_id === column.id).length,
      value: opportunities
        .filter(opp => opp.column_id === column.id)
        .reduce((sum, opp) => sum + opp.deal_value, 0),
    }));

    return {
      totalValue,
      totalCount,
      avgProbability,
      stageDistribution,
    };
  }, [salesData]);

  // Loading state
  if (isLoading || isLoadingComments) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando pipeline de vendas...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const errorMessage = error.message;
    const isTableMissingError = errorMessage.includes('relation') && errorMessage.includes('does not exist');
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              {isTableMissingError ? 'Sistema de Vendas não configurado' : 'Erro ao carregar dados'}
            </h2>
            <p className="text-gray-600 mb-4">
              {isTableMissingError 
                ? 'As tabelas do sistema de vendas não foram criadas. Execute a migração 20250720000003_sales_kanban_system.sql no seu banco de dados Supabase.'
                : `Erro: ${errorMessage}`
              }
            </p>
            {isTableMissingError && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                <h3 className="font-medium text-blue-900 mb-2">Como resolver:</h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Acesse o painel do Supabase</li>
                  <li>2. Vá em SQL Editor</li>
                  <li>3. Execute o arquivo de migração das vendas</li>
                  <li>4. Recarregue esta página</li>
                </ol>
              </div>
            )}
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!salesData || !salesData.columns.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Pipeline de Vendas não configurado
            </h2>
            <p className="text-gray-500 mb-6 max-w-md">
              Parece que o sistema de vendas ainda não foi configurado. 
              Execute as migrações do banco de dados para começar.
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="h-[calc(100vh-80px)]">
        <SalesKanbanBoard
          columns={salesData.columns}
          opportunities={salesData.opportunities}
          projects={projects || []}
          profiles={salesData.profiles}
          commentCounts={commentCounts}
          onMoveOpportunity={handleMoveOpportunity}
          onAddOpportunity={handleAddOpportunity}
          onUpdateOpportunity={handleUpdateOpportunity}
          onDeleteOpportunity={handleDeleteOpportunity}
          onRefresh={async () => { 
            console.log('🔄 [REFRESH] Forcing aggressive cache invalidation...');
            
            // Invalidar todas as queries relacionadas
            queryClient.invalidateQueries({ queryKey: ['sales-kanban'] });
            
            // Forçar refetch
            await refetch(); 
            
            console.log('✅ [REFRESH] Cache invalidation completed');
          }}
          selectedProjectId={selectedProjectId}
        />
      </main>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && summaryMetrics && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-xs">
          <h4 className="font-semibold mb-2">Debug - Sales Metrics</h4>
          <div className="space-y-1">
            <div>Total Value: R$ {summaryMetrics.totalValue.toLocaleString()}</div>
            <div>Total Count: {summaryMetrics.totalCount}</div>
            <div>Avg Probability: {summaryMetrics.avgProbability.toFixed(1)}%</div>
            <div>Selected Project: {selectedProject?.name || 'All'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;