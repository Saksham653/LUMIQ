// Every AI setting in one place. Switching to another provider with
// the same chat-completions format is a one-file change: edit the
// URL and model here (the client reads nothing else).

export const AI_CONFIG = Object.freeze({
  // OpenAI-compatible chat-completions endpoint
  apiUrl: "https://api.groq.com/openai/v1/chat/completions",
  model: "llama-3.3-70b-versatile",
  // A stream silent for this long is cancelled instead of hanging
  streamTimeoutMs: 30000,
  maxTokens: 1024,
  // Default sampling temperature; calls that need deterministic JSON
  // (filter plans, calculation plans) pass 0 explicitly.
  temperature: 0.7,
});
