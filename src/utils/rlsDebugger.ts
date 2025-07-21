import { supabase } from '@/integrations/supabase/client';

export const testRLSPolicies = async () => {
  console.log('🔍 [RLS-DEBUG] Starting RLS policy tests...');
  
  try {
    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ [RLS-DEBUG] Auth error:', authError);
      return `Erro de autenticação: ${authError.message}`;
    }
    
    if (!user) {
      console.warn('⚠️ [RLS-DEBUG] User not authenticated');
      return 'Usuário não autenticado';
    }
    
    console.log('✅ [RLS-DEBUG] User authenticated:', user.id);
    
    // Test sales_opportunities SELECT
    console.log('🔍 [RLS-DEBUG] Testing sales_opportunities SELECT...');
    const { data: opportunitiesData, error: oppSelectError } = await supabase
      .from('sales_opportunities')
      .select('*')
      .limit(1);
    
    if (oppSelectError) {
      console.error('❌ [RLS-DEBUG] sales_opportunities SELECT error:', oppSelectError);
      return `Erro ao ler oportunidades: ${oppSelectError.message}`;
    }
    
    console.log('✅ [RLS-DEBUG] sales_opportunities SELECT successful, count:', opportunitiesData?.length || 0);
    
    // Test sales_columns SELECT
    console.log('🔍 [RLS-DEBUG] Testing sales_columns SELECT...');
    const { data: columnsData, error: columnsSelectError } = await supabase
      .from('sales_columns')
      .select('*')
      .limit(1);
    
    if (columnsSelectError) {
      console.error('❌ [RLS-DEBUG] sales_columns SELECT error:', columnsSelectError);
      return `Erro ao ler colunas: ${columnsSelectError.message}`;
    }
    
    console.log('✅ [RLS-DEBUG] sales_columns SELECT successful, count:', columnsData?.length || 0);
    
    return 'Todos os testes RLS passaram com sucesso! ✅';
    
  } catch (error: any) {
    console.error('❌ [RLS-DEBUG] Unexpected error:', error);
    return `Erro inesperado: ${error.message}`;
  }
};

export const handleRLSError = (error: any) => {
  console.error('🚨 [RLS-ERROR]', error);
  
  if (error?.code === '42501') {
    return 'Erro de permissão: Políticas RLS bloquearam a operação. Verifique se você está autenticado.';
  }
  
  if (error?.code === 'PGRST301') {
    return 'Erro de RLS: Acesso negado pela política de segurança.';
  }
  
  if (error?.message?.includes('row-level security')) {
    return 'Erro de RLS: Política de segurança de linha bloqueou a operação.';
  }
  
  if (error?.message?.includes('permission denied')) {
    return 'Erro de permissão: Acesso negado ao recurso.';
  }
  
  return error?.message || 'Erro desconhecido';
};