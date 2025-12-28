import { ITheme } from '@xterm/xterm';

/**
 * Terminal theme definitions for xterm.js
 * 
 * Provides theme configurations that match the app's visual style.
 * Includes full ANSI color palette for proper terminal rendering.
 */

export interface TerminalThemeConfig {
  name: string;
  theme: ITheme;
}

/**
 * Dark theme - Default terminal theme
 * Matches the app's dark mode styling
 */
export const darkTheme: ITheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  cursorAccent: '#1e1e1e',
  selectionBackground: '#264f78',
  selectionForeground: '#ffffff',
  selectionInactiveBackground: '#3a3d41',
  
  // Standard ANSI colors
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  
  // Bright ANSI colors
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff',
};

/**
 * Light theme - For light mode support
 */
export const lightTheme: ITheme = {
  background: '#ffffff',
  foreground: '#383a42',
  cursor: '#383a42',
  cursorAccent: '#ffffff',
  selectionBackground: '#add6ff',
  selectionForeground: '#000000',
  selectionInactiveBackground: '#e5ebf1',
  
  // Standard ANSI colors (adjusted for light background)
  black: '#383a42',
  red: '#e45649',
  green: '#50a14f',
  yellow: '#c18401',
  blue: '#4078f2',
  magenta: '#a626a4',
  cyan: '#0184bc',
  white: '#fafafa',
  
  // Bright ANSI colors
  brightBlack: '#4f525e',
  brightRed: '#e06c75',
  brightGreen: '#98c379',
  brightYellow: '#e5c07b',
  brightBlue: '#61afef',
  brightMagenta: '#c678dd',
  brightCyan: '#56b6c2',
  brightWhite: '#ffffff',
};

/**
 * Dracula theme - Popular dark theme
 */
export const draculaTheme: ITheme = {
  background: '#282a36',
  foreground: '#f8f8f2',
  cursor: '#f8f8f2',
  cursorAccent: '#282a36',
  selectionBackground: '#44475a',
  selectionForeground: '#f8f8f2',
  selectionInactiveBackground: '#44475a',
  
  black: '#21222c',
  red: '#ff5555',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  blue: '#bd93f9',
  magenta: '#ff79c6',
  cyan: '#8be9fd',
  white: '#f8f8f2',
  
  brightBlack: '#6272a4',
  brightRed: '#ff6e6e',
  brightGreen: '#69ff94',
  brightYellow: '#ffffa5',
  brightBlue: '#d6acff',
  brightMagenta: '#ff92df',
  brightCyan: '#a4ffff',
  brightWhite: '#ffffff',
};

/**
 * Nord theme - Arctic, north-bluish color palette
 */
export const nordTheme: ITheme = {
  background: '#2e3440',
  foreground: '#d8dee9',
  cursor: '#d8dee9',
  cursorAccent: '#2e3440',
  selectionBackground: '#434c5e',
  selectionForeground: '#d8dee9',
  selectionInactiveBackground: '#3b4252',
  
  black: '#3b4252',
  red: '#bf616a',
  green: '#a3be8c',
  yellow: '#ebcb8b',
  blue: '#81a1c1',
  magenta: '#b48ead',
  cyan: '#88c0d0',
  white: '#e5e9f0',
  
  brightBlack: '#4c566a',
  brightRed: '#bf616a',
  brightGreen: '#a3be8c',
  brightYellow: '#ebcb8b',
  brightBlue: '#81a1c1',
  brightMagenta: '#b48ead',
  brightCyan: '#8fbcbb',
  brightWhite: '#eceff4',
};

/**
 * Monokai theme - Classic dark theme
 */
export const monokaiTheme: ITheme = {
  background: '#272822',
  foreground: '#f8f8f2',
  cursor: '#f8f8f2',
  cursorAccent: '#272822',
  selectionBackground: '#49483e',
  selectionForeground: '#f8f8f2',
  selectionInactiveBackground: '#3e3d32',
  
  black: '#272822',
  red: '#f92672',
  green: '#a6e22e',
  yellow: '#f4bf75',
  blue: '#66d9ef',
  magenta: '#ae81ff',
  cyan: '#a1efe4',
  white: '#f8f8f2',
  
  brightBlack: '#75715e',
  brightRed: '#f92672',
  brightGreen: '#a6e22e',
  brightYellow: '#f4bf75',
  brightBlue: '#66d9ef',
  brightMagenta: '#ae81ff',
  brightCyan: '#a1efe4',
  brightWhite: '#f9f8f5',
};

/**
 * All available themes
 */
export const terminalThemes: Record<string, ITheme> = {
  dark: darkTheme,
  light: lightTheme,
  dracula: draculaTheme,
  nord: nordTheme,
  monokai: monokaiTheme,
};

/**
 * Get terminal theme by name
 * Falls back to dark theme if not found
 */
export const getTerminalTheme = (themeName: string): ITheme => {
  return terminalThemes[themeName] || darkTheme;
};

/**
 * Get theme based on app theme setting
 * Maps app theme names to terminal themes
 */
export const getTerminalThemeForApp = (appTheme: string): ITheme => {
  const themeMap: Record<string, string> = {
    'dark': 'dark',
    'light': 'light',
    'system': 'dark', // Default to dark for system
    'dracula': 'dracula',
    'nord': 'nord',
    'monokai': 'monokai',
  };
  
  const terminalThemeName = themeMap[appTheme] || 'dark';
  return getTerminalTheme(terminalThemeName);
};
