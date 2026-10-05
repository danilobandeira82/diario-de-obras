/* =====================================================================
 * DIÁRIO DE OBRAS — servidor na conta Google da construtora
 * Guarda diários, fotos e documentos numa pasta do Google Drive.
 * Grátis (usa o espaço do Drive da conta). Instalação: veja COMO-INSTALAR.md
 * ===================================================================== */

// >>> TROQUE pelo código da sua empresa (o mesmo que os engenheiros vão digitar no app)
const CODIGO = 'TROQUE-ESTE-CODIGO';

const PASTA_PRINCIPAL = 'Diário de Obras (dados)';
const VERSAO_SERVIDOR = 1;

function doGet() {
  return saida({ ok: true, app: 'diario-de-obras', versao: VERSAO_SERVIDOR, msg: 'Servidor do Diário de Obras funcionando.' });
}

function doPost(e) {
  let p;
  try { p = JSON.parse(e.postData.contents); } catch (x) { return saida({ ok: false, erro: 'Pedido inválido.' }); }
  if (CODIGO === 'TROQUE-ESTE-CODIGO') return saida({ ok: false, erro: 'No servidor, troque TROQUE-ESTE-CODIGO pelo código da empresa e publique de novo.' });
  if (String(p.codigo || '').trim() !== CODIGO) return saida({ ok: false, erro: 'Código da empresa errado.' });
  const acao = ACOES[p.acao];
  if (!acao) return saida({ ok: false, erro: 'Ação desconhecida: ' + p.acao });
  try {
    const r = acao(p) || {};
    r.ok = true; r.agora = Date.now(); r.versao = VERSAO_SERVIDOR;
    return saida(r);
  } catch (x) {
    return saida({ ok: false, erro: String((x && x.message) || x) });
  }
}

