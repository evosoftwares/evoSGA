import React from 'react';
import { HardDrive, Trash2, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StorageUsageProps {
  totalStorage: number; // em GB
  usedStorage: number; // em GB
  storageBreakdown?: {
    documents: number;
    images: number;
    videos: number;
    audio: number;
    other: number;
  };
}

const StorageUsage: React.FC<StorageUsageProps> = ({
  totalStorage,
  usedStorage,
  storageBreakdown = {
    documents: 0,
    images: 0,
    videos: 0,
    audio: 0,
    other: 0,
  },
}) => {
  const usagePercentage = (usedStorage / totalStorage) * 100;
  const availableStorage = totalStorage - usedStorage;

  const formatStorage = (gb: number): string => {
    if (gb < 1) {
      return `${Math.round(gb * 1024)} MB`;
    }
    return `${gb.toFixed(1)} GB`;
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getUsageStatus = (percentage: number): { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' } => {
    if (percentage >= 90) return { label: 'Crítico', variant: 'destructive' };
    if (percentage >= 75) return { label: 'Atenção', variant: 'secondary' };
    return { label: 'Normal', variant: 'outline' };
  };

  const storageTypes = [
    { 
      type: 'documents', 
      label: 'Documentos', 
      value: storageBreakdown.documents, 
      color: 'bg-red-400',
      icon: '📄'
    },
    { 
      type: 'images', 
      label: 'Imagens', 
      value: storageBreakdown.images, 
      color: 'bg-green-400',
      icon: '🖼️'
    },
    { 
      type: 'videos', 
      label: 'Vídeos', 
      value: storageBreakdown.videos, 
      color: 'bg-purple-400',
      icon: '🎥'
    },
    { 
      type: 'audio', 
      label: 'Áudios', 
      value: storageBreakdown.audio, 
      color: 'bg-orange-400',
      icon: '🎵'
    },
    { 
      type: 'other', 
      label: 'Outros', 
      value: storageBreakdown.other, 
      color: 'bg-gray-400',
      icon: '📦'
    },
  ].filter(item => item.value > 0);

  const status = getUsageStatus(usagePercentage);

  return null;
};

export default StorageUsage;