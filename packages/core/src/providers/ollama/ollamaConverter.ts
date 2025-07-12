/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GenerateContentParameters,
  GenerateContentResponse,
  Part,
  Content,
  FunctionDeclaration,
  EmbedContentParameters,
  EmbedContentResponse,
} from '@google/genai';
import {
  OllamaResponse,
  OpenAIRequest,
  OpenAIResponse,
  OpenAIStreamChunk,
} from '../base/types.js';
import { MessageConverter } from '../converters/messageConverter.js';
import { ToolConverter } from '../converters/toolConverter.js';
import { OpenAIConverter } from '../openai/openaiConverter.js';
import {
  OllamaChatRequest,
  OllamaEmbedRequest,
  OllamaEmbedResponse,
} from './ollamaTypes.js';

export class OllamaConverter {
  private useOpenAIMode: boolean;
  private openAIConverter: OpenAIConverter;

  constructor(useOpenAIMode: boolean = true) {
    this.useOpenAIMode = useOpenAIMode;
    this.openAIConverter = new OpenAIConverter();
  }

  toOllamaRequest(
    request: GenerateContentParameters,
  ): OllamaChatRequest | OpenAIRequest {
    if (this.useOpenAIMode) {
      // Use OpenAI converter for OpenAI-compatible mode
      return this.openAIConverter.toOpenAIRequest(request);
    }

    // Native Ollama format
    // Handle contents which can be string, Content, Content[], or Part[]
    let contents: Content[];
    if (typeof request.contents === 'string') {
      contents = [{ role: 'user', parts: [{ text: request.contents }] }];
    } else if (Array.isArray(request.contents)) {
      // Check if it's Part[] or Content[]
      if (request.contents.length > 0 && typeof request.contents[0] === 'object' && 'role' in request.contents[0]) {
        contents = request.contents as Content[];
      } else {
        // It's Part[]
        contents = [{ role: 'user', parts: request.contents as Part[] }];
      }
    } else {
      // Single Content object
      contents = [request.contents as Content];
    }

    const messages = MessageConverter.geminiToOllama(contents);

    const ollamaRequest: OllamaChatRequest = {
      model: request.model,
      messages,
      stream: false,
    };

    // Add tools if present (Ollama supports OpenAI-style tools)
    if (request.config?.tools && request.config.tools.length > 0) {
      // Extract FunctionDeclarations from Tool objects
      const functionDeclarations: FunctionDeclaration[] = [];
      for (const tool of request.config.tools) {
        if ('functionDeclarations' in tool && tool.functionDeclarations) {
          functionDeclarations.push(...tool.functionDeclarations);
        }
      }
      if (functionDeclarations.length > 0) {
        ollamaRequest.tools = ToolConverter.geminiToOllama(functionDeclarations);
      }
    }

    // Add generation config
    if (request.config) {
      ollamaRequest.options = {};

      if (request.config.temperature !== undefined) {
        ollamaRequest.options.temperature = request.config.temperature;
      }
      if (request.config.topP !== undefined) {
        ollamaRequest.options.top_p = request.config.topP;
      }
      if (request.config.maxOutputTokens !== undefined) {
        ollamaRequest.options.num_predict = request.config.maxOutputTokens;
      }
    }

    return ollamaRequest;
  }

  fromOllamaResponse(
    response: OllamaResponse | OpenAIResponse,
  ): GenerateContentResponse {
    if (this.useOpenAIMode) {
      // Use OpenAI converter for OpenAI-compatible mode
      return this.openAIConverter.fromOpenAIResponse(
        response as OpenAIResponse,
      );
    }

    // Native Ollama format
    const ollamaResponse = response as OllamaResponse;
    const parts: Part[] = [];

    if (ollamaResponse.message.content) {
      parts.push({ text: ollamaResponse.message.content });
    }

    // Handle tool calls if present
    if (ollamaResponse.message.tool_calls) {
      for (const toolCall of ollamaResponse.message.tool_calls as Array<{
        function: { name: string; arguments: string };
      }>) {
        parts.push({
          functionCall: {
            name: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments),
          },
        });
      }
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
          finishReason: (ollamaResponse.done ? 'STOP' : 'OTHER') as 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER',
        },
      ],
      usageMetadata: {
        promptTokenCount: ollamaResponse.prompt_eval_count || 0,
        candidatesTokenCount: ollamaResponse.eval_count || 0,
        totalTokenCount:
          (ollamaResponse.prompt_eval_count || 0) +
          (ollamaResponse.eval_count || 0),
      },
    } as GenerateContentResponse;
  }

  fromOllamaStreamChunk(chunk: unknown): GenerateContentResponse | null {
    if (this.useOpenAIMode) {
      // In OpenAI mode, we need to handle the SSE parsing differently
      // The chunk should already be parsed from SSE
      return this.openAIConverter.fromOpenAIStreamChunk(chunk as OpenAIStreamChunk, {
        content: '',
        toolCalls: new Map(),
      });
    }

    const typedChunk = chunk as {
      message?: { content: string };
      done: boolean;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    // Native Ollama streaming format
    if (!typedChunk.message) {
      return null;
    }

    const parts: Part[] = [];
    if (typedChunk.message.content) {
      parts.push({ text: typedChunk.message.content });
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
          finishReason: typedChunk.done ? ('STOP' as 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER') : undefined,
        },
      ],
      usageMetadata: typedChunk.done
        ? {
            promptTokenCount: typedChunk.prompt_eval_count || 0,
            candidatesTokenCount: typedChunk.eval_count || 0,
            totalTokenCount:
              (typedChunk.prompt_eval_count || 0) +
              (typedChunk.eval_count || 0),
          }
        : undefined,
    } as GenerateContentResponse;
  }

  toEmbedRequest(request: EmbedContentParameters): OllamaEmbedRequest {
    // Extract text from contents
    let text = '';
    if (typeof request.contents === 'string') {
      text = request.contents;
    } else if (Array.isArray(request.contents)) {
      // Check if it's Part[] or Content[]
      if (request.contents.length > 0 && typeof request.contents[0] === 'object' && 'parts' in request.contents[0]) {
        // It's Content[]
        for (const content of request.contents as Content[]) {
          for (const part of (content.parts || [])) {
            if (part.text) {
              text += part.text;
            }
          }
        }
      } else {
        // It's Part[]
        for (const part of request.contents as Part[]) {
          if (part.text) {
            text += part.text;
          }
        }
      }
    } else {
      // Single Content object
      const content = request.contents as Content;
      for (const part of (content.parts || [])) {
        if (part.text) {
          text += part.text;
        }
      }
    }

    return {
      model: request.model || 'nomic-embed-text',
      prompt: text,
    };
  }

  fromEmbedResponse(response: OllamaEmbedResponse): EmbedContentResponse {
    return {
      embeddings: [
        {
          values: response.embedding,
        },
      ],
    };
  }
}
