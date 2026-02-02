export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  category: 'llm' | 'system' | 'prompt' | 'auth' | 'search';
  description?: string;
  updatedAt: number;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
}

export interface SystemParams {
  maxRounds: number;
  qualityThreshold: number;
  planningLevel: 'minimal' | 'low' | 'medium' | 'high';
  expertLevel: 'minimal' | 'low' | 'medium' | 'high';
  synthesisLevel: 'minimal' | 'low' | 'medium' | 'high';
}

export interface SearchConfig {
  provider: 'exa' | 'tavily' | 'none';
  exaApiKey: string;
  tavilyApiKey: string;
  maxResults: number;
  enabled: boolean;
}

export interface User {
  id: number;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: number;
  lastLoginAt?: number;
}
