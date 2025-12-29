import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import {
  TerminalSession,
  TerminalTab,
  LayoutNode,
  TerminalPane,
  SplitOrientation,
  SessionType,
  SessionMetadata,
  SessionState,
} from '../types/terminal';
import {
  CreateLocalTerminal,
  CreateSSHTerminal,
  DuplicateTerminal,
  CloseTerminal,
  GetTerminalMetadata,
  ReconnectTerminal,
} from '../../wailsjs/go/main/App';
import { destroyTerminalInstance } from '../components/terminal/Terminal';

// Check if Wails bindings are available
const isWailsAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.go?.main?.App;
};

interface TerminalStore {
  // State
  sessions: Map<string, TerminalSession>;
  tabs: TerminalTab[];
  activeTabId: string | null;
  layout: LayoutNode;
  connectingSessionId: string | null;

  // Session management
  addSession: (session: TerminalSession) => void;
  removeSession: (sessionId: string) => void;
  updateSessionMetadata: (sessionId: string, metadata: Partial<SessionMetadata>) => void;
  updateSessionState: (sessionId: string, state: SessionState) => void;

  // Tab management
  addTab: (tab: TerminalTab) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  duplicateTab: (tabId: string) => Promise<void>;

  // Layout management
  splitPane: (paneId: string, orientation: SplitOrientation, newSessionId: string) => void;
  closePane: (paneId: string) => void;
  updatePaneSizes: (splitId: string, sizes: number[]) => void;

  // Terminal operations
  createLocalTerminal: (shell?: string, cwd?: string) => Promise<string>;
  createSSHTerminal: (host: string, port: number, username: string, password: string, privateKey?: string, name?: string) => Promise<string>;
  closeTerminal: (sessionId: string) => Promise<void>;
  reconnectTerminal: (sessionId: string, host: string, port: number, username: string, password: string, privateKey?: string) => Promise<void>;
  setConnecting: (sessionId: string | null) => void;

  // Cleanup
  reset: () => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  // Initial state
  sessions: new Map(),
  tabs: [],
  activeTabId: null,
  layout: { id: 'root', sessionId: '' } as TerminalPane,
  connectingSessionId: null,

  // Session management
  addSession: (session) => {
    set((state) => ({
      sessions: new Map(state.sessions).set(session.id, session),
    }));
  },

