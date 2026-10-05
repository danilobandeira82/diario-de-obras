/* =====================================================================
 * NUVEM — guarda tudo no Google Drive da construtora (servidor em servidor/Codigo.gs)
 * O app continua gravando primeiro no aparelho (funciona sem sinal) e mantém
 * uma fila do que falta enviar. Com internet: envia a fila e baixa o que
 * mudou em outros aparelhos. Vale sempre a alteração mais recente.
 * ===================================================================== */
/* Endereço do servidor da construtora (Google Apps Script). Com ele aqui, basta abrir o site
 * e digitar o código da empresa e o nome — ninguém precisa colar endereço. */
const SERVIDOR_PADRAO = 'https://script.google.com/macros/s/AKfycbzglsnFluY1L-iIZfe3zFaIga_aBK1u4BoTHQCCOKVGArhSY1AMbOQgfDD2VN1B7ve6/exec';
const LOJAS_REG = ['obras', 'rdos', 'config'], LOJAS_ARQ = ['fotos', 'docs'];

const Nuvem = {
  cfg: null,              // { url, codigo, nome, desde }
  fila: {},               // 'loja|chave' -> { loja, chave, v }
  rodando: false, estado: 'desligada', erro: '', ultimaOk: 0, baixando: 0, difRelogio: 0,
  log: [],                // últimas conversas com o servidor (diagnóstico)
  _falhas: {},            // arquivos que ainda não estão no servidor (tenta de novo depois)

  carregar() {
    return Promise.all([Banco.ler('config', 'nuvem'), Banco.ler('config', 'fila'), Banco.ler('config', 'nuvemLog')]).then(([c, f, l]) => {
      this.cfg = c || null; this.fila = f || {}; this.log = Array.isArray(l) ? l : [];
      Banco.aoMudar = (loja, k, apagado) => this.marcar(loja, k, apagado);
      if (this.ativa()) { this.estado = 'pendente'; this.ultimaOk = this.cfg.ultimaOk || 0; }
    });
  },
  ativa() { return !!(this.cfg && this.cfg.url && this.cfg.codigo); },
  pendentes() { return Object.keys(this.fila).length; },

  /* ---------- fila ---------- */
  /* apagado = true só quando o registro foi apagado de verdade neste aparelho */
  marcar(loja, chave, apagado) {
    if (!this.ativa()) return;
    if (loja === 'config' && chave !== 'geral') return;
    if (String(chave).indexOf('__') === 0) return;                       // testes internos
    if (LOJAS_REG.indexOf(loja) < 0 && LOJAS_ARQ.indexOf(loja) < 0) return;
    const k = loja + '|' + chave, ant = this.fila[k];
    this.fila[k] = { loja, chave, v: (ant ? ant.v : 0) + 1, apagado: !!apagado };
    this._gravarFila(); this.agendar(4000); this.mostrar();
  },
  _gravarFila() { return Banco.gravar('config', 'fila', this.fila, true); },     // na hora: se fechar o app, nada fica para trás
  marcarTudo() {
    return Promise.all(LOJAS_REG.concat(LOJAS_ARQ).map(l => Banco.chaves(l).then(ks => ks.forEach(k => {
      if (l === 'config' && k !== 'geral') return;
      if (String(k).indexOf('__') === 0) return;
      const id = l + '|' + k; this.fila[id] = { loja: l, chave: k, v: 1 };
    })))).then(() => this._gravarFila());
  },
  agendar(ms) { clearTimeout(this._ta); this._ta = setTimeout(() => this.sincronizar(), ms || 0); },

  /* ---------- "base": cópia da última versão que este aparelho recebeu ou enviou de cada registro.
   * Serve para mesclar campo a campo quando outro aparelho alterou o mesmo registro. ---------- */
  lerBase(loja, chave) { return Banco.ler('config', 'base|' + loja + '|' + chave).then(b => b || null); },
  gravarBase(loja, chave, dados) { return Banco.gravar('config', 'base|' + loja + '|' + chave, dados || null, true); },

  /* ---------- conversa com o servidor ---------- */
  chamar(acao, extra) {
    const corpo = JSON.stringify(Object.assign({ codigo: this.cfg.codigo, nome: this.cfg.nome || '', acao }, extra || {}));
    const ctl = window.AbortController ? new AbortController() : null;
    const tempo = setTimeout(() => ctl && ctl.abort(), 120000), t0 = Date.now();
    const anotar = (ok, info) => { this.log.unshift({ t: Date.now(), acao, ms: Date.now() - t0, ok, info: String(info || '').slice(0, 120) }); this.log = this.log.slice(0, 30); Banco.gravar('config', 'nuvemLog', this.log, true); };
    // corpo como texto simples: o Google aceita sem pedir permissão extra (CORS)
    return fetch(this.cfg.url, { method: 'POST', body: corpo, redirect: 'follow', signal: ctl ? ctl.signal : undefined })
      .then(r => r.text())
      .then(t => {
        let j; try { j = JSON.parse(t); } catch (e) { anotar(false, 'resposta não é JSON: ' + t.slice(0, 80)); throw new Error('O servidor respondeu algo inesperado (' + t.replace(/<[^>]+>/g, ' ').trim().slice(0, 60) + '…). Vou tentar de novo.'); }
        if (!j.ok) { anotar(false, j.erro); throw new Error(j.erro || 'erro no servidor'); }
        this.versaoServidor = j.versao || 1;
        if (j.agora) this.difRelogio = j.agora - Date.now();     // corrige relógio errado do aparelho
        anotar(true, (j.itens ? j.itens.length + ' item(ns)' : '') + (j.ms ? ' · servidor ' + j.ms + ' ms' : ''));
        return j; })
      .catch(e => { if (e && e.name === 'AbortError') { anotar(false, 'sem resposta em 120 s'); throw new Error('O servidor não respondeu em 2 minutos. Vou tentar de novo.'); }
        if (e && /Failed to fetch|NetworkError|Load failed/.test(e.message)) { anotar(false, 'rede: ' + e.message); throw new Error('Não consegui falar com o servidor (rede). Vou tentar de novo.'); }
        throw e; })
      .finally(() => clearTimeout(tempo));
  },

  sincronizar() {
    if (!this.ativa() || this.rodando) return Promise.resolve();
    if (!navigator.onLine) { this.estado = 'offline'; this.mostrar(); return Promise.resolve(); }
    this.rodando = true; this.estado = 'enviando'; this.erro = ''; this.mostrar();
    let mudou = false;
    this._mudouAoEnviar = false;
    return this.enviar()
      .then(() => this.receber()).then(m => { mudou = m || this._mudouAoEnviar; })
      .then(() => { this.estado = this.pendentes() ? 'pendente' : 'ok'; this.ultimaOk = Date.now(); this.cfg.ultimaOk = this.ultimaOk; this.mostrar(); return Banco.gravar('config', 'nuvem', this.cfg, true); })
      .then(() => this.baixarArquivos())
      .catch(e => { this.estado = navigator.onLine ? 'erro' : 'offline'; this.erro = e.message || String(e); })
      .finally(() => {
        this.rodando = false; this.mostrar();
        if (mudou) this.redesenhar();
        if (this.estado === 'erro') this.agendar(30000);                                       // tenta de novo em 30 s
        else if (this.pendentes() && this.estado !== 'offline') this.agendar(3000);
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
      p = p.then(() => Promise.all(lote.map(i => {
        if (i.apagado) return { loja: i.loja, chave: i.chave, apagado: true, atualizadoEm: horaAgora() };
        // lê o registro; a cópia em memória pode ser mais nova (a gravação no banco espera 0,4 s) — vai a mais recente
        return Promise.all([Banco.ler(i.loja, i.chave), this.lerBase(i.loja, i.chave)]).then(([v, base]) => {
          const m = this.emMemoria(i.loja, i.chave);
          if (m && (!v || (m.atualizadoEm || '') >= (v.atualizadoEm || ''))) v = m;
          if (!v) return null;                                                     // nunca deduz exclusão pela ausência
          const it = { loja: i.loja, chave: i.chave, dados: v, atualizadoEm: v.atualizadoEm || horaAgora() };
          if (base && base.atualizadoEm) it.base = base.atualizadoEm;              // de que versão este aparelho partiu
          return it;
        });
      })))
        .then(dados => dados.filter(Boolean)).then(dados => (dados.length ? this.chamar('salvar', { itens: dados }) : Promise.resolve({ itens: [] })))
        .then(j => { tirar(lote); return this.resultadoEnvio(j.itens || [], lote); });
    }
    arqs.forEach(i => { p = p.then(() => this.enviarArquivo(i)).then(ok => { if (ok) tirar([i]); }); });
    return p;
  },
  emMemoria(loja, chave) {
    if (loja === 'rdos') return App.rdos[chave] || null;
    if (loja === 'obras') return App.obras.find(o => o.id === chave) || null;
    if (loja === 'config') return App.config || null;
    return null;
  },
  /* resposta do envio: 'ok' guarda a base; 'conflito' mescla campo a campo e reenvia; 'antigo' (servidor velho) adota a versão do servidor */
  resultadoEnvio(res, lote) {
    return res.reduce((p, r) => p.then(() => {
      if (r.status === 'ok') { const env = lote.find(i => i.loja === r.loja && i.chave === r.chave); const v = this.emMemoria(r.loja, r.chave);
        return v ? this.gravarBase(r.loja, r.chave, Object.assign({}, v, { atualizadoEm: r.atualizadoEm || v.atualizadoEm })) : null; }
      if (!r.atual) return null;
      const dele = r.atual;
      if (r.status === 'conflito' && !dele.apagado) return this.mesclarComServidor(r.loja, r.chave, dele);
      // 'antigo', ou o outro aparelho apagou: vale o servidor
      if (dele.apagado) return Banco.apagar(r.loja, r.chave, true).then(() => { this.noApp(r.loja, r.chave, null); this.gravarBase(r.loja, r.chave, null); this.avisar(r, dele); });
      return Banco.gravar(r.loja, r.chave, dele.dados, true).then(() => { this.noApp(r.loja, r.chave, dele.dados); this.gravarBase(r.loja, r.chave, dele.dados); this.avisar(r, dele); });
    }), Promise.resolve());
  },
  avisar(r, dele) {
    const dia = r.loja === 'rdos' ? 'O diário de ' + br(String(r.chave).split('|')[1]) : 'Um registro';
    toast(dia + ' foi alterado em outro aparelho' + (dele.por ? ' (' + dele.por + ')' : '') + ' — ficou a versão de lá', 7000);
    App.redesenharDepois = true; this._mudouAoEnviar = true;
  },
  /* outro aparelho alterou o mesmo registro: junta as duas alterações (o que só um mudou, fica; o que os dois mudaram, vale o mais recente) */
  mesclarComServidor(loja, chave, dele) {
    return Promise.all([Banco.ler(loja, chave), this.lerBase(loja, chave)]).then(([meuBanco, base]) => {
      const meu = this.emMemoria(loja, chave) || meuBanco; if (!meu) return;
      const meuMaisNovo = (meu.atualizadoEm || '') >= (dele.dados.atualizadoEm || '');
      const junto = mesclar3(base, meu, dele.dados, meuMaisNovo);
      junto.atualizadoEm = horaAgora();
      return Banco.gravar(loja, chave, junto, true).then(() => this.gravarBase(loja, chave, dele.dados)).then(() => {
        this.noApp(loja, chave, junto); this.marcar(loja, chave);                     // reenvia, agora partindo da versão do servidor
        const dia = loja === 'rdos' ? 'O diário de ' + br(String(chave).split('|')[1]) : 'Um registro';
        toast(dia + ' também foi alterado' + (dele.por ? ' por ' + dele.por : ' em outro aparelho') + ' — as duas alterações foram juntadas', 6000);
        App.redesenharDepois = true; this._mudouAoEnviar = true;
      });
    });
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
      j.itens = j.itens || [];
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
        return Banco.apagar(it.loja, it.chave, true).then(() => this.gravarBase(it.loja, it.chave, null)).then(() => { this.noApp(it.loja, it.chave, null); return true; });
      }
      if (local && tl >= tr) return false;
      return Banco.gravar(it.loja, it.chave, it.dados, true).then(() => this.gravarBase(it.loja, it.chave, it.dados)).then(() => { this.noApp(it.loja, it.chave, it.dados); return true; });
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
      const fila = falta.filter(x => !(this._falhas[x[1]] > agora)).sort((a, b) => String(b[3]).localeCompare(String(a[3]))).slice(0, 6);
      this.baixando = fila.length; this.mostrar();
      return fila.reduce((p, x) => p.then(() => this.baixarArquivo(x[0], x[1], x[2], x[3]).catch(e => {
          // "ainda não enviada": o outro aparelho ainda não subiu (ou nunca vai subir) — só tenta de novo em 6 h; outros erros, em 10 min
          this._falhas[x[1]] = Date.now() + (/não enviad/.test(e && e.message) ? 6 * 3600000 : 10 * 60000); })), Promise.resolve())
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
    if (!this.ultimaOk) return 'Ainda não sincronizou';
    if (Date.now() - this.ultimaOk > 5 * 60000) return 'Última sincronização às ' + new Date(this.ultimaOk).toTimeString().slice(0, 5);
    return 'Tudo salvo na nuvem';
  },
  mostrar() {
    const s = document.getElementById('salvo');
    if (s && s.textContent && s.textContent !== 'Salvando…') s.textContent = this.curto();
    const el = document.getElementById('nuvemStatus'); if (!el) return;
    const t = this.texto(); el.textContent = t;
    el.className = 'nuvem-status ' + (this.estado === 'erro' ? 'e' : this.estado === 'offline' || this.pendentes() || !this.ultimaOk || Date.now() - this.ultimaOk > 5 * 60000 ? 'a' : 'o');
    el.hidden = !t;
  },
  /* versão curta para o canto do cabeçalho do dia */
  curto() {
    if (!this.ativa()) return 'Salvo ✓';
    if (this.estado === 'offline') return 'Sem internet · salvo no aparelho';
    if (this.estado === 'erro') return 'Salvo no aparelho · nuvem com erro';
    if (this.rodando || this.pendentes()) return 'Enviando…';
    if (!this.ultimaOk || Date.now() - this.ultimaOk > 5 * 60000) return 'Salvo no aparelho · nuvem atrasada';
    return 'Salvo na nuvem ✓';
  },
  /* chegou coisa nova de outro aparelho: atualiza a tela se ninguém estiver digitando */
  redesenhar() {
    const foco = document.activeElement;
    if (foco && /INPUT|TEXTAREA/.test(foco.tagName)) { App.redesenharDepois = true; return; }
    if (document.getElementById('folha')) { App.redesenharDepois = true; return; }
    const y = scrollY; render(); scrollTo(0, y);
  },

  /* teste de conexão com relatório legível */
  testar() {
    const t0 = Date.now(), lin = [];
    return this.chamar('ping').then(j => { lin.push('✔ Servidor respondeu em ' + (Date.now() - t0) + ' ms (versão ' + j.versao + ', ' + (j.registros || 0) + ' registros)');
      if (j.versao < 4) lin.push('✘ Servidor desatualizado: publique a versão 4 do Codigo.gs');
      const t1 = Date.now(); return this.chamar('mudancas', { desde: 0, limite: 5 }).then(m => {
        lin.push('✔ Consulta de alterações em ' + (Date.now() - t1) + ' ms · ' + (m.total != null ? m.total : '?') + ' registros no servidor');
        lin.push('• Última sincronização completa aqui: ' + (this.ultimaOk ? new Date(this.ultimaOk).toLocaleString('pt-BR') : 'nunca'));
        lin.push('• Fila deste aparelho: ' + this.pendentes() + ' · relógio: ' + Math.round(this.difRelogio / 1000) + ' s de diferença');
        return lin; });
    }).catch(e => { lin.push('✘ ' + e.message); return lin; });
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

/* hora certa (do servidor, quando já conversou com ele) para marcar as alterações */
const horaAgora = () => new Date(Date.now() + (Nuvem.difRelogio || 0)).toISOString();

window.addEventListener('online', () => Nuvem.agendar(1000));
window.addEventListener('offline', () => { Nuvem.estado = 'offline'; Nuvem.mostrar(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) Nuvem.agendar(500); });
/* a cada minuto com a aba à vista; em segundo plano, a cada 5 minutos */
let _tick = 0;
setInterval(() => { _tick++; if (!document.hidden || _tick % 5 === 0) Nuvem.sincronizar(); }, 60000);

/* mescla 3 vias: base = de onde os dois partiram; meu = este aparelho; dele = servidor.
 * Campo que só um mudou: fica a mudança. Campo que os dois mudaram: vale o do registro mais recente. */
function mesclar3(base, meu, dele, meuMaisNovo) {
  const J = JSON.stringify, obj = x => x && typeof x === 'object' && !Array.isArray(x);
  if (J(meu) === J(dele)) return meu;
  if (base !== undefined && J(meu) === J(base)) return dele;      // eu não mexi
  if (base !== undefined && J(dele) === J(base)) return meu;      // ele não mexeu
  if (obj(meu) && obj(dele)) {
    const r = {}, chaves = new Set(Object.keys(meu).concat(Object.keys(dele)));
    chaves.forEach(k => {
      if (k === 'atualizadoEm' || k === 'atualizadoPor') return;
      const b = obj(base) ? base[k] : undefined;
      if (!(k in meu)) r[k] = (base !== undefined && b !== undefined && J(dele[k]) === J(b)) ? undefined : dele[k];   // eu apaguei o campo
      else if (!(k in dele)) r[k] = (base !== undefined && b !== undefined && J(meu[k]) === J(b)) ? undefined : meu[k]; // ele apagou
      else r[k] = mesclar3(b, meu[k], dele[k], meuMaisNovo);
      if (r[k] === undefined) delete r[k];
    });
    return r;
  }
  return meuMaisNovo ? meu : dele;                                 // os dois mudaram a mesma coisa
}
