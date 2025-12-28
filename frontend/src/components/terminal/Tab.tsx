import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Terminal, Server, X } from 'lucide-react';
import { TerminalTab, SessionType, TabAction } from '../../types/terminal';
import { TerminalContextMenu } from './TerminalContextMenu';

interface TabProps {
  tab: TerminalTab;
  sessionType?: SessionType;
  isActive: boolean;
  tabIndex: number;
  tabCount: number;
  onActivate: () => void;
  onClose: () => void;
  onDuplicate: () => void;
  onRename?: (newTitle: string) => void;
  onCloseOthers?: () => void;
  onCloseRight?: () => void;
  onCloseAll?: () => void;
}

/**
 * Clean, minimal terminal tab component with drag support
 * Uses theme CSS variables for consistent styling
 */
export const Tab: React.FC<TabProps> = ({
  tab,
  sessionType = SessionType.Local,
  isActive,
  tabIndex,
  tabCount,
  onActivate,
  onClose,
  onDuplicate,
  onRename,
  onCloseOthers,
  onCloseRight,
  onCloseAll,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(tab.title);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditedTitle(tab.title);
  };

  const handleSave = () => {
    if (editedTitle.trim()) {
      onRename?.(editedTitle.trim());
      setIsEditing(false);
    } else {
      setEditedTitle(tab.title);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(tab.title);
      setIsEditing(false);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleContextMenuAction = (action: TabAction) => {
    switch (action) {
      case TabAction.Rename:
        setIsEditing(true);
        setEditedTitle(tab.title);
        break;
      case TabAction.Duplicate:
        onDuplicate();
        break;
      case TabAction.Close:
        onClose();
        break;
      case TabAction.CloseOthers:
        onCloseOthers?.();
        break;
      case TabAction.CloseRight:
        onCloseRight?.();
        break;
      case TabAction.CloseAll:
        onCloseAll?.();
        break;
    }
    setContextMenu(null);
  };

  // Get icon based on session type
  const getIcon = () => {
    if (sessionType === SessionType.SSH) {
      return <Server className="w-3.5 h-3.5 flex-shrink-0" />;
    }
    return <Terminal className="w-3.5 h-3.5 flex-shrink-0" />;
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          '--wails-draggable': 'no-drag',
        } as React.CSSProperties}
        {...attributes}
        {...listeners}
        className={`
          group flex items-center gap-2 px-3 h-10 min-w-fit max-w-[180px]
          cursor-pointer transition-all duration-200 select-none whitespace-nowrap
          border-b-2
          ${isActive
            ? 'border-primary bg-background text-text-primary'
            : 'border-transparent bg-transparent text-text-secondary hover:text-text-primary hover:bg-background-light/40'
          }
          ${isDragging ? 'opacity-50 scale-95' : ''}
        `}
        onClick={onActivate}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Icon */}
        <span className={`flex-shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`}>
          {getIcon()}
        </span>

        {/* Tab title or input */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 bg-transparent text-text-primary text-sm font-medium outline-none border-b border-primary"
            onClick={(e) => e.stopPropagation()}
            style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
          />
        ) : (
          <span className="flex-1 min-w-0 truncate text-sm font-medium">
            {tab.title}
          </span>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          className={`
            ml-1 p-1 rounded transition-all duration-150 flex-shrink-0
            opacity-0 group-hover:opacity-100
            ${isActive ? 'hover:bg-danger/10' : 'hover:bg-background-lighter'}
          `}
          aria-label="Close tab"
          style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
        >
          <X className={`w-3.5 h-3.5 ${isActive ? 'text-danger hover:text-danger' : 'text-text-muted hover:text-text-primary'}`} />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <TerminalContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
          tabCount={tabCount}
          tabIndex={tabIndex}
        />
      )}
    </>
  );
};
