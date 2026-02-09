import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Zap } from 'lucide-react';
import { TerminalTab, SessionType } from '../../types/terminal';
import { Tab } from './Tab';

interface TabBarProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onTabActivate: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabDuplicate: (tabId: string) => void;
  onTabReorder: (fromIndex: number, toIndex: number) => void;
  onTabRename?: (tabId: string, newTitle: string) => void;
  onNewTab: () => void;
  onQuickConnect?: () => void;
  onCloseOthers?: (tabId: string) => void;
  onCloseRight?: (tabId: string) => void;
  onCloseAll?: () => void;
  getSessionType?: (sessionId: string) => SessionType | undefined;
}

/**
 * Tab bar container with drag-to-reorder functionality
 * Uses theme CSS variables for consistent styling
 */
export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabActivate,
  onTabClose,
  onTabDuplicate,
  onTabReorder,
  onTabRename,
  onNewTab,
  onQuickConnect,
  onCloseOthers,
  onCloseRight,
  onCloseAll,
  getSessionType,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
    const newIndex = tabs.findIndex((tab) => tab.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      onTabReorder(oldIndex, newIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeTab = activeId ? tabs.find((tab) => tab.id === activeId) : null;

  return (
    <div
      className="flex items-center h-full bg-transparent"
      style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
    >
      {/* Scrollable tab container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={tabs.map((tab) => tab.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex min-w-min h-full">
              {tabs.map((tab, index) => (
                <div key={tab.id} className="group h-full">
                  <Tab
                    tab={tab}
                    sessionType={getSessionType?.(tab.sessionId)}
                    isActive={tab.id === activeTabId}
                    tabIndex={index}
                    tabCount={tabs.length}
                    onActivate={() => onTabActivate(tab.id)}
                    onClose={() => onTabClose(tab.id)}
                    onDuplicate={() => onTabDuplicate(tab.id)}
                    onRename={onTabRename ? (title) => onTabRename(tab.id, title) : undefined}
                    onCloseOthers={onCloseOthers ? () => onCloseOthers(tab.id) : undefined}
                    onCloseRight={onCloseRight ? () => onCloseRight(tab.id) : undefined}
                    onCloseAll={onCloseAll}
                  />
                </div>
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTab ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 h-8
                  bg-background text-text-primary border border-primary/50 shadow-lg
                  cursor-grabbing rounded"
                style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
              >
                <span className="flex-1 min-w-0 truncate text-xs font-medium">
                  {activeTab.title}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* New tab button */}
      <button
        onClick={onNewTab}
        className="flex-shrink-0 p-1.5 mx-1 rounded transition-colors duration-150
          hover:bg-background-lighter text-text-secondary hover:text-text-primary"
        aria-label="New tab"
        style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Quick connect button */}
      {onQuickConnect && (
        <button
          onClick={onQuickConnect}
          className="flex-shrink-0 p-1.5 mx-1 rounded transition-colors duration-150
            hover:bg-primary/10 text-text-secondary hover:text-primary"
          aria-label="Quick connect"
          title="Quick SSH connection"
          style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
        >
          <Zap className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
