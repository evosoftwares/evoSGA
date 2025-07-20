import { createLogger } from '@/utils/logger';

const logger = createLogger('RealtimeStatusManager');

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'failed';

class RealtimeStatusManager {
  private channelStatuses: Map<string, ConnectionStatus> = new Map();
  private listeners: Map<string, (status: ConnectionStatus) => void> = new Map();

  setChannelStatus(channelKey: string, status: ConnectionStatus): void {
    const previousStatus = this.channelStatuses.get(channelKey);
    this.channelStatuses.set(channelKey, status);
    
    if (previousStatus !== status) {
      logger.info(`Channel ${channelKey} status changed: ${previousStatus} → ${status}`);
      
      // Notify listeners
      const listener = this.listeners.get(channelKey);
      if (listener) {
        listener(status);
      }
    }
  }

  getChannelStatus(channelKey: string): ConnectionStatus {
    return this.channelStatuses.get(channelKey) || 'disconnected';
  }

  isChannelHealthy(channelKey: string): boolean {
    const status = this.getChannelStatus(channelKey);
    return status === 'connected' || status === 'connecting';
  }

  areAnyChannelsHealthy(): boolean {
    return Array.from(this.channelStatuses.values()).some(
      status => status === 'connected' || status === 'connecting'
    );
  }

  subscribeToStatusChanges(channelKey: string, callback: (status: ConnectionStatus) => void): void {
    this.listeners.set(channelKey, callback);
  }

  unsubscribeFromStatusChanges(channelKey: string): void {
    this.listeners.delete(channelKey);
  }

  cleanup(): void {
    this.channelStatuses.clear();
    this.listeners.clear();
  }
}

// Export singleton instance
export const realtimeStatusManager = new RealtimeStatusManager();