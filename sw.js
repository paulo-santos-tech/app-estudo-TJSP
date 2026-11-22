const CACHE_NAME = 'tjsp2027-caderno-v5';

const APP_SHELL_ASSETS = [
  './',
  './manifest.webmanifest',
  './css/styles.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/main.js',
  './js/state.js',
  './js/storage.js',
  './js/data/lessons.js',
  './js/data/essays.js',
  './js/canvas/spen-canvas.js',
  './js/ai/gemini.js',
  './js/ai/knowledge-base.js',
  './js/ui/utils.js',
  './js/ui/lessons-view.js',
  './js/ui/redacao-view.js',
  './js/ui/calculadora-view.js',
  './js/ui/notebook-drawer.js',
  './js/ui/settings-modal.js',
  './js/ui/study-tools.js',
  './js/ui/analytics-modal.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Faz cache individualmente para evitar que um redirecionamento aborte toda a instalação do PWA
      await Promise.allSettled(
        APP_SHELL_ASSETS.map(async (url) => {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok && !res.redirected) {
            await cache.put(url, res);
          } else if (res.ok && res.redirected) {
            const cleanBody = await res.blob();
            await cache.put(url, new Response(cleanBody, {
              status: res.status,
              statusText: res.statusText,
              headers: res.headers
            }));
          }
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nunca cacheia chamadas à API do Gemini
  if (url.hostname === 'generativelanguage.googleapis.com') {
    return;
  }

  // Navegação de página (HTML principal)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./', clone));
          }
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // Assets locais: Cache-First com atualização em segundo plano
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.ok && !response.redirected) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  // CDNs (Tailwind, Google Fonts): Network-First com fallback para Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
