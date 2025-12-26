import { GetGuestConfigPath, GetUserConfigPath, ReadFile, WriteFile, FileExists } from '../../../wailsjs/go/main/App';
import type { UserConfig } from '../../types/config';
import { DEFAULT_USER_CONFIG } from '../../types/config';

/**
 * Check if Wails runtime is available
 */
const isWailsAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.go && window.go.main && window.go.main.App;
};

/**
 * Load config from file system
 */
export const loadConfigFromFile = async (isGuest: boolean, userId?: string): Promise<Partial<UserConfig> | null> => {
  if (!isWailsAvailable()) {
    // Fallback to localStorage if Wails is not available (dev mode)
    return loadConfigFromLocalStorage(isGuest, userId);
  }

  try {
    let configPath: string;
    
    if (isGuest) {
      configPath = await GetGuestConfigPath();
    } else if (userId) {
      configPath = await GetUserConfigPath(userId);
    } else {
      // Fallback to guest config
      configPath = await GetGuestConfigPath();
    }

    const exists = await FileExists(configPath);
    if (!exists) {
      return null;
    }

    const fileContent = await ReadFile(configPath);
    if (!fileContent) {
      return null;
    }

    return JSON.parse(fileContent) as Partial<UserConfig>;
  } catch (error) {
    console.error('Failed to load config from file:', error);
    // Fallback to localStorage
    return loadConfigFromLocalStorage(isGuest, userId);
  }
};

/**
 * Save config to file system
 */
export const saveConfigToFile = async (config: Partial<UserConfig>, isGuest: boolean, userId?: string): Promise<boolean> => {
  if (!isWailsAvailable()) {
    // Fallback to localStorage if Wails is not available (dev mode)
    saveConfigToLocalStorage(config, isGuest, userId);
    return true;
  }

  try {
    let configPath: string;
    
    if (isGuest) {
      configPath = await GetGuestConfigPath();
    } else if (userId) {
      configPath = await GetUserConfigPath(userId);
    } else {
      // Fallback to guest config
      configPath = await GetGuestConfigPath();
    }

    const configData = JSON.stringify({
      ...config,
      lastUpdated: Date.now(),
    }, null, 2);

    await WriteFile(configPath, configData);
    return true;
  } catch (error) {
    console.error('Failed to save config to file:', error);
    // Fallback to localStorage
    saveConfigToLocalStorage(config, isGuest, userId);
    return false;
  }
};

/**
 * Fallback: Load config from localStorage
 */
const loadConfigFromLocalStorage = (isGuest: boolean, userId?: string): Partial<UserConfig> | null => {
  try {
    const key = isGuest ? 'guest-config' : (userId ? `user-config-${userId}` : 'user-config-default');
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load config from localStorage:', error);
  }
  return null;
};

/**
 * Fallback: Save config to localStorage
 */
const saveConfigToLocalStorage = (config: Partial<UserConfig>, isGuest: boolean, userId?: string): void => {
  try {
    const key = isGuest ? 'guest-config' : (userId ? `user-config-${userId}` : 'user-config-default');
    localStorage.setItem(key, JSON.stringify({
      ...config,
      lastUpdated: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to save config to localStorage:', error);
  }
};

