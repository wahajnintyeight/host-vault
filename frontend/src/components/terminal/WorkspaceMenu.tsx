import React, { useState, useRef, useEffect } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { getWorkspaceMetadata } from '../../lib/workspaceSerializer';
import {
  Layers,
  ChevronDown,
  FolderOpen,
  Settings,
  Calendar,
  FileText,
} from 'lucide-react';
import { clsx } from 'clsx';

interface WorkspaceMenuProps {
  onOpenManager: () => void;
}

export const WorkspaceMenu: React.FC<WorkspaceMenuProps> = ({ onOpenManager }) => {
  const { workspaces, loadWorkspace } = useTerminalStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLoadWorkspace = async (workspaceId: string) => {
    setLoading(workspaceId);
    try {
      await loadWorkspace(workspaceId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to load workspace:', error);
      alert('Failed to load workspace');
    } finally {
      setLoading(null);
    }
  };

  const handleOpenManager = () => {
    setIsOpen(false);
    onOpenManager();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors',
          isOpen
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-background-hover text-text-secondary hover:text-primary'
        )}
        title="Workspaces"
        style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
      >
        <Layers className="w-4 h-4" />
        <span className="text-xs font-medium">Workspaces</span>
        <ChevronDown
          className={clsx(
            'w-3.5 h-3.5 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-80 bg-background border border-border rounded-lg shadow-2xl z-50 overflow-hidden"
          style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border bg-background-light">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">
                Saved Workspaces ({workspaces.length})
              </span>
              <button
                onClick={handleOpenManager}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-background-hover text-text-secondary hover:text-primary transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Manage
              </button>
            </div>
          </div>

          {/* Workspace List */}
          <div className="max-h-96 overflow-y-auto">
            {workspaces.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved workspaces</p>
                <button
                  onClick={handleOpenManager}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Create your first workspace
                </button>
              </div>
            ) : (
              <div className="py-1">
                {workspaces.map((workspace) => {
                  const metadata = getWorkspaceMetadata(workspace);
                  const isLoading = loading === workspace.id;

                  return (
                    <button
                      key={workspace.id}
                      onClick={() => handleLoadWorkspace(workspace.id)}
                      disabled={isLoading}
                      className={clsx(
                        'w-full px-3 py-2.5 text-left transition-colors',
                        'hover:bg-background-light',
                        'border-b border-border/50 last:border-b-0',
                        isLoading && 'opacity-50 cursor-wait'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <FolderOpen className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-text-primary text-sm truncate">
                            {metadata.name}
                          </div>
                          {metadata.description && (
                            <div className="text-xs text-text-muted mt-0.5 line-clamp-2">
                              {metadata.description}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {metadata.tabCount} {metadata.tabCount === 1 ? 'tab' : 'tabs'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(metadata.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {workspaces.length > 0 && (
            <div className="px-3 py-2 border-t border-border bg-background-light">
              <button
                onClick={handleOpenManager}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Manage All Workspaces
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
