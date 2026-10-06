// The one Groq client: every AI call in the app goes through
// callGroq. Streams are read through the buffered SSE parser, a
// silent stream is cancelled after the timeout, and errors carry
// plain-words messages plus flags (aborted, timedOut, canRetry,
// status).

import { createStreamReader } from "../lib/streamReader.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const STREAM_TIMEOUT_MS = 30000;

// Plain-words messages for the errors users actually hit.
function groqErrorMessage(status, detail) {
  if (status === 401 || status === 403) {
    return "Groq rejected your API key (401). Open API Settings, check the key and try again.";
  }
  if (status === 429) {
    return "The Groq usage limit is reached (429). Wait a moment, then retry.";
  }
  return detail || `Groq API error (${status}).`;
}

// Streams a chat completion. Lines split across network chunks are
// buffered (createStreamReader), the request can be stopped from the
// UI via options.signal, and a stream that goes silent for 30 seconds
// is cancelled instead of hanging forever.
// Thrown errors carry flags: aborted (user pressed Stop), timedOut,
// canRetry, status.
export async function callGroq(apiKey, messages, onStream, { signal, temperature = 0.7 } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abortFromCaller, { once: true });
  }
  // The timer resets whenever data arrives, so it catches a stuck
  // connection or a stalled stream, not a healthy reply in progress.
  let timer = setTimeout(() => { timedOut = true; controller.abort(); }, STREAM_TIMEOUT_MS);
  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { timedOut = true; controller.abort(); }, STREAM_TIMEOUT_MS);
  };

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        max_tokens: 1024,
        temperature,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const err = await res.json();
        detail = err.error?.message || "";
      } catch { }
      const e = new Error(groqErrorMessage(res.status, detail));
      e.status = res.status;
      e.canRetry = res.status === 429 || res.status >= 500;
      throw e;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const sse = createStreamReader();
    let fullText = "";
    const emit = (deltas) => {
      for (const delta of deltas) {
        fullText += delta;
        onStream?.(fullText, delta);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      resetTimer();
      emit(sse.push(decoder.decode(value, { stream: true })));
      if (sse.finished) break;
    }
    emit(sse.push(decoder.decode()));
    emit(sse.flush());
    return fullText;
  } catch (err) {
    if (controller.signal.aborted) {
      if (timedOut) {
        const e = new Error("No reply from Groq for 30 seconds — the request was cancelled. Retry in a moment.");
        e.timedOut = true;
        e.canRetry = true;
        throw e;
      }
      const e = new Error("Stopped.");
      e.aborted = true;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", abortFromCaller);
  }
}
