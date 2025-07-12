import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { useConfig } from '../hooks/useConfig';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContextType {
  messages: Message[];
  currentMessage: string | null;
  isProcessing: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const ChatContext = createContext<ChatContextType | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { config } = useConfig();

  const sendMessage = useCallback(async (content: string) => {
    if (!config.apiKey) {
      throw new Error('API key not configured');
    }

    setIsProcessing(true);
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // TODO: Implement actual Gemini API call here
      // For now, simulate a response
      setCurrentMessage('');
      
      // Simulate streaming response
      const response = "I'm a simulated response from Gemini. In the real implementation, this would call the Gemini API and stream the response.";
      
      for (let i = 0; i < response.length; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setCurrentMessage(response.slice(0, i + 5));
      }

      // Add complete message
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentMessage(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [config]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentMessage(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        currentMessage,
        isProcessing,
        sendMessage,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}