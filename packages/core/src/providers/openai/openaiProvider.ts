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
import {
  HttpClient,
  OpenAIResponse,
  OpenAIStreamChunk,
} from '../base/types.js';
import {
  OpenAIConfig,
  OpenAICompatibleConfig,
} from '../../core/contentGenerator.js';
import { OpenAIConverter } from './openaiConverter.js';
import { StreamAccumulator, OPENAI_DEFAULT_ENDPOINT } from './openaiTypes.js';

export class OpenAIContentGenerator extends BaseContentGenerator {
  private converter: OpenAIConverter;
  protected config: OpenAIConfig | OpenAICompatibleConfig;

  constructor(config: OpenAIConfig | OpenAICompatibleConfig) {
    super(config);
    this.config = config;
    this.converter = new OpenAIConverter();
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const openAIRequest = this.converter.toOpenAIRequest(request);
    const endpoint = this.getEndpoint('/chat/completions');

    const response = await this.httpClient.post<OpenAIResponse>(
      endpoint,
      openAIRequest,
      {
        headers: this.getHeaders(),
      },
    );

    return this.converter.fromOpenAIResponse(response);
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this._generateContentStream(request);
  }

  private async *_generateContentStream(
    request: GenerateContentParameters,
  ): AsyncGenerator<GenerateContentResponse> {
    const openAIRequest = {
      ...this.converter.toOpenAIRequest(request),
      stream: true,
    };

    const endpoint = this.getEndpoint('/chat/completions');
    const stream = await this.httpClient.postStream(endpoint, openAIRequest, {
      headers: this.getHeaders(),
    });

    const accumulator: StreamAccumulator = {
      content: '',
      toolCalls: new Map(),
    };

    for await (const chunk of this.parseSSEStream(stream)) {
      const response = this.converter.fromOpenAIStreamChunk(
        chunk as OpenAIStreamChunk,
        accumulator,
      );
      if (response) {
        yield response;
      }
    }
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // OpenAI doesn't have a direct token counting endpoint
    // We'll estimate based on the tiktoken library logic
    // For now, return a rough estimate
    const messages = this.converter.toCountTokensRequest(request);
    const messageString = JSON.stringify(messages);
    const estimatedTokens = Math.ceil(messageString.length / 4); // Rough estimate: 1 token ≈ 4 characters

    return this.converter.fromCountTokensResponse(estimatedTokens);
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    const embedRequest = this.converter.toEmbedRequest(request);
    const endpoint = this.getEndpoint('/embeddings');

    const response = await this.httpClient.post(endpoint, embedRequest, {
      headers: this.getHeaders(),
    });

    return this.converter.fromEmbedResponse(response);
  }

  protected createHttpClient(): HttpClient {
    return this.createDefaultHttpClient();
  }

  private getEndpoint(path: string): string {
    const baseUrl = this.config.endpoint || OPENAI_DEFAULT_ENDPOINT;
    return `${baseUrl}${path}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    if (
      this.config.authType === 'openai-api-key' &&
      this.config.organizationId
    ) {
      headers['OpenAI-Organization'] = this.config.organizationId;
    }

    if (this.config.authType === 'openai-compatible' && this.config.headers) {
      Object.assign(headers, this.config.headers);
    }

    return headers;
  }
}

export class OpenAICompatibleContentGenerator extends OpenAIContentGenerator {
  constructor(config: OpenAICompatibleConfig) {
    super(config);
  }
}
