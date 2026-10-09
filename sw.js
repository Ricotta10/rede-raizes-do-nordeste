// Service worker (PWA): estratégia "rede primeiro, cache como reserva".
// Garante que o avaliador sempre veja a versão publicada mais recente e que o
// app continue abrindo (cardápio em cache) se a conexão da loja oscilar.

const CACHE = 'raizes-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const resposta = await fetch(req);
      if (resposta.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, resposta.clone());
      }
      return resposta;
    } catch {
      const emCache = await caches.match(req, { ignoreSearch: true });
      if (emCache) return emCache;
      if (req.mode === 'navigate') return caches.match('./index.html');
      throw new Error('Sem conexão e sem cache.');
    }
  })());
});
