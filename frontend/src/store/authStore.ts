import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResponse } from '../types';
import { STORAGE_KEYS } from '../lib/constants';
import { useUserConfigStore } from './userConfigStore';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  isInitialized: boolean;
  masterPasswordSet: boolean;
  masterPasswordUnlocked: boolean;
  
  // Actions
  setAuth: (authData: AuthResponse) => void;
  setUser: (user: User) => void;
  setGuestMode: (enabled: boolean) => void;
  setMasterPasswordSet: (set: boolean) => void;
  setMasterPasswordUnlocked: (unlocked: boolean) => void;
  logout: () => void;
  exitGuestMode: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isGuestMode: false,
      isInitialized: false,
      masterPasswordSet: false,
      masterPasswordUnlocked: false,

      setAuth: (authData: AuthResponse) => {
        set({
          user: authData.user,
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken,
          isAuthenticated: true,
          isGuestMode: false,
        });
        
        // Load user config when authenticated
        if (authData.user?.id) {
          setTimeout(() => {
            useUserConfigStore.getState().loadUserConfig(authData.user.id);
          }, 0);
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      setGuestMode: (enabled: boolean) => {
        set({ 
          isGuestMode: enabled,
          isAuthenticated: !enabled, // Guest mode means not authenticated
        });
        
        // Load appropriate config
        if (enabled) {
          setTimeout(() => {
            useUserConfigStore.getState().loadGuestConfig();
          }, 0);
        }
      },

      setMasterPasswordSet: (isSet: boolean) => {
        set({ masterPasswordSet: isSet });
      },

      setMasterPasswordUnlocked: (unlocked: boolean) => {
        set({ masterPasswordUnlocked: unlocked });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isGuestMode: false,
          masterPasswordUnlocked: false,
        });
      },

      exitGuestMode: () => {
        set({
          isGuestMode: false,
          user: null,
        });
        
        // Load default guest config
        setTimeout(() => {
          useUserConfigStore.getState().loadGuestConfig();
        }, 0);
      },

      initialize: () => {
        const state = get();
        // Check if user and token exist
        if (state.user && state.accessToken) {
          set({ isAuthenticated: true });
        }
        set({ isInitialized: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isGuestMode: state.isGuestMode,
        masterPasswordSet: state.masterPasswordSet,
      }),
    }
  )
);

