// LUMIQ's built-in AI for the phone app.
//
// The app builds each prompt with the same planner code as the web app:
// either the question plus a summary of the columns, or the calculation
// steps plus the result table. The file's rows are never sent. This function
// checks the request, counts it against the daily limits, adds the owner's
// Groq key and returns the reply text. Prompts are never logged or stored.
//
// Deploy with JWT verification off (the app sends the publishable key in
// the apikey header, which this code checks itself).
//
// Secrets (Dashboard > Edge Functions > Secrets):
//   GROQ_API_KEY                required: the owner's Groq key (also read
//                               as LUMIQ_GROQ_KEY, in any letter case)
//   GROQ_MODEL                  optional, default openai/gpt-oss-120b
//   DAILY_QUESTIONS_PER_DEVICE  optional, default 20
//   DAILY_QUESTIONS_TOTAL       optional, default 2000 (whole app, all phones)
//   LUMIQ_HASH_SALT             optional salt for hashing install ids

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Llama 3.3 70B (the web app's model) is now Enterprise-only on Groq;
// GPT-OSS 120B is the largest production model open to every account.
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const MAX_PROMPT_CHARS = 24_000;
// GPT-OSS reasons before answering and those tokens count here too, so the
// budget leaves room for a short answer after a short line of reasoning.
const MAX_TOKENS = 2048;
const GROQ_TIMEOUT_MS = 30_000;

// What each kind of call may contain: the opening line of the shared prompt
// builders (src/ai/oraclePlanner.js). Anything else is refused, so the
// function cannot be used as a general-purpose chatbot.
const PLAN_PREFIX = 'You turn a question about a data table into a JSON calculation plan.';
const ANSWER_PREFIX = "You are Oracle, LUMIQ's data analyst.";
const PURPOSES: Record<string, { prefix: string; question: boolean }> = {
  plan: { prefix: PLAN_PREFIX, question: true },
  'plan-retry': { prefix: PLAN_PREFIX, question: false },
  describe: { prefix: ANSWER_PREFIX, question: false },
  explain: { prefix: ANSWER_PREFIX, question: false },
};

const INSTALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type, x-lumiq-device',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function positiveInt(name: string, fallback: number): number {
  const value = Number(Deno.env.get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function keyValues(name: string): string[] {
  try {
    const parsed: unknown = JSON.parse(Deno.env.get(name) ?? '{}');
    return parsed && typeof parsed === 'object' ? Object.values(parsed).filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

// The publishable keys (and the legacy anon key) the app may send.
function publicKeys(): string[] {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  return [...keyValues('SUPABASE_PUBLISHABLE_KEYS'), ...(legacy ? [legacy] : [])];
}

// The project's secret key, used only to call the quota function.
function secretKey(): string | undefined {
  return keyValues('SUPABASE_SECRET_KEYS')[0] ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? undefined;
}

// The owner's Groq key, under either accepted secret name, any letter case
// (secret names are case-sensitive, and the dashboard keeps what was typed).
const GROQ_KEY_NAMES = ['groq_api_key', 'lumiq_groq_key'];
function groqApiKey(): string | undefined {
  const env = Deno.env.toObject();
  for (const wanted of GROQ_KEY_NAMES) {
    const name = Object.keys(env).find((key) => key.toLowerCase() === wanted);
    const value = name ? env[name]?.trim() : '';
    if (value) return value;
  }
  return undefined;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

type Quota = { allowed: boolean; reason?: string; questionsLeft: number };

async function takeQuota(installId: string, isQuestion: boolean, perDevice: number, total: number): Promise<Quota> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = secretKey();
  if (!url || !key) throw new Error('missing Supabase environment');
  const salt = Deno.env.get('LUMIQ_HASH_SALT') ?? url;
  const res = await fetch(`${url}/rest/v1/rpc/lumiq_take_ask_quota`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_device: await sha256Hex(`${salt}:${installId.toLowerCase()}`),
      p_is_question: isQuestion,
      p_device_questions: perDevice,
      p_total_questions: total,
    }),
  });
  if (!res.ok) throw new Error(`quota check failed (${res.status})`);
  return (await res.json()) as Quota;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const keys = publicKeys();
  if (keys.length > 0 && !keys.includes(req.headers.get('apikey') ?? '')) {
    return reply(401, { error: 'unauthorized' });
  }

  const installId = req.headers.get('x-lumiq-device') ?? '';
  const body = await req.json().catch(() => null);
  const purpose = PURPOSES[typeof body?.purpose === 'string' ? body.purpose : ''];
  const prompt = typeof body?.prompt === 'string' ? body.prompt : '';
  if (!INSTALL_ID.test(installId) || !purpose || !prompt.startsWith(purpose.prefix) || prompt.length > MAX_PROMPT_CHARS) {
    return reply(400, { error: 'bad_request' });
  }
  const temperature = typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1) : 0.7;

  const groqKey = groqApiKey();
  if (!groqKey) return reply(503, { error: 'not_configured' });

  const perDevice = positiveInt('DAILY_QUESTIONS_PER_DEVICE', 20);
  const total = positiveInt('DAILY_QUESTIONS_TOTAL', 2000);
  let quota: Quota;
  try {
    quota = await takeQuota(installId, purpose.question, perDevice, total);
  } catch (error) {
    console.error('lumiq-ask: quota check failed', error instanceof Error ? error.message : error);
    return reply(503, { error: 'unavailable' });
  }
  if (!quota.allowed) {
    return reply(429, { error: quota.reason ?? 'device_limit', questionsLeft: quota.questionsLeft, limit: perDevice });
  }

  const model = Deno.env.get('GROQ_MODEL') || DEFAULT_MODEL;
  // GPT-OSS: a little reasoning is enough for a plan or a few sentences, and
  // the reasoning text itself is not needed in the reply.
  const reasoning = model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low', include_reasoning: false } : {};

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: MAX_TOKENS,
        temperature,
        ...reasoning,
      }),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });
  } catch (error) {
    console.error('lumiq-ask: Groq request failed', error instanceof Error ? error.name : error);
    return reply(504, { error: 'busy' });
  }

  if (!res.ok) {
    // Groq's error code (e.g. model_not_found) helps the owner; no prompt text.
    const detail = await res.json().catch(() => null);
    console.error('lumiq-ask: Groq returned', res.status, detail?.error?.code ?? detail?.error?.type ?? '');
    if (res.status === 401 || res.status === 403) return reply(503, { error: 'not_configured' });
    if (res.status === 429 || res.status >= 500) return reply(503, { error: 'busy' });
    return reply(502, { error: 'ai_failed' });
  }

  const data = await res.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) return reply(502, { error: 'ai_failed' });
  return reply(200, { text, questionsLeft: quota.questionsLeft, limit: perDevice });
});
