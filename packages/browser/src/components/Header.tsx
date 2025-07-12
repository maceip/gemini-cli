import React from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  onToggleSidebar: () => void;
  onThemeChange: (theme: string) => void;
  currentTheme: string;
}

export function Header({ onToggleSidebar, onThemeChange, currentTheme }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button 
          className={styles.menuButton}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h14v2H3v-2z" />
          </svg>
        </button>
        
        <h1 className={styles.title}>Gemini CLI</h1>
        <span className={styles.badge}>Browser Edition</span>
      </div>

      <div className={styles.right}>
        <button
          className={styles.themeButton}
          onClick={() => onThemeChange(currentTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {currentTheme === 'dark' ? '🌞' : '🌙'}
        </button>
        
        <button className={styles.settingsButton} aria-label="Settings">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M10 1.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM3.5 10a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </header>
  );
}