function saida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- pastas ---------- */
function raiz() {
  const pr = PropertiesService.getScriptProperties(), id = pr.getProperty('raiz');
  if (id) { try { return DriveApp.getFolderById(id); } catch (x) { /* pasta apagada: cria outra */ } }
  const f = DriveApp.createFolder(PASTA_PRINCIPAL);
  pr.setProperty('raiz', f.getId());
  return f;
}
function sub(pai, nome) { const it = pai.getFoldersByName(nome); return it.hasNext() ? it.next() : pai.createFolder(nome); }
function pastaRegistros() { return sub(raiz(), 'registros (não mexer)'); }
function limparNome(t) { return String(t || 'Obra').replace(/[\\/:*?"<>|#\[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Obra'; }

/* pasta de cada obra, com o nome da obra (o código entre colchetes identifica) */
function pastaObra(obraId, obraNome) {
  const mae = sub(raiz(), 'Obras — fotos e documentos'), marca = '[' + obraId + ']';
  const it = mae.getFolders();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getName().indexOf(marca) >= 0) {
      if (obraNome) { const nome = limparNome(obraNome) + ' ' + marca; if (f.getName() !== nome) f.setName(nome); }
      return f;
    }
  }
  return mae.createFolder(limparNome(obraNome) + ' ' + marca);
}
const NOME_INDICE = 'indice (não mexer).json';
function lerIndice(pasta) {
  const it = pasta.getFilesByName(NOME_INDICE);
  if (!it.hasNext()) return { arq: null, dados: { fotos: {}, docs: {} } };
  const arq = it.next();
  let d = {}; try { d = JSON.parse(arq.getBlob().getDataAsString('UTF-8')); } catch (x) {}
  d.fotos = d.fotos || {}; d.docs = d.docs || {};
  return { arq, dados: d };
}
function gravarIndice(pasta, ind) {
  const txt = JSON.stringify(ind.dados);
  if (ind.arq) ind.arq.setContent(txt); else pasta.createFile(NOME_INDICE, txt, MimeType.PLAIN_TEXT);
}
function comTrava(fn) {
  const t = LockService.getScriptLock(); t.waitLock(30000);
  try { return fn(); } finally { t.releaseLock(); }
}

/* ---------- registros (obras, diários, configuração) ---------- */
function nomeRegistro(loja, chave) { return loja + '__' + String(chave).replace(/[^\w.-]/g, '_') + '.json'; }

const ACOES = {
  ping: () => ({ pasta: raiz().getUrl() }),

  /* itens: [{loja, chave, dados, apagado, atualizadoEm}] — fica valendo o mais recente */
  salvar: p => comTrava(() => {
    const pasta = pastaRegistros(), res = [];
    (p.itens || []).forEach(it => {
      const nome = nomeRegistro(it.loja, it.chave), ex = pasta.getFilesByName(nome);
      const novo = { loja: it.loja, chave: it.chave, dados: it.apagado ? null : it.dados, apagado: !!it.apagado,
        atualizadoEm: it.atualizadoEm || new Date().toISOString(), por: p.nome || '' };
      if (ex.hasNext()) {
        const arq = ex.next();
        let atual = {}; try { atual = JSON.parse(arq.getBlob().getDataAsString('UTF-8')); } catch (x) {}
        if (atual.atualizadoEm && atual.atualizadoEm > novo.atualizadoEm) { res.push({ loja: it.loja, chave: it.chave, status: 'antigo' }); return; }
        arq.setContent(JSON.stringify(novo));
      } else pasta.createFile(nome, JSON.stringify(novo), MimeType.PLAIN_TEXT);
      res.push({ loja: it.loja, chave: it.chave, status: 'ok' });
    });
    return { itens: res };
  }),

  /* o que mudou desde "desde" (milissegundos), em ordem, em páginas */
  mudancas: p => {
    const pasta = pastaRegistros(), desde = +p.desde || 0, lim = Math.min(+p.limite || 60, 200);
    const q = 'modifiedDate >= "' + Utilities.formatDate(new Date(Math.max(0, desde - 1000)), 'UTC', "yyyy-MM-dd'T'HH:mm:ss") + '" and trashed = false';
    const it = pasta.searchFiles(q), lista = [];
    while (it.hasNext()) { const f = it.next(); lista.push({ t: f.getLastUpdated().getTime(), f }); }
    lista.sort((a, b) => a.t - b.t);
    const pg = lista.slice(0, lim), itens = [];
    pg.forEach(x => { try { itens.push(JSON.parse(x.f.getBlob().getDataAsString('UTF-8'))); } catch (e) {} });
    return { itens, cursor: pg.length ? pg[pg.length - 1].t : desde, mais: lista.length > lim };
  },

  /* fotos: ficam em "Obras — fotos e documentos / <obra> / Fotos" */
  foto_enviar: p => comTrava(() => {
    const pasta = pastaObra(p.obraId, p.obraNome), ind = lerIndice(pasta);
    if (ind.dados.fotos[p.id]) return { driveId: ind.dados.fotos[p.id] };
    const blob = Utilities.newBlob(Utilities.base64Decode(p.base64), p.mime || 'image/jpeg', (p.data || 'foto') + '_' + p.id + '.jpg');
    const arq = sub(pasta, 'Fotos').createFile(blob);
    ind.dados.fotos[p.id] = arq.getId(); gravarIndice(pasta, ind);
    return { driveId: arq.getId() };
  }),
  foto_baixar: p => {
    const id = lerIndice(pastaObra(p.obraId)).dados.fotos[p.id];
    if (!id) throw new Error('foto ainda não enviada');
    const b = DriveApp.getFileById(id).getBlob();
    return { base64: Utilities.base64Encode(b.getBytes()), mime: b.getContentType() };
  },

  /* documentos da obra (ART, contrato…): "<obra> / Documentos" */
  doc_enviar: p => comTrava(() => {
    const pasta = pastaObra(p.obraId, p.obraNome), ind = lerIndice(pasta);
    if (ind.dados.docs[p.id]) return { driveId: ind.dados.docs[p.id] };
    const blob = Utilities.newBlob(Utilities.base64Decode(p.base64), p.mime || 'application/octet-stream', limparNome(p.nomeArq || p.id));
    const arq = sub(pasta, 'Documentos').createFile(blob);
    ind.dados.docs[p.id] = arq.getId(); gravarIndice(pasta, ind);
    return { driveId: arq.getId() };
  }),
  doc_baixar: p => {
    const id = lerIndice(pastaObra(p.obraId)).dados.docs[p.id];
    if (!id) throw new Error('documento ainda não enviado');
    const b = DriveApp.getFileById(id).getBlob();
    return { base64: Utilities.base64Encode(b.getBytes()), mime: b.getContentType() };
  }
};
