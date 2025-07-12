/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { PartUnion } from '@google/genai';
import mime from 'mime-types';
import { FileSystem } from '../fs/types.js';
import { PlatformFactory } from '../platform/index.js';

// Constants for text file processing
const DEFAULT_MAX_LINES_TEXT_FILE = 2000;
const MAX_LINE_LENGTH_TEXT_FILE = 2000;

// Default values for encoding
export const DEFAULT_ENCODING: BufferEncoding = 'utf-8';

// Get file system instance
let fileSystemInstance: FileSystem | null = null;

export function getFileSystem(): FileSystem {
  if (!fileSystemInstance) {
    const platform = PlatformFactory.create();
    fileSystemInstance = platform.createFileSystem();
  }
  return fileSystemInstance;
}

/**
 * Looks up the specific MIME type for a file path.
 */
export function getSpecificMimeType(filePath: string): string | undefined {
  const lookedUpMime = mime.lookup(filePath);
  return typeof lookedUpMime === 'string' ? lookedUpMime : undefined;
}

/**
 * Checks if a path is within a given root directory.
 */
export function isWithinRoot(
  pathToCheck: string,
  rootDirectory: string,
): boolean {
  const fs = getFileSystem();
  const normalizedPathToCheck = fs.resolve(pathToCheck);
  const normalizedRootDirectory = fs.resolve(rootDirectory);

  // Ensure the rootDirectory path ends with a separator for correct comparison
  const sep = '/';
  const rootWithSeparator =
    normalizedRootDirectory === sep ||
    normalizedRootDirectory.endsWith(sep)
      ? normalizedRootDirectory
      : normalizedRootDirectory + sep;

  return (
    normalizedPathToCheck === normalizedRootDirectory ||
    normalizedPathToCheck.startsWith(rootWithSeparator)
  );
}

/**
 * Determines if a file is likely binary based on content sampling.
 */
export async function isBinaryFile(filePath: string): Promise<boolean> {
  const fs = getFileSystem();
  
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile || stats.size === 0) {
      return false;
    }

    // Read first 4KB or file size, whichever is smaller
    const bufferSize = Math.min(4096, stats.size);
    const content = await fs.readFileBuffer(filePath);
    const sample = content.slice(0, bufferSize);

    let nonPrintableCount = 0;
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) return true; // Null byte is a strong indicator
      if (sample[i] < 9 || (sample[i] > 13 && sample[i] < 32)) {
        nonPrintableCount++;
      }
    }
    // If >30% non-printable characters, consider it binary
    return nonPrintableCount / sample.length > 0.3;
  } catch {
    // If any error occurs, treat as not binary
    return false;
  }
}

/**
 * Detects the type of file based on extension and content.
 */
export async function detectFileType(
  filePath: string,
): Promise<'text' | 'image' | 'pdf' | 'audio' | 'video' | 'binary' | 'svg'> {
  const fs = getFileSystem();
  const ext = fs.extname(filePath).toLowerCase();

  // Special cases
  if (ext === '.ts') {
    return 'text';
  }

  if (ext === '.svg') {
    return 'svg';
  }

  const lookedUpMimeType = mime.lookup(filePath);
  if (lookedUpMimeType) {
    if (lookedUpMimeType.startsWith('image/')) {
      return 'image';
    }
    if (lookedUpMimeType.startsWith('audio/')) {
      return 'audio';
    }
    if (lookedUpMimeType.startsWith('video/')) {
      return 'video';
    }
    if (lookedUpMimeType === 'application/pdf') {
      return 'pdf';
    }
  }

  // Common binary extensions
  const binaryExtensions = [
    '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.class', '.jar',
    '.war', '.7z', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.odt', '.ods', '.odp', '.bin', '.dat', '.obj', '.o', '.a',
    '.lib', '.wasm', '.pyc', '.pyo',
  ];

  if (binaryExtensions.includes(ext)) {
    return 'binary';
  }

  // Content-based check
  if (await isBinaryFile(filePath)) {
    return 'binary';
  }

  return 'text';
}

export interface ProcessedFileReadResult {
  llmContent: PartUnion;
  returnDisplay: string;
  error?: string;
  isTruncated?: boolean;
  originalLineCount?: number;
  linesShown?: [number, number];
}

/**
 * Reads and processes a single file, handling text, images, and PDFs.
 */
