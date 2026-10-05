/* Guarda o app no aparelho para abrir sem internet. Os dados do diário não passam por aqui.
 * Tenta a internet primeiro (para pegar a versão nova); se não responder em 3 s — sinal fraco no
 * canteiro — abre a cópia guardada e a versão nova fica para a próxima abertura. */
const VERSAO = 'diario-obras-v3-003';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icone.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const daRede = fetch(e.request).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(x => x.put(e.request, c)); }
    return r;
  });
  const guardado = () => caches.match(e.request).then(r => r || caches.match('./index.html'));
  e.waitUntil(daRede.catch(() => {}));
  e.respondWith(new Promise(ok => {
    let feito = false;
    const usar = r => { if (!feito && r) { feito = true; ok(r); } };
    const espera = setTimeout(() => guardado().then(usar), 3000);
    daRede.then(r => { clearTimeout(espera); usar(r); })
      .catch(() => { clearTimeout(espera); guardado().then(r => r ? usar(r) : usar(Response.error())); });
  }));
});
