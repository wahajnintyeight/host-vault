import React, { useState } from 'react';
import { X, Lock, Loader } from 'lucide-react';

interface PasswordPromptModalProps {
  isOpen: boolean;
  isConnecting: boolean;
  host: string;
  username: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({
  isOpen,
  isConnecting,
  host,
  username,
  onSubmit,
  onCancel,
}) => {
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    onSubmit(password);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConnecting) {
      handleSubmit();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-light border border-border rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Authentication Required</h2>
          <button
            onClick={onCancel}
            disabled={isConnecting}
            className="p-1 rounded hover:bg-background-lighter text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-background rounded-lg p-4 border border-border">
            <p className="text-sm text-text-muted mb-2">Connecting to:</p>
            <p className="text-sm font-mono text-text-primary">
              {username}@{host}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your password"
              disabled={isConnecting}
              autoFocus
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm disabled:opacity-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/50">
          <button
            onClick={onCancel}
            disabled={isConnecting}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Connect
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
