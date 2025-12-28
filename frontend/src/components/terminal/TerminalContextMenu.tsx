import React, { useEffect, useRef } from 'react';
import { Copy, X, XCircle, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { TabAction } from '../../types/terminal';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: TabAction) => void;
  tabCount: number;
  tabIndex: number;
}

interface MenuItem {
  action: TabAction;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  dividerAfter?: boolean;
}

/**
 * Context menu for terminal tab actions
 * 
 * Features:
 * - Positioned at click coordinates
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Click outside to close
 * - Disabled states for inapplicable actions
 * - Theme-aware styling
 */
export const TerminalContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onAction,
  tabCount,
  tabIndex,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const menuItems: MenuItem[] = [
    {
      action: TabAction.Rename,
      label: 'Rename',
      icon: <Edit3 className="w-4 h-4" />,
    },
    {
      action: TabAction.Duplicate,
      label: 'Duplicate',
      icon: <Copy className="w-4 h-4" />,
      dividerAfter: true,
    },
    {
      action: TabAction.Close,
      label: 'Close',
      icon: <X className="w-4 h-4" />,
    },
    {
      action: TabAction.CloseOthers,
      label: 'Close Others',
      icon: <XCircle className="w-4 h-4" />,
      disabled: tabCount <= 1,
    },
    {
      action: TabAction.CloseRight,
      label: 'Close to the Right',
      icon: <ChevronRight className="w-4 h-4" />,
      disabled: tabIndex >= tabCount - 1,
    },
    {
      action: TabAction.CloseAll,
      label: 'Close All',
      icon: <Trash2 className="w-4 h-4" />,
    },
  ];

  // Filter out disabled items for keyboard navigation
  const enabledItems = menuItems.filter(item => !item.disabled);

  // Position menu within viewport
  const getPosition = (): React.CSSProperties => {
    const menuWidth = 200;
    const menuHeight = menuItems.length * 40 + 24;
    
    let posX = x;
    let posY = y;

    if (x + menuWidth > window.innerWidth) {
      posX = window.innerWidth - menuWidth - 8;
    }

    if (y + menuHeight > window.innerHeight) {
      posY = window.innerHeight - menuHeight - 8;
    }

    return { left: posX, top: posY };
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % enabledItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + enabledItems.length) % enabledItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (enabledItems[focusedIndex]) {
            onAction(enabledItems[focusedIndex].action);
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, enabledItems, onAction, onClose]);

  // Focus menu on mount
  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  const handleItemClick = (item: MenuItem) => {
    if (!item.disabled) {
      onAction(item.action);
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] py-1.5 bg-background-light border border-border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100"
      style={getPosition()}
      tabIndex={-1}
      role="menu"
      aria-label="Tab actions"
    >
      {menuItems.map((item) => {
        const enabledIndex = enabledItems.findIndex(i => i.action === item.action);
        const isFocused = enabledIndex === focusedIndex && !item.disabled;

        return (
          <React.Fragment key={item.action}>
            <button
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-sm text-left
                transition-colors duration-100
                ${item.disabled 
                  ? 'opacity-40 cursor-not-allowed text-text-muted' 
                  : 'text-text-primary hover:bg-background-lighter cursor-pointer'
                }
                ${isFocused ? 'bg-background-lighter' : ''}
              `}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              role="menuitem"
              tabIndex={-1}
            >
              <span className={`flex-shrink-0 ${item.disabled ? 'text-text-muted' : 'text-text-secondary'}`}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
            </button>
            {item.dividerAfter && (
              <div className="my-1.5 mx-2 h-px bg-border" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
