/* Offline support: app files are cached on first visit and refreshed in the background.
   Bump VERSION when you publish a new release. */
const VERSION = 'docstudio-1.3.0';
const CORE = ['./', 'index.html', 'css/style.css', 'js/icons.js', 'js/store.js', 'js/symbols.js', 'js/symbols-pictos.js',
  'js/templates.js', 'js/core.js', 'js/studio.js', 'js/editor.js', 'js/files.js', 'js/ui.js', 'js/main.js', 'vendor/qrcode.js', 'manifest.webmanifest', 'icons/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return; /* fonts etc. go straight to the network */
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || new Response('Offline', { status: 503 });
  }));
});
