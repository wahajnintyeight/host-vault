/**
 * Workspace types for saving and restoring terminal layouts
 */

import { LayoutNode, SessionType } from './terminal';

/**
 * Serializable session configuration (without runtime state)
 */
export interface SerializedSession {
  type: SessionType;
  title: string;
  workingDirectory: string;
  shell: string;
  sshConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
    privateKey?: string;
  };
}

/**
 * Serializable tab configuration
 */
export interface SerializedTab {
  title: string;
  layout: SerializedLayoutNode;
}

/**
 * Serializable layout node (pane or split)
 */
export type SerializedLayoutNode = SerializedPane | SerializedSplit;

export interface SerializedPane {
  type: 'pane';
  session: SerializedSession;
}

export interface SerializedSplit {
  type: 'split';
  orientation: 'horizontal' | 'vertical';
  panes: SerializedLayoutNode[];
  sizes: number[];
}

/**
 * Complete workspace configuration
 */
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  tabs: SerializedTab[];
  activeTabIndex: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Workspace metadata for listing
 */
export interface WorkspaceMetadata {
  id: string;
  name: string;
  description?: string;
  tabCount: number;
  createdAt: string;
  updatedAt: string;
}
