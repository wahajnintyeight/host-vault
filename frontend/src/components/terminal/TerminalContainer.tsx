import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { TabBar } from './TabBar';
import { SplitPane } from './SplitPane';
import { cleanupAllTerminalInstances } from './Terminal';
import { SessionType, TerminalTab } from '../../types/terminal';
import { QuickConnectModal } from '../connections/QuickConnectModal';
import { PasswordPromptModal } from '../connections/PasswordPromptModal';
import { getActiveSessionId } from '../../lib/terminalUtils';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  DropAnimation,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
  closestCenter,
  CollisionDetection,
} from '@dnd-kit/core';

interface TerminalTabProps {
  tab: TerminalTab;
  activeTabId: string | null;
  dropTarget: {
    paneId: string;
    direction: 'top' | 'bottom' | 'left' | 'right';
  } | null;
}

const TerminalTabComponent = React.memo<TerminalTabProps>(
  ({ tab, activeTabId, dropTarget }) => {
    const isActive = tab.id === activeTabId;

    return (
      <div className={`absolute inset-0 ${isActive ? '' : 'invisible pointer-events-none'}`}>
        <SplitPane 
          node={tab.layout}
          tabId={tab.id}
          isVisible={isActive}
          dropTarget={dropTarget}
        />
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.tab.id === next.tab.id &&
      prev.tab.layout === next.tab.layout &&
      prev.activeTabId === next.activeTabId &&
      prev.dropTarget?.paneId === next.dropTarget?.paneId &&
      prev.dropTarget?.direction === next.dropTarget?.direction
    );
  }
);

TerminalTabComponent.displayName = 'TerminalTabComponent';

type RectLike = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

const getDropDirection = (
  clientX: number,
  clientY: number,
  rect: RectLike
): 'top' | 'bottom' | 'left' | 'right' => {
  const { left, top, width, height } = rect;
  const x = clientX - left;
  const y = clientY - top;
  
  // Calculate distances to each edge
  const distTop = y;
  const distBottom = height - y;
  const distLeft = x;
  const distRight = width - x;
  
  const minDist = Math.min(distTop, distBottom, distLeft, distRight);
  
  if (minDist === distTop) return 'top';
  if (minDist === distBottom) return 'bottom';
  if (minDist === distLeft) return 'left';
  return 'right';
};

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

const getClientPoint = (e: unknown): { x: number; y: number } | null => {
  if (!e || typeof e !== 'object') return null;
  const any = e as { clientX?: unknown; clientY?: unknown };
  if (typeof any.clientX !== 'number' || typeof any.clientY !== 'number') {
    return null;
  }
  return { x: any.clientX, y: any.clientY };
};

const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length) return pointer;
  const intersection = rectIntersection(args);
  if (intersection.length) return intersection;
  console.log('collission detection')
  return closestCenter(args);
};

