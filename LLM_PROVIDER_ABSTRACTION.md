# LLM Provider Abstraction Design

## Overview

This document outlines the design for abstracting LLM providers to support multiple backends including Gemini, OpenAI-compatible providers, and Ollama for local serving.

## Current Architecture

The codebase currently uses a `ContentGenerator` interface that abstracts Google's various APIs (Gemini, Vertex AI, Code Assist). This provides a solid foundation for extending to other providers.

```typescript
export interface ContentGenerator {
  generateContent(request: GenerateContentParameters): Promise<GenerateContentResponse>;
  generateContentStream(request: GenerateContentParameters): Promise<AsyncGenerator<GenerateContentResponse>>;
  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
  getTier?(): Promise<UserTierId | undefined>;
}
```

## Provider Comparison

### Message Format Differences

| Provider | Role Types | Message Structure |
|----------|-----------|-------------------|
| Gemini | `user`, `model` | `{ role, parts: [{ text }, { functionCall }, ...] }` |
| OpenAI | `system`, `user`, `assistant`, `tool` | `{ role, content: string \| parts[], tool_calls?: [...] }` |
| Ollama | Same as OpenAI | OpenAI-compatible or native format |

### Tool/Function Calling

| Provider | Tool Definition | Response Format |
|----------|----------------|-----------------|
| Gemini | `FunctionDeclaration` with parameters schema | `functionCall` in parts |
| OpenAI | JSON Schema with parameters | `tool_calls` array in response |
| Ollama | OpenAI-compatible format | `tool_calls` in message |

### Streaming

| Provider | Stream Format | Chunk Type |
|----------|--------------|------------|
| Gemini | AsyncGenerator | Complete response objects |
| OpenAI | Server-Sent Events | Delta chunks requiring accumulation |
| Ollama | SSE (OpenAI mode) or JSON stream | Delta or complete chunks |

## Proposed Architecture

### 1. Extended Authentication Types

```typescript
export enum AuthType {
  // Existing
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
```

### 2. Provider Configuration

```typescript
interface BaseProviderConfig {
  authType: AuthType;
  apiKey?: string;
  endpoint?: string; // For custom endpoints
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

interface OpenAIConfig extends BaseProviderConfig {
  authType: AuthType.USE_OPENAI;
  organizationId?: string;
  apiVersion?: string; // For Azure OpenAI
}

interface OllamaConfig extends BaseProviderConfig {
  authType: AuthType.USE_OLLAMA;
  endpoint: string; // Default: http://localhost:11434
  useOpenAICompatible?: boolean; // Use /v1 endpoint
  contextWindow?: number; // Recommended 32k+ for tools
}

interface OpenAICompatibleConfig extends BaseProviderConfig {
  authType: AuthType.USE_OPENAI_COMPATIBLE;
  endpoint: string; // Required
  headers?: Record<string, string>; // Additional headers
}
```

### 3. Provider Implementations

#### Base Abstract Class

```typescript
abstract class BaseContentGenerator implements ContentGenerator {
  protected config: BaseProviderConfig;
  protected httpClient: HttpClient;
  
  constructor(config: BaseProviderConfig) {
    this.config = config;
    this.httpClient = this.createHttpClient();
  }
  
  abstract generateContent(request: GenerateContentParameters): Promise<GenerateContentResponse>;
  abstract generateContentStream(request: GenerateContentParameters): Promise<AsyncGenerator<GenerateContentResponse>>;
  abstract countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
  abstract embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
  
  getTier?(): Promise<UserTierId | undefined> {
    return Promise.resolve(undefined);
  }
  
  protected abstract createHttpClient(): HttpClient;
}
```

#### OpenAI Implementation

```typescript
class OpenAIContentGenerator extends BaseContentGenerator {
  private converter: OpenAIConverter;
  
  constructor(config: OpenAIConfig) {
    super(config);
    this.converter = new OpenAIConverter();
  }
  
  async generateContent(request: GenerateContentParameters): Promise<GenerateContentResponse> {
    const openAIRequest = this.converter.toOpenAIRequest(request);
    const response = await this.httpClient.post('/chat/completions', openAIRequest);
    return this.converter.fromOpenAIResponse(response);
  }
  
  async *generateContentStream(request: GenerateContentParameters): AsyncGenerator<GenerateContentResponse> {
    const openAIRequest = { ...this.converter.toOpenAIRequest(request), stream: true };
    const stream = await this.httpClient.postStream('/chat/completions', openAIRequest);
    
    for await (const chunk of this.parseSSEStream(stream)) {
      yield this.converter.fromOpenAIStreamChunk(chunk);
    }
  }
  
  // Additional methods...
}
```

