import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Download,
  Upload,
  Server,
  Clock,
  Loader2,
  Check,
  Star,
  Key,
  Lock,
  Terminal,
  Zap,
} from 'lucide-react';
import { useConnectionStore } from '../store/connectionStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';
import { useTerminalStore } from '../store/terminalStore';
import { ConnectionModal, ConnectionFormData } from '../components/connections/ConnectionModal';
import { QuickConnectModal } from '../components/connections/QuickConnectModal';
import { PasswordPromptModal } from '../components/connections/PasswordPromptModal';
import type { SSHConnection } from '../types';
import { encryptPassword, encryptPrivateKey, decryptPassword, decryptPrivateKey } from '../lib/encryption/crypto';
import { useAuthStore } from '../store/authStore';

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
  const { isGuestMode } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SSHConnection | null>(null);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
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

  useEffect(() => {
    // Load connections from localStorage
    const stored = localStorage.getItem('ssh-connections');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setConnections(data.connections || []);
      } catch (e) {
        console.error('Failed to load connections:', e);
      }
    }
  }, [setConnections]);

  const saveToStorage = (conns: SSHConnection[]) => {
    localStorage.setItem('ssh-connections', JSON.stringify({ connections: conns }));
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
        // In guest mode, store as plain text
        passwordEncrypted = formData.password || editingConnection.passwordEncrypted;
        privateKeyEncrypted = formData.privateKey || editingConnection.privateKeyEncrypted;
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
      saveToStorage(newConns);
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
        // In guest mode, store as plain text
        passwordEncrypted = formData.password;
        privateKeyEncrypted = formData.privateKey;
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
      saveToStorage([...connections, newConnection]);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    deleteConnection(id);
    const newConns = connections.filter(c => c.id !== id);
    saveToStorage(newConns);
  };

  const handleToggleFavorite = (connection: SSHConnection) => {
    const updated = { ...connection, isFavorite: !connection.isFavorite };
    updateConnection(connection.id, updated);
    const newConns = connections.map(c => c.id === connection.id ? updated : c);
    saveToStorage(newConns);
  };

  const handleCopyCommand = (conn: SSHConnection) => {
    const cmd = `ssh ${conn.username}@${conn.host} -p ${conn.port}`;
    navigator.clipboard.writeText(cmd);
  };

  const handleConnect = async (conn: SSHConnection, isRetry = false) => {
    setConnectingState({
      connectionId: conn.id,
      error: null,
      isRetrying: isRetry,
    });

    try {
      let password = '';
      let privateKey = '';

      // Decrypt passwords if not in guest mode
      if (!isGuestMode) {
        const encryptionKey = localStorage.getItem('vault_encryption_key');
        if (encryptionKey && conn.passwordEncrypted) {
          try {
            const passwordData = JSON.parse(conn.passwordEncrypted);
            password = decryptPassword(passwordData, encryptionKey);
          } catch (error) {
            console.error('Failed to decrypt password for connection:', error);
          }
        }
        if (encryptionKey && conn.privateKeyEncrypted) {
          try {
            const privateKeyData = JSON.parse(conn.privateKeyEncrypted);
            privateKey = decryptPrivateKey(privateKeyData, encryptionKey);
          } catch (error) {
            console.error('Failed to decrypt private key for connection:', error);
          }
        }
      } else {
        // In guest mode, passwords are stored as plain text
        password = conn.passwordEncrypted || '';
        privateKey = conn.privateKeyEncrypted || '';
      }

      await createSSHTerminal(conn.host, conn.port, conn.username, password, privateKey, conn.name);
      navigate(ROUTES.TERMINAL);
    } catch (error) {
      console.error('Failed to connect:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      setConnectingState({
        connectionId: conn.id,
        error: errorMessage,
        isRetrying: false,
      });
      // Don't auto-clear the error state - let user dismiss or retry
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
        } else {
          setIsConnecting(false);
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
        console.error('Failed to connect with password:', error);
      });
  };

  const handleExport = () => {
    const data = JSON.stringify({ connections }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ssh-connections.json';
    a.click();
    URL.revokeObjectURL(url);
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
            saveToStorage(merged);
          }
        } catch {
          console.error('Failed to import connections');
        }
      }
    };
    input.click();
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };


  return (
    <div className="p-6 space-y-6 relative">
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
          >
            <Download className="w-4 h-4" />
            Export
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {filteredConnections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              onEdit={() => handleOpenModal(conn)}
              onDelete={() => handleDelete(conn.id)}
              onCopy={() => handleCopyCommand(conn)}
              onConnect={() => handleConnect(conn)}
              onToggleFavorite={() => handleToggleFavorite(conn)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

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
    </div>
  );
};

// Connection Card Component
interface ConnectionCardProps {
  connection: SSHConnection;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onConnect: () => void;
  onToggleFavorite: () => void;
  formatDate: (timestamp: string) => string;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onEdit,
  onDelete,
  onCopy,
  onConnect,
  onToggleFavorite,
  formatDate,
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const getAuthIcon = () => {
    if (connection.privateKeyEncrypted) return <Key className="w-3 h-3" />;
    return <Lock className="w-3 h-3" />;
  };

  // Get color based on port for visual variety
  const getPortColor = () => {
    const portNum = connection.port;
    if (portNum === 22) return 'from-primary/20 to-primary/10 border-primary/30';
    if (portNum === 2222) return 'from-secondary/20 to-secondary/10 border-secondary/30';
    if (portNum > 3000) return 'from-success/20 to-success/10 border-success/30';
    return 'from-warning/20 to-warning/10 border-warning/30';
  };

  const getPortBadgeColor = () => {
    const portNum = connection.port;
    if (portNum === 22) return 'bg-primary/20 text-primary border border-primary/30';
    if (portNum === 2222) return 'bg-secondary/20 text-secondary border border-secondary/30';
    if (portNum > 3000) return 'bg-success/20 text-success border border-success/30';
    return 'bg-warning/20 text-warning border border-warning/30';
  };

  const getAuthBadgeColor = () => {
    if (connection.privateKeyEncrypted) {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
    return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  };

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden
        ${connection.isFavorite
          ? 'border-warning/40 bg-gradient-to-br from-warning/10 to-background-light shadow-lg shadow-warning/10'
          : 'border-border bg-background-light hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'
        }
        ${isExpanded ? 'ring-2 ring-primary/30' : 'hover:scale-[1.02]'}
      `}
      onClick={onConnect}
      title={`Click to connect to ${connection.name}`}
    >
      {/* Gradient overlay for favorites */}
      {connection.isFavorite && (
        <div className="absolute inset-0 bg-gradient-to-r from-warning/5 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Main Content */}
      <div className="relative p-4 space-y-3">
        {/* Header with Title and Quick Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {connection.isFavorite && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 border border-warning/30">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="text-xs font-semibold text-warning">Favorite</span>
                </div>
              )}
            </div>
            <h3 className="font-bold text-lg text-text-primary truncate">{connection.name}</h3>
            <p className="text-sm text-text-muted mt-1">
              {connection.username}@{connection.host}:{connection.port}
            </p>
          </div>

          {/* Quick Action Buttons - Hover Reveal */}
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`p-2 rounded-lg transition-all duration-200 ${
                connection.isFavorite
                  ? 'bg-warning/20 text-warning border border-warning/30'
                  : 'bg-background-lighter text-text-muted hover:text-warning hover:bg-warning/10 border border-transparent hover:border-warning/30'
              }`}
              title={connection.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-4 h-4 ${connection.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 rounded-lg bg-background-lighter text-text-muted hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all duration-200"
              title="Edit connection"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 rounded-lg bg-background-lighter text-text-muted hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/30 transition-all duration-200"
              title="Delete connection"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Connection Info Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${getAuthBadgeColor()} text-xs font-semibold`}>
            {getAuthIcon()}
            {connection.privateKeyEncrypted ? 'SSH Key' : 'Password'}
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${getPortBadgeColor()} text-xs font-semibold`}>
            <Terminal className="w-3 h-3" />
            Port {connection.port}
          </div>
          {connection.tags && connection.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {connection.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-secondary/15 text-secondary text-xs font-medium border border-secondary/25"
                >
                  {tag}
                </span>
              ))}
              {connection.tags.length > 2 && (
                <span className="px-2.5 py-1 rounded-lg bg-background-lighter text-text-muted text-xs font-medium border border-border/50">
                  +{connection.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick Connect Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConnect();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:scale-105 disabled:opacity-70 disabled:scale-100 transition-all duration-200 group/btn"
        >
          <Terminal className="w-4 h-4" />
          <span>Quick Connect</span>
          <Zap className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
        </button>

        {/* Expandable Details Section */}
        <div className="border-t border-border/40">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full flex items-center justify-between px-4 py-3 text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="text-xs font-semibold uppercase tracking-wide">More Details</span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {isExpanded && (
            <div className="px-4 pb-4 space-y-3 border-t border-border/40">
              {/* SSH Command */}
              <div className="space-y-2">
                <div className="relative group/cmd">
                  <div className="bg-background rounded-lg p-3 border border-border/50 font-mono text-xs text-primary break-all pr-10">
                    ssh {connection.username}@{connection.host} -p {connection.port}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-background-lighter text-text-muted hover:text-text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all opacity-0 group-hover/cmd:opacity-100"
                    title="Copy command"
                  >
                    {showCopied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>Added {formatDate(connection.createdAt)}</span>
              </div>

              {/* Connection Status Indicator */}
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-text-secondary">Ready to connect</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
