import React from 'react';
import { Menu, Terminal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserConfigStore } from '../../store/userConfigStore';
import { WindowControls } from './WindowControls';
import { UserMenu } from '../ui/UserMenu';
import { WindowMaximize } from '../../../wailsjs/go/main/App';
import { ROUTES } from '../../lib/constants';
import { TabBar } from '../terminal/TabBar';
import { useTerminalStore } from '../../store/terminalStore';

export const Header: React.FC = () => {
  const { updateConfig, config } = useUserConfigStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Terminal store for tabs
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
  } = useTerminalStore();

  const isTerminalPage = location.pathname === ROUTES.TERMINAL;

  const toggleSidebar = () => {
    updateConfig({ sidebarOpen: !config.sidebarOpen });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only trigger on the header itself, not on interactive elements
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    
    if (typeof window !== 'undefined' && window.go && window.go.main && window.go.main.App) {
      WindowMaximize().catch(() => {});
    }
  };

  const handleHeaderClick = () => {
    navigate(ROUTES.DASHBOARD);
  };

  // Terminal tab handlers
  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    // Navigate to terminal page if not already there
    if (!isTerminalPage) {
      navigate(ROUTES.TERMINAL);
    }
  };

  const handleTabClose = (tabId: string) => removeTab(tabId);
  const handleTabRename = (tabId: string, newTitle: string) => updateTabTitle(tabId, newTitle);
  const handleTabReorder = (fromIndex: number, toIndex: number) => reorderTabs(fromIndex, toIndex);
  
  const handleTabDuplicate = (tabId: string) => {
    duplicateTab(tabId).catch(console.error);
  };

  const handleNewTab = async () => {
    try {
      await createLocalTerminal();
      // Navigate to terminal page after creating new tab
      if (!isTerminalPage) {
        navigate(ROUTES.TERMINAL);
      }
    } catch (error) {
      console.error('Failed to create terminal:', error);
    }
  };

  const handleCloseOthers = (tabId: string) => {
    tabs.filter((t) => t.id !== tabId).forEach((t) => removeTab(t.id));
  };

  const handleCloseRight = (tabId: string) => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx !== -1) tabs.slice(idx + 1).forEach((t) => removeTab(t.id));
  };

  const handleCloseAll = () => tabs.forEach((t) => removeTab(t.id));
  
  const getSessionType = (sessionId: string) => sessions.get(sessionId)?.type;

  // Open terminal button handler
  const handleOpenTerminal = async () => {
    if (tabs.length === 0) {
      // Create a new terminal if none exist
      try {
        await createLocalTerminal();
      } catch (error) {
        console.error('Failed to create terminal:', error);
      }
    }
    navigate(ROUTES.TERMINAL);
  };

  return (
    <header
      className="h-12 bg-background-light flex items-center justify-between px-4 titlebar"
      style={{ '--wails-draggable': 'drag' } as React.CSSProperties}
      onDoubleClick={handleDoubleClick}
    >
      {/* Left section */}
      <div className="flex items-center gap-3 flex-1 titlebar min-w-0">
        {/* Sidebar toggle */}
        <div className="flex items-center gap-2 no-drag flex-shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-background rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Menu size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* App title - always visible but compact when tabs exist
        <div
          className="flex items-center gap-2 flex-shrink-0 titlebar"
          onDoubleClick={handleDoubleClick}
        >
          <span
            onClick={handleHeaderClick}
            className="no-drag text-sm font-semibold text-text-primary select-none hover:text-primary transition-colors duration-200 cursor-pointer"
          >
            Host Vault
          </span>
        </div> */}

        {/* Separator */}
        <div className="h-5 w-px bg-border/50 flex-shrink-0" />

        {/* Terminal tabs - always visible */}
        <div className="flex-1 min-w-0 no-drag overflow-hidden h-full flex items-center">
          {tabs.length > 0 ? (
            <TabBar
              tabs={tabs}
              activeTabId={isTerminalPage ? activeTabId : null}
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
          ) : (
            /* Show "Open Terminal" button when no tabs */
            <button
              onClick={handleOpenTerminal}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium
                text-text-secondary hover:text-text-primary
                hover:bg-background rounded transition-colors duration-150"
            >
              <Terminal size={14} />
              <span>Open Terminal</span>
            </button>
          )}
        </div>
      </div>

      {/* Right section - non-draggable controls */}
      <div className="flex items-center gap-2 no-drag flex-shrink-0">
        <UserMenu />
        <WindowControls />
      </div>
    </header>
  );
};
