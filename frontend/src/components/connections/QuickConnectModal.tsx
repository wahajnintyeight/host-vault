import React, { useState } from 'react';
import { X, Zap, Loader, Copy, Check } from 'lucide-react';

interface QuickConnectModalProps {
  isOpen: boolean;
  isConnecting: boolean;
  onConnect: (username: string, host: string, port: number) => void;
  onClose: () => void;
}

export const QuickConnectModal: React.FC<QuickConnectModalProps> = ({
  isOpen,
  isConnecting,
  onConnect,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [showCopied, setShowCopied] = useState(false);

  // Parse SSH command string: ssh username@host -p port
  const parseSSHCommand = (cmd: string): { username: string; host: string; port: number } | null => {
    const trimmed = cmd.trim();
    
    // Match: ssh [user@]host [-p port]
    const sshRegex = /^ssh\s+(?:([^@\s]+)@)?([^\s-]+)(?:\s+-p\s+(\d+))?$/i;
    const match = trimmed.match(sshRegex);
    
    if (!match) return null;
    
    const username = match[1] || 'root';
    const host = match[2];
    const port = match[3] ? parseInt(match[3], 10) : 22;
    
    return { username, host, port };
  };

  const handleConnect = () => {
    const parsed = parseSSHCommand(input);
    if (parsed) {
      onConnect(parsed.username, parsed.host, parsed.port);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConnecting) {
      handleConnect();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const parsed = parseSSHCommand(input);
  const isValid = parsed !== null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-light border border-border rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Quick Connect</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="p-1 rounded hover:bg-background-lighter text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-text-muted">
              Paste your SSH command or connection string:
            </p>
          </div>

          {/* Input Field */}
          <div>
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ssh ubuntu@192.168.1.100 -p 22"
                disabled={isConnecting}
                autoFocus
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm disabled:opacity-50 font-mono"
              />
              <button
                onClick={handlePaste}
                disabled={isConnecting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-background-lighter text-text-muted hover:text-text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all disabled:opacity-50"
                title="Paste from clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Parsed Info */}
          {input && (
            <div className={`rounded-lg p-3 border ${
              isValid
                ? 'bg-success/10 border-success/30'
                : 'bg-danger/10 border-danger/30'
            }`}>
              {isValid ? (
                <div className="space-y-1 text-xs">
                  <p className="text-success font-medium">✓ Valid SSH command</p>
                  <div className="text-text-secondary space-y-0.5">
                    <p>User: <span className="text-text-primary font-mono">{parsed.username}</span></p>
                    <p>Host: <span className="text-text-primary font-mono">{parsed.host}</span></p>
                    <p>Port: <span className="text-text-primary font-mono">{parsed.port}</span></p>
                  </div>
                </div>
              ) : (
                <p className="text-danger text-xs font-medium">✗ Invalid format. Use: ssh user@host -p port</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/50">
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={!isValid || isConnecting}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Connect
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
