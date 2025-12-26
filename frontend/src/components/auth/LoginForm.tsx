import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { initiateGoogleOAuth, handleGoogleCallback } from '../../lib/api/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { Chrome, User } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth, setGuestMode } = useAuthStore();
  const { addToast } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth callback
  React.useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleOAuthCallback(code);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const authData = await handleGoogleCallback(code);
      setAuth(authData);
      addToast({
        type: 'success',
        title: 'Login Successful',
        message: 'Welcome to Host Vault!',
      });
      navigate(ROUTES.SETUP);
    } catch (err: any) {
      setError(err.message || 'Failed to complete login');
      addToast({
        type: 'error',
        title: 'Login Failed',
        message: err.message || 'Failed to complete login',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const oauthUrl = await initiateGoogleOAuth();
      // In a desktop app, this would open the system browser
      // For now, we'll redirect to the URL
      window.location.href = oauthUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Google login');
      addToast({
        type: 'error',
        title: 'Login Failed',
        message: err.message || 'Failed to initiate Google login',
      });
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    setGuestMode(true);
    addToast({
      type: 'info',
      title: 'Guest Mode Enabled',
      message: 'You can use all features except cloud sync',
    });
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome to Host Vault</h2>
          <p className="text-text-secondary">Sign in to manage your SSH connections</p>
        </div>

        {error && (
          <div className="p-3 bg-danger/20 border border-danger rounded-md">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleGoogleLogin}
          isLoading={isLoading}
          leftIcon={<Chrome size={20} />}
        >
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background-light text-gray-400">OR</span>
          </div>
        </div>

        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={handleGuestMode}
          leftIcon={<User size={20} />}
        >
          Continue as Guest
        </Button>

        <div className="p-3 bg-primary/20 border border-primary rounded-md">
          <p className="text-xs text-text-secondary">
            <strong className="text-primary">Guest Mode:</strong> Use all features locally without cloud sync. 
            Your data stays on this device only.
          </p>
        </div>

        <div className="text-center text-sm text-text-muted">
          <p>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </Card>
  );
};

