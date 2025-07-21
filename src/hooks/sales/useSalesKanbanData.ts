import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesColumn, SalesOpportunity, SalesTag, SalesOpportunityTag, Profile } from '@/types/database';
import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';

interface SalesKanbanData {
  columns: SalesColumn[];
  opportunities: SalesOpportunity[];
  tags: SalesTag[];
  opportunityTags: SalesOpportunityTag[];
  profiles: Profile[];
}

const SALES_QUERY_KEYS = {
  salesKanban: (projectId?: string) => ['sales-kanban', projectId],
  salesColumns: ['sales-columns'],
  salesOpportunities: (projectId?: string) => ['sales-opportunities', projectId],
  salesTags: ['sales-tags'],
  salesOpportunityTags: ['sales-opportunity-tags'],
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
        tagsResult,
        opportunityTagsResult,
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

        // Fetch sales tags
        projectId
          ? supabase.from('sales_tags').select('*').eq('project_id', projectId).order('name', { ascending: true })
          : supabase.from('sales_tags').select('*').order('name', { ascending: true }),

        // Opportunity Tags com filtro (assumindo campo project_id em opportunities para join indireto; ajuste se necessário)
        projectId
          ? supabase.from('sales_opportunity_tags').select('*, sales_opportunities(project_id)').match({ 'sales_opportunities.project_id': projectId })
          : supabase.from('sales_opportunity_tags').select('*'),

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
      if (tagsResult.error) {
        console.error('❌ [SALES] Error fetching sales_tags:', tagsResult.error);
        throw new Error(`Erro ao carregar tags de vendas: ${tagsResult.error.message}`);
      }
      if (opportunityTagsResult.error) {
        console.error('❌ [SALES] Error fetching sales_opportunity_tags:', opportunityTagsResult.error);
        throw new Error(`Erro ao carregar relacionamentos de tags: ${opportunityTagsResult.error.message}`);
      }
      if (profilesResult.error) {
        console.error('❌ [SALES] Error fetching profiles:', profilesResult.error);
        throw new Error(`Erro ao carregar perfis: ${profilesResult.error.message}`);
      }

      console.log('✅ [SALES] Successfully loaded sales data:', {
        columns: columnsResult.data?.length || 0,
        opportunities: opportunitiesResult.data?.length || 0,
        tags: tagsResult.data?.length || 0,
        opportunityTags: opportunityTagsResult.data?.length || 0,
        profiles: profilesResult.data?.length || 0
      });

      return {
        columns: columnsResult.data || [],
        opportunities: opportunitiesResult.data || [],
        tags: tagsResult.data || [],
        opportunityTags: opportunityTagsResult.data || [],
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
        .select('*')
        .order('position', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'useSalesOpportunities'),
    staleTime: 30000, // 30 seconds
  });
};

// Hook for sales tags
export const useSalesTags = () => {
  const { executeRequest } = useAuthenticatedRequest();

  return useQuery<SalesTag[]>({
    queryKey: SALES_QUERY_KEYS.salesTags,
    queryFn: () => executeRequest(async () => {
      const { data, error } = await supabase
        .from('sales_tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    }, 'useSalesTags'),
    staleTime: 60000, // 1 minute
  });
};

// Hook for opportunity tags relationships
export const useSalesOpportunityTags = () => {
  const { executeRequest } = useAuthenticatedRequest();

  return useQuery<SalesOpportunityTag[]>({
    queryKey: SALES_QUERY_KEYS.salesOpportunityTags,
    queryFn: () => executeRequest(async () => {
      const { data, error } = await supabase
        .from('sales_opportunity_tags')
        .select('*');

      if (error) throw error;
      return data || [];
    }, 'useSalesOpportunityTags'),
    staleTime: 30000, // 30 seconds
  });
};

export { SALES_QUERY_KEYS };