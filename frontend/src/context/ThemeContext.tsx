import React, { createContext, useContext, useEffect } from 'react';
import { useUserConfigStore } from '../store/userConfigStore';
import { applyTheme, type ThemeName } from '../lib/themes';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config, updateConfig } = useUserConfigStore();
  const theme = config.theme;

  useEffect(() => {
    // Apply theme on mount and when theme changes
    if (theme) {
      applyTheme(theme);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    updateConfig({ theme: newTheme });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

