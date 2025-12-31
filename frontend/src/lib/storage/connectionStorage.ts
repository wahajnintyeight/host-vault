import { GetGuestConnectionsPath, GetUserConnectionsPath, ReadFile, WriteFile, FileExists } from '../../../wailsjs/go/main/App';
import type { SSHConnection } from '../../types';
import { encryptDataWithKeyphrase, decryptDataWithKeyphrase } from '../encryption/crypto';

/**
 * Check if Wails runtime is available
 */
const isWailsAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.go && window.go.main && window.go.main.App;
};

/**
 * Get guest encryption keyphrase
 */
const getGuestEncryptionKeyphrase = async (): Promise<string | undefined> => {
  const wailsApp = (window as any)?.go?.main?.App;
  if (wailsApp?.GetGuestEncryptionKeyphrase) {
    return await wailsApp.GetGuestEncryptionKeyphrase();
  }
  return undefined;
};

/**
 * Helper function to safely parse JSON or return original string
 */
const tryParseJSON = (str: string): any => {
  try {
    const trimmed = str.trim();
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 2) {
      return JSON.parse(str);
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Encrypt connection passwords/keys for guest mode
 */
const encryptConnectionCredentials = async (
  connection: SSHConnection,
  keyphrase: string
): Promise<SSHConnection> => {
  const encrypted = { ...connection };

  // Encrypt password if present
  if (encrypted.passwordEncrypted && encrypted.passwordEncrypted.trim()) {
    const passwordData = tryParseJSON(encrypted.passwordEncrypted);
    if (!passwordData) {
      // It's plain text, encrypt it
      try {
        const encryptedData = encryptDataWithKeyphrase(encrypted.passwordEncrypted, keyphrase);
        encrypted.passwordEncrypted = JSON.stringify(encryptedData);
      } catch (error) {
        console.error('Failed to encrypt password:', error);
        // Keep as plain text if encryption fails
      }
    }
    // Already encrypted, keep as is
  }

  // Encrypt private key if present
  if (encrypted.privateKeyEncrypted && encrypted.privateKeyEncrypted.trim()) {
    const privateKeyData = tryParseJSON(encrypted.privateKeyEncrypted);
    if (!privateKeyData) {
      // It's plain text, encrypt it
      try {
        const encryptedData = encryptDataWithKeyphrase(encrypted.privateKeyEncrypted, keyphrase);
        encrypted.privateKeyEncrypted = JSON.stringify(encryptedData);
      } catch (error) {
        console.error('Failed to encrypt private key:', error);
        // Keep as plain text if encryption fails
      }
    }
    // Already encrypted, keep as is
  }

  return encrypted;
};

/**
 * Decrypt connection passwords/keys for guest mode
 */
const decryptConnectionCredentials = async (
  connection: SSHConnection,
  keyphrase: string
): Promise<SSHConnection> => {
  const decrypted = { ...connection };

  // Decrypt password if present
  if (decrypted.passwordEncrypted && decrypted.passwordEncrypted.trim()) {
    const passwordData = tryParseJSON(decrypted.passwordEncrypted);
    if (passwordData) {
      // It's encrypted JSON data
      try {
        const decryptedPassword = decryptDataWithKeyphrase(passwordData, keyphrase);
        decrypted.passwordEncrypted = decryptedPassword;
      } catch (error) {
        console.error('Failed to decrypt password:', error);
        // Keep encrypted if decryption fails
      }
    }
    // Already plain text, keep as is
  }

  // Decrypt private key if present
  if (decrypted.privateKeyEncrypted && decrypted.privateKeyEncrypted.trim()) {
    const privateKeyData = tryParseJSON(decrypted.privateKeyEncrypted);
    if (privateKeyData) {
      // It's encrypted JSON data
      try {
        const decryptedPrivateKey = decryptDataWithKeyphrase(privateKeyData, keyphrase);
        decrypted.privateKeyEncrypted = decryptedPrivateKey;
      } catch (error) {
        console.error('Failed to decrypt private key:', error);
        // Keep encrypted if decryption fails
      }
    }
    // Already plain text, keep as is
  }

  return decrypted;
};

/**
 * Load connections from file system
 */
export const loadConnectionsFromFile = async (
  isGuest: boolean,
  userId?: string
): Promise<SSHConnection[]> => {
  if (!isWailsAvailable()) {
    // Fallback to localStorage if Wails is not available (dev mode)
    return loadConnectionsFromLocalStorage();
  }

  try {
    let connectionsPath: string;

    if (isGuest) {
      connectionsPath = await GetGuestConnectionsPath();
    } else if (userId) {
      connectionsPath = await GetUserConnectionsPath(userId);
    } else {
      // Fallback to guest connections
      connectionsPath = await GetGuestConnectionsPath();
    }

    const exists = await FileExists(connectionsPath);
    if (!exists) {
      return [];
    }

    const fileContent = await ReadFile(connectionsPath);
    if (!fileContent) {
      return [];
    }

    const data = JSON.parse(fileContent);
    const connections: SSHConnection[] = data.connections || [];

    // Decrypt credentials for guest mode when loading
    if (isGuest) {
      const keyphrase = await getGuestEncryptionKeyphrase();
      if (keyphrase) {
        const decryptedConnections = await Promise.all(
          connections.map((conn) => decryptConnectionCredentials(conn, keyphrase))
        );
        return decryptedConnections;
      }
    }

    return connections;
  } catch (error) {
    console.error('Failed to load connections from file:', error);
    // Fallback to localStorage
    return loadConnectionsFromLocalStorage();
  }
};

/**
 * Save connections to file system
 */
export const saveConnectionsToFile = async (
  connections: SSHConnection[],
  isGuest: boolean,
  userId?: string
): Promise<boolean> => {
  if (!isWailsAvailable()) {
    // Fallback to localStorage if Wails is not available (dev mode)
    saveConnectionsToLocalStorage(connections);
    return true;
  }

  try {
    let connectionsPath: string;

    if (isGuest) {
      connectionsPath = await GetGuestConnectionsPath();
    } else if (userId) {
      connectionsPath = await GetUserConnectionsPath(userId);
    } else {
      // Fallback to guest connections
      connectionsPath = await GetGuestConnectionsPath();
    }

    // Encrypt credentials for guest mode before saving
    let connectionsToSave = connections;
    if (isGuest) {
      const keyphrase = await getGuestEncryptionKeyphrase();
      if (keyphrase) {
        connectionsToSave = await Promise.all(
          connections.map((conn) => encryptConnectionCredentials(conn, keyphrase))
        );
      }
    }

    const connectionsData = JSON.stringify(
      {
        connections: connectionsToSave,
        lastUpdated: Date.now(),
      },
      null,
      2
    );

    await WriteFile(connectionsPath, connectionsData);
    return true;
  } catch (error) {
    console.error('Failed to save connections to file:', error);
    // Fallback to localStorage
    saveConnectionsToLocalStorage(connections);
    return false;
  }
};

/**
 * Fallback: Load connections from localStorage
 */
const loadConnectionsFromLocalStorage = (): SSHConnection[] => {
  try {
    const stored = localStorage.getItem('ssh-connections');
    if (stored) {
      const data = JSON.parse(stored);
      return data.connections || [];
    }
  } catch (error) {
    console.error('Failed to load connections from localStorage:', error);
  }
  return [];
};

/**
 * Fallback: Save connections to localStorage
 */
const saveConnectionsToLocalStorage = (connections: SSHConnection[]): void => {
  try {
    localStorage.setItem(
      'ssh-connections',
      JSON.stringify({
        connections,
        lastUpdated: Date.now(),
      })
    );
  } catch (error) {
    console.error('Failed to save connections to localStorage:', error);
  }
};

