import React, { useRef, useState, useEffect } from 'react';
import { useTerminalStore } from '../store/terminalStore';
import Terminal, { TerminalHandle } from '../components/terminal/Terminal';
import { TerminalDrawer } from '../components/terminal/TerminalDrawer';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';

/**
 * TerminalPage - Terminal content area with sidebar drawer
 */
export const TerminalPage: React.FC = () => {
  const { tabs, activeTabId, removeTab } = useTerminalStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const terminalRef = useRef<TerminalHandle>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeSessionId = activeTab?.sessionId;

  // Keyboard shortcut to toggle drawer (Ctrl+Shift+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTerminalClose = () => {
    if (activeTabId) {
      removeTab(activeTabId);
    }
  };

  return (
    <div
      className="h-full w-full bg-background flex"
      style={{
        margin: '-2rem',
        width: 'calc(100% + 4rem)',
        height: 'calc(100% + 4rem)',
      }}
    >
      {/* Terminal area */}
      <div className="flex-1 relative">
        {activeSessionId ? (
          <Terminal
            key={activeSessionId}
            ref={terminalRef}
            sessionId={activeSessionId}
            onClose={handleTerminalClose}
          />
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

        {/* Drawer toggle button */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="absolute top-2 right-2 p-2 rounded bg-background-light/80 backdrop-blur
            text-text-secondary hover:text-text-primary hover:bg-background-lighter
            transition-colors z-10"
          title={isDrawerOpen ? 'Close drawer (Ctrl+Shift+F)' : 'Open drawer (Ctrl+Shift+F)'}
        >
          {isDrawerOpen ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Drawer */}
      <TerminalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        terminalRef={terminalRef}
      />
    </div>
  );
};
