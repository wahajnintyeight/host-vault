import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { copyToClipboard, formatRecoveryCode } from '../../lib/utils';
import { useAppStore } from '../../store/appStore';

interface RecoveryCodeDisplayProps {
  codes: string[];
  onContinue: () => void;
}

export const RecoveryCodeDisplay: React.FC<RecoveryCodeDisplayProps> = ({
  codes,
  onContinue,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const { addToast } = useAppStore();

  const handleCopyCode = async (code: string, index: number) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      addToast({
        type: 'success',
        title: 'Copied',
        message: 'Recovery code copied to clipboard',
      });
    }
  };

  const handleCopyAll = async () => {
    const allCodes = codes.join('\n');
    const success = await copyToClipboard(allCodes);
    if (success) {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
      addToast({
        type: 'success',
        title: 'Copied',
        message: 'All recovery codes copied to clipboard',
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Save Your Recovery Codes</h2>
          <p className="text-text-secondary">
            These codes can be used to reset your master password if you forget it.
            Save them in a secure location - you won't be able to see them again.
          </p>
        </div>

        <div className="p-4 bg-warning/20 border border-warning rounded-md flex items-start gap-3">
          <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-warning">
            <p className="font-medium mb-1">Important:</p>
            <ul className="list-disc list-inside space-y-1 text-warning/90">
              <li>Each code can only be used once</li>
              <li>Store these codes in a secure password manager or safe location</li>
              <li>If you lose these codes and forget your password, you will lose access to your data</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {codes.map((code, index) => {
            const formattedCode = formatRecoveryCode(code);
            const isCopied = copiedIndex === index;

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-background rounded-md border border-border"
              >
                <code className="text-text-primary font-mono text-sm">{formattedCode}</code>
                <button
                  onClick={() => handleCopyCode(code, index)}
                  className="p-1 hover:bg-background-light rounded transition-colors"
                  title="Copy code"
                >
                  {isCopied ? (
                    <Check size={16} className="text-success" />
                  ) : (
                    <Copy size={16} className="text-text-muted" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleCopyAll}
            leftIcon={allCopied ? <Check size={16} /> : <Copy size={16} />}
          >
            {allCopied ? 'Copied All' : 'Copy All Codes'}
          </Button>
          <Button variant="primary" onClick={onContinue} className="flex-1">
            I've Saved My Codes
          </Button>
        </div>
      </div>
    </Card>
  );
};

