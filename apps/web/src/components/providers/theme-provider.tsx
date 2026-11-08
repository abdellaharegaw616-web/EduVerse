'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'eduverse-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      const initialTheme = stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'light';
      setThemeState(initialTheme);

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const resolved = initialTheme === 'system'
        ? (mediaQuery.matches ? 'dark' : 'light')
        : initialTheme;

      setResolvedTheme(resolved);
      applyThemeToDOM(resolved);
    } catch {
      // Fallback if localStorage or matchMedia is unavailable
      setResolvedTheme('light');
      applyThemeToDOM('light');
    }
    setMounted(true);
  }, []);

  // Listen to system theme changes if theme === 'system'
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const nextResolved = mediaQuery.matches ? 'dark' : 'light';
      setResolvedTheme(nextResolved);
      applyThemeToDOM(nextResolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const applyThemeToDOM = (resolved: ResolvedTheme) => {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore storage failure
    }

    let nextResolved: ResolvedTheme = 'light';
    if (newTheme === 'system') {
      const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      nextResolved = isDark ? 'dark' : 'light';
    } else {
      nextResolved = newTheme;
    }

    setResolvedTheme(nextResolved);
    applyThemeToDOM(nextResolved);
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

