import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  TerminalSession,
  TerminalTab,
  LayoutNode,
  TerminalPane,
  SplitOrientation,
  SessionType,
  SessionMetadata,
  SessionState,
  TerminalClosedEvent,
} from "../types/terminal";
import {
  CreateLocalTerminal,
  CreateSSHTerminal,
  DuplicateTerminal,
  CloseTerminal,
  GetTerminalMetadata,
  ReconnectTerminal,
} from "../../wailsjs/go/main/App";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import { destroyTerminalInstance } from "../components/terminal/Terminal";

// Check if Wails bindings are available
const isWailsAvailable = (): boolean => {
  return typeof window !== "undefined" && window.go?.main?.App;
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
  updateSessionMetadata: (
    sessionId: string,
    metadata: Partial<SessionMetadata>
  ) => void;
  updateSessionState: (sessionId: string, state: SessionState) => void;

  // Tab management
  addTab: (tab: TerminalTab) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  duplicateTab: (tabId: string) => Promise<void>;

  // Layout management
  splitPane: (
    paneId: string,
    orientation: SplitOrientation,
    newSessionId: string
  ) => void;
  closePane: (paneId: string) => void;
  updatePaneSizes: (splitId: string, sizes: number[]) => void;

  // Terminal operations
  createLocalTerminal: (shell?: string, cwd?: string) => Promise<string>;
  createSSHTerminal: (
    host: string,
    port: number,
    username: string,
    password: string,
    privateKey?: string,
    name?: string
  ) => Promise<string>;
  createQuickSSHTerminal: (
    username: string,
    host: string,
    port: number,
    password?: string
  ) => Promise<string>;
  closeTerminal: (sessionId: string) => Promise<void>;
  reconnectTerminal: (
    sessionId: string,
    host: string,
    port: number,
    username: string,
    password: string,
    privateKey?: string
  ) => Promise<void>;
  setConnecting: (sessionId: string | null) => void;

  // Cleanup
  reset: () => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  // Initial state
  sessions: new Map(),
  tabs: [],
  activeTabId: null,
  layout: { id: "root", sessionId: "" } as TerminalPane,
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
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    console.log("[TERM] Removing tab:", tabId, "session:", tab.sessionId);
    
    // Check if this is a local terminal
    const session = state.sessions.get(tab.sessionId);
    const isLocalTerminal = session?.type === SessionType.Local;
    
    const newTabs = state.tabs.filter((t) => t.id !== tabId);

    // Destroy the terminal instance when tab is closed
    console.log("[TERM] Destroying terminal instance for session:", tab.sessionId);
    destroyTerminalInstance(tab.sessionId);

    // Close the backend session (this is safe to call even if already closed)
    if (isWailsAvailable()) {
      console.log("[TERM] Calling CloseTerminal on backend for session:", tab.sessionId);
      CloseTerminal(tab.sessionId)
        .then(() => {
          console.log("[TERM] Backend session closed successfully:", tab.sessionId);
        })
        .catch((err) => {
          console.log("[TERM] Backend session already closed or error:", tab.sessionId, err);
        });
    } else {
      console.warn("[TERM] Wails not available, skipping backend CloseTerminal call");
    }

    // Remove session from store
    console.log("[TERM] Removing session from store:", tab.sessionId);
    get().removeSession(tab.sessionId);

    // Update active tab if needed
    let newActiveTabId = state.activeTabId;
    if (tabId === state.activeTabId && newTabs.length > 0) {
      const currentIndex = state.tabs.findIndex((t) => t.id === tabId);
      const nextTab = newTabs[Math.min(currentIndex, newTabs.length - 1)];
      newActiveTabId = nextTab.id;
    } else if (newTabs.length === 0) {
      newActiveTabId = null;
    }

    set({ tabs: newTabs, activeTabId: newActiveTabId });

    // If this was the last tab (of any type), navigate to HOME
    if (newTabs.length === 0) {
      // Check if we're currently on the terminal page
      const currentPath = window.location.pathname;
      if (currentPath === '/terminal' || currentPath.startsWith('/terminal')) {
        // Use a small delay to ensure state is updated
        setTimeout(() => {
          // Dispatch a custom event that can be listened to by the router
          window.dispatchEvent(new CustomEvent('navigate-to-home'));
        }, 100);
      }
    }
  },

  setActiveTab: (tabId) => {
    console.log("[TERM] Switching to tab:", tabId);
    set({ activeTabId: tabId });
  },

  updateTabTitle: (tabId, title) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
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
      console.error("Wails backend not available for duplicating terminal");
      return;
    }
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const originalSession = state.sessions.get(tab.sessionId);
    if (!originalSession) return;

    try {
      // Count existing duplicates to generate next number
      const baseTitle = originalSession.title.replace(/ #\d+$/, ""); // Remove existing number if any
      const duplicateCount = state.tabs.filter((t) => {
        const session = state.sessions.get(t.sessionId);
        return session?.title.startsWith(baseTitle);
      }).length;
      const newTitle = `${baseTitle} #${duplicateCount + 1}`;

      if (originalSession.type === SessionType.SSH) {
        // For SSH, create a new connection with the same credentials
        const sshConfig = originalSession.metadata.sshConfig;
        if (!sshConfig) {
          console.error("SSH config not found for session, cannot duplicate");
          return;
        }

        // Use createSSHTerminal which handles the connecting overlay
        await get().createSSHTerminal(
          sshConfig.host,
          sshConfig.port,
          sshConfig.username,
          sshConfig.password,
          sshConfig.privateKey || "",
          newTitle
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
          title: newTitle,
        };

        get().addTab(newTab);
      }
    } catch (error) {
      console.error("Failed to duplicate terminal:", error);
    }
  },

  // Layout management
  splitPane: (paneId, orientation, newSessionId) => {
    // TODO: Implement split pane logic
    console.log("Split pane:", paneId, orientation, newSessionId);
  },

  closePane: (paneId) => {
    // TODO: Implement close pane logic
    console.log("Close pane:", paneId);
  },

  updatePaneSizes: (splitId, sizes) => {
    // TODO: Implement update pane sizes logic
    console.log("Update pane sizes:", splitId, sizes);
  },

  // Terminal operations
  createLocalTerminal: async (shell = "", cwd = "") => {
    if (!isWailsAvailable()) {
      throw new Error(
        "Wails backend not available. Please restart the application."
      );
    }
    try {
      const sessionId = await CreateLocalTerminal(shell, cwd, {});

      const session: TerminalSession = {
        id: sessionId,
        type: SessionType.Local,
        metadata: {
          workingDirectory: cwd,
          shell: shell || "powershell",
          environment: {},
          createdAt: new Date().toISOString(),
          state: SessionState.Active,
        },
        title: "Local Terminal",
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
      console.error("Failed to create local terminal:", error);
      throw error;
    }
  },

  createSSHTerminal: async (
    host,
    port,
    username,
    password,
    privateKey = "",
    name = ""
  ) => {
    if (!isWailsAvailable()) {
      throw new Error(
        "Wails backend not available. Please restart the application."
      );
    }
    const tempId = `connecting-${uuid()}`;
    set({ connectingSessionId: tempId });
    console.log("[TERM] Creating SSH terminal:", {
      host,
      port,
      username,
      name,
    });

    try {
      const sessionId = await CreateSSHTerminal(
        host,
        port,
        username,
        password,
        privateKey
      );
      console.log("[TERM] SSH terminal created with session ID:", sessionId);

      const session: TerminalSession = {
        id: sessionId,
        type: SessionType.SSH,
        metadata: {
          workingDirectory: "",
          shell: "remote-shell",
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
      console.error("[TERM] Failed to create SSH terminal:", error);
      throw error;
    }
  },

  createQuickSSHTerminal: async (username, host, port, password = "") => {
    if (!isWailsAvailable()) {
      throw new Error(
        "Wails backend not available. Please restart the application."
      );
    }
    console.log("[TERM] Creating quick SSH terminal:", {
      host,
      port,
      username,
    });

    try {
      const sessionId = await CreateSSHTerminal(
        host,
        port,
        username,
        password,
        ""
      );
      console.log(
        "[TERM] Quick SSH terminal created with session ID:",
        sessionId
      );

      const session: TerminalSession = {
        id: sessionId,
        type: SessionType.SSH,
        metadata: {
          workingDirectory: "",
          shell: "remote-shell",
          environment: {},
          createdAt: new Date().toISOString(),
          state: SessionState.Active,
          sshConfig: {
            host,
            port,
            username,
            password,
            privateKey: undefined,
          },
        },
        title: `SSH: ${username}@${host}`,
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
      console.error("[TERM] Failed to create quick SSH terminal:", error);
      throw error;
    }
  },

  setConnecting: (sessionId) => {
    set({ connectingSessionId: sessionId });
  },

  closeTerminal: async (sessionId) => {
    if (!isWailsAvailable()) {
      console.warn(
        "Wails backend not available, removing session from state only"
      );
      get().removeSession(sessionId);
      return;
    }
    try {
      await CloseTerminal(sessionId);
      get().removeSession(sessionId);
    } catch (error) {
      console.error("Failed to close terminal:", error);
    }
  },

  reconnectTerminal: async (
    sessionId,
    host,
    port,
    username,
    password,
    privateKey = ""
  ) => {
    if (!isWailsAvailable()) {
      throw new Error(
        "Wails backend not available. Please restart the application."
      );
    }
    try {
      await ReconnectTerminal(
        sessionId,
        host,
        port,
        username,
        password,
        privateKey
      );
      get().updateSessionState(sessionId, SessionState.Active);
    } catch (error) {
      console.error("Failed to reconnect terminal:", error);
      throw error;
    }
  },

  reset: () => {
    // Cleanup all terminal instances before resetting state
    import('../components/terminal/Terminal').then(({ cleanupAllTerminalInstances }) => {
      cleanupAllTerminalInstances();
    }).catch(console.error);

    set({
      sessions: new Map(),
      tabs: [],
      activeTabId: null,
      layout: { id: "root", sessionId: "" } as TerminalPane,
    });
  },
}));

// Initialize global event listeners
if (typeof window !== "undefined") {
  // Delay event registration to ensure Wails runtime is ready
  const setupEventListeners = () => {
    // Check if Wails runtime is available
    if (typeof window.go === "undefined" || typeof EventsOn !== "function") {
      console.log("[TERM] Wails runtime not ready yet, retrying in 100ms...");
      setTimeout(setupEventListeners, 100);
      return;
    }
    
    console.log("[TERM] Setting up terminal event listeners");
    EventsOn("terminal:closed", (event: TerminalClosedEvent) => {
      console.log("[TERM] Received terminal:closed event for session:", event.SessionID);
      const state = useTerminalStore.getState();
      
      // Find all tabs using this sessionId
      const tabsToClose = state.tabs.filter(t => t.sessionId === event.SessionID);
      
      if (tabsToClose.length > 0) {
        console.log(`[TERM] Closing ${tabsToClose.length} tabs for session:`, event.SessionID);
        tabsToClose.forEach(tab => {
          state.removeTab(tab.id);
        });
      } else {
        console.log("[TERM] No tabs found for closed session:", event.SessionID);
        // Still cleanup session if it exists but has no tabs
        if (state.sessions.has(event.SessionID)) {
          state.removeSession(event.SessionID);
          destroyTerminalInstance(event.SessionID);
        }
      }
    });
  };
  
  // Start trying to set up event listeners
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupEventListeners);
  } else {
    setupEventListeners();
  }
}

// Selectors
export const useActiveSession = () =>
  useTerminalStore((state) => {
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    return activeTab ? state.sessions.get(activeTab.sessionId) : null;
  });
