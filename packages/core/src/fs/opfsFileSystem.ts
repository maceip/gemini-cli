/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileSystem, FileStat, FileSystemConfig } from './types.js';
import { GrepResult } from '../tools/grep.js';

interface OPFSFile {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
}

export class OPFSFileSystem implements FileSystem {
  private config: FileSystemConfig;
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private currentWorkingDirectory: string = '/';
  private fileHandleCache = new Map<string, FileSystemFileHandle | FileSystemDirectoryHandle>();

  constructor(config: FileSystemConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
      throw new Error('Origin Private File System is not supported in this browser');
    }
    this.rootHandle = await navigator.storage.getDirectory();
  }

  private async getHandle(path: string): Promise<FileSystemFileHandle | FileSystemDirectoryHandle> {
    if (!this.rootHandle) {
      await this.initialize();
    }

    const cached = this.fileHandleCache.get(path);
    if (cached) return cached;

    const parts = this.normalizePath(path).split('/').filter(p => p);
    let current: FileSystemDirectoryHandle = this.rootHandle!;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      try {
        if (isLast) {
          // Try to get as file first, then as directory
          try {
            const handle = await current.getFileHandle(part);
            this.fileHandleCache.set(path, handle);
            return handle;
          } catch {
            const handle = await current.getDirectoryHandle(part);
            this.fileHandleCache.set(path, handle);
            return handle;
          }
        } else {
          current = await current.getDirectoryHandle(part);
        }
      } catch (e) {
        throw new Error(`Path not found: ${path}`);
      }
    }

    return current;
  }

  private async createHandle(path: string, type: 'file' | 'directory'): Promise<FileSystemFileHandle | FileSystemDirectoryHandle> {
    if (!this.rootHandle) {
      await this.initialize();
    }

    const parts = this.normalizePath(path).split('/').filter(p => p);
    let current: FileSystemDirectoryHandle = this.rootHandle!;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        if (type === 'file') {
          const handle = await current.getFileHandle(part, { create: true });
          this.fileHandleCache.set(path, handle);
          return handle;
        } else {
          const handle = await current.getDirectoryHandle(part, { create: true });
          this.fileHandleCache.set(path, handle);
          return handle;
        }
      } else {
        current = await current.getDirectoryHandle(part, { create: true });
      }
    }

    return current;
  }

  async readFile(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const handle = await this.getHandle(path);
    if (handle.kind !== 'file') {
      throw new Error(`Not a file: ${path}`);
    }

    const file = await (handle as FileSystemFileHandle).getFile();
    const text = await file.text();
    return text;
  }

  async readFileBuffer(path: string): Promise<Buffer> {
    const handle = await this.getHandle(path);
    if (handle.kind !== 'file') {
      throw new Error(`Not a file: ${path}`);
    }

    const file = await (handle as FileSystemFileHandle).getFile();
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async writeFile(path: string, content: string | Buffer, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    const handle = await this.createHandle(path, 'file') as FileSystemFileHandle;
    const writable = await handle.createWritable();

    try {
      if (typeof content === 'string') {
        await writable.write(content);
      } else {
        await writable.write(content);
      }
    } finally {
      await writable.close();
    }
  }

  async readdir(path: string): Promise<string[]> {
    const handle = await this.getHandle(path);
    if (handle.kind !== 'directory') {
      throw new Error(`Not a directory: ${path}`);
    }

    const entries: string[] = [];
    // @ts-ignore - values() is available on FileSystemDirectoryHandle
    for await (const entry of (handle as FileSystemDirectoryHandle).values()) {
      entries.push(entry.name);
    }
    return entries;
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    if (options?.recursive) {
      const parts = this.normalizePath(path).split('/').filter(p => p);
      let currentPath = '';
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        try {
          await this.createHandle(currentPath, 'directory');
        } catch {
          // Directory might already exist
        }
      }
    } else {
      await this.createHandle(path, 'directory');
    }
  }

  async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const parentPath = this.dirname(path);
    const name = this.basename(path);
    
    const parentHandle = await this.getHandle(parentPath) as FileSystemDirectoryHandle;
    await parentHandle.removeEntry(name, { recursive: options?.recursive });
    this.fileHandleCache.delete(path);
  }

  async unlink(path: string): Promise<void> {
    const parentPath = this.dirname(path);
    const name = this.basename(path);
    
    const parentHandle = await this.getHandle(parentPath) as FileSystemDirectoryHandle;
    await parentHandle.removeEntry(name);
    this.fileHandleCache.delete(path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    // OPFS doesn't support direct rename, so we need to copy and delete
    const content = await this.readFileBuffer(oldPath);
    await this.writeFile(newPath, content);
    await this.unlink(oldPath);
  }

  async copyFile(src: string, dest: string): Promise<void> {
    const content = await this.readFileBuffer(src);
    await this.writeFile(dest, content);
  }

  async stat(path: string): Promise<FileStat> {
    const handle = await this.getHandle(path);
    
    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile();
      return {
        isFile: true,
        isDirectory: false,
        size: file.size,
        mtime: new Date(file.lastModified),
      };
    } else {
      return {
        isFile: false,
        isDirectory: true,
        size: 0,
        mtime: new Date(),
      };
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.getHandle(path);
      return true;
    } catch {
      return false;
    }
  }

  async glob(pattern: string, options?: { cwd?: string }): Promise<string[]> {
    const cwd = options?.cwd || this.currentWorkingDirectory;
    const results: string[] = [];
    
    // Convert glob pattern to regex
    const regex = this.globToRegex(pattern);
    
    // Recursively search from cwd
    await this.searchRecursive(cwd, regex, cwd, results);
    
    return results;
  }

  private async searchRecursive(basePath: string, regex: RegExp, rootPath: string, results: string[]): Promise<void> {
    try {
      const entries = await this.readdir(basePath);
      
      for (const entry of entries) {
        const fullPath = this.join(basePath, entry);
        const relativePath = this.relative(rootPath, fullPath);
        
        if (regex.test(relativePath)) {
          results.push(relativePath);
        }
        
        try {
          const stat = await this.stat(fullPath);
          if (stat.isDirectory) {
            await this.searchRecursive(fullPath, regex, rootPath, results);
          }
        } catch {
          // Skip inaccessible entries
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  private globToRegex(glob: string): RegExp {
    const escaped = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }

  async grep(pattern: string, path: string, options?: { recursive?: boolean }): Promise<GrepResult[]> {
    const results: GrepResult[] = [];
    const regex = new RegExp(pattern, 'g');
    
    const processFile = async (filePath: string) => {
      try {
        const content = await this.readFile(filePath);
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const matches = line.matchAll(regex);
          for (const match of matches) {
            results.push({
              file: filePath,
              line: index + 1,
              column: match.index || 0,
              match: line.trim(),
            });
          }
        });
      } catch {
        // Skip files that can't be read
      }
    };

    const stat = await this.stat(path);
    
    if (stat.isFile) {
      await processFile(path);
    } else if (stat.isDirectory && options?.recursive) {
      await this.grepDirectory(path, regex, results);
    }
    
    return results;
  }

  private async grepDirectory(dirPath: string, regex: RegExp, results: GrepResult[]): Promise<void> {
    const entries = await this.readdir(dirPath);
    
    for (const entry of entries) {
      const fullPath = this.join(dirPath, entry);
      try {
        const stat = await this.stat(fullPath);
        if (stat.isFile) {
          const content = await this.readFile(fullPath);
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            const matches = line.matchAll(regex);
            for (const match of matches) {
              results.push({
                file: fullPath,
                line: index + 1,
                column: match.index || 0,
                match: line.trim(),
              });
            }
          });
        } else if (stat.isDirectory) {
          await this.grepDirectory(fullPath, regex, results);
        }
      } catch {
        // Skip inaccessible entries
      }
    }
  }

  join(...paths: string[]): string {
    return paths.join('/').replace(/\/+/g, '/');
  }

  resolve(...paths: string[]): string {
    const combined = paths.join('/');
    return this.normalizePath(combined);
  }

  relative(from: string, to: string): string {
    const fromParts = this.normalizePath(from).split('/').filter(p => p);
    const toParts = this.normalizePath(to).split('/').filter(p => p);
    
    let commonLength = 0;
    for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
      if (fromParts[i] === toParts[i]) {
        commonLength++;
      } else {
        break;
      }
    }
    
    const upCount = fromParts.length - commonLength;
    const relativeParts = Array(upCount).fill('..').concat(toParts.slice(commonLength));
    
    return relativeParts.join('/') || '.';
  }

  dirname(path: string): string {
    const normalized = this.normalizePath(path);
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash <= 0 ? '/' : normalized.substring(0, lastSlash);
  }

  basename(path: string, ext?: string): string {
    const normalized = this.normalizePath(path);
    const lastSlash = normalized.lastIndexOf('/');
    const base = lastSlash === -1 ? normalized : normalized.substring(lastSlash + 1);
    
    if (ext && base.endsWith(ext)) {
      return base.substring(0, base.length - ext.length);
    }
    return base;
  }

  extname(path: string): string {
    const base = this.basename(path);
    const lastDot = base.lastIndexOf('.');
    return lastDot === -1 ? '' : base.substring(lastDot);
  }

  cwd(): string {
    return this.currentWorkingDirectory;
  }

  chdir(path: string): void {
    this.currentWorkingDirectory = this.normalizePath(path);
  }

  private normalizePath(path: string): string {
    if (!path.startsWith('/')) {
      path = this.join(this.currentWorkingDirectory, path);
    }
    
    const parts = path.split('/').filter(p => p && p !== '.');
    const normalized: string[] = [];
    
    for (const part of parts) {
      if (part === '..') {
        normalized.pop();
      } else {
        normalized.push(part);
      }
    }
    
    return '/' + normalized.join('/');
  }
}