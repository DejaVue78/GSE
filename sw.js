// GSE Service Worker: App-Hülle offline verfügbar machen.
// Bei einer neuen App-Version die Zahl hier erhöhen.
const CACHE = 'gse-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return; // Firebase-Verkehr nicht anfassen

  if (r.mode === 'navigate') {
    // Netz zuerst (damit Updates ankommen), bei schlechter Verbindung nach 3,5 s Cache.
    const net = fetch(r).then((res) => {
      const cp = res.clone();
      caches.open(CACHE).then((c) => c.put('index.html', cp));
      return res;
    });
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500));
    e.respondWith(
      Promise.race([net, timeout]).catch(() =>
        caches.match('index.html').then((m) => m || caches.match('./') || net)
      )
    );
    return;
  }

  e.respondWith(
    caches.match(r).then((m) =>
      m || fetch(r).then((res) => {
        if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); }
        return res;
      })
    )
  );
});
