import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Plus,
  Search,
  Download,
  Upload,
  Server,
  Loader2,
  Terminal,
  Zap,
  Star,
} from 'lucide-react';
import { useConnectionStore } from '../store/connectionStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';
import { useTerminalStore } from '../store/terminalStore';
import { ConnectionModal, ConnectionFormData } from '../components/connections/ConnectionModal';
import { QuickConnectModal } from '../components/connections/QuickConnectModal';
import { PasswordPromptModal } from '../components/connections/PasswordPromptModal';
import { HostKeyVerificationModal } from '../components/connections/HostKeyVerificationModal';
import { ConnectionFlowModal } from '../components/connections/ConnectionFlowModal';
import { ConnectionCard } from '../components/connections/ConnectionCard';
import type { SSHConnection } from '../types';
import { encryptPassword, encryptPrivateKey, decryptPassword, decryptPrivateKey, encryptDataWithKeyphrase, decryptDataWithKeyphrase } from '../lib/encryption/crypto';
import { useAuthStore } from '../store/authStore';
import { ShowSaveFileDialog, WriteFile } from '../../wailsjs/go/main/App';
import { loadConnectionsFromFile, saveConnectionsToFile } from '../lib/storage/connectionStorage';

// Access Wails function to get guest encryption keyphrase
const getGuestEncryptionKeyphrase = async (): Promise<string | undefined> => {
  const wailsApp = (window as any)?.go?.main?.App;
  if (wailsApp?.GetGuestEncryptionKeyphrase) {
    const keyphrase = await wailsApp.GetGuestEncryptionKeyphrase();
    console.log("Getting guest encryption keyphrase");
    return keyphrase;
  }
  return undefined;
};

// Helper function to safely parse JSON or return original string
const tryParseJSON = (str: string): any => {
  try {
    // Check if string looks like JSON (starts with { or [)
    const trimmed = str.trim();
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 2) {
      return JSON.parse(str);
    }
    // Not JSON, return original string
    return null;
  } catch {
    // Not valid JSON, return null to indicate it's plain text
    return null;
  }
};

// Access Wails functions through window object to avoid TypeScript import errors
// These functions will be available after bindings are regenerated with 'wails dev' or 'wails build'
const getSSHHostKeyInfo = (host: string, port: number): Promise<any> | undefined => {
  const wailsApp = (window as any)?.go?.main?.App;
  if (wailsApp?.GetSSHHostKeyInfo) {
    return wailsApp.GetSSHHostKeyInfo(host, port);
  }
  return undefined;
};

const acceptSSHHostKey = (host: string, port: number, keyBase64: string, isGuest: boolean): Promise<void> | undefined => {
  const wailsApp = (window as any)?.go?.main?.App;
  if (wailsApp?.AcceptSSHHostKey) {
    return wailsApp.AcceptSSHHostKey(host, port, keyBase64, isGuest);
  }
  return undefined;
};

