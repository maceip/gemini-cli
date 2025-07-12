/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import { FileSystem } from '../fs/types.js';
import { NodeFileSystem } from '../fs/nodeFileSystem.js';
import { Platform, PlatformType, PlatformCapabilities, Shell, ShellOptions, ShellResult } from './types.js';

const execAsync = promisify(exec);

class NodeShell implements Shell {
  private currentDirectory: string = process.cwd();
  private environment: Record<string, string> = { ...process.env };

  async execute(command: string, options?: ShellOptions): Promise<ShellResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options?.cwd || this.currentDirectory,
        env: { ...this.environment, ...options?.env },
        timeout: options?.timeout,
      });

      return {
        stdout,
        stderr,
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  }

  async cd(path: string): Promise<void> {
    this.currentDirectory = path;
    process.chdir(path);
  }

  pwd(): string {
    return this.currentDirectory;
  }

  env(): Record<string, string> {
    return { ...this.environment };
  }
}

export class NodePlatform implements Platform {
  type: PlatformType = 'node';
  
  capabilities: PlatformCapabilities = {
    fileSystem: true,
    shell: true,
    git: true,
    clipboard: true,
    process: true,
    childProcess: true,
  };

  createFileSystem(config?: any): FileSystem {
    return new NodeFileSystem({
      rootDirectory: config?.rootDirectory || process.cwd(),
      maxFileSize: config?.maxFileSize,
      encoding: config?.encoding,
    });
  }

  createShell(): Shell {
    return new NodeShell();
  }

  getEnvironment(): Record<string, string> {
    return { ...process.env };
  }

  exit(code: number): void {
    process.exit(code);
  }

  getStoragePath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.gemini-cli');
  }

  async readClipboard(): Promise<string> {
    // Platform-specific clipboard reading
    const platform = process.platform;
    let command: string;

    switch (platform) {
      case 'darwin':
        command = 'pbpaste';
        break;
      case 'win32':
        command = 'powershell -command "Get-Clipboard"';
        break;
      default:
        command = 'xclip -selection clipboard -o';
    }

    try {
      const { stdout } = await execAsync(command);
      return stdout;
    } catch (error) {
      throw new Error('Failed to read clipboard');
    }
  }

  async writeClipboard(text: string): Promise<void> {
    const platform = process.platform;
    let command: string;

    switch (platform) {
      case 'darwin':
        command = 'pbcopy';
        break;
      case 'win32':
        command = 'clip';
        break;
      default:
        command = 'xclip -selection clipboard';
    }

    const exec = require('child_process').exec;
    return new Promise((resolve, reject) => {
      const child = exec(command);
      child.stdin.write(text);
      child.stdin.end();
      
      child.on('error', reject);
      child.on('exit', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Clipboard command failed with code ${code}`));
        }
      });
    });
  }
}