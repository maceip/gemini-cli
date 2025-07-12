import React, { createContext, ReactNode } from 'react';

interface Config {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export const ConfigContext = createContext<Config | null>(null);

interface ConfigProviderProps {
  value: Config;
  children: ReactNode;
}

export function ConfigProvider({ value, children }: ConfigProviderProps) {
  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}