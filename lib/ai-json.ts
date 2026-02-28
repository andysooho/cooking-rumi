function cleanText(input: string): string {
  return input
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function findJsonLikeChunks(input: string): string[] {
  const chunks: string[] = [];
  const objectMatches = input.match(/\{[\s\S]*\}/g) ?? [];
  const arrayMatches = input.match(/\[[\s\S]*\]/g) ?? [];
  chunks.push(...objectMatches, ...arrayMatches);
  return chunks.sort((a, b) => b.length - a.length);
}

export function parseModelJson<T>(text: string): T {
  const cleaned = cleanText(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const candidates = findJsonLikeChunks(cleaned);
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        continue;
      }
    }
    throw new Error("Model response did not contain valid JSON.");
  }
}

export function safeText(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }
  return input.trim();
}

