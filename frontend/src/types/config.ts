import type { ThemeName } from '../lib/themes';

/**
 * User configuration interface
 * Stores all user preferences and settings
 */
export interface UserConfig {
  // Appearance
  theme: ThemeName;
  
  // UI Preferences
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Application Settings
  autoLock: boolean;
  autoLockTimeout: number; // milliseconds
  showNotifications: boolean;
  notificationSound: boolean;
  
  // Editor Settings
  editorFontSize: number;
  editorTheme: 'dark' | 'light';
  editorWordWrap: boolean;
  editorLineNumbers: boolean;
  
  // Connection Settings
  defaultSSHPort: number;
  connectionTimeout: number; // seconds
  keepAliveInterval: number; // seconds
  
  // Sync Settings (only for authenticated users)
  autoSync: boolean;
  syncInterval: number; // milliseconds
  
  // Privacy Settings
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  
  // Last updated timestamp
  lastUpdated: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_USER_CONFIG: UserConfig = {
  theme: 'dark',
  sidebarOpen: true,
  sidebarCollapsed: false,
  autoLock: true,
  autoLockTimeout: 15 * 60 * 1000, // 15 minutes
  showNotifications: true,
  notificationSound: false,
  editorFontSize: 14,
  editorTheme: 'dark',
  editorWordWrap: true,
  editorLineNumbers: true,
  defaultSSHPort: 22,
  connectionTimeout: 30,
  keepAliveInterval: 60,
  autoSync: true,
  syncInterval: 5 * 60 * 1000, // 5 minutes
  analyticsEnabled: false,
  crashReportingEnabled: false,
  lastUpdated: Date.now(),
};

/**
 * Guest configuration (simplified, no sync features)
 */
export type GuestConfig = Omit<UserConfig, 'autoSync' | 'syncInterval'>;

