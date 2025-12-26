import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeName } from '../lib/themes';
import { useUserConfigStore } from './userConfigStore';

interface AppState {
  activeModal: string | null;
  toastNotifications: ToastNotification[];
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Theme getter/setter (delegates to userConfigStore)
  getTheme: () => ThemeName;
  setTheme: (theme: ThemeName) => void;
  
  // Sidebar getters (delegates to userConfigStore)
  getSidebarOpen: () => boolean;
  getSidebarCollapsed: () => boolean;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 = no auto-dismiss
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeModal: null,
      toastNotifications: [],

      // Theme delegation to userConfigStore
      getTheme: () => {
        return useUserConfigStore.getState().config.theme;
      },

      setTheme: (theme) => {
        useUserConfigStore.getState().updateConfig({ theme });
      },

      // Sidebar delegation to userConfigStore
      getSidebarOpen: () => {
        return useUserConfigStore.getState().config.sidebarOpen;
      },

      getSidebarCollapsed: () => {
        return useUserConfigStore.getState().config.sidebarCollapsed;
      },

      setSidebarOpen: (open) => {
        useUserConfigStore.getState().updateConfig({ sidebarOpen: open });
      },

      toggleSidebar: () => {
        const current = useUserConfigStore.getState().config.sidebarOpen;
        useUserConfigStore.getState().updateConfig({ sidebarOpen: !current });
      },

      setSidebarCollapsed: (collapsed) => {
        useUserConfigStore.getState().updateConfig({ sidebarCollapsed: collapsed });
      },

      openModal: (modalId) => {
        set({ activeModal: modalId });
      },

      closeModal: () => {
        set({ activeModal: null });
      },

      addToast: (toast) => {
        const id = `${Date.now()}-${Math.random()}`;
        const newToast: ToastNotification = {
          ...toast,
          id,
          duration: toast.duration ?? 5000,
        };
        
        set((state) => ({
          toastNotifications: [...state.toastNotifications, newToast],
        }));

        // Auto-dismiss if duration is set
        const duration = newToast.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, duration);
        }
      },

      removeToast: (id) => {
        set((state) => ({
          toastNotifications: state.toastNotifications.filter((t) => t.id !== id),
        }));
      },

      clearToasts: () => {
        set({ toastNotifications: [] });
      },
    }),
    {
      name: 'app-storage',
      partialize: () => ({
        // No longer storing theme/sidebar here, handled by userConfigStore
      }),
    }
  )
);

