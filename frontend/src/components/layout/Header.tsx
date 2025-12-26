import React from 'react';
import { Menu } from 'lucide-react';
import { useUserConfigStore } from '../../store/userConfigStore';
import { WindowControls } from './WindowControls';
import { UserMenu } from '../ui/UserMenu';
import { WindowMaximize } from '../../../wailsjs/go/main/App';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

export const Header: React.FC = () => {
  const { updateConfig, config } = useUserConfigStore();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    updateConfig({ sidebarOpen: !config.sidebarOpen });
  };

  const handleDoubleClick = () => {
    // Double-click on header to maximize/restore window
    if (typeof window !== 'undefined' && window.go && window.go.main && window.go.main.App) {
      WindowMaximize().catch(() => {
        // Silently fail if not available
      });
    }
  };

  const handleHeaderClick = () => {
    // Click on "Host Vault" header to navigate to dashboard/home
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <header 
      className="h-16 bg-background-light flex items-center justify-between px-6 titlebar" 
      style={{ "--wails-draggable": "drag" } as React.CSSProperties}
      onDoubleClick={handleDoubleClick}
    >
      {/* Left section - draggable area */}
      <div className="flex items-center gap-6 flex-1 titlebar">
        <div className="flex items-center gap-4 no-drag">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-background rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Menu size={20} className="text-text-secondary" />
          </button>
        </div>
        <div 
          className="flex items-center gap-3 flex-1 titlebar"
          onDoubleClick={handleDoubleClick}
        >
          <span
            onClick={handleHeaderClick}
            className="no-drag text-xl font-semibold text-text-primary select-none hover:text-primary transition-colors duration-200 cursor-pointer"
          >
            Host Vault
          </span>
        </div>
      </div>

      {/* Right section - non-draggable controls */}
      <div className="flex items-center gap-3 no-drag">
        <UserMenu />
        <WindowControls />
      </div>
    </header>
  );
};

