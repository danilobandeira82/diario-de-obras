/* =====================================================================
 * APP — estado, navegação e telas gerais
 * ===================================================================== */
const App = { config: {}, obras: [], rdos: {}, rota: {}, mes: null };

const chaveRdo = (obraId, data) => obraId + '|' + data;
const obraPor = id => App.obras.find(o => o.id === id);
const rdosDa = obraId => Object.values(App.rdos).filter(r => r.obraId === obraId);

function salvarConfig() { App.config.atualizadoEm = horaAgora(); return Banco.gravar('config', 'geral', App.config); }
function salvarObra(o) { o.atualizadoEm = horaAgora(); return Banco.gravar('obras', o.id, o); }

/* Status de um dia para o calendário */
function statusDia(obra, iso) {
  const r = App.rdos[chaveRdo(obra.id, iso)];
  const hoje = hojeIso();
  if (iso < obra.inicio) return 'antes';
  if (r && r.status === 'concluido') return r.clima && r.clima.houve === false ? 'parado' : 'ok';
  if (r) return 'rasc';
  return iso < hoje ? 'falta' : (iso === hoje ? 'hoje-vazio' : 'fut');
}
function diasFaltando(obra) {
  const fim = somaDias(hojeIso(), -1); let n = 0;
  if (!obra.inicio || obra.inicio > fim) return 0;
  for (let d = obra.inicio; d <= fim; d = somaDias(d, 1)) if (!App.rdos[chaveRdo(obra.id, d)]) n++;
  return n;
}
function prazoDe(obra, iso) {
  if (!obra.inicio) return null;
  const dia = difDias(obra.inicio, iso) + 1, total = +obra.prazoDias || 0;
  return { dia, total, restam: total ? total - dia : null };
}
/* "Dia 10 de 365 · faltam 355" — conta dias corridos (sábado e domingo entram) */
function textoPrazo(pz) {
  if (!pz) return '';
  if (pz.dia < 1) return 'antes do início da obra';
  if (!pz.total) return 'Dia ' + pz.dia;
  if (pz.restam < 0) return 'Dia ' + pz.dia + ' de ' + pz.total + ' · prazo vencido há ' + (-pz.restam) + ' dia' + (pz.restam === -1 ? '' : 's');
  return 'Dia ' + pz.dia + ' de ' + pz.total + ' · falta' + (pz.restam === 1 ? ' 1 dia' : 'm ' + pz.restam + ' dias');
}
const docsFaltando = obra => DOCS_EXIGIDOS.filter(t => !(obra.docs || []).some(d => d.tipo === t));

/* ---------------- navegação ---------------- */
function ir(h) { if (location.hash === h) render(); else location.hash = h; }
window.addEventListener('hashchange', render);

