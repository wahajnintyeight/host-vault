import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  TerminalSession,
  TerminalTab,
  LayoutNode,
  TerminalPane,
  SplitPane,
  SplitOrientation,
  SessionType,
  SessionMetadata,
  SessionState,
  TerminalClosedEvent,
} from "../types/terminal";
import { Workspace, SerializedSession } from "../types/workspace";
import {
  createWorkspace,
  deserializeTab,
  updateWorkspaceTimestamp,
  getWorkspaceMetadata,
} from "../lib/workspaceSerializer";
import {
  loadWorkspacesFromStorage,
  saveWorkspacesToStorage,
} from "../lib/workspaceStorage";
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

// Helper to check layout node type
const isSplitPane = (node: LayoutNode): node is SplitPane => {
  return "panes" in node;
};

// Helper to recursively find a pane and its parent
const findPaneAndParent = (
  root: LayoutNode,
  targetId: string,
  parent: SplitPane | null = null
): { node: LayoutNode; parent: SplitPane | null } | null => {
  if (root.id === targetId) {
    return { node: root, parent };
  }
  if (isSplitPane(root)) {
    for (const child of root.panes) {
      const result = findPaneAndParent(child, targetId, root);
      if (result) return result;
    }
  }
  return null;
};

// Helper to replace a node in the layout tree
const replaceNodeInLayout = (
  root: LayoutNode,
  targetId: string,
  newNode: LayoutNode
): LayoutNode => {
  if (root.id === targetId) {
    return newNode;
  }
  if (isSplitPane(root)) {
    return {
      ...root,
      panes: root.panes.map((p) => replaceNodeInLayout(p, targetId, newNode)),
    };
  }
  return root;
};

// Helper to remove a node and simplify the tree
const removeNodeFromLayout = (root: LayoutNode, targetId: string): LayoutNode | null => {
  if (root.id === targetId) {
    return null;
  }
  if (isSplitPane(root)) {
    const newPanes = root.panes
      .map((p) => removeNodeFromLayout(p, targetId))
      .filter((p): p is LayoutNode => p !== null);

    if (newPanes.length === 0) return null;
    if (newPanes.length === 1) return newPanes[0]; // Collapse unnecessary split

    // Redistribute sizes if needed
    let newSizes = root.sizes;
    if (newSizes.length !== newPanes.length) {
      const size = 100 / newPanes.length;
      newSizes = newPanes.map(() => size);
    }

    return {
      ...root,
      panes: newPanes,
      sizes: newSizes,
    };
  }
  return root;
};

// Helper to get all session IDs from a layout
const getAllSessionIds = (node: LayoutNode): string[] => {
  if ("sessionId" in node) {
    return [node.sessionId];
  }
  return node.panes.flatMap(getAllSessionIds);
};

// Helper to get the first session ID (for focus)
const getFirstSessionId = (node: LayoutNode): string | null => {
  if ("sessionId" in node) {
    return node.sessionId;
  }
  if (node.panes.length > 0) {
    return getFirstSessionId(node.panes[0]);
  }
  return null;
};

