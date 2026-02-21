/**
 * Workspace serialization utilities
 * Converts runtime terminal state to/from serializable workspace format
 */

import { v4 as uuid } from 'uuid';
import {
  TerminalTab,
  TerminalSession,
  LayoutNode,
  SplitOrientation,
  SessionType,
} from '../types/terminal';
import {
  Workspace,
  SerializedTab,
  SerializedLayoutNode,
  SerializedSession,
  SerializedPane,
  SerializedSplit,
} from '../types/workspace';

/**
 * Serialize a terminal session to a portable format
 */
export const serializeSession = (session: TerminalSession): SerializedSession => {
  return {
    type: session.type,
    title: session.title,
    workingDirectory: session.metadata.workingDirectory,
    shell: session.metadata.shell,
    sshConfig: session.metadata.sshConfig,
  };
};

/**
 * Serialize a layout node (recursive)
 */
export const serializeLayoutNode = (
  node: LayoutNode,
  sessions: Map<string, TerminalSession>
): SerializedLayoutNode => {
  if ('sessionId' in node) {
    // Terminal pane
    const session = sessions.get(node.sessionId);
    if (!session) {
      throw new Error(`Session ${node.sessionId} not found`);
    }
    
    const serializedPane: SerializedPane = {
      type: 'pane',
      session: serializeSession(session),
    };
    return serializedPane;
  } else {
    // Split pane
    const serializedSplit: SerializedSplit = {
      type: 'split',
      orientation: node.orientation === SplitOrientation.Horizontal ? 'horizontal' : 'vertical',
      panes: node.panes.map((pane) => serializeLayoutNode(pane, sessions)),
      sizes: node.sizes,
    };
    return serializedSplit;
  }
};

/**
 * Serialize a terminal tab
 */
export const serializeTab = (
  tab: TerminalTab,
  sessions: Map<string, TerminalSession>
): SerializedTab => {
  return {
    title: tab.title,
    layout: serializeLayoutNode(tab.layout, sessions),
  };
};

/**
 * Create a workspace from current terminal state
 */
export const createWorkspace = (
  name: string,
  description: string | undefined,
  tabs: TerminalTab[],
  activeTabId: string | null,
  sessions: Map<string, TerminalSession>
): Workspace => {
  const activeTabIndex = activeTabId 
    ? tabs.findIndex(t => t.id === activeTabId)
    : 0;

  const now = new Date().toISOString();

  return {
    id: uuid(),
    name,
    description,
    tabs: tabs.map((tab) => serializeTab(tab, sessions)),
    activeTabIndex: Math.max(0, activeTabIndex),
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Deserialize a layout node (returns session configs and layout structure)
 */
export const deserializeLayoutNode = (
  node: SerializedLayoutNode
): { layout: LayoutNode; sessions: SerializedSession[] } => {
  if (node.type === 'pane') {
    // Create a pane with a placeholder session ID
    const sessionId = uuid();
    return {
      layout: {
        id: uuid(),
        sessionId,
      },
      sessions: [node.session],
    };
  } else {
    // Split pane - recursively deserialize children
    const childResults = node.panes.map(deserializeLayoutNode);
    const allSessions = childResults.flatMap(r => r.sessions);
    
    return {
      layout: {
        id: uuid(),
        orientation: node.orientation === 'horizontal' 
          ? SplitOrientation.Horizontal 
          : SplitOrientation.Vertical,
        panes: childResults.map(r => r.layout),
        sizes: node.sizes,
      },
      sessions: allSessions,
    };
  }
};

/**
 * Deserialize a tab
 */
export const deserializeTab = (
  serializedTab: SerializedTab
): { tab: Omit<TerminalTab, 'id'>; sessions: SerializedSession[] } => {
  const { layout, sessions } = deserializeLayoutNode(serializedTab.layout);
  
  return {
    tab: {
      title: serializedTab.title,
      layout,
    },
    sessions,
  };
};

/**
 * Get workspace metadata without full deserialization
 */
export const getWorkspaceMetadata = (workspace: Workspace) => {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    tabCount: workspace.tabs.length,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
};

/**
 * Update workspace timestamp
 */
export const updateWorkspaceTimestamp = (workspace: Workspace): Workspace => {
  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
  };
};
