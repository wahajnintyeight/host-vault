import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../ui/Toast';
import { useAppStore } from '../../store/appStore';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toastNotifications, removeToast } = useAppStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ "--wails-draggable": "drag" } as React.CSSProperties}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-8" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>{children}</main>
      </div>
      <ToastContainer toasts={toastNotifications} onRemove={removeToast} />
    </div>
  );
};

