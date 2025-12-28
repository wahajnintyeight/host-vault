import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

export const UserMenu: React.FC = () => {
  const { user, logout: logoutUser, isGuestMode, exitGuestMode } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    logoutUser();
    navigate(ROUTES.LOGIN);
  };

  const handleSignIn = () => {
    exitGuestMode();
    navigate(ROUTES.LOGIN);
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (user?.email) {
      return user.email
        .split('@')[0]
        .split('.')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'GU';
  };

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <Menu.Button
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
              'hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-light',
              open && 'bg-background'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ">
              <span className="text-xs font-semibold text-primary">{getInitials()}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-text-primary leading-tight">
                {user?.email?.split('@')[0] || 'Guest'}
              </span>
              <span className="text-xs text-text-muted leading-tight">
                {isGuestMode ? 'Guest Mode' : user?.email?.split('@')[1]}
              </span>
            </div>
            <ChevronDown
              size={16}
              className={cn(
                'text-text-muted transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </Menu.Button>

          {/* <Transition
            as={React.Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          > */}
            <Menu.Items
              className={cn(
                'absolute right-0 mt-2 w-56 origin-top-right rounded-lg',
                'bg-background-light border border-border shadow-lg',
                'ring-1 ring-black ring-opacity-5 focus:outline-none',
                'z-50 overflow-hidden'
              )}
            >
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-text-primary">
                  {user?.email || 'Guest User'}
                </p>
              </div>

              <div className="py-1">
                {isGuestMode ? (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleSignIn}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                          active
                            ? 'bg-background text-text-primary'
                            : 'text-text-secondary',
                          'hover:bg-background'
                        )}
                      >
                        <User size={16} />
                        <span>Sign In</span>
                      </button>
                    )}
                  </Menu.Item>
                ) : (
                  <>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate(ROUTES.SETTINGS)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                            active
                              ? 'bg-background text-text-primary'
                              : 'text-text-secondary',
                            'hover:bg-background'
                          )}
                        >
                          <Settings size={16} />
                          <span>Settings</span>
                        </button>
                      )}
                    </Menu.Item>
                    <div className="my-1 border-t border-border" />
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                            active
                              ? 'bg-danger/10 text-danger'
                              : 'text-text-secondary',
                            'hover:bg-danger/10 hover:text-danger'
                          )}
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      )}
                    </Menu.Item>
                  </>
                )}
              </div>
            </Menu.Items>
          {/* </Transition> */}
        </>
      )}
    </Menu>
  );
};






