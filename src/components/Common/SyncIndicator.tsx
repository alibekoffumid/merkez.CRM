import React from 'react';
import { Cloud, CloudOff, Loader2, CloudAlert } from 'lucide-react';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { useTranslation } from 'react-i18next';

/**
 * SyncIndicator — visual cloud icon showing sync status.
 * Green = synced, Yellow = pending, Red = offline, Spinning = syncing
 */
const SyncIndicator: React.FC = () => {
  const { status, pendingCount, forceSync } = useSyncStatus();
  const { t } = useTranslation();

  const config: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    synced: {
      icon: <Cloud className="w-4 h-4" />,
      color: 'text-green-500',
      bg: 'bg-green-50 border-green-200',
      label: t('sync.synced') || 'Synced',
    },
    pending: {
      icon: <CloudAlert className="w-4 h-4" />,
      color: 'text-amber-500',
      bg: 'bg-amber-50 border-amber-200',
      label: `${pendingCount} ${t('sync.pending') || 'pending'}`,
    },
    syncing: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      color: 'text-blue-500',
      bg: 'bg-blue-50 border-blue-200',
      label: t('sync.syncing') || 'Syncing...',
    },
    offline: {
      icon: <CloudOff className="w-4 h-4" />,
      color: 'text-red-500',
      bg: 'bg-red-50 border-red-200',
      label: t('sync.offline') || 'Offline',
    },
  };

  const current = config[status] || config.synced;

  return (
    <button
      onClick={forceSync}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all hover:scale-105 active:scale-95 ${current.color} ${current.bg}`}
      title={`${current.label} — Click to sync`}
    >
      {current.icon}
      <span className="hidden sm:inline">{current.label}</span>
    </button>
  );
};

export default SyncIndicator;
