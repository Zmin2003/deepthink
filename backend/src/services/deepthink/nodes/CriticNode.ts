import type { BaseLLMProvider } from '../../llm/BaseLLMProvider.js';
import type { AgentState, NodeResult } from '../../../models/AgentState.js';
import { CRITIC_PROMPT } from '../../../prompts/critic.prompts.js';
import { parseJSONSafely } from '../../../utils/json.utils.js';

export class CriticNode {
  constructor(private llm: BaseLLMProvider) {}

  async execute(state: AgentState): Promise<NodeResult> {
    const { query, context, expertsOutput } = state;

    const expertsText = expertsOutput
      .map((expert) => `[${expert.role} - ${expert.variant}]\n${expert.content}`)
      .join('\n\n');

    const prompt = CRITIC_PROMPT
      .replace('{query}', query)
      .replace('{context}', context || '')
      .replace('{experts_output}', expertsText);

    const response = await this.llm.complete({
      messages: [
        { role: 'system', content: 'You are a critical analyst. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
    });

    const criticism = parseJSONSafely(response.content);

    return {
      criticFeedback: [
        ...(state.criticFeedback || []),
        JSON.stringify(criticism),
      ],
    };
  }
}
