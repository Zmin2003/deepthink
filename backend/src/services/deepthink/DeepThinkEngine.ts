import type { AgentState, ExpertResult, ExpertConfig } from '../../models/AgentState.js';
import { LLMFactory } from '../llm/LLMFactory.js';
import { systemParams, llmConfig } from '../../config/llm.config.js';
import { parseJSONSafely } from '../../utils/json.utils.js';
import { SearchService } from '../search/SearchService.js';
import { configStore } from '../../config/llm.config.js';

const PLANNER_PROMPT = `分析用户问题，确定需要哪些专家来回答。

用户问题：{query}

{file_hint}

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

const FILE_SUMMARY_PROMPT = `请对以下文件内容进行全面总结和分析。提取关键信息、数据要点和核心内容，以便后续专家进行深入分析。

文件内容：
{fileContent}

请输出结构化的总结，包含：
1. 文件概述（文件类型、主要内容）
2. 关键信息和数据要点
3. 需要注意的重要细节`;

const EXPERT_PROMPT = `你是一位{role}专家。{description}

请针对以下问题给出专业分析：
{query}

参考资料：
{context}

重要约束：
- 如果参考资料包含"文件内容/文件分析总结"，优先基于文件证据回答。
- 不要编造文件中不存在的事实。
- 若证据不足，明确写"无法从当前文件内容确认"。

请用 <thoughts> 标签包裹思考过程，用 <response> 标签包裹最终回答。`;

const SYNTHESIZER_PROMPT = `综合以下专家意见，给出最终回答。

用户问题：{query}

专家意见：
{experts}

