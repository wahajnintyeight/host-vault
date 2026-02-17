import React from 'react';
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
  onTabReorder: (fromIndex: number, toIndex: number) => void; // Kept for prop interface compatibility if needed, but logic moves up
  onTabRename?: (tabId: string, newTitle: string) => void;
  onNewTab: () => void;
  onQuickConnect?: () => void;
  onCloseOthers?: (tabId: string) => void;
  onCloseRight?: (tabId: string) => void;
  onCloseAll?: () => void;
  getSessionType?: (tabId: string) => SessionType | undefined;
}

/**
 * Tab bar container - Drag context moved to parent
 */
export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabActivate,
  onTabClose,
  onTabDuplicate,
  onTabRename,
  onNewTab,
  onQuickConnect,
  onCloseOthers,
  onCloseRight,
  onCloseAll,
  getSessionType,
}) => {
  return (
    <div
      className="flex items-center h-full bg-transparent"
      style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
    >
      {/* Scrollable tab container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden h-full">
        <SortableContext
          items={tabs.map((tab) => tab.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex min-w-min h-full">
            {tabs.map((tab, index) => (
              <div key={tab.id} className="group h-full">
                <Tab
                  tab={tab}
                  sessionType={getSessionType?.(tab.id)}
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
