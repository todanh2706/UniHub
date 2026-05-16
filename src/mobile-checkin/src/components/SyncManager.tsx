import React, { useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getPendingCheckins, markAsSynced } from '../api/offlineDb';
import api from '../api/axios';

const SyncManager: React.FC = () => {
  const isOnline = useOnlineStatus();
  const isSyncing = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSync = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      const pending = getPendingCheckins();
      if (pending.length === 0) return;

      console.log(`[SyncManager] Found ${pending.length} pending check-ins. Syncing...`);

      const syncPayload = {
        items: pending.map(p => ({
          qrToken: p.qr_token,
          clientEventId: p.client_event_id,
          checkedInAt: p.checked_in_at,
        })),
      };

      const res = await api.post('/checkins/sync', syncPayload);

      if (res.status === 200 && res.data) {
        const { synced = [], errors = [] } = res.data;

        const successfulIds = synced.map((s: { clientEventId: string }) => s.clientEventId);

        interface ErrorItem {
          clientEventId: string;
          errorCode?: string;
          code?: string;
          message?: string;
        }

        const nonRetryableErrorIds = (errors as ErrorItem[])
          .filter((e) =>
            ['INVALID_QR', 'ALREADY_CHECKED_IN', 'REGISTRATION_CHECKED_IN', 'REGISTRATION_CANCELLED', 'REGISTRATION_EXPIRED'].includes(e.errorCode || e.code || '')
          )
          .map((e) => e.clientEventId);

        const allResolvedIds = [...successfulIds, ...nonRetryableErrorIds];

        if (allResolvedIds.length > 0) {
          markAsSynced(allResolvedIds);
          console.log(
            `[SyncManager] Resolved ${allResolvedIds.length} items ` +
            `(${successfulIds.length} synced, ${nonRetryableErrorIds.length} non-retryable errors)`
          );
        }

        const retryableErrors = (errors as ErrorItem[]).filter(
          (e) => !nonRetryableErrorIds.includes(e.clientEventId)
        );
        if (retryableErrors.length > 0) {
          console.warn(`[SyncManager] ${retryableErrors.length} items will be retried on next sync`);
        }
      }
    } catch (err) {
      console.error('[SyncManager] Sync failed:', err);
    } finally {
      isSyncing.current = false;
    }
  }, []);

  useEffect(() => {
    if (isOnline) {
      const timeout = setTimeout(() => {
        handleSync();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, handleSync]);

  useEffect(() => {
    if (isOnline) {
      syncIntervalRef.current = setInterval(() => {
        handleSync();
      }, 30000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isOnline, handleSync]);

  return null;
};

export default SyncManager;
