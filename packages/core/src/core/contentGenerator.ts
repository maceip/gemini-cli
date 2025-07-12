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
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { DEFAULT_GEMINI_MODEL } from '../config/models.js';
import { Config } from '../config/config.js';
import { getEffectiveModel } from './modelCheck.js';
import { UserTierId } from '../code_assist/types.js';
import { GeminiContentGenerator } from '../providers/gemini/geminiProvider.js';
import { OllamaContentGenerator } from '../providers/ollama/ollamaProvider.js';
import {
  OpenAIContentGenerator,
  OpenAICompatibleContentGenerator,
} from '../providers/openai/openaiProvider.js';
import { mapModelName } from '../providers/utils/modelMapper.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  getTier?(): Promise<UserTierId | undefined>;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',

  // New providers
  USE_OPENAI = 'openai-api-key',
  USE_OPENAI_COMPATIBLE = 'openai-compatible', // For any OpenAI-compatible API
  USE_OLLAMA = 'ollama-local',
  USE_ANTHROPIC = 'anthropic-api-key', // Future
  USE_AZURE_OPENAI = 'azure-openai', // Future
}

export interface BaseProviderConfig {
  authType: AuthType;
  apiKey?: string;
  endpoint?: string; // For custom endpoints
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export interface GeminiConfig extends BaseProviderConfig {
  authType:
    | AuthType.USE_GEMINI
    | AuthType.USE_VERTEX_AI
    | AuthType.LOGIN_WITH_GOOGLE
    | AuthType.CLOUD_SHELL;
  vertexai?: boolean;
}

export interface OpenAIConfig extends BaseProviderConfig {
  authType: AuthType.USE_OPENAI;
  organizationId?: string;
  apiVersion?: string; // For Azure OpenAI
}

export interface OllamaConfig extends BaseProviderConfig {
  authType: AuthType.USE_OLLAMA;
  endpoint: string; // Default: http://localhost:11434
  useOpenAICompatible?: boolean; // Use /v1 endpoint
  contextWindow?: number; // Recommended 32k+ for tools
}

export interface OpenAICompatibleConfig extends BaseProviderConfig {
  authType: AuthType.USE_OPENAI_COMPATIBLE;
  endpoint: string; // Required
  headers?: Record<string, string>; // Additional headers
}

export type ContentGeneratorConfig =
  | GeminiConfig
  | OpenAIConfig
  | OllamaConfig
  | OpenAICompatibleConfig;

export async function createContentGeneratorConfig(
  model: string | undefined,
  authType: AuthType | undefined,
): Promise<ContentGeneratorConfig> {
  if (!authType) {
    throw new Error('AuthType is required to create a content generator.');
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || undefined;
  const googleApiKey = process.env.GOOGLE_API_KEY || undefined;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT || undefined;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION || undefined;

  // Use runtime model from config if available, otherwise fallback to parameter or default
  const effectiveModel = model || DEFAULT_GEMINI_MODEL;

  const contentGeneratorConfig: GeminiConfig = {
    model: effectiveModel,
    authType: authType as
      | AuthType.LOGIN_WITH_GOOGLE
      | AuthType.USE_GEMINI
      | AuthType.USE_VERTEX_AI
      | AuthType.CLOUD_SHELL,
  };

  // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.vertexai = false;
    contentGeneratorConfig.model = await getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
    );

    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    (googleApiKey || (googleCloudProject && googleCloudLocation))
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;

    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  switch (config.authType) {
    case AuthType.LOGIN_WITH_GOOGLE:
    case AuthType.CLOUD_SHELL: {
      const version = process.env.CLI_VERSION || process.version;
      const httpOptions = {
        headers: {
          'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
        },
      };
      return createCodeAssistContentGenerator(
        httpOptions,
        config.authType,
        gcConfig,
        sessionId,
      );
    }
    case AuthType.USE_GEMINI:
    case AuthType.USE_VERTEX_AI:
      return new GeminiContentGenerator(config as GeminiConfig);

    case AuthType.USE_OPENAI:
      return new OpenAIContentGenerator({
        ...config,
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        model: mapModelName('openai', config.model) || 'gpt-4-turbo-preview',
        endpoint: config.endpoint || 'https://api.openai.com/v1',
      } as OpenAIConfig);

    case AuthType.USE_OLLAMA:
      return new OllamaContentGenerator({
        ...config,
        endpoint: config.endpoint || 'http://localhost:11434',
        model: mapModelName('ollama', config.model) || 'llama3.1',
        useOpenAICompatible: true,
        contextWindow: config.contextWindow || 32768, // Recommended for tools
      } as OllamaConfig);

    case AuthType.USE_OPENAI_COMPATIBLE:
      if (!config.endpoint) {
        throw new Error('Endpoint is required for OpenAI compatible providers');
      }
      return new OpenAICompatibleContentGenerator(
        config as OpenAICompatibleConfig,
      );

    default:
      throw new Error(
        `Error creating contentGenerator: Unsupported authType: ${(config as BaseProviderConfig).authType}`,
      );
  }
}
