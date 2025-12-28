import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Server, Code, Settings, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ROUTES } from '../../lib/constants';
import { useUserConfigStore } from '../../store/userConfigStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: <Home size={20} /> },
  { label: 'Connections', path: ROUTES.CONNECTIONS, icon: <Server size={20} /> },
  { label: 'Commands', path: ROUTES.COMMANDS, icon: <Code size={20} /> },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: <Settings2 size={20} /> },
];

export const Sidebar: React.FC = () => {
  const { config } = useUserConfigStore();
  const sidebarOpen = config.sidebarOpen;
  const sidebarCollapsed = config.sidebarCollapsed;

  if (!sidebarOpen) return null;

  return (
    <aside
      className={cn(
        'bg-background-light transition-all duration-300 ease-in-out',
        'sticky top-0 h-screen overflow-y-auto',
        sidebarCollapsed ? 'w-16' : 'w-[5%]'
      )}
      style={{ scrollbarWidth: 'thin', minWidth: sidebarCollapsed ? '64px' : '200px', maxWidth: sidebarCollapsed ? '64px' : '240px' }}
    >
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                    'text-text-secondary hover:bg-background hover:text-text-primary',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    isActive && 'bg-background text-text-primary font-semibold shadow-lg shadow-primary/10',
                    sidebarCollapsed && 'justify-center px-2'
                  )
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('flex-shrink-0', isActive && 'text-primary')}>
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="transition-opacity duration-200 text-sm">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

