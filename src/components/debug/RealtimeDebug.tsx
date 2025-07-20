import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useProjectData } from '@/hooks/useProjectData';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RealtimeDebug');

export const RealtimeDebug = () => {
  const { selectedProjectId } = useProjectContext();
  const { projects } = useProjectData();
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    if (!selectedProjectId) return;

    logger.info('Setting up debug real-time subscription for project:', selectedProjectId);

    const channel = supabase
      .channel(`debug-${selectedProjectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${selectedProjectId}`
        },
        (payload) => {
          logger.info('🔥 DEBUG: Real-time event received:', payload);
          setLastEvent(payload);
          setEventCount(count => count + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          logger.info('🔥 DEBUG: Projects event received:', payload);
          setLastEvent(payload);
          setEventCount(count => count + 1);
        }
      )
      .subscribe((status) => {
        logger.info('🔥 DEBUG: Connection status:', status);
        setConnectionStatus(status);
      });

    return () => {
      logger.info('Cleaning up debug subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedProjectId]);

  if (!selectedProjectId) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg max-w-md z-50">
      <h3 className="font-bold text-sm mb-2">🔥 Real-time Debug</h3>
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-medium">Project:</span> {selectedProject?.name || 'Loading...'}
        </div>
        <div>
          <span className="font-medium">Project ID:</span> {selectedProjectId}
        </div>
        <div>
          <span className="font-medium">Status:</span> 
          <span className={`ml-2 px-2 py-1 rounded ${
            connectionStatus === 'SUBSCRIBED' ? 'bg-green-600' : 
            connectionStatus === 'CLOSED' ? 'bg-red-600' : 'bg-yellow-600'
          }`}>
            {connectionStatus}
          </span>
        </div>
        <div>
          <span className="font-medium">Events received:</span> {eventCount}
        </div>
        {lastEvent && (
          <div>
            <span className="font-medium">Last event:</span>
            <pre className="bg-gray-800 p-2 rounded text-xs mt-1 overflow-auto max-h-32">
              {JSON.stringify(lastEvent, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};