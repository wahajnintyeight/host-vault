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
  const { tabs, reorderTabs, mergeTabs, setActiveTab } = useTerminalStore();
  
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
    const tab = tabs.find((t) => t.id === active.id);
    if (tab) {
      setActiveDragTab(tab);
      // We also store it globally or dispatch it if children need to know
    }
    lastPointerRef.current = getClientPoint(event.activatorEvent);
  }, [tabs]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const point = getClientPoint(event.activatorEvent);
    if (point) lastPointerRef.current = point;
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTab(null);
    setDropTarget(null);
    clearHoverActivate();

    if (!over) return;

    const sourceTabId = active.id as string;
    const overData = over.data.current;
    const activeData = active.data.current;

    if (activeData?.type === 'tab' && overData?.type === 'tab') {
      const oldIndex = activeData.index as number;
      const newIndex = overData.index as number;

      if (oldIndex !== newIndex) {
        reorderTabs(oldIndex, newIndex);
      }
      return;
    }

    if (overData?.type === 'pane' && activeData?.type === 'tab') {
      const targetPaneId = overData.paneId as string;
      const targetTabId = overData.tabId as string;

      if (sourceTabId === targetTabId) return;

      const point = lastPointerRef.current;
      const rect = over.rect as RectLike | null;
      if (!point || !rect) return;

      const direction = getDropDirection(point.x, point.y, rect);
      mergeTabs(sourceTabId, targetTabId, targetPaneId, direction);
    }
  }, [clearHoverActivate, mergeTabs, reorderTabs]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event;

    if (!over) {
      setDropTarget(null);
      clearHoverActivate();
      return;
    }

    const overData = over.data.current;
    const activeData = active.data.current;

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
    } else if (overData?.type === 'pane' && activeData?.type === 'tab') {
      clearHoverActivate();
      const point = lastPointerRef.current ?? getClientPoint(event.activatorEvent);
      const rect = over.rect as RectLike | null;
      if (!point || !rect) return;

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
      {/* We pass down dropTarget and activeDragTab via a context or globally. Wait, let's just use Context. */}
      <TerminalDndContext.Provider value={{ dropTarget, activeDragTab }}>
        {children}
      </TerminalDndContext.Provider>

      <DragOverlay dropAnimation={dropAnimation} style={{ pointerEvents: 'none' }}>
        {activeDragTab ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-background-light border border-primary/50 rounded-lg shadow-2xl opacity-90 scale-105 pointer-events-none">
            <span className="text-text-primary font-medium pointer-events-none">
              {activeDragTab.title}
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
}>({
  dropTarget: null,
  activeDragTab: null,
});

export const useTerminalDnd = () => React.useContext(TerminalDndContext);