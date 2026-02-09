export type ThemeName = 'dark' | 'minimal' | 'cyberpunk' | 'rouge' | 'coral' | 'forest' | 'sunset' | 'monochrome' | 'midnight' | 'aurora' | 'emerald' | 'amber' | 'slate' | 'lavender' | 'crimson' | 'ember';

export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  colors: {
    background: {
      DEFAULT: string;
      light: string;
      lighter: string;
    };
    primary: {
      DEFAULT: string;
      dark: string;
      light: string;
    };
    secondary: {
      DEFAULT: string;
      dark: string;
      light: string;
    };
    danger: {
      DEFAULT: string;
      dark: string;
      light: string;
    };
    success: {
      DEFAULT: string;
      dark: string;
      light: string;
    };
    warning: {
      DEFAULT: string;
      dark: string;
      light: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    displayName: 'Dark',
    description: 'Deep charcoal with vibrant cyan accents',
    colors: {
      background: {
        DEFAULT: 'rgba(17, 24, 39, 1)',
        light: 'rgba(31, 41, 55, 1)',
        lighter: 'rgba(55, 65, 81, 1)',
      },
      primary: {
        DEFAULT: '#06D6D6',
        dark: '#04B4B4',
        light: '#4DEDED',
      },
      secondary: {
        DEFAULT: '#FF006E',
        dark: '#E6005F',
        light: '#FF1A7F',
      },
      danger: {
        DEFAULT: '#FF0040',
        dark: '#E60038',
        light: '#FF3366',
      },
      success: {
        DEFAULT: '#00D9B5',
        dark: '#00B39F',
        light: '#33E6C7',
      },
      warning: {
        DEFAULT: '#FFB703',
        dark: '#E6A102',
        light: '#FFC533',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#E5E7EB',
        muted: '#9CA3AF',
      },
      border: 'rgba(6, 214, 214, 0.2)',
    },
  },
  minimal: {
    name: 'minimal',
    displayName: 'Minimal',
    description: 'Light cream with sophisticated navy blue',
    colors: {
      background: {
        DEFAULT: 'rgba(254, 252, 247, 1)',
        light: 'rgba(248, 245, 240, 1)',
        lighter: 'rgba(240, 237, 230, 1)',
      },
      primary: {
        DEFAULT: '#2C3E50',
        dark: '#1A2535',
        light: '#475569',
      },
      secondary: {
        DEFAULT: '#E67E22',
        dark: '#D35400',
        light: '#F39C12',
      },
      danger: {
        DEFAULT: '#E74C3C',
        dark: '#C0392B',
        light: '#EC7063',
      },
      success: {
        DEFAULT: '#27AE60',
        dark: '#1E8449',
        light: '#52BE80',
      },
      warning: {
        DEFAULT: '#F39C12',
        dark: '#D68910',
        light: '#F8B88B',
      },
      text: {
        primary: '#1F2937',
        secondary: '#4B5563',
        muted: '#9CA3AF',
      },
      border: 'rgba(44, 62, 80, 0.15)',
    },
  },
  cyberpunk: {
    name: 'cyberpunk',
    displayName: 'Cyberpunk',
    description: 'Neon cyan and magenta on black',
    colors: {
      background: {
        DEFAULT: 'rgba(0, 0, 0, 1)',
        light: 'rgba(15, 15, 20, 1)',
        lighter: 'rgba(30, 30, 40, 1)',
      },
      primary: {
        DEFAULT: '#00FFF5',
        dark: '#00E6E0',
        light: '#33FFFA',
      },
      secondary: {
        DEFAULT: '#FF006E',
        dark: '#E6005F',
        light: '#FF1A7F',
      },
      danger: {
        DEFAULT: '#FF0080',
        dark: '#E6006E',
        light: '#FF3399',
      },
      success: {
        DEFAULT: '#39FF14',
        dark: '#2ED910',
        light: '#66FF4D',
      },
      warning: {
        DEFAULT: '#FFBE0B',
        dark: '#E6A800',
        light: '#FFD43D',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#E0F7FF',
        muted: '#A8E6FF',
      },
      border: 'rgba(0, 255, 245, 0.25)',
    },
  },
  rouge: {
    name: 'rouge',
    displayName: 'Rouge',
    description: 'Deep wine red with rose gold accents',
    colors: {
      background: {
        DEFAULT: 'rgba(25, 15, 20, 1)',
        light: 'rgba(45, 25, 35, 1)',
        lighter: 'rgba(70, 35, 50, 1)',
      },
      primary: {
        DEFAULT: '#C2185B',
        dark: '#880E4F',
        light: '#E91E63',
      },
      secondary: {
        DEFAULT: '#D4AF37',
        dark: '#B8960D',
        light: '#F0D767',
      },
      danger: {
        DEFAULT: '#D32F2F',
        dark: '#B71C1C',
        light: '#E57373',
      },
      success: {
        DEFAULT: '#7CB342',
        dark: '#558B2F',
        light: '#9CCC65',
      },
      warning: {
        DEFAULT: '#F57F17',
        dark: '#E65100',
        light: '#FFCA28',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#FFB3D9',
        muted: '#ECC6DB',
      },
      border: 'rgba(194, 24, 91, 0.3)',
    },
  },
  coral: {
    name: 'coral',
    displayName: 'Coral',
    description: 'Dark charcoal with vibrant coral accents',
    colors: {
      background: {
        DEFAULT: 'rgba(28, 25, 23, 1)',      // #1C1917 - Dark charcoal
        light: 'rgba(41, 37, 36, 1)',        // #292524 - Lighter charcoal
        lighter: 'rgba(68, 64, 60, 1)',      // #44403C - Even lighter
      },
      primary: {
        DEFAULT: '#FF7A5C',                   // Coral/Salmon
        dark: '#FF5733',                      // Darker coral
        light: '#FF9E85',                     // Lighter coral
      },
      secondary: {
        DEFAULT: '#78716C',                   // Warm gray
        dark: '#57534E',                      // Darker gray
        light: '#A8A29E',                     // Lighter gray
      },
      danger: {
        DEFAULT: '#EF4444',
        dark: '#DC2626',
        light: '#F87171',
      },
      success: {
        DEFAULT: '#10B981',
        dark: '#059669',
        light: '#34D399',
      },
      warning: {
        DEFAULT: '#F59E0B',
        dark: '#D97706',
        light: '#FBBF24',
      },
      text: {
        primary: '#F5F5F4',                   // Off-white
        secondary: '#E7E5E4',                 // Light gray
        muted: '#A8A29E',                     // Muted gray
      },
      border: 'rgba(255, 122, 92, 0.2)',     // Coral with transparency
    },
  },
  forest: {
    name: 'forest',
    displayName: 'Forest',
    description: 'Rich forest green with golden sunlight',
    colors: {
      background: {
        DEFAULT: 'rgba(15, 35, 25, 1)',
        light: 'rgba(25, 55, 40, 1)',
        lighter: 'rgba(40, 80, 60, 1)',
      },
      primary: {
        DEFAULT: '#2ECC71',
        dark: '#27AE60',
        light: '#58E68D',
      },
      secondary: {
        DEFAULT: '#F9D56E',
        dark: '#F0C632',
        light: '#FFE66D',
      },
      danger: {
        DEFAULT: '#E74C3C',
        dark: '#C0392B',
        light: '#EC7063',
      },
      success: {
        DEFAULT: '#1ABC9C',
        dark: '#16A085',
        light: '#48DBFB',
      },
      warning: {
        DEFAULT: '#F39C12',
        dark: '#D68910',
        light: '#F8B88B',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#C8E6C9',
        muted: '#A5D6A7',
      },
      border: 'rgba(46, 204, 113, 0.3)',
    },
  },
  sunset: {
    name: 'sunset',
    displayName: 'Sunset',
    description: 'Fiery orange to purple gradient',
    colors: {
      background: {
        DEFAULT: 'rgba(25, 15, 35, 1)',
        light: 'rgba(45, 25, 50, 1)',
        lighter: 'rgba(70, 40, 70, 1)',
      },
      primary: {
        DEFAULT: '#FF6B35',
        dark: '#E64A1A',
        light: '#FF9E64',
      },
      secondary: {
        DEFAULT: '#C7417B',
        dark: '#A03060',
        light: '#E85D9C',
      },
      danger: {
        DEFAULT: '#FF4757',
        dark: '#EE3E3E',
        light: '#FF6B7A',
      },
      success: {
        DEFAULT: '#26D07C',
        dark: '#1DB564',
        light: '#6BF7A0',
      },
      warning: {
        DEFAULT: '#FFBE0B',
        dark: '#E6A800',
        light: '#FFD43D',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#FFD4B0',
        muted: '#FFBF8F',
      },
      border: 'rgba(255, 107, 53, 0.3)',
    },
  },
  monochrome: {
    name: 'monochrome',
    displayName: 'Monochrome',
    description: 'Pure black and white with cool gray',
    colors: {
      background: {
        DEFAULT: 'rgba(0, 0, 0, 1)',
        light: 'rgba(20, 20, 20, 1)',
        lighter: 'rgba(40, 40, 40, 1)',
      },
      primary: {
        DEFAULT: '#EEEEEE',
        dark: '#D0D0D0',
        light: '#FFFFFF',
      },
      secondary: {
        DEFAULT: '#808080',
        dark: '#666666',
        light: '#A9A9A9',
      },
      danger: {
        DEFAULT: '#FF0000',
        dark: '#CC0000',
        light: '#FF3333',
      },
      success: {
        DEFAULT: '#00FF00',
        dark: '#00CC00',
        light: '#33FF33',
      },
      warning: {
        DEFAULT: '#FFFF00',
        dark: '#CCCC00',
        light: '#FFFF33',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#E5E5E5',
        muted: '#B3B3B3',
      },
      border: 'rgba(255, 255, 255, 0.2)',
    },
  },
  midnight: {
    name: 'midnight',
    displayName: 'Midnight',
    description: 'Navy blue with electric lime neon',
    colors: {
      background: {
        DEFAULT: 'rgba(15, 18, 50, 1)',
        light: 'rgba(25, 30, 70, 1)',
        lighter: 'rgba(40, 50, 100, 1)',
      },
      primary: {
        DEFAULT: '#A8FF00',
        dark: '#94E600',
        light: '#C4FF33',
      },
      secondary: {
        DEFAULT: '#2A9FE6',
        dark: '#1A7FB8',
        light: '#5BB8E8',
      },
      danger: {
        DEFAULT: '#FF1654',
        dark: '#E6124C',
        light: '#FF5080',
      },
      success: {
        DEFAULT: '#13C284',
        dark: '#0FA066',
        light: '#4DD9A4',
      },
      warning: {
        DEFAULT: '#FFD60A',
        dark: '#E6BC00',
        light: '#FFE147',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#E0E7FF',
        muted: '#C7D2FE',
      },
      border: 'rgba(168, 255, 0, 0.2)',
    },
  },
  aurora: {
    name: 'aurora',
    displayName: 'Aurora',
    description: 'Northern lights with violet and teal',
    colors: {
      background: {
        DEFAULT: 'rgba(10, 20, 40, 1)',
        light: 'rgba(20, 35, 65, 1)',
        lighter: 'rgba(35, 55, 95, 1)',
      },
      primary: {
        DEFAULT: '#00D9FF',
        dark: '#00B8D4',
        light: '#4DE9FF',
      },
      secondary: {
        DEFAULT: '#B366FF',
        dark: '#9D3FFF',
        light: '#D699FF',
      },
      danger: {
        DEFAULT: '#FF4466',
        dark: '#FF1744',
        light: '#FF7A99',
      },
      success: {
        DEFAULT: '#26D07C',
        dark: '#1DB564',
        light: '#6BF7A0',
      },
      warning: {
        DEFAULT: '#FFAA00',
        dark: '#FF8C00',
        light: '#FFBB33',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#E0F7FF',
        muted: '#B3E5FC',
      },
      border: 'rgba(0, 217, 255, 0.25)',
    },
  },
  emerald: {
    name: 'emerald',
    displayName: 'Emerald',
    description: 'Jewel-tone emerald with warm brass',
    colors: {
      background: {
        DEFAULT: 'rgba(4, 60, 45, 1)',
        light: 'rgba(8, 80, 60, 1)',
        lighter: 'rgba(15, 110, 80, 1)',
      },
      primary: {
        DEFAULT: '#00D9B5',
        dark: '#00B59E',
        light: '#48F3D4',
      },
      secondary: {
        DEFAULT: '#D4A574',
        dark: '#B8824E',
        light: '#E8C7A0',
      },
      danger: {
        DEFAULT: '#FF6B5B',
        dark: '#E63946',
        light: '#FF8A80',
      },
      success: {
        DEFAULT: '#2ECC71',
        dark: '#27AE60',
        light: '#58E68D',
      },
      warning: {
        DEFAULT: '#FDB813',
        dark: '#E6A000',
        light: '#FFD426',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#B3E5DB',
        muted: '#85D9C8',
      },
      border: 'rgba(0, 217, 181, 0.3)',
    },
  },
  amber: {
    name: 'amber',
    displayName: 'Amber',
    description: 'Warm amber with deep rust tones',
    colors: {
      background: {
        DEFAULT: 'rgba(30, 20, 10, 1)',
        light: 'rgba(50, 35, 20, 1)',
        lighter: 'rgba(75, 50, 30, 1)',
      },
      primary: {
        DEFAULT: '#FFB84D',
        dark: '#FF9500',
        light: '#FFD680',
      },
      secondary: {
        DEFAULT: '#8B4513',
        dark: '#664033',
        light: '#A0522D',
      },
      danger: {
        DEFAULT: '#D32F2F',
        dark: '#B71C1C',
        light: '#E57373',
      },
      success: {
        DEFAULT: '#558B2F',
        dark: '#33691E',
        light: '#7CB342',
      },
      warning: {
        DEFAULT: '#FFA000',
        dark: '#E65100',
        light: '#FFB74D',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#FFD699',
        muted: '#FFBF6B',
      },
      border: 'rgba(255, 180, 77, 0.25)',
    },
  },
  slate: {
    name: 'slate',
    displayName: 'Slate',
    description: 'Cool slate gray with coral accents',
    colors: {
      background: {
        DEFAULT: 'rgba(20, 25, 35, 1)',
        light: 'rgba(35, 45, 60, 1)',
        lighter: 'rgba(55, 70, 90, 1)',
      },
      primary: {
        DEFAULT: '#FF6B9D',
        dark: '#E63384',
        light: '#FF99B9',
      },
      secondary: {
        DEFAULT: '#38ADA9',
        dark: '#2A8C85',
        light: '#6DBCC3',
      },
      danger: {
        DEFAULT: '#D62828',
        dark: '#B71D1D',
        light: '#E85C5C',
      },
      success: {
        DEFAULT: '#52B788',
        dark: '#2D6A4F',
        light: '#95D5B2',
      },
      warning: {
        DEFAULT: '#FFB703',
        dark: '#E6A002',
        light: '#FFD60A',
      },
      text: {
        primary: '#F8FAFC',
        secondary: '#E2E8F0',
        muted: '#CBD5E1',
      },
      border: 'rgba(255, 107, 157, 0.2)',
    },
  },
  lavender: {
    name: 'lavender',
    displayName: 'Lavender',
    description: 'Soft lavender with sage green',
    colors: {
      background: {
        DEFAULT: 'rgba(30, 24, 40, 1)',
        light: 'rgba(45, 38, 55, 1)',
        lighter: 'rgba(65, 55, 80, 1)',
      },
      primary: {
        DEFAULT: '#C8B6FF',
        dark: '#9D7AE5',
        light: '#DDD5F0',
      },
      secondary: {
        DEFAULT: '#9DD9D2',
        dark: '#6FB3A8',
        light: '#C3E5E0',
      },
      danger: {
        DEFAULT: '#D97B7B',
        dark: '#B85C5C',
        light: '#E5A0A0',
      },
      success: {
        DEFAULT: '#A8D8B8',
        dark: '#7FBB9A',
        light: '#C8E6D7',
      },
      warning: {
        DEFAULT: '#FFD699',
        dark: '#FFC266',
        light: '#FFDDAA',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#EDD5FF',
        muted: '#DCC8FF',
      },
      border: 'rgba(200, 182, 255, 0.25)',
    },
  },
  crimson: {
    name: 'crimson',
    displayName: 'Crimson',
    description: 'Deep crimson with gold embellishments',
    colors: {
      background: {
        DEFAULT: 'rgba(20, 8, 15, 1)',
        light: 'rgba(40, 15, 25, 1)',
        lighter: 'rgba(65, 25, 40, 1)',
      },
      primary: {
        DEFAULT: '#E63946',
        dark: '#C8102E',
        light: '#F57B7D',
      },
      secondary: {
        DEFAULT: '#D4A574',
        dark: '#B8824E',
        light: '#E8C7A0',
      },
      danger: {
        DEFAULT: '#D32F2F',
        dark: '#B71C1C',
        light: '#E57373',
      },
      success: {
        DEFAULT: '#1DB564',
        dark: '#0F7F4C',
        light: '#48E6A8',
      },
      warning: {
        DEFAULT: '#FDB813',
        dark: '#E6A000',
        light: '#FFD426',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#FED4D4',
        muted: '#F8A9A9',
      },
      border: 'rgba(230, 57, 70, 0.3)',
    },
  },
  ember: {
    name: 'ember',
    displayName: 'Ember',
    description: 'Warm charcoal with vibrant orange accents',
    colors: {
      background: {
        DEFAULT: '#1C1917',
        light: '#292524',
        lighter: '#44403C',
      },
      primary: {
        DEFAULT: '#F97316',
        dark: '#EA580C',
        light: '#FB923C',
      },
      secondary: {
        DEFAULT: '#57534E',
        dark: '#44403C',
        light: '#78716C',
      },
      danger: {
        DEFAULT: '#EF4444',
        dark: '#DC2626',
        light: '#F87171',
      },
      success: {
        DEFAULT: '#10B981',
        dark: '#059669',
        light: '#34D399',
      },
      warning: {
        DEFAULT: '#F59E0B',
        dark: '#D97706',
        light: '#FBBF24',
      },
      text: {
        primary: '#F5F5F4',
        secondary: '#E7E5E4',
        muted: '#A8A29E',
      },
      border: 'rgba(249, 115, 22, 0.2)',
    },
  },
};

