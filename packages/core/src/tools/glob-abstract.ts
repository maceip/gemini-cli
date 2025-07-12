/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchemaValidator } from '../utils/schemaValidator.js';
import { BaseTool, ToolResult } from './tools.js';
import { Type } from '@google/genai';
import { Config } from '../config/config.js';
import { makeRelative } from '../utils/paths.js';
import { getFileSystem } from '../utils/fileUtilsAbstract.js';

/**
 * Parameters for the Glob tool
 */
export interface GlobToolParams {
  /**
   * The glob pattern to match files against
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to current working directory)
   */
  cwd?: string;
}

/**
 * Implementation of the Glob tool logic using platform abstraction
 */
export class GlobToolAbstract extends BaseTool<GlobToolParams, ToolResult> {
  static readonly Name: string = 'glob';
  private fs = getFileSystem();

  constructor(
    private rootDirectory: string,
    private config: Config,
  ) {
    super(
      GlobToolAbstract.Name,
      'Glob',
      'Searches for files matching a glob pattern in the filesystem.',
      {
        properties: {
          pattern: {
            description:
              'The glob pattern to match files against (e.g., "**/*.js" for all JavaScript files)',
            type: Type.STRING,
          },
          cwd: {
            description:
              'The directory to search in. If not specified, uses the current working directory.',
            type: Type.STRING,
          },
        },
        required: ['pattern'],
        type: Type.OBJECT,
      },
    );
    this.rootDirectory = this.fs.resolve(rootDirectory);
  }

  validateToolParams(params: GlobToolParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (!params.pattern || params.pattern.trim() === '') {
      return 'Pattern cannot be empty';
    }

    return null;
  }

  getDescription(params: GlobToolParams): string {
    return `Searching for files matching pattern: ${params.pattern}`;
  }

  async execute(
    params: GlobToolParams,
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
      const cwd = params.cwd || this.fs.cwd();
      const resolvedCwd = this.fs.resolve(cwd);

      // Ensure the search directory exists
      if (!(await this.fs.exists(resolvedCwd))) {
        return {
          llmContent: `Error: Directory not found: ${cwd}`,
          returnDisplay: `Directory not found: ${cwd}`,
        };
      }

      const stat = await this.fs.stat(resolvedCwd);
      if (!stat.isDirectory) {
        return {
          llmContent: `Error: Not a directory: ${cwd}`,
          returnDisplay: `Not a directory: ${cwd}`,
        };
      }

      // Execute glob search
      const matches = await this.fs.glob(params.pattern, { cwd: resolvedCwd });
      
      // Filter out ignored files
      const fileService = this.config.getFileService();
      const filteredMatches = matches.filter(match => {
        const absolutePath = this.fs.resolve(resolvedCwd, match);
        return !fileService.shouldGeminiIgnoreFile(absolutePath);
      });

      if (filteredMatches.length === 0) {
        return {
          llmContent: `No files found matching pattern: ${params.pattern}`,
          returnDisplay: `No files found matching pattern: ${params.pattern}`,
        };
      }

      // Convert to relative paths for display
      const relativePaths = filteredMatches.map(match => {
        const absolutePath = this.fs.resolve(resolvedCwd, match);
        return makeRelative(absolutePath, this.rootDirectory);
      });

      const sortedPaths = relativePaths.sort();
      const resultText = sortedPaths.join('\n');

      return {
        llmContent: resultText,
        returnDisplay: `Found ${filteredMatches.length} file(s) matching pattern "${params.pattern}"`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error searching for files: ${errorMessage}`,
        returnDisplay: `Error searching for files: ${errorMessage}`,
      };
    }
  }
}