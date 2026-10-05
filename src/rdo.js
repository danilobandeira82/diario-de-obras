/* =====================================================================
 * RDO — o diário do dia, numa página só, salvando sozinho
 * ===================================================================== */
const totalMao = r => {
  let t = 0;
  Object.values((r && r.maoDeObra) || {}).forEach(v => t += +v || 0);
  ((r && r.terceiros) || []).forEach(x => t += +x.qtd || 0);
  return t;
};

function novoRdo(o, data) {
  const mao = {}; (o.equipePadrao || EQUIPE_PADRAO).forEach(f => mao[f] = 0);
  const eq = {}; (o.equipPadrao || EQUIP_PADRAO).forEach(f => eq[f] = 0);
  return { obraId: o.id, data, status: 'rascunho', criadoEm: new Date().toISOString(),
    clima: { houve: true, motivo: '', manha: '', tarde: '', horasParadas: 0, chuvaMm: null },
    maoDeObra: mao, terceiros: [], atividades: [], equipamentos: eq, fotos: [], ocorrencias: [],
    seguranca: { dds: null, tema: '', acidente: null, descAcidente: '' }, materiais: [], visitas: [],
    observacoes: '', assinaturas: { responsavel: { nome: App.config.responsavel || '', img: '' },
      fiscal: { nome: o.fiscalNome || '', img: '' } }, nada: {} };
}

function secoesVisiveis(o, r) {
  const ativas = Object.assign({}, SECOES_PADRAO, o.secoes || {});
  return SECOES.filter(s => {
    if (s[0] !== 'clima' && !ativas[s[0]]) return false;
    if (r.clima.houve === false) return ['clima', 'fotos', 'observacoes', 'assinaturas'].includes(s[0]);
    return true;
  }).map(s => s[0]);
}

function preenchida(sec, r) {
  const n = r.nada || {};
  switch (sec) {
    case 'clima': return r.clima.houve === false ? !!r.clima.motivo : !!(r.clima.manha && r.clima.tarde);
    case 'maoDeObra': return totalMao(r) > 0;
    case 'atividades': return r.atividades.some(a => (a.descricao || '').trim() || a.frente);
    case 'equipamentos': return n.equipamentos || Object.values(r.equipamentos).some(v => v > 0);
    case 'fotos': return n.fotos || r.fotos.length > 0;
    case 'ocorrencias': return n.ocorrencias || r.ocorrencias.length > 0;
    case 'seguranca': return r.seguranca.dds !== null && r.seguranca.acidente !== null;
    case 'materiais': return n.materiais || r.materiais.length > 0;
    case 'visitas': return n.visitas || r.visitas.length > 0;
    case 'observacoes': return n.observacoes || !!(r.observacoes || '').trim();
    case 'assinaturas': return !!(r.assinaturas.responsavel && r.assinaturas.responsavel.img);
  }
  return false;
}

