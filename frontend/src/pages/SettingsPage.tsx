import React, { useState } from 'react';
import { Palette, Settings as SettingsIcon, Shield, Bell, Database, User } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ThemePicker } from '../components/ui/ThemePicker';
import { cn } from '../lib/utils';

type SettingsSection = 'appearance' | 'general' | 'security' | 'notifications' | 'data' | 'account';

interface Section {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const sections: Section[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: <Palette size={18} />,
    description: 'Customize themes and visual preferences',
  },
  {
    id: 'general',
    label: 'General',
    icon: <SettingsIcon size={18} />,
    description: 'General application settings',
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield size={18} />,
    description: 'Security and privacy settings',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell size={18} />,
    description: 'Notification preferences',
  },
  {
    id: 'data',
    label: 'Data',
    icon: <Database size={18} />,
    description: 'Backup and data management',
  },
  {
    id: 'account',
    label: 'Account',
    icon: <User size={18} />,
    description: 'Account settings and profile',
  },
];

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'appearance':
        return (
          <div className="space-y-6 w-full">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">Appearance</h2>
              <p className="text-text-secondary">Customize the look and feel of Host Vault</p>
            </div>
            <ThemePicker />
          </div>
        );
      case 'general':
        return (
          <div className="space-y-6 w-full">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">General Settings</h2>
              <p className="text-text-secondary">Configure general application preferences</p>
            </div>
            <Card>
              <p className="text-text-secondary text-center py-8">General settings coming soon...</p>
            </Card>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6 w-full">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">Security</h2>
              <p className="text-text-secondary">Manage security and privacy settings</p>
            </div>
            <Card>
              <p className="text-text-secondary text-center py-8">Security settings coming soon...</p>
            </Card>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6 w-full">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">Notifications</h2>
              <p className="text-text-secondary">Configure notification preferences</p>
            </div>
            <Card>
              <p className="text-text-secondary text-center py-8">Notification settings coming soon...</p>
            </Card>
          </div>
        );
      case 'data':
        return (
          <div className="space-y-6 w-full">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">Data Management</h2>
              <p className="text-text-secondary">Backup, export, and manage your data</p>
            </div>
            <Card>
              <p className="text-text-secondary text-center py-8">Data management settings coming soon...</p>
            </Card>
          </div>
        );
      case 'account':
        return (
          <div className="space-y-6 w-full">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">Account</h2>
              <p className="text-text-secondary">Manage your account and profile</p>
            </div>
            <Card>
              <p className="text-text-secondary text-center py-8">Account settings coming soon...</p>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full w-full">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-0 lg:self-start">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
          <p className="text-sm text-text-muted">Customize your Host Vault experience</p>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  'text-left group',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold border-l-4 border-primary'
                    : 'text-text-secondary hover:bg-background-light hover:text-text-primary',
                  'hover:scale-[1.02] active:scale-[0.98]'
                )}
              >
                <span className={cn('flex-shrink-0', isActive && 'text-primary')}>
                  {section.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{section.label}</div>
                  <div className="text-xs text-text-muted mt-0.5 hidden lg:block">{section.description}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content - Centered */}
      <main className="flex-1 min-w-0 overflow-y-auto flex items-start justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-0">
          {renderSectionContent()}
        </div>
      </main>
    </div>
  );
};

