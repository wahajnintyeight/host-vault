import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import apiClient, { handleApiResponse } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import type { SyncStatus } from '../../types';

/**
 * Check if sync is available (not in guest mode)
 */
export function isSyncAvailable(): boolean {
  const { isGuestMode } = useAuthStore.getState();
  return !isGuestMode;
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  if (!isSyncAvailable()) {
    return {
      lastSyncAt: undefined,
      pendingChanges: 0,
      conflicts: [],
      status: 'synced',
    };
  }

  try {
    const response = await apiClient.get<{ data: SyncStatus }>(
      API_ENDPOINTS.SYNC.STATUS
    );
    return handleApiResponse<SyncStatus>(response);
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return {
      lastSyncAt: undefined,
      pendingChanges: 0,
      conflicts: [],
      status: 'error',
    };
  }
}

/**
 * Push local changes to cloud
 */
export async function pushChanges(): Promise<void> {
  if (!isSyncAvailable()) {
    const { addToast } = useAppStore.getState();
    addToast({
      type: 'warning',
      title: 'Sync Unavailable',
      message: 'Cloud sync is not available in Guest Mode. Please sign in to enable sync.',
    });
    throw new Error('Sync not available in guest mode');
  }

  await apiClient.post(API_ENDPOINTS.SYNC.PUSH);
}

/**
 * Pull changes from cloud
 */
export async function pullChanges(): Promise<void> {
  if (!isSyncAvailable()) {
    const { addToast } = useAppStore.getState();
    addToast({
      type: 'warning',
      title: 'Sync Unavailable',
      message: 'Cloud sync is not available in Guest Mode. Please sign in to enable sync.',
    });
    throw new Error('Sync not available in guest mode');
  }

  await apiClient.get(API_ENDPOINTS.SYNC.PULL);
}

/**
 * Sync hook for components
 */
export function useSync() {
  const { isGuestMode } = useAuthStore();
  const { addToast } = useAppStore();

  const syncAvailable = !isGuestMode;

  const showSyncUnavailableToast = () => {
    addToast({
      type: 'warning',
      title: 'Sync Unavailable',
      message: 'Cloud sync is not available in Guest Mode. Please sign in to enable sync.',
    });
  };

  return {
    syncAvailable,
    showSyncUnavailableToast,
    getSyncStatus: syncAvailable ? getSyncStatus : () => Promise.resolve({
      lastSyncAt: undefined,
      pendingChanges: 0,
      conflicts: [],
      status: 'synced' as const,
    }),
    pushChanges: syncAvailable ? pushChanges : showSyncUnavailableToast,
    pullChanges: syncAvailable ? pullChanges : showSyncUnavailableToast,
  };
}

