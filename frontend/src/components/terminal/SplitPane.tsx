import React from 'react';
import {
  LayoutNode,
  SplitOrientation,
  TerminalPane as TerminalPaneType,
} from '../../types/terminal';
import Terminal from './Terminal';
import { useTerminalStore } from '../../store/terminalStore';
import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

import { TerminalHandle } from './Terminal';

interface SplitPaneProps {
  node: LayoutNode;
  tabId: string;
  isVisible: boolean;
  dropTarget: {
    paneId: string;
    direction: 'top' | 'bottom' | 'left' | 'right';
  } | null;
  onTerminalRef?: (sessionId: string, handle: TerminalHandle | null) => void;
}

interface DropIndicatorProps {
  direction: 'top' | 'bottom' | 'left' | 'right';
}

const DropIndicator: React.FC<DropIndicatorProps> = ({ direction }) => {
  const icons = {
    top: ArrowUp,
    bottom: ArrowDown,
    left: ArrowLeft,
    right: ArrowRight,
  };

  const Icon = icons[direction];

  const positionClasses = {
    top: 'top-0 left-0 right-0 h-1/2 border-t-4',
    bottom: 'bottom-0 left-0 right-0 h-1/2 border-b-4',
    left: 'left-0 top-0 bottom-0 w-1/2 border-l-4',
    right: 'right-0 top-0 bottom-0 w-1/2 border-r-4',
  };

  return (
    <div
      className={clsx(
        'absolute bg-primary/20 border-primary flex items-center justify-center z-50 pointer-events-none transition-all duration-150',
        positionClasses[direction]
      )}
    >
      <div className="bg-primary text-background p-2 rounded-full shadow-lg">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

const Pane: React.FC<{
  node: TerminalPaneType;
  tabId: string;
  isVisible: boolean;
  dropTarget: SplitPaneProps['dropTarget'];
  onTerminalRef?: (sessionId: string, handle: TerminalHandle | null) => void;
}> = ({ node, tabId, isVisible, dropTarget, onTerminalRef }) => {
  const { setActivePane, activePaneId } = useTerminalStore();
  const isActive = activePaneId === node.id;
  const showIndicator = dropTarget?.paneId === node.id;

  const { setNodeRef, isOver, active } = useDroppable({
    id: `pane-${node.id}`,
    disabled: !isVisible,
    data: {
      type: 'pane',
      paneId: node.id,
      tabId: tabId,
    },
  });

  if (isOver && active) {
    console.log('[Terminal DnD] pane droppable over', {
      paneId: node.id,
      tabId: tabId,
      activeId: active.id,
    });
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'relative w-full h-full border-2 overflow-hidden transition-colors duration-200',
        isActive ? 'border-blue-500/50' : 'border-transparent',
        isOver && active && 'border-primary/50'
      )}
      onClick={() => setActivePane(node.id)}
    >
      <Terminal 
        sessionId={node.sessionId} 
        isVisible={isVisible} 
        ref={React.useCallback((handle: TerminalHandle | null) => {
          onTerminalRef?.(node.sessionId, handle);
        }, [node.sessionId, onTerminalRef])}
      />

      {showIndicator && dropTarget.direction && (
        <DropIndicator direction={dropTarget.direction} />
      )}
    </div>
  );
};

export const SplitPane: React.FC<SplitPaneProps> = ({
  node,
  tabId,
  isVisible,
  dropTarget,
  onTerminalRef,
}) => {
  if ('sessionId' in node) {
    return (
      <Pane
        node={node}
        tabId={tabId}
        isVisible={isVisible}
        dropTarget={dropTarget}
        onTerminalRef={onTerminalRef}
      />
    );
  }

  const isHorizontal = node.orientation === SplitOrientation.Horizontal;

  return (
    <div
      className={clsx(
        'flex w-full h-full',
        isHorizontal ? 'flex-col' : 'flex-row'
      )}
    >
      {node.panes.map((child, index) => (
        <React.Fragment key={index}>
          <div
            style={{ flex: `${node.sizes[index]} 1 0%` }}
            className="relative overflow-hidden"
          >
            <SplitPane
              node={child}
              tabId={tabId}
              isVisible={isVisible}
              dropTarget={dropTarget}
              onTerminalRef={onTerminalRef}
            />
          </div>

          {index < node.panes.length - 1 && (
            <div
              className={clsx(
                'bg-zinc-700 hover:bg-primary transition-colors duration-200 flex-shrink-0 relative group',
                isHorizontal
                  ? 'h-1 w-full cursor-row-resize'
                  : 'w-1 h-full cursor-col-resize'
              )}
            >
              <div
                className={clsx(
                  'absolute bg-zinc-500 group-hover:bg-primary transition-colors duration-200 rounded',
                  isHorizontal
                    ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-0.5'
                    : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8'
                )}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};