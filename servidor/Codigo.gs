/* =====================================================================
 * DIÁRIO DE OBRAS — servidor na conta Google da construtora
 * Guarda diários, fotos e documentos numa pasta do Google Drive.
 * Grátis (usa o espaço do Drive da conta). Instalação: veja COMO-INSTALAR.md
 *
 * Versão 4: nunca procura pasta ou arquivo pelo nome (a busca do Drive pode
 * demorar minutos para enxergar o que acabou de ser criado e isso espalhava os
 * dados em pastas duplicadas). Os códigos (IDs) ficam guardados nas propriedades
 * do script e tudo é aberto por ID, que é imediato.
 * ===================================================================== */

// >>> TROQUE pelo código da sua empresa (o mesmo que os engenheiros vão digitar no app)
const CODIGO = 'TROQUE-ESTE-CODIGO';

const PASTA_PRINCIPAL = 'Diário de Obras (dados)';
const VERSAO_SERVIDOR = 4;

function doGet() {
  return saida({ ok: true, app: 'diario-de-obras', versao: VERSAO_SERVIDOR, msg: 'Servidor do Diário de Obras funcionando.' });
}

function doPost(e) {
  const t0 = Date.now();
  let p;
  try { p = JSON.parse(e.postData.contents); } catch (x) { return saida({ ok: false, erro: 'Pedido inválido.' }); }
  if (CODIGO === 'TROQUE-ESTE-CODIGO') return saida({ ok: false, erro: 'No servidor, troque TROQUE-ESTE-CODIGO pelo código da empresa e publique de novo.' });
  if (String(p.codigo || '').trim() !== CODIGO) return saida({ ok: false, erro: 'Código da empresa errado.' });
  const acao = ACOES[p.acao];
  if (!acao) return saida({ ok: false, erro: 'Ação desconhecida: ' + p.acao });
  try {
    const r = acao(p) || {};
    r.ok = true; r.agora = Date.now(); r.versao = VERSAO_SERVIDOR; r.ms = Date.now() - t0;
    return saida(r);
  } catch (x) {
    return saida({ ok: false, erro: String((x && x.message) || x), versao: VERSAO_SERVIDOR });
  }
}

function saida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- propriedades (guardam os IDs; leitura imediata e consistente) ---------- */
const PROPS = PropertiesService.getScriptProperties();
const prop = k => PROPS.getProperty(k);
const setProp = (k, v) => { PROPS.setProperty(k, v); return v; };

