'use strict';
/* =====================================================================
 * BASE — utilitários, ícones e banco local (IndexedDB)
 * ===================================================================== */

const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const isoDe = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hojeIso = () => isoDe(new Date());
const dataDe = iso => { const p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
const br = iso => { if (!iso) return '—'; const p = String(iso).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
const somaDias = (iso, n) => { const d = dataDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };
const difDias = (a, b) => Math.round((dataDe(b) - dataDe(a)) / 86400000);
const SEMANA = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const extenso = iso => { const d = dataDe(iso); return SEMANA[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()]; };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const mb = n => (n / 1048576).toFixed(n < 10485760 ? 1 : 0).replace('.', ',') + ' MB';

/* ---- ícones (traço, 24px) ---- */
const P = {
  voltar:'<path d="M15 18l-6-6 6-6"/>',
  config:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  mais:'<path d="M12 5v14M5 12h14"/>',
  ok:'<path d="M20 6L9 17l-5-5"/>',
  x:'<path d="M18 6L6 18M6 6l12 12"/>',
  sol:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  nuvem:'<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
  chuva:'<path d="M16 13v8M8 13v8M12 15v8"/><path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/>',
  tempestade:'<path d="M19 16.9A5 5 0 0 0 18 7h-1.3a8 8 0 1 0-11.7 9"/><path d="M13 11l-4 6h6l-4 6"/>',
  pessoas:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  lista:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  caminhao:'<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  galeria:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  alerta:'<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  capacete:'<path d="M2 18h20M4 18v-3a8 8 0 0 1 16 0v3"/><path d="M10 7V5a2 2 0 0 1 4 0v2"/>',
  caixa:'<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/>',
  visita:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  texto:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  caneta:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  relogio:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  copiar:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  pdf:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h6M9 11h2"/>',
  planilha:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  baixar:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  subir:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  mic:'<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>',
  local:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  predio:'<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>',
  grafico:'<path d="M18 20V10M12 20V4M6 20v-6"/>',
  calendario:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clipe:'<path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  escudo:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  lixo:'<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  editar:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  seta:'<path d="M9 18l6-6-6-6"/>'
};
const ic = (n, cls) => '<svg class="' + (cls || '') + '" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>';

/* =====================================================================
 * BANCO LOCAL
 * Lojas: config (chave única), obras, rdos (obraId|data), fotos, docs.
 * Fotos e documentos guardados como Blob (menor que base64).
 * Se o IndexedDB faltar, roda em memória e avisa.
 * ===================================================================== */
const Banco = {
  db: null, motor: 'memoria', mem: { config:{}, obras:{}, rdos:{}, fotos:{}, docs:{} },

  abrir() {
    return new Promise(res => {
      let req;
      try { req = indexedDB.open('diario-obras-v2', 1); } catch (e) { return res(this); }
      req.onupgradeneeded = () => {
        const d = req.result;
        ['config','obras','rdos','fotos','docs'].forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); });
      };
      req.onsuccess = () => { this.db = req.result; this.motor = 'indexeddb'; res(this); };
      req.onerror = req.onblocked = () => res(this);
    }).then(() => {
      // pede ao navegador para não apagar estes dados quando faltar espaço
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
      return this;
    });
  },

  _op(loja, modo, fn) {
    if (!this.db) {
      const m = this.mem[loja];
      return Promise.resolve(fn({
        get: k => ({ result: m[k] }), put: (v, k) => { m[k] = v; }, delete: k => { delete m[k]; },
        getAll: () => ({ result: Object.values(m) }), getAllKeys: () => ({ result: Object.keys(m) }),
        clear: () => { for (const k in m) delete m[k]; }
      }, true));
    }
    return new Promise((res, rej) => {
      const t = this.db.transaction(loja, modo);
      const r = fn(t.objectStore(loja));
      t.oncomplete = () => res(r && r.result);
      t.onerror = t.onabort = () => rej(t.error || new Error('Falha ao gravar'));
    });
  },
  ler(loja, k) { return this._op(loja, 'readonly', s => s.get(k)).then(r => r && r.result !== undefined ? r.result : r); },
  /* semFila = true quando o dado veio da nuvem (não precisa ser enviado de volta) */
  gravar(loja, k, v, semFila) { return this._op(loja, 'readwrite', s => { s.put(v, k); }).then(r => { if (!semFila && this.aoMudar) this.aoMudar(loja, k); return r; }); },
  apagar(loja, k, semFila) { return this._op(loja, 'readwrite', s => { s.delete(k); }).then(r => { if (!semFila && this.aoMudar) this.aoMudar(loja, k, true); return r; }); },
  todos(loja) { return this._op(loja, 'readonly', s => s.getAll()).then(r => (r && r.result) || r || []); },
  chaves(loja) { return this._op(loja, 'readonly', s => s.getAllKeys()).then(r => (r && r.result) || r || []); },
  limpar(loja) { return this._op(loja, 'readwrite', s => { s.clear(); }); },
  espaco() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().then(e => ({ usado: e.usage || 0, total: e.quota || 0 })).catch(() => null);
  }
};

