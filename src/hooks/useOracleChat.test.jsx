// @vitest-environment jsdom
//
// B5-3: follow-up questions. With a mocked AI client we check that
// the second question's plan request carries the previous question,
// validated plan and steps — and never raw rows — and that New topic
// clears the context.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import React, { useState } from "react";

vi.mock("../ai/client.js", () => ({ callGroq: vi.fn() }));

import { callGroq } from "../ai/client.js";
import { useOracleChat } from "./useOracleChat.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

const api = {};

function Harness() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState([]);
  const oracle = useOracleChat({
    apiKey: "test-key-not-real",
    ds: SAMPLE_DATASETS.sales,
    oracleInput: input,
    setOracleInput: setInput,
    oracleLoading: loading,
    setOracleLoading: setLoading,
    setOracleMessages: setMessages,
    askContext: ctx,
    setAskContext: setCtx,
  });
  Object.assign(api, oracle, { messages, ctx });
  return null;
}

const PLAN_REPLY = '{"type":"plan","plan":{"groupBy":["region"],"measures":[{"op":"sum","column":"revenue","as":"total"}],"sort":{"by":"total","dir":"desc"}}}';

// One question = one plan call + one explain call.
const mockOneExchange = (answer) => {
  callGroq
    .mockImplementationOnce(async () => PLAN_REPLY)
    .mockImplementationOnce(async (_k, _m, onStream) => {
      onStream?.(answer);
      return answer;
    });
};

beforeEach(() => {
  callGroq.mockReset();
  render(<Harness />);
});
afterEach(cleanup);

describe("follow-up context (B5-3)", () => {
  it("the second plan request contains the previous plan and steps, and no rows", async () => {
    mockOneExchange("South leads with 1,331,000.");
    await act(async () => { await api.sendOracleMessage("total revenue by region"); });

    expect(api.ctx).toHaveLength(1);
    expect(api.ctx[0].plan.groupBy).toEqual(["region"]);

    mockOneExchange("Electronics leads.");
    await act(async () => { await api.sendOracleMessage("and by category?"); });

    const followUpPlanPrompt = callGroq.mock.calls[2][1][0].content;
    expect(followUpPlanPrompt).toContain("Earlier questions in this conversation");
    expect(followUpPlanPrompt).toContain('"total revenue by region"');
    expect(followUpPlanPrompt).toContain('"groupBy":["region"]'); // the validated previous plan
    expect(followUpPlanPrompt).toContain("Grouped by region");    // the plain-English steps
    expect(followUpPlanPrompt).toContain("MOST RECENT plan");
    // never raw rows: no row object and no cell-only value from the data
    expect(followUpPlanPrompt).not.toContain('"month"');
    expect(followUpPlanPrompt).not.toContain("245000"); // Jan's revenue cell (not in the summary)

    // the answer is marked as built on the previous question
    const lastProof = api.messages[api.messages.length - 1].proof;
    expect(lastProof.followUp).toBe(true);
  });

  it("the first question has no context section and is not a follow-up", async () => {
    mockOneExchange("South leads.");
    await act(async () => { await api.sendOracleMessage("total revenue by region"); });
    const planPrompt = callGroq.mock.calls[0][1][0].content;
    expect(planPrompt).not.toContain("Earlier questions in this conversation");
    expect(api.messages[api.messages.length - 1].proof.followUp).toBe(false);
  });

  it("New topic clears the context", async () => {
    mockOneExchange("South leads.");
    await act(async () => { await api.sendOracleMessage("total revenue by region"); });
    expect(api.ctx).toHaveLength(1);
    expect(api.contextActive).toBe(true);

    await act(async () => { api.clearContext(); });
    expect(api.ctx).toHaveLength(0);
    expect(api.contextActive).toBe(false);

    mockOneExchange("Fresh answer.");
    await act(async () => { await api.sendOracleMessage("average profit margin"); });
    const planPrompt = callGroq.mock.calls[2][1][0].content;
    expect(planPrompt).not.toContain("Earlier questions in this conversation");
  });

  it("the context keeps only the last 3 exchanges", async () => {
    for (let i = 0; i < 5; i++) {
      mockOneExchange(`answer ${i}`);
      await act(async () => { await api.sendOracleMessage(`question ${i}`); });
    }
    expect(api.ctx).toHaveLength(3);
    expect(api.ctx.map((c) => c.question)).toEqual(["question 2", "question 3", "question 4"]);
  });
});
