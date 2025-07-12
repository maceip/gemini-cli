/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { glob as globLib } from 'glob';
import { FileSystem, FileStat, FileSystemConfig } from './types.js';
import { GrepResult } from '../tools/grep.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class NodeFileSystem implements FileSystem {
  private config: FileSystemConfig;
  private currentWorkingDirectory: string;

  constructor(config: FileSystemConfig) {
    this.config = config;
    this.currentWorkingDirectory = process.cwd();
  }

  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const resolvedPath = this.resolvePath(filePath);
    return fs.promises.readFile(resolvedPath, encoding);
  }

  async readFileBuffer(filePath: string): Promise<Buffer> {
    const resolvedPath = this.resolvePath(filePath);
    return fs.promises.readFile(resolvedPath);
  }

  async writeFile(filePath: string, content: string | Buffer, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);
    await fs.promises.writeFile(resolvedPath, content, encoding);
  }

  async readdir(dirPath: string): Promise<string[]> {
    const resolvedPath = this.resolvePath(dirPath);
    return fs.promises.readdir(resolvedPath);
  }

  async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    const resolvedPath = this.resolvePath(dirPath);
    await fs.promises.mkdir(resolvedPath, options);
  }

  async rmdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    const resolvedPath = this.resolvePath(dirPath);
    if (options?.recursive) {
      await fs.promises.rm(resolvedPath, { recursive: true, force: true });
    } else {
      await fs.promises.rmdir(resolvedPath);
    }
  }

  async unlink(filePath: string): Promise<void> {
    const resolvedPath = this.resolvePath(filePath);
    await fs.promises.unlink(resolvedPath);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const resolvedOldPath = this.resolvePath(oldPath);
    const resolvedNewPath = this.resolvePath(newPath);
    await fs.promises.rename(resolvedOldPath, resolvedNewPath);
  }

  async copyFile(src: string, dest: string): Promise<void> {
    const resolvedSrc = this.resolvePath(src);
    const resolvedDest = this.resolvePath(dest);
    await fs.promises.copyFile(resolvedSrc, resolvedDest);
  }

  async stat(filePath: string): Promise<FileStat> {
    const resolvedPath = this.resolvePath(filePath);
    const stats = await fs.promises.stat(resolvedPath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime,
      mode: stats.mode,
    };
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      await fs.promises.access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }

  async glob(pattern: string, options?: { cwd?: string }): Promise<string[]> {
    const cwd = options?.cwd || this.currentWorkingDirectory;
    return globLib(pattern, { cwd });
  }

  async grep(pattern: string, filePath: string, options?: { recursive?: boolean }): Promise<GrepResult[]> {
    // For now, we'll use ripgrep if available, otherwise fall back to a simple implementation
    try {
      const resolvedPath = this.resolvePath(filePath);
      const recursive = options?.recursive ? '-r' : '';
      const { stdout } = await execAsync(`rg --json "${pattern}" ${recursive} "${resolvedPath}"`);
      
      const results: GrepResult[] = [];
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'match') {
            results.push({
              file: parsed.data.path.text,
              line: parsed.data.line_number,
              column: parsed.data.submatches[0]?.start || 0,
              match: parsed.data.lines.text.trim(),
            });
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
      
      return results;
    } catch {
      // Fallback to simple grep implementation
      return this.simpleGrep(pattern, filePath, options);
    }
  }

  private async simpleGrep(pattern: string, filePath: string, options?: { recursive?: boolean }): Promise<GrepResult[]> {
    const results: GrepResult[] = [];
    const regex = new RegExp(pattern, 'g');
    
    const processFile = async (file: string) => {
      try {
        const content = await this.readFile(file);
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const matches = line.matchAll(regex);
          for (const match of matches) {
            results.push({
              file,
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

    const resolvedPath = this.resolvePath(filePath);
    const stats = await this.stat(resolvedPath);
    
    if (stats.isFile) {
      await processFile(resolvedPath);
    } else if (stats.isDirectory && options?.recursive) {
      const files = await this.glob('**/*', { cwd: resolvedPath });
      for (const file of files) {
        const fullPath = this.join(resolvedPath, file);
        const fileStat = await this.stat(fullPath);
        if (fileStat.isFile) {
          await processFile(fullPath);
        }
      }
    }
    
    return results;
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  relative(from: string, to: string): string {
    return path.relative(from, to);
  }

  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  extname(filePath: string): string {
    return path.extname(filePath);
  }

  cwd(): string {
    return this.currentWorkingDirectory;
  }

  chdir(dirPath: string): void {
    const resolvedPath = this.resolvePath(dirPath);
    this.currentWorkingDirectory = resolvedPath;
  }

  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.currentWorkingDirectory, filePath);
  }
}