/* ---- leitura de arquivos e compressão de fotos ---- */
const lerComo = (arq, modo) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result); r.onerror = () => rej(r.error);
  modo === 'url' ? r.readAsDataURL(arq) : r.readAsArrayBuffer(arq);
});
const blobParaUrl = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const urlParaBlob = u => fetch(u).then(r => r.blob());

/* carimbo: texto escrito no canto da foto (data e hora), para valer como registro */
function comprimirFoto(arq, max, carimbo) {
  max = max || 1600;
  return lerComo(arq, 'url').then(url => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      if (Math.max(w, h) > max) { const f = max / Math.max(w, h); w = Math.round(w * f); h = Math.round(h * f); }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0, w, h);
      if (carimbo) {
        const fs = Math.max(14, Math.round(Math.min(w, h) * 0.035)), pad = Math.round(fs * 0.45);
        g.font = 'bold ' + fs + 'px Arial, sans-serif';
        const tw = g.measureText(carimbo).width;
        g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(w - tw - pad * 3, h - fs - pad * 3, tw + pad * 2, fs + pad * 2);
        g.fillStyle = '#ffd400'; g.textBaseline = 'top'; g.fillText(carimbo, w - tw - pad * 2, h - fs - pad * 2);
      }
      cv.toBlob(b => b ? res(b) : rej(new Error('Não foi possível processar a foto.')), 'image/jpeg', 0.78);
    };
    img.onerror = () => rej(new Error('Arquivo de imagem inválido.'));
    img.src = url;
  }));
}

/* ---- interface: toast, folha, confirmar ---- */
function toast(msg, ms) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms || 2200);
}
function abrirFolha(html, aoMontar) {
  fecharFolha();
  const f = document.createElement('div'); f.className = 'fundo'; f.id = 'folha';
  f.innerHTML = '<div class="folha" role="dialog" aria-modal="true"><div class="alca"></div>' + html + '</div>';
  f.addEventListener('click', e => { if (e.target === f) fecharFolha(); });
  document.body.appendChild(f);
  if (aoMontar) aoMontar(f);
  return f;
}
function fecharFolha() { const f = $('#folha'); if (f) f.remove(); }
function confirmar(titulo, texto, rotulo, perigo) {
  return new Promise(res => {
    abrirFolha('<h3>' + esc(titulo) + '</h3><p style="color:var(--tinta2);margin:0 0 16px">' + esc(texto) + '</p>' +
      '<div style="display:flex;gap:9px"><button class="btn sec" style="flex:1" data-r="0">Cancelar</button>' +
      '<button class="btn ' + (perigo ? 'pri' : 'verde') + '" style="flex:1" data-r="1">' + esc(rotulo || 'Confirmar') + '</button></div>',
      f => f.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { fecharFolha(); res(b.dataset.r === '1'); }));
  });
}
/* nome de arquivo sem acento nem símbolo (alguns aparelhos trocam nomes com acento por "download") */
const nomeArq = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'obra';
function baixarArquivo(nome, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