interface TerminalStore {
  // State
  sessions: Map<string, TerminalSession>;
  tabs: TerminalTab[];
  activeTabId: string | null;
  activePaneId: string | null; // Track focused pane globally
  connectingSessionId: string | null;
  workspaces: Workspace[]; // Saved workspaces

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
  setActivePane: (paneId: string) => void; // Set active pane (and implicitly active tab)
  updateTabTitle: (tabId: string, title: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  duplicateTab: (tabId: string) => Promise<void>;

  // Layout management
  splitPane: (
    tabId: string,
    targetPaneId: string,
    orientation: SplitOrientation,
    newSessionId: string
  ) => void;
  mergeTabs: (
    sourceTabId: string,
    targetTabId: string,
    targetPaneId: string,
    direction: 'top' | 'bottom' | 'left' | 'right'
  ) => void;
  closePane: (tabId: string, paneId: string, skipBackendCall?: boolean) => void;
  updatePaneSizes: (tabId: string, splitId: string, sizes: number[]) => void;
  extractPaneToNewTab: (sourceTabId: string, paneId: string) => void;
  movePaneToPane: (
    sourceTabId: string,
    sourcePaneId: string,
    targetTabId: string,
    targetPaneId: string,
    direction: 'top' | 'bottom' | 'left' | 'right'
  ) => void;

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

  // Workspace management
  saveWorkspace: (name: string, description?: string) => Workspace;
  loadWorkspace: (workspaceId: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => void;
  updateWorkspace: (workspaceId: string, name: string, description?: string) => void;
  getWorkspaces: () => Workspace[];

  // Cleanup
  reset: () => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  // Initial state
  sessions: new Map(),
  tabs: [],
  activeTabId: null,
  activePaneId: null,
  connectingSessionId: null,
  workspaces: loadWorkspacesFromStorage(),

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
    set((state) => {
      // Auto-set active pane if it's the first tab or we want to focus it
      const firstSessionId = getFirstSessionId(tab.layout);
      const activePaneId = firstSessionId 
        ? (tab.layout as TerminalPane).id // Assuming simple layout for new tabs
        : state.activePaneId;

      return {
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
        activePaneId: firstSessionId ? (tab.layout as TerminalPane).id : state.activePaneId
      };
    });
  },

  removeTab: (tabId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    console.log("[TERM] Removing tab:", tabId);
    
    // Find all sessions in this tab's layout
    const sessionIds = getAllSessionIds(tab.layout);
    
    // Remove all sessions
    sessionIds.forEach(sessionId => {
        console.log("[TERM] Destroying terminal instance for session:", sessionId);
        destroyTerminalInstance(sessionId);

        // Close backend session
        if (isWailsAvailable()) {
            CloseTerminal(sessionId).catch(console.error);
        }

        get().removeSession(sessionId);
    });

    const newTabs = state.tabs.filter((t) => t.id !== tabId);

    // Update active tab if needed
    let newActiveTabId = state.activeTabId;
    let newActivePaneId = state.activePaneId;

    if (tabId === state.activeTabId && newTabs.length > 0) {
      const currentIndex = state.tabs.findIndex((t) => t.id === tabId);
      const nextTab = newTabs[Math.min(currentIndex, newTabs.length - 1)];
      newActiveTabId = nextTab.id;
      // Focus first pane of new active tab
      const firstSession = getFirstSessionId(nextTab.layout);
      if (firstSession) {
          // We need the pane ID, not session ID. But for simple layouts they might be linked.
          // Wait, getFirstSessionId returns sessionId. We need pane ID.
          // Let's assume for now we just find the pane with that session.
          // Ideally we should store activePaneId.
          // For simplicity, finding the first pane in the layout:
          const findFirstPane = (node: LayoutNode): string | null => {
              if ("sessionId" in node) return node.id;
              return node.panes.length > 0 ? findFirstPane(node.panes[0]) : null;
          };
          newActivePaneId = findFirstPane(nextTab.layout);
      }
    } else if (newTabs.length === 0) {
      newActiveTabId = null;
      newActivePaneId = null;
    }

    set({ tabs: newTabs, activeTabId: newActiveTabId, activePaneId: newActivePaneId });

    if (newTabs.length === 0) {
      const currentPath = window.location.pathname;
      if (currentPath === '/terminal' || currentPath.startsWith('/terminal')) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigate-to-home'));
        }, 100);
      }
    }
  },

  setActiveTab: (tabId) => {
    const state = get();
    if (state.activeTabId === tabId) return;

    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // When switching tabs, focus the last active pane in that tab?
    // For now, focus the first pane found.
    // TODO: Store last active pane per tab.
    const findFirstPane = (node: LayoutNode): string | null => {
        if ("sessionId" in node) return node.id;
        return node.panes.length > 0 ? findFirstPane(node.panes[0]) : null;
    };
    const newActivePaneId = findFirstPane(tab.layout);

    set({ activeTabId: tabId, activePaneId: newActivePaneId });
  },

  setActivePane: (paneId) => {
      // Find which tab this pane belongs to
      const state = get();
      const tab = state.tabs.find(t => {
          const result = findPaneAndParent(t.layout, paneId);
          return result !== null;
      });

      if (tab) {
          set({ activeTabId: tab.id, activePaneId: paneId });
      }
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
    // Note: Duplicating complex layouts is hard. For now, only duplicate if it's a simple tab.
    // Or just duplicate the *sessions*?
    // Let's implement simple duplication first (single pane).
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    
    // Check if it's a simple layout
    if ("sessionId" in tab.layout) {
        const originalSession = state.sessions.get(tab.layout.sessionId);
        if (!originalSession) return;
        
        // ... (existing duplication logic adapted) ...
        // Re-using logic from createSSHTerminal/etc would be better but for now inline:
        
        try {
             // ... logic similar to before ...
             // Simplified for brevity:
             const newTitle = originalSession.title + " (Copy)";
             if (originalSession.type === SessionType.SSH && originalSession.metadata.sshConfig) {
                 await get().createSSHTerminal(
                     originalSession.metadata.sshConfig.host,
                     originalSession.metadata.sshConfig.port,
                     originalSession.metadata.sshConfig.username,
                     originalSession.metadata.sshConfig.password,
                     originalSession.metadata.sshConfig.privateKey,
                     newTitle
                 );
             } else {
                 const newSessionId = await DuplicateTerminal(originalSession.id);
                 const newSession: TerminalSession = {
                     ...originalSession,
                     id: newSessionId,
                     metadata: { ...originalSession.metadata, state: SessionState.Active },
                     title: newTitle
                 };
                 get().addSession(newSession);
                 
                 const newPane: TerminalPane = { id: uuid(), sessionId: newSessionId };
                 const newTab: TerminalTab = {
                     id: uuid(),
                     layout: newPane,
                     title: newTitle
                 };
                 get().addTab(newTab);
             }
        } catch (e) { console.error(e); }
    } else {
        console.warn("Duplicating split views not yet supported");
    }
  },

  // Layout management
  splitPane: (tabId, targetPaneId, orientation, newSessionId) => {
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (!tab) return state;

      const newPane: TerminalPane = { id: uuid(), sessionId: newSessionId };
      const splitPane: SplitPane = {
        id: uuid(),
        orientation,
        panes: [
             // Create a dummy node to represent the target, it will be replaced by findPaneAndParent logic?
             // No, we need to construct the split.
             // We need to replace targetPaneId in the tree with this SplitPane.
             // And putting targetPane INSIDE it.
             // But we need the original targetPane object.
             // We can find it.
             // Let's use replaceNodeInLayout logic but tailored.
             // Actually, we need to find the node first.
             // Since replaceNodeInLayout takes a replacement node, we need to construct it first.
        ] as any, // Placeholder
        sizes: [50, 50],
      };
      
      // We need to find the existing pane to put it into the split
      const result = findPaneAndParent(tab.layout, targetPaneId);
      if (!result) return state;
      
      const existingPane = result.node;
      
      splitPane.panes = [existingPane as LayoutNode, newPane];

      const newLayout = replaceNodeInLayout(tab.layout, targetPaneId, splitPane);

      return {
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, layout: newLayout } : t)),
        activePaneId: newPane.id // Focus the new pane
      };
    });
  },
  
  mergeTabs: (sourceTabId, targetTabId, targetPaneId, direction) => {
      set((state) => {
          const sourceTab = state.tabs.find(t => t.id === sourceTabId);
          const targetTab = state.tabs.find(t => t.id === targetTabId);
          
          if (!sourceTab || !targetTab || sourceTabId === targetTabId) return state;
          
          // Construct the new SplitPane
          // Determine orientation based on direction
          const orientation = (direction === 'left' || direction === 'right') 
            ? SplitOrientation.Vertical 
            : SplitOrientation.Horizontal;
            
          const isFirst = (direction === 'top' || direction === 'left');
          
          // Find target pane node to wrap
          const result = findPaneAndParent(targetTab.layout, targetPaneId);
          if (!result) return state;
          
          const targetNode = result.node;
          const sourceNode = sourceTab.layout;
          
          const newSplit: SplitPane = {
              id: uuid(),
              orientation,
              panes: isFirst ? [sourceNode, targetNode] : [targetNode, sourceNode],
              sizes: [50, 50]
          };
          
          const newLayout = replaceNodeInLayout(targetTab.layout, targetPaneId, newSplit);
          
          // Remove source tab and update target tab
          const newTabs = state.tabs
              .filter(t => t.id !== sourceTabId)
              .map(t => t.id === targetTabId ? { ...t, layout: newLayout } : t);
              
          return {
              tabs: newTabs,
              activeTabId: targetTabId,
              // Keep active pane or set to something useful?
              // If source tab was active, maybe focus its main pane?
              // Let's keep activePaneId as is (likely the drag source or drop target).
          };
      });
  },

  closePane: (tabId, paneId, skipBackendCall = false) => {
    set((state) => {
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab) return state;
        
        // Find the pane to get its session ID (to close it)
        const result = findPaneAndParent(tab.layout, paneId);
        if (result && "sessionId" in result.node) {
            const sessionId = result.node.sessionId;
            // Close the session (skip if already closed by backend)
            if (!skipBackendCall && isWailsAvailable()) {
                CloseTerminal(sessionId).catch(console.error);
            }
            // Destroy the terminal instance
            destroyTerminalInstance(sessionId);
        }

        const newLayout = removeNodeFromLayout(tab.layout, paneId);
        
        // If layout becomes null, remove the tab
        if (!newLayout) {
            // Call removeTab logic (but we are inside set, so we can't call get().removeTab easily without side effects)
            // Duplicate removal logic or use a robust way.
            // Simplest: just set tabs.
            const newTabs = state.tabs.filter(t => t.id !== tabId);
            return { tabs: newTabs, activeTabId: newTabs.length > 0 ? newTabs[0].id : null };
        }
        
        return {
            tabs: state.tabs.map(t => t.id === tabId ? { ...t, layout: newLayout } : t)
        };
    });
  },

  updatePaneSizes: (tabId, splitId, sizes) => {
      set((state) => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (!tab) return state;
          
          const updateSizesRecursive = (node: LayoutNode): LayoutNode => {
              if (node.id === splitId && "panes" in node) {
                  return { ...node, sizes };
              }
              if ("panes" in node) {
                  return { ...node, panes: node.panes.map(updateSizesRecursive) };
              }
              return node;
          };
          
          return {
              tabs: state.tabs.map(t => t.id === tabId ? { ...t, layout: updateSizesRecursive(t.layout) } : t)
          };
      });
  },

  extractPaneToNewTab: (sourceTabId, paneId) => {
    set((state) => {
      const sourceTab = state.tabs.find(t => t.id === sourceTabId);
      if (!sourceTab) return state;

      const result = findPaneAndParent(sourceTab.layout, paneId);
      if (!result || !('sessionId' in result.node)) return state;

      const pane = result.node as TerminalPane;
      const session = state.sessions.get(pane.sessionId);
      
      const newTab: TerminalTab = {
        id: uuid(),
        layout: { id: uuid(), sessionId: pane.sessionId },
        title: session?.title || 'Terminal',
      };

      const newSourceLayout = removeNodeFromLayout(sourceTab.layout, paneId);
      
      if (!newSourceLayout) {
        return {
          tabs: [newTab, ...state.tabs.filter(t => t.id !== sourceTabId)],
          activeTabId: newTab.id,
          activePaneId: newTab.layout.id,
        };
      }

      return {
        tabs: state.tabs.map(t => 
          t.id === sourceTabId 
            ? { ...t, layout: newSourceLayout }
            : t
        ).concat([newTab]),
        activeTabId: newTab.id,
        activePaneId: newTab.layout.id,
      };
    });
  },

  movePaneToPane: (sourceTabId, sourcePaneId, targetTabId, targetPaneId, direction) => {
    set((state) => {
      const sourceTab = state.tabs.find(t => t.id === sourceTabId);
      const targetTab = state.tabs.find(t => t.id === targetTabId);
      
      if (!sourceTab || !targetTab) return state;

      const sourceResult = findPaneAndParent(sourceTab.layout, sourcePaneId);
      if (!sourceResult || !('sessionId' in sourceResult.node)) return state;

      const sourcePane = sourceResult.node as TerminalPane;
      const targetResult = findPaneAndParent(targetTab.layout, targetPaneId);
      if (!targetResult) return state;

      const targetNode = targetResult.node;
      
      const orientation = (direction === 'left' || direction === 'right')
        ? SplitOrientation.Vertical
        : SplitOrientation.Horizontal;
        
      const isFirst = (direction === 'top' || direction === 'left');
      
      // If moving within the same tab, reuse the existing pane to preserve its identity
      // If moving to a different tab, create a new pane with the same session
      const movedPane: TerminalPane = sourceTabId === targetTabId 
        ? sourcePane 
        : { id: uuid(), sessionId: sourcePane.sessionId };
      
      const newSplit: SplitPane = {
        id: uuid(),
        orientation,
        panes: isFirst ? [movedPane, targetNode] : [targetNode, movedPane],
        sizes: [50, 50],
      };

      // First, remove the source pane from its current location
      const newSourceLayout = sourceTabId === targetTabId 
        ? removeNodeFromLayout(sourceTab.layout, sourcePaneId)
        : removeNodeFromLayout(sourceTab.layout, sourcePaneId);

      // Then, add it to the target location
      // If source and target are the same tab, we need to work with the updated layout
      const layoutToUpdate = sourceTabId === targetTabId ? newSourceLayout : targetTab.layout;
      
      if (!layoutToUpdate) {
        // Source layout became empty, just create new tab with the split
        return {
          tabs: state.tabs.filter(t => t.id !== sourceTabId).map(t => 
            t.id === targetTabId ? { ...t, layout: newSplit } : t
          ),
          activeTabId: targetTabId,
          activePaneId: movedPane.id,
        };
      }

      const newTargetLayout = replaceNodeInLayout(layoutToUpdate, targetPaneId, newSplit);

      let newTabs: TerminalTab[];
      
      if (sourceTabId === targetTabId) {
        // Moving within the same tab
        newTabs = state.tabs.map(t => 
          t.id === targetTabId ? { ...t, layout: newTargetLayout } : t
        );
      } else {
        // Moving between different tabs
        newTabs = state.tabs.map(t => {
          if (t.id === targetTabId) {
            return { ...t, layout: newTargetLayout };
          }
          if (t.id === sourceTabId) {
            if (!newSourceLayout) {
              return null;
            }
            return { ...t, layout: newSourceLayout };
          }
          return t;
        }).filter((t): t is TerminalTab => t !== null);

        // Remove source tab if it became empty
        if (!newSourceLayout) {
          newTabs = newTabs.filter(t => t.id !== sourceTabId);
        }
      }

      return {
        tabs: newTabs,
        activeTabId: targetTabId,
        activePaneId: movedPane.id,
      };
    });
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
      
      const paneId = uuid();
      const tab: TerminalTab = {
        id: uuid(),
        layout: { id: paneId, sessionId } as TerminalPane,
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

    try {
      const sessionId = await CreateSSHTerminal(
        host,
        port,
        username,
        password,
        privateKey
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
            privateKey: privateKey || undefined,
          },
        },
        title: name || `SSH: ${username}@${host}`,
      };

      get().addSession(session);

      const paneId = uuid();
      const tab: TerminalTab = {
        id: uuid(),
        layout: { id: paneId, sessionId } as TerminalPane,
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

    try {
      const sessionId = await CreateSSHTerminal(
        host,
        port,
        username,
        password,
        ""
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

      const paneId = uuid();
      const tab: TerminalTab = {
        id: uuid(),
        layout: { id: paneId, sessionId } as TerminalPane,
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
      // Find the tab and pane containing this session
      const state = get();
      let foundTabId: string | null = null;
      let foundPaneId: string | null = null;
      
      for (const tab of state.tabs) {
          const result = findPaneAndParent(tab.layout, "", null); // Not efficient searching blindly
          // Better: search specifically
          // Recursive find by sessionId
          const findBySession = (node: LayoutNode): TerminalPane | null => {
              if ("sessionId" in node && node.sessionId === sessionId) return node;
              if ("panes" in node) {
                  for (const p of node.panes) {
                      const f = findBySession(p);
                      if (f) return f;
                  }
              }
              return null;
          };
          const pane = findBySession(tab.layout);
          if (pane) {
              foundTabId = tab.id;
              foundPaneId = pane.id;
              break;
          }
      }
      
      if (foundTabId && foundPaneId) {
          get().closePane(foundTabId, foundPaneId);
      } else {
          // Just remove session if not in layout
           if (!isWailsAvailable()) {
              get().removeSession(sessionId);
              return;
            }
            try {
              await CloseTerminal(sessionId);
              get().removeSession(sessionId);
            } catch (error) {
              console.error("Failed to close terminal:", error);
            }
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

  // Workspace management
  saveWorkspace: (name, description) => {
    const state = get();
    
    console.log('[WORKSPACE] Saving workspace:', name);
    console.log('[WORKSPACE] Current tabs:', state.tabs.length);
    console.log('[WORKSPACE] Current sessions:', state.sessions.size);
    console.log('[WORKSPACE] Tabs data:', state.tabs.map(t => ({ id: t.id, title: t.title })));
    
    const workspace = createWorkspace(
      name,
      description,
      state.tabs,
      state.activeTabId,
      state.sessions
    );

    const newWorkspaces = [...state.workspaces, workspace];
    set({ workspaces: newWorkspaces });
    saveWorkspacesToStorage(newWorkspaces);

    console.log('[WORKSPACE] Saved workspace:', workspace.name, 'Total workspaces:', newWorkspaces.length);
    console.log('[WORKSPACE] Workspace tabs:', workspace.tabs.length);
    return workspace;
  },

  loadWorkspace: async (workspaceId) => {
    const state = get();
    const workspace = state.workspaces.find(w => w.id === workspaceId);
    
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    console.log('[WORKSPACE] Loading workspace:', workspace.name, 'with', workspace.tabs.length, 'tabs');

    // Close all existing tabs first
    const currentTabs = [...state.tabs];
    for (const tab of currentTabs) {
      get().removeTab(tab.id);
    }

    // Recreate tabs from workspace
    for (let i = 0; i < workspace.tabs.length; i++) {
      const serializedTab = workspace.tabs[i];
      const { tab, sessions: sessionConfigs } = deserializeTab(serializedTab);

      // Create sessions and build session ID mapping
      const sessionIdMap = new Map<number, string>();
      for (let j = 0; j < sessionConfigs.length; j++) {
        const config = sessionConfigs[j];
        const newSessionId = await createSessionFromConfig(config, get());
        sessionIdMap.set(j, newSessionId);
      }

      // Update layout with actual session IDs
      const updateLayoutSessionIds = (
        node: LayoutNode,
        sessionIndex: number
      ): { node: LayoutNode; nextIndex: number } => {
        if ('sessionId' in node) {
          const actualSessionId = sessionIdMap.get(sessionIndex);
          if (!actualSessionId) {
            throw new Error(`Session ID not found for index ${sessionIndex}`);
          }
          return {
            node: { ...node, sessionId: actualSessionId },
            nextIndex: sessionIndex + 1,
          };
        } else {
          let currentIndex = sessionIndex;
          const updatedPanes: LayoutNode[] = [];
          
          for (const pane of node.panes) {
            const result = updateLayoutSessionIds(pane, currentIndex);
            updatedPanes.push(result.node);
            currentIndex = result.nextIndex;
          }

          return {
            node: { ...node, panes: updatedPanes },
            nextIndex: currentIndex,
          };
        }
      };

      const { node: updatedLayout } = updateLayoutSessionIds(tab.layout, 0);

      // Add the tab
      const newTab: TerminalTab = {
        id: uuid(),
        title: tab.title,
        layout: updatedLayout,
      };

      get().addTab(newTab);
    }

    // Set active tab
    const tabs = get().tabs;
    if (workspace.activeTabIndex >= 0 && workspace.activeTabIndex < tabs.length) {
      if (tabs[workspace.activeTabIndex]) {
        get().setActiveTab(tabs[workspace.activeTabIndex].id);
      }
    }

    console.log('[WORKSPACE] Successfully loaded workspace:', workspace.name);
  },

  deleteWorkspace: (workspaceId) => {
    const state = get();
    const workspace = state.workspaces.find(w => w.id === workspaceId);
    const newWorkspaces = state.workspaces.filter(w => w.id !== workspaceId);
    set({ workspaces: newWorkspaces });
    saveWorkspacesToStorage(newWorkspaces);
    
    console.log('[WORKSPACE] Deleted workspace:', workspace?.name, 'Remaining:', newWorkspaces.length);
  },

  updateWorkspace: (workspaceId, name, description) => {
    const state = get();
    const newWorkspaces = state.workspaces.map(w => {
      if (w.id === workspaceId) {
        return updateWorkspaceTimestamp({
          ...w,
          name,
          description,
        });
      }
      return w;
    });
    set({ workspaces: newWorkspaces });
    saveWorkspacesToStorage(newWorkspaces);
    
    console.log('[WORKSPACE] Updated workspace:', name);
  },

  getWorkspaces: () => {
    return get().workspaces;
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
      activePaneId: null,
    });
  },
}));

// Initialize global event listeners
if (typeof window !== "undefined") {
  const setupEventListeners = () => {
    if (typeof window.go === "undefined" || typeof EventsOn !== "function") {
      setTimeout(setupEventListeners, 100);
      return;
    }
    
    EventsOn("terminal:closed", (event: TerminalClosedEvent) => {
      console.log("[TERM] Received terminal:closed event for session:", event.SessionID);
      const state = useTerminalStore.getState();
      
      // We can use closeTerminal, but we need to be careful about loops if it calls CloseTerminal backend
      // closeTerminal logic handles finding the pane and removing it.
      // But we should probably just update state here.
      
      // Find tab/pane
      let foundTabId: string | null = null;
      let foundPaneId: string | null = null;
      
      for (const tab of state.tabs) {
          const findBySession = (node: LayoutNode): TerminalPane | null => {
              if ("sessionId" in node && node.sessionId === event.SessionID) return node;
              if ("panes" in node) {
                  for (const p of node.panes) {
                      const f = findBySession(p);
                      if (f) return f;
                  }
              }
              return null;
          };
          const pane = findBySession(tab.layout);
          if (pane) {
              foundTabId = tab.id;
              foundPaneId = pane.id;
              break;
          }
      }
      
      if (foundTabId && foundPaneId) {
          // Use closePane to update layout, skip backend call since terminal already closed
          state.closePane(foundTabId, foundPaneId, true);
      } else {
          state.removeSession(event.SessionID);
          destroyTerminalInstance(event.SessionID);
      }
    });
  };
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupEventListeners);
  } else {
    setupEventListeners();
  }
}

// Selectors
export const useActiveSession = () =>
  useTerminalStore((state) => {
    const activePaneId = state.activePaneId;
    if (!activePaneId) return null;
    
    // Find session for this pane
    let sessionId: string | null = null;
    for (const tab of state.tabs) {
         const result = findPaneAndParent(tab.layout, activePaneId);
         if (result && "sessionId" in result.node) {
             sessionId = result.node.sessionId;
             break;
         }
    }
    
    return sessionId ? state.sessions.get(sessionId) : null;
  });

// Helper to create session from serialized config
async function createSessionFromConfig(
  config: SerializedSession,
  store: ReturnType<typeof useTerminalStore.getState>
): Promise<string> {
  if (config.type === SessionType.SSH && config.sshConfig) {
    return await store.createSSHTerminal(
      config.sshConfig.host,
      config.sshConfig.port,
      config.sshConfig.username,
      config.sshConfig.password,
      config.sshConfig.privateKey,
      config.title
    );
  } else {
    return await store.createLocalTerminal(
      config.shell,
      config.workingDirectory
    );
  }
}
