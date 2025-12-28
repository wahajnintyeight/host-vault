import React, { useEffect, useRef, useCallback } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { TabBar } from './TabBar';
import Terminal from './Terminal';
import { SessionType, TerminalTab } from '../../types/terminal';

interface TerminalTabProps {
  tab: TerminalTab;
  activeTabId: string | null;
  onClose: (tabId: string) => void;
}

const TerminalTabComponent = React.memo<TerminalTabProps>(
  ({ tab, activeTabId, onClose }) => {
    const handleClose = useCallback(() => {
      onClose(tab.id);
    }, [onClose, tab.id]);

    const isActive = tab.id === activeTabId;

    return (
      <div
        className={`absolute inset-0 ${
          isActive ? 'visible z-10' : 'invisible z-0'
        }`}
      >
        <Terminal sessionId={tab.sessionId} onClose={handleClose} />
      </div>
    );
  },
  (prev, next) => {
    // Only re-render if these specific props actually changed
    return (
      prev.tab.id === next.tab.id &&
      prev.tab.sessionId === next.tab.sessionId &&
      prev.activeTabId === next.activeTabId &&
      prev.onClose === next.onClose
    );
  }
);

TerminalTabComponent.displayName = 'TerminalTabComponent';

/**
 * TerminalContainer - Main orchestrator component that combines TabBar and Terminal
 * 
 * Manages terminal tabs, keyboard shortcuts, and terminal lifecycle.
 * Initializes with one default local terminal if no tabs exist.
 * 
 * Keyboard shortcuts:
 * - Ctrl+T: New tab
 * - Ctrl+W: Close active tab
 * - Ctrl+Tab: Next tab
 * - Ctrl+Shift+Tab: Previous tab
 */
export const TerminalContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    tabs,
    activeTabId,
    sessions,
    addTab,
    removeTab,
    setActiveTab,
    updateTabTitle,
    reorderTabs,
    duplicateTab,
    createLocalTerminal,
  } = useTerminalStore();

  // Component lifecycle logging
  useEffect(() => {
    console.log('[TERM] TerminalContainer component mounted');
    return () => {
      console.log('[TERM] TerminalContainer component unmounting');
    };
  }, []);

  // Initialize with one default local terminal if no tabs exist
  useEffect(() => {
    if (tabs.length === 0) {
      createLocalTerminal().catch((error) => {
        console.error('Failed to initialize default terminal:', error);
      });
    }
  }, [tabs.length, createLocalTerminal]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when container is focused or contains focus
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }

      // Ctrl+T: New tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        console.log('[TERM] Keyboard shortcut: New tab (Ctrl+T)');
        createLocalTerminal().catch((error) => {
          console.error('Failed to create new terminal:', error);
        });
        return;
      }

      // Ctrl+W: Close active tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        console.log('[TERM] Keyboard shortcut: Close tab (Ctrl+W)', activeTabId);
        if (activeTabId) {
          removeTab(activeTabId);
        }
        return;
      }

      // Ctrl+Tab: Next tab
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

      // Ctrl+Shift+Tab: Previous tab
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

  // Handle terminal close
  const handleTerminalClose = useCallback((tabId: string) => {
    console.log('[TERM] Terminal session closed for tab:', tabId);
    removeTab(tabId);
  }, [removeTab]);

  // Handle tab actions
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

  // Close all tabs except the specified one
  const handleCloseOthers = useCallback((tabId: string) => {
    const tabsToClose = tabs.filter(t => t.id !== tabId);
    tabsToClose.forEach(t => removeTab(t.id));
  }, [tabs, removeTab]);

  // Close all tabs to the right of the specified one
  const handleCloseRight = useCallback((tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tabsToClose = tabs.slice(tabIndex + 1);
    tabsToClose.forEach(t => removeTab(t.id));
  }, [tabs, removeTab]);

  // Close all tabs
  const handleCloseAll = useCallback(() => {
    tabs.forEach(t => removeTab(t.id));
  }, [tabs, removeTab]);

  // Get session type for a given session ID
  const getSessionType = useCallback((sessionId: string) => {
    const session = sessions.get(sessionId);
    return session?.type;
  }, [sessions]);

  return (
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
        onCloseOthers={handleCloseOthers}
        onCloseRight={handleCloseRight}
        onCloseAll={handleCloseAll}
        getSessionType={getSessionType}
      />
      <div className="flex-1 overflow-hidden relative">
        {tabs.map((tab) => (
          <TerminalTabComponent
            key={tab.sessionId}
            tab={tab}
            activeTabId={activeTabId}
            onClose={handleTerminalClose}
          />
        ))}
      </div>
    </div>
  );
};
