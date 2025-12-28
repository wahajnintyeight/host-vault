import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Play,
  Edit2,
  Trash2,
  Copy,
  Download,
  Upload,
  Code2,
  Clock,
  Loader2,
  X,
  Check,
  Terminal,
} from 'lucide-react';
import { useSnippetsStore, Snippet } from '../store/snippetsStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';
import { useTerminalStore } from '../store/terminalStore';

export const CommandsPage: React.FC = () => {
  const navigate = useNavigate();
  const { snippets, isLoading, loadSnippets, addSnippet, updateSnippet, deleteSnippet, exportSnippets, importSnippets } = useSnippetsStore();
  const { tabs, createLocalTerminal } = useTerminalStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Snippet | null>(null);
  const [formData, setFormData] = useState({ name: '', command: '', description: '' });

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  const filteredCommands = snippets.filter((cmd) =>
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.name || !formData.command) return;
    if (editingCommand) {
      await updateSnippet(editingCommand.id, formData);
    } else {
      await addSnippet(formData);
    }
    setFormData({ name: '', command: '', description: '' });
    setIsAddModalOpen(false);
    setEditingCommand(null);
  };

  const handleEdit = (cmd: Snippet) => {
    setEditingCommand(cmd);
    setFormData({ name: cmd.name, command: cmd.command, description: cmd.description || '' });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteSnippet(id);
  };

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  const handleRunCommand = async (command: string) => {
    if (tabs.length === 0) {
      await createLocalTerminal();
    }
    navigate(ROUTES.TERMINAL);
    // Small delay to ensure terminal is ready
    setTimeout(() => {
      const { WriteToTerminal } = window as any;
      const activeTab = useTerminalStore.getState().tabs.find(t => t.id === useTerminalStore.getState().activeTabId);
      if (activeTab) {
        WriteToTerminal(activeTab.sessionId, command + '\r');
      }
    }, 300);
  };

  const handleExport = () => {
    const data = exportSnippets();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commands.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        await importSnippets(text);
      }
    };
    input.click();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Code2 className="w-7 h-7 text-primary" />
            Commands
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Save and manage your frequently used terminal commands
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-background-lighter rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-all"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            disabled={snippets.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-background-lighter rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => { setEditingCommand(null); setFormData({ name: '', command: '', description: '' }); setIsAddModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Command
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search commands..."
          className="w-full pl-10 pr-4 py-2.5 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Commands Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredCommands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-background-lighter flex items-center justify-center mb-4">
            <Code2 className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {searchQuery ? 'No commands found' : 'No commands yet'}
          </h3>
          <p className="text-text-muted text-sm max-w-sm">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Save your frequently used terminal commands for quick access'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all"
            >
              <Plus className="w-4 h-4" />
              Add your first command
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommands.map((cmd) => (
            <CommandCard
              key={cmd.id}
              command={cmd}
              onEdit={() => handleEdit(cmd)}
              onDelete={() => handleDelete(cmd.id)}
              onCopy={() => handleCopy(cmd.command)}
              onRun={() => handleRunCommand(cmd.command)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background-light border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingCommand ? 'Edit Command' : 'Add New Command'}
              </h2>
              <button
                onClick={() => { setIsAddModalOpen(false); setEditingCommand(null); }}
                className="p-1 rounded hover:bg-background-lighter text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Git Status"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Command</label>
                <textarea
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  placeholder="e.g., git status"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors font-mono text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this command does"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/50">
              <button
                onClick={() => { setIsAddModalOpen(false); setEditingCommand(null); }}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.command}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                {editingCommand ? 'Save Changes' : 'Add Command'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CommandCardProps {
  command: Snippet;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onRun: () => void;
  formatDate: (timestamp: number) => string;
}

const CommandCard: React.FC<CommandCardProps> = ({ command, onEdit, onDelete, onCopy, onRun, formatDate }) => {
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <div className="group bg-background-light border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">{command.name}</h3>
          {command.description && (
            <p className="text-xs text-text-muted mt-0.5 truncate">{command.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-background-lighter text-text-muted hover:text-text-primary transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="bg-background rounded-lg p-3 mb-3 border border-border/50">
        <code className="text-sm text-primary font-mono break-all line-clamp-2">{command.command}</code>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Clock className="w-3 h-3" />
          {formatDate(command.createdAt)}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-background-lighter text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
            title="Copy to clipboard"
          >
            {showCopied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            {showCopied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Run in terminal"
          >
            <Terminal className="w-3 h-3" />
            Run
          </button>
        </div>
      </div>
    </div>
  );
};