/* ---------------- a tela ---------------- */
function telaRdo(o, data) {
  const k = chaveRdo(o.id, data);
  const r = App.rdos[k] ? JSON.parse(JSON.stringify(App.rdos[k])) : novoRdo(o, data);
  r.nada = r.nada || {};
  App.rdoAtual = r; App.obraAtual = o;
  const pz = prazoDe(o, data);
  let h = topo(cap(extenso(data)), o.nome + (pz ? ' · dia ' + pz.dia + (pz.total ? ' de ' + pz.total : '') : ''),
    '#/obra/' + o.id + '/diario', '<span class="salvo" id="salvo">' + (App.rdos[k] ? 'Salvo' : '') + '</span>');
  h += '<main>';

  if (r.status === 'concluido')
    h += '<div class="aviso o">' + ic('ok') + '<div><b>Diário fechado' + (r.concluidoEm ? ' em ' + br(r.concluidoEm.slice(0, 10)) : '') +
      '.</b> Você ainda pode corrigir; a alteração fica registrada.</div></div>';

  // atalho: copiar do último dia
  const vazio = !App.rdos[k] || (totalMao(r) === 0 && !r.atividades.length);
  if (vazio) {
    const ant = rdosDa(o.id).filter(x => x.data < data).sort((a, b) => b.data < a.data ? -1 : 1)[0];
    if (ant) h += '<button class="cartao" data-a="copiarAnterior" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 15px;text-align:left;border-color:var(--acao)">' +
      '<span class="ico" style="width:40px;height:40px;border-radius:11px;background:var(--acao-suave);color:var(--acao);display:grid;place-items:center;flex:none">' + ic('copiar') + '</span>' +
      '<span style="flex:1"><b style="display:block">Começar copiando ' + br(ant.data) + '</b><span style="font-size:13px;color:var(--tinta2)">' +
      'Traz equipe, equipamentos e os serviços que ficaram em andamento</span></span>' + ic('seta') + '</button>';
  }

  h += '<div class="grade2" id="cartoes">' + secoesVisiveis(o, r).map(s => cartao(s, r, o)).join('') + '</div>';
  h += '</main>' + barraRdo(o, r);
  App.aposRender = () => { carregarMiniaturas(); montarAssinaturas(); };
  return h;
}

function barraRdo(o, r) {
  const vis = secoesVisiveis(o, r), ok = vis.filter(s => preenchida(s, r)).length;
  return '<div class="barra-acao"><div class="dentro">' +
    '<div class="progresso" id="prog"><b class="num">' + ok + '/' + vis.length + '</b>blocos</div>' +
    '<button class="btn ' + (ok === vis.length ? 'verde' : 'pri') + '" data-a="concluir" id="btConcluir">' + ic('ok') +
    (r.status === 'concluido' ? 'Salvar e fechar' : 'Concluir o dia') + '</button></div></div>';
}

function cartao(sec, r, o) {
  const def = SECOES.find(s => s[0] === sec);
  const ok = preenchida(sec, r);
  return '<section class="cartao' + (['atividades','fotos','observacoes'].includes(sec) ? ' larga' : '') + '" id="c-' + sec + '">' +
    '<div class="cartao-cab"><div class="ico">' + ic(def[2]) + '</div><h2>' + def[1] +
    '<span class="resumo">' + esc(resumoSecao(sec, r)) + '</span></h2>' +
    (ok ? '<span class="marca-ok" title="preenchido">' + ic('ok') + '</span>' : '<span class="marca-vazia" title="não preenchido"></span>') +
    '</div><div class="cartao-corpo">' + corpoSecao(sec, r, o) + '</div></section>';
}

function resumoSecao(sec, r) {
  const n = r.nada || {};
  switch (sec) {
    case 'clima': return r.clima.houve === false ? 'Sem expediente' + (r.clima.motivo ? ' — ' + r.clima.motivo : '') :
      [r.clima.manha && 'manhã: ' + rotClima(r.clima.manha), r.clima.tarde && 'tarde: ' + rotClima(r.clima.tarde)].filter(Boolean).join(' · ');
    case 'maoDeObra': { const t = totalMao(r); return t ? t + ' trabalhador' + (t > 1 ? 'es' : '') : ''; }
    case 'atividades': return r.atividades.length ? r.atividades.length + ' serviço(s)' : '';
    case 'equipamentos': { const t = Object.values(r.equipamentos).reduce((a, b) => a + (+b || 0), 0); return t ? t + ' em uso' : n.equipamentos ? 'nenhum hoje' : ''; }
    case 'fotos': return r.fotos.length ? r.fotos.length + ' foto(s)' : n.fotos ? 'sem fotos hoje' : '';
    case 'ocorrencias': return r.ocorrencias.length ? r.ocorrencias.length + ' registrada(s)' : n.ocorrencias ? 'nenhuma' : '';
    case 'seguranca': return [r.seguranca.dds === true ? 'DDS feito' : r.seguranca.dds === false ? 'sem DDS' : '',
      r.seguranca.acidente === true ? 'COM acidente' : r.seguranca.acidente === false ? 'sem acidente' : ''].filter(Boolean).join(' · ');
    case 'materiais': return r.materiais.length ? r.materiais.length + ' recebimento(s)' : n.materiais ? 'nenhum' : '';
    case 'visitas': return r.visitas.length ? r.visitas.length + ' visita(s)' : n.visitas ? 'nenhuma' : '';
    case 'observacoes': return (r.observacoes || '').trim() ? 'preenchido' : n.observacoes ? 'nada a observar' : '';
    case 'assinaturas': return r.assinaturas.responsavel.img ? 'assinado' + (r.assinaturas.fiscal.img ? ' (com fiscal)' : '') : '';
  }
  return '';
}
const rotClima = v => (CLIMA.find(c => c[0] === v) || [, ''])[1];

