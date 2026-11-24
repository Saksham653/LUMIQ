// callGroq against a fake Groq endpoint: the request carries what a
// GPT-OSS model needs (a completion budget that covers reasoning, low
// reasoning effort, no reasoning text in the reply), and a streamed
// GPT-OSS reply comes back as the answer text alone. Plan replies at
// temperature 0 still parse.

import { describe, it, expect, vi, afterEach } from "vitest";
import { callGroq, reasoningFields } from "./client.js";
import { AI_CONFIG } from "./config.js";
import { parsePlannerReply } from "./oraclePlanner.js";

const KEY = "gsk_test_placeholder_not_a_real_key";
const encoder = new TextEncoder();

// A reply streamed the way Groq sends GPT-OSS answers (an opening
// role chunk, answer deltas, a closing chunk with finish_reason, then
// [DONE]), cut into 13-byte network chunks that also split the
// three-byte U+202F.
function gptOssStream(answer) {
  const chunk = (delta, finishReason = null) =>
    `data: ${JSON.stringify({
      object: "chat.completion.chunk",
      model: AI_CONFIG.model,
      choices: [{ index: 0, delta, finish_reason: finishReason }],
    })}\n\n`;
  const sse =
    chunk({ role: "assistant", content: "" }) +
    answer.match(/.{1,7}/gs).map((content) => chunk({ content })).join("") +
    chunk({}, "stop") +
    "data: [DONE]\n\n";
  const bytes = encoder.encode(sse);
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 13) controller.enqueue(bytes.slice(i, i + 13));
      controller.close();
    },
  });
}

function fakeGroq(response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const sentBody = (fetchMock) => JSON.parse(fetchMock.mock.calls[0][1].body);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callGroq with GPT-OSS", () => {
  it("asks for GPT-OSS 120B with a 2048-token budget, low reasoning and no reasoning text", async () => {
    const fetchMock = fakeGroq(new Response(gptOssStream("Hi."), { status: 200 }));
    await callGroq(KEY, [{ role: "user", content: "Hello" }], null);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    const body = sentBody(fetchMock);
    expect(body).toMatchObject({
      model: "openai/gpt-oss-120b",
      stream: true,
      max_completion_tokens: 2048,
      temperature: 0.7,
      reasoning_effort: "low",
      include_reasoning: false,
    });
    expect(body).not.toHaveProperty("max_tokens");
    expect(body).not.toHaveProperty("reasoning_format");
  });

  it("streams back only the answer, with U+202F thousands intact", async () => {
    const answer = "March revenue was 780 000, the highest month.";
    fakeGroq(new Response(gptOssStream(answer), { status: 200 }));
    const seen = [];
    const text = await callGroq(KEY, [{ role: "user", content: "Q" }], (full) => seen.push(full));
    expect(text).toBe(answer);
    expect(seen.at(-1)).toBe(answer);
  });

  it("sends temperature 0 for a plan, and the streamed plan parses", async () => {
    const plan = {
      type: "plan",
      plan: { groupBy: ["region"], measures: [{ op: "sum", column: "revenue", as: "total_revenue" }] },
    };
    const reply = "```json\n" + JSON.stringify(plan) + "\n```";
    const fetchMock = fakeGroq(new Response(gptOssStream(reply), { status: 200 }));
    const text = await callGroq(KEY, [{ role: "user", content: "plan" }], null, { temperature: 0 });
    expect(sentBody(fetchMock).temperature).toBe(0);
    expect(parsePlannerReply(text)).toEqual({ kind: "plan", raw: plan.plan });
  });

  it("shows Groq's own words when the model is not open to the key (404)", async () => {
    const message = "The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.";
    fakeGroq(new Response(
      JSON.stringify({ error: { message, type: "invalid_request_error", code: "model_not_found" } }),
      { status: 404 },
    ));
    await expect(callGroq(KEY, [{ role: "user", content: "Q" }], null))
      .rejects.toMatchObject({ message, status: 404, canRetry: false });
  });
});

describe("reasoningFields", () => {
  it("adds reasoning settings for GPT-OSS models only", () => {
    const gptOss = { reasoning_effort: "low", include_reasoning: false };
    expect(reasoningFields("openai/gpt-oss-120b")).toEqual(gptOss);
    expect(reasoningFields("openai/gpt-oss-20b")).toEqual(gptOss);
    expect(reasoningFields("llama-3.1-8b-instant")).toEqual({});
  });
});