  removeSession: (sessionId) => {
    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.delete(sessionId);
      return { sessions };
    });
  },

  updateSessionMetadata: (sessionId, metadata) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const sessions = new Map(state.sessions);
      sessions.set(sessionId, {
        ...session,
        metadata: { ...session.metadata, ...metadata },
      });
      return { sessions };
    });
  },

  updateSessionState: (sessionId, sessionState) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const sessions = new Map(state.sessions);
      sessions.set(sessionId, {
        ...session,
        metadata: { ...session.metadata, state: sessionState },
      });
      return { ...state, sessions };
    });
  },

  // Tab management
  addTab: (tab) => {
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },

  removeTab: (tabId) => {
    const state = get();
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    console.log('[TERM] Removing tab:', tabId, 'session:', tab.sessionId);
    const newTabs = state.tabs.filter(t => t.id !== tabId);

    // Destroy the terminal instance when tab is closed
    destroyTerminalInstance(tab.sessionId);

    // Update active tab if needed
    let newActiveTabId = state.activeTabId;
    if (tabId === state.activeTabId && newTabs.length > 0) {
      const currentIndex = state.tabs.findIndex(t => t.id === tabId);
      const nextTab = newTabs[Math.min(currentIndex, newTabs.length - 1)];
      newActiveTabId = nextTab.id;
    } else if (newTabs.length === 0) {
      newActiveTabId = null;
    }

    set({ tabs: newTabs, activeTabId: newActiveTabId });
  },

  setActiveTab: (tabId) => {
    console.log('[TERM] Switching to tab:', tabId);
    set({ activeTabId: tabId });
  },

  updateTabTitle: (tabId, title) => {
    set((state) => ({
      tabs: state.tabs.map(t => t.id === tabId ? { ...t, title } : t),
    }));
  },

  reorderTabs: (fromIndex, toIndex) => {
    set((state) => {
      const tabs = [...state.tabs];
      const [removed] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, removed);
      return { tabs };
    });
  },

  duplicateTab: async (tabId) => {
    if (!isWailsAvailable()) {
      console.error('Wails backend not available for duplicating terminal');
      return;
    }
    const state = get();
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const originalSession = state.sessions.get(tab.sessionId);
    if (!originalSession) return;

    try {
      if (originalSession.type === SessionType.SSH) {
        // For SSH, create a new connection with the same credentials
        const sshConfig = originalSession.metadata.sshConfig;
        if (!sshConfig) {
          console.error('SSH config not found for session, cannot duplicate');
          return;
        }
        
        // Use createSSHTerminal which handles the connecting overlay
        await get().createSSHTerminal(
          sshConfig.host,
          sshConfig.port,
          sshConfig.username,
          sshConfig.password,
          sshConfig.privateKey || '',
          `${originalSession.title} (Copy)`
        );
      } else {
        // For local terminals, use the backend duplicate
        const newSessionId = await DuplicateTerminal(tab.sessionId);

        const newSession: TerminalSession = {
          ...originalSession,
          id: newSessionId,
          metadata: { ...originalSession.metadata, state: SessionState.Active },
        };

        get().addSession(newSession);

        const newTab: TerminalTab = {
          id: uuid(),
          sessionId: newSessionId,
          title: `${originalSession.title} (Copy)`,
        };

        get().addTab(newTab);
      }
    } catch (error) {
      console.error('Failed to duplicate terminal:', error);
    }
  },

  // Layout management
  splitPane: (paneId, orientation, newSessionId) => {
    // TODO: Implement split pane logic
    console.log('Split pane:', paneId, orientation, newSessionId);
  },

  closePane: (paneId) => {
    // TODO: Implement close pane logic
    console.log('Close pane:', paneId);
  },

  updatePaneSizes: (splitId, sizes) => {
    // TODO: Implement update pane sizes logic
    console.log('Update pane sizes:', splitId, sizes);
  },

  // Terminal operations
  createLocalTerminal: async (shell = '', cwd = '') => {
    if (!isWailsAvailable()) {
      throw new Error('Wails backend not available. Please restart the application.');
    }
    try {
      const sessionId = await CreateLocalTerminal(shell, cwd, {});

      const session: TerminalSession = {
        id: sessionId,
        type: SessionType.Local,
        metadata: {
          workingDirectory: cwd,
          shell: shell || 'powershell',
          environment: {},
          createdAt: new Date().toISOString(),
          state: SessionState.Active,
        },
        title: 'Local Terminal',
      };

      get().addSession(session);

      const tab: TerminalTab = {
        id: uuid(),
        sessionId,
        title: session.title,
      };

      get().addTab(tab);
      
      return sessionId;
    } catch (error) {
      console.error('Failed to create local terminal:', error);
      throw error;
    }
  },

  createSSHTerminal: async (host, port, username, password, privateKey = '', name = '') => {
    if (!isWailsAvailable()) {
      throw new Error('Wails backend not available. Please restart the application.');
    }
    const tempId = `connecting-${uuid()}`;
    set({ connectingSessionId: tempId });
    console.log('[TERM] Creating SSH terminal:', { host, port, username, name });

    try {
      const sessionId = await CreateSSHTerminal(host, port, username, password, privateKey);
      console.log('[TERM] SSH terminal created with session ID:', sessionId);

      const session: TerminalSession = {
        id: sessionId,
        type: SessionType.SSH,
        metadata: {
          workingDirectory: '',
          shell: 'remote-shell',
          environment: {},
          createdAt: new Date().toISOString(),
          state: SessionState.Active,
          // Store SSH config for duplication/reconnection
          sshConfig: {
            host,
            port,
            username,
            password,
            privateKey: privateKey || undefined,
          },
        },
        title: name || `SSH: ${username}@${host}`,
      };

      get().addSession(session);

      const tab: TerminalTab = {
        id: uuid(),
        sessionId,
        title: session.title,
      };

      get().addTab(tab);
      set({ connectingSessionId: null });

      return sessionId;
    } catch (error) {
      set({ connectingSessionId: null });
      console.error('[TERM] Failed to create SSH terminal:', error);
      throw error;
    }
  },

  setConnecting: (sessionId) => {
    set({ connectingSessionId: sessionId });
  },

  closeTerminal: async (sessionId) => {
    if (!isWailsAvailable()) {
      console.warn('Wails backend not available, removing session from state only');
      get().removeSession(sessionId);
      return;
    }
    try {
      await CloseTerminal(sessionId);
      get().removeSession(sessionId);
    } catch (error) {
      console.error('Failed to close terminal:', error);
    }
  },

  reconnectTerminal: async (sessionId, host, port, username, password, privateKey = '') => {
    if (!isWailsAvailable()) {
      throw new Error('Wails backend not available. Please restart the application.');
    }
    try {
      await ReconnectTerminal(sessionId, host, port, username, password, privateKey);
      get().updateSessionState(sessionId, SessionState.Active);
    } catch (error) {
      console.error('Failed to reconnect terminal:', error);
      throw error;
    }
  },

  reset: () => {
    set({
      sessions: new Map(),
      tabs: [],
      activeTabId: null,
      layout: { id: 'root', sessionId: '' } as TerminalPane,
    });
  },
}));

// Selectors
export const useActiveSession = () =>
  useTerminalStore((state) => {
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    return activeTab ? state.sessions.get(activeTab.sessionId) : null;
  });
