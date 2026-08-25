// offline.js — IndexedDB cache + a sync queue for attempts made without a connection.
// The app must keep working with the network physically off; this is what makes that true.

const DB_NAME = 'tamyr';
// Bumped to 2 when data_cache was added — onupgradeneeded only fires on a
// version increase, so anyone with an existing v1 database (from before this
// pass) would silently never get the new store without this bump.
const DB_VERSION = 2;
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('ai_cache')) db.createObjectStore('ai_cache');
      if (!db.objectStoreNames.contains('sync_queue')) db.createObjectStore('sync_queue', { keyPath: 'localId', autoIncrement: true });
      if (!db.objectStoreNames.contains('data_cache')) db.createObjectStore('data_cache');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(storeName, mode) {
  const db = await openDb();
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function cacheGet(key) {
  try {
    const store = await tx('ai_cache', 'readonly');
    return await new Promise((res, rej) => { const r = store.get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); });
  } catch { return null; }
}
export async function cacheSet(key, value) {
  try {
    const store = await tx('ai_cache', 'readwrite');
    store.put(value, key);
  } catch { /* cache is best-effort */ }
}

// ---------- generic read-through cache for real-mode Supabase reads ----------
// The real (non-demo) data path has no fallback of its own — a bare fetch
// that just throws when offline. This makes db.js's real-mode reads resilient
// the same way ai.js already is: try the network, and if that fails, serve
// whatever was last cached instead of breaking the screen entirely.
export async function cacheData(key, value) {
  try { (await tx('data_cache', 'readwrite')).put(value, key); } catch {}
}
export async function getCachedData(key) {
  try {
    const store = await tx('data_cache', 'readonly');
    return await new Promise((res) => { const r = store.get(key); r.onsuccess = () => res(r.result ?? null); r.onerror = () => res(null); });
  } catch { return null; }
}
/** Fetch fresh over the network and cache it; on failure (offline, timeout,
 *  RLS hiccup) fall back to the last cached value for that key if there is one. */
export async function readThrough(key, fetchFn) {
  try {
    const fresh = await fetchFn();
    cacheData(key, fresh);
    return fresh;
  } catch (err) {
    const cached = await getCachedData(key);
    if (cached !== null) return cached;
    throw err;
  }
}

// ---------- sync queue ----------
/** @returns true if the answer was safely parked, false if storage refused it. */
export async function queueAttempt(row) {
  // Callers use this as their last resort when the network already failed, so
  // it must not throw on top of that — an unhandled rejection here left the
  // answer silently doing nothing at all.
  try {
    const store = await tx('sync_queue', 'readwrite');
    store.add({ ...row, queuedAt: Date.now() });
    notifyQueueChange();
    return true;
  } catch { return false; }
}

export async function queueLength() {
  try {
    const store = await tx('sync_queue', 'readonly');
    return await new Promise((res) => { const r = store.count(); r.onsuccess = () => res(r.result); r.onerror = () => res(0); });
  } catch { return 0; }
}

export async function flushQueue(sendFn) {
  let all;
  try {
    const store = await tx('sync_queue', 'readwrite');
    all = await new Promise((res) => { const r = store.getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); });
  } catch { return; }
  for (const row of all) {
    try {
      await sendFn(row);
      const del = await tx('sync_queue', 'readwrite');
      del.delete(row.localId);
    } catch { /* stop on first failure, retry next time we're online */ break; }
  }
  notifyQueueChange();
}

const listeners = new Set();
export function onQueueChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
async function notifyQueueChange() { const n = await queueLength(); listeners.forEach(fn => fn(n)); }

export function initOfflineSync(sendFn) {
  const flush = () => { flushQueue(sendFn).catch(() => { /* retried on next online event */ }); };
  window.addEventListener('online', flush);
  if (navigator.onLine) flush();
}
