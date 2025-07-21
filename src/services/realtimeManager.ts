import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/logger';
import { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeStatusManager } from './realtimeStatusManager';

const logger = createLogger('RealtimeManager');

type SubscriptionType = 'tasks' | 'tags' | 'projects' | 'comments' | 'sales' | 'files';

interface SubscriptionConfig {
  table: string;
  callback: (payload: Record<string, unknown>) => void;
  filter?: Record<string, unknown>;
}

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, number> = new Map(); // Reference counting

  private getChannelKey(type: SubscriptionType, identifier?: string): string {
    return identifier ? `${type}-${identifier}` : type;
  }

  subscribe(
    type: SubscriptionType,
    configs: SubscriptionConfig[],
    identifier?: string
  ): string {
    const channelKey = this.getChannelKey(type, identifier);
    
    // Check if we already have a subscription for this channel
    const existingCount = this.subscriptions.get(channelKey) || 0;
    
    if (existingCount > 0) {
      // Just increment the reference count
      this.subscriptions.set(channelKey, existingCount + 1);
      logger.info(`Reusing existing subscription for ${channelKey}, count: ${existingCount + 1}`);
      return channelKey;
    }

    // Create new channel with unique name to avoid conflicts
    const uniqueChannelName = `${channelKey}-${Date.now()}`;
    const channel = supabase.channel(uniqueChannelName);
    
    // Add all configurations to the channel
    configs.forEach(config => {
      logger.info(`Setting up subscription for table: ${config.table}, filter:`, config.filter);
      
      channel.on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: config.table,
          ...config.filter 
        },
        (payload) => {
          logger.info(`🔥 Real-time event for ${config.table}`, payload);
          console.log(`🔥 [realtimeManager] Event for ${config.table}:`, payload);
          console.log(`🔥 [realtimeManager] Calling callback for ${config.table}`);
          config.callback(payload);
        }
      );
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      logger.info(`Channel ${channelKey} status: ${status}`);
      console.log(`🔥 [REAL-TIME] Channel ${channelKey} status: ${status}`);
      
      // Update status manager
      if (status === 'SUBSCRIBED') {
        realtimeStatusManager.setChannelStatus(channelKey, 'connected');
      } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
        realtimeStatusManager.setChannelStatus(channelKey, 'failed');
        logger.error(`Channel ${channelKey} failed with status: ${status}`);
        // Remove the failed channel from our tracking
        this.channels.delete(channelKey);
        this.subscriptions.delete(channelKey);
      } else if (status === 'CHANNEL_ERROR') {
        realtimeStatusManager.setChannelStatus(channelKey, 'failed');
      } else {
        realtimeStatusManager.setChannelStatus(channelKey, 'connecting');
      }
    });

    // Store the channel and set reference count
    this.channels.set(channelKey, channel);
    this.subscriptions.set(channelKey, 1);
    
    logger.info(`Created new subscription for ${channelKey}`);
    return channelKey;
  }

  unsubscribe(channelKey: string): void {
    const count = this.subscriptions.get(channelKey) || 0;
    
    if (count <= 1) {
      // Last subscription, remove the channel
      const channel = this.channels.get(channelKey);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(channelKey);
        this.subscriptions.delete(channelKey);
        logger.info(`Removed subscription for ${channelKey}`);
      }
    } else {
      // Decrement reference count
      this.subscriptions.set(channelKey, count - 1);
      logger.info(`Decremented subscription count for ${channelKey}, remaining: ${count - 1}`);
    }
  }

  cleanup(): void {
    logger.info('Cleaning up all real-time subscriptions');
    this.channels.forEach((channel, key) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();