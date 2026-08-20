// offline.js — IndexedDB cache + a sync queue for attempts made without a connection.
// The app must keep working with the network physically off; this is what makes that true.

const DB_NAME = 'tamyr';
const DB_VERSION = 1;
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('ai_cache')) db.createObjectStore('ai_cache');
      if (!db.objectStoreNames.contains('sync_queue')) db.createObjectStore('sync_queue', { keyPath: 'localId', autoIncrement: true });
      if (!db.objectStoreNames.contains('tasks_cache')) db.createObjectStore('tasks_cache');
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

export async function cacheTasks(nodeId, tasks) {
  try { (await tx('tasks_cache', 'readwrite')).put(tasks, nodeId); } catch {}
}
export async function getCachedTasks(nodeId) {
  try {
    const store = await tx('tasks_cache', 'readonly');
    return await new Promise((res) => { const r = store.get(nodeId); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  } catch { return null; }
}

// ---------- sync queue ----------
export async function queueAttempt(row) {
  const store = await tx('sync_queue', 'readwrite');
  store.add({ ...row, queuedAt: Date.now() });
  notifyQueueChange();
}

export async function queueLength() {
  try {
    const store = await tx('sync_queue', 'readonly');
    return await new Promise((res) => { const r = store.count(); r.onsuccess = () => res(r.result); r.onerror = () => res(0); });
  } catch { return 0; }
}

export async function flushQueue(sendFn) {
  const store = await tx('sync_queue', 'readwrite');
  const all = await new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
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
  window.addEventListener('online', () => flushQueue(sendFn));
  if (navigator.onLine) flushQueue(sendFn);
}
