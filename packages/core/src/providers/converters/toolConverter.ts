/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionDeclaration } from '@google/genai';
import { OpenAITool } from '../base/types.js';

export class ToolConverter {
  static geminiToOpenAI(tools: FunctionDeclaration[]): OpenAITool[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name || '',
        description: tool.description || '',
        parameters: tool.parameters || {}, // Already JSON Schema
      },
    }));
  }

  static openAIToGemini(tools: OpenAITool[]): FunctionDeclaration[] {
    return tools
      .filter((tool) => tool.type === 'function')
      .map((tool) => ({
        name: tool.function.name,
        description: tool.function.description || '',
        parameters: tool.function.parameters || {},
      } as FunctionDeclaration));
  }

  static geminiToOllama(tools: FunctionDeclaration[]): unknown[] {
    // Ollama uses OpenAI-compatible format when in OpenAI mode
    return this.geminiToOpenAI(tools);
  }

  static ollamaToGemini(tools: unknown[]): FunctionDeclaration[] {
    // Assuming Ollama is using OpenAI-compatible format
    return this.openAIToGemini(tools as OpenAITool[]);
  }
}
