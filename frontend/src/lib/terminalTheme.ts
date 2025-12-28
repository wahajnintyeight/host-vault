import { ITheme } from '@xterm/xterm';

/**
 * Get terminal theme colors from CSS variables
 * This ensures the terminal matches the app's current theme
 */
export function getTerminalThemeFromCSS(): ITheme {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);

  // Get colors from CSS variables
  const bgColor = computedStyle.getPropertyValue('--color-background').trim() || 'rgba(17, 24, 39, 1)';
  const bgLight = computedStyle.getPropertyValue('--color-background-light').trim() || 'rgba(31, 41, 55, 1)';
  const textPrimary = computedStyle.getPropertyValue('--color-text-primary').trim() || '#FFFFFF';
  const textSecondary = computedStyle.getPropertyValue('--color-text-secondary').trim() || '#E5E7EB';
  const textMuted = computedStyle.getPropertyValue('--color-text-muted').trim() || '#9CA3AF';
  const primaryColor = computedStyle.getPropertyValue('--color-primary').trim() || '#06D6D6';
  const secondaryColor = computedStyle.getPropertyValue('--color-secondary').trim() || '#FF006E';
  const dangerColor = computedStyle.getPropertyValue('--color-danger').trim() || '#FF0040';
  const successColor = computedStyle.getPropertyValue('--color-success').trim() || '#00D9B5';
  const warningColor = computedStyle.getPropertyValue('--color-warning').trim() || '#FFB703';

  return {
    background: rgbaToHex(bgColor),
    foreground: primaryColor, // Use primary color as main text for theme integration
    cursor: primaryColor,
    cursorAccent: rgbaToHex(bgColor),
    selectionBackground: `${primaryColor}40`,
    selectionForeground: textPrimary,
    selectionInactiveBackground: `${primaryColor}20`,
    // Standard ANSI colors - mapped to theme colors
    black: rgbaToHex(bgLight),
    red: dangerColor,
    green: successColor,
    yellow: warningColor,
    blue: lightenColor(primaryColor, 20),
    magenta: secondaryColor,
    cyan: lightenColor(primaryColor, 30),
    white: textSecondary,
    // Bright ANSI colors
    brightBlack: textMuted,
    brightRed: lightenColor(dangerColor, 20),
    brightGreen: lightenColor(successColor, 20),
    brightYellow: lightenColor(warningColor, 20),
    brightBlue: lightenColor(primaryColor, 40),
    brightMagenta: lightenColor(secondaryColor, 20),
    brightCyan: lightenColor(primaryColor, 50),
    brightWhite: '#ffffff',
  };
}

/**
 * Convert rgba string to hex color
 */
function rgbaToHex(rgba: string): string {
  if (rgba.startsWith('#')) return rgba;

  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return rgba;
}

/**
 * Lighten a hex color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
  hex = hex.replace('#', '');

  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
