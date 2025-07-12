/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export type OpenAIFinishReason =
  | 'stop'
  | 'length'
  | 'tool_calls'
  | 'content_filter'
  | null;
export type GeminiFinishReason =
  | 'STOP'
  | 'MAX_TOKENS'
  | 'SAFETY'
  | 'RECITATION'
  | 'OTHER';

export interface StreamAccumulator {
  content: string;
  toolCalls: Map<
    number,
    {
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }
  >;
}

export const OPENAI_DEFAULT_ENDPOINT = 'https://api.openai.com/v1';
export const OPENAI_DEFAULT_MODEL = 'gpt-4-turbo-preview';
export const OPENAI_DEFAULT_MAX_TOKENS = 4096;
