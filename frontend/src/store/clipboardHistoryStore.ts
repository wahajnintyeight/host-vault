import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ClipboardItem {
  id: string;
  content: string;
  timestamp: number;
  source?: string; // 'terminal', 'manual', etc.
}

interface ClipboardHistoryState {
  items: ClipboardItem[];
  maxAge: number; // Maximum age in milliseconds (default: 15 days)
  maxItems: number; // Maximum number of items to keep (default: 100)
  
  // Actions
  addItem: (content: string, source?: string) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
  getRecentItems: (limit?: number) => ClipboardItem[];
  cleanupOldItems: () => void;
  searchItems: (query: string) => ClipboardItem[];
}

const MAX_AGE_MS = 15 * 24 * 60 * 60 * 1000; // 15 days in milliseconds
const MAX_ITEMS = 100;

export const useClipboardHistoryStore = create<ClipboardHistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      maxAge: MAX_AGE_MS,
      maxItems: MAX_ITEMS,

      addItem: (content: string, source?: string) => {
        if (!content || content.trim().length === 0) return;
        
        set((state) => {
          // Check if identical content already exists at the top
          const existingIndex = state.items.findIndex(item => item.content === content);
          if (existingIndex === 0) {
            // Update timestamp if it's already at the top
            const updatedItems = [...state.items];
            updatedItems[0] = { ...updatedItems[0], timestamp: Date.now() };
            return { items: updatedItems };
          }
          
          // Remove duplicate if exists elsewhere
          const filteredItems = existingIndex >= 0 
            ? state.items.filter((_, i) => i !== existingIndex)
            : state.items;
          
          // Create new item
          const newItem: ClipboardItem = {
            id: crypto.randomUUID(),
            content: content.trim(),
            timestamp: Date.now(),
            source: source || 'terminal',
          };
          
          // Add to beginning and limit total items
          const newItems = [newItem, ...filteredItems].slice(0, state.maxItems);
          
          return { items: newItems };
        });
        
        // Trigger cleanup after adding
        setTimeout(() => get().cleanupOldItems(), 0);
      },

      removeItem: (id: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      clearHistory: () => {
        set({ items: [] });
      },

      getRecentItems: (limit?: number) => {
        const state = get();
        const cutoffTime = Date.now() - state.maxAge;
        const recentItems = state.items.filter((item) => item.timestamp > cutoffTime);
        return limit ? recentItems.slice(0, limit) : recentItems;
      },

      cleanupOldItems: () => {
        set((state) => {
          const cutoffTime = Date.now() - state.maxAge;
          const filteredItems = state.items.filter((item) => item.timestamp > cutoffTime);
          
          // Also enforce max items limit
          const limitedItems = filteredItems.slice(0, state.maxItems);
          
          if (limitedItems.length !== state.items.length) {
            console.log(`[CLIPBOARD] Cleaned up ${state.items.length - limitedItems.length} old items`);
          }
          
          return { items: limitedItems };
        });
      },

      searchItems: (query: string) => {
        const state = get();
        const cutoffTime = Date.now() - state.maxAge;
        const searchLower = query.toLowerCase();
        
        return state.items
          .filter((item) => item.timestamp > cutoffTime)
          .filter((item) => item.content.toLowerCase().includes(searchLower));
      },
    }),
    {
      name: 'host-vault-clipboard-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }), // Only persist items
    }
  )
);

// Auto-cleanup on app load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useClipboardHistoryStore.getState().cleanupOldItems();
  }, 1000);
}
