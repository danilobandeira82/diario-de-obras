/* =====================================================================
 * AÇÕES — todo clique e toda digitação passam por aqui
 * ===================================================================== */
const R = () => App.rdoAtual;
const achar = (lista, id) => R()[lista].find(x => x.id === id);
const lim = (n, a, b) => Math.max(a, Math.min(b, n));

const A = {
  ir: el => ir(el.dataset.h),
  voltar: el => { if (history.length > 1 && document.referrer !== '') history.back(); else ir(el.dataset.h); },
  fecharFolha: () => fecharFolha(),
  mes: el => { const d = +el.dataset.d; let [a, m] = App.mes; m += d; if (m < 0) { m = 11; a--; } if (m > 11) { m = 0; a++; } App.mes = [a, m]; render(); },
  exemplo: () => criarExemplo().then(() => { toast('Obra de exemplo criada'); render(); }),

  /* ---- obra ---- */
  tipoObra: el => { document.querySelectorAll('#tipoObra .chip').forEach(c => c.classList.toggle('on', c === el));
    $('#formObra [name=tipo]').value = el.dataset.v; },
  salvarObra: el => {
    const f = $('#formObra'), d = {};
    new FormData(f).forEach((v, k) => d[k] = String(v).trim());
    if (!d.nome) return toast('Informe o nome da obra');
    if (!d.inicio) return toast('Informe a data de início');
    const id = el.dataset.id;
    const o = id ? obraPor(id) : { id: uid(), criadaEm: new Date().toISOString(), docs: [],
      equipePadrao: EQUIPE_PADRAO.slice(), equipPadrao: EQUIP_PADRAO.slice(), secoes: Object.assign({}, SECOES_PADRAO) };
    if (o.cidade !== d.cidade) { delete o.lat; delete o.lon; }
    Object.assign(o, d);
    if (!id) App.obras.push(o);
    salvarObra(o).then(() => { toast(id ? 'Obra atualizada' : 'Obra cadastrada'); ir('#/obra/' + o.id + (id ? '/cadastro' : '/cadastro')); });
  },
  toggleLista: el => {
    const o = obraPor(App.rota.id), c = el.dataset.campo, v = el.dataset.v;
    o[c] = o[c] || [];
    o[c] = o[c].includes(v) ? o[c].filter(x => x !== v) : o[c].concat(v);
    el.classList.toggle('on'); salvarObra(o);
  },
  toggleSecao: el => {
    const o = obraPor(App.rota.id);
    o.secoes = Object.assign({}, SECOES_PADRAO, o.secoes || {});
    o.secoes[el.dataset.s] = !o.secoes[el.dataset.s];
    el.classList.toggle('on'); salvarObra(o);
  },
  arquivarObra: () => { const o = obraPor(App.rota.id); o.arquivada = !o.arquivada; salvarObra(o).then(() => { toast(o.arquivada ? 'Obra arquivada' : 'Obra reativada'); ir('#/'); }); },
  excluirObra: () => {
    const o = obraPor(App.rota.id);
    confirmar('Excluir "' + o.nome + '"?', 'Apaga a obra e TODOS os diários, fotos e documentos dela neste aparelho. Não dá para desfazer. Se tiver dúvida, faça uma cópia de segurança antes.', 'Excluir tudo', true)
      .then(ok => { if (!ok) return;
        const rs = rdosDa(o.id), ps = [];
        rs.forEach(r => { (r.fotos || []).forEach(f => ps.push(Banco.apagar('fotos', f.id))); const k = chaveRdo(r.obraId, r.data); delete App.rdos[k]; ps.push(Banco.apagar('rdos', k)); });
        (o.docs || []).forEach(d => ps.push(Banco.apagar('docs', d.id)));
        ps.push(Banco.apagar('obras', o.id));
        App.obras = App.obras.filter(x => x.id !== o.id);
        Promise.all(ps).then(() => { toast('Obra excluída'); ir('#/'); });
      });
  },
  abrirDoc: el => Banco.ler('docs', el.dataset.id).then(d => { if (!d) return toast('Arquivo não encontrado');
    const u = URL.createObjectURL(d.blob); const w = window.open(u, '_blank'); if (!w) baixarArquivo(d.nome, d.blob); }),
  apagarDoc: el => confirmar('Remover documento?', 'O arquivo sai deste aparelho.', 'Remover', true).then(ok => { if (!ok) return;
    const o = obraPor(App.rota.id); o.docs = o.docs.filter(d => d.id !== el.dataset.id);
    Promise.all([Banco.apagar('docs', el.dataset.id), salvarObra(o)]).then(render); }),

  /* ---- diário: clima ---- */
  houve: el => { R().clima.houve = el.dataset.v === '1'; if (R().clima.houve) R().clima.motivo = ''; alterado('*'); },
  motivo: el => { R().clima.motivo = el.dataset.v; alterado('clima'); },
  clima: el => { R().clima[el.dataset.t] = el.dataset.v; alterado('clima'); },
  horas: el => { R().clima.horasParadas = lim((+R().clima.horasParadas || 0) + (+el.dataset.d), 0, 12); alterado('clima'); },
  climaAuto: () => preencherClima(),

  /* ---- mão de obra / equipamentos ---- */
  mao: el => { const m = R().maoDeObra; m[el.dataset.k] = lim((+m[el.dataset.k] || 0) + (+el.dataset.d), 0, 500); alterado('maoDeObra'); },
  equip: el => { const m = R().equipamentos; m[el.dataset.k] = lim((+m[el.dataset.k] || 0) + (+el.dataset.d), 0, 99);
    if (m[el.dataset.k] > 0) delete R().nada.equipamentos; alterado('equipamentos'); },
  terc: el => { const t = achar('terceiros', el.dataset.k); t.qtd = lim((+t.qtd || 0) + (+el.dataset.d), 0, 500); alterado('maoDeObra'); },
  addFuncao: () => escolherDaLista('Qual função?', FUNCOES.filter(f => !(f in R().maoDeObra)), f => { R().maoDeObra[f] = 1; alterado('maoDeObra'); }),
  addEquip: () => escolherDaLista('Qual equipamento?', EQUIPAMENTOS.filter(f => !(f in R().equipamentos)), f => { R().equipamentos[f] = 1; delete R().nada.equipamentos; alterado('equipamentos'); }, true),
  addTerceiro: () => { R().terceiros.push({ id: uid(), empresa: '', servico: '', qtd: 1 }); alterado('maoDeObra'); },

  /* ---- listas ---- */
  addAtividade: () => {
    const nova = { id: uid(), frente: '', descricao: '', status: 'andamento' };
    escolherDaLista('Frente de serviço', FRENTES, v => {
      nova.frente = v; R().atividades.push(nova); alterado('atividades');
      setTimeout(() => { const t = document.querySelectorAll('#c-atividades textarea'); if (t.length) t[t.length - 1].focus(); }, 60);
    }, true);
  },
  frente: el => escolherDaLista('Frente de serviço', FRENTES, v => { achar('atividades', el.dataset.id).frente = v; alterado('atividades'); }, true),
  statusAtiv: el => { achar('atividades', el.dataset.id).status = el.dataset.v; alterado('atividades'); },
  addOcorrencia: () => { R().ocorrencias.push({ id: uid(), tipo: '', descricao: '', impacto: 0 }); delete R().nada.ocorrencias; alterado('ocorrencias'); },
  tipoOcor: el => escolherDaLista('Tipo de ocorrência', OCORRENCIAS, v => { achar('ocorrencias', el.dataset.id).tipo = v; alterado('ocorrencias'); }, true),
  impacto: el => { const x = achar('ocorrencias', el.dataset.k); x.impacto = lim((+x.impacto || 0) + (+el.dataset.d), 0, 60); alterado('ocorrencias'); },
  addMaterial: () => { R().materiais.push({ id: uid(), material: '', qtd: '', fornecedor: '', nf: '' }); delete R().nada.materiais; alterado('materiais'); },
  addVisita: () => { R().visitas.push({ id: uid(), nome: '', empresa: '', motivo: '' }); delete R().nada.visitas; alterado('visitas'); },
  motivoVisita: el => escolherDaLista('Motivo da visita', MOTIVOS_VISITA, v => { achar('visitas', el.dataset.id).motivo = v; alterado('visitas'); }, true),
  rmLista: el => { const l = el.dataset.lista; R()[l] = R()[l].filter(x => x.id !== el.dataset.id);
    alterado(l === 'terceiros' ? 'maoDeObra' : l); },
  nada: el => { const s = el.dataset.sec; R().nada[s] = !R().nada[s]; alterado(s); },

  /* ---- segurança ---- */
  seg: el => { R().seguranca[el.dataset.k] = el.dataset.v === '1'; alterado('seguranca'); },
  temaDds: el => { R().seguranca.tema = el.dataset.v; alterado('seguranca'); },

  /* ---- fotos ---- */
  editarFoto: el => {
    const f = R().fotos.find(x => x.id === el.dataset.id);
    urlFoto(f.id).then(u => abrirFolha('<img src="' + u + '" alt="" style="width:100%;border-radius:12px;max-height:55vh;object-fit:contain;background:#000">' +
      '<label class="rot">Legenda</label><input class="campo" id="legFoto" value="' + esc(f.legenda || '') + '" placeholder="Ex.: concretagem da laje do 2º pavimento">' +
      '<div class="chips" style="margin-top:8px">' + FRENTES.slice(0, 12).map(x => '<button class="chip" data-a="legRapida" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' +
      '<div style="display:flex;gap:9px;margin-top:14px"><button class="btn sec" style="color:var(--erro)" data-a="apagarFoto" data-id="' + f.id + '">' + ic('lixo') + '</button>' +
      '<button class="btn pri" style="flex:1" data-a="salvarLegenda" data-id="' + f.id + '">' + ic('ok') + 'Salvar legenda</button></div>'));
  },
  legRapida: el => { const i = $('#legFoto'); i.value = i.value ? i.value + ' — ' + el.dataset.v : el.dataset.v; i.focus(); },
  salvarLegenda: el => { R().fotos.find(x => x.id === el.dataset.id).legenda = $('#legFoto').value.trim(); fecharFolha(); alterado('fotos'); },
  apagarFoto: el => { R().fotos = R().fotos.filter(x => x.id !== el.dataset.id); Banco.apagar('fotos', el.dataset.id); fecharFolha(); alterado('fotos'); },
  verFoto: el => urlFoto(el.dataset.id).then(u => abrirFolha('<img src="' + u + '" alt="" style="width:100%;border-radius:12px;max-height:70vh;object-fit:contain;background:#000">' +
    (el.dataset.leg ? '<p style="margin:10px 0 0">' + esc(el.dataset.leg) + '</p>' : ''))),

  /* ---- assinaturas ---- */
  limparAss: el => { const c = document.querySelector('canvas[data-ass="' + el.dataset.q + '"]'); if (c && c._limpar) c._limpar(); },
  salvarAss: el => { const c = document.querySelector('canvas[data-ass="' + el.dataset.q + '"]');
    if (!c || !c._temTraco) return toast('Assine no quadro antes de confirmar');
    R().assinaturas[el.dataset.q].img = c._imagem(); alterado('assinaturas'); },
  refazerAss: el => { R().assinaturas[el.dataset.q].img = ''; alterado('assinaturas'); },

  /* ---- concluir ---- */
  copiarAnterior: () => copiarAnterior(),
  concluir: () => concluirDia(),
  irSecao: el => { fecharFolha(); const c = $('#c-' + el.dataset.s); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); c.style.boxShadow = '0 0 0 3px var(--acao)'; setTimeout(() => c.style.boxShadow = '', 1800); } },
  fecharMesmoAssim: () => { fecharFolha(); if (App._fechar) App._fechar(); },

  /* ---- relatórios / config ---- */
  pdf: el => gerarPdf(el.dataset),
  pdfPeriodo: () => gerarPdf({ ini: $('#pIni').value, fim: $('#pFim').value, rotulo: 'Período ' + br($('#pIni').value) + ' a ' + br($('#pFim').value), fotos: $('#pFotos').checked ? '1' : '0' }),
  excel: () => gerarExcel(obraPor(App.rota.id)),
  backup: () => salvarBackup(),
  testar: () => testarAparelho()
};

