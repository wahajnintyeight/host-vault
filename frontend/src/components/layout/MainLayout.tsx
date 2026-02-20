import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../ui/Toast';
import { useAppStore } from '../../store/appStore';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { TerminalDndProvider } from '../terminal/TerminalDndProvider';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toastNotifications, removeToast } = useAppStore();
  const location = useLocation();
  
  // Check if we're on the terminal page
  const isTerminalPage = location.pathname === ROUTES.TERMINAL;

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ "--wails-draggable": "drag" } as React.CSSProperties}>
      <TerminalDndProvider>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main 
            className={isTerminalPage ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto p-8"} 
            style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}
          >
            {children}
          </main>
        </div>
        <ToastContainer toasts={toastNotifications} onRemove={removeToast} />
      </TerminalDndProvider>
    </div>
  );
};

