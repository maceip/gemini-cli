import React, { useState, useEffect } from 'react';
import { Terminal } from './Terminal';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useTheme } from '../hooks/useTheme';
import { useFileSystem } from '../hooks/useFileSystem';
import { useConfig } from '../hooks/useConfig';
import { ChatProvider } from '../contexts/ChatContext';
import { ConfigProvider } from '../contexts/ConfigContext';
import styles from './App.module.css';

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const { initialized, error: fsError } = useFileSystem();
  const { config, loading: configLoading } = useConfig();

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (fsError) {
    return (
      <div className={styles.errorContainer}>
        <h2>File System Error</h2>
        <p>{fsError}</p>
        <p>Please ensure your browser supports the required features.</p>
      </div>
    );
  }

  if (!initialized || configLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Initializing Gemini CLI...</p>
      </div>
    );
  }

  return (
    <ConfigProvider value={config}>
      <ChatProvider>
        <div className={styles.app}>
          <Header 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onThemeChange={setTheme}
            currentTheme={theme}
          />
          
          <div className={styles.main}>
            {sidebarOpen && (
              <Sidebar 
                onClose={() => setSidebarOpen(false)}
              />
            )}
            
            <div className={styles.content}>
              <Terminal />
            </div>
          </div>
        </div>
      </ChatProvider>
    </ConfigProvider>
  );
}