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
  GoogleGenAI,
} from '@google/genai';
import { BaseContentGenerator } from '../base/baseProvider.js';
import { GeminiConfig } from '../../core/contentGenerator.js';
import { HttpClient } from '../base/types.js';

export class GeminiContentGenerator extends BaseContentGenerator {
  private googleGenAI: GoogleGenAI;

  constructor(config: GeminiConfig) {
    super(config);
    const version = process.env.CLI_VERSION || process.version;
    const httpOptions = {
      headers: {
        'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
      },
    };
    this.googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      vertexai: config.vertexai,
      httpOptions,
    });
  }

  generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    return this.googleGenAI.models.generateContent(request);
  }

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.googleGenAI.models.generateContentStream(request);
  }

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    return this.googleGenAI.models.countTokens(request);
  }

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    return this.googleGenAI.models.embedContent(request);
  }

  protected createHttpClient(): HttpClient {
    // The Gemini SDK handles its own HTTP client, so we don't need to create one here.
    // This is a bit of a mismatch in the abstraction, but we'll provide a dummy implementation.
    return this.createDefaultHttpClient();
  }
}
