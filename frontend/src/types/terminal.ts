export enum SessionType {
  Local = 'local',
  SSH = 'ssh'
}

export enum SessionState {
  Active = 'active',
  Inactive = 'inactive',
  Disconnected = 'disconnected',
  Closed = 'closed'
}

export interface SessionMetadata {
  workingDirectory: string;
  shell: string;
  environment: Record<string, string>;
  connectionID?: string;
  createdAt: string;
  state: SessionState;
  // SSH connection info for duplication/reconnection
  sshConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
    privateKey?: string;
  };
}

export interface TerminalSession {
  id: string;
  type: SessionType;
  metadata: SessionMetadata;
  title: string;
}

export interface TerminalTab {
  id: string;
  layout: LayoutNode;
  title: string;
}

export enum SplitOrientation {
  Horizontal = 'horizontal',
  Vertical = 'vertical'
}

export interface SplitPane {
  id: string;
  orientation: SplitOrientation;
  panes: (TerminalPane | SplitPane)[];
  sizes: number[];
}

export interface TerminalPane {
  id: string;
  sessionId: string;
}

export type LayoutNode = TerminalPane | SplitPane;

export interface TerminalOutputEvent {
  SessionID: string;
  Data: string;
}

export interface TerminalErrorEvent {
  SessionID: string;
  Error: string;
}

export interface TerminalClosedEvent {
  SessionID: string;
}

export interface TerminalDisconnectedEvent {
  SessionID: string;
}

export interface TerminalReconnectNeededEvent {
  SessionID: string;
}

export enum TabAction {
  Duplicate = 'duplicate',
  Close = 'close',
  CloseOthers = 'close-others',
  CloseRight = 'close-right',
  CloseAll = 'close-all',
  Rename = 'rename'
}
