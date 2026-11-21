/** Human-readable names for the models that write summaries. */
const NAMES: Record<string, string> = {
  "claude-haiku-5-5": "Claude Haiku 5.5",
};

export const modelName = (id?: string | null) => (id ? NAMES[id] ?? id : "AI");