function escolherDaLista(titulo, itens, aoEscolher, livre) {
  abrirFolha('<h3>' + esc(titulo) + '</h3>' +
    '<input class="campo" id="filtroLista" placeholder="Procurar ou digitar um novo…" style="margin-bottom:10px">' +
    '<div class="chips" id="listaEsc">' + itens.map(f => '<button class="chip" data-v="' + esc(f) + '">' + esc(f) + '</button>').join('') + '</div>' +
    '<button class="btn sec cheio" id="usarDigitado" style="margin-top:12px;display:none"></button>',
    f => {
      const filtro = $('#filtroLista', f), usar = $('#usarDigitado', f);
      f.querySelectorAll('#listaEsc .chip').forEach(c => c.onclick = () => { fecharFolha(); aoEscolher(c.dataset.v); });
      filtro.oninput = () => {
        const t = filtro.value.trim().toLowerCase();
        f.querySelectorAll('#listaEsc .chip').forEach(c => c.style.display = c.dataset.v.toLowerCase().includes(t) ? '' : 'none');
        usar.style.display = t ? '' : 'none'; usar.textContent = 'Usar "' + filtro.value.trim() + '"';
      };
      usar.onclick = () => { const v = filtro.value.trim(); if (v) { fecharFolha(); aoEscolher(v); } };
    });
}

