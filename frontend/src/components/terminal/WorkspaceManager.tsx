import React, { useState } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { Workspace } from '../../types/workspace';
import { getWorkspaceMetadata } from '../../lib/workspaceSerializer';
import {
  Save,
  FolderOpen,
  Trash2,
  Edit2,
  X,
  Check,
  Layers,
  Calendar,
  FileText,
} from 'lucide-react';
import { clsx } from 'clsx';

interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const { workspaces, saveWorkspace, loadWorkspace, deleteWorkspace, updateWorkspace, tabs } =
    useTerminalStore();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Log tabs state for debugging
  React.useEffect(() => {
    if (isOpen) {
      console.log('[WORKSPACE MANAGER] Opened with tabs:', tabs.length);
      console.log('[WORKSPACE MANAGER] Tab details:', tabs.map(t => ({ id: t.id, title: t.title })));
    }
  }, [isOpen, tabs]);

  const handleSave = () => {
    if (!saveName.trim()) return;

    console.log('[WORKSPACE MANAGER] Saving with tabs count:', tabs.length);
    saveWorkspace(saveName.trim(), saveDescription.trim() || undefined);
    setSaveName('');
    setSaveDescription('');
    setShowSaveDialog(false);
  };

  const handleLoad = async (workspaceId: string) => {
    setLoading(true);
    try {
      await loadWorkspace(workspaceId);
      onClose();
    } catch (error) {
      console.error('Failed to load workspace:', error);
      alert('Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (workspaceId: string) => {
    if (confirm('Are you sure you want to delete this workspace?')) {
      deleteWorkspace(workspaceId);
    }
  };

  const handleStartEdit = (workspace: Workspace) => {
    setEditingId(workspace.id);
    setEditName(workspace.name);
    setEditDescription(workspace.description || '');
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;

    updateWorkspace(editingId, editName.trim(), editDescription.trim() || undefined);
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Workspace Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-background-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Save Current Workspace */}
          <div className="mb-6">
            {/* Show current tab count */}
            <div className="mb-2 text-xs text-text-muted">
              Current terminals: {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}
            </div>
            
            {!showSaveDialog ? (
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={tabs.length === 0}
                title={tabs.length === 0 ? 'No active terminals to save' : 'Save current terminal layout'}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  tabs.length === 0
                    ? 'bg-background-light text-text-muted cursor-not-allowed'
                    : 'bg-primary text-background hover:bg-primary/90'
                )}
              >
                <Save className="w-4 h-4" />
                {tabs.length === 0 ? 'No Active Terminals' : 'Save Current Workspace'}
              </button>
            ) : (
              <div className="bg-background-light border border-border rounded-lg p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Workspace name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <textarea
                  placeholder="Description (optional)"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary text-background rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setSaveName('');
                      setSaveDescription('');
                    }}
                    className="px-3 py-1.5 bg-background-light text-text-primary rounded hover:bg-background-hover"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Saved Workspaces */}
          <div>
            <h3 className="text-sm font-medium text-text-muted mb-3">Saved Workspaces</h3>
            {workspaces.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No saved workspaces yet</p>
                <p className="text-sm mt-1">Save your current terminal layout to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workspaces.map((workspace) => {
                  const metadata = getWorkspaceMetadata(workspace);
                  const isEditing = editingId === workspace.id;

                  return (
                    <div
                      key={workspace.id}
                      className="bg-background-light border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            placeholder="Description (optional)"
                            className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={!editName.trim()}
                              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-background rounded hover:bg-primary/90 disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 bg-background text-text-primary rounded hover:bg-background-hover"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-text-primary">{metadata.name}</h4>
                              {metadata.description && (
                                <p className="text-sm text-text-muted mt-1">{metadata.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-4">
                              <button
                                onClick={() => handleStartEdit(workspace)}
                                className="p-1.5 rounded hover:bg-background-hover text-text-muted hover:text-primary transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(workspace.id)}
                                className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
                            <div className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {metadata.tabCount} {metadata.tabCount === 1 ? 'tab' : 'tabs'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(metadata.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <button
                            onClick={() => handleLoad(workspace.id)}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
                          >
                            <FolderOpen className="w-4 h-4" />
                            Load Workspace
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
