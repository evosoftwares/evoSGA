import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesColumn, SalesOpportunity, Profile } from '@/types/database';
import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';

interface SalesKanbanData {
  columns: SalesColumn[];
  opportunities: SalesOpportunity[];
  profiles: Profile[];
}

const SALES_QUERY_KEYS = {
  salesKanban: (projectId?: string) => ['sales-kanban', projectId],
  salesColumns: ['sales-columns'],
  salesOpportunities: (projectId?: string) => ['sales-opportunities', projectId],
} as const;

export const useSalesKanbanData = (projectId?: string) => {
  const { executeRequest } = useAuthenticatedRequest();

  return useQuery<SalesKanbanData>({
    queryKey: SALES_QUERY_KEYS.salesKanban(projectId),
    queryFn: () => executeRequest(async () => {
      console.log('🔄 [SALES] Starting sales data fetch for project:', projectId);
      // Fetch all data in parallel for better performance
      const [
        columnsResult,
        opportunitiesResult,
        profilesResult
      ] = await Promise.all([
        // Fetch sales columns
        supabase
          .from('sales_columns')
          .select('*')
          .order('position', { ascending: true }),

        // Fetch sales opportunities (filtered by project if provided)
        projectId
          ? supabase
              .from('sales_opportunities')
              .select('*')
              .eq('project_id', projectId)
              .order('position', { ascending: true })
          : supabase
              .from('sales_opportunities')
              .select('*')
              .order('position', { ascending: true }),

        // Fetch active profiles
        supabase
          .from('profiles')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })
      ]);

      // Check for errors with detailed messages
      if (columnsResult.error) {
        console.error('❌ [SALES] Error fetching sales_columns:', columnsResult.error);
        throw new Error(`Erro ao carregar colunas de vendas: ${columnsResult.error.message}`);
      }
      if (opportunitiesResult.error) {
        console.error('❌ [SALES] Error fetching sales_opportunities:', opportunitiesResult.error);
        throw new Error(`Erro ao carregar oportunidades: ${opportunitiesResult.error.message}`);
      }
      if (profilesResult.error) {
        console.error('❌ [SALES] Error fetching profiles:', profilesResult.error);
        throw new Error(`Erro ao carregar perfis: ${profilesResult.error.message}`);
      }

      console.log('✅ [SALES] Successfully loaded sales data:', {
        columns: columnsResult.data?.length || 0,
        opportunities: opportunitiesResult.data?.length || 0,
        profiles: profilesResult.data?.length || 0
      });

      return {
        columns: columnsResult.data || [],
        opportunities: opportunitiesResult.data || [],
        profiles: profilesResult.data || []
      };
    }, 'useSalesKanbanData'),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
};

// Hook for sales columns only
export const useSalesColumns = () => {
  const { executeRequest } = useAuthenticatedRequest();

  return useQuery<SalesColumn[]>({
    queryKey: SALES_QUERY_KEYS.salesColumns,
    queryFn: () => executeRequest(async () => {
      const { data, error } = await supabase
        .from('sales_columns')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      return data || [];
    }, 'useSalesColumns'),
    staleTime: 60000, // 1 minute
  });
};

// Hook for sales opportunities
export const useSalesOpportunities = (projectId?: string) => {
  const { executeRequest } = useAuthenticatedRequest();

  return useQuery<SalesOpportunity[]>({
    queryKey: SALES_QUERY_KEYS.salesOpportunities(projectId),
    queryFn: () => executeRequest(async () => {
      let query = supabase
        .from('sales_opportunities')
        .select(`
          *,
          sales_columns!inner(id, title, position, color),
          assignee:profiles(id, name, avatar_url),
          project:projects(id, name)
        `)
        .order('position', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('💼 [OPPORTUNITIES-QUERY] Oportunidades carregadas:', data);
      
      return data || [];
    }, 'useSalesOpportunities'),
    staleTime: 30000, // 30 seconds
  });
};

export { SALES_QUERY_KEYS };