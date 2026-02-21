import React from 'react';
import {
  LayoutNode,
  SplitOrientation,
  TerminalPane as TerminalPaneType,
} from '../../types/terminal';
import Terminal from './Terminal';
import { useTerminalStore } from '../../store/terminalStore';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { 
  GripVertical, 
  X, 
  Copy, 
  Terminal as TerminalIcon,
  Maximize2
} from 'lucide-react';

import { TerminalHandle } from './Terminal';

// Helper to count total panes in a layout
const countPanes = (node: LayoutNode): number => {
  if ('sessionId' in node) {
    return 1;
  }
  return node.panes.reduce((sum, pane) => sum + countPanes(pane), 0);
};

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
  const positionStyles: Record<string, React.CSSProperties> = {
    top: { top: 0, left: 0, right: 0, height: '50%' },
    bottom: { bottom: 0, left: 0, right: 0, height: '50%' },
    left: { left: 0, top: 0, bottom: 0, width: '50%' },
    right: { right: 0, top: 0, bottom: 0, width: '50%' },
  };

  const borderClass = {
    top: 'border-t-4',
    bottom: 'border-b-4',
    left: 'border-l-4',
    right: 'border-r-4',
  };

  const labelPosition = {
    top: 'bottom-8',
    bottom: 'top-8',
    left: 'right-8',
    right: 'left-8',
  };

  const splitLabel = {
    top: 'Split Up',
    bottom: 'Split Down',
    left: 'Split Left',
    right: 'Split Right',
  };

  return (
    <div
      className={clsx(
        'absolute z-50 pointer-events-none overflow-hidden',
        'bg-gradient-to-br from-primary/25 via-primary/15 to-primary/5',
        borderClass[direction],
        'border-primary',
        'animate-in fade-in duration-100'
      )}
      style={positionStyles[direction]}
    >
      {/* Animated outer glow with pulse */}
      <div 
        className={clsx(
          'absolute inset-0 rounded-sm',
          'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent',
          'animate-pulse'
        )} 
      />
      
      {/* Animated shimmer effect */}
      <div 
        className={clsx(
          'absolute inset-0',
          'bg-gradient-to-br from-transparent via-primary/20 to-transparent',
          'animate-shimmer'
        )}
        style={{
          backgroundSize: '200% 200%',
          animation: 'shimmer 2s ease-in-out infinite'
        }}
      />
      
      {/* Corner brackets - larger and more prominent */}
      <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-primary rounded-tl-sm opacity-80" />
      <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-primary rounded-tr-sm opacity-80" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-primary rounded-bl-sm opacity-80" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-primary rounded-br-sm opacity-80" />

      {/* Centered drop zone label with enhanced styling */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className={clsx(
            'absolute bg-primary text-background px-4 py-2 rounded-lg shadow-2xl shadow-primary/40',
            'font-semibold text-sm tracking-wide',
            'border-2 border-primary/70',
            'animate-pulse',
            labelPosition[direction]
          )}
        >
          {splitLabel[direction]}
        </div>
      </div>

      {/* Divider line preview showing where the split will be - enhanced */}
      {(direction === 'top' || direction === 'bottom') && (
        <div 
          className={clsx(
            'absolute left-4 right-4',
            direction === 'top' ? 'bottom-0' : 'top-0',
            'flex items-center'
          )}
        >
          <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-primary to-primary shadow-lg shadow-primary/50" />
          <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/70 -mx-1.5 animate-pulse" />
          <div className="flex-1 h-1 bg-gradient-to-l from-transparent via-primary to-primary shadow-lg shadow-primary/50" />
        </div>
      )}
      {(direction === 'left' || direction === 'right') && (
        <div 
          className={clsx(
            'absolute top-4 bottom-4',
            direction === 'left' ? 'right-0' : 'left-0',
            'flex flex-col items-center'
          )}
        >
          <div className="flex-1 w-1 bg-gradient-to-b from-transparent via-primary to-primary shadow-lg shadow-primary/50" />
          <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/70 -my-1.5 animate-pulse" />
          <div className="flex-1 w-1 bg-gradient-to-t from-transparent via-primary to-primary shadow-lg shadow-primary/50" />
        </div>
      )}
      
      {/* Add keyframe animation for shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
      `}</style>
    </div>
  );
};

const DropZoneOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-primary/3" />
      
      {/* Quadrant dividers */}
      <div className="absolute inset-0">
        {/* Vertical center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent -translate-x-1/2" />
        
        {/* Horizontal center line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent -translate-y-1/2" />
        
        {/* Center point */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-3 h-3 border-2 border-primary/60 rounded-full bg-background shadow-sm" />
          <div className="absolute inset-0 w-3 h-3 border-2 border-primary/60 rounded-full animate-ping" />
        </div>
      </div>
      
      {/* Corner zone labels with icons */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-primary/60 text-[11px] font-medium tracking-wide bg-background/80 px-2 py-0.5 rounded shadow-sm">
        Top
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-primary/60 text-[11px] font-medium tracking-wide bg-background/80 px-2 py-0.5 rounded shadow-sm">
        Bottom
      </div>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/60 text-[11px] font-medium tracking-wide bg-background/80 px-2 py-0.5 rounded shadow-sm">
        Left
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/60 text-[11px] font-medium tracking-wide bg-background/80 px-2 py-0.5 rounded shadow-sm">
        Right
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
  totalPaneCount: number;
}> = ({ node, tabId, isVisible, dropTarget, onTerminalRef, totalPaneCount }) => {
  const { setActivePane, activePaneId, sessions, tabs } = useTerminalStore();
  const isActive = activePaneId === node.id;
  const showIndicator = dropTarget?.paneId === node.id;
  const session = sessions.get(node.sessionId);
  
  // Only show header if there are multiple panes in the tab
  const showHeader = totalPaneCount > 1;
  
  // Track cursor position for dynamic drop zone highlighting
  const [dynamicDirection, setDynamicDirection] = React.useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  const [paneElement, setPaneElement] = React.useState<HTMLDivElement | null>(null);

  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: `pane-drag-${node.id}`,
    data: {
      type: 'pane',
      paneId: node.id,
      tabId: tabId,
      sessionId: node.sessionId,
      title: session?.title || 'Terminal',
    },
  });

  const { setNodeRef: setDroppableRef, isOver, active } = useDroppable({
    id: `pane-${node.id}`,
    disabled: !isVisible || isDragging, // Disable dropping on self while dragging
    data: {
      type: 'pane',
      paneId: node.id,
      tabId: tabId,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'transform 150ms ease' : undefined,
    opacity: isDragging ? 0.3 : 1,
    pointerEvents: isDragging ? 'none' : 'auto', // Prevent interaction with dragging pane
  };

  const isReceivingDrop = isOver && active && !isDragging;
  const showZoneOverlay = isReceivingDrop && !showIndicator;

  // Calculate which quadrant the cursor is in for dynamic highlighting
  React.useEffect(() => {
    if (!isReceivingDrop || !paneElement) {
      setDynamicDirection(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!paneElement) return;
      
      const rect = paneElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate which zone the cursor is in (30% threshold from edges)
      const threshold = 0.3;
      const xPercent = x / rect.width;
      const yPercent = y / rect.height;
      
      // Determine direction based on which edge is closest
      const distanceToTop = yPercent;
      const distanceToBottom = 1 - yPercent;
      const distanceToLeft = xPercent;
      const distanceToRight = 1 - xPercent;
      
      const minDistance = Math.min(distanceToTop, distanceToBottom, distanceToLeft, distanceToRight);
      if (minDistance === distanceToTop && distanceToTop < threshold) {
        setDynamicDirection('top');
      } else if (minDistance === distanceToBottom && distanceToBottom < threshold) {
        setDynamicDirection('bottom');
      } else if (minDistance === distanceToLeft && distanceToLeft < threshold) {
        setDynamicDirection('left');
      } else if (minDistance === distanceToRight && distanceToRight < threshold) {
        setDynamicDirection('right');
      } else {
        setDynamicDirection(null);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isReceivingDrop, paneElement]);

  const setRefs = React.useCallback(
    (el: HTMLDivElement | null) => {
      setDroppableRef(el);
      setPaneElement(el);
    },
    [setDroppableRef]
  );

  // Use dynamic direction if available, otherwise fall back to dropTarget direction
  const effectiveDirection = showIndicator 
    ? (dynamicDirection || dropTarget.direction)
    : null;

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const session = sessions.get(node.sessionId);
    if (!session) return;
    
    try {
      // Create a new terminal session (duplicate)
      let newSessionId: string;
      
      if (session.type === 'ssh' && session.metadata.sshConfig) {
        // For SSH sessions, create a new SSH connection
        const { host, port, username, password, privateKey } = session.metadata.sshConfig;
        newSessionId = await useTerminalStore.getState().createSSHTerminal(
          host,
          port,
          username,
          password || '',
          privateKey,
          `${session.title} (Copy)`
        );
      } else {
        // For local terminals, create a new local terminal
        newSessionId = await useTerminalStore.getState().createLocalTerminal(
          session.metadata.shell,
          session.metadata.workingDirectory
        );
      }
      
      console.log('Duplicated pane with new session:', newSessionId);
    } catch (error) {
      console.error('Failed to duplicate pane:', error);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Find which tab this pane belongs to
    const tab = tabs.find(t => {
      const findPane = (layoutNode: any): boolean => {
        if ('sessionId' in layoutNode && layoutNode.id === node.id) return true;
        if ('panes' in layoutNode) {
          return layoutNode.panes.some((p: any) => findPane(p));
        }
        return false;
      };
      return findPane(t.layout);
    });
    
    if (tab) {
      useTerminalStore.getState().closePane(tab.id, node.id);
    }
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Find which tab this pane belongs to
    const tab = tabs.find(t => {
      const findPane = (layoutNode: any): boolean => {
        if ('sessionId' in layoutNode && layoutNode.id === node.id) return true;
        if ('panes' in layoutNode) {
          return layoutNode.panes.some((p: any) => findPane(p));
        }
        return false;
      };
      return findPane(t.layout);
    });
    
    if (tab) {
      // Extract pane to new tab (maximize effect)
      useTerminalStore.getState().extractPaneToNewTab(tab.id, node.id);
    }
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={clsx(
        'relative w-full h-full overflow-hidden flex flex-col',
        'transition-all duration-150',
        isActive ? 'ring-1 ring-blue-500/30' : '',
        isReceivingDrop && 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background'
      )}
      onClick={() => setActivePane(node.id)}
    >
      {/* Header Bar - Only show when there are multiple panes */}
      {showHeader && (
        <div
          className={clsx(
            'flex items-center justify-between px-2 py-1 border-b',
            'bg-background/95 backdrop-blur-sm',
            isActive 
              ? 'border-primary/30 bg-primary/5' 
              : 'border-border/50',
            'transition-colors duration-150',
            'flex-shrink-0'
          )}
        >
          {/* Left side: Drag handle + Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Drag Handle */}
            <div
              ref={setDraggableRef}
              {...attributes}
              {...listeners}
              className={clsx(
                'p-0.5 rounded cursor-grab active:cursor-grabbing',
                'hover:bg-background-hover transition-colors',
                'flex-shrink-0'
              )}
              style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
              title="Drag to move pane"
            >
              <GripVertical className="w-3.5 h-3.5 text-text-muted hover:text-primary transition-colors" />
            </div>

            {/* Terminal Icon */}
            <TerminalIcon className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />

            {/* Session Title */}
            <span 
              className={clsx(
                'text-xs font-medium truncate',
                isActive ? 'text-primary' : 'text-text-muted'
              )}
              title={session?.title || 'Terminal'}
            >
              {session?.title || 'Terminal'}
            </span>
          </div>

          {/* Right side: Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Duplicate Button */}
            <button
              onClick={handleDuplicate}
              className={clsx(
                'p-1 rounded hover:bg-background-hover transition-colors',
                'text-text-muted hover:text-primary'
              )}
              title="Duplicate pane"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Maximize/Restore Button */}
            <button
              onClick={handleMaximize}
              className={clsx(
                'p-1 rounded hover:bg-background-hover transition-colors',
                'text-text-muted hover:text-primary'
              )}
              title="Maximize pane"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className={clsx(
                'p-1 rounded hover:bg-red-500/10 transition-colors',
                'text-text-muted hover:text-red-500'
              )}
              title="Close pane"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Terminal Content */}
      <div className="flex-1 min-h-0 relative">
        <Terminal 
          sessionId={node.sessionId} 
          isVisible={isVisible && !isDragging} 
          ref={React.useCallback((handle: TerminalHandle | null) => {
            onTerminalRef?.(node.sessionId, handle);
          }, [node.sessionId, onTerminalRef])}
        />

        {/* Show zone overlay when hovering but no specific direction yet */}
        {showZoneOverlay && !dynamicDirection && <DropZoneOverlay />}

        {/* Show direction indicator when cursor is in a drop zone */}
        {isReceivingDrop && dynamicDirection && (
          <DropIndicator direction={dynamicDirection} />
        )}

        {/* Show static indicator from dropTarget if provided */}
        {showIndicator && effectiveDirection && !isReceivingDrop && (
          <DropIndicator direction={effectiveDirection} />
        )}
      </div>
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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { updatePaneSizes, tabs } = useTerminalStore();
  
  // Calculate total pane count for this tab
  const tab = tabs.find(t => t.id === tabId);
  const totalPaneCount = tab ? countPanes(tab.layout) : 1;

  if ('sessionId' in node) {
    return (
      <Pane
        node={node}
        tabId={tabId}
        isVisible={isVisible}
        dropTarget={dropTarget}
        onTerminalRef={onTerminalRef}
        totalPaneCount={totalPaneCount}
      />
    );
  }

  const isHorizontal = node.orientation === SplitOrientation.Horizontal;

  const handleResizeStart = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const isHorizontalLayout = node.orientation === SplitOrientation.Horizontal;
    const containerSize = isHorizontalLayout ? container.clientHeight : container.clientWidth;
    const startPos = isHorizontalLayout ? e.clientY : e.clientX;
    const startSizes = [...node.sizes];
    
    const handleDrag = (e: MouseEvent) => {
      const currentPos = isHorizontalLayout ? e.clientY : e.clientX;
      const delta = currentPos - startPos;
      const deltaPercent = (delta / containerSize) * 100;
      
      const newSizes = [...startSizes];
      // Distribute the delta: index increases by delta, index+1 decreases
      newSizes[index] = Math.max(5, startSizes[index] + deltaPercent);
      newSizes[index + 1] = Math.max(5, startSizes[index + 1] - deltaPercent);
      
      // Maintain total size exactly
      const total = newSizes[index] + newSizes[index + 1];
      const originalTotal = startSizes[index] + startSizes[index + 1];
      if (Math.abs(total - originalTotal) > 0.01) {
        const diff = originalTotal - total;
        newSizes[index] += diff / 2;
        newSizes[index + 1] += diff / 2;
      }
      
      updatePaneSizes(tabId, node.id, newSizes);
    };
    
    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';
    };
    
    document.body.style.cursor = isHorizontalLayout ? 'row-resize' : 'col-resize';
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        'flex w-full h-full',
        isHorizontal ? 'flex-col' : 'flex-row'
      )}
    >
      {node.panes.map((child, index) => (
        <React.Fragment key={index}>
          <div
            style={{ flex: `${node.sizes[index]} 1 0%` }}
            className="relative overflow-hidden min-h-0 min-w-0"
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
              onMouseDown={handleResizeStart(index)}
              className={clsx(
                'bg-zinc-700 hover:bg-primary transition-colors duration-200 flex-shrink-0 relative group z-10',
                isHorizontal
                  ? 'h-1 w-full cursor-row-resize'
                  : 'w-1 h-full cursor-col-resize'
              )}
            >
              <div
                className={clsx(
                  'absolute bg-zinc-500 group-hover:bg-primary transition-colors duration-200 rounded pointer-events-none',
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