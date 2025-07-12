/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { ContentGenerator } from '../../core/contentGenerator.js';
import { UserTierId } from '../../code_assist/types.js';
import { HttpClient } from './types.js';
import { BaseProviderConfig } from '../../core/contentGenerator.js';

export abstract class BaseContentGenerator implements ContentGenerator {
  protected config: BaseProviderConfig;
  protected httpClient: HttpClient;

  constructor(config: BaseProviderConfig) {
    this.config = config;
    this.httpClient = this.createHttpClient();
  }

  abstract generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse>;

  abstract generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  abstract countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse>;

  abstract embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse>;

  getTier?(): Promise<UserTierId | undefined> {
    return Promise.resolve(undefined);
  }

  protected abstract createHttpClient(): HttpClient;

  protected async *parseSSEStream(
    stream: ReadableStream<Uint8Array>,
  ): AsyncGenerator<unknown> {
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
          const trimmedLine = line.trim();
          if (trimmedLine === '' || trimmedLine === 'data: [DONE]') continue;

          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              yield data;
            } catch (e) {
              console.error('Failed to parse SSE chunk:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  protected createDefaultHttpClient(): HttpClient {
    const version = process.env.CLI_VERSION || process.version;
    const userAgent = `GeminiCLI/${version} (${process.platform}; ${process.arch})`;

    return {
      async post<T>(
        url: string,
        body: unknown,
        options?: RequestInit,
      ): Promise<T> {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': userAgent,
            ...options?.headers,
          },
          body: JSON.stringify(body),
          ...options,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`,
          );
        }

        return response.json();
      },

      async postStream(
        url: string,
        body: unknown,
        options?: RequestInit,
      ): Promise<ReadableStream<Uint8Array>> {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': userAgent,
            ...options?.headers,
          },
          body: JSON.stringify(body),
          ...options,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`,
          );
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        return response.body;
      },

      async get<T>(url: string, options?: RequestInit): Promise<T> {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
            ...options?.headers,
          },
          ...options,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`,
          );
        }

        return response.json();
      },
    };
  }
}
