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
  FunctionCall,
  FunctionDeclaration,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
} from '@google/genai';
import {
  OpenAIRequest,
  OpenAIResponse,
  OpenAIStreamChunk,
} from '../base/types.js';
import { MessageConverter } from '../converters/messageConverter.js';
import { ToolConverter } from '../converters/toolConverter.js';
import {
  StreamAccumulator,
  OpenAIFinishReason,
  GeminiFinishReason,
} from './openaiTypes.js';

export class OpenAIConverter {
  toOpenAIRequest(request: GenerateContentParameters): OpenAIRequest {
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

    const messages = MessageConverter.geminiToOpenAI(contents);

    const openAIRequest: OpenAIRequest = {
      model: request.model,
      messages,
      stream: false,
    };

    // Add tools if present in config
    if (request.config?.tools && request.config.tools.length > 0) {
      // Extract FunctionDeclarations from Tool objects
      const functionDeclarations: FunctionDeclaration[] = [];
      for (const tool of request.config.tools) {
        if ('functionDeclarations' in tool && tool.functionDeclarations) {
          functionDeclarations.push(...tool.functionDeclarations);
        }
      }
      if (functionDeclarations.length > 0) {
        openAIRequest.tools = ToolConverter.geminiToOpenAI(functionDeclarations);
      }
    }

    // Add generation config
    if (request.config) {
      if (request.config.temperature !== undefined) {
        openAIRequest.temperature = request.config.temperature;
      }
      if (request.config.topP !== undefined) {
        openAIRequest.top_p = request.config.topP;
      }
      if (request.config.maxOutputTokens !== undefined) {
        openAIRequest.max_tokens = request.config.maxOutputTokens;
      }
    }

    return openAIRequest;
  }

  fromOpenAIResponse(response: OpenAIResponse): GenerateContentResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No choices in OpenAI response');
    }

    const choice = response.choices[0];
    const message = choice.message;
    const parts: Part[] = [];

    // Handle text content
    if (message.content) {
      if (typeof message.content === 'string') {
        parts.push({ text: message.content });
      } else if (Array.isArray(message.content)) {
        // Handle multimodal content
        for (const part of message.content) {
          if (part.type === 'text' && part.text) {
            parts.push({ text: part.text });
          }
        }
      }
    }

    // Handle tool calls
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const functionCall: FunctionCall = {
          name: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments),
        };
        parts.push({ functionCall });
      }
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
          finishReason: this.mapFinishReason(
            choice.finish_reason,
          ) as 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER',
        },
      ],
      usageMetadata: response.usage
        ? {
            promptTokenCount: response.usage.prompt_tokens,
            candidatesTokenCount: response.usage.completion_tokens,
            totalTokenCount: response.usage.total_tokens,
          }
        : undefined,
    } as GenerateContentResponse;
  }

  fromOpenAIStreamChunk(
    chunk: OpenAIStreamChunk,
    accumulator: StreamAccumulator,
  ): GenerateContentResponse | null {
    if (!chunk.choices || chunk.choices.length === 0) {
      return null;
    }

    const choice = chunk.choices[0];
    const delta = choice.delta;

    // Accumulate content
    if (delta.content) {
      accumulator.content += delta.content;
    }

    // Accumulate tool calls
    if (delta.tool_calls) {
      for (const toolCall of delta.tool_calls) {
        const index = toolCall.index || 0;

        if (!accumulator.toolCalls.has(index)) {
          accumulator.toolCalls.set(index, {
            id: toolCall.id || '',
            type: toolCall.type || 'function',
            function: {
              name: toolCall.function?.name || '',
              arguments: '',
            },
          });
        }

        const accumulatedCall = accumulator.toolCalls.get(index)!;
        if (toolCall.function?.name) {
          accumulatedCall.function.name = toolCall.function.name;
        }
        if (toolCall.function?.arguments) {
          accumulatedCall.function.arguments += toolCall.function.arguments;
        }
      }
    }

    // Build response from accumulated data
    const parts: Part[] = [];

    if (accumulator.content) {
      parts.push({ text: accumulator.content });
    }

    // Add tool calls from accumulator
    for (const toolCall of accumulator.toolCalls.values()) {
      if (toolCall.function.name && toolCall.function.arguments) {
        try {
          const functionCall: FunctionCall = {
            name: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments),
          };
          parts.push({ functionCall });
        } catch (_e) {
          // Arguments might not be complete yet
        }
      }
    }

    if (parts.length === 0) {
      return null;
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
          finishReason: choice.finish_reason
            ? (this.mapFinishReason(
                choice.finish_reason as OpenAIFinishReason,
              ) as 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER')
            : undefined,
        },
      ],
    } as GenerateContentResponse;
  }

  toCountTokensRequest(request: CountTokensParameters): OpenAIRequest {
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

    return {
      model: request.model,
      messages: MessageConverter.geminiToOpenAI(contents),
    };
  }

  fromCountTokensResponse(tokens: number): CountTokensResponse {
    return {
      totalTokens: tokens,
    };
  }

  toEmbedRequest(request: EmbedContentParameters): unknown {
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
      model: request.model || 'text-embedding-ada-002',
      input: text,
    };
  }

  fromEmbedResponse(response: unknown): EmbedContentResponse {
    const res = response as { data: Array<{ embedding: number[] }> };
    if (!res.data || res.data.length === 0) {
      throw new Error('No embeddings in response');
    }

    return {
      embeddings: [
        {
          values: res.data[0].embedding,
        },
      ],
    };
  }

  private mapFinishReason(
    openAIReason: OpenAIFinishReason,
  ): GeminiFinishReason {
    switch (openAIReason) {
      case 'stop':
        return 'STOP';
      case 'length':
        return 'MAX_TOKENS';
      case 'content_filter':
        return 'SAFETY';
      case 'tool_calls':
        return 'STOP'; // Tool calls are part of normal completion
      default:
        return 'OTHER';
    }
  }
}
