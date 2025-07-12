/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelMapping {
  [geminiModel: string]: string;
}

export interface ProviderModelMappings {
  [provider: string]: ModelMapping;
}

const MODEL_MAPPINGS: ProviderModelMappings = {
  openai: {
    'gemini-2.5-pro': 'gpt-4-turbo-preview',
    'gemini-2.5-flash': 'gpt-3.5-turbo',
    'gemini-1.5-pro': 'gpt-4',
    'gemini-1.5-flash': 'gpt-3.5-turbo',
    'gemini-pro': 'gpt-4',
    'gemini-pro-vision': 'gpt-4-vision-preview',
  },
  ollama: {
    'gemini-2.5-pro': 'llama3.1:70b',
    'gemini-2.5-flash': 'llama3.1:8b',
    'gemini-1.5-pro': 'llama3.1:70b',
    'gemini-1.5-flash': 'llama3.1:8b',
    'gemini-pro': 'llama3.1:70b',
    'gemini-pro-vision': 'llava:34b',
  },
  anthropic: {
    'gemini-2.5-pro': 'claude-3-opus-20240229',
    'gemini-2.5-flash': 'claude-3-sonnet-20240229',
    'gemini-1.5-pro': 'claude-3-opus-20240229',
    'gemini-1.5-flash': 'claude-3-haiku-20240307',
    'gemini-pro': 'claude-3-opus-20240229',
    'gemini-pro-vision': 'claude-3-opus-20240229',
  },
};

/**
 * Maps a Gemini model name to the equivalent model for a given provider.
 * If no mapping exists, returns the original model name.
 *
 * @param provider The target provider (e.g., 'openai', 'ollama', 'anthropic')
 * @param geminiModel The Gemini model name to map
 * @returns The mapped model name or the original if no mapping exists
 */
export function mapModelName(provider: string, geminiModel: string): string {
  return MODEL_MAPPINGS[provider]?.[geminiModel] || geminiModel;
}

/**
 * Gets all available model mappings for a provider.
 *
 * @param provider The provider to get mappings for
 * @returns The model mappings or an empty object if the provider doesn't exist
 */
export function getProviderMappings(provider: string): ModelMapping {
  return MODEL_MAPPINGS[provider] || {};
}

/**
 * Checks if a provider has model mappings defined.
 *
 * @param provider The provider to check
 * @returns True if the provider has mappings, false otherwise
 */
export function hasProviderMappings(provider: string): boolean {
  return provider in MODEL_MAPPINGS;
}

/**
 * Gets all supported providers with model mappings.
 *
 * @returns Array of provider names
 */
export function getSupportedProviders(): string[] {
  return Object.keys(MODEL_MAPPINGS);
}
