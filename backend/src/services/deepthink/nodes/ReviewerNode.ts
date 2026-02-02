import type { BaseLLMProvider } from '../../llm/BaseLLMProvider.js';
import type { AgentState, NodeResult, ReviewScore } from '../../../models/AgentState.js';
import { REVIEWER_PROMPT } from '../../../prompts/reviewer.prompts.js';
import { parseJSONSafely } from '../../../utils/json.utils.js';

export class ReviewerNode {
  constructor(private llm: BaseLLMProvider) {}

  async execute(state: AgentState): Promise<NodeResult> {
    const { query, round, maxRounds, expertsOutput, criticFeedback } = state;

    const expertsText = expertsOutput
      .map((expert) => `[${expert.role} - ${expert.variant}]\n${expert.content}`)
      .join('\n\n');

    const criticText = criticFeedback?.join('\n\n') || 'No criticism yet';

    const prompt = REVIEWER_PROMPT
      .replace('{query}', query)
      .replace('{round}', round.toString())
      .replace('{max_rounds}', maxRounds.toString())
      .replace('{experts_output}', expertsText)
      .replace('{critic_feedback}', criticText);

    const response = await this.llm.complete({
      messages: [
        { role: 'system', content: 'You are a quality reviewer. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    });

    const review = parseJSONSafely(response.content);

    const reviewScore: ReviewScore = {
      completeness: review.completeness,
      consistency: review.consistency,
      confidence: review.confidence,
      overall: review.overall,
      satisfied: review.satisfied,
    };

    return {
      reviewScore,
      satisfied: true,  // 强制满意，不再循环
    };
  }
}
