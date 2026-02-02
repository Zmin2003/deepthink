export const EXPERT_SYSTEM_PROMPT = `你是一位 {role}。{description}

请按以下格式提供你的分析：
<thoughts>你的内部推理过程</thoughts>
<response>你的专家意见和分析</response>

请全面而具体。运用你的专业知识提供有价值的见解。`;

export const EXPERT_USER_PROMPT = `上下文：{context}

查询：{query}

{additional_prompt}

请提供你的专家分析。`;
