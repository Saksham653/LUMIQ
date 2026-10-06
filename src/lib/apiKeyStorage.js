// The API key lives in memory for the session. It is written to
// localStorage only when the user ticks "Remember on this device",
// and it is never baked into the build.

const API_KEY_STORAGE = "lumiq_groq_api_key";

export function readStoredApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function writeStoredApiKey(key, remember) {
  try {
    if (remember && key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // Storage unavailable (private mode, blocked) — the key simply
    // stays in memory for this session.
  }
}
