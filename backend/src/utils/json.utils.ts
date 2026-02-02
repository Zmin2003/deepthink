export function parseJSONSafely(content: string): any {
  try {
    // 移除可能的 markdown 代码块
    let cleaned = content.trim();
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // 尝试解析
    return JSON.parse(cleaned);
  } catch (error) {
    // 如果解析失败，尝试修复常见问题
    try {
      let fixed = content.trim();

      // 移除 markdown
      fixed = fixed.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // 尝试找到第一个 { 和最后一个 }
      const firstBrace = fixed.indexOf('{');
      const lastBrace = fixed.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1) {
        fixed = fixed.substring(firstBrace, lastBrace + 1);
      }

      return JSON.parse(fixed);
    } catch (secondError) {
      throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
    }
  }
}

export function retryAsync<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  return fn().catch((error) => {
    if (retries <= 0) {
      throw error;
    }
    return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
      retryAsync(fn, retries - 1, delay)
    );
  });
}
