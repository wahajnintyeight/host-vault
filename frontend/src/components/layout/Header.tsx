import React, { useState } from 'react';
import { Menu, Terminal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserConfigStore } from '../../store/userConfigStore';
import { WindowControls } from './WindowControls';
import { UserMenu } from '../ui/UserMenu';
import { WindowMaximize } from '../../../wailsjs/go/main/App';
import { ROUTES } from '../../lib/constants';
import { TabBar } from '../terminal/TabBar';
import { useTerminalStore } from '../../store/terminalStore';
import { getActiveSessionId } from '../../lib/terminalUtils';
import {
  closestCenter,
} from '@dnd-kit/core';

export const Header: React.FC = () => {
  const { updateConfig, config } = useUserConfigStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveWorkspaceName, setSaveWorkspaceName] = useState('');
  const [saveWorkspaceDescription, setSaveWorkspaceDescription] = useState('');

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
    saveWorkspace,
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
  
  const handleSaveAsWorkspace = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setSaveWorkspaceName(tab.title || 'My Workspace');
      setSaveWorkspaceDescription('');
      setShowSaveDialog(true);
    }
  };

  const handleSaveWorkspace = () => {
    if (!saveWorkspaceName.trim()) return;
    
    saveWorkspace(saveWorkspaceName.trim(), saveWorkspaceDescription.trim() || undefined);
    setShowSaveDialog(false);
    setSaveWorkspaceName('');
    setSaveWorkspaceDescription('');
    
    // Show success message
    alert('Workspace saved successfully!');
  };
  
  const getSessionType = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return undefined;
    const sessionId = getActiveSessionId(tab);
    if (!sessionId) return undefined;
    return sessions.get(sessionId)?.type;
  };

  // Check if there are any local terminal tabs open
  const hasLocalTerminal = tabs.some(tab => {
    const sessionId = getActiveSessionId(tab);
    if (!sessionId) return false;
    const session = sessions.get(sessionId);
    return session?.type === 'local'; // Using string value instead of enum for safety
  });

  const hasSSHTerminal = tabs.some(tab => {
    const sessionId = getActiveSessionId(tab);
    if (!sessionId) return false;
    const session = sessions.get(sessionId);
    return session?.type === 'ssh'; // Using string value instead of enum for safety
  });

  // Open terminal button handler - creates a local terminal when clicked
  const handleOpenTerminal = async () => {
    if (!hasLocalTerminal) {
      // Create a new local terminal if none exist
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

        {/* Separator */}
        <div className="h-5 w-px bg-border/50 flex-shrink-0" />

        {/* Terminal tabs - always visible */}
        <div 
          className="flex-1 min-w-0 overflow-hidden h-full flex items-center gap-2"
          style={{ '--wails-draggable': 'drag' } as React.CSSProperties}
        >
          {tabs.length > 0 && (
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
              onSaveAsWorkspace={handleSaveAsWorkspace}
              getSessionType={getSessionType}
            />
          )}
          {/* Show "Open Terminal" button only when no local terminals are open */}
          {!hasLocalTerminal && (
            <button
              onClick={handleOpenTerminal}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium
                text-text-secondary hover:text-text-primary
                hover:bg-background rounded transition-colors duration-150
                flex-shrink-0"
              title="Open Terminal"
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

      {/* Save Workspace Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Save as Workspace</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={saveWorkspaceName}
                  onChange={(e) => setSaveWorkspaceName(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter workspace name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={saveWorkspaceDescription}
                  onChange={(e) => setSaveWorkspaceDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-background-light border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Enter description"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveWorkspaceName('');
                    setSaveWorkspaceDescription('');
                  }}
                  className="px-4 py-2 rounded bg-background-light text-text-primary hover:bg-background-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWorkspace}
                  disabled={!saveWorkspaceName.trim()}
                  className="px-4 py-2 rounded bg-primary text-background hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
