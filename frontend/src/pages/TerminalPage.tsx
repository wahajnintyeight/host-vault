import React from 'react';
import { useTerminalStore } from '../store/terminalStore';
import Terminal from '../components/terminal/Terminal';

/**
 * TerminalPage - Terminal content area
 * 
 * Renders only the active terminal. The tab bar is displayed in the Header
 * across all pages. Terminal creation is handled by the Header's "Open Terminal" button.
 */
export const TerminalPage: React.FC = () => {
  const { tabs, activeTabId, removeTab } = useTerminalStore();

  // Find active terminal
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeSessionId = activeTab?.sessionId;

  // Handle terminal close from backend
  const handleTerminalClose = () => {
    if (activeTabId) {
      removeTab(activeTabId);
    }
  };

  return (
    <div
      className="h-full w-full bg-background"
      style={{
        margin: '-2rem',
        width: 'calc(100% + 4rem)',
        height: 'calc(100% + 4rem)',
      }}
    >
      {activeSessionId ? (
        <Terminal sessionId={activeSessionId} onClose={handleTerminalClose} />
      ) : (
        <div className="flex items-center justify-center h-full text-text-muted">
          <div className="text-center">
            <p className="text-sm">No terminal selected</p>
            <p className="text-xs mt-1 text-text-muted/70">
              Click a tab above or + to create a new terminal
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