#### Ollama Implementation

```typescript
class OllamaContentGenerator extends BaseContentGenerator {
  private converter: OllamaConverter;
  private useOpenAIMode: boolean;
  
  constructor(config: OllamaConfig) {
    super(config);
    this.useOpenAIMode = config.useOpenAICompatible ?? true;
    this.converter = new OllamaConverter(this.useOpenAIMode);
  }
  
  async generateContent(request: GenerateContentParameters): Promise<GenerateContentResponse> {
    if (this.useOpenAIMode) {
      // Use OpenAI-compatible endpoint
      return this.callOpenAICompatible(request);
    } else {
      // Use native Ollama API
      return this.callNativeOllama(request);
    }
  }
  
  private async callOpenAICompatible(request: GenerateContentParameters): Promise<GenerateContentResponse> {
    const endpoint = `${this.config.endpoint}/v1/chat/completions`;
    // Similar to OpenAI implementation
  }
  
  private async callNativeOllama(request: GenerateContentParameters): Promise<GenerateContentResponse> {
    const endpoint = `${this.config.endpoint}/api/chat`;
    const ollamaRequest = this.converter.toOllamaRequest(request);
    const response = await this.httpClient.post(endpoint, ollamaRequest);
    return this.converter.fromOllamaResponse(response);
  }
  
  // Streaming, embeddings, etc.
}
```

### 4. Message and Tool Converters

#### OpenAI Converter

```typescript
class OpenAIConverter {
  toOpenAIRequest(request: GenerateContentParameters): OpenAIRequest {
    return {
      model: request.model,
      messages: this.convertMessages(request.contents),
      tools: request.tools ? this.convertTools(request.tools) : undefined,
      temperature: request.generationConfig?.temperature,
      top_p: request.generationConfig?.topP,
      max_tokens: request.generationConfig?.maxOutputTokens,
      stream: false,
    };
  }
  
  private convertMessages(contents: Content[]): OpenAIMessage[] {
    return contents.map(content => {
      const role = this.mapRole(content.role);
      const message: OpenAIMessage = { role };
      
      if (content.parts.length === 1 && content.parts[0].text) {
        message.content = content.parts[0].text;
      } else {
        message.content = this.convertParts(content.parts);
      }
      
      // Handle function responses
      if (content.parts.some(p => p.functionResponse)) {
        message.role = 'tool';
        message.tool_call_id = content.parts.find(p => p.functionResponse)?.functionResponse?.name;
      }
      
      return message;
    });
  }
  
  private mapRole(geminiRole: string): OpenAIRole {
    switch (geminiRole) {
      case 'user': return 'user';
      case 'model': return 'assistant';
      default: return 'user';
    }
  }
  
  private convertTools(tools: FunctionDeclaration[]): OpenAITool[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as any, // Already JSON Schema
      }
    }));
  }
  
  fromOpenAIResponse(response: OpenAIResponse): GenerateContentResponse {
    const message = response.choices[0].message;
    const parts: Part[] = [];
    
    if (message.content) {
      parts.push({ text: message.content });
    }
    
    if (message.tool_calls) {
      message.tool_calls.forEach(toolCall => {
        parts.push({
          functionCall: {
            name: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments),
          }
        });
      });
    }
    
    return {
      candidates: [{
        content: {
          role: 'model',
          parts,
        },
        finishReason: this.mapFinishReason(response.choices[0].finish_reason),
      }],
      usageMetadata: {
        promptTokenCount: response.usage?.prompt_tokens || 0,
        candidatesTokenCount: response.usage?.completion_tokens || 0,
        totalTokenCount: response.usage?.total_tokens || 0,
      }
    };
  }
  
  // Stream handling...
  fromOpenAIStreamChunk(chunk: OpenAIStreamChunk): GenerateContentResponse {
    // Accumulate deltas and convert to Gemini format
  }
}
```

