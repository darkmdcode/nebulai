import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark-retro' | 'light-hippy' | 'modern-sleek';

interface ThemeStore {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  themes: {
    'dark-retro': {
      name: 'Dark Retro';
      description: 'Cyberpunk vibes with neon accents';
    };
    'light-hippy': {
      name: 'Light Hippy';
      description: 'Peaceful pastels and natural tones';
    };
    'modern-sleek': {
      name: 'Modern Sleek';
      description: 'Clean lines and professional aesthetics';
    };
  };
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      currentTheme: 'dark-retro',
      setTheme: (theme) => {
        set({ currentTheme: theme });
        // Update document class for global theme changes
        document.documentElement.className = theme;
        document.documentElement.setAttribute('data-theme', theme);
      },
      themes: {
        'dark-retro': {
          name: 'Dark Retro',
          description: 'Cyberpunk vibes with neon accents'
        },
        'light-hippy': {
          name: 'Light Hippy', 
          description: 'Peaceful pastels and natural tones'
        },
        'modern-sleek': {
          name: 'Modern Sleek',
          description: 'Clean lines and professional aesthetics'
        }
      }
    }),
    {
      name: 'theme-storage'
    }
  )
);