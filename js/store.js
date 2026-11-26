'use strict';
/* =====================================================================
   store.js - persistent storage
   IndexedDB (large, reliable) with automatic fallback to localStorage.
   Object stores:  docs   - documents in the browser library
                   snaps  - version history / restore points
                   drafts - unsaved drawing draft (crash recovery)
   Every record has a string `id`.
   ===================================================================== */
const Store = (() => {
  const NAMES = ['docs', 'snaps', 'drafts'];
  const mem = { docs: {}, snaps: {}, drafts: {} };
  let db = null, mode = 'mem';

  const lsKey = n => 'ds2.' + n;
  function lsLoad(n) { try { return JSON.parse(localStorage.getItem(lsKey(n)) || '{}'); } catch (_) { return {}; } }
  function lsSave(n) { try { localStorage.setItem(lsKey(n), JSON.stringify(mem[n])); return true; } catch (_) { return false; } }

  function openDB() {
    return new Promise(res => {
      if (typeof indexedDB === 'undefined' || !indexedDB) { res(null); return; }
      let r;
      try { r = indexedDB.open('docstudio', 1); } catch (_) { res(null); return; }
      r.onupgradeneeded = () => {
        NAMES.forEach(n => { if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: 'id' }); });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
    });
  }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const done = t => new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('aborted'));
  });

  async function init() {
    db = await openDB();
    if (db) { mode = 'idb'; return mode; }
    NAMES.forEach(n => { mem[n] = lsLoad(n); });
    mode = 'ls';
    return mode;
  }
  async function all(n) {
    if (mode === 'idb') return req(db.transaction(n, 'readonly').objectStore(n).getAll());
    return Object.keys(mem[n]).map(k => mem[n][k]);
  }
  async function get(n, id) {
    if (mode === 'idb') { const r = await req(db.transaction(n, 'readonly').objectStore(n).get(id)); return r || null; }
    return mem[n][id] || null;
  }
  async function put(n, o) {
    if (mode === 'idb') { const t = db.transaction(n, 'readwrite'); t.objectStore(n).put(o); return done(t); }
    mem[n][o.id] = o;
    if (!lsSave(n)) { delete mem[n][o.id]; throw new Error('Storage is full'); }
  }
  async function del(n, id) {
    if (mode === 'idb') { const t = db.transaction(n, 'readwrite'); t.objectStore(n).delete(id); return done(t); }
    delete mem[n][id];
    lsSave(n);
  }
  return { init, all, get, put, del, get mode() { return mode; } };
})();
