import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ROUTES } from '../lib/constants';
import { MasterPasswordPrompt } from './auth/MasterPasswordPrompt';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMasterPassword?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireMasterPassword = false,
}) => {
  const { isAuthenticated, isGuestMode, masterPasswordSet, masterPasswordUnlocked } = useAuthStore();
  const [showPasswordPrompt, setShowPasswordPrompt] = React.useState(false);

  // Allow guest mode or authenticated users
  if (!isAuthenticated && !isGuestMode) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Guest mode doesn't require master password
  if (isGuestMode && requireMasterPassword) {
    // Allow access in guest mode without master password
    return <>{children}</>;
  }

  // Redirect to setup if master password not set (only for authenticated users)
  if (requireMasterPassword && !masterPasswordSet && !isGuestMode) {
    return <Navigate to={ROUTES.SETUP} replace />;
  }

  // Show master password prompt if required and not unlocked (only for authenticated users)
  if (requireMasterPassword && masterPasswordSet && !masterPasswordUnlocked && !isGuestMode) {
    React.useEffect(() => {
      setShowPasswordPrompt(true);
    }, []);

    return (
      <>
        <MasterPasswordPrompt
          isOpen={showPasswordPrompt}
          onSuccess={() => setShowPasswordPrompt(false)}
        />
        {children}
      </>
    );
  }

  return <>{children}</>;
};

