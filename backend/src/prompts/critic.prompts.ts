export const CRITIC_PROMPT = `你是一位批判性分析师。审查专家意见并识别：
1. 矛盾或不一致之处
2. 缺失的观点
3. 薄弱的论点
4. 需要改进的领域

查询：{query}
上下文：{context}

专家意见：
{experts_output}

以 JSON 格式提供建设性批评：
{
  "contradictions": ["矛盾列表"],
  "missing_perspectives": ["缺失的内容"],
  "weak_points": ["薄弱的论点"],
  "suggestions": ["改进建议"]
}`;
