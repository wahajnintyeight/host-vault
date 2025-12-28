import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { TerminalTab, TabAction } from '../../types/terminal';
import { TerminalContextMenu } from './TerminalContextMenu';

interface TabProps {
  tab: TerminalTab;
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
 * Individual draggable tab component for terminal sessions
 * Uses theme CSS variables for consistent styling
 */
export const Tab: React.FC<TabProps> = ({
  tab,
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
          relative flex items-center gap-1.5 px-3 h-full min-w-[100px] max-w-[160px]
          cursor-pointer transition-all duration-150 select-none
          border-r border-border/20
          ${isActive
            ? 'bg-background text-text-primary'
            : 'bg-transparent hover:bg-background-light/50 text-text-secondary hover:text-text-primary'
          }
          ${isDragging ? 'opacity-50 scale-95' : ''}
        `}
        onClick={onActivate}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className={`
            flex-shrink-0 p-0.5 rounded transition-all duration-150
            hover:bg-background-lighter
            ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          aria-label="Close tab"
          style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
        >
          <X className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
        </button>

        {/* Tab title or input */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 bg-transparent text-text-primary text-xs outline-none border-b border-primary"
            onClick={(e) => e.stopPropagation()}
            style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
          />
        ) : (
          <span className="flex-1 min-w-0 truncate text-xs font-medium">
            {tab.title}
          </span>
        )}
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
