import OpenAI from 'openai';
import { BaseLLMProvider, LLMCompletionOptions, LLMCompletionResult } from './BaseLLMProvider.js';

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey: string, baseUrl?: string, defaultModel?: string) {
    super(apiKey, baseUrl);
    this.defaultModel = defaultModel || 'gpt-4';
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
    });
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: this.defaultModel,
      messages: options.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *stream(options: LLMCompletionOptions): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: this.defaultModel,
      messages: options.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
