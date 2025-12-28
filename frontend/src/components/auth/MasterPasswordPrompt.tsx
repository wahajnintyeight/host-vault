import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { verifyMasterPassword, deriveKeyFromPassword } from '../../lib/encryption/password';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { Lock, AlertCircle } from 'lucide-react';

interface MasterPasswordPromptProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const MasterPasswordPrompt: React.FC<MasterPasswordPromptProps> = ({
  isOpen,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setMasterPasswordUnlocked } = useAuthStore();
  const { addToast } = useAppStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const storedHash = localStorage.getItem('master_password_hash');
      if (!storedHash) {
        // No master password set, redirect to setup
        navigate(ROUTES.SETUP);
        return;
      }

      const isValid = await verifyMasterPassword(password, storedHash);
      if (isValid) {
        // Derive and store the encryption key
        const [salt] = storedHash.split(':');
        const { key } = await deriveKeyFromPassword(password, salt);
        localStorage.setItem('vault_encryption_key', key);

        setMasterPasswordUnlocked(true);
        addToast({
          type: 'success',
          title: 'Unlocked',
          message: 'Master password verified successfully',
        });
        setPassword('');
        onSuccess();
      } else {
        setError('Incorrect master password. Please try again.');
        addToast({
          type: 'error',
          title: 'Incorrect Password',
          message: 'The master password you entered is incorrect',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify password');
      addToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.message || 'Failed to verify password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Navigate to recovery code entry page
    navigate('/recover');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing without password
      title="Enter Master Password"
      showCloseButton={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-primary/20 border border-primary rounded-md">
          <Lock className="text-primary" size={20} />
          <p className="text-sm text-text-secondary">
            Enter your master password to unlock your encrypted data
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-danger/20 border border-danger rounded-md">
            <AlertCircle className="text-danger flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <Input
          label="Master Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your master password"
          autoFocus
          required
          error={error || undefined}
        />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleForgotPassword}
            className="flex-1"
          >
            Forgot Password?
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!password}
            className="flex-1"
          >
            Unlock
          </Button>
        </div>
      </form>
    </Modal>
  );
};

