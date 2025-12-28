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
} from 'lucide-react';
import { useConnectionStore } from '../store/connectionStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';
import { useTerminalStore } from '../store/terminalStore';
import { ConnectionModal, ConnectionFormData } from '../components/connections/ConnectionModal';
import type { SSHConnection } from '../types';

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SSHConnection | null>(null);

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

  const handleSave = (formData: ConnectionFormData) => {
    const now = new Date().toISOString();
    
    if (editingConnection) {
      const updated: SSHConnection = {
        ...editingConnection,
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        privateKeyEncrypted: formData.authMethod === 'key' ? formData.privateKey : undefined,
        passwordEncrypted: formData.authMethod === 'password' ? formData.password : undefined,
        tags: formData.tags,
        updatedAt: now,
      };
      updateConnection(editingConnection.id, updated);
      const newConns = connections.map(c => c.id === editingConnection.id ? updated : c);
      saveToStorage(newConns);
    } else {
      const newConnection: SSHConnection = {
        id: crypto.randomUUID(),
        userId: 'guest',
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        privateKeyEncrypted: formData.authMethod === 'key' ? formData.privateKey : undefined,
        passwordEncrypted: formData.authMethod === 'password' ? formData.password : undefined,
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

  const handleConnect = async (conn: SSHConnection) => {
    try {
      await createSSHTerminal(conn.host, conn.port, conn.username, conn.passwordEncrypted || '', conn.privateKeyEncrypted);
      navigate(ROUTES.TERMINAL);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
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
    <div className="p-6 space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isModalOpen}
        editingConnection={editingConnection}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
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

  const handleCopy = () => {
    onCopy();
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const getAuthIcon = () => {
    if (connection.privateKeyEncrypted) return <Key className="w-3 h-3" />;
    return <Lock className="w-3 h-3" />;
  };

  return (
    <div className="group bg-background-light border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-text-primary truncate">{connection.name}</h3>
            {connection.isFavorite && <Star className="w-4 h-4 text-warning fill-warning" />}
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">
            {connection.username}@{connection.host}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onToggleFavorite}
            className={`p-1.5 rounded-lg hover:bg-background-lighter transition-colors ${
              connection.isFavorite ? 'text-warning' : 'text-text-muted hover:text-warning'
            }`}
            title={connection.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`w-3.5 h-3.5 ${connection.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-background-lighter text-text-muted hover:text-text-primary transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Connection Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="px-2 py-0.5 bg-background rounded text-text-muted">Port {connection.port}</span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-background rounded text-text-muted">
            {getAuthIcon()}
            {connection.privateKeyEncrypted ? 'Key' : 'Password'}
          </span>
        </div>
        {connection.tags && connection.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {connection.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                {tag}
              </span>
            ))}
            {connection.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs bg-background-lighter text-text-muted rounded">
                +{connection.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* SSH Command Preview */}
      <div className="bg-background rounded-lg p-3 mb-3 border border-border/50">
        <code className="text-xs text-primary font-mono break-all">
          ssh {connection.username}@{connection.host} -p {connection.port}
        </code>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Clock className="w-3 h-3" />
          {formatDate(connection.createdAt)}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-background-lighter text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
            title="Copy SSH command"
          >
            {showCopied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            {showCopied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onConnect}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Connect"
          >
            <Terminal className="w-3 h-3" />
            Connect
          </button>
        </div>
      </div>
    </div>
  );
};
