import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { useChat } from '../hooks/useChat';
import { MessageRenderer } from './MessageRenderer';
import styles from './Terminal.module.css';

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { sendMessage, messages, currentMessage } = useChat();

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const term = new XTerm({
      theme: {
        background: '#1a1a1a',
        foreground: '#e0e0e0',
        cursor: '#e0e0e0',
        cursorAccent: '#1a1a1a',
        selection: '#4c4c4c',
        black: '#000000',
        red: '#ff3838',
        green: '#00c896',
        yellow: '#ff9500',
        blue: '#0084ff',
        magenta: '#ff0084',
        cyan: '#00c8c8',
        white: '#e0e0e0',
        brightBlack: '#666666',
        brightRed: '#ff6666',
        brightGreen: '#66ff66',
        brightYellow: '#ffff66',
        brightBlue: '#6666ff',
        brightMagenta: '#ff66ff',
        brightCyan: '#66ffff',
        brightWhite: '#ffffff',
      },
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", "SF Mono", Monaco, "Courier New", monospace',
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      convertEol: true,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    // Open terminal
    term.open(terminalRef.current);
    fitAddon.fit();

    // Store references
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('Welcome to Gemini CLI - Browser Edition');
    term.writeln('Type your message and press Enter to send.');
    term.writeln('');
    term.write('> ');

    // Handle input
    let currentLine = '';
    term.onData((data) => {
      if (isProcessing) return;

      switch (data) {
        case '\r': // Enter
          if (currentLine.trim()) {
            term.writeln('');
            handleSendMessage(currentLine);
            currentLine = '';
          }
          break;
        case '\u007F': // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write('\b \b');
          }
          break;
        case '\u0003': // Ctrl+C
          currentLine = '';
          term.writeln('^C');
          term.write('> ');
          break;
        default:
          if (data >= ' ') {
            currentLine += data;
            term.write(data);
          }
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [isProcessing]);

  const handleSendMessage = async (message: string) => {
    if (!xtermRef.current) return;
    
    setIsProcessing(true);
    const term = xtermRef.current;
    
    // Show user message
    term.writeln(`\x1b[36mYou:\x1b[0m ${message}`);
    term.writeln('');
    
    try {
      // Send message and get response
      await sendMessage(message);
      
      // Response will be rendered through the messages state
    } catch (error) {
      term.writeln(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      term.writeln('');
      term.write('> ');
    }
  };

  // Render messages
  useEffect(() => {
    if (!xtermRef.current) return;
    const term = xtermRef.current;

    // Clear and re-render all messages
    term.clear();
    term.writeln('Welcome to Gemini CLI - Browser Edition');
    term.writeln('');

    messages.forEach((msg) => {
      if (msg.role === 'user') {
        term.writeln(`\x1b[36mYou:\x1b[0m ${msg.content}`);
      } else {
        term.writeln(`\x1b[32mAssistant:\x1b[0m`);
        // For assistant messages, we need to render markdown
        const lines = msg.content.split('\n');
        lines.forEach(line => term.writeln(line));
      }
      term.writeln('');
    });

    // Show current message if streaming
    if (currentMessage) {
      term.writeln(`\x1b[32mAssistant:\x1b[0m`);
      const lines = currentMessage.split('\n');
      lines.forEach(line => term.writeln(line));
      term.write('▊'); // Cursor to show it's still processing
    } else if (!isProcessing) {
      term.write('> ');
    }
  }, [messages, currentMessage, isProcessing]);

  return (
    <div className={styles.container}>
      <div ref={terminalRef} className={styles.terminal} />
      {/* Hidden message renderer for complex content */}
      <div style={{ display: 'none' }}>
        {messages.map((msg, index) => (
          <MessageRenderer key={index} message={msg} />
        ))}
      </div>
    </div>
  );
}