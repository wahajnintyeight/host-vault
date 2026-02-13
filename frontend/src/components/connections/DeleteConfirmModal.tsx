import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import type { SSHConnection } from '../../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  connections: SSHConnection[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  connections,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || connections.length === 0) return null;

  const isBulkDelete = connections.length > 1;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-light border border-border rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {isBulkDelete ? 'Delete Connections' : 'Delete Connection'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-background-lighter text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <div>
              <p className="text-sm text-text-primary">
                Are you sure you want to delete{' '}
                <strong className="text-danger">
                  {isBulkDelete ? `${connections.length} connections` : 'this connection'}
                </strong>
                ?
              </p>
              <p className="text-xs text-text-muted mt-1">
                This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Connection list */}
          <div className="bg-background rounded-lg p-3 border border-border max-h-32 overflow-y-auto">
            {connections.map((conn) => (
              <div key={conn.id} className="text-sm text-text-secondary py-1">
                <span className="font-medium text-text-primary">{conn.name}</span>
                <span className="text-text-muted"> ({conn.host}:{conn.port})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-danger text-background font-medium rounded-lg hover:bg-danger-dark transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
