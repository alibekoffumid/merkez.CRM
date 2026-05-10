import { useState, useEffect } from 'react';
import { db } from '../services/offlineDB';
import { useLiveQuery } from 'dexie-react-hooks';

export const useSyncStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Use dexie-react-hooks to automatically re-render when pendingSales changes
  const pendingCount = useLiveQuery(
    async () => {
      const all = await db.pendingSales.toArray();
      return all.filter(s => !s.synced).length;
    },
    [],
    0
  );

  return { isOnline, pendingCount };
};
