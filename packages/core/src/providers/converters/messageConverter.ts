/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Content, Part } from '@google/genai';
import {
  OpenAIMessage,
  OpenAIMessagePart,
  OllamaMessage,
} from '../base/types.js';

export class MessageConverter {
  static geminiToOpenAI(contents: Content[]): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    for (const content of contents) {
      const role = this.mapGeminiRoleToOpenAI(content.role || 'user');
      const message: OpenAIMessage = { role };

      // Handle single text part
      if (content.parts && content.parts.length === 1 && content.parts[0].text) {
        message.content = content.parts[0].text;
      } else if (content.parts && content.parts.length > 0) {
        // Handle multiple parts or non-text parts
        const messageParts: OpenAIMessagePart[] = [];

        for (const part of (content.parts || [])) {
          if (part.text) {
            messageParts.push({ type: 'text', text: part.text });
          } else if (part.inlineData) {
            // Convert inline data to base64 URL
            const base64Url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            messageParts.push({
              type: 'image_url',
              image_url: { url: base64Url },
            });
          } else if (part.functionCall) {
            // Handle function calls differently
            if (!message.tool_calls) {
              message.tool_calls = [];
            }
            message.tool_calls.push({
              id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'function',
              function: {
                name: part.functionCall.name || '',
                arguments: JSON.stringify(part.functionCall.args),
              },
            });
          } else if (part.functionResponse) {
            // Function responses become tool messages
            message.role = 'tool';
            message.tool_call_id = part.functionResponse.name || '';
            message.content = JSON.stringify(part.functionResponse.response);
          }
        }

        if (messageParts.length > 0) {
          message.content =
            messageParts.length === 1 && messageParts[0].type === 'text'
              ? messageParts[0].text!
              : messageParts;
        }
      }

      messages.push(message);
    }

    return messages;
  }

  static openAIToGemini(messages: OpenAIMessage[]): Content[] {
    const contents: Content[] = [];

    for (const message of messages) {
      const role = this.mapOpenAIRoleToGemini(message.role);
      const parts: Part[] = [];

      // Handle content
      if (message.content) {
        if (typeof message.content === 'string') {
          parts.push({ text: message.content });
        } else if (Array.isArray(message.content)) {
          for (const part of message.content) {
            if (part.type === 'text' && part.text) {
              parts.push({ text: part.text });
            } else if (part.type === 'image_url' && part.image_url) {
              // Extract base64 data from URL
              const match = part.image_url.url.match(/^data:(.+);base64,(.+)$/);
              if (match) {
                parts.push({
                  inlineData: {
                    mimeType: match[1],
                    data: match[2],
                  },
                });
              }
            }
          }
        }
      }

      // Handle tool calls
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          parts.push({
            functionCall: {
              name: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments),
            },
          });
        }
      }

      // Handle tool responses
      if (message.role === 'tool' && message.tool_call_id) {
        parts.push({
          functionResponse: {
            name: message.tool_call_id,
            response: message.content
              ? JSON.parse(message.content as string)
              : {},
          },
        });
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    return contents;
  }

  static geminiToOllama(contents: Content[]): OllamaMessage[] {
    const messages: OllamaMessage[] = [];

    for (const content of contents) {
      const role = this.mapGeminiRoleToOllama(content.role || 'user');
      let messageContent = '';
      const images: string[] = [];

      for (const part of (content.parts || [])) {
        if (part.text) {
          messageContent += part.text;
        } else if (part.inlineData) {
          images.push(part.inlineData.data || '');
        } else if (part.functionCall) {
          // Ollama doesn't have native function calling in the same way
          // We'll embed it in the content
          messageContent += `\n[Function Call: ${part.functionCall.name || 'unknown'}(${JSON.stringify(part.functionCall.args)})]`;
        } else if (part.functionResponse) {
          messageContent += `\n[Function Response: ${JSON.stringify(part.functionResponse.response || {})}]`;
        }
      }

      const message: OllamaMessage = {
        role,
        content: messageContent,
      };

      if (images.length > 0) {
        message.images = images;
      }

      messages.push(message);
    }

    return messages;
  }

  static ollamaToGemini(messages: OllamaMessage[]): Content[] {
    const contents: Content[] = [];

    for (const message of messages) {
      const role = this.mapOllamaRoleToGemini(message.role);
      const parts: Part[] = [];

      if (message.content) {
        parts.push({ text: message.content });
      }

      if (message.images) {
        for (const image of message.images) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg', // Ollama doesn't specify, assume JPEG
              data: image,
            },
          });
        }
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    return contents;
  }

  private static mapGeminiRoleToOpenAI(
    role: string,
  ): 'system' | 'user' | 'assistant' | 'tool' {
    switch (role) {
      case 'user':
        return 'user';
      case 'model':
        return 'assistant';
      default:
        return 'user';
    }
  }

  private static mapOpenAIRoleToGemini(role: string): string {
    switch (role) {
      case 'system':
        return 'user'; // Gemini doesn't have system role
      case 'user':
        return 'user';
      case 'assistant':
        return 'model';
      case 'tool':
        return 'model'; // Tool responses come from model
      default:
        return 'user';
    }
  }

  private static mapGeminiRoleToOllama(
    role: string,
  ): 'system' | 'user' | 'assistant' | 'tool' {
    switch (role) {
      case 'user':
        return 'user';
      case 'model':
        return 'assistant';
      default:
        return 'user';
    }
  }

  private static mapOllamaRoleToGemini(role: string): string {
    switch (role) {
      case 'system':
        return 'user';
      case 'user':
        return 'user';
      case 'assistant':
        return 'model';
      case 'tool':
        return 'model';
      default:
        return 'user';
    }
  }
}
