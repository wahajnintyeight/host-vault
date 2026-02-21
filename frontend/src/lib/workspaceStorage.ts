/**
 * Workspace storage utilities for localStorage management
 */

import { Workspace } from '../types/workspace';

const WORKSPACES_STORAGE_KEY = 'terminal-workspaces';

/**
 * Load workspaces from localStorage
 */
export function loadWorkspacesFromStorage(): Workspace[] {
  try {
    const stored = localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (!stored) {
      console.log('[WORKSPACE] No workspaces found in storage');
      return [];
    }
    
    const workspaces = JSON.parse(stored) as Workspace[];
    console.log('[WORKSPACE] Loaded', workspaces.length, 'workspaces from storage');
    return workspaces;
  } catch (error) {
    console.error('[WORKSPACE] Failed to load workspaces from storage:', error);
    return [];
  }
}

/**
 * Save workspaces to localStorage
 */
export function saveWorkspacesToStorage(workspaces: Workspace[]): void {
  try {
    const serialized = JSON.stringify(workspaces, null, 2);
    localStorage.setItem(WORKSPACES_STORAGE_KEY, serialized);
    console.log('[WORKSPACE] Saved', workspaces.length, 'workspaces to storage');
  } catch (error) {
    console.error('[WORKSPACE] Failed to save workspaces to storage:', error);
    
    // Check if quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please delete some workspaces to free up space.');
    }
  }
}

/**
 * Export workspaces to JSON file
 */
export function exportWorkspacesToFile(workspaces: Workspace[]): void {
  try {
    const dataStr = JSON.stringify(workspaces, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `terminal-workspaces-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('[WORKSPACE] Exported', workspaces.length, 'workspaces to file');
  } catch (error) {
    console.error('[WORKSPACE] Failed to export workspaces:', error);
    alert('Failed to export workspaces');
  }
}

/**
 * Import workspaces from JSON file
 */
export function importWorkspacesFromFile(
  file: File,
  onSuccess: (workspaces: Workspace[]) => void,
  onError: (error: Error) => void
): void {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const workspaces = JSON.parse(content) as Workspace[];
      
      // Validate structure
      if (!Array.isArray(workspaces)) {
        throw new Error('Invalid workspace file format');
      }
      
      // Basic validation of workspace structure
      for (const workspace of workspaces) {
        if (!workspace.id || !workspace.name || !workspace.tabs) {
          throw new Error('Invalid workspace structure');
        }
      }
      
      console.log('[WORKSPACE] Imported', workspaces.length, 'workspaces from file');
      onSuccess(workspaces);
    } catch (error) {
      console.error('[WORKSPACE] Failed to import workspaces:', error);
      onError(error as Error);
    }
  };
  
  reader.onerror = () => {
    const error = new Error('Failed to read file');
    console.error('[WORKSPACE]', error);
    onError(error);
  };
  
  reader.readAsText(file);
}

/**
 * Clear all workspaces from storage
 */
export function clearWorkspacesFromStorage(): void {
  try {
    localStorage.removeItem(WORKSPACES_STORAGE_KEY);
    console.log('[WORKSPACE] Cleared all workspaces from storage');
  } catch (error) {
    console.error('[WORKSPACE] Failed to clear workspaces:', error);
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): { used: number; total: number; percentage: number } {
  try {
    const stored = localStorage.getItem(WORKSPACES_STORAGE_KEY);
    const used = stored ? new Blob([stored]).size : 0;
    const total = 5 * 1024 * 1024; // Approximate 5MB localStorage limit
    const percentage = (used / total) * 100;
    
    return { used, total, percentage };
  } catch (error) {
    console.error('[WORKSPACE] Failed to get storage info:', error);
    return { used: 0, total: 0, percentage: 0 };
  }
}
