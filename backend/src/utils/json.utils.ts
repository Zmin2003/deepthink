// Pre-compiled regexes for JSON cleanup
const MARKDOWN_JSON_RE = /```json\n?/g;
const MARKDOWN_CLOSE_RE = /```\n?/g;

export function parseJSONSafely(content: string): any {
  // Single pass: clean markdown fences, then attempt parse
  let cleaned = content.trim();
  cleaned = cleaned.replace(MARKDOWN_JSON_RE, '').replace(MARKDOWN_CLOSE_RE, '');

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // Fallback: extract the outermost { ... } block
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch {
        // fall through to throw
      }
    }

    throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
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
