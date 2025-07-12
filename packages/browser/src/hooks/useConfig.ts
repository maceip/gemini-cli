import { useState, useEffect } from 'react';

interface Config {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

const DEFAULT_CONFIG: Config = {
  model: 'gemini-pro',
  temperature: 0.7,
  maxTokens: 2048,
};

export function useConfig() {
  const [config, setConfig] = useState<Config>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('gemini-config');
    if (saved) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Save to localStorage whenever config changes
    localStorage.setItem('gemini-config', JSON.stringify(config));
  }, [config]);

  const updateConfig = (updates: Partial<Config>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return {
    config,
    updateConfig,
    loading,
  };
}