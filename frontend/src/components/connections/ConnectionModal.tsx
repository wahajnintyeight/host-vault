import React, { useState } from 'react';
import {
  X,
  Check,
  Server,
  Key,
  Lock,
  FileKey,
  Shield,
  Tag,
  FolderOpen,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { SSHConnection } from '../../types';

export type AuthMethod = 'password' | 'key' | 'certificate';

export interface ConnectionFormData {
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  password: string;
  privateKey: string;
  passphrase: string;
  certificate: string;
  tags: string[];
  description: string;
  group: string;
}

export const initialFormData: ConnectionFormData = {
  name: '',
  host: '',
  port: 22,
  username: '',
  authMethod: 'password',
  password: '',
  privateKey: '',
  passphrase: '',
  certificate: '',
  tags: [],
  description: '',
  group: '',
};

interface ConnectionModalProps {
  isOpen: boolean;
  editingConnection: SSHConnection | null;
  onSave: (formData: ConnectionFormData) => void;
  onClose: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  editingConnection,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<ConnectionFormData>(() => {
    if (editingConnection) {
      return {
        name: editingConnection.name,
        host: editingConnection.host,
        port: editingConnection.port,
        username: editingConnection.username,
        authMethod: editingConnection.privateKeyEncrypted ? 'key' : 'password',
        password: '',
        privateKey: editingConnection.privateKeyEncrypted || '',
        passphrase: '',
        certificate: '',
        tags: editingConnection.tags || [],
        description: '',
        group: '',
      };
    }
    return initialFormData;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Reset form when modal opens/closes or editing connection changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingConnection) {
        setFormData({
          name: editingConnection.name,
          host: editingConnection.host,
          port: editingConnection.port,
          username: editingConnection.username,
          authMethod: editingConnection.privateKeyEncrypted ? 'key' : 'password',
          password: '',
          privateKey: editingConnection.privateKeyEncrypted || '',
          passphrase: '',
          certificate: '',
          tags: editingConnection.tags || [],
          description: '',
          group: '',
        });
      } else {
        setFormData(initialFormData);
      }
      setShowPassword(false);
      setTagInput('');
    }
  }, [isOpen, editingConnection]);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleSave = () => {
    onSave(formData);
  };

  const isValid = formData.name.trim() && formData.host.trim() && formData.username.trim();

  const authMethods: { value: AuthMethod; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'password', label: 'Password', icon: <Lock className="w-4 h-4" />, description: 'Authenticate with username and password' },
    { value: 'key', label: 'SSH Key', icon: <Key className="w-4 h-4" />, description: 'Authenticate with private key' },
    { value: 'certificate', label: 'Certificate', icon: <FileKey className="w-4 h-4" />, description: 'Authenticate with SSH certificate' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-light border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {editingConnection ? 'Edit Connection' : 'New SSH Connection'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-background-lighter text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Server className="w-4 h-4" />
              Address
            </h3>
            <div className="bg-background rounded-lg p-4 border border-border space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Host / IP Address</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="192.168.1.100 or example.com"
                    className="w-full px-3 py-2 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
                    className="w-full px-3 py-2 bg-background-light border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* General Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Shield className="w-4 h-4" />
              General
            </h3>
            <div className="bg-background rounded-lg p-4 border border-border space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Label / Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Production Server"
                  className="w-full px-3 py-2 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Group (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  placeholder="Development, Production, etc."
                  className="w-full px-3 py-2 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Tags
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                  <button
                    onClick={handleAddTag}
                    type="button"
                    className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded"
                      >
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-danger">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Credentials Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Key className="w-4 h-4" />
              Credentials
            </h3>
            <div className="bg-background rounded-lg p-4 border border-border space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="root"
                  className="w-full px-3 py-2 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>

              {/* Auth Method Selection */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Authentication Method</label>
                <div className="space-y-2">
                  {authMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, authMethod: method.value })}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        formData.authMethod === method.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 bg-background-light'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${formData.authMethod === method.value ? 'bg-primary/20 text-primary' : 'bg-background-lighter text-text-muted'}`}>
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${formData.authMethod === method.value ? 'text-primary' : 'text-text-primary'}`}>
                          {method.label}
                        </p>
                        <p className="text-xs text-text-muted">{method.description}</p>
                      </div>
                      {formData.authMethod === method.value && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password Input */}
              {formData.authMethod === 'password' && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 pr-10 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Key Input */}
              {formData.authMethod === 'key' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Private Key</label>
                    <textarea
                      value={formData.privateKey}
                      onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                      placeholder="Paste your private key or browse to select file..."
                      rows={4}
                      className="w-full px-3 py-2 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm font-mono resize-none"
                    />
                    <button 
                      type="button"
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs bg-background-lighter rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Browse for key file
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Passphrase (optional)</label>
                    <input
                      type="password"
                      value={formData.passphrase}
                      onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                      placeholder="Key passphrase if encrypted"
                      className="w-full px-3 py-2 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                    />
                  </div>
                </>
              )}

              {/* Certificate Input */}
              {formData.authMethod === 'certificate' && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Certificate</label>
                  <textarea
                    value={formData.certificate}
                    onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
                    placeholder="Paste your certificate or browse to select file..."
                    rows={4}
                    className="w-full px-3 py-2 bg-background-light border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm font-mono resize-none"
                  />
                  <button 
                    type="button"
                    className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs bg-background-lighter rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Browse for certificate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            {editingConnection ? 'Save Changes' : 'Create Connection'}
          </button>
        </div>
      </div>
    </div>
  );
};