export const TerminalContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    username: string;
    host: string;
    port: number;
  } | null>(null);
  const [activeDragTab, setActiveDragTab] = useState<TerminalTab | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    paneId: string;
    tabId: string;
    direction: 'top' | 'bottom' | 'left' | 'right';
  } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const hoverActivateRef = useRef<{
    tabId: string | null;
    timeoutId: number | null;
  }>({ tabId: null, timeoutId: null });
  
  const {
    tabs,
    activeTabId,
    sessions,
    removeTab,
    setActiveTab,
    updateTabTitle,
    reorderTabs,
    duplicateTab,
    createLocalTerminal,
    createQuickSSHTerminal,
    mergeTabs,
  } = useTerminalStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
      onActivation: (event) => {
        console.log('[SENSOR] Drag activated!', event);
      },
    })
  );

  useEffect(() => {
    console.log('[TERM] TerminalContainer component mounted');
    return () => {
      console.log('[TERM] TerminalContainer component unmounting');
      cleanupAllTerminalInstances();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }

      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        console.log('[TERM] Keyboard shortcut: New tab (Ctrl+T)');
        createLocalTerminal().catch((error) => {
          console.error('Failed to create new terminal:', error);
        });
        return;
      }

      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        console.log('[TERM] Keyboard shortcut: Close tab (Ctrl+W)', activeTabId);
        if (activeTabId) {
          removeTab(activeTabId);
        }
        return;
      }

      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        if (tabs.length > 0 && activeTabId) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const nextIndex = (currentIndex + 1) % tabs.length;
          console.log('[TERM] Keyboard shortcut: Next tab (Ctrl+Tab)', tabs[nextIndex].id);
          setActiveTab(tabs[nextIndex].id);
        }
        return;
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        if (tabs.length > 0 && activeTabId) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
          console.log('[TERM] Keyboard shortcut: Previous tab (Ctrl+Shift+Tab)', tabs[prevIndex].id);
          setActiveTab(tabs[prevIndex].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabs, activeTabId, createLocalTerminal, removeTab, setActiveTab]);

  const clearHoverActivate = useCallback(() => {
    const { timeoutId } = hoverActivateRef.current;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    hoverActivateRef.current = { tabId: null, timeoutId: null };
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('dragStart', event.active.id);
    console.log('[DND] Active data:', event.active.data.current);
    const { active } = event;
    const tab = tabs.find(t => t.id === active.id);
    if (tab) {
      console.log('[DND] Found tab to drag:', tab.title);
      setActiveDragTab(tab);
    } else {
      console.warn('[DND] Tab not found for id:', active.id);
    }
    lastPointerRef.current = getClientPoint(event.activatorEvent);
  }, [tabs]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    console.log("handle drag move")
    const point = getClientPoint(event.activatorEvent);
    if (point) lastPointerRef.current = point;
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTab(null);
    setDropTarget(null);
    clearHoverActivate();
    console.log("handle drag end")

    if (!over) return;

    const sourceTabId = active.id as string;
    const overData = over.data.current;
    const activeData = active.data.current;

    // Check if it's a tab being reordered within the tab bar
    if (activeData?.type === 'tab' && overData?.type === 'tab') {
      const oldIndex = activeData.index as number;
      const newIndex = overData.index as number;
      
      if (oldIndex !== newIndex) {
        console.log('[DND] Reordering tab from', oldIndex, 'to', newIndex);
        reorderTabs(oldIndex, newIndex);
      }
      return;
    }

    // Check if dropped on a pane (for merging)
    if (overData?.type === 'pane' && activeData?.type === 'tab') {
      const targetPaneId = overData.paneId as string;
      const targetTabId = overData.tabId as string;
      
      // Don't drop on itself
      if (sourceTabId === targetTabId) return;

      const point = lastPointerRef.current;
      const rect = over.rect as RectLike | null;
      if (!point || !rect) return;

      const direction = getDropDirection(point.x, point.y, rect);
      console.log(
        '[DND] Merging tab',
        sourceTabId,
        'into',
        targetTabId,
        'direction:',
        direction
      );
      mergeTabs(sourceTabId, targetTabId, targetPaneId, direction);
    }
  }, [clearHoverActivate, mergeTabs, reorderTabs]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event;
    
    console.log('[DND] DragOver - over:', over?.id, 'active:', active.id);
    
    if (!over) {
      setDropTarget(null);
      clearHoverActivate();
      return;
    }

    const overData = over.data.current;
    const activeData = active.data.current;
    
    console.log('[DND] Over data:', overData, 'Active data:', activeData);

    if (activeData?.type === 'tab' && overData?.type === 'tab') {
      const overTabId = over.id as string;
      if (overTabId !== hoverActivateRef.current.tabId) {
        clearHoverActivate();
        hoverActivateRef.current.tabId = overTabId;
        hoverActivateRef.current.timeoutId = window.setTimeout(() => {
          setActiveTab(overTabId);
        }, 350);
      }
    } else {
      clearHoverActivate();
    }
    
    if (overData?.type === 'pane' && activeData?.type === 'tab') {
      console.log('[DND] Hovering over pane:', overData.paneId);
      const point = lastPointerRef.current ?? getClientPoint(event.activatorEvent);
      const rect = over.rect as RectLike | null;
      if (!point || !rect) return;

      const direction = getDropDirection(point.x, point.y, rect);
      console.log('[DND] Drop direction:', direction);
      setDropTarget((prev) => {
        const next = {
          paneId: overData.paneId as string,
          tabId: overData.tabId as string,
          direction,
        };
        if (
          prev?.paneId === next.paneId &&
          prev?.tabId === next.tabId &&
          prev?.direction === next.direction
        ) {
          return prev;
        }
        return next;
      });
    } else {
      setDropTarget(null);
    }
  }, [clearHoverActivate, setActiveTab]);

  const handleTabClose = useCallback((tabId: string) => {
    console.log('[TERM] Closing tab:', tabId);
    removeTab(tabId);
  }, [removeTab]);

  const handleTabSelect = useCallback((tabId: string) => {
    console.log('[TERM] Switching to tab:', tabId);
    setActiveTab(tabId);
  }, [setActiveTab]);

  const handleTabRename = useCallback((tabId: string, newTitle: string) => {
    updateTabTitle(tabId, newTitle);
  }, [updateTabTitle]);

  const handleTabReorder = useCallback((fromIndex: number, toIndex: number) => {
    reorderTabs(fromIndex, toIndex);
  }, [reorderTabs]);

  const handleTabDuplicate = useCallback((tabId: string) => {
    duplicateTab(tabId).catch((error) => {
      console.error('Failed to duplicate tab:', error);
    });
  }, [duplicateTab]);

  const handleNewTab = useCallback(() => {
    console.log('[TERM] Creating new terminal tab');
    createLocalTerminal().catch((error) => {
      console.error('Failed to create new terminal:', error);
    });
  }, [createLocalTerminal]);

  const handleQuickConnect = useCallback((username: string, host: string, port: number) => {
    setPendingConnection({ username, host, port });
    setIsConnecting(true);
    
    createQuickSSHTerminal(username, host, port)
      .then(() => {
        setIsConnecting(false);
        setShowQuickConnect(false);
        setPendingConnection(null);
        setShowPasswordPrompt(false);
      })
      .catch((error: any) => {
        if (error?.message?.includes('permission denied') || error?.message?.includes('auth')) {
          setIsConnecting(false);
          setShowQuickConnect(false);
          setShowPasswordPrompt(true);
        } else {
          setIsConnecting(false);
          setPendingConnection(null);
          setShowQuickConnect(false);
          setShowPasswordPrompt(false);
          console.error('Failed to connect:', error);
        }
      });
  }, [createQuickSSHTerminal]);

  const handlePasswordSubmit = useCallback((password: string) => {
    if (!pendingConnection) return;
    
    setIsConnecting(true);
    createQuickSSHTerminal(
      pendingConnection.username,
      pendingConnection.host,
      pendingConnection.port,
      password
    )
      .then(() => {
        setIsConnecting(false);
        setShowPasswordPrompt(false);
        setPendingConnection(null);
      })
      .catch((error) => {
        setIsConnecting(false);
        console.error('Failed to connect with password:', error);
      });
  }, [pendingConnection, createQuickSSHTerminal]);

  const handleCloseOthers = useCallback((tabId: string) => {
    const tabsToClose = tabs.filter(t => t.id !== tabId);
    tabsToClose.forEach(t => removeTab(t.id));
  }, [tabs, removeTab]);

  const handleCloseRight = useCallback((tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tabsToClose = tabs.slice(tabIndex + 1);
    tabsToClose.forEach(t => removeTab(t.id));
  }, [tabs, removeTab]);

  const handleCloseAll = useCallback(() => {
    tabs.forEach(t => removeTab(t.id));
  }, [tabs, removeTab]);

  const getSessionType = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return undefined;
    const sessionId = getActiveSessionId(tab);
    if (!sessionId) return undefined;
    return sessions.get(sessionId)?.type;
  }, [sessions, tabs]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div 
        ref={containerRef}
        className="flex flex-col h-full w-full bg-[#0f172a]"
        tabIndex={-1}
      >
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabActivate={handleTabSelect}
          onTabClose={handleTabClose}
          onTabRename={handleTabRename}
          onTabReorder={handleTabReorder}
          onTabDuplicate={handleTabDuplicate}
          onNewTab={handleNewTab}
          onQuickConnect={() => setShowQuickConnect(true)}
          onCloseOthers={handleCloseOthers}
          onCloseRight={handleCloseRight}
          onCloseAll={handleCloseAll}
          getSessionType={getSessionType}
        />
        <div className="flex-1 overflow-hidden relative">
          {tabs.map((tab) => (
            <TerminalTabComponent
              key={tab.id}
              tab={tab}
              activeTabId={activeTabId}
              dropTarget={
                // Show drop target on the active tab when dragging
                tab.id === activeTabId && activeDragTab ? dropTarget : null
              }
            />
          ))}
        </div>

        <QuickConnectModal
          isOpen={showQuickConnect}
          isConnecting={isConnecting}
          onConnect={handleQuickConnect}
          onClose={() => {
            setShowQuickConnect(false);
            setPendingConnection(null);
          }}
        />

        {pendingConnection && (
          <PasswordPromptModal
            isOpen={showPasswordPrompt}
            isConnecting={isConnecting}
            host={pendingConnection.host}
            username={pendingConnection.username}
            onSubmit={handlePasswordSubmit}
            onCancel={() => {
              setShowPasswordPrompt(false);
              setPendingConnection(null);
            }}
          />
        )}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeDragTab ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-background-light border border-primary/50 rounded-lg shadow-2xl opacity-90 scale-105 cursor-grabbing">
            <span className="text-text-primary font-medium">
              {activeDragTab.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
