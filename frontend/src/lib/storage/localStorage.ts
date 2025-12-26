import { STORAGE_KEYS } from '../constants';

/**
 * LocalStorage wrapper with type safety
 */
class LocalStorage {
  /**
   * Get item from localStorage
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set item in localStorage
   */
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  }

  /**
   * Clear all localStorage
   */
  clear(): void {
    localStorage.clear();
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Object.keys(localStorage);
  }

  /**
   * Get storage size (approximate, in bytes)
   */
  getSize(): number {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
}

// Create singleton instance
const storage = new LocalStorage();

/**
 * Encrypted storage helpers
 * Note: These use simple base64 encoding. Actual encryption should use
 * the encryption utilities with the master password-derived key.
 */
export const encryptedStorage = {
  /**
   * Store encrypted data
   */
  setEncrypted: (key: string, data: string, encryptionKey: string): boolean => {
    try {
      // In production, this should use AES encryption
      // For now, we'll use a simple encoding (NOT secure - replace with actual encryption)
      const encoded = btoa(data);
      return storage.set(key, encoded);
    } catch (error) {
      console.error('Error storing encrypted data:', error);
      return false;
    }
  },

  /**
   * Retrieve and decrypt data
   */
  getEncrypted: (key: string, encryptionKey: string): string | null => {
    try {
      const encoded = storage.get<string>(key);
      if (!encoded) return null;
      // In production, this should use AES decryption
      return atob(encoded);
    } catch (error) {
      console.error('Error retrieving encrypted data:', error);
      return null;
    }
  },
};

/**
 * Storage helpers for app-specific keys
 */
export const appStorage = {
  getAccessToken: (): string | null => {
    return storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN) || null;
  },

  setAccessToken: (token: string): void => {
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  getRefreshToken: (): string | null => {
    return storage.get<string>(STORAGE_KEYS.REFRESH_TOKEN) || null;
  },

  setRefreshToken: (token: string): void => {
    storage.set(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  getUser: () => {
    return storage.get(STORAGE_KEYS.USER);
  },

  setUser: (user: any): void => {
    storage.set(STORAGE_KEYS.USER, user);
  },

  clearAuth: (): void => {
    storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    storage.remove(STORAGE_KEYS.USER);
  },

  getTheme: (): 'dark' | 'light' => {
    return storage.get<'dark' | 'light'>(STORAGE_KEYS.THEME) || 'dark';
  },

  setTheme: (theme: 'dark' | 'light'): void => {
    storage.set(STORAGE_KEYS.THEME, theme);
  },

  getLastSync: (): string | null => {
    return storage.get<string>(STORAGE_KEYS.LAST_SYNC) || null;
  },

  setLastSync: (timestamp: string): void => {
    storage.set(STORAGE_KEYS.LAST_SYNC, timestamp);
  },
};

export default storage;

