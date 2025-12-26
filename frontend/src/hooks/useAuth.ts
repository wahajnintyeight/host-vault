import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ROUTES } from '../lib/constants';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isInitialized,
    masterPasswordSet,
    masterPasswordUnlocked,
    initialize,
  } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const requireAuth = () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return false;
    }
    return true;
  };

  const requireMasterPassword = () => {
    if (!masterPasswordSet) {
      navigate(ROUTES.SETUP);
      return false;
    }
    if (!masterPasswordUnlocked) {
      // Show master password prompt (handled by parent component)
      return false;
    }
    return true;
  };

  return {
    user,
    isAuthenticated,
    masterPasswordSet,
    masterPasswordUnlocked,
    requireAuth,
    requireMasterPassword,
  };
};

