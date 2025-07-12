/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileSystem } from '../fs/types.js';

export type PlatformType = 'node' | 'browser';

export interface PlatformCapabilities {
  fileSystem: boolean;
  shell: boolean;
  git: boolean;
  clipboard: boolean;
  process: boolean;
  childProcess: boolean;
}

export interface Shell {
  execute(command: string, options?: ShellOptions): Promise<ShellResult>;
  cd(path: string): Promise<void>;
  pwd(): string;
  env(): Record<string, string>;
}

export interface ShellOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface Platform {
  type: PlatformType;
  capabilities: PlatformCapabilities;
  
  // Factory methods
  createFileSystem(config?: any): FileSystem;
  createShell?(): Shell;
  
  // Platform-specific utilities
  getEnvironment(): Record<string, string>;
  exit(code: number): void;
  
  // Storage
  getStoragePath(): string;
  
  // Clipboard
  readClipboard?(): Promise<string>;
  writeClipboard?(text: string): Promise<void>;
}