function pastaPorId(id) { try { return id ? DriveApp.getFolderById(id) : null; } catch (x) { return null; } }
function arquivoPorId(id) { try { return id ? DriveApp.getFileById(id) : null; } catch (x) { return null; } }
function limparNome(t) { return String(t || 'Obra').replace(/[\\/:*?"<>|#\[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Obra'; }

/* pasta guardada em propriedade; se não houver, procura pelo nome UMA vez (instalação antiga) e, se achar, guarda o ID */
function pastaFixa(chaveProp, pai, nome) {
  let f = pastaPorId(prop(chaveProp));
  if (f) return f;
  if (pai) { const it = pai.getFoldersByName(nome); if (it.hasNext()) f = it.next(); }
  else { const it = DriveApp.getFoldersByName(nome); if (it.hasNext()) f = it.next(); }
  if (!f) f = pai ? pai.createFolder(nome) : DriveApp.createFolder(nome);
  setProp(chaveProp, f.getId());
  return f;
}
function raiz() { return pastaFixa('raiz', null, PASTA_PRINCIPAL); }
/* todas as pastas com esse nome dentro de pai (versões antigas podem ter criado duplicatas) */
function todasPastas(pai, nome, primeira) {
  const lista = primeira ? [primeira] : [], it = pai.getFoldersByName(nome);
  while (it.hasNext()) { const f = it.next(); if (!lista.some(x => x.getId() === f.getId())) lista.push(f); }
  return lista;
}
function pastaRegistros() { return pastaFixa('p_registros', raiz(), 'registros (não mexer)'); }
function pastaLixeira() { return pastaFixa('p_lixeira', pastaRegistros(), 'lixeira'); }
function pastaObrasMae() { return pastaFixa('p_obras', raiz(), 'Obras — fotos e documentos'); }

/* pasta de cada obra, com o nome da obra (o código entre colchetes identifica) */
function pastaObra(obraId, obraNome) {
  const marca = '[' + obraId + ']';
  let f = pastaPorId(prop('p_obra_' + obraId));
  if (!f) {
    const it = pastaObrasMae().getFolders();                      // instalação antiga: acha pelo código no nome
    while (it.hasNext()) { const x = it.next(); if (x.getName().indexOf(marca) >= 0) { f = x; break; } }
    if (!f) f = pastaObrasMae().createFolder(limparNome(obraNome) + ' ' + marca);
    setProp('p_obra_' + obraId, f.getId());
  }
  if (obraNome) { const nome = limparNome(obraNome) + ' ' + marca; if (f.getName() !== nome) f.setName(nome); }
  return f;
}
function pastaFotos(obraId, obraNome) { return pastaFixa('p_obra_' + obraId + '_f', pastaObra(obraId, obraNome), 'Fotos'); }
function pastaDocs(obraId, obraNome) { return pastaFixa('p_obra_' + obraId + '_d', pastaObra(obraId, obraNome), 'Documentos'); }

/* ---------- índices (JSON num arquivo aberto por ID) ---------- */
/* remontar(dadosAtuais) devolve o índice completo. Na primeira vez que a v4 abre um índice (sem ID guardado),
 * remonta a partir dos arquivos — assim junta o que versões antigas tenham espalhado em pastas duplicadas. */
function lerIndiceArq(chaveProp, pasta, nome, vazio, remontar, remontarAgora) {
  let arq = arquivoPorId(prop(chaveProp)), dados = null, primeiraVez = !arq;
  if (!arq && pasta) { const it = pasta.getFilesByName(nome); if (it.hasNext()) { arq = it.next(); setProp(chaveProp, arq.getId()); } }
  if (arq) { try { dados = JSON.parse(arq.getBlob().getDataAsString('UTF-8')); } catch (x) { dados = null; } }
  if (!dados) dados = vazio;
  const ind = { arq, dados, chaveProp, pasta, nome };
  if ((primeiraVez || !arq || remontarAgora) && remontar) { ind.dados = remontar(dados); gravarIndiceArq(ind); }
  return ind;
}
function gravarIndiceArq(ind) {
  const txt = JSON.stringify(ind.dados);
  if (ind.arq) ind.arq.setContent(txt);
  else { ind.arq = ind.pasta.createFile(ind.nome, txt, MimeType.PLAIN_TEXT); setProp(ind.chaveProp, ind.arq.getId()); }
}
function comTrava(fn) {
  const t = LockService.getScriptLock(); t.waitLock(40000);
  try { return fn(); } finally { t.releaseLock(); }
}

/* índice de fotos/documentos de uma obra: { fotos: {id: driveId}, docs: {id: driveId} } */
function indiceObra(obraId, obraNome, remontarAgora) {
  const ind = lerIndiceArq('i_obra_' + obraId, pastaObra(obraId, obraNome), 'indice (não mexer).json', { fotos: {}, docs: {} }, atual => {
    // instalação antiga ou índice perdido: junta tudo que existir em qualquer pasta da obra (inclusive duplicadas)
    const d = { fotos: Object.assign({}, (atual || {}).fotos || {}), docs: Object.assign({}, (atual || {}).docs || {}) }, marca = '[' + obraId + ']';
    const maes = todasPastas(raiz(), 'Obras — fotos e documentos', pastaObrasMae()), candidatas = [];
    maes.forEach(m => { const it = m.getFolders(); while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf(marca) >= 0) candidatas.push(f); } });
    candidatas.forEach(f => {
      const fs = f.getFolders();
      while (fs.hasNext()) {
        const sub = fs.next(), tipo = sub.getName() === 'Fotos' ? 'fotos' : sub.getName() === 'Documentos' ? 'docs' : null;
        if (!tipo) continue;
        const as = sub.getFiles();
        while (as.hasNext()) { const a = as.next(), m = a.getName().match(/_([a-z0-9]{10,})\.jpg$/i);
          if (tipo === 'fotos' && m) { if (!d.fotos[m[1]] || !arquivoPorId(d.fotos[m[1]])) d.fotos[m[1]] = a.getId(); } }
      }
      // índices das pastas duplicadas: os documentos só estão neles
      const ix = f.getFilesByName('indice (não mexer).json');
      while (ix.hasNext()) { try { const o = JSON.parse(ix.next().getBlob().getDataAsString('UTF-8'));
        Object.keys(o.docs || {}).forEach(k => { if (!d.docs[k]) d.docs[k] = o.docs[k]; });
        Object.keys(o.fotos || {}).forEach(k => { if (!d.fotos[k]) d.fotos[k] = o.fotos[k]; }); } catch (x) {}
      }
    });
    return d;
  }, remontarAgora);
  ind.dados.fotos = ind.dados.fotos || {}; ind.dados.docs = ind.dados.docs || {};
  return ind;
}

/* ---------- registros (obras, diários, configuração) ----------
 * Cada registro é um arquivo .json. O índice guarda, para cada registro, o ID do
 * arquivo e a hora (t) da última alteração — assim "o que mudou desde X" é imediato. */
function nomeRegistro(loja, chave) { return loja + '__' + String(chave).replace(/[^\w.-]/g, '_') + '.json'; }
const NOME_INDICE_REG = 'indice dos registros (não mexer).json';
function indiceRegistros(remontarAgora) {
  return lerIndiceArq('i_registros', pastaRegistros(), NOME_INDICE_REG, {}, montarIndiceReg, remontarAgora);
}
/* primeira vez (ou índice perdido): monta a partir dos arquivos que existem, em TODAS as pastas "registros" (inclusive duplicadas de versões antigas) */
function montarIndiceReg(atual) {
  const d = Object.assign({}, atual || {}), pastas = todasPastas(raiz(), 'registros (não mexer)', pastaRegistros());
  pastas.forEach(pasta => {
    const fs = pasta.getFiles();
    while (fs.hasNext()) {
      const f = fs.next(), n = f.getName();
      if (n.indexOf('indice') === 0 || !/\.json$/.test(n)) continue;
      const t = f.getLastUpdated().getTime();
      if (!d[n] || d[n].t < t) d[n] = { id: f.getId(), t };
    }
  });
  return d;
}

const ACOES = {
  ping: () => ({ pasta: raiz().getUrl(), registros: Object.keys(indiceRegistros().dados).length }),

  /* itens: [{loja, chave, dados, apagado, atualizadoEm}] — fica valendo o mais recente */
  salvar: p => comTrava(() => {
    const pasta = pastaRegistros(), ind = indiceRegistros(), res = [];
    let t = Date.now();
    Object.keys(ind.dados).forEach(n => { if (ind.dados[n].t >= t) t = ind.dados[n].t + 1; });   // hora sempre crescente
    (p.itens || []).forEach(it => {
      const nome = nomeRegistro(it.loja, it.chave), reg = ind.dados[nome];
      const novo = { loja: it.loja, chave: it.chave, dados: it.apagado ? null : it.dados, apagado: !!it.apagado,
        atualizadoEm: it.atualizadoEm || new Date().toISOString(), por: p.nome || '' };
      let arq = reg ? arquivoPorId(reg.id) : null;
      if (arq) {
        const txtAtual = arq.getBlob().getDataAsString('UTF-8');
        let atual = {}; try { atual = JSON.parse(txtAtual); } catch (x) {}
        // já existe versão mais nova (feita em outro aparelho): não sobrescreve e devolve a atual
        if (atual.atualizadoEm && atual.atualizadoEm > novo.atualizadoEm) { res.push({ loja: it.loja, chave: it.chave, status: 'antigo', atual }); return; }
        // vai apagar algo que tinha conteúdo: guarda uma cópia na lixeira antes (dá para recuperar à mão)
        if (novo.apagado && atual.dados) pastaLixeira().createFile(nome.replace(/\.json$/, '') + '__' +
          Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd_HH-mm-ss') + '.json', txtAtual, MimeType.PLAIN_TEXT);
        arq.setContent(JSON.stringify(novo));
      } else arq = pasta.createFile(nome, JSON.stringify(novo), MimeType.PLAIN_TEXT);
      ind.dados[nome] = { id: arq.getId(), t: t++ };
      res.push({ loja: it.loja, chave: it.chave, status: 'ok' });
    });
    gravarIndiceArq(ind);
    return { itens: res };
  }),

  /* o que mudou desde "desde" (milissegundos), em ordem, em páginas */
  mudancas: p => {
    const desde = +p.desde || 0, lim = Math.min(+p.limite || 60, 200);
    // "baixar tudo de novo" (desde = 0): aproveita e revarre as pastas, caso algo tenha ficado fora do índice
    const ind = indiceRegistros(desde === 0).dados;
    const lista = Object.keys(ind).map(n => ind[n]).filter(r => r.t >= desde).sort((a, b) => a.t - b.t);
    const pg = lista.slice(0, lim), itens = [];
    pg.forEach(r => { const a = arquivoPorId(r.id); if (!a) return; try { itens.push(JSON.parse(a.getBlob().getDataAsString('UTF-8'))); } catch (e) {} });
    return { itens, cursor: pg.length ? pg[pg.length - 1].t : desde, mais: lista.length > lim, total: Object.keys(ind).length };
  },

  /* fotos: ficam em "Obras — fotos e documentos / <obra> / Fotos" */
  foto_enviar: p => comTrava(() => {
    const ind = indiceObra(p.obraId, p.obraNome);
    if (ind.dados.fotos[p.id] && arquivoPorId(ind.dados.fotos[p.id])) return { driveId: ind.dados.fotos[p.id] };
    const blob = Utilities.newBlob(Utilities.base64Decode(p.base64), p.mime || 'image/jpeg', (p.data || 'foto') + '_' + p.id + '.jpg');
    const arq = pastaFotos(p.obraId, p.obraNome).createFile(blob);
    ind.dados.fotos[p.id] = arq.getId(); gravarIndiceArq(ind);
    return { driveId: arq.getId() };
  }),
  foto_baixar: p => {
    let id = indiceObra(p.obraId).dados.fotos[p.id], a = arquivoPorId(id);
    if (!a) { id = indiceObra(p.obraId, null, true).dados.fotos[p.id]; a = arquivoPorId(id); }   // revarre as pastas
    if (!a) throw new Error('foto ainda não enviada');
    const b = a.getBlob();
    return { base64: Utilities.base64Encode(b.getBytes()), mime: b.getContentType() };
  },

  /* documentos da obra (ART, contrato…): "<obra> / Documentos" */
  doc_enviar: p => comTrava(() => {
    const ind = indiceObra(p.obraId, p.obraNome);
    if (ind.dados.docs[p.id] && arquivoPorId(ind.dados.docs[p.id])) return { driveId: ind.dados.docs[p.id] };
    const blob = Utilities.newBlob(Utilities.base64Decode(p.base64), p.mime || 'application/octet-stream', limparNome(p.nomeArq || p.id));
    const arq = pastaDocs(p.obraId, p.obraNome).createFile(blob);
    ind.dados.docs[p.id] = arq.getId(); gravarIndiceArq(ind);
    return { driveId: arq.getId() };
  }),
  doc_baixar: p => {
    let id = indiceObra(p.obraId).dados.docs[p.id], a = arquivoPorId(id);
    if (!a) { id = indiceObra(p.obraId, null, true).dados.docs[p.id]; a = arquivoPorId(id); }
    if (!a) throw new Error('documento ainda não enviado');
    const b = a.getBlob();
    return { base64: Utilities.base64Encode(b.getBytes()), mime: b.getContentType() };
  },

  /* diagnóstico: o que o servidor está enxergando */
  diagnostico: () => {
    const ind = indiceRegistros().dados, lista = Object.keys(ind).map(n => ind[n]).sort((a, b) => b.t - a.t);
    return { registros: lista.length, ultimaAlteracao: lista.length ? lista[0].t : 0, pasta: raiz().getUrl(),
      propriedades: Object.keys(PROPS.getProperties()).length };
  }
};
