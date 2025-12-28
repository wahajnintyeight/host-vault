import React, { useState, useRef, useEffect } from 'react';
import { Search, Code2, X, ChevronUp, ChevronDown, Plus, Play, Trash2, Edit2, Check, Loader2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TerminalHandle } from './Terminal';
import { useSnippetsStore, Snippet } from '../../store/snippetsStore';

interface TerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  terminalRef: React.RefObject<TerminalHandle>;
}

type TabType = 'search' | 'commands';

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  isOpen,
  onClose,
  terminalRef,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { snippets, isLoading, addSnippet, updateSnippet, deleteSnippet, reorderSnippets, loadSnippets } = useSnippetsStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCommand, setNewCommand] = useState({ name: '', command: '', description: '' });
  const [commandSearch, setCommandSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredSnippets = snippets.filter((s) =>
    s.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
    s.command.toLowerCase().includes(commandSearch.toLowerCase()) ||
    s.description?.toLowerCase().includes(commandSearch.toLowerCase())
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderSnippets(active.id as string, over.id as string);
    }
  };

  // Load commands when drawer opens or tab switches to commands
  useEffect(() => {
    if (isOpen && activeTab === 'commands') {
      loadSnippets();
    }
  }, [isOpen, activeTab, loadSnippets]);

  useEffect(() => {
    if (isOpen && activeTab === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!searchQuery) {
      terminalRef.current?.clearSearch();
      setMatchCount(null);
      return;
    }
    const timer = setTimeout(() => {
      if (terminalRef.current && searchQuery) {
        const found = terminalRef.current.search(searchQuery);
        setMatchCount(found ? 1 : 0);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, terminalRef]);

  const handleSearchNext = () => {
    if (searchQuery) terminalRef.current?.searchNext(searchQuery);
  };

  const handleSearchPrevious = () => {
    if (searchQuery) terminalRef.current?.searchPrevious(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setMatchCount(null);
    terminalRef.current?.clearSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.shiftKey ? handleSearchPrevious() : handleSearchNext();
    } else if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  const handleAddCommand = () => {
    if (newCommand.name && newCommand.command) {
      addSnippet(newCommand);
      setNewCommand({ name: '', command: '', description: '' });
      setIsAdding(false);
    }
  };

  const handleRunCommand = (command: string) => {
    terminalRef.current?.writeCommand(command + '\r');
  };

  const handleEditCommand = (snippet: Snippet) => {
    setEditingId(snippet.id);
    setNewCommand({ name: snippet.name, command: snippet.command, description: snippet.description || '' });
  };

  const handleSaveEdit = (id: string) => {
    updateSnippet(id, newCommand);
    setEditingId(null);
    setNewCommand({ name: '', command: '', description: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-72 bg-background-light border-l border-border flex flex-col z-30">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'search'
                ? 'bg-primary/20 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-background-lighter'
            }`}
          >
            <Search className="w-3.5 h-3.5 inline mr-1.5" />
            Search
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'commands'
                ? 'bg-primary/20 text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-background-lighter'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 inline mr-1.5" />
            Commands
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-background-lighter text-text-muted hover:text-text-primary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'search' && (
          <div className="space-y-3">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search in terminal..."
                className="w-full px-3 py-2 pr-8 text-sm bg-background border border-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSearchPrevious}
                disabled={!searchQuery}
                title="Previous match (Shift+Enter)"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-background-lighter rounded text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={handleSearchNext}
                disabled={!searchQuery}
                title="Next match (Enter)"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-background-lighter rounded text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            {matchCount !== null && (
              <p className="text-xs text-text-muted text-center">
                {matchCount > 0 ? 'Match found' : 'No matches found'}
              </p>
            )}
          </div>
        )}

        {activeTab === 'commands' && (
          <div className="space-y-3">
            {/* Command Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Search commands..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed border-border rounded text-text-secondary hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Command
              </button>
            )}
            {isAdding && (
              <div className="p-3 bg-background rounded border border-border space-y-2">
                <input
                  type="text"
                  value={newCommand.name}
                  onChange={(e) => setNewCommand({ ...newCommand, name: e.target.value })}
                  placeholder="Name"
                  className="w-full px-2 py-1.5 text-xs bg-background-lighter border border-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={newCommand.command}
                  onChange={(e) => setNewCommand({ ...newCommand, command: e.target.value })}
                  placeholder="Command"
                  className="w-full px-2 py-1.5 text-xs bg-background-lighter border border-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-primary font-mono"
                />
                <input
                  type="text"
                  value={newCommand.description}
                  onChange={(e) => setNewCommand({ ...newCommand, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-2 py-1.5 text-xs bg-background-lighter border border-border rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCommand}
                    disabled={!newCommand.name || !newCommand.command}
                    className="flex-1 px-2 py-1.5 text-xs bg-primary text-background rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setIsAdding(false); setNewCommand({ name: '', command: '', description: '' }); }}
                    className="flex-1 px-2 py-1.5 text-xs bg-background-lighter text-text-secondary rounded hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}
              {!isLoading && snippets.length === 0 && !isAdding && (
                <p className="text-xs text-text-muted text-center py-4">No commands yet. Add your first one!</p>
              )}
              {!isLoading && snippets.length > 0 && filteredSnippets.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">No commands match your search.</p>
              )}
              {!commandSearch ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={snippets.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {snippets.map((snippet) => (
                      <SortableCommandItem
                        key={snippet.id}
                        snippet={snippet}
                        editingId={editingId}
                        newCommand={newCommand}
                        setNewCommand={setNewCommand}
                        handleSaveEdit={handleSaveEdit}
                        setEditingId={setEditingId}
                        handleRunCommand={handleRunCommand}
                        handleEditCommand={handleEditCommand}
                        deleteSnippet={deleteSnippet}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                filteredSnippets.map((snippet) => (
                  <CommandItem
                    key={snippet.id}
                    snippet={snippet}
                    editingId={editingId}
                    newCommand={newCommand}
                    setNewCommand={setNewCommand}
                    handleSaveEdit={handleSaveEdit}
                    setEditingId={setEditingId}
                    handleRunCommand={handleRunCommand}
                    handleEditCommand={handleEditCommand}
                    deleteSnippet={deleteSnippet}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// Sortable command item with drag handle
interface CommandItemProps {
  snippet: Snippet;
  editingId: string | null;
  newCommand: { name: string; command: string; description: string };
  setNewCommand: (cmd: { name: string; command: string; description: string }) => void;
  handleSaveEdit: (id: string) => void;
  setEditingId: (id: string | null) => void;
  handleRunCommand: (command: string) => void;
  handleEditCommand: (snippet: Snippet) => void;
  deleteSnippet: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const CommandItem: React.FC<CommandItemProps> = ({
  snippet,
  editingId,
  newCommand,
  setNewCommand,
  handleSaveEdit,
  setEditingId,
  handleRunCommand,
  handleEditCommand,
  deleteSnippet,
  dragHandleProps,
}) => (
  <div className="p-2 bg-background rounded border border-border group">
    {editingId === snippet.id ? (
      <div className="space-y-2">
        <input
          type="text"
          value={newCommand.name}
          onChange={(e) => setNewCommand({ ...newCommand, name: e.target.value })}
          className="w-full px-2 py-1 text-xs bg-background-lighter border border-border rounded text-text-primary focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          value={newCommand.command}
          onChange={(e) => setNewCommand({ ...newCommand, command: e.target.value })}
          className="w-full px-2 py-1 text-xs bg-background-lighter border border-border rounded text-text-primary font-mono focus:outline-none focus:border-primary"
        />
        <div className="flex gap-1">
          <button onClick={() => handleSaveEdit(snippet.id)} className="p-1 rounded bg-primary/20 text-primary hover:bg-primary/30">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={() => { setEditingId(null); setNewCommand({ name: '', command: '', description: '' }); }} className="p-1 rounded bg-background-lighter text-text-muted hover:text-text-primary">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    ) : (
      <div className="flex items-start">
        {dragHandleProps && (
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 mr-1 text-text-muted hover:text-text-secondary">
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">{snippet.name}</p>
          <p className="text-xs text-text-muted font-mono truncate mt-0.5">{snippet.command}</p>
          {snippet.description && <p className="text-xs text-text-muted/70 truncate mt-0.5">{snippet.description}</p>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <button onClick={() => handleRunCommand(snippet.command)} className="p-1 rounded bg-success/20 text-success hover:bg-success/30" title="Run command">
            <Play className="w-3 h-3" />
          </button>
          <button onClick={() => handleEditCommand(snippet)} className="p-1 rounded bg-background-lighter text-text-muted hover:text-text-primary" title="Edit command">
            <Edit2 className="w-3 h-3" />
          </button>
          <button onClick={() => deleteSnippet(snippet.id)} className="p-1 rounded bg-danger/20 text-danger hover:bg-danger/30" title="Delete command">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    )}
  </div>
);

const SortableCommandItem: React.FC<Omit<CommandItemProps, 'dragHandleProps'>> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.snippet.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CommandItem {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};
