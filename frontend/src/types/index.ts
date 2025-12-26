// User types
export interface User {
  id: string;
  email: string;
  oauthProvider: 'google' | 'github' | 'local';
  oauthId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// SSH Connection types
export interface SSHConnection {
  id: string;
  userId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  privateKeyEncrypted?: string;
  publicKey?: string;
  passwordEncrypted?: string;
  connectionConfig?: {
    proxyJump?: string;
    portForwarding?: PortForwarding[];
    [key: string]: any;
  };
  importSource?: 'openssh' | 'putty' | 'termius' | 'manual';
  tags?: string[];
  isFavorite: boolean;
  version: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortForwarding {
  type: 'local' | 'remote' | 'dynamic';
  bindAddress?: string;
  bindPort: number;
  host?: string;
  hostPort?: number;
}

// Command types
export interface Command {
  id: string;
  userId: string;
  title: string;
  command: string;
  description?: string;
  variables?: CommandVariable[];
  tags?: string[];
  scope: 'global' | string; // 'global' or connectionId
  version: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommandVariable {
  name: string;
  defaultValue?: string;
  description?: string;
}

// Recovery Code types
export interface RecoveryCode {
  id: string;
  userId: string;
  codeHash: string; // SHA-256 hash
  used: boolean;
  usedAt?: string;
  usedByEmail?: string;
  attempts: number;
  locked: boolean;
  lockedAt?: string;
  createdAt: string;
}

// Keychain types
export interface Keychain {
  id: string;
  userId: string;
  type: 'ssh_key' | 'password' | 'token';
  dataEncrypted: string;
  metadata?: {
    algorithm?: string;
    fingerprint?: string;
    keySize?: number;
    [key: string]: any;
  };
  associatedConnections?: string[];
  version: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RecoveryCodeResponse {
  codes: string[]; // Plain text codes (only shown once)
  message: string;
}

// Version History types
export interface VersionHistory {
  version: number;
  data: SSHConnection | Command;
  changedAt: string;
  changedBy: string;
  changeType: 'create' | 'update' | 'delete';
}

// Sync types
export interface SyncStatus {
  lastSyncAt?: string;
  pendingChanges: number;
  conflicts: SyncConflict[];
  status: 'synced' | 'syncing' | 'conflict' | 'error';
}

export interface SyncConflict {
  resourceType: 'connection' | 'command' | 'keychain';
  resourceId: string;
  localVersion: number;
  cloudVersion: number;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
}

// Encryption types
export interface EncryptionKey {
  key: CryptoKey | string; // CryptoKey for Web Crypto API, string for crypto-js
  salt: string;
  iterations: number;
}

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Initialization vector
  salt: string;
  tag?: string; // GCM authentication tag
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

