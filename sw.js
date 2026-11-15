/**
 * Service Worker do .DEV — estratégia cache-first com lista explícita.
 *
 * REGRAS (docs/REGRAS.md):
 * - Todo arquivo novo do portal entra em ASSETS, e VERSION é incrementada.
 * - A lista explícita é proposital: ela documenta exatamente o que o portal é
 *   e torna o comportamento offline determinístico e auditável.
 */

const VERSION = 'dev-v5';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './src/js/app.js',
  './src/js/components/tool-json.js',
  './src/js/components/tool-cpf.js',
  './src/js/components/tool-regex.js',
  './src/js/components/tool-diff.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // cache: 'reload' ignora o cache HTTP do navegador: sem isso, logo após um
      // deploy o SW novo pode gravar cópias antigas (o Pages manda guardar por 10 min).
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      // Navegação para rota desconhecida offline → casca.
      if (request.mode === 'navigate') {
        return fetch(request).catch(() => caches.match('./index.html'));
      }
      return fetch(request);
    })
  );
});
