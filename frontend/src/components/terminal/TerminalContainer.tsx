import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { TabBar } from './TabBar';
import Terminal from './Terminal';
import { SessionType, TerminalTab } from '../../types/terminal';
import { QuickConnectModal } from '../connections/QuickConnectModal';
import { PasswordPromptModal } from '../connections/PasswordPromptModal';

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
      <div className="absolute inset-0">
        <Terminal 
          sessionId={tab.sessionId}
          isVisible={isActive}
          onClose={handleClose} 
        />
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.tab.id === next.tab.id &&
      prev.tab.sessionId === next.tab.sessionId &&
      prev.activeTabId === next.activeTabId &&
      prev.onClose === next.onClose
    );
  }
);

TerminalTabComponent.displayName = 'TerminalTabComponent';

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
  } = useTerminalStore();

  useEffect(() => {
    console.log('[TERM] TerminalContainer component mounted');
    return () => {
      console.log('[TERM] TerminalContainer component unmounting');
    };
  }, []);

  useEffect(() => {
    if (tabs.length === 0) {
      createLocalTerminal().catch((error) => {
        console.error('Failed to initialize default terminal:', error);
      });
    }
  }, [tabs.length, createLocalTerminal]);

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

  const handleTerminalClose = useCallback((tabId: string) => {
    console.log('[TERM] Terminal session closed for tab:', tabId);
    removeTab(tabId);
  }, [removeTab]);

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
        // Check if error indicates password is needed
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
        onQuickConnect={() => setShowQuickConnect(true)}
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
  );
};