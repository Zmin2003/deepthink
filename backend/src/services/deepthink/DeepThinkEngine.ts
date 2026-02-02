import type { AgentState, ExpertResult, ExpertConfig } from '../../models/AgentState.js';
import { LLMFactory } from '../llm/LLMFactory.js';
import { systemParams, llmConfig } from '../../config/llm.config.js';
import { parseJSONSafely } from '../../utils/json.utils.js';
import { SearchService } from '../search/SearchService.js';
import { configStore } from '../../config/llm.config.js';

const PLANNER_PROMPT = `分析用户问题，确定需要哪些专家来回答。

用户问题：{query}

根据问题的复杂程度，选择 2-7 个最相关的专家角色。
- 简单问题：2-3 个专家
- 中等问题：3-5 个专家
- 复杂问题：5-7 个专家

返回 JSON 格式：
{
  "analysis": "问题分析",
  "complexity": "simple/medium/complex",
  "experts": [
    {"role": "专家角色", "description": "职责描述"}
  ]
}`;

const EXPERT_PROMPT = `你是一位{role}专家。{description}

请针对以下问题给出专业分析：
{query}

参考资料：
{context}

请用 <thoughts> 标签包裹思考过程，用 <response> 标签包裹最终回答。`;

const SYNTHESIZER_PROMPT = `综合以下专家意见，给出最终回答。

用户问题：{query}

专家意见：
{experts}

请综合所有专家观点，给出完整、准确的回答。`;

export class DeepThinkEngine {
  async *stream(query: string, config?: any): AsyncGenerator<any> {
    const llmCfg = llmConfig.get();
    const llm = LLMFactory.createLLM({ ...llmCfg, ...config });

    const state: AgentState = {
      query,
      context: '',
      round: 1,
      maxRounds: 1,
      satisfied: true,
      expertsOutput: [],
      finalOutput: '',
      startTime: Date.now(),
      config: { ...llmCfg, ...config },
    };

    // Step 1: 规划
    yield { type: 'node_start', node: 'planner', state };

    const plannerResponse = await llm.complete({
      messages: [
        { role: 'system', content: 'You are a planning AI. Respond only with valid JSON.' },
        { role: 'user', content: PLANNER_PROMPT.replace('{query}', query) },
      ],
      temperature: 0.7,
    });

    const plan = parseJSONSafely(plannerResponse.content);
    const experts = (plan.experts || []).slice(0, 6); // 最多6个专家

    state.expertsConfig = experts;
    yield { type: 'node_complete', node: 'planner', state, data: { expertsConfig: experts } };

    // Step 2: 搜索
    yield { type: 'node_start', node: 'search', state };

    try {
      const searchConfig = configStore.getSearchConfig();
      if (searchConfig.enabled && searchConfig.provider !== 'none') {
        const searchService = new SearchService({
          provider: searchConfig.provider,
          exaApiKey: searchConfig.exaApiKey,
          tavilyApiKey: searchConfig.tavilyApiKey,
          maxResults: searchConfig.maxResults,
        });

        console.log(`[Search] Searching: "${query}"`);
        const results = await searchService.search(query);

        if (results.length > 0) {
          const formattedResults = results
            .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}`)
            .join('\n\n');
          state.context = `## 搜索结果:\n\n${formattedResults}`;
          state.searchResults = results;
          console.log(`[Search] Found ${results.length} results`);
        }
      }
    } catch (error: any) {
      console.error('[Search] Error:', error.message);
    }

    yield { type: 'node_complete', node: 'search', state };

    // Step 3: 专家分析（真正并行执行）
    yield {
      type: 'node_start',
      node: 'experts',
      state,
      data: { expertsConfig: experts }
    };

    const expertResults: ExpertResult[] = [];
    const resultsQueue: ExpertResult[] = [];
    let resolveNext: ((result: ExpertResult) => void) | null = null;

    // 启动所有专家并行执行
    const expertPromises = experts.map(async (expert: ExpertConfig) => {
      const expertPrompt = EXPERT_PROMPT
        .replace('{role}', expert.role)
        .replace('{description}', expert.description || '')
        .replace('{query}', query)
        .replace('{context}', state.context || '无额外上下文');

      const expertResponse = await llm.complete({
        messages: [
          { role: 'user', content: expertPrompt },
        ],
        temperature: 0.7,
      });

      const thoughtsMatch = expertResponse.content.match(/<thoughts>([\s\S]*?)<\/thoughts>/);
      const responseMatch = expertResponse.content.match(/<response>([\s\S]*?)<\/response>/);

      const result: ExpertResult = {
        id: `expert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: expert.role,
        variant: 'standard',
        thoughts: thoughtsMatch ? thoughtsMatch[1].trim() : '',
        content: responseMatch ? responseMatch[1].trim() : expertResponse.content,
        round: 1,
        status: 'completed',
      };

      // 完成后加入队列
      if (resolveNext) {
        resolveNext(result);
        resolveNext = null;
      } else {
        resultsQueue.push(result);
      }

      return result;
    });

    // 等待所有专家完成，每完成一个就 yield
    const allDone = Promise.all(expertPromises);
    let completed = 0;
    const total = experts.length;

    while (completed < total) {
      let result: ExpertResult;
      if (resultsQueue.length > 0) {
        result = resultsQueue.shift()!;
      } else {
        result = await new Promise<ExpertResult>((resolve) => {
          resolveNext = resolve;
        });
      }
      expertResults.push(result);
      completed++;
      yield { type: 'expert_complete', data: result };
    }

    await allDone; // 确保全部完成

    state.expertsOutput = expertResults;
    yield { type: 'node_complete', node: 'experts', state };

    // Step 4: 综合
    yield { type: 'node_start', node: 'synthesizer', state };

    const expertsText = expertResults
      .map(e => `【${e.role}】\n${e.content}`)
      .join('\n\n');

    const synthesizerPrompt = SYNTHESIZER_PROMPT
      .replace('{query}', query)
      .replace('{experts}', expertsText);

    const synthesizerResponse = await llm.complete({
      messages: [
        { role: 'user', content: synthesizerPrompt },
      ],
      temperature: 0.7,
    });

    state.finalOutput = synthesizerResponse.content;
    yield { type: 'node_complete', node: 'synthesizer', state };

    // 完成
    yield { type: 'complete', state };
  }

  async invoke(query: string, config?: any): Promise<any> {
    let finalState: any = null;
    for await (const update of this.stream(query, config)) {
      if (update.type === 'complete') {
        finalState = update.state;
      }
    }
    return finalState;
  }
}
