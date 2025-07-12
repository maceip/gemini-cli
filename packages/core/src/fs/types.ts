/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GrepResult } from '../tools/grep.js';

export interface FileStat {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: Date;
  mode?: number;
}

export interface FileSystemEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface FileSystem {
  // Basic file operations
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  readFileBuffer(path: string): Promise<Buffer>;
  writeFile(path: string, content: string | Buffer, encoding?: BufferEncoding): Promise<void>;
  
  // Directory operations
  readdir(path: string): Promise<string[]>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  
  // File management
  unlink(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
  
  // File information
  stat(path: string): Promise<FileStat>;
  exists(path: string): Promise<boolean>;
  
  // Advanced operations
  glob(pattern: string, options?: { cwd?: string }): Promise<string[]>;
  grep(pattern: string, path: string, options?: { recursive?: boolean }): Promise<GrepResult[]>;
  
  // Path operations
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  relative(from: string, to: string): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  extname(path: string): string;
  
  // Working directory
  cwd(): string;
  chdir(path: string): void;
}

export interface FileSystemConfig {
  rootDirectory: string;
  maxFileSize?: number;
  encoding?: BufferEncoding;
}