/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {} from // TODO: Re-add these type imports if needed
// FunctionDeclaration,
// Part,
// Content,
'@google/genai';

export interface HttpClient {
  post<T>(url: string, body: unknown, options?: RequestInit): Promise<T>;
  postStream(
    url: string,
    body: unknown,
    options?: RequestInit,
  ): Promise<ReadableStream<Uint8Array>>;
  get<T>(url: string, options?: RequestInit): Promise<T>;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | OpenAIMessagePart[];
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface OpenAIMessagePart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  index?: number;
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: unknown; // JSON Schema
  };
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: OpenAIUsage;
}

export interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIStreamChoice[];
}

export interface OpenAIStreamChoice {
  index: number;
  delta: Partial<OpenAIMessage>;
  finish_reason: string | null;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[]; // Base64 encoded images
  tool_calls?: unknown[];
}

export interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  tools?: unknown[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export type ProviderRole = 'system' | 'user' | 'assistant' | 'tool' | 'model';
