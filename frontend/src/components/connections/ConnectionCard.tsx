import React, { useState } from 'react';
import { Edit2, Trash2, Copy, Check, Star, Key, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import type { SSHConnection } from '../../types';

interface ConnectionCardProps {
  connection: SSHConnection;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onConnect: () => void;
  onToggleFavorite: () => void;
  formatDate: (timestamp: string) => string;
  isSelected?: boolean;
  onSelect?: (connectionId: string, isMultiSelect: boolean) => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onEdit,
  onDelete,
  onCopy,
  onConnect,
  onToggleFavorite,
  formatDate,
  isSelected = false,
  onSelect,
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger select if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    // Handle selection on single click
    if (onSelect) {
      onSelect(connection.id, e.ctrlKey || e.metaKey);
    }
  };

  const handleCardDoubleClick = (e: React.MouseEvent) => {
    // Don't trigger connect if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onConnect();
  };

  return (
    <div
      className={`connection-card group relative rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden
        ${isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background-light hover:border-primary/50'
        }
      `}
      onClick={handleCardClick}
      onDoubleClick={handleCardDoubleClick}
      title="Click to select, double-click to connect"
    >
      {/* Main Content */}
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {connection.isFavorite && (
                <Star className="w-3 h-3 text-warning fill-warning" />
              )}
              <h3 className="font-semibold text-sm text-text-primary truncate">
                {connection.name}
              </h3>
            </div>
            <p className="text-xs text-text-muted truncate">
              {connection.host}:{connection.port}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`p-1 rounded transition-colors ${
                connection.isFavorite
                  ? 'text-warning hover:bg-warning/10'
                  : 'text-text-muted hover:text-warning hover:bg-warning/10'
              }`}
              title={connection.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-3.5 h-3.5 ${connection.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
              title="Edit connection"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              title="Delete connection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Info Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-text-secondary bg-background border border-border">
            {connection.privateKeyEncrypted ? (
              <>
                <Key className="w-2.5 h-2.5" />
                <span>Key</span>
              </>
            ) : (
              <>
                <Lock className="w-2.5 h-2.5" />
                <span>Password</span>
              </>
            )}
          </div>
          {connection.tags && connection.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {connection.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-xs text-text-muted bg-background border border-border"
                >
                  {tag}
                </span>
              ))}
              {connection.tags.length > 2 && (
                <span className="px-1.5 py-0.5 rounded text-xs text-text-muted">
                  +{connection.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

     
      </div>
    </div>
  );
};

