/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileSystem } from '../fs/types.js';
import { OPFSFileSystem } from '../fs/opfsFileSystem.js';
import { Platform, PlatformType, PlatformCapabilities, Shell, ShellOptions, ShellResult } from './types.js';

// Limited shell implementation for browser
class BrowserShell implements Shell {
  private currentDirectory: string = '/';
  private environment: Record<string, string> = {
    HOME: '/',
    USER: 'web-user',
    SHELL: '/bin/sh',
    PATH: '/bin:/usr/bin',
  };

  async execute(command: string, options?: ShellOptions): Promise<ShellResult> {
    // Parse command
    const [cmd, ...args] = command.trim().split(/\s+/);

    // Handle basic built-in commands
    switch (cmd) {
      case 'echo':
        return {
          stdout: args.join(' ') + '\n',
          stderr: '',
          exitCode: 0,
        };

      case 'pwd':
        return {
          stdout: this.currentDirectory + '\n',
          stderr: '',
          exitCode: 0,
        };

      case 'cd':
        const newDir = args[0] || '/';
        this.currentDirectory = this.resolvePath(newDir);
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
        };

      case 'env':
        const envOutput = Object.entries(this.environment)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        return {
          stdout: envOutput + '\n',
          stderr: '',
          exitCode: 0,
        };

      case 'exit':
        const code = parseInt(args[0] || '0');
        return {
          stdout: '',
          stderr: '',
          exitCode: code,
        };

      default:
        return {
          stdout: '',
          stderr: `Command not found: ${cmd}`,
          exitCode: 127,
        };
    }
  }

  async cd(path: string): Promise<void> {
    this.currentDirectory = this.resolvePath(path);
  }

  pwd(): string {
    return this.currentDirectory;
  }

  env(): Record<string, string> {
    return { ...this.environment };
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path;
    }
    
    // Handle relative paths
    const parts = this.currentDirectory.split('/').filter(p => p);
    const newParts = path.split('/');
    
    for (const part of newParts) {
      if (part === '..') {
        parts.pop();
      } else if (part && part !== '.') {
        parts.push(part);
      }
    }
    
    return '/' + parts.join('/');
  }
}

export class BrowserPlatform implements Platform {
  type: PlatformType = 'browser';
  
  capabilities: PlatformCapabilities = {
    fileSystem: true,
    shell: false, // Limited shell functionality
    git: false,
    clipboard: true,
    process: false,
    childProcess: false,
  };

  createFileSystem(config?: any): FileSystem {
    return new OPFSFileSystem({
      rootDirectory: config?.rootDirectory || '/',
      maxFileSize: config?.maxFileSize || 20 * 1024 * 1024, // 20MB default
      encoding: config?.encoding || 'utf-8',
    });
  }

  createShell(): Shell {
    return new BrowserShell();
  }

  getEnvironment(): Record<string, string> {
    // Return browser-specific environment
    return {
      USER_AGENT: navigator.userAgent,
      LANGUAGE: navigator.language,
      PLATFORM: navigator.platform,
      ONLINE: navigator.onLine ? 'true' : 'false',
    };
  }

  exit(code: number): void {
    // In browser, we can't really exit, so just log
    console.log(`Exit called with code: ${code}`);
    
    // Optionally close the window/tab if allowed
    if (code !== 0) {
      window.close();
    }
  }

  getStoragePath(): string {
    // Use a virtual path for browser storage
    return '/storage';
  }

  async readClipboard(): Promise<string> {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not available');
    }
    
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      throw new Error('Failed to read clipboard: permission denied');
    }
  }

  async writeClipboard(text: string): Promise<void> {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not available');
    }
    
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      throw new Error('Failed to write clipboard: permission denied');
    }
  }
}