### 5. Factory Updates

```typescript
export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  switch (config.authType) {
    case AuthType.USE_GEMINI:
      return createGeminiContentGenerator(config, gcConfig);
      
    case AuthType.USE_OPENAI:
      return new OpenAIContentGenerator({
        authType: AuthType.USE_OPENAI,
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        model: config.model || 'gpt-4-turbo-preview',
        endpoint: 'https://api.openai.com/v1',
        ...config,
      });
      
    case AuthType.USE_OLLAMA:
      return new OllamaContentGenerator({
        authType: AuthType.USE_OLLAMA,
        endpoint: config.endpoint || 'http://localhost:11434',
        model: config.model || 'llama3.1',
        useOpenAICompatible: true,
        contextWindow: 32768, // Recommended for tools
        ...config,
      });
      
    case AuthType.USE_OPENAI_COMPATIBLE:
      return new OpenAICompatibleContentGenerator({
        authType: AuthType.USE_OPENAI_COMPATIBLE,
        endpoint: config.endpoint!, // Required
        apiKey: config.apiKey,
        model: config.model,
        ...config,
      });
      
    // Existing cases...
    default:
      throw new Error(`Unsupported auth type: ${config.authType}`);
  }
}
```

### 6. Configuration UI Updates

Add provider selection to the CLI:

```typescript
// In AuthDialog or similar
const providers = [
  { value: 'gemini', label: 'Google Gemini', requiresKey: true },
  { value: 'openai', label: 'OpenAI', requiresKey: true },
  { value: 'ollama', label: 'Ollama (Local)', requiresKey: false },
  { value: 'openai-compatible', label: 'OpenAI Compatible', requiresKey: true, requiresEndpoint: true },
];

// Provider-specific configuration
interface ProviderSettings {
  provider: string;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  additionalOptions?: Record<string, any>;
}
```

### 7. Model Name Mapping

Different providers use different model names:

```typescript
const MODEL_MAPPINGS: Record<string, Record<string, string>> = {
  openai: {
    'gemini-2.5-pro': 'gpt-4-turbo-preview',
    'gemini-2.5-flash': 'gpt-3.5-turbo',
  },
  ollama: {
    'gemini-2.5-pro': 'llama3.1:70b',
    'gemini-2.5-flash': 'llama3.1:8b',
  },
};

function mapModelName(provider: string, geminiModel: string): string {
  return MODEL_MAPPINGS[provider]?.[geminiModel] || geminiModel;
}
```

## Implementation Strategy

### Phase 1: Core Abstraction (Week 1)
1. Create base classes and interfaces
2. Implement message/tool converters
3. Update factory pattern
4. Add provider configuration types

### Phase 2: OpenAI Implementation (Week 2)
1. Implement OpenAIContentGenerator
2. Handle streaming with SSE
3. Test tool calling
4. Add error handling

### Phase 3: Ollama Implementation (Week 3)
1. Implement OllamaContentGenerator
2. Support both native and OpenAI modes
3. Add local endpoint detection
4. Test with popular models

### Phase 4: UI Integration (Week 4)
1. Update authentication flow
2. Add provider selection UI
3. Model name mapping
4. Settings persistence

### Phase 5: Testing & Polish (Week 5)
1. Cross-provider testing
2. Performance optimization
3. Error handling improvements
4. Documentation

## Benefits

1. **Flexibility**: Users can choose their preferred LLM provider
2. **Cost Control**: Use OpenAI for complex tasks, Ollama for simple ones
3. **Privacy**: Local serving with Ollama for sensitive data
4. **Compatibility**: Support any OpenAI-compatible API
5. **Future-Proof**: Easy to add new providers

## Considerations

1. **Feature Parity**: Not all providers support all features (e.g., embeddings)
2. **Performance**: Local models may be slower than cloud APIs
3. **Tool Support**: Verify tool calling works across providers
4. **Token Limits**: Different models have different context windows
5. **Cost**: Track usage across different providers

This abstraction design maintains backward compatibility while enabling seamless switching between LLM providers.