import type { BaseLLMProvider } from '../../llm/BaseLLMProvider.js';
import type { AgentState, NodeResult, ExpertResult } from '../../../models/AgentState.js';
import { EXPERT_SYSTEM_PROMPT, EXPERT_USER_PROMPT } from '../../../prompts/expert.prompts.js';
import { EventEmitter } from 'events';

export class ExpertsNode extends EventEmitter {
  constructor(private llm: BaseLLMProvider) {
    super();
  }

  async execute(state: AgentState): Promise<NodeResult> {
    const { expertsConfig, query, context, round } = state;

    if (!expertsConfig || expertsConfig.length === 0) {
      throw new Error('No experts configured');
    }

    const expertsOutput: ExpertResult[] = [];

    // 并行执行所有专家，但每完成一个就发送事件
    const expertPromises = expertsConfig.map(async (expert) => {
      const result = await this.runSingleExpert(expert, query, context || '', round);
      // 每完成一个专家就发送事件
      this.emit('expert_complete', result);
      return result;
    });

    const results = await Promise.all(expertPromises);
    expertsOutput.push(...results);

    return {
      expertsOutput: expertsOutput,  // 只保留当前轮次的专家结果，不累积
    };
  }

  private async runSingleExpert(
    expert: any,
    query: string,
    context: string,
    round: number
  ): Promise<ExpertResult> {
    const systemPrompt = EXPERT_SYSTEM_PROMPT
      .replace('{role}', expert.role)
      .replace('{description}', expert.description || '');

    const userPrompt = EXPERT_USER_PROMPT
      .replace('{context}', context)
      .replace('{query}', query)
      .replace('{additional_prompt}', expert.prompt || '');

    try {
      const response = await this.llm.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: expert.temperature || 0.7,
      });

      // 解析 thoughts 和 response
      const thoughtsMatch = response.content.match(/<thoughts>(.*?)<\/thoughts>/s);
      const responseMatch = response.content.match(/<response>(.*?)<\/response>/s);

      return {
        id: `expert-r${round}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: expert.role,
        variant: expert.variant || 'standard',
        thoughts: thoughtsMatch ? thoughtsMatch[1].trim() : '',
        content: responseMatch ? responseMatch[1].trim() : response.content,
        round,
        status: 'completed',
      };
    } catch (error) {
      return {
        id: `expert-r${round}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: expert.role,
        variant: expert.variant || 'standard',
        thoughts: '',
        content: `Error: ${(error as Error).message}`,
        round,
        status: 'error',
      };
    }
  }
}