export function applyTheme(themeName: ThemeName) {
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;
  const colors = theme.colors;

  requestAnimationFrame(() => {
    root.style.setProperty('--color-background', colors.background.DEFAULT);
    root.style.setProperty('--color-background-light', colors.background.light);
    root.style.setProperty('--color-background-lighter', colors.background.lighter);
    root.style.setProperty('--color-primary', colors.primary.DEFAULT);
    root.style.setProperty('--color-primary-dark', colors.primary.dark);
    root.style.setProperty('--color-primary-light', colors.primary.light);
    root.style.setProperty('--color-secondary', colors.secondary.DEFAULT);
    root.style.setProperty('--color-secondary-dark', colors.secondary.dark);
    root.style.setProperty('--color-secondary-light', colors.secondary.light);
    root.style.setProperty('--color-danger', colors.danger.DEFAULT);
    root.style.setProperty('--color-danger-dark', colors.danger.dark);
    root.style.setProperty('--color-danger-light', colors.danger.light);
    root.style.setProperty('--color-success', colors.success.DEFAULT);
    root.style.setProperty('--color-success-dark', colors.success.dark);
    root.style.setProperty('--color-success-light', colors.success.light);
    root.style.setProperty('--color-warning', colors.warning.DEFAULT);
    root.style.setProperty('--color-warning-dark', colors.warning.dark);
    root.style.setProperty('--color-warning-light', colors.warning.light);
    root.style.setProperty('--color-text-primary', colors.text.primary);
    root.style.setProperty('--color-text-secondary', colors.text.secondary);
    root.style.setProperty('--color-text-muted', colors.text.muted);
    root.style.setProperty('--color-border', colors.border);
  });
}