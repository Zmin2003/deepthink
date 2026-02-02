import type { AgentState, NodeResult } from '../../../models/AgentState.js';
import { SearchService, type SearchResult } from '../../search/SearchService.js';
import { configStore } from '../../../config/llm.config.js';

export class SearchNode {
  static async execute(state: AgentState): Promise<NodeResult> {
    const searchConfig = configStore.getSearchConfig();

    // Skip search if disabled or provider is 'none'
    if (!searchConfig.enabled || searchConfig.provider === 'none') {
      return {};
    }

    try {
      const searchService = new SearchService({
        provider: searchConfig.provider,
        exaApiKey: searchConfig.exaApiKey,
        tavilyApiKey: searchConfig.tavilyApiKey,
        maxResults: searchConfig.maxResults,
      });

      console.log(`[SearchNode] Searching with ${searchConfig.provider}: "${state.query}"`);
      const results = await searchService.search(state.query);

      if (results.length === 0) {
        console.log('[SearchNode] No search results found');
        return {};
      }

      // Format search results for context
      const formattedResults = results
        .map((result, index) => {
          return `${index + 1}. **${result.title}**
   URL: ${result.url}
   ${result.snippet}`;
        })
        .join('\n\n');

      const enrichedContext = state.context
        ? `${state.context}\n\n## Web Search Results:\n\n${formattedResults}`
        : `## Web Search Results:\n\n${formattedResults}`;

      console.log(`[SearchNode] Found ${results.length} results, enriched context`);

      return {
        searchResults: results,
        context: enrichedContext,
      };
    } catch (error: any) {
      console.error('[SearchNode] Search failed:', error.message);
      // Don't fail the entire flow if search fails
      return {};
    }
  }
}
