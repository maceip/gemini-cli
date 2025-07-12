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

export interface GrepResult {
  file: string;
  line: number;
  column: number;
  match: string;
}

/**
 * Parameters for the Grep tool
 */
export interface GrepToolParams {
  /**
   * The regular expression pattern to search for
   */
  pattern: string;

  /**
   * The file or directory path to search in
   */
  path: string;

  /**
   * Whether to search recursively in directories
   */
  recursive?: boolean;
}

/**
 * Implementation of the Grep tool logic using platform abstraction
 */
export class GrepToolAbstract extends BaseTool<GrepToolParams, ToolResult> {
  static readonly Name: string = 'grep';
  private fs = getFileSystem();

  constructor(
    private rootDirectory: string,
    private config: Config,
  ) {
    super(
      GrepToolAbstract.Name,
      'Grep',
      'Searches for a pattern in files using regular expressions.',
      {
        properties: {
          pattern: {
            description:
              'The regular expression pattern to search for in file contents',
            type: Type.STRING,
          },
          path: {
            description:
              'The file or directory path to search in',
            type: Type.STRING,
          },
          recursive: {
            description:
              'Whether to search recursively in directories (default: false)',
            type: Type.BOOLEAN,
          },
        },
        required: ['pattern', 'path'],
        type: Type.OBJECT,
      },
    );
    this.rootDirectory = this.fs.resolve(rootDirectory);
  }

  validateToolParams(params: GrepToolParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    if (!params.pattern || params.pattern.trim() === '') {
      return 'Pattern cannot be empty';
    }

    if (!params.path || params.path.trim() === '') {
      return 'Path cannot be empty';
    }

    // Validate regex pattern
    try {
      new RegExp(params.pattern);
    } catch (e) {
      return `Invalid regular expression: ${params.pattern}`;
    }

    return null;
  }

  getDescription(params: GrepToolParams): string {
    return `Searching for pattern "${params.pattern}" in ${params.path}`;
  }

  async execute(
    params: GrepToolParams,
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

      // Check if it's ignored
      const fileService = this.config.getFileService();
      if (fileService.shouldGeminiIgnoreFile(resolvedPath)) {
        return {
          llmContent: `Path is ignored by .geminiignore: ${params.path}`,
          returnDisplay: `Path is ignored by .geminiignore: ${params.path}`,
        };
      }

      // Execute grep
      const results = await this.fs.grep(params.pattern, resolvedPath, {
        recursive: params.recursive,
      });

      // Filter out results from ignored files
      const filteredResults = results.filter(result => {
        const absolutePath = this.fs.resolve(result.file);
        return !fileService.shouldGeminiIgnoreFile(absolutePath);
      });

      if (filteredResults.length === 0) {
        return {
          llmContent: `No matches found for pattern: ${params.pattern}`,
          returnDisplay: `No matches found for pattern: ${params.pattern}`,
        };
      }

      // Format results
      const formattedResults = filteredResults.map(result => {
        const relativePath = makeRelative(
          this.fs.resolve(result.file),
          this.rootDirectory
        );
        return `${relativePath}:${result.line}:${result.column}: ${result.match}`;
      });

      const resultText = formattedResults.join('\n');
      const matchCount = filteredResults.length;
      const fileCount = new Set(filteredResults.map(r => r.file)).size;

      return {
        llmContent: resultText,
        returnDisplay: `Found ${matchCount} match(es) in ${fileCount} file(s)`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error searching files: ${errorMessage}`,
        returnDisplay: `Error searching files: ${errorMessage}`,
      };
    }
  }
}