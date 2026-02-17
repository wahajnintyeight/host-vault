import { LayoutNode } from '../types/terminal';
import { TerminalTab } from '../types/terminal';

// Helper to recursively find the first terminal pane's session ID
export const getActiveSessionId = (tab: TerminalTab): string | null => {
  if (!tab || !tab.layout) return null;
  
  // Recursive function to find first sessionId
  const findSessionId = (node: LayoutNode): string | null => {
    if ("sessionId" in node) {
      return node.sessionId;
    }
    if ("panes" in node && node.panes && node.panes.length > 0) {
      return findSessionId(node.panes[0]);
    }
    return null;
  };

  return findSessionId(tab.layout);
};
