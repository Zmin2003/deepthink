import { BaseLLMProvider } from './BaseLLMProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { llmConfig } from '../../config/llm.config.js';

export class LLMFactory {
  static createLLM(customConfig?: any): BaseLLMProvider {
    const config = customConfig || llmConfig.get();

    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config.apiKey, config.baseUrl, config.defaultModel);
      // 可以添加其他提供者
      // case 'anthropic':
      //   return new AnthropicProvider(config.apiKey);
      default:
        return new OpenAIProvider(config.apiKey, config.baseUrl, config.defaultModel);
    }
  }
}
