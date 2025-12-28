import { create } from 'zustand';
import {
  GetGuestSnippetsPath,
  GetUserSnippetsPath,
  ReadFile,
  WriteFile,
  FileExists,
} from '../../wailsjs/go/main/App';
import { useAuthStore } from './authStore';

export interface Snippet {
  id: string;
  name: string;
  command: string;
  description?: string;
  createdAt: number;
  order: number;
}

interface SnippetsData {
  snippets: Snippet[];
  lastUpdated: number;
}

interface SnippetsState {
  snippets: Snippet[];
  isLoading: boolean;
  addSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'order'>) => Promise<void>;
  updateSnippet: (id: string, updates: Partial<Omit<Snippet, 'id' | 'createdAt'>>) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;
  reorderSnippets: (activeId: string, overId: string) => Promise<void>;
  loadSnippets: () => Promise<void>;
  exportSnippets: () => string;
  importSnippets: (json: string) => Promise<boolean>;
}

const isWailsAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.go?.main?.App;
};

const getSnippetsPath = async (): Promise<string> => {
  const { isGuestMode, user } = useAuthStore.getState();
  if (isGuestMode || !user?.id) {
    return GetGuestSnippetsPath();
  }
  return GetUserSnippetsPath(user.id);
};

const loadFromFile = async (): Promise<Snippet[]> => {
  if (!isWailsAvailable()) {
    return loadFromLocalStorage();
  }
  try {
    const path = await getSnippetsPath();
    const exists = await FileExists(path);
    if (!exists) return [];
    const content = await ReadFile(path);
    if (!content) return [];
    const data: SnippetsData = JSON.parse(content);
    // Ensure all snippets have order, migrate old data
    const snippets = (data.snippets || []).map((s, i) => ({
      ...s,
      order: s.order ?? i,
    }));
    return snippets.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Failed to load snippets from file:', error);
    return loadFromLocalStorage();
  }
};

const saveToFile = async (snippets: Snippet[]): Promise<void> => {
  if (!isWailsAvailable()) {
    saveToLocalStorage(snippets);
    return;
  }
  try {
    const path = await getSnippetsPath();
    const data: SnippetsData = { snippets, lastUpdated: Date.now() };
    await WriteFile(path, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save snippets to file:', error);
    saveToLocalStorage(snippets);
  }
};

const loadFromLocalStorage = (): Snippet[] => {
  try {
    const { isGuestMode, user } = useAuthStore.getState();
    const key = isGuestMode ? 'guest-snippets' : `user-snippets-${user?.id || 'default'}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      const snippets = (data.snippets || []).map((s: Snippet, i: number) => ({
        ...s,
        order: s.order ?? i,
      }));
      return snippets.sort((a: Snippet, b: Snippet) => a.order - b.order);
    }
  } catch (error) {
    console.error('Failed to load snippets from localStorage:', error);
  }
  return [];
};

const saveToLocalStorage = (snippets: Snippet[]): void => {
  try {
    const { isGuestMode, user } = useAuthStore.getState();
    const key = isGuestMode ? 'guest-snippets' : `user-snippets-${user?.id || 'default'}`;
    localStorage.setItem(key, JSON.stringify({ snippets, lastUpdated: Date.now() }));
  } catch (error) {
    console.error('Failed to save snippets to localStorage:', error);
  }
};

export const useSnippetsStore = create<SnippetsState>()((set, get) => ({
  snippets: [],
  isLoading: false,

  loadSnippets: async () => {
    set({ isLoading: true });
    const snippets = await loadFromFile();
    set({ snippets, isLoading: false });
  },

  addSnippet: async (snippet) => {
    const currentSnippets = get().snippets;
    const maxOrder = currentSnippets.length > 0 ? Math.max(...currentSnippets.map(s => s.order)) : -1;
    const newSnippet: Snippet = {
      ...snippet,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      order: maxOrder + 1,
    };
    const updated = [...currentSnippets, newSnippet];
    set({ snippets: updated });
    await saveToFile(updated);
  },

  updateSnippet: async (id, updates) => {
    const updated = get().snippets.map((s) => (s.id === id ? { ...s, ...updates } : s));
    set({ snippets: updated });
    await saveToFile(updated);
  },

  deleteSnippet: async (id) => {
    const updated = get().snippets.filter((s) => s.id !== id);
    // Reindex order after deletion
    const reindexed = updated.map((s, i) => ({ ...s, order: i }));
    set({ snippets: reindexed });
    await saveToFile(reindexed);
  },

  reorderSnippets: async (activeId, overId) => {
    const snippets = [...get().snippets];
    const oldIndex = snippets.findIndex(s => s.id === activeId);
    const newIndex = snippets.findIndex(s => s.id === overId);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const [removed] = snippets.splice(oldIndex, 1);
    snippets.splice(newIndex, 0, removed);
    
    // Update order values
    const reordered = snippets.map((s, i) => ({ ...s, order: i }));
    set({ snippets: reordered });
    await saveToFile(reordered);
  },

  exportSnippets: () => {
    const data: SnippetsData = { snippets: get().snippets, lastUpdated: Date.now() };
    return JSON.stringify(data, null, 2);
  },

  importSnippets: async (json: string) => {
    try {
      const data: SnippetsData = JSON.parse(json);
      if (!Array.isArray(data.snippets)) return false;
      const merged = [...get().snippets];
      for (const snippet of data.snippets) {
        if (!merged.find((s) => s.id === snippet.id)) {
          merged.push(snippet);
        }
      }
      set({ snippets: merged });
      await saveToFile(merged);
      return true;
    } catch {
      return false;
    }
  },
}));
