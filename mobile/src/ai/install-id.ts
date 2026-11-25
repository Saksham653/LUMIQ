import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';

const INSTALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let cached: string | null = null;

// A random id for this copy of the app, used only to count the free daily
// questions. It is not linked to any account, name or phone number, and the
// server stores only a hash of it.
export function installId(): string {
  if (cached) return cached;
  const file = new File(Paths.document, 'lumiq-install-id.txt');
  try {
    const saved = file.exists ? file.textSync().trim() : '';
    if (INSTALL_ID.test(saved)) return (cached = saved);
  } catch {
    // Unreadable: make a new one below.
  }
  const id = randomUUID();
  // Written synchronously, as settings are (utils/settings-file.ts): `write()`
  // is asynchronous, so its failure would escape this try and an app closed
  // straight after could lose the id, giving the phone a new one (and a fresh
  // count of free questions) on its next start.
  try {
    if (!file.exists) file.create();
    file.writeSync(id);
  } catch (error) {
    console.warn('LUMIQ: could not save the install id', error);
  }
  return (cached = id);
}
