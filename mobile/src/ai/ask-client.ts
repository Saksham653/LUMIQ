import { ASK_PUBLIC_KEY, ASK_URL } from './config';
import { installId } from './install-id';

export type AskPurpose = 'plan' | 'plan-retry' | 'describe' | 'explain';
export type AskErrorCode = 'not_configured' | 'device_limit' | 'busy' | 'offline' | 'failed' | 'stopped';

// A failed AI call, with a code the Ask screen turns into plain words.
export class AskError extends Error {
  constructor(
    readonly code: AskErrorCode,
    readonly limit: number | null = null,
  ) {
    super(code);
  }
}

export type AskReply = { text: string; questionsLeft: number | null; limit: number | null };

const TIMEOUT_MS = 45_000;

const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

export function isAskConfigured(): boolean {
  return ASK_URL !== '' && ASK_PUBLIC_KEY !== '';
}

// Sends one prompt (built by the shared planner code: never the file's rows)
// to the lumiq-ask function and returns the reply text plus how many free
// questions this phone has left today.
export async function askAi(
  prompt: string,
  purpose: AskPurpose,
  { temperature, signal }: { temperature?: number; signal?: AbortSignal } = {},
): Promise<AskReply> {
  if (!isAskConfigured()) throw new AskError('not_configured');
  if (signal?.aborted) throw new AskError('stopped');

  const controller = new AbortController();
  const stop = () => controller.abort();
  signal?.addEventListener('abort', stop);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);

  try {
    let data: Record<string, unknown> | null = null;
    let status = 0;
    try {
      const res = await fetch(ASK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ASK_PUBLIC_KEY, 'x-lumiq-device': installId() },
        body: JSON.stringify({ purpose, prompt, temperature }),
        signal: controller.signal,
      });
      status = res.status;
      data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    } catch {
      if (signal?.aborted) throw new AskError('stopped');
      throw new AskError(timedOut ? 'busy' : 'offline');
    }

    if (status === 200 && typeof data?.text === 'string') {
      return { text: data.text, questionsLeft: asNumber(data.questionsLeft), limit: asNumber(data.limit) };
    }
    const code = data?.error;
    if (code === 'device_limit') throw new AskError('device_limit', asNumber(data?.limit));
    if (code === 'not_configured') throw new AskError('not_configured');
    if (status === 429 || status >= 500) throw new AskError('busy');
    throw new AskError('failed');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
  }
}
