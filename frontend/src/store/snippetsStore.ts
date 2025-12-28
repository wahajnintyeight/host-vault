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
}

interface SnippetsData {
  snippets: Snippet[];
  lastUpdated: number;
}

interface SnippetsState {
  snippets: Snippet[];
  isLoading: boolean;
  addSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt'>) => Promise<void>;
  updateSnippet: (id: string, updates: Partial<Omit<Snippet, 'id' | 'createdAt'>>) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;
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
    return data.snippets || [];
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
      return data.snippets || [];
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
    const newSnippet: Snippet = {
      ...snippet,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    const updated = [...get().snippets, newSnippet];
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
    set({ snippets: updated });
    await saveToFile(updated);
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
