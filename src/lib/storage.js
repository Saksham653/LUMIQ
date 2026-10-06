// Minimal promise wrapper over IndexedDB: one database, one
// key-value store, no runtime dependency. Every operation rejects on
// failure (private browsing, blocked storage, full disk) and callers
// decide how to degrade — the app keeps working without saving.

const DB_NAME = "lumiq";
const STORE = "kv";

function openDb() {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open(DB_NAME, 1);
    } catch (e) {
      reject(e);
      return;
    }
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB unavailable"));
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
}

async function withStore(mode, run) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  } finally {
    db.close();
  }
}

export const storageGet = (key) => withStore("readonly", (s) => s.get(key));
export const storageSet = (key, value) => withStore("readwrite", (s) => s.put(value, key));
export const storageDelete = (key) => withStore("readwrite", (s) => s.delete(key));
export const storageClear = () => withStore("readwrite", (s) => s.clear());
export const storageKeys = () => withStore("readonly", (s) => s.getAllKeys());