export async function processSingleFileContent(
  filePath: string,
  rootDirectory: string,
  offset?: number,
  limit?: number,
): Promise<ProcessedFileReadResult> {
  const fs = getFileSystem();
  
  try {
    if (!(await fs.exists(filePath))) {
      return {
        llmContent: '',
        returnDisplay: 'File not found.',
        error: `File not found: ${filePath}`,
      };
    }
    
    const stats = await fs.stat(filePath);
    if (stats.isDirectory) {
      return {
        llmContent: '',
        returnDisplay: 'Path is a directory.',
        error: `Path is a directory, not a file: ${filePath}`,
      };
    }

    const fileSizeInBytes = stats.size;
    // 20MB limit
    const maxFileSize = 20 * 1024 * 1024;

    if (fileSizeInBytes > maxFileSize) {
      throw new Error(
        `File size exceeds the 20MB limit: ${filePath} (${(
          fileSizeInBytes /
          (1024 * 1024)
        ).toFixed(2)}MB)`,
      );
    }

    const fileType = await detectFileType(filePath);
    const relativePathForDisplay = fs.relative(rootDirectory, filePath);

    switch (fileType) {
      case 'binary': {
        return {
          llmContent: `Cannot display content of binary file: ${relativePathForDisplay}`,
          returnDisplay: `Skipped binary file: ${relativePathForDisplay}`,
        };
      }
      case 'svg': {
        const SVG_MAX_SIZE_BYTES = 1 * 1024 * 1024;
        if (stats.size > SVG_MAX_SIZE_BYTES) {
          return {
            llmContent: `Cannot display content of SVG file larger than 1MB: ${relativePathForDisplay}`,
            returnDisplay: `Skipped large SVG file (>1MB): ${relativePathForDisplay}`,
          };
        }
        const content = await fs.readFile(filePath, 'utf8');
        return {
          llmContent: content,
          returnDisplay: `Read SVG as text: ${relativePathForDisplay}`,
        };
      }
      case 'text': {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const originalLineCount = lines.length;

        const startLine = offset || 0;
        const effectiveLimit =
          limit === undefined ? DEFAULT_MAX_LINES_TEXT_FILE : limit;
        const endLine = Math.min(startLine + effectiveLimit, originalLineCount);
        const actualStartLine = Math.min(startLine, originalLineCount);
        const selectedLines = lines.slice(actualStartLine, endLine);

        let linesWereTruncatedInLength = false;
        const formattedLines = selectedLines.map((line) => {
          if (line.length > MAX_LINE_LENGTH_TEXT_FILE) {
            linesWereTruncatedInLength = true;
            return (
              line.substring(0, MAX_LINE_LENGTH_TEXT_FILE) + '... [truncated]'
            );
          }
          return line;
        });

        const contentRangeTruncated = endLine < originalLineCount;
        const isTruncated = contentRangeTruncated || linesWereTruncatedInLength;

        let llmTextContent = '';
        if (contentRangeTruncated) {
          llmTextContent += `[File content truncated: showing lines ${actualStartLine + 1}-${endLine} of ${originalLineCount} total lines. Use offset/limit parameters to view more.]\n`;
        } else if (linesWereTruncatedInLength) {
          llmTextContent += `[File content partially truncated: some lines exceeded maximum length of ${MAX_LINE_LENGTH_TEXT_FILE} characters.]\n`;
        }
        llmTextContent += formattedLines.join('\n');

        return {
          llmContent: llmTextContent,
          returnDisplay: isTruncated ? '(truncated)' : '',
          isTruncated,
          originalLineCount,
          linesShown: [actualStartLine + 1, endLine],
        };
      }
      case 'image':
      case 'pdf':
      case 'audio':
      case 'video': {
        const contentBuffer = await fs.readFileBuffer(filePath);
        const base64Data = contentBuffer.toString('base64');
        return {
          llmContent: {
            inlineData: {
              data: base64Data,
              mimeType: mime.lookup(filePath) || 'application/octet-stream',
            },
          },
          returnDisplay: `Read ${fileType} file: ${relativePathForDisplay}`,
        };
      }
      default: {
        const exhaustiveCheck: never = fileType;
        return {
          llmContent: `Unhandled file type: ${exhaustiveCheck}`,
          returnDisplay: `Skipped unhandled file type: ${relativePathForDisplay}`,
          error: `Unhandled file type for ${filePath}`,
        };
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const displayPath = fs.relative(rootDirectory, filePath);
    return {
      llmContent: `Error reading file ${displayPath}: ${errorMessage}`,
      returnDisplay: `Error reading file ${displayPath}: ${errorMessage}`,
      error: `Error reading file ${filePath}: ${errorMessage}`,
    };
  }
}