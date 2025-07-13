/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchemaValidator } from '../utils/schemaValidator.js';
import { makeRelative, shortenPath } from '../utils/paths.js';
import { BaseTool, ToolResult } from './tools.js';
import { Type } from '@google/genai';
import { isWithinRoot, getFileSystem } from '../utils/fileUtilsAbstract.js';
import { Config } from '../config/config.js';
import {
  recordFileOperationMetric,
  FileOperation,
} from '../telemetry/metrics.js';

/**
 * Parameters for the WriteFile tool
 */
export interface WriteFileToolParams {
  /**
   * The absolute path to the file to write
   */
  absolute_path: string;

  /**
   * The content to write to the file
   */
  content: string;
}

/**
 * Implementation of the WriteFile tool logic using platform abstraction
 */
export class WriteFileToolAbstract extends BaseTool<WriteFileToolParams, ToolResult> {
  static readonly Name: string = 'write_file';
  private fs = getFileSystem();

  constructor(
    private rootDirectory: string,
    private config: Config,
  ) {
    super(
      WriteFileToolAbstract.Name,
      'WriteFile',
      'Creates a new file or completely overwrites an existing file with the provided content.',
      {
        properties: {
          absolute_path: {
            description:
              "The absolute path where the file should be written (e.g., '/home/user/project/file.txt'). The file will be created if it doesn't exist, or overwritten if it does.",
            type: Type.STRING,
          },
          content: {
            description:
              'The complete content to write to the file. This will replace any existing content.',
            type: Type.STRING,
          },
        },
        required: ['absolute_path', 'content'],
        type: Type.OBJECT,
      },
    );
    this.rootDirectory = this.fs.resolve(rootDirectory);
  }

  validateToolParams(params: WriteFileToolParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }

    const filePath = params.absolute_path;
    if (!this.fs.resolve(filePath).startsWith('/')) {
      return `File path must be absolute, but was relative: ${filePath}`;
    }
    if (!isWithinRoot(filePath, this.rootDirectory)) {
      return `File path must be within the root directory (${this.rootDirectory}): ${filePath}`;
    }

    const fileService = this.config.getFileService();
    if (fileService.shouldGeminiIgnoreFile(params.absolute_path)) {
      return `File path '${filePath}' is ignored by .geminiignore pattern(s).`;
    }

    return null;
  }

  getDescription(params: WriteFileToolParams): string {
    if (
      !params ||
      typeof params.absolute_path !== 'string' ||
      params.absolute_path.trim() === ''
    ) {
      return `Path unavailable`;
    }
    const relativePath = makeRelative(params.absolute_path, this.rootDirectory);
    return shortenPath(relativePath);
  }

  async execute(
    params: WriteFileToolParams,
    _signal: AbortSignal,
  ): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      return {
        llmContent: `Error: ${validationError}`,
        returnDisplay: validationError,
      };
    }

    const startTime = Date.now();
    const fileExists = await this.fs.exists(params.absolute_path);

    try {
      // Ensure parent directory exists
      const parentDir = this.fs.dirname(params.absolute_path);
      if (!(await this.fs.exists(parentDir))) {
        await this.fs.mkdir(parentDir, { recursive: true });
      }

      // Write the file
      await this.fs.writeFile(params.absolute_path, params.content, 'utf-8');

      const relativePath = this.fs.relative(this.rootDirectory, params.absolute_path);
      const message = fileExists
        ? `Successfully overwrote file: ${relativePath}`
        : `Successfully created file: ${relativePath}`;

      recordFileOperationMetric(
        this.config,
        FileOperation.WRITE,
        params.content.split('\n').length,
        'text/plain',
        this.fs.extname(params.absolute_path),
      );

      return {
        llmContent: message,
        returnDisplay: message,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const displayPath = this.fs.relative(this.rootDirectory, params.absolute_path);

      recordFileOperationMetric(
        this.config,
        FileOperation.WRITE,
        params.content.split('\n').length,
        'text/plain',
        this.fs.extname(params.absolute_path),
      );

      return {
        llmContent: `Error writing file ${displayPath}: ${errorMessage}`,
        returnDisplay: `Error writing file ${displayPath}: ${errorMessage}`,
      };
    }
  }
}