import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTerminalStore } from '../store/terminalStore';
import Terminal, { TerminalHandle } from '../components/terminal/Terminal';
import { PanelRightOpen, PanelRightClose, Server } from 'lucide-react';
import { TerminalDrawer } from '../components/terminal/TerminalDrawer';
import { ROUTES } from '../lib/constants';
import { getActiveSessionId } from '../lib/terminalUtils';

/**
 * Memoized terminal wrapper to prevent re-renders when switching tabs
 * Only re-renders when isActive or isDrawerOpen changes for THIS terminal
 */
interface TerminalWrapperProps {
  sessionId: string;
  isActive: boolean;
  isDrawerOpen: boolean;
  onTerminalRef: (sessionId: string, handle: TerminalHandle | null) => void;
}

const TerminalWrapper = memo<TerminalWrapperProps>(({ sessionId, isActive, isDrawerOpen, onTerminalRef }) => {
  // Get store actions directly - these are stable references
  const store = useTerminalStore;

  const handleRef = useCallback((handle: TerminalHandle | null) => {
    onTerminalRef(sessionId, handle);
  }, [sessionId, onTerminalRef]);

  return (
    <div
      className="absolute inset-0"
      style={{
        visibility: isActive ? 'visible' : 'hidden',
        pointerEvents: isActive ? 'auto' : 'none',
        right: isDrawerOpen ? '288px' : '0px',
        transition: 'right 0.2s ease-in-out'
      }}
    >
      <Terminal
        ref={handleRef}
        sessionId={sessionId}
        isVisible={isActive}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props change
  return (
    prevProps.sessionId === nextProps.sessionId &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isDrawerOpen === nextProps.isDrawerOpen
  );
});

TerminalWrapper.displayName = 'TerminalWrapper';

/**
 * TerminalPage - Terminal content area with sidebar drawer
 * Renders all terminal instances but hides inactive ones to preserve scrollback buffer
 */
export const TerminalPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Use shallow selectors to prevent unnecessary re-renders
  const tabs = useTerminalStore((state) => state.tabs);
  const activeTabId = useTerminalStore((state) => state.activeTabId);
  const connectingSessionId = useTerminalStore((state) => state.connectingSessionId);
  const createLocalTerminal = useTerminalStore((state) => state.createLocalTerminal);
  // Get session IDs as a stable array - only changes when sessions are added/removed
  const sessionIds = useTerminalStore((state) => Array.from(state.sessions.keys()));
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const terminalRefs = useRef<Map<string, TerminalHandle>>(new Map());

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeSessionId = activeTab ? getActiveSessionId(activeTab) : null;
  const isConnecting = !!connectingSessionId;

  // Memoize session IDs to prevent re-renders when the array content hasn't changed
  const allSessionIds = useMemo(() => sessionIds, [sessionIds.join(',')]);

  // Stable callback ref handler
  const handleTerminalRef = useCallback((sessionId: string, handle: TerminalHandle | null) => {
    if (handle) {
      terminalRefs.current.set(sessionId, handle);
    } else {
      terminalRefs.current.delete(sessionId);
    }
  }, []);

  // Get the active terminal handle for the drawer
  const activeTerminalRef = activeSessionId ? terminalRefs.current.get(activeSessionId) : null;

  // Listen for navigate-to-home event (when last local terminal closes)
  useEffect(() => {
    const handleNavigateToHome = () => {
      navigate(ROUTES.HOME);
    };

    window.addEventListener('navigate-to-home', handleNavigateToHome);
    return () => {
      window.removeEventListener('navigate-to-home', handleNavigateToHome);
    };
  }, [navigate]);

  // Removed automatic terminal creation - will navigate to home instead when last tab closes

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

        {/* Render ALL terminal instances, hide inactive ones with visibility to preserve scrollback */}
        {allSessionIds.map((sessionId) => (
          <TerminalWrapper
            key={sessionId}
            sessionId={sessionId}
            isActive={sessionId === activeSessionId && !isConnecting}
            isDrawerOpen={isDrawerOpen}
            onTerminalRef={handleTerminalRef}
          />
        ))}

        {/* No terminals open - will auto-redirect to home */}
        {allSessionIds.length === 0 && !isConnecting && (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <p className="text-sm text-text-muted/70">
                No active terminals
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
