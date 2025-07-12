/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const OLLAMA_DEFAULT_ENDPOINT = 'http://localhost:11434';
export const OLLAMA_DEFAULT_MODEL = 'llama3.1';
export const OLLAMA_DEFAULT_CONTEXT_WINDOW = 32768;

export interface OllamaGenerateRequest {
  model: string;
  prompt?: string;
  messages?: unknown[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: unknown[];
  tools?: unknown[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
  };
}

export interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

export interface OllamaEmbedResponse {
  embedding: number[];
}