export const ConnectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    connections,
    filteredConnections,
    isLoading,
    searchQuery,
    setSearchQuery,
    addConnection,
    updateConnection,
    deleteConnection,
    setConnections,
  } = useConnectionStore();
  const { createSSHTerminal } = useTerminalStore();
  const { isGuestMode, user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SSHConnection | null>(null);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showHostKeyVerification, setShowHostKeyVerification] = useState(false);
  const [showConnectionFlow, setShowConnectionFlow] = useState(false);
  const [hostKeyVerificationInfo, setHostKeyVerificationInfo] = useState<{
    host: string;
    port: number;
    connection: SSHConnection;
  } | null>(null);
  const [flowConnection, setFlowConnection] = useState<SSHConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    username: string;
    host: string;
    port: number;
  } | null>(null);
  const [connectingState, setConnectingState] = useState<{
    connectionId: string | null;
    error: string | null;
    isRetrying: boolean;
  }>({
    connectionId: null,
    error: null,
    isRetrying: false,
  });
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMultiSelectDrag, setIsMultiSelectDrag] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    // Load connections from file storage
    const loadConnections = async () => {
      try {
        const userId = user?.id;
        const loadedConnections = await loadConnectionsFromFile(isGuestMode, userId);
        setConnections(loadedConnections);
      } catch (e) {
        console.error('Failed to load connections:', e);
        // Fallback to localStorage for backward compatibility
        const stored = localStorage.getItem('ssh-connections');
        if (stored) {
          try {
            const data = JSON.parse(stored);
            setConnections(data.connections || []);
          } catch (err) {
            console.error('Failed to load connections from localStorage:', err);
          }
        }
      }
    };
    loadConnections();
  }, [setConnections, isGuestMode, user?.id]);

  // Calculate selection box bounds
  const getSelectionBox = () => {
    if (!dragStart || !dragEnd) return null;
    return {
      left: Math.min(dragStart.x, dragEnd.x),
      top: Math.min(dragStart.y, dragEnd.y),
      right: Math.max(dragStart.x, dragEnd.x),
      bottom: Math.max(dragStart.y, dragEnd.y),
    };
  };

  // Check if a card intersects with selection box
  const isCardInSelection = useCallback((cardId: string) => {
    const box = getSelectionBox();
    if (!box) return false;

    const card = cardRefs.current.get(cardId);
    if (!card) return false;

    const cardRect = card.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return false;

    // Convert to container-relative coordinates
    const cardLeft = cardRect.left - containerRect.left;
    const cardTop = cardRect.top - containerRect.top;
    const cardRight = cardRect.right - containerRect.left;
    const cardBottom = cardRect.bottom - containerRect.top;

    // Check intersection
    return !(
      box.right < cardLeft ||
      box.left > cardRight ||
      box.bottom < cardTop ||
      box.top > cardBottom
    );
  }, [dragStart, dragEnd]);

  // Update selection based on drag box
  useEffect(() => {
    if (!isDragging || !dragStart || !dragEnd) return;

    const cardsInBox = new Set<string>();
    filteredConnections.forEach((conn) => {
      if (isCardInSelection(conn.id)) {
        cardsInBox.add(conn.id);
      }
    });

    if (isMultiSelectDrag) {
      // Add to existing selection
      setSelectedConnectionIds((prev) => {
        const newSet = new Set(prev);
        cardsInBox.forEach((id) => newSet.add(id));
        return newSet;
      });
    } else {
      // Replace selection
      setSelectedConnectionIds(cardsInBox);
    }
  }, [isDragging, dragStart, dragEnd, filteredConnections, isCardInSelection, isMultiSelectDrag]);

  // Mouse event handlers for drag selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start drag if clicking on buttons, modals, inputs, or cards directly
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[role="dialog"]') ||
      target.closest('.modal') ||
      target.closest('.connection-card')
    ) {
      return;
    }

    if (e.button === 0) { // Left mouse button
      e.preventDefault(); // Prevent text selection
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const isMulti = e.ctrlKey || e.metaKey;
        setIsMultiSelectDrag(isMulti);
        setIsDragging(true);
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDragStart({ x, y });
        setDragEnd({ x, y });
        // Clear selection when starting new drag (unless Ctrl/Cmd is held)
        if (!isMulti) {
          setSelectedConnectionIds(new Set());
        }
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    e.preventDefault(); // Prevent text selection during drag
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragEnd({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, []);

  // Clear selection when clicking outside cards (but not during drag)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isDragging) return;

      const target = e.target as HTMLElement;
      // Don't clear if clicking on buttons, modals, or cards
      if (
        target.closest('.connection-card') ||
        target.closest('button') ||
        target.closest('[role="dialog"]') ||
        target.closest('.modal')
      ) {
        return;
      }
      setSelectedConnectionIds(new Set());
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDragging]);

  const saveToStorage = async (conns: SSHConnection[]) => {
    try {
      const userId = user?.id;
      await saveConnectionsToFile(conns, isGuestMode, userId);
    } catch (error) {
      console.error('Failed to save connections to file:', error);
      // Fallback to localStorage
      localStorage.setItem('ssh-connections', JSON.stringify({ connections: conns }));
    }
  };

  const saveQuickConnectConnection = async (username: string, host: string, port: number, password?: string) => {
    // Check if connection already exists
    const existing = connections.find(
      c => c.host === host && c.port === port && c.username === username
    );

    if (existing) {
      // Update existing connection with password if provided
      if (password) {
        let passwordEncrypted: string | undefined;
        if (!isGuestMode) {
          const encryptionKey = localStorage.getItem('vault_encryption_key');
          if (encryptionKey) {
            try {
              const encrypted = encryptPassword(password, encryptionKey);
              passwordEncrypted = JSON.stringify(encrypted);
            } catch (error) {
              console.error('Failed to encrypt password:', error);
              passwordEncrypted = password;
            }
          } else {
            passwordEncrypted = password;
          }
        } else {
          // In guest mode, use keyphrase-based encryption
          const keyphrase = await getGuestEncryptionKeyphrase();
          if (keyphrase) {
            try {
              const encrypted = encryptDataWithKeyphrase(password, keyphrase);
              passwordEncrypted = JSON.stringify(encrypted);
            } catch (error) {
              console.error('Failed to encrypt password with keyphrase:', error);
              passwordEncrypted = password;
            }
          } else {
            // Fallback to plain text if keyphrase not available
            passwordEncrypted = password;
          }
        }

        const updated: SSHConnection = {
          ...existing,
          passwordEncrypted,
          updatedAt: new Date().toISOString(),
        };
        updateConnection(existing.id, updated);
        const newConns = connections.map(c => c.id === existing.id ? updated : c);
        await saveToStorage(newConns);
      }
      return existing.id;
    }

    // Create new connection
    const now = new Date().toISOString();
    let passwordEncrypted: string | undefined;

    if (password) {
      if (!isGuestMode) {
        const encryptionKey = localStorage.getItem('vault_encryption_key');
        if (encryptionKey) {
          try {
            const encrypted = encryptPassword(password, encryptionKey);
            passwordEncrypted = JSON.stringify(encrypted);
          } catch (error) {
            console.error('Failed to encrypt password:', error);
            passwordEncrypted = password;
          }
        } else {
          // In guest mode, use keyphrase-based encryption
          const keyphrase = await getGuestEncryptionKeyphrase();
          if (keyphrase) {
            try {
              const encrypted = encryptDataWithKeyphrase(password, keyphrase);
              passwordEncrypted = JSON.stringify(encrypted);
            } catch (error) {
              console.error('Failed to encrypt password with keyphrase:', error);
              passwordEncrypted = password;
            }
          } else {
            // Fallback to plain text if keyphrase not available
            passwordEncrypted = password;
          }
        }
      } else {
        passwordEncrypted = password;
      }
    }

    const newConnection: SSHConnection = {
      id: crypto.randomUUID(),
      userId: 'guest',
      name: `${username}@${host}`,
      host,
      port,
      username,
      passwordEncrypted,
      isFavorite: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    addConnection(newConnection);
    await saveToStorage([...connections, newConnection]);
    return newConnection.id;
  };

  const handleOpenModal = (connection?: SSHConnection) => {
    setEditingConnection(connection || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConnection(null);
  };

  const handleSave = async (formData: ConnectionFormData) => {
    const now = new Date().toISOString();

    if (editingConnection) {
      let passwordEncrypted: string | undefined;
      let privateKeyEncrypted: string | undefined;

      // Only encrypt passwords if not in guest mode
      if (!isGuestMode) {
        const encryptionKey = localStorage.getItem('vault_encryption_key');
        if (encryptionKey) {
          try {
            if (formData.authMethod === 'password' && formData.password) {
              const encrypted = encryptPassword(formData.password, encryptionKey);
              passwordEncrypted = JSON.stringify(encrypted);
            }
            if (formData.authMethod === 'key' && formData.privateKey) {
              const encrypted = encryptPrivateKey(formData.privateKey, encryptionKey);
              privateKeyEncrypted = JSON.stringify(encrypted);
            }
          } catch (error) {
            console.error('Failed to encrypt connection credentials:', error);
            // Fall back to storing as plain text or keeping existing values
            passwordEncrypted = formData.password || editingConnection.passwordEncrypted;
            privateKeyEncrypted = formData.privateKey || editingConnection.privateKeyEncrypted;
          }
        } else {
          // No encryption key available, store as plain text
          passwordEncrypted = formData.password || editingConnection.passwordEncrypted;
          privateKeyEncrypted = formData.privateKey || editingConnection.privateKeyEncrypted;
        }
      } else {
        // In guest mode, use keyphrase-based encryption
        const keyphrase = await getGuestEncryptionKeyphrase();
        if (keyphrase) {
          try {
            if (formData.authMethod === 'password' && formData.password) {
              const encrypted = encryptDataWithKeyphrase(formData.password, keyphrase);
              passwordEncrypted = JSON.stringify(encrypted);
            } else {
              passwordEncrypted = editingConnection.passwordEncrypted;
            }
            if (formData.authMethod === 'key' && formData.privateKey) {
              const encrypted = encryptDataWithKeyphrase(formData.privateKey, keyphrase);
              privateKeyEncrypted = JSON.stringify(encrypted);
            } else {
              privateKeyEncrypted = editingConnection.privateKeyEncrypted;
            }
          } catch (error) {
            console.error('Failed to encrypt credentials with keyphrase:', error);
            // Fallback to plain text
            passwordEncrypted = formData.password || editingConnection.passwordEncrypted;
            privateKeyEncrypted = formData.privateKey || editingConnection.privateKeyEncrypted;
          }
        } else {
          // Fallback to plain text if keyphrase not available
          passwordEncrypted = formData.password || editingConnection.passwordEncrypted;
          privateKeyEncrypted = formData.privateKey || editingConnection.privateKeyEncrypted;
        }
      }

      const updated: SSHConnection = {
        ...editingConnection,
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        privateKeyEncrypted: formData.authMethod === 'key' ? privateKeyEncrypted : undefined,
        passwordEncrypted: formData.authMethod === 'password' ? passwordEncrypted : undefined,
        tags: formData.tags,
        updatedAt: now,
      };
      updateConnection(editingConnection.id, updated);
      const newConns = connections.map(c => c.id === editingConnection.id ? updated : c);
      await saveToStorage(newConns);
    } else {
      let passwordEncrypted: string | undefined;
      let privateKeyEncrypted: string | undefined;

      // Only encrypt passwords if not in guest mode
      if (!isGuestMode) {
        const encryptionKey = localStorage.getItem('vault_encryption_key');
        if (encryptionKey) {
          try {
            if (formData.authMethod === 'password' && formData.password) {
              const encrypted = encryptPassword(formData.password, encryptionKey);
              passwordEncrypted = JSON.stringify(encrypted);
            }
            if (formData.authMethod === 'key' && formData.privateKey) {
              const encrypted = encryptPrivateKey(formData.privateKey, encryptionKey);
              privateKeyEncrypted = JSON.stringify(encrypted);
            }
          } catch (error) {
            console.error('Failed to encrypt connection credentials:', error);
            // Fall back to storing as plain text
            passwordEncrypted = formData.password;
            privateKeyEncrypted = formData.privateKey;
          }
        } else {
          // No encryption key available, store as plain text
          passwordEncrypted = formData.password;
          privateKeyEncrypted = formData.privateKey;
        }
      } else {
        // In guest mode, use keyphrase-based encryption
        const keyphrase = await getGuestEncryptionKeyphrase();
        if (keyphrase) {
          try {
            if (formData.authMethod === 'password' && formData.password) {
              const encrypted = encryptDataWithKeyphrase(formData.password, keyphrase);
              passwordEncrypted = JSON.stringify(encrypted);
            }
            if (formData.authMethod === 'key' && formData.privateKey) {
              const encrypted = encryptDataWithKeyphrase(formData.privateKey, keyphrase);
              privateKeyEncrypted = JSON.stringify(encrypted);
            }
          } catch (error) {
            console.error('Failed to encrypt credentials with keyphrase:', error);
            // Fallback to plain text
            passwordEncrypted = formData.password;
            privateKeyEncrypted = formData.privateKey;
          }
        } else {
          // Fallback to plain text if keyphrase not available
          passwordEncrypted = formData.password;
          privateKeyEncrypted = formData.privateKey;
        }
      }

      const newConnection: SSHConnection = {
        id: crypto.randomUUID(),
        userId: 'guest',
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        privateKeyEncrypted: formData.authMethod === 'key' ? privateKeyEncrypted : undefined,
        passwordEncrypted: formData.authMethod === 'password' ? passwordEncrypted : undefined,
        tags: formData.tags,
        isFavorite: false,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      addConnection(newConnection);
      await saveToStorage([...connections, newConnection]);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    deleteConnection(id);
    const newConns = connections.filter(c => c.id !== id);
    await saveToStorage(newConns);
  };

  const handleToggleFavorite = async (connection: SSHConnection) => {
    const updated = { ...connection, isFavorite: !connection.isFavorite };
    updateConnection(connection.id, updated);
    const newConns = connections.map(c => c.id === connection.id ? updated : c);
    await saveToStorage(newConns);
  };

  const handleCopyCommand = (conn: SSHConnection) => {
    const cmd = `ssh ${conn.username}@${conn.host} -p ${conn.port}`;
    navigator.clipboard.writeText(cmd);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleConnect = async (conn: SSHConnection, isRetry = false) => {
    setConnectingState({
      connectionId: conn.id,
      error: null,
      isRetrying: isRetry,
    });

    try {
      // Check host key first
      const hostKeyInfoResult = getSSHHostKeyInfo(conn.host, conn.port);
      if (hostKeyInfoResult) {
        try {
          const hostKeyInfo = await hostKeyInfoResult;

          // If host is not known or there's a mismatch, show verification modal
          if (!hostKeyInfo.isKnown || hostKeyInfo.isMismatch) {
            setHostKeyVerificationInfo({
              host: conn.host,
              port: conn.port,
              connection: conn,
            });
            setShowHostKeyVerification(true);
            return; // Wait for user to accept/reject
          }
        } catch (error) {
          // If we can't get host key info, still try to connect
          // (the backend will handle the verification)
          console.warn('Failed to get host key info, proceeding with connection:', error);
        }
      }

      // Host is verified, show connection flow modal
      // Get the latest connection from the store to ensure we have all fields including encrypted credentials
      const latestConnection = connections.find(c => c.id === conn.id) || conn;
      console.log('[CONN] Setting flow connection:', {
        id: latestConnection.id,
        host: latestConnection.host,
        hasPasswordEncrypted: !!latestConnection.passwordEncrypted,
        hasPrivateKeyEncrypted: !!latestConnection.privateKeyEncrypted,
        passwordEncryptedLength: latestConnection.passwordEncrypted?.length || 0,
      });
      setFlowConnection(latestConnection);
      setShowConnectionFlow(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      setConnectingState({
        connectionId: conn.id,
        error: errorMessage,
        isRetrying: false,
      });
    }
  };

  const handleConnectionFlowConnect = async (
    authMethod: 'password' | 'key' | 'certificate',
    credentials: { password?: string; privateKey?: string; passphrase?: string }
  ) => {
    if (!flowConnection) return;

    setIsConnecting(true);
    setConnectingState({
      connectionId: flowConnection.id,
      error: null,
      isRetrying: false,
    });

    try {
      let password = '';
      let privateKey = '';

      // If credentials are provided, use them; otherwise use saved credentials
      if (credentials.password || credentials.privateKey) {
        console.log('[CONN] Using provided credentials');
        password = authMethod === 'password' ? credentials.password || '' : '';
        privateKey = (authMethod === 'key' || authMethod === 'certificate') ? credentials.privateKey || '' : '';
      } else {
        // Use saved credentials from connection
        console.log('[CONN] Using saved credentials from connection', {
          hasPasswordEncrypted: !!flowConnection.passwordEncrypted,
          hasPrivateKeyEncrypted: !!flowConnection.privateKeyEncrypted,
          isGuestMode,
        });

        if (!isGuestMode) {
          const encryptionKey = localStorage.getItem('vault_encryption_key');
          if (encryptionKey && flowConnection.passwordEncrypted) {
            try {
              const passwordData = JSON.parse(flowConnection.passwordEncrypted);
              password = decryptPassword(passwordData, encryptionKey);
              console.log('[CONN] Decrypted password, length:', password.length);
            } catch (error) {
              console.error('Failed to decrypt password for connection:', error);
            }
          }
          if (encryptionKey && flowConnection.privateKeyEncrypted) {
            try {
              const privateKeyData = JSON.parse(flowConnection.privateKeyEncrypted);
              privateKey = decryptPrivateKey(privateKeyData, encryptionKey);
              console.log('[CONN] Decrypted private key, length:', privateKey.length);
            } catch (error) {
              console.error('Failed to decrypt private key for connection:', error);
            }
          }
        } else {
          // In guest mode, use keyphrase-based encryption
          const keyphrase = await getGuestEncryptionKeyphrase();
          if (keyphrase && flowConnection.passwordEncrypted) {
            const passwordData = tryParseJSON(flowConnection.passwordEncrypted);
            if (passwordData) {
              // It's encrypted JSON data
              try {
                password = decryptDataWithKeyphrase(passwordData, keyphrase);
                console.log('[CONN] Decrypted password using keyphrase, length:', password.length);
              } catch (error) {
                console.error('Failed to decrypt password with keyphrase:', error);
                // Fallback to plain text for backward compatibility
                password = flowConnection.passwordEncrypted || '';
              }
            } else {
              // It's plain text (backward compatibility with old data)
              password = flowConnection.passwordEncrypted;
              console.log('[CONN] Using plain text password (not encrypted)');
            }
          } else if (flowConnection.passwordEncrypted) {
            // Fallback: try as plain text (for backward compatibility with old data)
            password = flowConnection.passwordEncrypted;
          }

          if (keyphrase && flowConnection.privateKeyEncrypted) {
            const privateKeyData = tryParseJSON(flowConnection.privateKeyEncrypted);
            if (privateKeyData) {
              // It's encrypted JSON data
              try {
                privateKey = decryptDataWithKeyphrase(privateKeyData, keyphrase);
                console.log('[CONN] Decrypted private key using keyphrase, length:', privateKey.length);
              } catch (error) {
                console.error('Failed to decrypt private key with keyphrase:', error);
                // Fallback to plain text for backward compatibility
                privateKey = flowConnection.privateKeyEncrypted || '';
              }
            } else {
              // It's plain text (backward compatibility with old data)
              privateKey = flowConnection.privateKeyEncrypted;
              console.log('[CONN] Using plain text private key (not encrypted)');
            }
          } else if (flowConnection.privateKeyEncrypted) {
            // Fallback: try as plain text (for backward compatibility with old data)
            privateKey = flowConnection.privateKeyEncrypted;
          }
        }
      }

      console.log('[CONN] Final credentials:', {
        passwordLength: password.length,
        privateKeyLength: privateKey.length,
        authMethod,
      });

      // Check host key before connecting
      const hostKeyInfoResult = getSSHHostKeyInfo(flowConnection.host, flowConnection.port);
      if (hostKeyInfoResult) {
        try {
          const hostKeyInfo = await hostKeyInfoResult;
          
          // If host is not known or there's a mismatch, show verification modal
          if (!hostKeyInfo.isKnown || hostKeyInfo.isMismatch) {
            setHostKeyVerificationInfo({
              host: flowConnection.host,
              port: flowConnection.port,
              connection: flowConnection,
            });
            setShowHostKeyVerification(true);
            setIsConnecting(false);
            setShowConnectionFlow(false);
            return; // Wait for user to accept/reject
          }
        } catch (error) {
          // If we can't get host key info, still try to connect
          // (the backend will handle the verification)
          console.warn('Failed to get host key info, proceeding with connection:', error);
        }
      }

      await createSSHTerminal(flowConnection.host, flowConnection.port, flowConnection.username, password, privateKey, flowConnection.name);

      // Save credentials if provided
      if (authMethod === 'password' && credentials.password) {
        let passwordEncrypted: string | undefined;
        if (!isGuestMode) {
          const encryptionKey = localStorage.getItem('vault_encryption_key');
          if (encryptionKey) {
            try {
              const encrypted = encryptPassword(credentials.password, encryptionKey);
              passwordEncrypted = JSON.stringify(encrypted);
            } catch (error) {
              console.error('Failed to encrypt password:', error);
              passwordEncrypted = credentials.password;
            }
          } else {
            passwordEncrypted = credentials.password;
          }
        } else {
          // In guest mode, use keyphrase-based encryption
          const keyphrase = await getGuestEncryptionKeyphrase();
          if (keyphrase) {
            try {
              const encrypted = encryptDataWithKeyphrase(credentials.password, keyphrase);
              passwordEncrypted = JSON.stringify(encrypted);
            } catch (error) {
              console.error('Failed to encrypt password with keyphrase:', error);
              passwordEncrypted = credentials.password;
            }
          } else {
            // Fallback to plain text if keyphrase not available
            passwordEncrypted = credentials.password;
          }
        }

        const updated: SSHConnection = {
          ...flowConnection,
          passwordEncrypted,
          updatedAt: new Date().toISOString(),
        };
        updateConnection(flowConnection.id, updated);
        const newConns = connections.map(c => c.id === flowConnection.id ? updated : c);
        await saveToStorage(newConns);
      } else if ((authMethod === 'key' || authMethod === 'certificate') && credentials.privateKey) {
        let privateKeyEncrypted: string | undefined;
        if (!isGuestMode) {
          const encryptionKey = localStorage.getItem('vault_encryption_key');
          if (encryptionKey) {
            try {
              const encrypted = encryptPrivateKey(credentials.privateKey, encryptionKey);
              privateKeyEncrypted = JSON.stringify(encrypted);
            } catch (error) {
              console.error('Failed to encrypt private key:', error);
              privateKeyEncrypted = credentials.privateKey;
            }
          } else {
            privateKeyEncrypted = credentials.privateKey;
          }
        } else {
          privateKeyEncrypted = credentials.privateKey;
        }

        const updated: SSHConnection = {
          ...flowConnection,
          privateKeyEncrypted,
          updatedAt: new Date().toISOString(),
        };
        updateConnection(flowConnection.id, updated);
        const newConns = connections.map(c => c.id === flowConnection.id ? updated : c);
        await saveToStorage(newConns);
      }

      setIsConnecting(false);
      setShowConnectionFlow(false);
      setFlowConnection(null);
      setConnectingState({
        connectionId: null,
        error: null,
        isRetrying: false,
      });
      navigate(ROUTES.TERMINAL);
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if error is due to host key not known
      if (errorMessage.includes('host key not known')) {
        // Show host key verification modal
        setHostKeyVerificationInfo({
          host: flowConnection.host,
          port: flowConnection.port,
          connection: flowConnection,
        });
        setShowHostKeyVerification(true);
        setShowConnectionFlow(false);
        setConnectingState({
          connectionId: flowConnection.id,
          error: null,
          isRetrying: false,
        });
        return;
      }
      
      setConnectingState({
        connectionId: flowConnection.id,
        error: errorMessage,
        isRetrying: false,
      });
      throw error; // Let ConnectionFlowModal handle the error display
    }
  };

  const handleConnectionFlowClose = () => {
    setShowConnectionFlow(false);
    setFlowConnection(null);
    setConnectingState({
      connectionId: null,
      error: null,
      isRetrying: false,
    });
  };

  const handleHostKeyAccept = async () => {
    if (!hostKeyVerificationInfo) {
      return;
    }

    try {
      // Get the host key info again to get the keyBase64
      const hostKeyInfoResult = getSSHHostKeyInfo(hostKeyVerificationInfo.host, hostKeyVerificationInfo.port);
      if (!hostKeyInfoResult) {
        throw new Error('Wails bindings not available. Please run "wails dev" or "wails build"');
      }
      const hostKeyInfo = await hostKeyInfoResult;

      // Accept the host key (pass isGuestMode to determine if key should be persisted)
      const acceptResult = acceptSSHHostKey(hostKeyVerificationInfo.host, hostKeyVerificationInfo.port, hostKeyInfo.keyBase64, isGuestMode);
      if (!acceptResult) {
        throw new Error('Wails bindings not available. Please run "wails dev" or "wails build"');
      }
      await acceptResult;

      // Close host key modal and show connection flow
      // Get the latest connection from the store to ensure we have all fields including encrypted credentials
      const latestConnection = connections.find(c => c.id === hostKeyVerificationInfo.connection.id) || hostKeyVerificationInfo.connection;
      console.log('[CONN] Setting flow connection after host key accept:', {
        id: latestConnection.id,
        host: latestConnection.host,
        hasPasswordEncrypted: !!latestConnection.passwordEncrypted,
        hasPrivateKeyEncrypted: !!latestConnection.privateKeyEncrypted,
        passwordEncryptedLength: latestConnection.passwordEncrypted?.length || 0,
      });
      setShowHostKeyVerification(false);
      setFlowConnection(latestConnection);
      setShowConnectionFlow(true);
      setHostKeyVerificationInfo(null);
    } catch (error) {
      console.error('Failed to accept host key:', error);
      setConnectingState({
        connectionId: hostKeyVerificationInfo.connection.id,
        error: error instanceof Error ? error.message : 'Failed to accept host key',
        isRetrying: false,
      });
      setShowHostKeyVerification(false);
      setHostKeyVerificationInfo(null);
    }
  };

  const handleHostKeyReject = () => {
    setShowHostKeyVerification(false);
    setHostKeyVerificationInfo(null);
    if (hostKeyVerificationInfo) {
      setConnectingState({
        connectionId: hostKeyVerificationInfo.connection.id,
        error: null,
        isRetrying: false,
      });
    }
  };

  const handleDismissError = () => {
    setConnectingState({
      connectionId: null,
      error: null,
      isRetrying: false,
    });
  };

  const handleRetryConnection = () => {
    const connection = connections.find(c => c.id === connectingState.connectionId);
    if (connection) {
      handleConnect(connection, true);
    }
  };

  const handleQuickConnect = (username: string, host: string, port: number) => {
    setPendingConnection({ username, host, port });
    setIsConnecting(true);

    createSSHTerminal(host, port, username, '', '')
      .then(() => {
        setIsConnecting(false);
        setShowQuickConnect(false);
        setPendingConnection(null);
        setShowPasswordPrompt(false);
        navigate(ROUTES.TERMINAL);
      })
      .catch((error: any) => {
        // Check if error indicates password is needed
        if (error?.message?.includes('permission denied') || error?.message?.includes('auth')) {
          setIsConnecting(false);
          setShowQuickConnect(false);
          setShowPasswordPrompt(true);
          // Save connection without password for now
          saveQuickConnectConnection(username, host, port);
        } else {
          setIsConnecting(false);
          // Save connection even on failure
          saveQuickConnectConnection(username, host, port);
          setPendingConnection(null);
          setShowQuickConnect(false);
          setShowPasswordPrompt(false);
          console.error('Failed to connect:', error);
        }
      });
  };

  const handlePasswordSubmit = (password: string) => {
    if (!pendingConnection) return;

    setIsConnecting(true);
    createSSHTerminal(
      pendingConnection.host,
      pendingConnection.port,
      pendingConnection.username,
      password,
      ''
    )
      .then(() => {
        setIsConnecting(false);
        setShowPasswordPrompt(false);
        setPendingConnection(null);
        navigate(ROUTES.TERMINAL);
      })
      .catch((error) => {
        setIsConnecting(false);
        // Save connection with password even on failure
        saveQuickConnectConnection(
          pendingConnection.username,
          pendingConnection.host,
          pendingConnection.port,
          password
        );
        setShowPasswordPrompt(false);
        setPendingConnection(null);
        console.error('Failed to connect with password:', error);
      });
  };

  const handleSelectConnection = (connectionId: string, isMultiSelect: boolean) => {
    setSelectedConnectionIds((prev) => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        // Toggle selection in multi-select mode
        if (newSet.has(connectionId)) {
          newSet.delete(connectionId);
        } else {
          newSet.add(connectionId);
        }
      } else {
        // Single select - replace selection
        if (newSet.has(connectionId) && newSet.size === 1) {
          // Deselect if clicking the only selected item
          return new Set();
        }
        return new Set([connectionId]);
      }
      return newSet;
    });
  };

  const handleExport = async () => {
    // Export selected connections if any are selected, otherwise export all
    const connectionsToExport = selectedConnectionIds.size > 0
      ? connections.filter(conn => selectedConnectionIds.has(conn.id))
      : connections;

    const data = JSON.stringify({ connections: connectionsToExport }, null, 2);

    try {
      const defaultFilename = selectedConnectionIds.size > 0
        ? `ssh-connections-selected-${selectedConnectionIds.size}.json`
        : 'ssh-connections.json';

      const filePath = await ShowSaveFileDialog('Export SSH Connections', defaultFilename, 'json');
      if (filePath) {
        await WriteFile(filePath, data);
      }
    } catch (error) {
      console.error('Export failed:', error);
      // Fallback to browser download
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedConnectionIds.size > 0
        ? `ssh-connections-selected-${selectedConnectionIds.size}.json`
        : 'ssh-connections.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data.connections)) {
            const merged = [...connections];
            for (const conn of data.connections) {
              if (!merged.find(c => c.id === conn.id)) {
                merged.push(conn);
              }
            }
            setConnections(merged);
            await saveToStorage(merged);
          }
        } catch {
          console.error('Failed to import connections');
        }
      }
    };
    input.click();
  };


  const selectionBox = getSelectionBox();

  return (
    <div
      className="p-6 space-y-6 relative select-none"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ userSelect: isDragging ? 'none' : 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Server className="w-7 h-7 text-primary" />
            SSH Connections
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Manage and organize your SSH connection configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickConnect(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all border border-primary/30"
            title="Quick SSH connection"
          >
            <Zap className="w-4 h-4" />
            Quick Connect
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-background-lighter rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-all"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            disabled={connections.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-background-lighter rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedConnectionIds.size > 0 ? `Export ${selectedConnectionIds.size} selected connection(s)` : 'Export all connections'}
          >
            <Download className="w-4 h-4" />
            Export
            {selectedConnectionIds.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded">
                {selectedConnectionIds.size}
              </span>
            )}
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Connection
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search connections..."
          className="w-full pl-10 pr-4 py-2.5 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Connections Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-background-lighter flex items-center justify-center mb-4">
            <Server className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {searchQuery ? 'No connections found' : 'No connections yet'}
          </h3>
          <p className="text-text-muted text-sm max-w-sm">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Add your first SSH connection to get started'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all"
            >
              <Plus className="w-4 h-4" />
              Add your first connection
            </button>
          )}
        </div>
      ) : (() => {
        // Split connections into favorites and regular
        const favorites = filteredConnections.filter(conn => conn.isFavorite);
        const regular = filteredConnections.filter(conn => !conn.isFavorite);

        return (
          <div className="space-y-6">
            {/* Favorites Section */}
            {favorites.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <h2 className="text-sm font-semibold text-text-primary">Favorites</h2>
                  <span className="text-xs text-text-muted">({favorites.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {favorites.map((conn) => (
                    <div
                      key={conn.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(conn.id, el);
                        else cardRefs.current.delete(conn.id);
                      }}
                    >
                      <ConnectionCard
                        connection={conn}
                        onEdit={() => handleOpenModal(conn)}
                        onDelete={() => handleDelete(conn.id)}
                        onCopy={() => handleCopyCommand(conn)}
                        onConnect={() => handleConnect(conn)}
                        onToggleFavorite={() => handleToggleFavorite(conn)}
                        formatDate={formatDate}
                        isSelected={selectedConnectionIds.has(conn.id)}
                        onSelect={handleSelectConnection}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Connections Section */}
            {regular.length > 0 && (
              <div className="space-y-3">
                {favorites.length > 0 && (
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-text-primary">All Connections</h2>
                    <span className="text-xs text-text-muted">({regular.length})</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {regular.map((conn) => (
                    <div
                      key={conn.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(conn.id, el);
                        else cardRefs.current.delete(conn.id);
                      }}
                    >
                      <ConnectionCard
                        connection={conn}
                        onEdit={() => handleOpenModal(conn)}
                        onDelete={() => handleDelete(conn.id)}
                        onCopy={() => handleCopyCommand(conn)}
                        onConnect={() => handleConnect(conn)}
                        onToggleFavorite={() => handleToggleFavorite(conn)}
                        formatDate={formatDate}
                        isSelected={selectedConnectionIds.has(conn.id)}
                        onSelect={handleSelectConnection}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Connection Status Overlay */}
      {connectingState.connectionId && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background-light border border-border rounded-xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-fade-in-scale">
            <div className="relative transition-all duration-500 ease-out">
              {connectingState.error ? (
                // Error state - show warning icon with smooth transition
                <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto animate-fade-in-scale">
                  <Terminal className="w-8 h-8 text-danger" style={{ animation: 'fadeInUp 0.4s ease-out 0.2s both' }} />
                </div>
              ) : connectingState.isRetrying ? (
                // Retrying state - show refresh icon with pulse
                <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto animate-fade-in-scale">
                  <Terminal className="w-8 h-8 text-warning animate-pulse" style={{ animation: 'fadeInUp 0.4s ease-out 0.2s both' }} />
                </div>
              ) : (
                // Connecting state - show spinner with smooth transitions
                <div className="relative animate-fade-in-scale">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Terminal className="w-8 h-8 text-primary" style={{ animation: 'fadeInUp 0.4s ease-out 0.2s both' }} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'fadeInUp 0.5s ease-out 0.3s both' }}>
                    <div className="w-20 h-20 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 transition-all duration-300">
              {connectingState.error ? (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-danger">Connection Failed</h3>
                    <p className="text-text-muted text-sm">Unable to establish SSH connection</p>
                  </div>

                  <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 text-left">
                    <div className="text-sm text-danger font-mono break-all max-h-32 overflow-y-auto">
                      {connectingState.error}
                    </div>
                  </div>
                </div>
              ) : connectingState.isRetrying ? (
                <div className="space-y-2 animate-fade-in-up">
                  <h3 className="text-lg font-semibold text-warning">Retrying Connection</h3>
                  <p className="text-text-muted text-sm">Attempting to reconnect to the server</p>
                </div>
              ) : (
                <div className="space-y-2 animate-fade-in-up">
                  <h3 className="text-lg font-semibold text-text-primary">Connecting...</h3>
                  <p className="text-text-muted text-sm">Establishing SSH connection</p>
                </div>
              )}

              <div className="text-xs text-text-secondary bg-background/50 rounded-lg px-3 py-2 font-mono transition-all duration-300">
                {(() => {
                  const conn = connections.find(c => c.id === connectingState.connectionId);
                  return conn ? `${conn.username}@${conn.host}:${conn.port}` : 'Unknown connection';
                })()}
              </div>
            </div>

            <div className="transition-all duration-300 ease-out">
              {connectingState.error ? (
                <div className="flex gap-3 justify-center" style={{ animation: 'fadeInUp 0.5s ease-out 0.4s both' }}>
                  <button
                    onClick={handleDismissError}
                    className="px-4 py-2 text-sm bg-background-lighter text-text-secondary hover:text-text-primary rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleRetryConnection}
                    className="px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : connectingState.isRetrying ? (
                <div className="flex items-center justify-center gap-1" style={{ animation: 'fadeInUp 0.5s ease-out 0.4s both' }}>
                  <span className="w-2 h-2 bg-warning rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-warning rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-warning rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1" style={{ animation: 'fadeInUp 0.5s ease-out 0.4s both' }}>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}

              {!connectingState.error && (
                <p className="text-xs text-text-muted/70" style={{ animation: 'fadeInUp 0.4s ease-out 0.6s both' }}>
                  {connectingState.isRetrying ? 'Trying again...' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isModalOpen}
        editingConnection={editingConnection}
        onSave={handleSave}
        onClose={handleCloseModal}
      />

      {/* Quick Connect Modals */}
      <QuickConnectModal
        isOpen={showQuickConnect}
        isConnecting={isConnecting}
        onConnect={handleQuickConnect}
        onClose={() => {
          setShowQuickConnect(false);
          setPendingConnection(null);
        }}
      />

      {/* Host Key Verification Modal */}
      {hostKeyVerificationInfo && (
        <HostKeyVerificationModal
          isOpen={showHostKeyVerification}
          host={hostKeyVerificationInfo.host}
          port={hostKeyVerificationInfo.port}
          isGuest={isGuestMode}
          onAccept={handleHostKeyAccept}
          onReject={handleHostKeyReject}
        />
      )}

      {/* Connection Flow Modal */}
      <ConnectionFlowModal
        isOpen={showConnectionFlow}
        connection={flowConnection}
        onClose={handleConnectionFlowClose}
        onConnect={handleConnectionFlowConnect}
        isConnecting={isConnecting}
        error={connectingState.error}
        hostVerified={true} // Host is already verified if we got here
      />

      {pendingConnection && (
        <PasswordPromptModal
          isOpen={showPasswordPrompt}
          isConnecting={isConnecting}
          host={pendingConnection.host}
          username={pendingConnection.username}
          onSubmit={handlePasswordSubmit}
          onCancel={() => {
            setShowPasswordPrompt(false);
            setPendingConnection(null);
          }}
        />
      )}

      {/* Selection Box Overlay */}
      {isDragging && selectionBox && (
        <div
          className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-10"
          style={{
            left: `${selectionBox.left}px`,
            top: `${selectionBox.top}px`,
            width: `${selectionBox.right - selectionBox.left}px`,
            height: `${selectionBox.bottom - selectionBox.top}px`,
          }}
        />
      )}
    </div>
  );
};
