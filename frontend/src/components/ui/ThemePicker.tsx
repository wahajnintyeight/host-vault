import React, { useState } from 'react';
import { Check, Palette, Sparkles } from 'lucide-react';
import { useUserConfigStore } from '../../store/userConfigStore';
import { useAppStore } from '../../store/appStore';
import { themes, type ThemeName, applyTheme } from '../../lib/themes';
import { Card } from './Card';
import { cn } from '../../lib/utils';

export const ThemePicker: React.FC = () => {
  const { config, updateConfig } = useUserConfigStore();
  const { addToast } = useAppStore();
  const currentTheme = config.theme;
  const [isChanging, setIsChanging] = useState(false);

  const handleThemeSelect = (themeName: ThemeName) => {
    if (themeName === currentTheme || isChanging) return;
    
    setIsChanging(true);
    
    // Apply theme immediately for instant feedback
    applyTheme(themeName);
    
    // Update config (this will save to localStorage automatically)
    updateConfig({ theme: themeName });
    
    // Show toast notification
    addToast({
      type: 'success',
      title: 'Theme Changed',
      message: `Switched to ${themes[themeName].displayName} theme`,
      duration: 2000,
    });
    
    // Reset changing state after transition
    setTimeout(() => {
      setIsChanging(false);
    }, 300);
  };

  return (
    <Card className="w-full">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">Choose Theme</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Object.values(themes).map((theme) => {
            const isSelected = currentTheme === theme.name;
            
            return (
              <button
                key={theme.name}
                onClick={() => handleThemeSelect(theme.name)}
                disabled={isChanging}
                className={cn(
                  'relative p-3 rounded-lg border-2 transition-all duration-300',
                  'hover:scale-105 hover:shadow-lg active:scale-95',
                  'text-left group cursor-pointer',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                    : 'border-border bg-background-light hover:border-primary/50 hover:bg-background-lighter',
                  isChanging && 'opacity-50 cursor-wait'
                )}
                title={theme.description}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 animate-in fade-in zoom-in duration-200">
                    <div className="bg-primary rounded-full p-0.5 shadow-lg">
                      <Check size={12} className="text-white" />
                    </div>
                  </div>
                )}
                {!isSelected && (
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles size={12} className="text-primary" />
                  </div>
                )}

                {/* Compact Theme Preview */}
                <div className="mb-2 space-y-1.5">
                  <div
                    className="h-8 rounded-md"
                    style={{ backgroundColor: theme.colors.background.DEFAULT }}
                  >
                    <div className="flex gap-1 p-1.5">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: theme.colors.primary.DEFAULT }}
                      />
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: theme.colors.secondary.DEFAULT }}
                      />
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: theme.colors.success.DEFAULT }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="h-4 flex-1 rounded"
                      style={{ backgroundColor: theme.colors.primary.DEFAULT }}
                    />
                    <div
                      className="h-4 flex-1 rounded"
                      style={{ backgroundColor: theme.colors.secondary.DEFAULT }}
                    />
                    <div
                      className="h-4 flex-1 rounded"
                      style={{ backgroundColor: theme.colors.success.DEFAULT }}
                    />
                    <div
                      className="h-4 flex-1 rounded"
                      style={{ backgroundColor: theme.colors.warning.DEFAULT }}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-text-primary mb-0.5">{theme.displayName}</h4>
                  <p className="text-xs text-text-muted line-clamp-1">{theme.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

