import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const SimpleRealtimeTest = () => {
  const [status, setStatus] = useState<string>('disconnected');
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    console.log('🔥 Setting up simple realtime test...');
    
    const channel = supabase
      .channel('simple-test')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, (payload) => {
        console.log('🔥 SIMPLE TEST: Event received:', payload);
        setEvents(prev => [...prev, payload]);
      })
      .subscribe((status) => {
        console.log('🔥 SIMPLE TEST: Status:', status);
        setStatus(status);
      });

    return () => {
      console.log('🔥 Cleaning up simple test');
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-blue-900 text-white p-4 rounded-lg shadow-lg max-w-md z-50">
      <h3 className="font-bold text-sm mb-2">🔥 Simple Realtime Test</h3>
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-medium">Status:</span> 
          <span className={`ml-2 px-2 py-1 rounded ${
            status === 'SUBSCRIBED' ? 'bg-green-600' : 
            status === 'CLOSED' ? 'bg-red-600' : 'bg-yellow-600'
          }`}>
            {status}
          </span>
        </div>
        <div>
          <span className="font-medium">Events:</span> {events.length}
        </div>
        {events.length > 0 && (
          <div className="bg-gray-800 p-2 rounded text-xs max-h-32 overflow-auto">
            <pre>{JSON.stringify(events.slice(-3), null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};