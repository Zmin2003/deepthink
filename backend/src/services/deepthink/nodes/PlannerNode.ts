import type { BaseLLMProvider } from '../../llm/BaseLLMProvider.js';
import type { AgentState, NodeResult } from '../../../models/AgentState.js';
import { PLANNER_BRAINSTORM_PROMPT, PLANNER_SELECT_PROMPT } from '../../../prompts/planner.prompts.js';
import { parseJSONSafely } from '../../../utils/json.utils.js';

export class PlannerNode {
  constructor(private llm: BaseLLMProvider) {}

  async execute(state: AgentState): Promise<NodeResult> {
    const brainstormResult = await this.brainstorm(state);
    const selectedPlan = await this.selectBest(state, brainstormResult.alternatives);
    const expertsConfig = this.createExpertVariants(selectedPlan.experts);

    return {
      plannerThoughts: brainstormResult.analysis,
      planAlternatives: brainstormResult.alternatives,
      selectedPlan,
      expertsConfig,
      round: state.round + 1,
    };
  }

  private async brainstorm(state: AgentState) {
    const prompt = PLANNER_BRAINSTORM_PROMPT
      .replace('{query}', state.query)
      .replace('{context}', state.context || '')
      .replace('{previous_critique}', state.criticFeedback?.join('\n') || 'None');

    const response = await this.llm.complete({
      messages: [
        { role: 'system', content: 'You are a strategic planning AI. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    return parseJSONSafely(response.content);
  }

  private async selectBest(state: AgentState, alternatives: any[]) {
    const prompt = PLANNER_SELECT_PROMPT
      .replace('{query}', state.query)
      .replace('{alternatives}', JSON.stringify(alternatives, null, 2));

    const response = await this.llm.complete({
      messages: [
        { role: 'system', content: 'You are a decision-making AI. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    });

    const result = parseJSONSafely(response.content);
    return result.selected;
  }

  private createExpertVariants(experts: any[]) {
    // 直接返回专家配置，不再翻倍创建变体
    // 限制最多 4 个专家
    return experts.slice(0, 4).map(expert => ({
      ...expert,
      temperature: expert.temperature || 0.7,
      variant: 'standard',
    }));
  }
}
