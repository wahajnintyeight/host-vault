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
} from '../types/terminal';
import {
  CreateLocalTerminal,
  CreateSSHTerminal,
  DuplicateTerminal,
  CloseTerminal,
  GetTerminalMetadata,
} from '../../wailsjs/go/main/App';

interface TerminalStore {
  // State
  sessions: Map<string, TerminalSession>;
  tabs: TerminalTab[];
  activeTabId: string | null;
  layout: LayoutNode;

  // Session management
  addSession: (session: TerminalSession) => void;
  removeSession: (sessionId: string) => void;
  updateSessionMetadata: (sessionId: string, metadata: Partial<SessionMetadata>) => void;

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
  createSSHTerminal: (host: string, port: number, username: string, password: string, privateKey?: string) => Promise<string>;
  closeTerminal: (sessionId: string) => Promise<void>;

  // Cleanup
  reset: () => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  // Initial state
  sessions: new Map(),
  tabs: [],
  activeTabId: null,
  layout: { id: 'root', sessionId: '' } as TerminalPane,

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

  // Tab management
  addTab: (tab) => {
    set((state) => {
      const tabs = state.tabs.map(t => ({ ...t, isActive: false }));
      return {
        tabs: [...tabs, { ...tab, isActive: true }],
        activeTabId: tab.id,
      };
    });
  },

  removeTab: (tabId) => {
    const state = get();
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const newTabs = state.tabs.filter(t => t.id !== tabId);
    
    // Check if no more tabs reference this session
    const hasOtherReferences = newTabs.some(t => t.sessionId === tab.sessionId);
    
    if (!hasOtherReferences) {
      get().closeTerminal(tab.sessionId);
    }

    // Update active tab if needed
    let newActiveTabId = state.activeTabId;
    if (tab.isActive && newTabs.length > 0) {
      const currentIndex = state.tabs.findIndex(t => t.id === tabId);
      const nextTab = newTabs[Math.min(currentIndex, newTabs.length - 1)];
      newActiveTabId = nextTab.id;
      newTabs.forEach(t => {
        t.isActive = t.id === newActiveTabId;
      });
    } else if (newTabs.length === 0) {
      newActiveTabId = null;
    }

    set({ tabs: newTabs, activeTabId: newActiveTabId });
  },

  setActiveTab: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map(t => ({ ...t, isActive: t.id === tabId })),
      activeTabId: tabId,
    }));
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
    const state = get();
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      const newSessionId = await DuplicateTerminal(tab.sessionId);
      const originalSession = state.sessions.get(tab.sessionId);
      
      if (!originalSession) return;

      const newSession: TerminalSession = {
        ...originalSession,
        id: newSessionId,
        metadata: { ...originalSession.metadata },
      };

      get().addSession(newSession);

      const newTab: TerminalTab = {
        id: uuid(),
        sessionId: newSessionId,
        title: `${originalSession.title} (Copy)`,
        isActive: true,
      };

      get().addTab(newTab);
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
        },
        title: 'Local Terminal',
      };

      get().addSession(session);

      const tab: TerminalTab = {
        id: uuid(),
        sessionId,
        title: session.title,
        isActive: true,
      };

      get().addTab(tab);
      
      return sessionId;
    } catch (error) {
      console.error('Failed to create local terminal:', error);
      throw error;
    }
  },

  createSSHTerminal: async (host, port, username, password, privateKey = '') => {
    try {
      const sessionId = await CreateSSHTerminal(host, port, username, password, privateKey);

      const session: TerminalSession = {
        id: sessionId,
        type: SessionType.SSH,
        metadata: {
          workingDirectory: '',
          shell: 'remote-shell',
          environment: {},
          createdAt: new Date().toISOString(),
        },
        title: `SSH: ${username}@${host}`,
      };

      get().addSession(session);

      const tab: TerminalTab = {
        id: uuid(),
        sessionId,
        title: session.title,
        isActive: true,
      };

      get().addTab(tab);
      
      return sessionId;
    } catch (error) {
      console.error('Failed to create SSH terminal:', error);
      throw error;
    }
  },

  closeTerminal: async (sessionId) => {
    try {
      await CloseTerminal(sessionId);
      get().removeSession(sessionId);
    } catch (error) {
      console.error('Failed to close terminal:', error);
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
