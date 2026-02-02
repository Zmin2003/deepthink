import type { BaseLLMProvider } from '../../llm/BaseLLMProvider.js';
import type { AgentState, NodeResult } from '../../../models/AgentState.js';
import { SYNTHESIZER_PROMPT, SYNTHESIZER_STRUCTURED_PROMPT } from '../../../prompts/synthesizer.prompts.js';
import { parseJSONSafely } from '../../../utils/json.utils.js';

export class SynthesizerNode {
  constructor(private llm: BaseLLMProvider) {}

  async execute(state: AgentState): Promise<NodeResult> {
    const { query, context, expertsOutput } = state;

    const expertsText = expertsOutput
      .map((expert) => `[${expert.role} - ${expert.variant}]\nThoughts: ${expert.thoughts}\nAnalysis: ${expert.content}`)
      .join('\n\n');

    const prompt = SYNTHESIZER_PROMPT
      .replace('{query}', query)
      .replace('{context}', context || '')
      .replace('{experts_output}', expertsText);

    const response = await this.llm.complete({
      messages: [
        { role: 'system', content: 'You are a synthesis expert.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    // 解析 thoughts 和 final response
    const thoughtsMatch = response.content.match(/<thoughts>(.*?)<\/thoughts>/s);
    const synthesisThoughts = thoughtsMatch ? thoughtsMatch[1].trim() : '';

    // 移除 thoughts 标签，获取最终输出
    const finalOutput = response.content.replace(/<thoughts>.*?<\/thoughts>/s, '').trim();

    // 尝试生成结构化输出
    let structuredOutput = null;
    try {
      const structuredPrompt = `${SYNTHESIZER_STRUCTURED_PROMPT}\n\nBased on this synthesis:\n${finalOutput}`;
      const structuredResponse = await this.llm.complete({
        messages: [
          { role: 'system', content: 'Respond only with valid JSON.' },
          { role: 'user', content: structuredPrompt },
        ],
        temperature: 0.5,
      });
      structuredOutput = parseJSONSafely(structuredResponse.content);
    } catch (error) {
      // 如果结构化输出失败，继续使用文本输出
      console.error('Failed to generate structured output:', error);
    }

    return {
      synthesisThoughts,
      finalOutput,
      structuredOutput,
      endTime: Date.now(),
    };
  }
}
