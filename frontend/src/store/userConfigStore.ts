import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserConfig } from '../types/config';
import { DEFAULT_USER_CONFIG as DEFAULT_CONFIG } from '../types/config';
import { useAuthStore } from './authStore';
import { applyTheme } from '../lib/themes';
import { loadConfigFromFile, saveConfigToFile } from '../lib/storage/fileStorage';

interface UserConfigState {
  // Current config (merged from user/guest)
  config: UserConfig;
  
  // Actions
  updateConfig: (updates: Partial<UserConfig>) => void;
  resetConfig: () => void;
  loadUserConfig: (userId: string) => void;
  loadGuestConfig: () => void;
  saveConfig: () => void;
}


export const useUserConfigStore = create<UserConfigState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,

      updateConfig: async (updates) => {
        const { isGuestMode, user } = useAuthStore.getState();
        const currentConfig = get().config;
        const newConfig = {
          ...currentConfig,
          ...updates,
          lastUpdated: Date.now(),
        };

        set({ config: newConfig });

        // Apply theme immediately if changed
        if (updates.theme && updates.theme !== currentConfig.theme) {
          applyTheme(updates.theme);
        }

        // Save to file system (with localStorage fallback)
        await saveConfigToFile(newConfig, isGuestMode, user?.id);
      },

      resetConfig: async () => {
        const { isGuestMode, user } = useAuthStore.getState();
        const defaultConfig = { ...DEFAULT_CONFIG };
        
        set({ config: defaultConfig });

        // Apply default theme
        applyTheme(defaultConfig.theme);

        // Save to file system (with localStorage fallback)
        await saveConfigToFile(defaultConfig, isGuestMode, user?.id);
      },

      loadUserConfig: async (userId: string) => {
        const stored = await loadConfigFromFile(false, userId);
        
        if (stored) {
          const mergedConfig = {
            ...DEFAULT_CONFIG,
            ...stored,
          };
          set({ config: mergedConfig });
          
          // Apply theme
          if (mergedConfig.theme) {
            applyTheme(mergedConfig.theme);
          }
        } else {
          // Use default config
          set({ config: DEFAULT_CONFIG });
          applyTheme(DEFAULT_CONFIG.theme);
          // Save default config to file
          await saveConfigToFile(DEFAULT_CONFIG, false, userId);
        }
      },

      loadGuestConfig: async () => {
        const stored = await loadConfigFromFile(true);
        
        if (stored) {
          // Remove sync-related fields for guest
          const { autoSync, syncInterval, ...guestConfig } = {
            ...DEFAULT_CONFIG,
            ...stored,
          } as UserConfig;
          
          set({ config: guestConfig as UserConfig });
          
          // Apply theme
          if (guestConfig.theme) {
            applyTheme(guestConfig.theme);
          }
        } else {
          // Use default config without sync
          const { autoSync, syncInterval, ...guestConfig } = DEFAULT_CONFIG;
          set({ config: guestConfig as UserConfig });
          applyTheme(guestConfig.theme);
          // Save default config to file
          await saveConfigToFile(guestConfig, true);
        }
      },

      saveConfig: async () => {
        const { isGuestMode, user } = useAuthStore.getState();
        const config = get().config;
        await saveConfigToFile(config, isGuestMode, user?.id);
      },
    }),
    {
      name: 'user-config-storage',
      partialize: (state) => ({
        // Store minimal config in Zustand persist as backup
        theme: state.config.theme,
        sidebarCollapsed: state.config.sidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        // Load appropriate config based on auth state
        if (state) {
          // Use setTimeout to avoid circular dependency issues
          setTimeout(() => {
            const { isGuestMode, user } = useAuthStore.getState();
            if (isGuestMode) {
              state.loadGuestConfig();
            } else if (user?.id) {
              state.loadUserConfig(user.id);
            } else {
              // Default guest config
              state.loadGuestConfig();
            }
          }, 0);
        }
      },
    }
  )
);

