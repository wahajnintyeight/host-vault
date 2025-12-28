import React, { useEffect, useRef } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { TabBar } from './TabBar';
import Terminal from './Terminal';
import { SessionType } from '../../types/terminal';

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
        createLocalTerminal().catch((error) => {
          console.error('Failed to create new terminal:', error);
        });
        return;
      }

      // Ctrl+W: Close active tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
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

  // Find active terminal
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeTerminal = activeTab ? { sessionId: activeTab.sessionId } : null;

  // Handle terminal close
  const handleTerminalClose = () => {
    if (activeTabId) {
      removeTab(activeTabId);
    }
  };

  // Handle tab actions
  const handleTabClose = (tabId: string) => {
    removeTab(tabId);
  };

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabRename = (tabId: string, newTitle: string) => {
    updateTabTitle(tabId, newTitle);
  };

  const handleTabReorder = (fromIndex: number, toIndex: number) => {
    reorderTabs(fromIndex, toIndex);
  };

  const handleTabDuplicate = (tabId: string) => {
    duplicateTab(tabId).catch((error) => {
      console.error('Failed to duplicate tab:', error);
    });
  };

  const handleNewTab = () => {
    createLocalTerminal().catch((error) => {
      console.error('Failed to create new terminal:', error);
    });
  };

  // Close all tabs except the specified one
  const handleCloseOthers = (tabId: string) => {
    const tabsToClose = tabs.filter(t => t.id !== tabId);
    tabsToClose.forEach(t => removeTab(t.id));
  };

  // Close all tabs to the right of the specified one
  const handleCloseRight = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const tabsToClose = tabs.slice(tabIndex + 1);
    tabsToClose.forEach(t => removeTab(t.id));
  };

  // Close all tabs
  const handleCloseAll = () => {
    tabs.forEach(t => removeTab(t.id));
  };

  // Get session type for a given session ID
  const getSessionType = (sessionId: string) => {
    const session = sessions.get(sessionId);
    return session?.type;
  };

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
      <div className="flex-1 overflow-hidden">
        {activeTerminal && (
          <Terminal 
            sessionId={activeTerminal.sessionId} 
            onClose={handleTerminalClose} 
          />
        )}
      </div>
    </div>
  );
};
