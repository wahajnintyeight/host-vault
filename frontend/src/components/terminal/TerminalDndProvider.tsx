import React, { useRef, useState, useCallback, ReactNode } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
  DropAnimation,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
  closestCenter,
  CollisionDetection,
} from '@dnd-kit/core';
import { useTerminalStore } from '../../store/terminalStore';
import { TerminalTab } from '../../types/terminal';

type RectLike = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

const getDropDirection = (
  clientX: number,
  clientY: number,
  rect: RectLike
): 'top' | 'bottom' | 'left' | 'right' => {
  const { left, top, width, height } = rect;
  const x = clientX - left;
  const y = clientY - top;

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

  if (pointer.length > 0) {
    const paneCollision = pointer.find((c) => String(c.id).startsWith('pane-'));
    if (paneCollision) return [paneCollision];
    return pointer;
  }

  const intersection = rectIntersection(args);
  if (intersection.length > 0) {
    const paneCollision = intersection.find((c) => String(c.id).startsWith('pane-'));
    if (paneCollision) return [paneCollision];
    return intersection;
  }

  return closestCenter(args);
};

export const TerminalDndProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { tabs, reorderTabs, mergeTabs, setActiveTab, extractPaneToNewTab, movePaneToPane, sessions } = useTerminalStore();
  
  const [activeDragTab, setActiveDragTab] = useState<TerminalTab | null>(null);
  const [activeDragPane, setActiveDragPane] = useState<{
    paneId: string;
    tabId: string;
    sessionId: string;
    title: string;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    paneId: string;
    tabId: string;
    direction: 'top' | 'bottom' | 'left' | 'right';
  } | null>(null);
  
  const initialPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const hoverActivateRef = useRef<{
    tabId: string | null;
    timeoutId: number | null;
  }>({ tabId: null, timeoutId: null });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const clearHoverActivate = useCallback(() => {
    const { timeoutId } = hoverActivateRef.current;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    hoverActivateRef.current = { tabId: null, timeoutId: null };
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    if (activeData?.type === 'tab') {
      const tab = tabs.find((t) => t.id === active.id);
      if (tab) {
        setActiveDragTab(tab);
      }
    } else if (activeData?.type === 'pane') {
      setActiveDragPane({
        paneId: activeData.paneId as string,
        tabId: activeData.tabId as string,
        sessionId: activeData.sessionId as string,
        title: activeData.title as string,
      });
    }
    
    const point = getClientPoint(event.activatorEvent);
    initialPointerRef.current = point;
    lastPointerRef.current = point;
    
    // Add global mouse move listener to track actual cursor position
    const handleGlobalMouseMove = (e: MouseEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    
    // Store cleanup function
    const cleanup = () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
    
    // Store cleanup in a ref or state that can be accessed later
    (window as any).__dndCleanup = cleanup;
  }, [tabs]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    // Mouse position is now tracked by global listener in handleDragStart
    // This is kept for compatibility but not used for position tracking
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Cleanup global mouse listener
    if ((window as any).__dndCleanup) {
      (window as any).__dndCleanup();
      delete (window as any).__dndCleanup;
    }
    
    setActiveDragTab(null);
    setActiveDragPane(null);
    setDropTarget(null);
    clearHoverActivate();

    if (!over) return;

    const overData = over.data.current;
    const activeData = active.data.current;

    // Tab dropping on tab (reorder)
    if (activeData?.type === 'tab' && overData?.type === 'tab') {
      const oldIndex = activeData.index as number;
      const newIndex = overData.index as number;

      if (oldIndex !== newIndex) {
        reorderTabs(oldIndex, newIndex);
      }
      return;
    }

    // Get current mouse position
    const point = lastPointerRef.current;

    // Tab dropping on pane (merge into split)
    if (activeData?.type === 'tab' && overData?.type === 'pane') {
      const sourceTabId = active.id as string;
      const targetPaneId = overData.paneId as string;
      const targetTabId = overData.tabId as string;

      if (sourceTabId === targetTabId) return;

      const rect = over.rect as RectLike | null;
      if (!point || !rect) return;

      const direction = getDropDirection(point.x, point.y, rect);
      console.log('[DND] Tab->Pane drop direction:', direction, 'at point:', point, 'rect:', rect);
      mergeTabs(sourceTabId, targetTabId, targetPaneId, direction);
      return;
    }

    // Pane dropping on tab (extract to new tab)
    if (activeData?.type === 'pane' && overData?.type === 'tab') {
      const sourceTabId = activeData.tabId as string;
      const sourcePaneId = activeData.paneId as string;
      extractPaneToNewTab(sourceTabId, sourcePaneId);
      return;
    }

    // Pane dropping on pane (move or split)
    if (activeData?.type === 'pane' && overData?.type === 'pane') {
      const sourceTabId = activeData.tabId as string;
      const sourcePaneId = activeData.paneId as string;
      const targetTabId = overData.tabId as string;
      const targetPaneId = overData.paneId as string;

      // Don't drop on self
      if (sourceTabId === targetTabId && sourcePaneId === targetPaneId) return;

      const rect = over.rect as RectLike | null;
      if (!point || !rect) return;

      const direction = getDropDirection(point.x, point.y, rect);
      console.log('[DND] Pane->Pane drop direction:', direction, 'at point:', point, 'rect:', rect);
      movePaneToPane(sourceTabId, sourcePaneId, targetTabId, targetPaneId, direction);
    }
  }, [clearHoverActivate, mergeTabs, reorderTabs, extractPaneToNewTab, movePaneToPane]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event;

    if (!over) {
      setDropTarget(null);
      clearHoverActivate();
      return;
    }

    const overData = over.data.current;
    const activeData = active.data.current;

    // Tab over tab (hover activate)
    if (activeData?.type === 'tab' && overData?.type === 'tab') {
      const overTabId = over.id as string;
      if (overTabId !== hoverActivateRef.current.tabId) {
        clearHoverActivate();
        hoverActivateRef.current.tabId = overTabId;
        hoverActivateRef.current.timeoutId = window.setTimeout(() => {
          setActiveTab(overTabId);
        }, 350);
      }
      setDropTarget(null);
    } 
    // Pane over tab (show extract hint)
    else if (activeData?.type === 'pane' && overData?.type === 'tab') {
      clearHoverActivate();
      setDropTarget(null);
    }
    // Tab or Pane over pane (show drop zones)
    else if (overData?.type === 'pane' && (activeData?.type === 'tab' || activeData?.type === 'pane')) {
      clearHoverActivate();
      const point = lastPointerRef.current;
      const rect = over.rect as RectLike | null;
      if (!point || !rect) return;

      // Don't show drop indicator for pane dropping on itself
      if (activeData?.type === 'pane' && 
          activeData.paneId === overData.paneId && 
          activeData.tabId === overData.tabId) {
        setDropTarget(null);
        return;
      }

      const direction = getDropDirection(point.x, point.y, rect);
      setDropTarget({
        paneId: overData.paneId as string,
        tabId: overData.tabId as string,
        direction,
      });
    } else {
      clearHoverActivate();
      setDropTarget(null);
    }
  }, [clearHoverActivate, setActiveTab]);

  const isDragging = activeDragTab !== null || activeDragPane !== null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <TerminalDndContext.Provider value={{ dropTarget, activeDragTab, isDragging }}>
        {children}
      </TerminalDndContext.Provider>

      <DragOverlay dropAnimation={dropAnimation} style={{ pointerEvents: 'none' }}>
        {activeDragTab ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-background-light border border-primary/50 rounded-lg shadow-2xl opacity-90 scale-105 pointer-events-none">
            <span className="text-text-primary font-medium pointer-events-none">
              {activeDragTab.title}
            </span>
          </div>
        ) : activeDragPane ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-background-light border border-primary/50 rounded-lg shadow-2xl opacity-90 scale-105 pointer-events-none">
            <span className="text-text-primary font-medium pointer-events-none">
              {activeDragPane.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export const TerminalDndContext = React.createContext<{
  dropTarget: {
    paneId: string;
    tabId: string;
    direction: 'top' | 'bottom' | 'left' | 'right';
  } | null;
  activeDragTab: TerminalTab | null;
  isDragging: boolean;
}>({
  dropTarget: null,
  activeDragTab: null,
  isDragging: false,
});

export const useTerminalDnd = () => React.useContext(TerminalDndContext);