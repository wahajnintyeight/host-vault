import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { CommandsPage } from './pages/CommandsPage';
import { ROUTES } from './lib/constants';
import { useAuthStore } from './store/authStore';
import { useUserConfigStore } from './store/userConfigStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsPage } from './pages/SettingsPage';
import { TerminalPage } from './pages/TerminalPage';
import { applyTheme } from './lib/themes';

function App() {
  const { isAuthenticated, isGuestMode, masterPasswordSet, user } = useAuthStore();
  const { config, loadUserConfig, loadGuestConfig } = useUserConfigStore();

  // Prevent Ctrl+A (Select All) globally for desktop app feel
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+A unless in an input/textarea
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable ||
                       target.classList.contains('selectable');
        
        if (!isInput) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Load appropriate config on mount or when auth state changes
  React.useEffect(() => {
    if (isGuestMode) {
      loadGuestConfig();
    } else if (user?.id) {
      loadUserConfig(user.id);
    } else {
      loadGuestConfig();
    }
  }, [isGuestMode, user?.id, loadUserConfig, loadGuestConfig]);

  // Apply theme when config changes
  React.useEffect(() => {
    if (config.theme) {
      applyTheme(config.theme);
    }
  }, [config.theme]);

  return (
    <ErrorBoundary>
      <div style={{ "--wails-draggable": "drag" } as React.CSSProperties}>
      <BrowserRouter>
        <Routes>
          <Route
            path={ROUTES.LOGIN}
            element={
              isAuthenticated && !isGuestMode ? (
                masterPasswordSet ? (
                  <Navigate to={ROUTES.DASHBOARD} replace />
                ) : (
                  <Navigate to={ROUTES.SETUP} replace />
                )
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path={ROUTES.SETUP}
            element={
              <ProtectedRoute>
                {masterPasswordSet ? (
                  <Navigate to={ROUTES.DASHBOARD} replace />
                ) : (
                  <SetupPage />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute requireMasterPassword>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.CONNECTIONS}
            element={
              <ProtectedRoute requireMasterPassword>
                <MainLayout>
                  <ConnectionsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.COMMANDS}
            element={
              <ProtectedRoute requireMasterPassword>
                <MainLayout>
                  <CommandsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SETTINGS}
            element={
              <ProtectedRoute requireMasterPassword>
                <MainLayout>
                  <SettingsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TERMINAL}
            element={
              <ProtectedRoute requireMasterPassword>
                <MainLayout>
                  <TerminalPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </div>
    </ErrorBoundary>
  );
}

export default App;
