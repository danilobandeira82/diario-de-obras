/* =====================================================================
 * DIÁRIO DE OBRAS — servidor na conta Google da construtora
 * Guarda diários, fotos e documentos numa pasta do Google Drive.
 * Grátis (usa o espaço do Drive da conta). Instalação: veja COMO-INSTALAR.md
 * ===================================================================== */

// >>> TROQUE pelo código da sua empresa (o mesmo que os engenheiros vão digitar no app)
const CODIGO = 'TROQUE-ESTE-CODIGO';

const PASTA_PRINCIPAL = 'Diário de Obras (dados)';
const VERSAO_SERVIDOR = 2;

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

/* ---------- registros (obras, diários, configuração) ----------
 * Cada registro é um arquivo .json na pasta "registros". O arquivo "indice" guarda,
 * para cada registro, o id do arquivo e a hora da última alteração — assim o servidor
 * sabe na hora o que mudou, sem depender da busca do Drive (que às vezes demora). */
function nomeRegistro(loja, chave) { return loja + '__' + String(chave).replace(/[^\w.-]/g, '_') + '.json'; }
const NOME_INDICE_REG = 'indice dos registros (não mexer).json';
function lerIndiceReg(pasta) {
  const it = pasta.getFilesByName(NOME_INDICE_REG);
  if (it.hasNext()) {
    const arq = it.next();
    try { return { arq, dados: JSON.parse(arq.getBlob().getDataAsString('UTF-8')) }; } catch (x) {}
    return { arq, dados: montarIndiceReg(pasta) };
  }
  return { arq: null, dados: montarIndiceReg(pasta) };
}
/* primeira vez (ou índice perdido): monta a partir dos arquivos que existem */
function montarIndiceReg(pasta) {
  const d = {}, it = pasta.getFiles();
  while (it.hasNext()) {
    const f = it.next(), n = f.getName();
    if (n === NOME_INDICE_REG || !/\.json$/.test(n)) continue;
    d[n] = { id: f.getId(), t: f.getLastUpdated().getTime() };
  }
  return d;
}
function gravarIndiceReg(pasta, ind) {
  const txt = JSON.stringify(ind.dados);
  if (ind.arq) ind.arq.setContent(txt); else ind.arq = pasta.createFile(NOME_INDICE_REG, txt, MimeType.PLAIN_TEXT);
}

const ACOES = {
  ping: () => ({ pasta: raiz().getUrl() }),

  /* itens: [{loja, chave, dados, apagado, atualizadoEm}] — fica valendo o mais recente */
  salvar: p => comTrava(() => {
    const pasta = pastaRegistros(), ind = lerIndiceReg(pasta), res = [];
    let t = Date.now();
    Object.keys(ind.dados).forEach(n => { if (ind.dados[n].t >= t) t = ind.dados[n].t + 1; });   // hora sempre crescente
    (p.itens || []).forEach(it => {
      const nome = nomeRegistro(it.loja, it.chave), reg = ind.dados[nome];
      const novo = { loja: it.loja, chave: it.chave, dados: it.apagado ? null : it.dados, apagado: !!it.apagado,
        atualizadoEm: it.atualizadoEm || new Date().toISOString(), por: p.nome || '' };
      let arq = null;
      if (reg) { try { arq = DriveApp.getFileById(reg.id); } catch (x) { arq = null; } }
      if (arq) {
        let atual = {}; try { atual = JSON.parse(arq.getBlob().getDataAsString('UTF-8')); } catch (x) {}
        if (atual.atualizadoEm && atual.atualizadoEm > novo.atualizadoEm) { res.push({ loja: it.loja, chave: it.chave, status: 'antigo' }); return; }
        arq.setContent(JSON.stringify(novo));
      } else arq = pasta.createFile(nome, JSON.stringify(novo), MimeType.PLAIN_TEXT);
      ind.dados[nome] = { id: arq.getId(), t: t++ };
      res.push({ loja: it.loja, chave: it.chave, status: 'ok' });
    });
    gravarIndiceReg(pasta, ind);
    return { itens: res };
  }),

  /* o que mudou desde "desde" (milissegundos), em ordem, em páginas */
  mudancas: p => {
    const pasta = pastaRegistros(), ind = lerIndiceReg(pasta).dados, desde = +p.desde || 0, lim = Math.min(+p.limite || 60, 200);
    const lista = Object.keys(ind).map(n => ind[n]).filter(r => r.t >= desde).sort((a, b) => a.t - b.t);
    const pg = lista.slice(0, lim), itens = [];
    pg.forEach(r => { try { itens.push(JSON.parse(DriveApp.getFileById(r.id).getBlob().getDataAsString('UTF-8'))); } catch (e) {} });
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
