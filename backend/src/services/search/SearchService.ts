import axios, { AxiosInstance } from 'axios';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

/**
 * Shared axios instances with HTTP keep-alive for connection reuse.
 * One per search provider to avoid cross-provider header leaks.
 */
const exaClient: AxiosInstance = axios.create({
  baseURL: 'https://api.exa.ai',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const tavilyClient: AxiosInstance = axios.create({
  baseURL: 'https://api.tavily.com',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export class SearchService {
  private exaApiKey: string;
  private tavilyApiKey: string;
  private provider: 'exa' | 'tavily' | 'none';
  private maxResults: number;

  constructor(config: {
    provider: 'exa' | 'tavily' | 'none';
    exaApiKey: string;
    tavilyApiKey: string;
    maxResults: number;
  }) {
    this.provider = config.provider;
    this.exaApiKey = config.exaApiKey;
    this.tavilyApiKey = config.tavilyApiKey;
    this.maxResults = config.maxResults;
  }

  async search(query: string): Promise<SearchResult[]> {
    if (this.provider === 'none') {
      return [];
    }

    try {
      if (this.provider === 'exa') {
        return await this.searchWithExa(query, this.maxResults);
      } else if (this.provider === 'tavily') {
        return await this.searchWithTavily(query, this.maxResults);
      }
      return [];
    } catch (error: any) {
      console.error(`Search error (${this.provider}):`, error.message);
      return [];
    }
  }

  private async searchWithExa(query: string, maxResults: number): Promise<SearchResult[]> {
    if (!this.exaApiKey) {
      throw new Error('Exa API key not configured');
    }

    const response = await exaClient.post(
      '/search',
      {
        query,
        numResults: maxResults,
        type: 'neural',
        contents: {
          text: true,
        },
      },
      {
        headers: {
          'x-api-key': this.exaApiKey,
        },
      }
    );

    const results = response.data.results || [];
    return results.map((result: any) => ({
      title: result.title || '',
      url: result.url || '',
      snippet: result.text || result.snippet || '',
      score: result.score,
    }));
  }

  private async searchWithTavily(query: string, maxResults: number): Promise<SearchResult[]> {
    if (!this.tavilyApiKey) {
      throw new Error('Tavily API key not configured');
    }

    const response = await tavilyClient.post(
      '/search',
      {
        api_key: this.tavilyApiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
      }
    );

    const results = response.data.results || [];
    return results.map((result: any) => ({
      title: result.title || '',
      url: result.url || '',
      snippet: result.content || '',
      score: result.score,
    }));
  }
}
