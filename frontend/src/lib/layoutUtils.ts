import { LayoutNode, SplitPane, TerminalPane, SplitOrientation } from "../types/terminal";

export const isSplitPane = (node: LayoutNode): node is SplitPane => {
  return "panes" in node;
};

export const isTerminalPane = (node: LayoutNode): node is TerminalPane => {
  return "sessionId" in node;
};

export const findPane = (node: LayoutNode, paneId: string): TerminalPane | null => {
  if (isTerminalPane(node)) {
    return node.id === paneId ? node : null;
  }
  for (const child of node.panes) {
    const found = findPane(child, paneId);
    if (found) return found;
  }
  return null;
};

export const extractSessionIds = (node: LayoutNode): string[] => {
  if (isTerminalPane(node)) {
    return [node.sessionId];
  }
  return node.panes.flatMap(extractSessionIds);
};

export const replaceNode = (
  root: LayoutNode,
  targetId: string,
  replacement: LayoutNode
): LayoutNode => {
  if (root.id === targetId) {
    return replacement;
  }
  if (isSplitPane(root)) {
    return {
      ...root,
      panes: root.panes.map((p) => replaceNode(p, targetId, replacement)),
    };
  }
  return root;
};

export const removeNode = (root: LayoutNode, targetId: string): LayoutNode | null => {
  if (root.id === targetId) {
    return null;
  }
  if (isSplitPane(root)) {
    const newPanes = root.panes
      .map((p) => removeNode(p, targetId))
      .filter((p): p is LayoutNode => p !== null);

    if (newPanes.length === 0) return null;
    if (newPanes.length === 1) return newPanes[0]; // Collapse unnecessary split

    // Adjust sizes if needed (simplistic approach: redistribute)
    // If we removed a child, we should probably re-normalize sizes.
    // But for now let's keep it simple.
    
    // If sizes length matches panes length, we are good.
    // But we just filtered panes.
    let newSizes = root.sizes;
    if (root.sizes.length !== newPanes.length) {
        // Redistribute evenly
        const size = 100 / newPanes.length;
        newSizes = newPanes.map(() => size);
    }

    return {
      ...root,
      panes: newPanes,
      sizes: newSizes
    };
  }
  return root;
};

// Helper to create a split
export const createSplit = (
  existingNode: LayoutNode,
  newNode: LayoutNode,
  orientation: SplitOrientation,
  first: boolean // if true, newNode comes first (top/left)
): SplitPane => {
  return {
    id: `split-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    orientation,
    panes: first ? [newNode, existingNode] : [existingNode, newNode],
    sizes: [50, 50],
  };
};
