// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    GOOGLE_CALLBACK: '/auth/google/callback',
    LOGOUT: '/auth/logout',
    SESSION: '/auth/session',
    REFRESH: '/auth/refresh',
    RESET_PASSWORD_CODE: '/auth/reset-password-code',
  },
  // Connections
  CONNECTIONS: {
    LIST: '/connections',
    CREATE: '/connections',
    GET: (id: string) => `/connections/${id}`,
    UPDATE: (id: string) => `/connections/${id}`,
    DELETE: (id: string) => `/connections/${id}`,
    VERSIONS: (id: string) => `/connections/${id}/versions`,
    RESTORE: (id: string, version: number) => `/connections/${id}/restore/${version}`,
    DELETED: '/connections/deleted',
    RECOVER: (id: string) => `/connections/${id}/recover`,
  },
  // Commands
  COMMANDS: {
    LIST: '/commands',
    CREATE: '/commands',
    GET: (id: string) => `/commands/${id}`,
    UPDATE: (id: string) => `/commands/${id}`,
    DELETE: (id: string) => `/commands/${id}`,
    VERSIONS: (id: string) => `/commands/${id}/versions`,
  },
  // Keychains
  KEYCHAINS: {
    LIST: '/keychains',
    CREATE: '/keychains',
    UPDATE: (id: string) => `/keychains/${id}`,
    DELETE: (id: string) => `/keychains/${id}`,
  },
  // Sync
  SYNC: {
    PUSH: '/sync/push',
    PULL: '/sync/pull',
    STATUS: '/sync/status',
  },
  // Import/Export
  IMPORT: {
    BASE: '/import',
    OPENSSH: '/import/openssh',
    PUTTY: '/import/putty',
    TERMIUS: '/import/termius',
  },
  EXPORT: (format: string) => `/export/${format}`,
  // Recovery
  RECOVERY: {
    DELETED: '/recovery/deleted',
    RESTORE: (id: string) => `/recovery/restore/${id}`,
    VERSIONS: (resourceId: string) => `/recovery/versions/${resourceId}`,
    VALIDATE: '/recovery/validate',
  },
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'vault_access_token',
  REFRESH_TOKEN: 'vault_refresh_token',
  USER: 'vault_user',
  MASTER_PASSWORD_HASH: 'vault_master_password_hash',
  ENCRYPTION_KEY: 'vault_encryption_key',
  THEME: 'vault_theme',
  LAST_SYNC: 'vault_last_sync',
} as const;

// Encryption Configuration
export const ENCRYPTION_CONFIG = {
  PBKDF2_ITERATIONS: 100000,
  KEY_LENGTH: 256, // bits
  ALGORITHM: 'AES-GCM',
  KEY_DERIVATION_ALGORITHM: 'PBKDF2',
  SALT_LENGTH: 16, // bytes
  IV_LENGTH: 12, // bytes for GCM
  TAG_LENGTH: 16, // bytes for GCM
} as const;

// Recovery Code Configuration
export const RECOVERY_CODE_CONFIG = {
  COUNT: 6,
  FORMAT: 'XXXX-XXXX-XXXX', // Alphanumeric
  MAX_ATTEMPTS: 5,
  LENGTH: 12, // characters per code
} as const;

// Backup Configuration
export const BACKUP_CONFIG = {
  AUTO_BACKUP_INTERVAL: 60 * 60 * 1000, // 1 hour in milliseconds
  RETENTION_DAYS: 30,
  BACKUP_DIR: 'backups',
} as const;

// App Metadata
export const APP_CONFIG = {
  NAME: 'Host Vault',
  VERSION: '1.0.0',
  DESCRIPTION: 'Secure SSH Connection Manager',
  AUTHOR: 'Wahaj',
  EMAIL: 'wahajdorift@yahoo.com',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SETUP: '/setup',
  DASHBOARD: '/dashboard',
  CONNECTIONS: '/connections',
  COMMANDS: '/commands',
  SETTINGS: '/settings',
} as const;

// Validation Rules
export const VALIDATION = {
  MASTER_PASSWORD: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },
  SSH_CONNECTION: {
    NAME_MAX_LENGTH: 100,
    HOST_MAX_LENGTH: 255,
    USERNAME_MAX_LENGTH: 100,
    PORT_MIN: 1,
    PORT_MAX: 65535,
  },
  COMMAND: {
    TITLE_MAX_LENGTH: 100,
    COMMAND_MAX_LENGTH: 10000,
  },
} as const;

