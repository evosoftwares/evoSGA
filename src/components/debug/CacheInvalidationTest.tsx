import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryClient';
import { useProjectContext } from '@/contexts/ProjectContext';

export const CacheInvalidationTest = () => {
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectContext();

  const handleManualInvalidation = () => {
    console.log('🔥 [MANUAL-INVALIDATION] Invalidating manually for project:', selectedProjectId);
    
    if (selectedProjectId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kanban(selectedProjectId) });
      console.log('🔥 [MANUAL-INVALIDATION] Invalidated kanban for project:', selectedProjectId);
    } else {
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      console.log('🔥 [MANUAL-INVALIDATION] Invalidated all kanban queries');
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-purple-900 text-white p-4 rounded-lg shadow-lg z-50">
      <h3 className="font-bold text-sm mb-2">🔥 Cache Test</h3>
      <button 
        onClick={handleManualInvalidation}
        className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
      >
        Manual Invalidation
      </button>
    </div>
  );
};