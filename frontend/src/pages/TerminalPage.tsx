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
  const { tabs, activeTabId, removeTab, connectingSessionId, createLocalTerminal, sessions } = useTerminalStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const terminalRefs = useRef<Map<string, TerminalHandle>>(new Map());

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeSessionId = activeTab?.sessionId;
  const isConnecting = !!connectingSessionId;

  // Get all session IDs from the sessions store
  const allSessionIds = Array.from(sessions.keys());

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

  // Initialize with one default local terminal if no tabs exist
  useEffect(() => {
    if (tabs.length === 0) {
      createLocalTerminal().catch((error) => {
        console.error('Failed to initialize default terminal:', error);
      });
    }
  }, [tabs.length, createLocalTerminal]);

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
    <div className="h-full bg-background relative overflow-hidden -m-8">
      {/* Terminal area */}
      <div className="absolute inset-0">
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
        {allSessionIds.map((sessionId) => (
          <div
            key={sessionId}
            className="absolute inset-0"
            style={{
              display: sessionId === activeSessionId && !isConnecting ? 'block' : 'none',
              right: isDrawerOpen ? '288px' : '0px', // 288px = w-72 (18rem = 288px)
              transition: 'right 0.2s ease-in-out'
            }}
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

        {/* Fallback empty state (should rarely be seen due to auto-initialization) */}
        {allSessionIds.length === 0 && !isConnecting && (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-xs text-text-muted/70">
                Initializing terminal...
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
            style={{
              right: isDrawerOpen ? '290px' : '8px', // Account for drawer width + padding
              transition: 'right 0.2s ease-in-out'
            }}
          >
            {isDrawerOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Drawer - absolutely positioned */}
      <TerminalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        terminalRef={{ current: activeTerminalRef ?? null }}
      />
    </div>
  );
};
