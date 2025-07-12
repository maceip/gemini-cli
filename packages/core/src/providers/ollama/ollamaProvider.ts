/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  GenerateContentParameters,
  GenerateContentResponse,
} from '@google/genai';
import { BaseContentGenerator } from '../base/baseProvider.js';
import { HttpClient, OllamaResponse, OpenAIResponse } from '../base/types.js';
import { OllamaConfig } from '../../core/contentGenerator.js';
import { OllamaConverter } from './ollamaConverter.js';
import { StreamAccumulator } from '../openai/openaiTypes.js';
import { OLLAMA_DEFAULT_ENDPOINT, OllamaEmbedResponse } from './ollamaTypes.js';

export class OllamaContentGenerator extends BaseContentGenerator {
  private converter: OllamaConverter;
  protected config: OllamaConfig;
  private useOpenAIMode: boolean;

  constructor(config: OllamaConfig) {
    super(config);
    this.config = config;
    this.useOpenAIMode = config.useOpenAICompatible ?? true;
    this.converter = new OllamaConverter(this.useOpenAIMode);
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const endpoint = this.getEndpoint();
    const ollamaRequest = this.converter.toOllamaRequest(request);

    const response = await this.httpClient.post(endpoint, ollamaRequest, {
      headers: this.getHeaders(),
    });

    return this.converter.fromOllamaResponse(response as OllamaResponse | OpenAIResponse);
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this._generateContentStream(request);
  }

  private async *_generateContentStream(
    request: GenerateContentParameters,
  ): AsyncGenerator<GenerateContentResponse> {
    const endpoint = this.getEndpoint();
    const ollamaRequest = {
      ...this.converter.toOllamaRequest(request),
      stream: true,
    };

    const stream = await this.httpClient.postStream(endpoint, ollamaRequest, {
      headers: this.getHeaders(),
    });

    if (this.useOpenAIMode) {
      // OpenAI-compatible mode uses SSE
      const _accumulator: StreamAccumulator = {
        content: '',
        toolCalls: new Map(),
      };

      for await (const chunk of this.parseSSEStream(stream)) {
        const response = this.converter.fromOllamaStreamChunk(chunk);
        if (response) {
          yield response;
        }
      }
    } else {
      // Native mode uses newline-delimited JSON
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const chunk = JSON.parse(line);
                const response = this.converter.fromOllamaStreamChunk(chunk);
                if (response) {
                  yield response;
                }
              } catch (e) {
                console.error('Failed to parse Ollama chunk:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // Ollama doesn't have a direct token counting endpoint
    // We'll estimate based on the message content
    const messages = this.converter.toOllamaRequest(request);
    const messageString = JSON.stringify(messages);
    const estimatedTokens = Math.ceil(messageString.length / 4); // Rough estimate: 1 token ≈ 4 characters

    return {
      totalTokens: estimatedTokens,
    };
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    const embedRequest = this.converter.toEmbedRequest(request);
    const endpoint = `${this.config.endpoint}/api/embeddings`;

    const response = await this.httpClient.post(endpoint, embedRequest, {
      headers: this.getHeaders(),
    });

    return this.converter.fromEmbedResponse(response as OllamaEmbedResponse);
  }

  protected createHttpClient(): HttpClient {
    return this.createDefaultHttpClient();
  }

  private getEndpoint(): string {
    const baseUrl = this.config.endpoint || OLLAMA_DEFAULT_ENDPOINT;

    if (this.useOpenAIMode) {
      return `${baseUrl}/v1/chat/completions`;
    } else {
      return `${baseUrl}/api/chat`;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }
}
