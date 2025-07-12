import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    // Get saved theme from localStorage or default to system preference
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme };
}