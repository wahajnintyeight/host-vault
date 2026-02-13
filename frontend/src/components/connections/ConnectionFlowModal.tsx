import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Lock, Key, FileKey, Loader, CheckCircle, AlertTriangle, Terminal, Server, Eye, EyeOff, FolderOpen } from 'lucide-react';
import type { SSHConnection } from '../../types';

export type AuthMethod = 'password' | 'key' | 'certificate' | 'none';

interface ConnectionFlowModalProps {
  isOpen: boolean;
  connection: SSHConnection | null;
  onClose: () => void;
  onConnect: (authMethod: AuthMethod, credentials: { password?: string; privateKey?: string; passphrase?: string }) => Promise<void>;
  isConnecting?: boolean;
  error?: string | null;
  hostVerified?: boolean; // If true, skip host verification step
}

type ConnectionStep = 'host-verification' | 'auth-selection' | 'auth-input' | 'connecting' | 'success' | 'error';

export const ConnectionFlowModal: React.FC<ConnectionFlowModalProps> = ({
  isOpen,
  connection,
  onClose,
  onConnect,
  isConnecting = false,
  error = null,
  hostVerified = false,
}) => {
  const [currentStep, setCurrentStep] = useState<ConnectionStep>('host-verification');
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<AuthMethod>('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [internalHostVerified, setInternalHostVerified] = useState(false);
  const autoConnectTriggeredRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-connect with saved credentials
  const handleAutoConnect = useCallback(async () => {
    if (!connection) return;
    
    const hasCredentials = connection.passwordEncrypted || connection.privateKeyEncrypted;
    if (!hasCredentials) return;

    // Prevent multiple calls for the same connection
    if (autoConnectTriggeredRef.current === connection.id) return;
    autoConnectTriggeredRef.current = connection.id;

    // Determine auth method based on available credentials
    const authMethod: AuthMethod = connection.privateKeyEncrypted ? 'key' : 'password';
    setSelectedAuthMethod(authMethod);

    // Credentials will be decrypted in the parent component
    // We just need to trigger the connection
    try {
      await onConnect(authMethod, {});
    } catch (error) {
      // If auto-connect fails, go back to auth input
      setCurrentStep('auth-input');
      autoConnectTriggeredRef.current = null; // Reset on error to allow retry
    }
  }, [connection, onConnect]);

  // Reset state when modal opens/closes or connection changes
  useEffect(() => {
    if (!isOpen || !connection) {
      autoConnectTriggeredRef.current = null;
      return;
    }

    // Reset the ref when connection changes
    if (autoConnectTriggeredRef.current !== connection.id) {
      autoConnectTriggeredRef.current = null;
    }

    setInternalHostVerified(hostVerified);
    setPassword('');
    setPrivateKey('');
    setPassphrase('');
    setSelectedAuthMethod('password');
    setShowPassword(false);

    const hasCredentials = connection.passwordEncrypted || connection.privateKeyEncrypted;

    // If host is verified and credentials exist, skip directly to connecting
    if (hostVerified && hasCredentials && autoConnectTriggeredRef.current !== connection.id) {
      setCurrentStep('connecting');
      // Automatically trigger connection with saved credentials
      // Use setTimeout to avoid infinite loop
      setTimeout(() => {
        handleAutoConnect();
      }, 0);
    } else if (hostVerified) {
      // Host verified but no credentials - show auth selection
      setCurrentStep('auth-selection');
    } else {
      // Host not verified yet
      setCurrentStep('host-verification');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, connection?.id, hostVerified]);

  // Handle step progression based on connection state
  useEffect(() => {
    if (isConnecting && currentStep === 'auth-input') {
      setCurrentStep('connecting');
    } else if (error && currentStep === 'connecting') {
      setCurrentStep('error');
    }
  }, [isConnecting, error, currentStep]);

  const handleHostVerified = () => {
    setInternalHostVerified(true);
    setCurrentStep('auth-selection');
  };

  const handleAuthMethodSelect = (method: AuthMethod) => {
    setSelectedAuthMethod(method);
    if (method === 'none') {
      // Skip auth-input step for 'none' auth method
      setCurrentStep('connecting');
    } else {
      setCurrentStep('auth-input');
    }
  };

  const handleBack = () => {
    if (currentStep === 'auth-input') {
      setCurrentStep('auth-selection');
    } else if (currentStep === 'auth-selection') {
      setCurrentStep('host-verification');
    }
  };

  const handleSubmit = async () => {
    try {
      await onConnect(selectedAuthMethod, {
        password: selectedAuthMethod === 'password' ? password : undefined,
        privateKey: selectedAuthMethod === 'key' || selectedAuthMethod === 'certificate' ? privateKey : undefined,
        passphrase: (selectedAuthMethod === 'key' || selectedAuthMethod === 'certificate') && passphrase ? passphrase : undefined,
      });
    } catch (err) {
      // Error is handled by parent component
      console.error('Connection failed:', err);
    }
  };

  const handleNoneConnect = async () => {
    try {
      await onConnect('none', {});
    } catch (err) {
      // Error is handled by parent component
      console.error('Connection failed:', err);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPrivateKey(content);
    };
    reader.onerror = () => {
      console.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const getStepIndex = (step: ConnectionStep): number => {
    const steps: ConnectionStep[] = ['host-verification', 'auth-selection', 'auth-input', 'connecting'];
    return steps.indexOf(step);
  };

  const getStepLabel = (step: ConnectionStep): string => {
    switch (step) {
      case 'host-verification': return 'Verify Host';
      case 'auth-selection': return 'Choose Auth';
      case 'auth-input': return 'Enter Credentials';
      case 'connecting': return 'Connecting';
      default: return '';
    }
  };

  if (!isOpen || !connection) return null;

  const steps = [
    { id: 'host-verification', label: 'Verify Host', icon: Shield },
    { id: 'auth-selection', label: 'Authenticate', icon: Lock },
    { id: 'connecting', label: 'Terminal', icon: Terminal },
  ];

  const currentStepIndex = getStepIndex(currentStep);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-background-light border border-border rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{connection.host}</h2>
              <p className="text-xs text-text-muted">SSH {connection.host}:{connection.port}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="p-1 rounded hover:bg-background-lighter text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Slider */}
        <div className="px-6 py-4 border-b border-border">
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.id} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-primary text-background'
                          : 'bg-background-lighter text-text-muted'
                      } ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-light' : ''}`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'text-text-primary' : 'text-text-muted'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Progress Bar */}
            <div className="relative h-1 bg-background-lighter rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 min-h-[300px]">
          {currentStep === 'host-verification' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Shield className="w-12 h-12 text-primary mx-auto" />
                <h3 className="text-lg font-semibold text-text-primary">Verify Host Key</h3>
                <p className="text-sm text-text-muted">
                  Verifying the authenticity of the host...
                </p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-text-muted mb-1">Host:</p>
                <p className="text-sm font-mono text-text-primary">{connection.host}:{connection.port}</p>
              </div>
              <button
                onClick={handleHostVerified}
                className="w-full px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all"
              >
                Host Verified - Continue
              </button>
            </div>
          )}

          {currentStep === 'auth-selection' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Lock className="w-12 h-12 text-primary mx-auto" />
                <h3 className="text-lg font-semibold text-text-primary">Choose Authentication Method</h3>
                <p className="text-sm text-text-muted">
                  Select how you want to authenticate to this server
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleAuthMethodSelect('password')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedAuthMethod === 'password'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <Lock className={`w-6 h-6 mx-auto mb-2 ${selectedAuthMethod === 'password' ? 'text-primary' : 'text-text-muted'}`} />
                  <p className={`text-sm font-medium ${selectedAuthMethod === 'password' ? 'text-primary' : 'text-text-primary'}`}>
                    Password
                  </p>
                </button>

                <button
                  onClick={() => handleAuthMethodSelect('key')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedAuthMethod === 'key'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <Key className={`w-6 h-6 mx-auto mb-2 ${selectedAuthMethod === 'key' ? 'text-primary' : 'text-text-muted'}`} />
                  <p className={`text-sm font-medium ${selectedAuthMethod === 'key' ? 'text-primary' : 'text-text-primary'}`}>
                    Public Key
                  </p>
                </button>

                <button
                  onClick={() => handleAuthMethodSelect('none')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedAuthMethod === 'none'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <Shield className={`w-6 h-6 mx-auto mb-2 ${selectedAuthMethod === 'none' ? 'text-primary' : 'text-text-muted'}`} />
                  <p className={`text-sm font-medium ${selectedAuthMethod === 'none' ? 'text-primary' : 'text-text-primary'}`}>
                    None
                  </p>
                  <p className={`text-xs mt-1 ${selectedAuthMethod === 'none' ? 'text-primary/70' : 'text-text-muted'}`}>
                    No auth
                  </p>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 px-4 py-2 text-sm bg-background-lighter text-text-secondary hover:text-text-primary rounded-lg transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => handleAuthMethodSelect(selectedAuthMethod)}
                  className="flex-1 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 'auth-input' && (
            <div className="space-y-4">
              {selectedAuthMethod === 'none' ? (
                <>
                  <div className="text-center space-y-2">
                    <Shield className="w-12 h-12 text-primary mx-auto" />
                    <h3 className="text-lg font-semibold text-text-primary">No Authentication</h3>
                    <p className="text-sm text-text-muted">
                      Connect without authentication (passwordless/public access)
                    </p>
                  </div>
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                    <p className="text-sm text-warning">
                      Warning: This will attempt to connect without any authentication. 
                      Only use this for servers configured to allow passwordless access.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleBack}
                      disabled={isConnecting}
                      className="flex-1 px-4 py-2 text-sm bg-background-lighter text-text-secondary hover:text-text-primary rounded-lg transition-all disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleNoneConnect}
                      disabled={isConnecting}
                      className="flex-1 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Connect
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    {selectedAuthMethod === 'password' ? (
                      <Lock className="w-12 h-12 text-primary mx-auto" />
                    ) : (
                      <Key className="w-12 h-12 text-primary mx-auto" />
                    )}
                    <h3 className="text-lg font-semibold text-text-primary">
                      {selectedAuthMethod === 'password' ? 'Enter Password' : 'Enter Private Key'}
                    </h3>
                    <p className="text-sm text-text-muted">
                      {selectedAuthMethod === 'password'
                        ? 'Enter your password to connect'
                        : 'Enter your private key to authenticate'}
                    </p>
                  </div>

                  {selectedAuthMethod === 'password' ? (
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          autoFocus
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
                          <FileKey className="w-3.5 h-3.5" />
                          Private Key
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <textarea
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                            rows={8}
                            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleBrowseClick}
                          className="mt-2 w-full px-3 py-2 text-xs bg-background-lighter text-text-secondary hover:text-text-primary rounded-lg transition-all flex items-center justify-center gap-2 border border-border hover:border-primary/50"
                        >
                          <FolderOpen className="w-4 h-4" />
                          Browse for key file...
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1.5">
                          Passphrase (optional)
                        </label>
                        <input
                          type="password"
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          placeholder="Enter passphrase if key is encrypted"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleBack}
                      disabled={isConnecting}
                      className="flex-1 px-4 py-2 text-sm bg-background-lighter text-text-secondary hover:text-text-primary rounded-lg transition-all disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isConnecting || (selectedAuthMethod === 'password' && !password) || ((selectedAuthMethod === 'key' || selectedAuthMethod === 'certificate') && !privateKey)}
                      className="flex-1 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Connect
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {currentStep === 'connecting' && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-text-primary">Connecting...</h3>
                <p className="text-sm text-text-muted">Establishing SSH connection</p>
              </div>
            </div>
          )}

          {currentStep === 'error' && error && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <AlertTriangle className="w-12 h-12 text-danger mx-auto" />
                <h3 className="text-lg font-semibold text-danger">Connection Failed</h3>
                <p className="text-sm text-text-muted">Unable to establish SSH connection</p>
              </div>
              <div className="bg-danger/5 border border-danger/20 rounded-lg p-4">
                <p className="text-sm text-danger font-mono break-all max-h-32 overflow-y-auto">{error}</p>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Go back to auth input to allow user to change credentials
                      setCurrentStep('auth-input');
                    }}
                    className="flex-1 px-4 py-2 text-sm bg-background-lighter text-text-secondary hover:text-text-primary rounded-lg transition-all"
                  >
                    Change Credentials
                  </button>
                  <button
                    onClick={() => {
                      // Go back to auth selection to change auth method
                      setCurrentStep('auth-selection');
                    }}
                    className="flex-1 px-4 py-2 text-sm bg-background-lighter text-text-secondary hover:text-text-primary rounded-lg transition-all"
                  >
                    Change Auth Method
                  </button>
                </div>
                <button
                  onClick={async () => {
                    // Try again with same credentials
                    setCurrentStep('auth-input');
                    // Small delay to allow state update, then retry
                    setTimeout(async () => {
                      await handleSubmit();
                    }, 100);
                  }}
                  className="w-full px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

