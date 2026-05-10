import { useState, useEffect, useCallback } from 'react';
import { syncManager, type SyncStatus } from '../services/syncManager';

/**
 * React hook for tracking sync status.
 * Returns the current status and pending sale count.
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((newStatus, count) => {
      setStatus(newStatus);
      setPendingCount(count);
    });

    return unsubscribe;
  }, []);

  const forceSync = useCallback(async () => {
    await syncManager.syncAll();
  }, []);

  return { status, pendingCount, forceSync };
}
