/* =====================================================================
 * NUVEM — guarda tudo no Google Drive da construtora (servidor em servidor/Codigo.gs)
 * O app continua gravando primeiro no aparelho (funciona sem sinal) e mantém
 * uma fila do que falta enviar. Com internet: envia a fila e baixa o que
 * mudou em outros aparelhos. Vale sempre a alteração mais recente.
 * ===================================================================== */
const LOJAS_REG = ['obras', 'rdos', 'config'], LOJAS_ARQ = ['fotos', 'docs'];

const Nuvem = {
  cfg: null,              // { url, codigo, nome, desde }
  fila: {},               // 'loja|chave' -> { loja, chave, v }
  rodando: false, estado: 'desligada', erro: '', ultimaOk: 0, baixando: 0,
  _falhas: {},            // arquivos que ainda não estão no servidor (tenta de novo depois)

  carregar() {
    return Promise.all([Banco.ler('config', 'nuvem'), Banco.ler('config', 'fila')]).then(([c, f]) => {
      this.cfg = c || null; this.fila = f || {};
      Banco.aoMudar = (loja, k) => this.marcar(loja, k);
      if (this.ativa()) this.estado = 'ok';
    });
  },
  ativa() { return !!(this.cfg && this.cfg.url && this.cfg.codigo); },
  pendentes() { return Object.keys(this.fila).length; },

  /* ---------- fila ---------- */
  marcar(loja, chave) {
    if (!this.ativa()) return;
    if (loja === 'config' && chave !== 'geral') return;
    if (String(chave).indexOf('__') === 0) return;                       // testes internos
    if (LOJAS_REG.indexOf(loja) < 0 && LOJAS_ARQ.indexOf(loja) < 0) return;
    const k = loja + '|' + chave, ant = this.fila[k];
    this.fila[k] = { loja, chave, v: (ant ? ant.v : 0) + 1 };
    this._gravarFila(); this.agendar(4000); this.mostrar();
  },
  _gravarFila() { clearTimeout(this._tf); this._tf = setTimeout(() => Banco.gravar('config', 'fila', this.fila, true), 300); },
  marcarTudo() {
    return Promise.all(LOJAS_REG.concat(LOJAS_ARQ).map(l => Banco.chaves(l).then(ks => ks.forEach(k => {
      if (l === 'config' && k !== 'geral') return;
      if (String(k).indexOf('__') === 0) return;
      const id = l + '|' + k; this.fila[id] = { loja: l, chave: k, v: 1 };
    })))).then(() => this._gravarFila());
  },
  agendar(ms) { clearTimeout(this._ta); this._ta = setTimeout(() => this.sincronizar(), ms || 0); },

  /* ---------- conversa com o servidor ---------- */
  chamar(acao, extra) {
    const corpo = JSON.stringify(Object.assign({ codigo: this.cfg.codigo, nome: this.cfg.nome || '', acao }, extra || {}));
    const ctl = window.AbortController ? new AbortController() : null;
    const tempo = setTimeout(() => ctl && ctl.abort(), 90000);
    // corpo como texto simples: o Google aceita sem pedir permissão extra (CORS)
    return fetch(this.cfg.url, { method: 'POST', body: corpo, redirect: 'follow', signal: ctl ? ctl.signal : undefined })
      .then(r => r.text())
      .then(t => { let j; try { j = JSON.parse(t); } catch (e) { throw new Error('O servidor não respondeu direito. Confira o endereço.'); } if (!j.ok) throw new Error(j.erro || 'erro no servidor'); return j; })
      .finally(() => clearTimeout(tempo));
  },

  sincronizar() {
    if (!this.ativa() || this.rodando) return Promise.resolve();
    if (!navigator.onLine) { this.estado = 'offline'; this.mostrar(); return Promise.resolve(); }
    this.rodando = true; this.estado = 'enviando'; this.erro = ''; this.mostrar();
    let mudou = false;
    return this.enviar()
      .then(() => this.receber()).then(m => { mudou = m; })
      .then(() => this.baixarArquivos())
      .then(() => { this.estado = this.pendentes() ? 'pendente' : 'ok'; this.ultimaOk = Date.now(); })
      .catch(e => { this.estado = navigator.onLine ? 'erro' : 'offline'; this.erro = e.message || String(e); })
      .finally(() => {
        this.rodando = false; this.mostrar();
        if (mudou) this.redesenhar();
        if (this.pendentes() && this.estado !== 'erro' && this.estado !== 'offline') this.agendar(3000);
      });
  },

  /* envia a fila: registros em lotes, fotos e documentos um por um */
  enviar() {
    const itens = Object.keys(this.fila).map(k => Object.assign({ k }, this.fila[k]));
    const regs = itens.filter(i => LOJAS_REG.indexOf(i.loja) >= 0), arqs = itens.filter(i => LOJAS_ARQ.indexOf(i.loja) >= 0);
    const tirar = lista => { lista.forEach(i => { if (this.fila[i.k] && this.fila[i.k].v === i.v) delete this.fila[i.k]; }); this._gravarFila(); this.mostrar(); };
    let p = Promise.resolve();
    for (let n = 0; n < regs.length; n += 10) {
      const lote = regs.slice(n, n + 10);
      p = p.then(() => Promise.all(lote.map(i => Banco.ler(i.loja, i.chave).then(v => v === undefined || v === null
        ? { loja: i.loja, chave: i.chave, apagado: true, atualizadoEm: new Date().toISOString() }
        : { loja: i.loja, chave: i.chave, dados: v, atualizadoEm: v.atualizadoEm || new Date().toISOString() }))))
        .then(dados => this.chamar('salvar', { itens: dados })).then(() => tirar(lote));
    }
    arqs.forEach(i => { p = p.then(() => this.enviarArquivo(i)).then(ok => { if (ok) tirar([i]); }); });
    return p;
  },
  enviarArquivo(i) {
    return Banco.ler(i.loja, i.chave).then(x => {
      if (!x || !x.blob) return true;                    // apagado aqui: o arquivo fica guardado no Drive
      let obraId, obraNome, extra;
      if (i.loja === 'fotos') { obraId = x.obraId; extra = { data: x.data }; }
      else { const o = App.obras.find(o => (o.docs || []).some(d => d.id === i.chave)); if (!o) return true; obraId = o.id; extra = { nomeArq: x.nome }; }
      const o = obraPor(obraId); obraNome = o ? o.nome : '';
      return blobParaUrl(x.blob).then(u => this.chamar(i.loja === 'fotos' ? 'foto_enviar' : 'doc_enviar', Object.assign({
        id: i.chave, obraId, obraNome, mime: x.blob.type || x.tipo || '', base64: String(u).split(',')[1] || '' }, extra))).then(() => true);
    });
  },

  /* baixa o que mudou em outros aparelhos */
  receber() {
    let desde = (this.cfg && this.cfg.desde) || 0, mudou = false;
    const pagina = () => this.chamar('mudancas', { desde, limite: 60 }).then(j => {
      return j.itens.reduce((p, it) => p.then(() => this.aplicar(it)).then(m => { if (m) mudou = true; }), Promise.resolve()).then(() => {
        if (j.mais && j.cursor > desde) { desde = j.cursor; return pagina(); }
        // volta 5 minutos: a busca do Drive às vezes demora a enxergar alterações recentes
        this.cfg.desde = Math.max(desde, Math.min(j.itens.length ? j.cursor : desde, j.agora - 5 * 60000));
        return Banco.gravar('config', 'nuvem', this.cfg, true);
      });
    });
    return pagina().then(() => mudou);
  },
  aplicar(it) {
    if (LOJAS_REG.indexOf(it.loja) < 0) return Promise.resolve(false);
    if (it.loja === 'config' && it.chave !== 'geral') return Promise.resolve(false);
    if (this.fila[it.loja + '|' + it.chave]) return Promise.resolve(false);   // tem alteração daqui esperando envio
    return Banco.ler(it.loja, it.chave).then(local => {
      const tl = (local && local.atualizadoEm) || '', tr = it.atualizadoEm || '';
      if (it.apagado) {
        if (!local || tl > tr) return false;
        return Banco.apagar(it.loja, it.chave, true).then(() => { this.noApp(it.loja, it.chave, null); return true; });
      }
      if (local && tl >= tr) return false;
      return Banco.gravar(it.loja, it.chave, it.dados, true).then(() => { this.noApp(it.loja, it.chave, it.dados); return true; });
    });
  },
  noApp(loja, chave, v) {
    if (loja === 'config') { if (v) App.config = v; }
    else if (loja === 'obras') {
      App.obras = App.obras.filter(o => o.id !== chave);
      if (v) App.obras.push(v);
    } else if (loja === 'rdos') { if (v) App.rdos[chave] = v; else delete App.rdos[chave]; }
  },

  /* fotos e documentos que existem em outro aparelho e faltam aqui (até 15 por vez) */
  baixarArquivos() {
    return Promise.all([Banco.chaves('fotos'), Banco.chaves('docs')]).then(([fs, ds]) => {
      const tem = new Set(fs.concat(ds)), falta = [], agora = Date.now();
      Object.values(App.rdos).forEach(r => (r.fotos || []).forEach(f => { if (!tem.has(f.id)) falta.push(['fotos', f.id, r.obraId, r.data]); }));
      App.obras.forEach(o => (o.docs || []).forEach(d => { if (!tem.has(d.id)) falta.push(['docs', d.id, o.id, d]); }));
      const fila = falta.filter(x => !(this._falhas[x[1]] > agora)).sort((a, b) => String(b[3]).localeCompare(String(a[3]))).slice(0, 15);
      this.baixando = fila.length; this.mostrar();
      return fila.reduce((p, x) => p.then(() => this.baixarArquivo(x[0], x[1], x[2], x[3]).catch(() => { this._falhas[x[1]] = Date.now() + 10 * 60000; })), Promise.resolve())
        .then(() => { this.baixando = 0; if (fila.length) { carregarMiniaturas(); if (falta.length > fila.length) this.agendar(2000); } });
    });
  },
  baixarArquivo(loja, id, obraId, extra) {
    return this.chamar(loja === 'fotos' ? 'foto_baixar' : 'doc_baixar', { id, obraId }).then(j => {
      const bin = atob(j.base64), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const blob = new Blob([u], { type: j.mime || '' });
      const reg = loja === 'fotos' ? { id, obraId, data: extra, blob } : { id, nome: extra.nome, tipo: extra.tipo || j.mime, blob };
      return Banco.gravar(loja, id, reg, true).then(() => blob);
    });
  },

  /* ---------- aparência ---------- */
  texto() {
    if (!this.ativa()) return '';
    const n = this.pendentes();
    if (this.estado === 'offline') return 'Sem internet' + (n ? ' · ' + n + ' aguardando envio' : ' · salvo no aparelho');
    if (this.estado === 'erro') return 'Não sincronizou: ' + this.erro;
    if (this.rodando) return n ? 'Enviando… faltam ' + n : (this.baixando ? 'Baixando ' + this.baixando + ' arquivo(s)…' : 'Sincronizando…');
    if (n) return n + ' aguardando envio';
    return 'Tudo salvo na nuvem';
  },
  mostrar() {
    const s = document.getElementById('salvo');
    if (s && s.textContent && s.textContent !== 'Salvando…') s.textContent = this.curto();
    const el = document.getElementById('nuvemStatus'); if (!el) return;
    const t = this.texto(); el.textContent = t;
    el.className = 'nuvem-status ' + (this.estado === 'erro' ? 'e' : this.estado === 'offline' || this.pendentes() ? 'a' : 'o');
    el.hidden = !t;
  },
  /* versão curta para o canto do cabeçalho do dia */
  curto() {
    if (!this.ativa()) return 'Salvo ✓';
    if (this.estado === 'offline') return 'Sem internet · salvo no aparelho';
    if (this.estado === 'erro') return 'Salvo no aparelho · nuvem com erro';
    if (this.rodando || this.pendentes()) return 'Enviando…';
    return 'Salvo na nuvem ✓';
  },
  /* chegou coisa nova de outro aparelho: atualiza a tela se ninguém estiver digitando */
  redesenhar() {
    const foco = document.activeElement;
    if (foco && /INPUT|TEXTAREA/.test(foco.tagName)) { App.redesenharDepois = true; return; }
    if (document.getElementById('folha')) { App.redesenharDepois = true; return; }
    const y = scrollY; render(); scrollTo(0, y);
  },

  /* ---------- ligar / desligar ---------- */
  conectar(url, codigo, nome) {
    url = String(url || '').trim(); codigo = String(codigo || '').trim(); nome = String(nome || '').trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url))
      return Promise.reject(new Error('O endereço deve começar com https://script.google.com/'));
    if (!codigo) return Promise.reject(new Error('Informe o código da empresa'));
    if (!nome) return Promise.reject(new Error('Informe seu nome'));
    const ant = this.cfg; this.cfg = { url, codigo, nome, desde: 0 };
    return this.chamar('ping').then(j => Banco.gravar('config', 'nuvem', this.cfg, true).then(() => this.marcarTudo()).then(() => { this.estado = 'ok'; this.sincronizar(); return j; }))
      .catch(e => { this.cfg = ant; throw e; });
  },
  desconectar() { this.cfg = null; this.fila = {}; this.estado = 'desligada'; return Promise.all([Banco.apagar('config', 'nuvem', true), Banco.apagar('config', 'fila', true)]); },
  convite() {
    const dados = btoa(unescape(encodeURIComponent(JSON.stringify({ u: this.cfg.url, c: this.cfg.codigo }))));
    return location.origin + location.pathname + '#convite=' + dados;
  },
  lerConvite(hash) {
    try { const j = JSON.parse(decodeURIComponent(escape(atob(hash.replace(/^#convite=/, ''))))); return j && j.u && j.c ? j : null; } catch (e) { return null; }
  }
};

/* foto: do aparelho; se faltar, busca na nuvem */
function obterFotoBlob(id) {
  return Banco.ler('fotos', id).then(f => {
    if (f && f.blob) return f.blob;
    if (!Nuvem.ativa() || !navigator.onLine) return null;
    let dono = null;
    Object.values(App.rdos).some(r => (r.fotos || []).some(x => x.id === id) && (dono = r));
    if (!dono) return null;
    return Nuvem.baixarArquivo('fotos', id, dono.obraId, dono.data).catch(() => null);
  });
}

window.addEventListener('online', () => Nuvem.agendar(1000));
window.addEventListener('offline', () => { Nuvem.estado = 'offline'; Nuvem.mostrar(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) Nuvem.agendar(500); });
setInterval(() => { if (!document.hidden) Nuvem.sincronizar(); }, 60000);
