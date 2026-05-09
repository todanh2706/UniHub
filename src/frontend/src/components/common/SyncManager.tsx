import React, { useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getPendingCheckins, markAsSynced } from '../../api/offlineDb';
import api from '../../api/axios';

/**
 * SyncManager - Background synchronization component.
 * 
 * Listens for network status changes and automatically syncs
 * pending offline check-in records when connectivity is restored.
 * Also performs periodic sync attempts while online as a safety net.
 * 
 * This component renders nothing - it only manages side effects.
 */
const SyncManager: React.FC = () => {
  const isOnline = useOnlineStatus();
  const isSyncing = useRef(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSync = useCallback(async () => {
    // Prevent concurrent sync operations
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      const pending = await getPendingCheckins();
      if (pending.length === 0) return;

      console.log(`[SyncManager] Found ${pending.length} pending check-ins. Syncing...`);

      // Map local DB records to the API request format
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

        // Mark successfully synced items (both newly created and already-synced)
        const successfulIds = synced.map((s: { clientEventId: string }) => s.clientEventId);

        // Also mark items with non-retryable errors (INVALID_QR, ALREADY_CHECKED_IN)
        // so they don't keep retrying on every sync
        interface ErrorItem {
          clientEventId: string;
          errorCode: string;
          message?: string;
        }

        const nonRetryableErrorIds = (errors as ErrorItem[])
          .filter((e) =>
            ['INVALID_QR', 'ALREADY_CHECKED_IN', 'REGISTRATION_CANCELLED', 'REGISTRATION_EXPIRED'].includes(e.errorCode)
          )
          .map((e) => e.clientEventId);

        const allResolvedIds = [...successfulIds, ...nonRetryableErrorIds];

        if (allResolvedIds.length > 0) {
          await markAsSynced(allResolvedIds);
          console.log(
            `[SyncManager] Resolved ${allResolvedIds.length} items ` +
            `(${successfulIds.length} synced, ${nonRetryableErrorIds.length} non-retryable errors)`
          );
        }

        // Log retryable errors for debugging
        const retryableErrors = (errors as ErrorItem[]).filter(
          (e) => !nonRetryableErrorIds.includes(e.clientEventId)
        );
        if (retryableErrors.length > 0) {
          console.warn(`[SyncManager] ${retryableErrors.length} items will be retried on next sync`);
        }
      }
    } catch (err) {
      console.error('[SyncManager] Sync failed:', err);
      // Don't throw - the next sync attempt (periodic or on reconnect) will try again
    } finally {
      isSyncing.current = false;
    }
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      // Small delay to let network stabilize after reconnect
      const timeout = setTimeout(() => {
        handleSync();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, handleSync]);

  // Periodic sync every 30 seconds while online (safety net)
  useEffect(() => {
    if (isOnline) {
      syncIntervalRef.current = setInterval(() => {
        handleSync();
      }, 30_000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isOnline, handleSync]);

  return null; // This component doesn't render anything
};

export default SyncManager;
