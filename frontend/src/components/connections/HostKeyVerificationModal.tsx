import React, { useState, useEffect } from 'react';
import { X, Shield, AlertTriangle, CheckCircle, Loader, Copy } from 'lucide-react';

// Access Wails functions through window object to avoid TypeScript import errors
// These functions will be available after bindings are regenerated with 'wails dev' or 'wails build'
const getSSHHostKeyInfo = (host: string, port: number): Promise<any> | undefined => {
  const wailsApp = (window as any)?.go?.main?.App;
  if (wailsApp?.GetSSHHostKeyInfo) {
    return wailsApp.GetSSHHostKeyInfo(host, port);
  }
  return undefined;
};

const acceptSSHHostKey = (host: string, port: number, keyBase64: string): Promise<void> | undefined => {
  const wailsApp = (window as any)?.go?.main?.App;
  if (wailsApp?.AcceptSSHHostKey) {
    return wailsApp.AcceptSSHHostKey(host, port, keyBase64);
  }
  return undefined;
};

export interface HostKeyInfo {
  fingerprintSHA256: string;
  fingerprintMD5: string;
  keyType: string;
  keyBase64: string;
  isKnown: boolean;
  isMismatch: boolean;
  expectedFingerprint: string;
}

interface HostKeyVerificationModalProps {
  isOpen: boolean;
  host: string;
  port: number;
  onAccept: () => void;
  onReject: () => void;
}

export const HostKeyVerificationModal: React.FC<HostKeyVerificationModalProps> = ({
  isOpen,
  host,
  port,
  onAccept,
  onReject,
}) => {
  const [hostKeyInfo, setHostKeyInfo] = useState<HostKeyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHostKeyInfo();
    } else {
      // Reset state when modal closes
      setHostKeyInfo(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen, host, port]);

  const fetchHostKeyInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = getSSHHostKeyInfo(host, port);
      if (!result) {
        throw new Error('Wails bindings not regenerated. Please run "wails dev" or "wails build"');
      }
      const info = await result;
      setHostKeyInfo(info as HostKeyInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get host key information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!hostKeyInfo) return;

    try {
      const result = acceptSSHHostKey(host, port, hostKeyInfo.keyBase64);
      if (!result) {
        throw new Error('Wails bindings not regenerated. Please run "wails dev" or "wails build"');
      }
      await result;
      onAccept();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept host key');
    }
  };

  const handleCopyFingerprint = (fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFingerprint = (fp: string, type: 'sha256' | 'md5') => {
    if (type === 'sha256') {
      // SHA256 fingerprints are base64 encoded, format as SHA256:xxxxx
      return `SHA256:${fp}`;
    }
    // MD5 fingerprints are already formatted
    return fp;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-light border border-border rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-semibold text-text-primary">
              Verify SSH Host Key
            </h2>
          </div>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="p-1 rounded hover:bg-background-lighter text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-3 text-text-muted">Retrieving host key information...</span>
            </div>
          ) : error ? (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-error mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-text-secondary">{error}</p>
              <button
                onClick={fetchHostKeyInfo}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : hostKeyInfo ? (
            <>
              {/* Warning for mismatch */}
              {hostKeyInfo.isMismatch && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-error mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Host Key Mismatch!</span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    The host key has changed. This could indicate a man-in-the-middle attack.
                    Only continue if you are sure this is the correct host.
                  </p>
                </div>
              )}

              {/* Connection info */}
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-text-muted mb-1">Connecting to:</p>
                <p className="text-sm font-mono text-text-primary">
                  {host}:{port}
                </p>
              </div>

              {/* Host key information */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-text-muted mb-2">
                    The authenticity of host '{host}' can't be established.
                  </p>
                  <p className="text-xs text-text-secondary mb-4">
                    {hostKeyInfo.isKnown
                      ? 'This host key is already known, but the fingerprint has changed.'
                      : 'This is the first time connecting to this host.'}
                  </p>
                </div>

                <div className="bg-background rounded-lg p-4 border border-border space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-text-muted">
                        Key Type
                      </label>
                    </div>
                    <p className="text-sm font-mono text-text-primary">{hostKeyInfo.keyType}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-text-muted">
                        SHA256 Fingerprint
                      </label>
                      <button
                        onClick={() => handleCopyFingerprint(hostKeyInfo.fingerprintSHA256)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm font-mono text-text-primary break-all">
                      {formatFingerprint(hostKeyInfo.fingerprintSHA256, 'sha256')}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-text-muted">
                        MD5 Fingerprint (legacy)
                      </label>
                      <button
                        onClick={() => handleCopyFingerprint(hostKeyInfo.fingerprintMD5)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm font-mono text-text-primary">
                      {formatFingerprint(hostKeyInfo.fingerprintMD5, 'md5')}
                    </p>
                  </div>

                  {hostKeyInfo.isKnown && hostKeyInfo.expectedFingerprint && (
                    <div>
                      <label className="text-xs font-medium text-text-muted mb-1 block">
                        Expected Fingerprint
                      </label>
                      <p className="text-sm font-mono text-text-primary break-all">
                        SHA256:{hostKeyInfo.expectedFingerprint}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                  <p className="text-xs text-text-secondary">
                    <strong className="text-warning">Warning:</strong> Only continue if you are
                    sure this is the correct host. Accepting an unknown or changed host key could
                    expose you to security risks.
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/50">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={isLoading || !hostKeyInfo}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-background font-medium rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Accept & Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