const botaoNada = (sec, r, txt) => (r.nada || {})[sec]
  ? '<button class="chip on" data-a="nada" data-sec="' + sec + '" style="margin-top:9px">' + ic('ok') + txt + '</button>'
  : '<button class="chip" data-a="nada" data-sec="' + sec + '" style="margin-top:9px">' + txt + '</button>';

function passo(acao, chave, v, extra) {
  return '<div class="passo"><button data-a="' + acao + '" data-k="' + esc(chave) + '" data-d="-1"' + (extra || '') + ' aria-label="menos">−</button>' +
    '<span class="num">' + (v || 0) + '</span><button data-a="' + acao + '" data-k="' + esc(chave) + '" data-d="1"' + (extra || '') + ' aria-label="mais">+</button></div>';
}

/* fileira de números: toca no 2 = 2 pessoas. De 8 em diante, o + continua contando. */
const qtdNova = (atual, el, max) => lim(el.dataset.v != null ? +el.dataset.v : (+atual || 0) + (+el.dataset.d), 0, max);
function numeros(acao, chave, v) {
  v = +v || 0;
  const at = ' data-a="' + acao + '" data-k="' + esc(chave) + '"';
  let h = '<div class="nums">';
  for (let n = 0; n <= 7; n++) h += '<button class="' + (v === n ? 'on' : '') + '"' + at + ' data-v="' + n + '">' + n + '</button>';
  if (v > 7) h += '<span class="grande on"><button' + at + ' data-d="-1" aria-label="menos um">−</button><b>' + v + '</b>' +
    '<button' + at + ' data-d="1" aria-label="mais um">+</button></span>';
  else h += '<button class="mais1"' + at + ' data-v="8" aria-label="8 ou mais">8+</button>';
  return h + '</div>';
}

const seletor = (acao, id, valor, vazio) => '<button class="seletor' + (valor ? '' : ' vazio') + '" data-a="' + acao + '" data-id="' + id + '">' +
  '<span>' + esc(valor || vazio) + '</span>' + ic('seta') + '</button>';

