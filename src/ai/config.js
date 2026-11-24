// Every AI setting in one place. Switching to another provider or
// model with the same chat-completions format is a one-file change:
// edit the URL, model and modelName here (the client reads nothing
// else, and the screens show modelName).

export const AI_CONFIG = Object.freeze({
  // OpenAI-compatible chat-completions endpoint
  apiUrl: "https://api.groq.com/openai/v1/chat/completions",
  // GPT-OSS 120B: the largest Groq model open to every account. The
  // model used before, Llama 3.3 70B, is now Enterprise-only on Groq
  // and answers ordinary keys with 404 (model not found).
  model: "openai/gpt-oss-120b",
  // The model's name as the screens show it ("Groq · GPT-OSS 120B")
  modelName: "GPT-OSS 120B",
  // A stream silent for this long is cancelled instead of hanging
  streamTimeoutMs: 30000,
  // Most tokens one reply may use. A reasoning model (GPT-OSS) spends
  // part of this on reasoning before it answers, so it is about twice
  // what the answers themselves need.
  maxCompletionTokens: 2048,
  // Reasoning models only: a little reasoning is enough for a plan or
  // a few sentences. The reasoning itself is never sent back; only
  // the answer streams in.
  reasoningEffort: "low",
  // Default sampling temperature; calls that need deterministic JSON
  // (filter plans, calculation plans) pass 0 explicitly.
  temperature: 0.7,
});