function copiarAnterior() {
  const o = App.obraAtual, r = R();
  const ant = rdosDa(o.id).filter(x => x.data < r.data).sort((a, b) => b.data < a.data ? -1 : 1)[0];
  if (!ant) return;
  const c = JSON.parse(JSON.stringify(ant));
  r.maoDeObra = c.maoDeObra; r.terceiros = c.terceiros.map(t => Object.assign(t, { id: uid() }));
  r.equipamentos = c.equipamentos;
  r.atividades = c.atividades.filter(a => a.status !== 'concluida').map(a => Object.assign(a, { id: uid(), status: 'andamento' }));
  r.assinaturas.responsavel.nome = c.assinaturas.responsavel.nome || r.assinaturas.responsavel.nome;
  r.clima.houve = true;
  alterado();
  toast('Copiado de ' + br(ant.data) + ' — revise o que mudou');
  render();
}

/* ---- cliques ---- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.a];
  if (fn) { e.preventDefault(); fn(el); }
});

/* ---- digitação e arquivos ---- */
document.addEventListener('input', e => {
  const el = e.target, c = el.dataset && el.dataset.c;
  if (!c) return;
  if (c === 'campoLista') { const x = achar(el.dataset.lista, el.dataset.id); x[el.dataset.k] = el.value; alterado(); }
  else if (c === 'obs') { R().observacoes = el.value; if (el.value.trim()) delete R().nada.observacoes; alterado(); }
  else if (c === 'segTxt') { R().seguranca.descAcidente = el.value; alterado(); }
  else if (c === 'assNome') { R().assinaturas[el.dataset.q].nome = el.value; alterado(); }
  else if (c === 'cfg') { App.config[el.dataset.k] = el.value; clearTimeout(A._tc); A._tc = setTimeout(salvarConfig, 400); }
});

