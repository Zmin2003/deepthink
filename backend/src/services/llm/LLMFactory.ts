import { BaseLLMProvider } from './BaseLLMProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { llmConfig } from '../../config/llm.config.js';

/**
 * LLMFactory with instance caching.
 * Reuses OpenAI client instances when config (apiKey + baseUrl + model) hasn't changed,
 * avoiding redundant TCP/TLS handshake overhead per request.
 */
export class LLMFactory {
  private static cache = new Map<string, BaseLLMProvider>();

  private static getCacheKey(config: any): string {
    return `${config.provider || 'openai'}:${config.apiKey || ''}:${config.baseUrl || ''}:${config.defaultModel || ''}`;
  }

  static createLLM(customConfig?: any): BaseLLMProvider {
    const config = customConfig || llmConfig.get();
    const cacheKey = this.getCacheKey(config);

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let provider: BaseLLMProvider;
    switch (config.provider) {
      case 'openai':
        provider = new OpenAIProvider(config.apiKey, config.baseUrl, config.defaultModel);
        break;
      default:
        provider = new OpenAIProvider(config.apiKey, config.baseUrl, config.defaultModel);
        break;
    }

    this.cache.set(cacheKey, provider);
    return provider;
  }

  /**
   * Clear the provider cache (e.g., after config changes via admin panel).
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