请综合所有专家观点，给出完整、准确的回答。`;

const FILE_REQUIRED_HINTS = [
  '文件', '上传', '附件', '文档', 'pdf', 'doc', 'xlsx', 'csv', 'txt', 'md',
  '根据文件', '解析这个文件', '读取文件', '总结文件', '分析文件',
];

const SEARCH_NEEDED_HINTS = [
  '最新', '实时', '今日', '现在', '外部', '联网', '搜索', '官网', '文档', '标准', '法规', '新闻', '公开资料',
  'latest', 'current', 'today', 'real-time', 'internet', 'web', 'search', 'official', 'standard', 'cve',
];

// Pre-compiled regexes for expert response parsing (avoid re-compilation per expert)
const THOUGHTS_RE = /<thoughts>([\s\S]*?)<\/thoughts>/;
const RESPONSE_RE = /<response>([\s\S]*?)<\/response>/;
// Pre-compiled regexes for file text extraction
const FILE_HEADER_RE = /^###\s*文件:.*$/gim;
const SEPARATOR_RE = /^[-]{3,}$/gim;
const WHITESPACE_RE = /\s+/g;

/** Maximum concurrent expert LLM calls to avoid rate-limiting and resource exhaustion. */
const MAX_EXPERT_CONCURRENCY = 4;

function isFileRelatedQuery(query: string): boolean {
  const q = (query || '').toLowerCase();
  return FILE_REQUIRED_HINTS.some(k => q.includes(k));
}

function shouldUseSearch(query: string, hasFileContext: boolean): boolean {
  // 无文件场景：维持原行为（可搜索）
  if (!hasFileContext) return true;

  // 有文件场景：仅在用户明确需要外部信息时才搜索
  const q = (query || '').toLowerCase();
  return SEARCH_NEEDED_HINTS.some(k => q.includes(k));
}

function extractMeaningfulFileText(fileContext: string): string {
  if (!fileContext) return '';

  return fileContext
    .replace(FILE_HEADER_RE, '')
    .replace(SEPARATOR_RE, '')
    .replace(WHITESPACE_RE, ' ')
    .trim();
}

function getExpertBounds(complexityRaw?: string): { min: number; max: number } {
  const complexity = (complexityRaw || '').toLowerCase();
  if (complexity === 'simple') return { min: 3, max: 4 };
  if (complexity === 'complex') return { min: 5, max: 7 };
  // medium / unknown
  return { min: 4, max: 5 };
}

function normalizeExperts(rawExperts: any[], complexityRaw?: string): ExpertConfig[] {
  const mk = (role: string, description: string): ExpertConfig => ({
    role,
    description,
    prompt: '',
    temperature: 0.7,
    variant: 'creative',
  });

  const defaults: ExpertConfig[] = [
    mk('Problem Analyst', '拆解问题边界与关键约束'),
    mk('Technical Summarizer', '提炼关键信息并结构化表达'),
    mk('Risk Reviewer', '识别风险、盲点与不确定性'),
    mk('Implementation Advisor', '给出可执行方案与验证路径'),
    mk('Domain Specialist', '提供领域专业判断'),
    mk('Quality Checker', '检查结论一致性与证据充分性'),
    mk('Decision Synthesizer', '整合多方意见形成最终结论'),
  ];

  const cleaned = (Array.isArray(rawExperts) ? rawExperts : [])
    .filter((e: any) => e && typeof e.role === 'string' && e.role.trim())
    .map((e: any) => ({
      role: String(e.role).trim(),
      description: String(e.description || '').trim(),
      prompt: '',
      temperature: typeof e.temperature === 'number' ? e.temperature : 0.7,
      variant: (e.variant === 'conservative' || e.variant === 'creative') ? e.variant : 'creative',
    }));

  const bounds = getExpertBounds(complexityRaw);
  let result = cleaned.slice(0, bounds.max);

  if (result.length < bounds.min) {
    const seen = new Set(result.map(e => e.role.toLowerCase()));
    for (const d of defaults) {
      if (result.length >= bounds.min) break;
      if (!seen.has(d.role.toLowerCase())) {
        result.push(d);
        seen.add(d.role.toLowerCase());
      }
    }
  }

  return result.slice(0, bounds.max);
}

/**
 * Simple concurrency limiter for parallel async tasks.
 * Ensures at most `limit` tasks run concurrently.
 */
function limitConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = new Array(tasks.length);
    let running = 0;
    let nextIndex = 0;
    let completed = 0;
    let rejected = false;

    function runNext() {
      while (running < limit && nextIndex < tasks.length) {
        const idx = nextIndex++;
        running++;
        tasks[idx]()
          .then((result) => {
            if (rejected) return;
            results[idx] = result;
            running--;
            completed++;
            if (completed === tasks.length) {
              resolve(results);
            } else {
              runNext();
            }
          })
          .catch((err) => {
            if (!rejected) {
              rejected = true;
              reject(err);
            }
          });
      }
    }

    if (tasks.length === 0) {
      resolve([]);
    } else {
      runNext();
    }
  });
}

export class DeepThinkEngine {
  async *stream(query: string, config?: any): AsyncGenerator<any> {
    const llmCfg = llmConfig.get();
    const llm = LLMFactory.createLLM({ ...llmCfg, ...config });
    const fileContext = config?.fileContext || '';
    const meaningfulFileText = extractMeaningfulFileText(fileContext);
    const hasMeaningfulFileText = meaningfulFileText.length >= 20;

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

    // Guard: 用户明确要求基于文件，但文件为空/不可解析时，直接返回，避免幻觉
    if (isFileRelatedQuery(query) && fileContext && !hasMeaningfulFileText) {
      state.finalOutput = '我收到了文件，但可提取的文本内容过少（接近为空），目前无法基于文件给出可靠结论。请上传包含可读文本的文件，或直接粘贴文件内容后再分析。';
      yield { type: 'complete', state };
      return;
    }

    // Step 1: 规划
    yield { type: 'node_start', node: 'planner', state };

    const fileHint = hasMeaningfulFileText
      ? `用户上传了文件，文件内容摘要：${meaningfulFileText.substring(0, 500)}...`
      : '';

    const plannerResponse = await llm.complete({
      messages: [
        { role: 'system', content: 'You are a planning AI. Respond only with valid JSON.' },
        { role: 'user', content: PLANNER_PROMPT.replace('{query}', query).replace('{file_hint}', fileHint) },
      ],
      temperature: 0.7,
    });

    const plan = parseJSONSafely(plannerResponse.content);
    const experts = normalizeExperts(plan.experts || [], plan.complexity);

    state.expertsConfig = experts;
    yield { type: 'node_complete', node: 'planner', state, data: { expertsConfig: experts } };

    // Step 2: 文件分析（如果有上传文件，先让 AI 总结）
    if (hasMeaningfulFileText) {
      yield { type: 'node_start', node: 'file_analysis', state };

      try {
        console.log(`[FileAnalysis] Summarizing file content (${meaningfulFileText.length} chars)`);
        const summaryResponse = await llm.complete({
          messages: [
            { role: 'user', content: FILE_SUMMARY_PROMPT.replace('{fileContent}', meaningfulFileText) },
          ],
          temperature: 0.3,
        });

        state.context = `## 文件分析总结:\n\n${summaryResponse.content}`;
        state.fileSummary = summaryResponse.content;
        console.log('[FileAnalysis] Summary complete');
      } catch (error: any) {
        console.error('[FileAnalysis] Error:', error.message);
        // 降级：直接使用清洗后的文件内容
        state.context = `## 文件内容:\n\n${meaningfulFileText}`;
      }

      yield { type: 'node_complete', node: 'file_analysis', state };
    }

    // Step 3: 搜索（文件问题默认不搜；仅在明确需要外部信息时触发）
    yield { type: 'node_start', node: 'search', state };

    try {
      const searchConfig = configStore.getSearchConfig();
      const allowSearch = shouldUseSearch(query, hasMeaningfulFileText);
      if (searchConfig.enabled && searchConfig.provider !== 'none' && allowSearch) {
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
          state.context = (state.context ? state.context + '\n\n' : '') + `## 搜索结果:\n\n${formattedResults}`;
          state.searchResults = results;
          console.log(`[Search] Found ${results.length} results`);
        }
      }
    } catch (error: any) {
      console.error('[Search] Error:', error.message);
    }

    yield { type: 'node_complete', node: 'search', state };

    // Step 4: 专家分析（并行执行，带并发限制以避免 API 速率限制）
    yield {
      type: 'node_start',
      node: 'experts',
      state,
      data: { expertsConfig: experts }
    };

    const expertResults: ExpertResult[] = [];
    const resultsQueue: ExpertResult[] = [];
    let resolveNext: ((result: ExpertResult) => void) | null = null;

    const contextStr = state.context || '无额外上下文';

    // Build expert task closures
    const expertTasks = experts.map((expert: ExpertConfig) => async () => {
      const expertPrompt = EXPERT_PROMPT
        .replace('{role}', expert.role)
        .replace('{description}', expert.description || '')
        .replace('{query}', query)
        .replace('{context}', contextStr);

      const expertResponse = await llm.complete({
        messages: [
          { role: 'user', content: expertPrompt },
        ],
        temperature: 0.7,
      });

      const thoughtsMatch = expertResponse.content.match(THOUGHTS_RE);
      const responseMatch = expertResponse.content.match(RESPONSE_RE);

      const result: ExpertResult = {
        id: `expert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: expert.role,
        variant: 'standard',
        thoughts: thoughtsMatch ? thoughtsMatch[1].trim() : '',
        content: responseMatch ? responseMatch[1].trim() : expertResponse.content,
        round: 1,
        status: 'completed',
      };

      // Push to queue for streaming yield
      if (resolveNext) {
        resolveNext(result);
        resolveNext = null;
      } else {
        resultsQueue.push(result);
      }

      return result;
    });

    // Launch experts with concurrency limit
    const allDone = limitConcurrency(expertTasks, MAX_EXPERT_CONCURRENCY);
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

    // Step 5: 综合
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
