/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchemaValidator } from '../utils/schemaValidator.js';
import { BaseTool, ToolResult } from './tools.js';
import { Type } from '@google/genai';
import { Config } from '../config/config.js';
import { makeRelative, shortenPath } from '../utils/paths.js';
import { getFileSystem } from '../utils/fileUtilsAbstract.js';

/**
 * Parameters for the LS tool
 */
export interface LSToolParams {
  /**
   * The directory path to list
   */
  path: string;
}

/**
 * Implementation of the LS tool logic using platform abstraction
 */
export class LSToolAbstract extends BaseTool<LSToolParams, ToolResult> {
  static readonly Name: string = 'ls';
  private fs = getFileSystem();

  constructor(
    private rootDirectory: string,
    private config: Config,
  ) {
    super(
      LSToolAbstract.Name,
      'LS',
      'Lists files and directories in a given path.',
      {
        properties: {
          path: {
            description:
              'The absolute path to the directory to list',
            type: Type.STRING,
          },
        },
        required: ['path'],
        type: Type.OBJECT,
      },
    );
    this.rootDirectory = this.fs.resolve(rootDirectory);
  }

  validateToolParams(params: LSToolParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (!params.path || params.path.trim() === '') {
      return 'Path cannot be empty';
    }

    return null;
  }

  getDescription(params: LSToolParams): string {
    if (!params || typeof params.path !== 'string' || params.path.trim() === '') {
      return 'Path unavailable';
    }
    const relativePath = makeRelative(params.path, this.rootDirectory);
    return shortenPath(relativePath);
  }

  async execute(
    params: LSToolParams,
    _signal: AbortSignal,
  ): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      return {
        llmContent: `Error: ${validationError}`,
        returnDisplay: validationError,
      };
    }

    try {
      const resolvedPath = this.fs.resolve(params.path);

      // Check if path exists
      if (!(await this.fs.exists(resolvedPath))) {
        return {
          llmContent: `Error: Path not found: ${params.path}`,
          returnDisplay: `Path not found: ${params.path}`,
        };
      }

      // Check if it's a directory
      const stat = await this.fs.stat(resolvedPath);
      if (!stat.isDirectory) {
        return {
          llmContent: `Error: Not a directory: ${params.path}`,
          returnDisplay: `Not a directory: ${params.path}`,
        };
      }

      // Check if it's ignored
      const fileService = this.config.getFileService();
      if (fileService.shouldGeminiIgnoreFile(resolvedPath)) {
        return {
          llmContent: `Directory is ignored by .geminiignore: ${params.path}`,
          returnDisplay: `Directory is ignored by .geminiignore: ${params.path}`,
        };
      }

      // List directory contents
      const entries = await this.fs.readdir(resolvedPath);
      
      // Get details for each entry
      const entryDetails = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = this.fs.join(resolvedPath, entry);
          try {
            const entryStat = await this.fs.stat(entryPath);
            return {
              name: entry,
              isDirectory: entryStat.isDirectory,
              size: entryStat.size,
              mtime: entryStat.mtime,
              ignored: fileService.shouldGeminiIgnoreFile(entryPath),
            };
          } catch {
            return {
              name: entry,
              isDirectory: false,
              size: 0,
              mtime: new Date(),
              ignored: false,
              error: true,
            };
          }
        })
      );

      // Sort entries: directories first, then files, both alphabetically
      entryDetails.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      // Format output
      const lines = entryDetails.map(entry => {
        let line = '';
        if (entry.isDirectory) {
          line = `[DIR]  ${entry.name}/`;
        } else {
          const sizeStr = this.formatFileSize(entry.size);
          line = `[FILE] ${entry.name} (${sizeStr})`;
        }
        if (entry.ignored) {
          line += ' [ignored]';
        }
        if (entry.error) {
          line += ' [error reading]';
        }
        return line;
      });

      const relativePath = makeRelative(resolvedPath, this.rootDirectory);
      const header = `Contents of ${relativePath}:\n`;
      const resultText = header + lines.join('\n');

      const fileCount = entryDetails.filter(e => !e.isDirectory && !e.error).length;
      const dirCount = entryDetails.filter(e => e.isDirectory).length;
      
      return {
        llmContent: resultText,
        returnDisplay: `Listed ${fileCount} file(s) and ${dirCount} directory(ies)`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error listing directory: ${errorMessage}`,
        returnDisplay: `Error listing directory: ${errorMessage}`,
      };
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
  }
}