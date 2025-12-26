import { create } from 'zustand';
import type { SSHConnection } from '../types';

interface ConnectionState {
  connections: SSHConnection[];
  filteredConnections: SSHConnection[];
  selectedConnection: SSHConnection | null;
  searchQuery: string;
  filterTags: string[];
  filterFavorites: boolean | null; // null = all, true = favorites only, false = non-favorites only
  isLoading: boolean;
  error: string | null;

  // Actions
  setConnections: (connections: SSHConnection[]) => void;
  addConnection: (connection: SSHConnection) => void;
  updateConnection: (id: string, updates: Partial<SSHConnection>) => void;
  deleteConnection: (id: string) => void;
  setSelectedConnection: (connection: SSHConnection | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterTags: (tags: string[]) => void;
  setFilterFavorites: (favorites: boolean | null) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  filteredConnections: [],
  selectedConnection: null,
  searchQuery: '',
  filterTags: [],
  filterFavorites: null,
  isLoading: false,
  error: null,

  setConnections: (connections) => {
    set({ connections });
    get().applyFilters();
  },

  addConnection: (connection) => {
    const connections = [...get().connections, connection];
    set({ connections });
    get().applyFilters();
  },

  updateConnection: (id, updates) => {
    const connections = get().connections.map((conn) =>
      conn.id === id ? { ...conn, ...updates, updatedAt: new Date().toISOString() } : conn
    );
    set({ connections });
    get().applyFilters();
    
    // Update selected connection if it's the one being updated
    const selected = get().selectedConnection;
    if (selected && selected.id === id) {
      set({ selectedConnection: { ...selected, ...updates } });
    }
  },

  deleteConnection: (id) => {
    const connections = get().connections.filter((conn) => conn.id !== id);
    set({ connections });
    get().applyFilters();
    
    // Clear selected if it was deleted
    const selected = get().selectedConnection;
    if (selected && selected.id === id) {
      set({ selectedConnection: null });
    }
  },

  setSelectedConnection: (connection) => {
    set({ selectedConnection: connection });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  setFilterTags: (tags) => {
    set({ filterTags: tags });
    get().applyFilters();
  },

  setFilterFavorites: (favorites) => {
    set({ filterFavorites: favorites });
    get().applyFilters();
  },

  applyFilters: () => {
    const { connections, searchQuery, filterTags, filterFavorites } = get();
    
    let filtered = [...connections];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conn) =>
          conn.name.toLowerCase().includes(query) ||
          conn.host.toLowerCase().includes(query) ||
          conn.username.toLowerCase().includes(query) ||
          conn.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by tags
    if (filterTags.length > 0) {
      filtered = filtered.filter((conn) =>
        filterTags.every((tag) => conn.tags?.includes(tag))
      );
    }

    // Filter by favorites
    if (filterFavorites !== null) {
      filtered = filtered.filter((conn) => conn.isFavorite === filterFavorites);
    }

    // Exclude soft-deleted items
    filtered = filtered.filter((conn) => !conn.deletedAt);

    set({ filteredConnections: filtered });
  },

  clearFilters: () => {
    set({
      searchQuery: '',
      filterTags: [],
      filterFavorites: null,
    });
    get().applyFilters();
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },
}));

