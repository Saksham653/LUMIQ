// Where LUMIQ's built-in AI lives: the lumiq-ask Supabase Edge Function
// (supabase/functions/lumiq-ask in this repo) in the "lumiq" project. Both
// values are public by design, since they ship inside the app: the
// publishable key only identifies the app. The Groq key and the project's
// secret keys stay on the server. With either value empty, Ask explains that
// the AI is not switched on yet.
export const ASK_URL: string = 'https://xuiqswtzvcsxqccgqoqk.supabase.co/functions/v1/lumiq-ask';
export const ASK_PUBLIC_KEY: string = 'sb_publishable_Kod6w9x1s3w2rSMGyoiP7g_P2ammxv7';