function lerRota() {
  const p = (location.hash.replace(/^#\/?/, '') || '').split('/').map(decodeURIComponent);
  if (p[0] === 'config') return { tela: 'config' };
  if (p[0] === 'obra' && p[1] === 'nova') return { tela: 'obraForm' };
  if (p[0] === 'obra' && p[2] === 'editar') return { tela: 'obraForm', id: p[1] };
  if (p[0] === 'obra' && p[2] === 'dia') return { tela: 'rdo', id: p[1], data: p[3] };
  if (p[0] === 'obra') return { tela: 'obra', id: p[1], aba: p[2] || 'diario' };
  return { tela: 'inicio' };
}

function topo(titulo, sub, voltar, direita) {
  return '<header class="topo">' +
    (voltar ? '<button class="ic" data-a="voltar" data-h="' + esc(voltar) + '" aria-label="Voltar">' + ic('voltar') + '</button>' : '') +
    '<h1>' + esc(titulo) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</h1>' + (direita || '') + '</header>';
}

function render() {
  fecharFolha();
  App.rota = lerRota();
  const r = App.rota;
  const corpo = $('#app');
  let html = '';
  if (r.tela === 'inicio') html = telaInicio();
  else if (r.tela === 'config') html = telaConfig();
  else if (r.tela === 'obraForm') html = telaObraForm(r.id);
  else if (r.tela === 'obra') html = obraPor(r.id) ? telaObra(obraPor(r.id), r.aba) : telaInicio();
  else if (r.tela === 'rdo') html = obraPor(r.id) ? telaRdo(obraPor(r.id), r.data) : telaInicio();
  corpo.innerHTML = html;
  App.redesenharDepois = false; Nuvem.mostrar();
  window.scrollTo(0, 0);
  if (App.aposRender) { const f = App.aposRender; App.aposRender = null; f(); }
}

/* ---------------- INÍCIO ---------------- */
function telaInicio() {
  const ativas = App.obras.filter(o => !o.arquivada);
  let h = topo(App.config.empresa || 'Diário de Obras', 'Obras em andamento', null,
    '<button class="ic" data-a="ir" data-h="#/config" aria-label="Configurações">' + ic('config') + '</button>');
  h += '<main>';

  h += '<div id="nuvemStatus" class="nuvem-status" hidden></div>';
  if (Banco.motor !== 'indexeddb')
    h += '<div class="aviso e">' + ic('alerta') + '<div><b>Este navegador não está guardando os dados.</b> ' +
      'Abra no Google Chrome ou Edge.</div></div>';
  else if (!Nuvem.ativa())
    h += '<div class="aviso a">' + ic('alerta') + '<div><b>Os diários estão só neste aparelho.</b> ' +
      '<a href="#/config" style="color:inherit">Ligar a nuvem</a> para abrir no celular e no computador.</div></div>';

  if (!ativas.length) {
    h += '<div class="cartao vazio">' + ic('predio') + '<h3>Nenhuma obra ainda</h3>' +
      '<p>Cadastre a primeira obra para começar o diário.</p>' +
      '<div style="display:flex;flex-direction:column;gap:9px;max-width:320px;margin:18px auto 0">' +
      '<button class="btn pri" data-a="ir" data-h="#/obra/nova">' + ic('mais') + 'Cadastrar obra e começar</button>' +
      '<button class="btn sec" data-a="exemplo">Ver uma obra de exemplo já preenchida</button></div></div>';
  }

  ativas.forEach(o => {
    const hoje = hojeIso(), st = statusDia(o, hoje), pz = prazoDe(o, hoje), falta = diasFaltando(o);
    const r = App.rdos[chaveRdo(o.id, hoje)];
    const pil = st === 'ok' ? '<span class="pilula p-ok">' + ic('ok') + 'Hoje concluído</span>'
      : st === 'parado' ? '<span class="pilula p-info">Hoje sem expediente</span>'
      : st === 'rasc' ? '<span class="pilula p-alerta">Hoje em rascunho</span>'
      : o.inicio > hoje ? '<span class="pilula p-neutro">Começa ' + br(o.inicio) + '</span>'
      : '<span class="pilula p-neutro">Hoje não iniciado</span>';
    const pct = pz && pz.total ? Math.min(100, Math.max(0, pz.dia / pz.total * 100)) : 0;
    h += '<div class="cartao obra">' +
      '<div class="obra-topo"><div><h3>' + esc(o.nome) + '</h3><div class="sub">' + esc(o.cliente || '—') + '</div></div>' + pil + '</div>' +
      (pz && pz.total ? '<div class="prazo"><i style="width:' + pct + '%"></i></div>' : '<div style="height:10px"></div>') +
      '<div class="metricas num">' +
        (pz && pz.dia > 0 ? '<span><b>' + pz.dia + '</b>' + (pz.total ? ' de ' + pz.total : '') + ' dias</span>' : '') +
        (pz && pz.restam != null && pz.dia > 0 ? '<span><b>' + pz.restam + '</b> restantes</span>' : '') +
        '<span><b>' + rdosDa(o.id).filter(x => x.status === 'concluido').length + '</b> diários fechados</span>' +
        (falta ? '<span style="color:var(--erro)"><b style="color:var(--erro)">' + falta + '</b> dias sem lançamento</span>' : '') +
      '</div>' +
      '<div class="obra-acoes">' +
        '<button class="btn sec" data-a="ir" data-h="#/obra/' + o.id + '/diario">' + ic('calendario') + 'Abrir obra</button>' +
        (o.inicio <= hoje ? '<button class="btn pri" data-a="ir" data-h="#/obra/' + o.id + '/dia/' + hoje + '">' + ic('caneta') +
          (r ? 'Continuar hoje' : 'Preencher hoje') + '</button>' : '') +
      '</div></div>';
  });

  if (ativas.length) h += '<button class="mais" data-a="ir" data-h="#/obra/nova">' + ic('mais') + 'Nova obra</button>';
  const arq = App.obras.filter(o => o.arquivada);
  if (arq.length) h += '<p style="text-align:center;margin-top:18px;font-size:13.5px;color:var(--tinta2)">' + arq.length +
    ' obra(s) arquivada(s) — veja em <a href="#/config">Configurações</a></p>';
  return h + '</main>';
}

/* ---------------- OBRA (abas) ---------------- */
function telaObra(o, aba) {
  const pz = prazoDe(o, hojeIso());
  let h = topo(o.nome, (o.cliente || '') + (pz && pz.dia > 0 ? ' · dia ' + pz.dia + (pz.total ? ' de ' + pz.total : '') : ''), '#/');
  const abas = [['diario','Diário'],['fotos','Fotos'],['indicadores','Resumo'],['relatorios','Relatórios'],['cadastro','Obra']];
  h += '<nav class="abas">' + abas.map(a => '<button class="' + (a[0] === aba ? 'on' : '') + '" data-a="ir" data-h="#/obra/' +
    o.id + '/' + a[0] + '">' + a[1] + '</button>').join('') + '</nav><main>';
  if (aba === 'diario') h += abaDiario(o);
  else if (aba === 'fotos') h += abaFotos(o);
  else if (aba === 'indicadores') h += abaIndicadores(o);
  else if (aba === 'relatorios') h += abaRelatorios(o);
  else h += abaCadastro(o);
  return h + '</main>';
}

function abaDiario(o) {
  let h = '';
  const falta = docsFaltando(o);
  if (falta.length) h += '<div class="aviso a">' + ic('clipe') + '<div><b>Falta anexar: ' + esc(falta.join(' e ')) + '.</b> ' +
    'Anexe na aba <a href="#/obra/' + o.id + '/cadastro" style="color:inherit">Obra</a> para manter a documentação completa.</div></div>';

  if (!App.mes) { const d = new Date(); App.mes = [d.getFullYear(), d.getMonth()]; }
  const [ano, mes] = App.mes;
  const prim = new Date(ano, mes, 1), nd = new Date(ano, mes + 1, 0).getDate();
  const hoje = hojeIso();
  h += '<div class="cartao"><div class="cal-topo">' +
    '<button class="btn fant" data-a="mes" data-d="-1" aria-label="Mês anterior">' + ic('voltar') + '</button>' +
    '<b>' + cap(MESES[mes]) + ' de ' + ano + '</b>' +
    '<button class="btn fant" data-a="mes" data-d="1" aria-label="Próximo mês" style="transform:scaleX(-1)">' + ic('voltar') + '</button></div>' +
    '<div class="cal">' + ['D','S','T','Q','Q','S','S'].map(x => '<div class="dow">' + x + '</div>').join('');
  for (let i = 0; i < prim.getDay(); i++) h += '<div class="dia vz"></div>';
  for (let d = 1; d <= nd; d++) {
    const iso = ano + '-' + pad(mes + 1) + '-' + pad(d);
    const st = statusDia(o, iso);
    const cls = { ok:'ok', parado:'parado', rasc:'rasc', falta:'falta', fut:'fut', antes:'antes', 'hoje-vazio':'' }[st];
    const r = App.rdos[chaveRdo(o.id, iso)];
    const temFoto = r && r.fotos && r.fotos.length;
    const clicavel = st !== 'fut' && st !== 'antes';
    h += '<button class="dia ' + cls + (iso === hoje ? ' hoje' : '') + '" ' +
      (clicavel ? 'data-a="ir" data-h="#/obra/' + o.id + '/dia/' + iso + '"' : 'disabled') + ' aria-label="' + br(iso) + '">' +
      (temFoto ? ic('camera', 'cam') : '') + '<span class="num">' + d + '</span></button>';
  }
  h += '</div><div class="legenda">' +
    [['var(--ok-s)','fechado'],['var(--info-s)','sem expediente'],['var(--alerta-s)','rascunho'],['var(--erro-s)','sem lançamento']]
      .map(l => '<span><i style="background:' + l[0] + '"></i>' + l[1] + '</span>').join('') + '</div></div>';

  // últimos lançamentos
  const ult = rdosDa(o.id).sort((a, b) => b.data < a.data ? -1 : 1).slice(0, 6);
  if (ult.length) {
    h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('relogio') + '</div><h2>Últimos lançamentos</h2></div><div class="cartao-corpo">';
    ult.forEach(r => {
      const tot = totalMao(r);
      h += '<button class="item" style="width:100%;text-align:left;display:flex;align-items:center;gap:10px" data-a="ir" data-h="#/obra/' + o.id + '/dia/' + r.data + '">' +
        '<div style="flex:1;min-width:0"><b>' + cap(extenso(r.data)) + '</b><div style="font-size:13px;color:var(--tinta2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
        (r.clima && r.clima.houve === false ? 'Sem expediente — ' + esc(r.clima.motivo || '') :
          tot + ' trabalhadores · ' + (r.atividades || []).length + ' serviço(s) · ' + (r.fotos || []).length + ' foto(s)') + '</div></div>' +
        (r.status === 'concluido' ? '<span class="pilula p-ok">Fechado</span>' : '<span class="pilula p-alerta">Rascunho</span>') + '</button>';
    });
    h += '</div></div>';
  }
  return h;
}

/* ---------------- FOTOS da obra ---------------- */
function abaFotos(o) {
  const dias = rdosDa(o.id).filter(r => (r.fotos || []).length).sort((a, b) => b.data < a.data ? -1 : 1);
  if (!dias.length) return '<div class="cartao vazio">' + ic('galeria') + '<h3>Nenhuma foto ainda</h3><p>As fotos tiradas no diário aparecem aqui, organizadas por dia.</p></div>';
  App.aposRender = carregarMiniaturas;
  return dias.map(r => '<div class="cartao"><div class="cartao-cab"><h2>' + cap(extenso(r.data)) + '</h2>' +
    '<span class="pilula p-neutro">' + r.fotos.length + '</span></div><div class="cartao-corpo"><div class="galeria">' +
    r.fotos.map(f => '<button class="foto" data-a="verFoto" data-id="' + f.id + '" data-leg="' + esc(f.legenda || '') + '">' +
      '<img data-foto="' + f.id + '" alt="' + esc(f.legenda || 'foto') + '">' + (f.legenda ? '<span class="leg">' + esc(f.legenda) + '</span>' : '') + '</button>').join('') +
    '</div></div></div>').join('');
}
const _urls = {};
function urlFoto(id) {
  if (_urls[id]) return Promise.resolve(_urls[id]);
  return obterFotoBlob(id).then(b => b ? (_urls[id] = URL.createObjectURL(b)) : '');
}
function carregarMiniaturas() {
  document.querySelectorAll('img[data-foto]').forEach(img => urlFoto(img.dataset.foto).then(u => { if (u) img.src = u; }));
}

/* ---------------- INDICADORES ---------------- */
function abaIndicadores(o) {
  const rs = rdosDa(o.id);
  if (!rs.length) return '<div class="cartao vazio">' + ic('grafico') + '<h3>Sem dados ainda</h3><p>Os indicadores aparecem conforme o diário é preenchido.</p></div>';
  const trab = rs.filter(r => !r.clima || r.clima.houve !== false);
  const chuva = rs.filter(r => r.clima && (r.clima.manha === 'chuva' || r.clima.tarde === 'chuva' ||
    r.clima.manha === 'impraticavel' || r.clima.tarde === 'impraticavel' || r.clima.motivo === 'Chuva')).length;
  const efs = trab.map(totalMao).filter(n => n > 0);
  const media = efs.length ? Math.round(efs.reduce((a, b) => a + b, 0) / efs.length) : 0;
  const ocor = rs.reduce((n, r) => n + (r.ocorrencias || []).length, 0);
  const impacto = rs.reduce((n, r) => n + (r.ocorrencias || []).reduce((m, x) => m + (+x.impacto || 0), 0), 0);
  const fotos = rs.reduce((n, r) => n + (r.fotos || []).length, 0);
  const pz = prazoDe(o, hojeIso());
  const falta = diasFaltando(o);
  let h = '<div class="kpis">' +
    kpi(rs.filter(r => r.status === 'concluido').length, 'diários fechados') +
    kpi(falta, 'dias sem lançamento', falta ? 'var(--erro)' : '') +
    kpi(media, 'efetivo médio por dia') +
    kpi(chuva, 'dias com chuva') +
    kpi(ocor, 'ocorrências') +
    kpi(impacto, 'dias de impacto no prazo', impacto ? 'var(--alerta)' : '') +
    kpi(fotos, 'fotos') +
    kpi(pz && pz.restam != null ? pz.restam : '—', 'dias de prazo restantes') + '</div>';

  // efetivo dos últimos 14 dias
  const ult = []; for (let i = 13; i >= 0; i--) ult.push(somaDias(hojeIso(), -i));
  const vals = ult.map(d => { const r = App.rdos[chaveRdo(o.id, d)]; return r ? totalMao(r) : 0; });
  const mx = Math.max(1, ...vals);
  h += '<div class="cartao" style="margin-top:12px"><div class="cartao-cab"><div class="ico">' + ic('pessoas') + '</div><h2>Efetivo — últimos 14 dias</h2></div>' +
    '<div class="cartao-corpo"><div class="barras">' + vals.map((v, i) => '<div title="' + br(ult[i]) + ': ' + v + '">' +
      '<small class="num">' + (v || '') + '</small><i style="height:' + (v / mx * 88) + '%;' + (v ? '' : 'background:var(--linha);height:3px') + '"></i>' +
      '<small>' + dataDe(ult[i]).getDate() + '</small></div>').join('') + '</div></div></div>';

  // frentes mais trabalhadas
  const fr = {};
  rs.forEach(r => (r.atividades || []).forEach(a => { if (a.frente) fr[a.frente] = (fr[a.frente] || 0) + 1; }));
  const top = Object.entries(fr).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (top.length) {
    const m2 = top[0][1];
    h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('lista') + '</div><h2>Frentes com mais dias de serviço</h2></div><div class="cartao-corpo">' +
      top.map(([n, v]) => '<div style="display:flex;align-items:center;gap:10px;margin:7px 0"><span style="width:44%;font-size:14px">' + esc(n) +
        '</span><span style="flex:1;height:10px;background:var(--sup2);border-radius:9px;overflow:hidden"><i style="display:block;height:100%;width:' +
        (v / m2 * 100) + '%;background:var(--acao)"></i></span><b class="num" style="width:28px;text-align:right">' + v + '</b></div>').join('') + '</div></div>';
  }
  return h;
}
const kpi = (v, t, cor) => '<div class="kpi"><b' + (cor ? ' style="color:' + cor + '"' : '') + '>' + v + '</b><span>' + t + '</span></div>';

/* ---------------- CADASTRO DA OBRA (aba) ---------------- */
function abaCadastro(o) {
  let h = '<div class="grade2">';
  h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('predio') + '</div><h2>Dados da obra</h2>' +
    '<button class="btn fant" data-a="ir" data-h="#/obra/' + o.id + '/editar">' + ic('editar') + 'Editar</button></div><div class="cartao-corpo">' +
    [['Contratante', o.cliente], ['Endereço', o.endereco], ['Cidade', o.cidade], ['Contrato', o.contrato], ['ART/RRT', o.art],
     ['Início', br(o.inicio)], ['Prazo', o.prazoDias ? o.prazoDias + ' dias' : ''], ['Fiscal', o.fiscalNome]]
      .map(x => '<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #edf0f3;font-size:14.5px"><span style="width:96px;color:var(--tinta2)">' +
        x[0] + '</span><b style="flex:1;font-weight:550">' + esc(x[1] || '—') + '</b></div>').join('') + '</div></div>';

  // documentos
  h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('clipe') + '</div><h2>Documentos</h2></div><div class="cartao-corpo">';
  (o.docs || []).forEach(d => {
    h += '<div class="item" style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0"><b style="font-size:14px">' + esc(d.tipo) + '</b>' +
      '<div style="font-size:12.5px;color:var(--tinta2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(d.nome) + '</div></div>' +
      '<button class="btn fant" data-a="abrirDoc" data-id="' + d.id + '">Abrir</button>' +
      '<button class="x" data-a="apagarDoc" data-id="' + d.id + '" aria-label="Remover">' + ic('lixo') + '</button></div>';
  });
  const falta = docsFaltando(o);
  if (falta.length) h += '<p class="dica">' + ic('alerta') + 'Faltam: ' + esc(falta.join(', ')) + '</p>';
  h += '<label class="rot">Anexar documento</label><select class="campo" id="docTipo">' +
    TIPOS_DOC.map(t => '<option' + (t === falta[0] ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
    '<label class="btn sec cheio" style="margin-top:9px">' + ic('subir') + 'Escolher arquivo' +
    '<input type="file" hidden data-c="anexarDoc"></label></div></div>';

  // equipe e equipamentos padrão
  h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('pessoas') + '</div><h2>Equipe padrão</h2></div><div class="cartao-corpo">' +
    '<p class="dica" style="margin:0 0 10px">Essas funções aparecem prontas todo dia — o engenheiro só ajusta a quantidade.</p>' +
    '<div class="chips">' + FUNCOES.map(f => '<button class="chip ' + ((o.equipePadrao || []).includes(f) ? 'on' : '') +
      '" data-a="toggleLista" data-campo="equipePadrao" data-v="' + esc(f) + '">' + esc(f) + '</button>').join('') + '</div></div></div>';

  h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('caminhao') + '</div><h2>Equipamentos padrão</h2></div><div class="cartao-corpo">' +
    '<div class="chips">' + EQUIPAMENTOS.map(f => '<button class="chip ' + ((o.equipPadrao || []).includes(f) ? 'on' : '') +
      '" data-a="toggleLista" data-campo="equipPadrao" data-v="' + esc(f) + '">' + esc(f) + '</button>').join('') + '</div></div></div>';

  // seções
  const sec = Object.assign({}, SECOES_PADRAO, o.secoes || {});
  h += '<div class="cartao larga"><div class="cartao-cab"><div class="ico">' + ic('lista') + '</div><h2>O que entra no diário desta obra</h2></div>' +
    '<div class="cartao-corpo lista-sec"><p class="dica" style="margin:0 0 4px">Desligue o que esta obra não precisa. O diário fica mais curto.</p>' +
    SECOES.map(s => '<div class="linha"><span>' + s[1] + '</span>' +
      (s[0] === 'clima' ? '<span class="pilula p-neutro">sempre</span>' :
        '<button class="interruptor ' + (sec[s[0]] ? 'on' : '') + '" data-a="toggleSecao" data-s="' + s[0] + '" aria-label="' + s[1] + '"></button>') +
      '</div>').join('') + '</div></div>';

  h += '<div class="larga" style="display:flex;gap:9px;flex-wrap:wrap">' +
    '<button class="btn sec" data-a="arquivarObra">' + (o.arquivada ? 'Desarquivar obra' : 'Arquivar obra') + '</button>' +
    '<button class="btn fant" style="color:var(--erro)" data-a="excluirObra">' + ic('lixo') + 'Excluir obra</button></div>';
  return h + '</div>';
}

/* ---------------- FORMULÁRIO DA OBRA ---------------- */
function textoTermino(ini, prazo) {
  if (!ini || !(+prazo > 0)) return 'Informe início e prazo para ver a data de término.';
  return 'Término previsto: ' + br(somaDias(ini, +prazo - 1)) + ' (contando sábados, domingos e feriados).';
}
function telaObraForm(id) {
  const o = id ? obraPor(id) : { inicio: hojeIso(), engenheiro: App.config.responsavel || '', crea: App.config.crea || '', turnoManha: '07:30 às 12:00', turnoTarde: '13:00 às 17:30', tipo: 'Edificação nova' };
  const c = (k, rot, tipo, ph) => '<label class="rot">' + rot + '</label><input class="campo" name="' + k + '" type="' + (tipo || 'text') +
    '" value="' + esc(o[k] || '') + '" placeholder="' + esc(ph || '') + '">';
  let h = topo(id ? 'Editar obra' : 'Nova obra', '', id ? '#/obra/' + id + '/cadastro' : '#/');
  h += '<main><form id="formObra" class="cartao" style="padding:4px 15px 16px" onsubmit="return false">' +
    c('nome', 'Nome da obra *', 'text', 'Ex.: Fórum da Comarca de Iporã') +
    '<label class="rot">Tipo</label><div class="chips" id="tipoObra">' + ['Edificação nova','Reforma','Ampliação'].map(t =>
      '<button type="button" class="chip ' + (o.tipo === t ? 'on' : '') + '" data-a="tipoObra" data-v="' + t + '">' + t + '</button>').join('') + '</div>' +
    c('cliente', 'Contratante', 'text', 'Ex.: Tribunal de Justiça do Paraná') +
    c('endereco', 'Endereço') + c('cidade', 'Cidade / UF', 'text', 'Ex.: Iporã, PR — usado para o clima automático') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div>' + c('contrato', 'Nº do contrato') + '</div><div>' + c('art', 'Nº ART/RRT') + '</div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div>' + c('inicio', 'Início da obra *', 'date') + '</div><div>' +
      c('prazoDias', 'Prazo (dias corridos)', 'number', '365') + '</div></div>' +
    '<div id="terminoObra" class="dica" style="margin-top:6px">' + textoTermino(o.inicio, o.prazoDias) + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div>' + c('engenheiro', 'Engenheiro responsável') + '</div><div>' + c('crea', 'CREA/CAU') + '</div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div>' + c('fiscalNome', 'Fiscal do contrato') + '</div><div>' + c('fiscalCargo', 'Cargo / órgão') + '</div></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div>' + c('turnoManha', 'Turno manhã') + '</div><div>' + c('turnoTarde', 'Turno tarde') + '</div></div>' +
    '<input type="hidden" name="tipo" value="' + esc(o.tipo || 'Edificação nova') + '">' +
    '</form></main><div class="barra-acao"><div class="dentro"><button class="btn pri" data-a="salvarObra" data-id="' + (id || '') + '">' +
    ic('ok') + (id ? 'Salvar alterações' : 'Cadastrar obra') + '</button></div></div>';
  return h;
}

/* ---------------- CONFIGURAÇÕES ---------------- */
function cartaoNuvem() {
  const n = Nuvem.cfg || {};
  let h = '<div class="cartao larga"><div class="cartao-cab"><div class="ico">' + ic('subir') + '</div><h2>Nuvem da construtora' +
    '<span class="resumo">Google Drive — abre no celular e no computador</span></h2></div><div class="cartao-corpo">';
  if (Nuvem.ativa()) {
    h += '<div id="nuvemStatus" class="nuvem-status" hidden></div>' +
      '<p style="font-size:14px;margin:0 0 4px"><b>Conectado como:</b> ' + esc(n.nome) + '</p>' +
      '<p style="font-size:14px;margin:0 0 4px"><b>Última sincronização:</b> ' + (n.ultimaOk ? br(isoDe(new Date(n.ultimaOk))) + ' às ' +
        new Date(n.ultimaOk).toTimeString().slice(0, 5) : 'ainda não') + '</p>' +
      (Nuvem.versaoServidor && Nuvem.versaoServidor < 2 ? '<div class="aviso a" style="margin:8px 0">' + ic('alerta') + '<div><b>Atualize o servidor no Google</b> ' +
        '(cole o Codigo.gs novo e publique uma nova versão) — a versão antiga pode demorar a mostrar obras novas nos outros aparelhos.</div></div>' : '') +
      '<p style="font-size:13px;color:var(--tinta2);margin:0 0 12px;word-break:break-all">' + esc(n.url.slice(0, 60)) + '…</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">' +
      '<button class="btn pri" data-a="nuvemSinc">' + ic('subir') + 'Sincronizar agora</button>' +
      '<button class="btn sec" data-a="nuvemConvite">' + ic('copiar') + 'Convite p/ engenheiro</button></div>' +
      '<p class="dica">O convite é um link: o engenheiro abre no celular ou no computador, digita o nome e pronto.</p>' +
      '<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:6px"><button class="btn fant" data-a="nuvemTudo">Baixar tudo de novo</button>' +
      '<button class="btn fant" style="color:var(--erro)" data-a="nuvemSair">Desconectar este aparelho</button></div>';
  } else {
    h += '<p style="font-size:14px;color:var(--tinta2);margin:0 0 6px">Hoje os diários ficam só neste aparelho. Conecte à nuvem da construtora para ' +
      'guardar tudo no Google Drive e abrir em qualquer celular ou computador. Sem internet, o app continua funcionando e envia quando a conexão voltar.</p>' +
      (SERVIDOR_PADRAO ? '<input type="hidden" id="nvUrl" value="' + esc(SERVIDOR_PADRAO) + '">' :
        '<label class="rot">Endereço do servidor</label><input class="campo" id="nvUrl" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(n.url || '') + '">') +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label class="rot">Código da empresa</label><input class="campo" id="nvCod"></div>' +
      '<div><label class="rot">Seu nome</label><input class="campo" id="nvNome" value="' + esc(App.config.responsavel || '') + '"></div></div>' +
      '<button class="btn pri cheio" style="margin-top:12px" data-a="nuvemLigar">' + ic('ok') + 'Conectar</button>' +
      '<p class="dica">Recebeu um link de convite? Basta abrir o link. Para criar o servidor (uma vez só, pela diretoria): ' +
      '<a href="https://github.com/danilobandeira82/diario-de-obras/blob/main/servidor/COMO-INSTALAR.md" target="_blank" rel="noopener">passo a passo</a>.</p>';
  }
  return h + '</div></div>';
}
function telaConfig() {
  const c = App.config;
  let h = topo('Configurações', '', '#/') + '<main><div class="grade2">' + cartaoNuvem();
  h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('predio') + '</div><h2>Empresa</h2></div><div class="cartao-corpo">' +
    '<label class="rot">Nome da construtora (sai no PDF)</label><input class="campo" data-c="cfg" data-k="empresa" value="' + esc(c.empresa || '') + '">' +
    '<label class="rot">CNPJ</label><input class="campo" data-c="cfg" data-k="cnpj" value="' + esc(c.cnpj || '') + '">' +
    '<label class="rot">Responsável técnico padrão</label><input class="campo" data-c="cfg" data-k="responsavel" value="' + esc(c.responsavel || '') + '">' +
    '<label class="rot">CREA/CAU</label><input class="campo" data-c="cfg" data-k="crea" value="' + esc(c.crea || '') + '">' +
    '<label class="rot">Logo (sai no cabeçalho do PDF)</label>' +
    (c.logo ? '<img src="' + c.logo + '" alt="logo" style="max-height:64px;max-width:200px;display:block;margin-bottom:8px;border:1px solid var(--linha);border-radius:8px;padding:4px;background:#fff">' : '') +
    '<label class="btn sec cheio">' + ic('subir') + (c.logo ? 'Trocar logo' : 'Enviar logo') + '<input type="file" accept="image/*" hidden data-c="logo"></label></div></div>';

  h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('escudo') + '</div><h2>Cópia de segurança</h2></div><div class="cartao-corpo">' +
    '<p style="font-size:14px;color:var(--tinta2);margin:0 0 10px">' + (Nuvem.ativa() ? 'Com a nuvem ligada, tudo já fica no Google Drive. ' +
      'A cópia é uma garantia extra (um arquivo com tudo).' : 'Os dados ficam só neste aparelho. Salve uma cópia toda semana e guarde fora dele ' +
    '(pendrive ou e-mail para você mesmo). A cópia leva tudo: textos, fotos, assinaturas e documentos.') + '</p>' +
    '<p style="font-size:13.5px;margin:0 0 12px"><b>Última cópia:</b> ' + (c.ultimoBackup ? br(c.ultimoBackup) : 'nunca') + '</p>' +
    '<button class="btn pri cheio" data-a="backup">' + ic('baixar') + 'Salvar cópia de segurança</button>' +
    '<label class="btn sec cheio" style="margin-top:9px">' + ic('subir') + 'Restaurar uma cópia<input type="file" accept=".json,application/json" hidden data-c="restaurar"></label>' +
    '<label class="rot" style="margin-top:16px">Para o escritório / diretoria</label>' +
    '<p style="font-size:13.5px;color:var(--tinta2);margin:0 0 8px">Recebeu a cópia de segurança de um engenheiro? Junte aqui para ver as obras dele neste aparelho. ' +
    'Não apaga nada do que já está aqui; se a mesma obra vier de novo, os diários são atualizados.</p>' +
    '<label class="btn pri cheio">' + ic('subir') + 'Juntar diários recebidos<input type="file" accept=".json,application/json" multiple hidden data-c="juntar"></label></div></div>';

  h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('config') + '</div><h2>Este aparelho</h2></div><div class="cartao-corpo" id="diag">' +
    '<p style="font-size:14px;margin:0 0 6px"><b>Guardando em:</b> ' + (Banco.motor === 'indexeddb' ? 'banco do navegador (IndexedDB)' : '<span style="color:var(--erro)">somente memória — não salva</span>') + '</p>' +
    '<p style="font-size:14px;margin:0 0 12px" id="espaco">Calculando espaço…</p>' +
    '<button class="btn sec cheio" data-a="testar">Testar este aparelho</button></div></div>';

  const arq = App.obras.filter(o => o.arquivada);
  if (arq.length) h += '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('caixa') + '</div><h2>Obras arquivadas</h2></div><div class="cartao-corpo">' +
    arq.map(o => '<button class="item" style="width:100%;text-align:left" data-a="ir" data-h="#/obra/' + o.id + '/diario"><b>' + esc(o.nome) + '</b></button>').join('') + '</div></div>';

  App.aposRender = () => Banco.espaco().then(e => {
    const el = $('#espaco'); if (!el) return;
    el.innerHTML = e ? '<b>Espaço:</b> ' + mb(e.usado) + ' usados de ' + mb(e.total) + ' disponíveis' : '<b>Espaço:</b> não informado pelo navegador';
  });
  return h + '</div></main>';
}