document.addEventListener('change', e => {
  const el = e.target, c = el.dataset && el.dataset.c;
  if (!c || !el.files) return;
  const arqs = Array.from(el.files); el.value = '';
  if (!arqs.length) return;

  if (c === 'foto') {
    const r = R(), st = $('#fotoStatus');
    let i = 0;
    const prox = () => {
      if (i >= arqs.length) { if (st) st.innerHTML = ''; delete r.nada.fotos; alterado('fotos'); return; }
      if (st) st.innerHTML = '<p class="dica">Guardando foto ' + (i + 1) + ' de ' + arqs.length + '…</p>';
      comprimirFoto(arqs[i]).then(blob => {
        const id = uid();
        return Banco.gravar('fotos', id, { id, obraId: r.obraId, data: r.data, blob }).then(() => r.fotos.push({ id, legenda: '' }));
      }).then(() => { i++; prox(); }).catch(err => { toast('Foto não salva: ' + err.message, 4000); i++; prox(); });
    };
    prox();
  }
  else if (c === 'anexarDoc') {
    const o = obraPor(App.rota.id), tipo = $('#docTipo').value, a = arqs[0];
    if (a.size > 50 * 1048576) return toast('Arquivo acima de 50 MB');
    const id = uid();
    Banco.gravar('docs', id, { id, nome: a.name, tipo: a.type, blob: a }).then(() => {
      o.docs = (o.docs || []).concat({ id, tipo, nome: a.name, tamanho: a.size, em: hojeIso() });
      return salvarObra(o);
    }).then(() => { toast(tipo + ' anexado'); render(); }).catch(err => toast('Não foi possível anexar: ' + err.message, 4000));
  }
  else if (c === 'logo') {
    comprimirFoto(arqs[0], 500).then(blobParaUrl).then(u => { App.config.logo = u; return salvarConfig(); }).then(() => { toast('Logo salvo'); render(); });
  }
  else if (c === 'restaurar') restaurarBackup(arqs[0]);
});