function corpoSecao(sec, r, o) {
  const n = r.nada || {};
  switch (sec) {
  case 'clima': {
    let h = '<div class="seg" style="margin-bottom:12px">' +
      '<button class="' + (r.clima.houve !== false ? 'on sim' : '') + '" data-a="houve" data-v="1">' + ic('capacete') + 'Teve trabalho</button>' +
      '<button class="' + (r.clima.houve === false ? 'on nao' : '') + '" data-a="houve" data-v="0">' + ic('x') + 'Não teve</button></div>';
    if (r.clima.houve === false) {
      return h + '<label class="rot">Motivo</label><div class="chips">' + MOTIVOS_PARADA.map(m =>
        '<button class="chip ' + (r.clima.motivo === m ? 'on' : '') + '" data-a="motivo" data-v="' + m + '">' + m + '</button>').join('') + '</div>';
    }
    ['manha', 'tarde'].forEach(t => {
      h += '<label class="rot">' + (t === 'manha' ? 'Manhã' : 'Tarde') + '</label><div class="seg">' +
        CLIMA.map(c => '<button class="' + (r.clima[t] === c[0] ? 'on' : '') + '" data-a="clima" data-t="' + t + '" data-v="' + c[0] + '">' +
          ic(c[2]) + c[1] + '</button>').join('') + '</div>';
    });
    h += '<div style="display:flex;align-items:center;gap:10px;margin-top:12px"><span style="flex:1;font-size:14.5px">Horas paradas por chuva</span>' +
      passo('horas', 'h', r.clima.horasParadas) + '</div>';
    if (r.clima.chuvaMm != null) h += '<p class="dica">' + ic('chuva') + 'Chuva registrada no dia: ' + String(r.clima.chuvaMm).replace('.', ',') + ' mm</p>';
    h += '<button class="btn fant" data-a="climaAuto" style="margin-top:6px;padding-left:0">' + ic('local') +
      (o.cidade ? 'Buscar o clima de ' + esc(o.cidade) : 'Clima automático (cadastre a cidade da obra)') + '</button>';
    return h;
  }
  case 'maoDeObra': {
    const funcs = Object.keys(r.maoDeObra);
    let h = funcs.map(f => '<div class="linha-num' + (r.maoDeObra[f] ? '' : ' zero') + '"><span class="nome">' + esc(f) + '</span>' +
      numeros('mao', f, r.maoDeObra[f]) + '</div>').join('');
    h += '<button class="mais" style="margin-top:10px" data-a="addFuncao">' + ic('mais') + 'Outra função</button>';
    if (r.terceiros.length) {
      h += '<label class="rot">Terceirizados</label>' + r.terceiros.map(t => '<div class="item"><div class="item-topo"><b>' + esc(t.empresa || 'Empresa') + '</b>' +
        '<button class="x" data-a="rmLista" data-lista="terceiros" data-id="' + t.id + '">' + ic('x') + '</button></div>' +
        '<input class="campo" placeholder="Empresa" value="' + esc(t.empresa) + '" data-c="campoLista" data-lista="terceiros" data-id="' + t.id + '" data-k="empresa">' +
        '<input class="campo" style="margin-top:8px" placeholder="Serviço" value="' + esc(t.servico) +
        '" data-c="campoLista" data-lista="terceiros" data-id="' + t.id + '" data-k="servico">' +
        '<div class="linha-num"><span class="nome">Pessoas</span>' + numeros('terc', t.id, t.qtd) + '</div></div>').join('');
    }
    h += '<button class="mais" style="margin-top:8px" data-a="addTerceiro">' + ic('mais') + 'Empresa terceirizada</button>';
    h += '<div class="total"><span>Total no canteiro</span><span class="num">' + totalMao(r) + '</span></div>';
    return h;
  }
  case 'atividades': {
    let h = r.atividades.map((a, i) => '<div class="item"><div class="item-topo"><b>Serviço ' + (i + 1) + '</b>' +
      '<button class="x" data-a="rmLista" data-lista="atividades" data-id="' + a.id + '" aria-label="Remover">' + ic('x') + '</button></div>' +
      seletor('frente', a.id, a.frente, 'Escolher a frente de serviço') +
      '<textarea class="campo" style="min-height:70px" placeholder="O que foi feito (ex.: alvenaria do bloco A, 1º pavimento)" data-c="campoLista" data-lista="atividades" data-id="' +
        a.id + '" data-k="descricao">' + esc(a.descricao) + '</textarea>' +
      '<div class="seg" style="margin-top:8px">' + STATUS_ATIV.map(s => '<button class="' + (a.status === s[0] ? 'on' : '') +
        '" data-a="statusAtiv" data-id="' + a.id + '" data-v="' + s[0] + '" style="font-size:12.5px;padding:8px 2px">' + s[1] + '</button>').join('') + '</div></div>').join('');
    h += '<button class="mais" data-a="addAtividade">' + ic('mais') + 'Adicionar serviço</button>';
    h += '<p class="dica">' + ic('mic') + 'No celular, toque no microfone do teclado para ditar em vez de digitar.</p>';
    return h;
  }
  case 'equipamentos': {
    let h = Object.keys(r.equipamentos).map(e => '<div class="linha-num' + (r.equipamentos[e] ? '' : ' zero') + '"><span class="nome">' + esc(e) + '</span>' +
      numeros('equip', e, r.equipamentos[e]) + '</div>').join('');
    h += '<button class="mais" style="margin-top:10px" data-a="addEquip">' + ic('mais') + 'Outro equipamento</button>';
    if (!Object.values(r.equipamentos).some(v => v > 0)) h += botaoNada('equipamentos', r, 'Nenhum equipamento hoje');
    return h;
  }
  case 'fotos': {
    let h = '<div class="camera"><label class="btn pri">' + ic('camera') + 'Tirar foto<input type="file" accept="image/*" capture="environment" multiple data-c="foto"></label>' +
      '<label class="btn sec">' + ic('galeria') + 'Da galeria<input type="file" accept="image/*" multiple data-c="foto"></label></div>';
    h += '<div id="fotoStatus"></div>';
    if (r.fotos.length) h += '<div class="galeria">' + r.fotos.map(f => '<button class="foto" data-a="editarFoto" data-id="' + f.id + '">' +
      '<img data-foto="' + f.id + '" alt="' + esc(f.legenda || 'foto') + '"><span class="leg">' + esc(f.legenda || 'toque para legendar') + '</span></button>').join('') + '</div>';
    else h += botaoNada('fotos', r, 'Sem fotos hoje');
    return h;
  }
  case 'ocorrencias': {
    let h = r.ocorrencias.map(x => '<div class="item"><div class="item-topo"><b>' + esc(x.tipo || 'Ocorrência') + '</b>' +
      '<button class="x" data-a="rmLista" data-lista="ocorrencias" data-id="' + x.id + '">' + ic('x') + '</button></div>' +
      seletor('tipoOcor', x.id, x.tipo, 'Escolher o tipo de ocorrência') +
      '<textarea class="campo" style="min-height:64px" placeholder="O que aconteceu e o que foi feito" data-c="campoLista" data-lista="ocorrencias" data-id="' +
        x.id + '" data-k="descricao">' + esc(x.descricao) + '</textarea>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-top:8px"><span style="flex:1;font-size:14px">Dias de atraso que isso causa</span>' +
        passo('impacto', x.id, x.impacto) + '</div></div>').join('');
    h += '<button class="mais" data-a="addOcorrencia">' + ic('mais') + 'Registrar ocorrência</button>';
    if (!r.ocorrencias.length) h += botaoNada('ocorrencias', r, 'Sem ocorrências hoje');
    return h;
  }
  case 'seguranca': {
    const s = r.seguranca;
    const sn = (k, rot) => '<label class="rot">' + rot + '</label><div class="seg"><button class="' + (s[k] === true ? 'on sim' : '') +
      '" data-a="seg" data-k="' + k + '" data-v="1">Sim</button><button class="' + (s[k] === false ? 'on nao' : '') +
      '" data-a="seg" data-k="' + k + '" data-v="0">Não</button></div>';
    let h = sn('dds', 'Teve DDS (diálogo de segurança)?');
    if (s.dds) h += '<div class="chips" style="margin-top:9px">' + TEMAS_DDS.map(t => '<button class="chip ' + (s.tema === t ? 'on' : '') +
      '" data-a="temaDds" data-v="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>';
    h += sn('acidente', 'Houve acidente ou incidente?');
    if (s.acidente) h += '<textarea class="campo" style="margin-top:9px" placeholder="Quem, o que houve, providência, CAT emitida?" data-c="segTxt">' +
      esc(s.descAcidente) + '</textarea>';
    return h;
  }
  case 'materiais': {
    let h = r.materiais.map(m => '<div class="item"><div class="item-topo"><b>' + esc(m.material || 'Material') + '</b>' +
      '<button class="x" data-a="rmLista" data-lista="materiais" data-id="' + m.id + '">' + ic('x') + '</button></div>' +
      ['material:Material', 'qtd:Quantidade', 'fornecedor:Fornecedor', 'nf:Nota fiscal'].map(c => { const [k, p] = c.split(':');
        return '<input class="campo" style="margin-bottom:6px" placeholder="' + p + '" value="' + esc(m[k]) + '" data-c="campoLista" data-lista="materiais" data-id="' + m.id + '" data-k="' + k + '">'; }).join('') + '</div>').join('');
    h += '<button class="mais" data-a="addMaterial">' + ic('mais') + 'Registrar recebimento</button>';
    if (!r.materiais.length) h += botaoNada('materiais', r, 'Nenhum recebimento hoje');
    return h;
  }
  case 'visitas': {
    let h = r.visitas.map(v => '<div class="item"><div class="item-topo"><b>' + esc(v.nome || 'Visitante') + '</b>' +
      '<button class="x" data-a="rmLista" data-lista="visitas" data-id="' + v.id + '">' + ic('x') + '</button></div>' +
      '<input class="campo" style="margin-bottom:6px" placeholder="Nome" value="' + esc(v.nome) + '" data-c="campoLista" data-lista="visitas" data-id="' + v.id + '" data-k="nome">' +
      '<input class="campo" style="margin-bottom:8px" placeholder="Empresa / órgão" value="' + esc(v.empresa) + '" data-c="campoLista" data-lista="visitas" data-id="' + v.id + '" data-k="empresa">' +
      seletor('motivoVisita', v.id, v.motivo, 'Motivo da visita') + '</div>').join('');
    h += '<button class="mais" data-a="addVisita">' + ic('mais') + 'Registrar visita</button>';
    if (!r.visitas.length) h += botaoNada('visitas', r, 'Sem visitas hoje');
    return h;
  }
  case 'observacoes': {
    let h = '<textarea class="campo" placeholder="Comunicações à fiscalização, determinações recebidas, pendências…" data-c="obs">' + esc(r.observacoes) + '</textarea>' +
      '<p class="dica">' + ic('mic') + 'Dá para ditar pelo microfone do teclado.</p>';
    if (!(r.observacoes || '').trim()) h += botaoNada('observacoes', r, 'Nada a observar');
    return h;
  }
  case 'assinaturas': {
    return ['responsavel', 'fiscal'].map(q => {
      const a = r.assinaturas[q];
      return '<label class="rot">' + (q === 'responsavel' ? 'Responsável técnico' : 'Fiscalização (opcional)') + '</label>' +
        '<input class="campo" style="margin-bottom:8px" placeholder="Nome" value="' + esc(a.nome) + '" data-c="assNome" data-q="' + q + '">' +
        (a.img ? '<img class="assin-img" src="' + a.img + '" alt="assinatura"><button class="btn fant" data-a="refazerAss" data-q="' + q + '">Assinar de novo</button>'
               : '<canvas class="assin" data-ass="' + q + '"></canvas><div style="display:flex;gap:8px;margin-top:6px">' +
                 '<button class="btn fant" data-a="limparAss" data-q="' + q + '">Limpar</button><span style="flex:1"></span>' +
                 '<button class="btn sec" data-a="salvarAss" data-q="' + q + '">' + ic('ok') + 'Confirmar assinatura</button></div>');
    }).join('<div style="height:8px"></div>');
  }
  }
  return '';
}

/* ---------------- gravação automática ---------------- */
/* A memória é atualizada na hora; só a escrita em disco espera um instante
 * (um cronômetro por dia, para trocar de dia rápido não descartar nada). */
const _tGrava = {};
function alterado(secRedesenhar) {
  const r = App.rdoAtual;
  r.atualizadoEm = new Date().toISOString();
  const k = chaveRdo(r.obraId, r.data);
  App.rdos[k] = JSON.parse(JSON.stringify(r));
  if (secRedesenhar) redesenhar(secRedesenhar);
  atualizarBarra();
  const s = $('#salvo'); if (s) s.textContent = 'Salvando…';
  clearTimeout(_tGrava[k]);
  _tGrava[k] = setTimeout(() => {
    delete _tGrava[k];
    Banco.gravar('rdos', k, App.rdos[k]).then(() => { const s2 = $('#salvo'); if (s2) s2.textContent = 'Salvo ✓'; })
      .catch(e => { toast('ERRO AO SALVAR: ' + e.message, 5000); });
  }, 400);
}
/* Se a pessoa fechar a aba no meio, grava o que estiver pendente. */
window.addEventListener('pagehide', () => Object.keys(_tGrava).forEach(k => { clearTimeout(_tGrava[k]); Banco.gravar('rdos', k, App.rdos[k]); }));
document.addEventListener('visibilitychange', () => { if (document.hidden) Object.keys(_tGrava).forEach(k => { clearTimeout(_tGrava[k]); delete _tGrava[k]; Banco.gravar('rdos', k, App.rdos[k]); }); });
function redesenhar(sec) {
  const r = App.rdoAtual, o = App.obraAtual;
  if (sec === '*') {
    $('#cartoes').innerHTML = secoesVisiveis(o, r).map(s => cartao(s, r, o)).join('');
    carregarMiniaturas(); montarAssinaturas(); return;
  }
  const el = $('#c-' + sec); if (!el) return;
  const novo = document.createElement('div'); novo.innerHTML = cartao(sec, r, o);
  el.replaceWith(novo.firstChild);
  if (sec === 'fotos') carregarMiniaturas();
  if (sec === 'assinaturas') montarAssinaturas();
}
function atualizarBarra() {
  const r = App.rdoAtual, o = App.obraAtual;
  const vis = secoesVisiveis(o, r), ok = vis.filter(s => preenchida(s, r)).length;
  const p = $('#prog'); if (p) p.innerHTML = '<b class="num">' + ok + '/' + vis.length + '</b>blocos';
  const b = $('#btConcluir'); if (b) b.className = 'btn ' + (ok === vis.length ? 'verde' : 'pri');
  vis.forEach(s => {
    const c = $('#c-' + s); if (!c) return;
    const m = c.querySelector('.marca-ok,.marca-vazia');
    if (m) m.outerHTML = preenchida(s, r) ? '<span class="marca-ok">' + ic('ok') + '</span>' : '<span class="marca-vazia"></span>';
    const rs = c.querySelector('.resumo'); if (rs) rs.textContent = resumoSecao(s, r);
  });
}

/* ---------------- concluir ---------------- */
function concluirDia() {
  const r = App.rdoAtual, o = App.obraAtual;
  const faltam = secoesVisiveis(o, r).filter(s => !preenchida(s, r));
  const fechar = () => {
    r.status = 'concluido'; r.concluidoEm = r.concluidoEm || new Date().toISOString();
    alterado();
    setTimeout(() => { toast('Diário de ' + br(r.data) + ' fechado'); ir('#/obra/' + o.id + '/diario'); }, 500);
  };
  if (!faltam.length) return fechar();
  abrirFolha('<h3>Ficaram ' + faltam.length + ' bloco(s) sem preencher</h3>' +
    '<p style="color:var(--tinta2);margin:0 0 10px;font-size:14.5px">Nada é obrigatório. Você pode completar agora ou fechar assim mesmo.</p>' +
    faltam.map(s => { const d = SECOES.find(x => x[0] === s);
      return '<button class="item" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left" data-a="irSecao" data-s="' + s + '">' +
        '<span class="ico" style="width:32px;height:32px;display:grid;place-items:center;color:var(--aco)">' + ic(d[2]) + '</span>' +
        '<b style="flex:1">' + d[1] + '</b><span style="color:var(--acao);font-weight:600;font-size:14px">Preencher</span></button>'; }).join('') +
    '<div style="display:flex;gap:9px;margin-top:12px"><button class="btn sec" style="flex:1" data-a="fecharFolha">Voltar</button>' +
    '<button class="btn verde" style="flex:1" data-a="fecharMesmoAssim">Fechar assim mesmo</button></div>',
    f => { App._fechar = fechar; });
}
