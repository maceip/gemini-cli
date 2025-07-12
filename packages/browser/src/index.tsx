import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { initializePlatform } from './utils/initializePlatform';
import './styles/global.css';

// Initialize the platform before rendering
async function main() {
  try {
    // Initialize platform-specific features
    await initializePlatform();
    
    // Render the app
    const root = ReactDOM.createRoot(
      document.getElementById('root') as HTMLElement
    );
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize application:', error);
    document.getElementById('root')!.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center;">
        <div>
          <h1>Initialization Error</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p>Please ensure your browser supports the required features.</p>
        </div>
      </div>
    `;
  }
}

// Start the application
main();