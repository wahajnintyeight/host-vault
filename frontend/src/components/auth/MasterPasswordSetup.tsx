import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { calculatePasswordStrength, hashMasterPassword } from '../../lib/encryption/password';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { generateRecoveryCodes } from '../../lib/api/auth';
import { RecoveryCodeDisplay } from './RecoveryCodeDisplay';
import { ROUTES } from '../../lib/constants';
import { useNavigate } from 'react-router-dom';

export const MasterPasswordSetup: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setMasterPasswordSet } = useAuthStore();
  const { addToast } = useAppStore();
  const navigate = useNavigate();

  const passwordStrength = React.useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isValid = passwordStrength.score >= 60 && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      setError('Please ensure password meets all requirements and matches confirmation');
      return;
    }

    setIsLoading(true);
    try {
      // Hash and store master password
      const passwordHash = await hashMasterPassword(password);
      // Store hash (in production, this would be stored securely)
      localStorage.setItem('master_password_hash', passwordHash);

      // Generate recovery codes
      const codesResponse = await generateRecoveryCodes();
      setRecoveryCodes(codesResponse.codes);
      setShowRecoveryCodes(true);

      setMasterPasswordSet(true);
      addToast({
        type: 'success',
        title: 'Master Password Set',
        message: 'Your master password has been set successfully',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to set master password');
      addToast({
        type: 'error',
        title: 'Setup Failed',
        message: err.message || 'Failed to set master password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    navigate(ROUTES.DASHBOARD);
  };

  if (showRecoveryCodes) {
    return (
      <RecoveryCodeDisplay
        codes={recoveryCodes}
        onContinue={handleContinue}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Set Master Password</h2>
          <p className="text-text-secondary text-sm">
            Your master password encrypts all your SSH keys and passwords locally.
            Make sure to choose a strong password.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-danger/20 border border-danger rounded-md">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <Input
          label="Master Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter a strong password"
          required
          error={
            password.length > 0 && passwordStrength.score < 60
              ? passwordStrength.feedback[0]
              : undefined
          }
        />

        {password.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Password Strength</span>
              <span
                className={
                  passwordStrength.score >= 80
                    ? 'text-success'
                    : passwordStrength.score >= 60
                    ? 'text-warning'
                    : 'text-danger'
                }
              >
                {passwordStrength.score >= 80
                  ? 'Strong'
                  : passwordStrength.score >= 60
                  ? 'Moderate'
                  : 'Weak'}
              </span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  passwordStrength.score >= 80
                    ? 'bg-success'
                    : passwordStrength.score >= 60
                    ? 'bg-warning'
                    : 'bg-danger'
                }`}
                style={{ width: `${passwordStrength.score}%` }}
              />
            </div>
            {passwordStrength.feedback.length > 1 && (
              <ul className="text-xs text-text-muted space-y-1 mt-2">
                {passwordStrength.feedback.slice(1).map((feedback, idx) => (
                  <li key={idx}>• {feedback}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          error={
            confirmPassword.length > 0 && !passwordsMatch
              ? 'Passwords do not match'
              : undefined
          }
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isLoading}
          disabled={!isValid}
        >
          Set Master Password
        </Button>
      </form>
    </Card>
  );
};

