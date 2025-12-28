import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTerminalStore } from '../store/terminalStore';
import Terminal, { TerminalHandle } from '../components/terminal/Terminal';
import { TerminalDrawer } from '../components/terminal/TerminalDrawer';
import { PanelRightOpen, PanelRightClose, Server } from 'lucide-react';

/**
 * TerminalPage - Terminal content area with sidebar drawer
 * Renders all terminal instances but hides inactive ones to preserve scrollback buffer
 */
export const TerminalPage: React.FC = () => {
  const { tabs, activeTabId, removeTab, connectingSessionId } = useTerminalStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const terminalRefs = useRef<Map<string, TerminalHandle>>(new Map());

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeSessionId = activeTab?.sessionId;
  const isConnecting = !!connectingSessionId;

  // Get unique session IDs from all tabs
  const uniqueSessionIds = [...new Set(tabs.map((t) => t.sessionId))];

  // Callback ref to store terminal handles
  const setTerminalRef = useCallback((sessionId: string, handle: TerminalHandle | null) => {
    if (handle) {
      terminalRefs.current.set(sessionId, handle);
    } else {
      terminalRefs.current.delete(sessionId);
    }
  }, []);

  // Get the active terminal handle for the drawer
  const activeTerminalRef = activeSessionId ? terminalRefs.current.get(activeSessionId) : null;

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

  return (
    <div
      className="h-full w-full bg-background flex overflow-hidden"
      style={{
        margin: '-2rem',
        width: 'calc(100% + 4rem)',
        height: 'calc(100% + 4rem)',
      }}
    >
      {/* Terminal area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Connecting animation overlay */}
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-background">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Server className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-text-primary font-medium">Connecting...</p>
                <p className="text-text-muted text-sm">Establishing SSH connection</p>
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Render ALL terminal instances, hide inactive ones to preserve scrollback */}
        {uniqueSessionIds.map((sessionId) => (
          <div
            key={sessionId}
            className="absolute inset-0"
            style={{ display: sessionId === activeSessionId && !isConnecting ? 'block' : 'none' }}
          >
            <Terminal
              ref={(handle) => setTerminalRef(sessionId, handle)}
              sessionId={sessionId}
              onClose={() => {
                const tab = tabs.find((t) => t.sessionId === sessionId);
                if (tab) removeTab(tab.id);
              }}
            />
          </div>
        ))}

        {/* Empty state when no terminals */}
        {uniqueSessionIds.length === 0 && !isConnecting && (
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
        {!isConnecting && (
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
        )}
      </div>

      {/* Drawer */}
      <TerminalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        terminalRef={{ current: activeTerminalRef ?? null }}
      />
    </div>
  );
};
