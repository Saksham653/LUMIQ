// The browser preview's twin of install-id.ts. A browser has no app folder
// (expo-file-system is an empty stand-in there and throws), so the id is kept
// in the browser's own storage for this address (localStorage). Metro picks
// this file for the web and install-id.ts for Android and iOS: the two must
// keep the same exports.

const INSTALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Named after the phone's file, so the two are easy to match up.
const KEY = 'lumiq-install-id.txt';

let cached: string | null = null;

// A random version 4 id, made from the browser's own secure random bytes.
// Written out by hand because crypto.randomUUID is missing on a plain http
// address that is not localhost (the preview opened from another device on
// the same network), while getRandomValues is there everywhere.
function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (byte, at) => {
    // Bytes 6 and 8 carry the two marks of a version 4 id.
    const marked = at === 6 ? (byte & 0x0f) | 0x40 : at === 8 ? (byte & 0x3f) | 0x80 : byte;
    return marked.toString(16).padStart(2, '0');
  }).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// A random id for this copy of the app (in a browser: this browser at this
// address), used only to count the free daily questions. It is not linked to
// any account, name or phone number, and the server stores only a hash of it.
export function installId(): string {
  if (cached) return cached;
  try {
    const saved = (localStorage.getItem(KEY) ?? '').trim();
    if (INSTALL_ID.test(saved)) return (cached = saved);
  } catch {
    // Unreadable: make a new one below.
  }
  const id = newId();
  try {
    localStorage.setItem(KEY, id);
  } catch (error) {
    console.warn('LUMIQ: could not save the install id', error);
  }
  return (cached = id);
}
