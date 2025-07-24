import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  RefreshCw, 
  Trash2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { kanbanPositionManager } from '@/services/kanbanPositionManager';
import { salesRealtimeSync } from '@/services/salesRealtimeSync';
import { usePositionQueueStats } from '@/hooks/sales/useSalesKanbanMutationsRobust';
import { toast } from 'sonner';

interface DiagnosticData {
  queueStats: {
    pending: number;
    processing: boolean;
  };
  realtimeStatus: {
    connected: boolean;
    reconnectAttempts: number;
  };
  lastUpdate: number;
}

export function KanbanDiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData>({
    queueStats: { pending: 0, processing: false },
    realtimeStatus: { connected: false, reconnectAttempts: 0 },
    lastUpdate: Date.now()
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const queueStats = usePositionQueueStats();

  // Atualiza diagnósticos periodicamente
  useEffect(() => {
    const updateDiagnostics = () => {
      setDiagnostics({
        queueStats: kanbanPositionManager.getQueueStats(),
        realtimeStatus: salesRealtimeSync.getConnectionStatus(),
        lastUpdate: Date.now()
      });
    };

    updateDiagnostics();
    const interval = setInterval(updateDiagnostics, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleFlushQueue = async () => {
    try {
      await kanbanPositionManager.flushQueue();
      toast.success('Queue processada com sucesso');
    } catch (error) {
      toast.error('Erro ao processar queue');
    }
  };

  const handleClearQueue = () => {
    kanbanPositionManager.clearQueue();
    toast.success('Queue limpa');
  };

  const handleRestartRealtime = async () => {
    try {
      await salesRealtimeSync.stop();
      await salesRealtimeSync.start();
      toast.success('Sincronização reiniciada');
    } catch (error) {
      toast.error('Erro ao reiniciar sincronização');
    }
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? 'text-green-600' : 'text-red-600';
  };

  const getQueueStatusColor = (pending: number, processing: boolean) => {
    if (processing) return 'text-blue-600';
    if (pending > 5) return 'text-orange-600';
    if (pending > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="bg-white shadow-lg border-2"
        >
          <Activity className="h-4 w-4 mr-2" />
          Diagnósticos
          {diagnostics.queueStats.pending > 0 && (
            <Badge variant="secondary" className="ml-2">
              {diagnostics.queueStats.pending}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Diagnósticos Kanban
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              ×
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status da Queue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Queue de Posicionamento</span>
              <div className="flex items-center space-x-2">
                <Clock className={`h-4 w-4 ${getQueueStatusColor(
                  diagnostics.queueStats.pending,
                  diagnostics.queueStats.processing
                )}`} />
                <Badge variant="outline">
                  {diagnostics.queueStats.pending} pendentes
                </Badge>
              </div>
            </div>

            {diagnostics.queueStats.processing && (
              <div className="flex items-center text-sm text-blue-600">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Processando...
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFlushQueue}
                disabled={diagnostics.queueStats.pending === 0}
              >
                <Database className="h-3 w-3 mr-1" />
                Processar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearQueue}
                disabled={diagnostics.queueStats.pending === 0}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>

          <Separator />

          {/* Status da Sincronização */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sincronização Tempo Real</span>
              <div className="flex items-center space-x-2">
                {diagnostics.realtimeStatus.connected ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
                <Badge 
                  variant={diagnostics.realtimeStatus.connected ? "default" : "destructive"}
                >
                  {diagnostics.realtimeStatus.connected ? 'Conectado' : 'Desconectado'}
                </Badge>
              </div>
            </div>

            {diagnostics.realtimeStatus.reconnectAttempts > 0 && (
              <div className="flex items-center text-sm text-orange-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {diagnostics.realtimeStatus.reconnectAttempts} tentativas de reconexão
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRestartRealtime}
              className="w-full"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reiniciar Sincronização
            </Button>
          </div>

          <Separator />

          {/* Informações Gerais */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Informações</span>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Última atualização: {new Date(diagnostics.lastUpdate).toLocaleTimeString()}</div>
              <div>Queue Stats: {JSON.stringify(queueStats)}</div>
            </div>
          </div>

          {/* Indicadores de Saúde */}
          <div className="flex justify-center space-x-4 pt-2">
            <div className="flex items-center">
              {diagnostics.queueStats.pending === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-xs ml-1">Queue</span>
            </div>
            
            <div className="flex items-center">
              {diagnostics.realtimeStatus.connected ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs ml-1">Realtime</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}