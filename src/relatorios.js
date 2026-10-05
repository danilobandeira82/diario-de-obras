/* =====================================================================
 * RELATÓRIOS — PDF em folha A4 e planilha Excel (.xlsx)
 * ===================================================================== */
function abaRelatorios(o) {
  const hoje = hojeIso(), d = dataDe(hoje), A_ = d.getFullYear(), M = d.getMonth();
  const seg = somaDias(hoje, -((d.getDay() + 6) % 7));           // segunda-feira desta semana
  const per = [
    [seg, somaDias(seg, 6), 'Esta semana'],
    [somaDias(seg, -7), somaDias(seg, -1), 'Semana passada'],
    [isoDe(new Date(A_, M, 1)), isoDe(new Date(A_, M + 1, 0)), cap(MESES[M]) + ' (mês atual)'],
    [isoDe(new Date(A_, M - 1, 1)), isoDe(new Date(A_, M, 0)), cap(MESES[(M + 11) % 12]) + ' (mês anterior)'],
    [A_ + '-01-01', A_ + '-12-31', 'Ano de ' + A_],
    [o.inicio, hoje > o.inicio ? hoje : o.inicio, 'Obra inteira']
  ];
  const fotos = App.pdfFotos !== false;
  const bt = (ini, fim, rot) => '<button class="item" style="width:100%;display:flex;align-items:center;gap:10px;text-align:left" data-a="pdf" data-ini="' + ini +
    '" data-fim="' + fim + '" data-rotulo="' + esc(rot) + '"><span style="flex:1"><b>' + esc(rot) + '</b><span style="display:block;font-size:12.5px;color:var(--tinta2)">' +
    br(ini) + ' a ' + br(fim) + ' · ' + rdosDa(o.id).filter(r => r.data >= ini && r.data <= fim).length + ' diário(s)</span></span>' + ic('seta') + '</button>';
  return '<div class="grade2">' +
    '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('pdf') + '</div><h2>Imprimir / PDF<span class="resumo">Cada dia numa folha A4</span></h2></div>' +
    '<div class="cartao-corpo"><div class="seg" style="margin-bottom:6px">' +
      '<button class="' + (fotos ? 'on' : '') + '" data-a="pdfFotos" data-v="1">' + ic('camera') + 'Com fotos</button>' +
      '<button class="' + (fotos ? '' : 'on') + '" data-a="pdfFotos" data-v="0">' + ic('pdf') + 'Sem fotos</button></div>' +
    '<p class="dica" style="margin:0 0 10px">' + (fotos ? 'Depois de cada dia vêm as fotos dele, 6 por folha, todas do mesmo tamanho.'
      : 'Só a folha do dia, com tudo numa página.') + '</p>' +
    per.map(p => bt(p[0], p[1], p[2])).join('') +
    '<label class="rot">Outro período</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input type="date" class="campo" id="pIni" value="' + per[2][0] + '">' +
    '<input type="date" class="campo" id="pFim" value="' + hoje + '"></div>' +
    '<button class="btn sec cheio" style="margin-top:10px" data-a="pdfPeriodo">' + ic('pdf') + 'Imprimir este período</button>' +
    '<p class="dica">' + ic('alerta') + 'Na janela que abrir, escolha a impressora ou "Salvar como PDF".</p></div></div>' +
    '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('planilha') + '</div><h2>Planilha Excel<span class="resumo">Todos os dias, um por linha</span></h2></div>' +
    '<div class="cartao-corpo"><p style="font-size:14px;color:var(--tinta2);margin:0 0 12px">Abas: Diários, Serviços, Mão de obra, Ocorrências e Fotos. ' +
    'Bom para o arquivo de encerramento e para medir produtividade.</p>' +
    '<button class="btn pri cheio" data-a="excel">' + ic('baixar') + 'Baixar planilha (.xlsx)</button></div></div>' +
    '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('escudo') + '</div><h2>Cópia de segurança</h2></div>' +
    '<div class="cartao-corpo"><p style="font-size:14px;color:var(--tinta2);margin:0 0 12px">Mande junto com o PDF do mês para o escritório.</p>' +
    '<button class="btn sec cheio" data-a="backup">' + ic('baixar') + 'Salvar cópia de segurança</button></div></div></div>';
}

/* ---------------- PDF (impressão do navegador) ---------------- */
const CSS_IMP = `
#impressao{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:9.5pt;line-height:1.3}
#impressao.medir{display:block !important;position:absolute;left:-10000px;top:0;width:188mm}
#impressao.medir .pg{min-height:0}
#impressao .pg{page-break-after:always;break-after:page;position:relative;min-height:270mm;display:flex;flex-direction:column}
#impressao .pg:last-child{page-break-after:auto;break-after:auto}
#impressao .cab{display:flex;align-items:center;gap:4mm;border-bottom:2px solid #1d3550;padding-bottom:2.5mm;margin-bottom:3mm}
#impressao .cab img{max-height:13mm;max-width:38mm}
#impressao .cab .t{flex:1}
#impressao .cab .t b{display:block;font-size:12pt;color:#1d3550;letter-spacing:.3px}
#impressao .cab .t span{font-size:8pt;color:#555}
#impressao .cab .d{text-align:right;border:1.5px solid #1d3550;border-radius:2mm;padding:1.5mm 3mm}
#impressao .cab .d b{display:block;font-size:11pt}
#impressao .cab .d em{display:block;font-style:normal;font-weight:700;font-size:8pt;color:#1d3550}
#impressao .cab .d span{font-size:7.5pt;color:#555}
#impressao .g{display:grid;border-top:.3mm solid #b9c2cc;border-left:.3mm solid #b9c2cc;margin-bottom:2.2mm}
#impressao .g>div{border-right:.3mm solid #b9c2cc;border-bottom:.3mm solid #b9c2cc;padding:1mm 1.6mm;min-width:0}
#impressao .g i{display:block;font-style:normal;font-size:.7em;text-transform:uppercase;color:#5b6773;font-weight:700;letter-spacing:.2px}
#impressao h4{margin:3mm 0 1.2mm;font-size:.88em;text-transform:uppercase;color:#1d3550;letter-spacing:.4px;border-bottom:.3mm solid #b9c2cc;padding-bottom:.6mm}
#impressao table{border-collapse:collapse;width:100%;margin-bottom:1.5mm}
#impressao th,#impressao td{border:.3mm solid #b9c2cc;padding:.9mm 1.4mm;text-align:left;vertical-align:top}
#impressao th{background:#eef2f7;font-size:.74em;text-transform:uppercase;letter-spacing:.2px}
#impressao .tot{font-weight:700;margin:.6mm 0 1.4mm}
#impressao .txt{white-space:pre-wrap}
#impressao .ass{margin-top:auto;padding-top:6mm;display:flex;gap:10mm;break-inside:avoid;page-break-inside:avoid}
#impressao .ass>div{flex:1;text-align:center;font-size:.85em}
#impressao .ass img{height:15mm;max-width:100%;object-fit:contain;display:block;margin:0 auto}
#impressao .ass .ln{border-top:.3mm solid #333;margin-top:1mm;padding-top:1mm}
#impressao .ass .vz{height:15mm}
#impressao .rod{margin-top:2mm;font-size:.72em;color:#888;text-align:center}
#impressao .fotos{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:80mm;gap:3mm 4mm}
#impressao .fotos figure{margin:0;display:flex;flex-direction:column;min-height:0}
#impressao .fotos img{width:100%;height:73mm;flex:none;object-fit:contain;background:#f1f3f5;border:.3mm solid #b9c2cc;display:block}
#impressao .fotos figcaption{font-size:7.5pt;color:#444;margin-top:1mm;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#impressao .capa h1{font-size:22pt;text-align:center;margin:38mm 0 2mm;color:#1d3550}
#impressao .capa .sub{text-align:center;font-weight:700;letter-spacing:2px;color:#555;margin-bottom:12mm}
`;

function gerarPdf(p) {
  const o = obraPor(App.rota.id);
  const rs = rdosDa(o.id).filter(r => r.data >= p.ini && r.data <= p.fim).sort((a, b) => a.data < b.data ? -1 : 1);
  if (!rs.length) return toast('Nenhum diário neste período');
  toast('Montando o PDF…', 2000);
  const comFotos = p.fotos !== '0';
  const ids = comFotos ? rs.flatMap(r => (r.fotos || []).map(f => f.id)) : [];
  Promise.all(ids.map(id => Banco.ler('fotos', id).then(f => f ? blobParaUrl(f.blob).then(u => [id, u]) : [id, '']))).then(pares => {
    const urls = Object.fromEntries(pares);
    let h = '<style>' + CSS_IMP + '</style>' + capaPdf(o, rs, p.rotulo);
    rs.forEach((r, i) => {
      h += folhaDia(o, r, i + 1, rs.length, comFotos);
      if (comFotos && r.fotos && r.fotos.length) {
        for (let k = 0; k < r.fotos.length; k += 6) h += folhaFotos(o, r, r.fotos.slice(k, k + 6), k, urls);
      }
    });
    let el = $('#impressao'); if (!el) { el = document.createElement('div'); el.id = 'impressao'; document.body.appendChild(el); }
    el.innerHTML = h;
    const imgs = Array.from(el.querySelectorAll('img'));
    Promise.all(imgs.map(im => im.complete ? 1 : new Promise(res => { im.onload = im.onerror = res; }))).then(() => {
      encaixarFolhas(el);
      document.title = 'Diario_' + o.nome.replace(/[^\wÀ-ÿ]+/g, '_') + '_' + p.ini + '_a_' + p.fim;
      setTimeout(() => { window.print(); document.title = 'Diário de Obras'; }, 150);
    });
  });
}

/* Cada dia cabe numa folha: começa com letra 9,5 e diminui só o necessário (mínimo 6,5). */
function encaixarFolhas(el) {
  el.classList.add('medir');
  const regua = document.createElement('div'); regua.style.height = '272mm'; el.appendChild(regua);
  const limite = regua.getBoundingClientRect().height; regua.remove();
  el.querySelectorAll('.pg.folha-dia').forEach(pg => {
    let fs = 9.5; pg.style.fontSize = fs + 'pt';
    while (pg.scrollHeight > limite && fs > 6.5) { fs -= 0.25; pg.style.fontSize = fs + 'pt'; }
  });
  el.classList.remove('medir');
}

function cabPdf(o, r) {
  const c = App.config, pz = prazoDe(o, r.data);
  return '<div class="cab">' + (c.logo ? '<img src="' + c.logo + '" alt="">' : '') +
    '<div class="t"><b>RELATÓRIO DIÁRIO DE OBRA</b><span>' + esc(c.empresa || '') + (c.cnpj ? ' · CNPJ ' + esc(c.cnpj) : '') + '</span></div>' +
    '<div class="d">' + (pz && pz.dia > 0 ? '<em>RDO nº ' + pz.dia + '</em>' : '') + '<b>' + br(r.data) + '</b><span>' + SEMANA[dataDe(r.data).getDay()] + '</span></div></div>';
}

function capaPdf(o, rs, rotulo) {
  const c = App.config;
  const trab = rs.filter(r => r.clima.houve !== false);
  const ef = trab.map(totalMao).filter(Boolean);
  const chuva = rs.filter(r => ['chuva', 'impraticavel'].includes(r.clima.manha) || ['chuva', 'impraticavel'].includes(r.clima.tarde)).length;
  const imp = rs.reduce((n, r) => n + (r.ocorrencias || []).reduce((m, x) => m + (+x.impacto || 0), 0), 0);
  const g = (lin, col) => '<div class="g" style="grid-template-columns:repeat(' + col + ',1fr)">' + lin.map(x => '<div><i>' + x[0] + '</i>' + esc(x[1]) + '</div>').join('') + '</div>';
  return '<div class="pg capa">' + (c.logo ? '<div style="text-align:center;margin-top:20mm"><img src="' + c.logo + '" style="max-height:24mm" alt=""></div>' : '') +
    '<h1>DIÁRIO DE OBRA</h1><div class="sub">' + esc(String(rotulo || '').toUpperCase()) + '</div>' +
    g([['Obra', o.nome], ['Contratante', o.cliente || '—'], ['Endereço', [o.endereco, o.cidade].filter(Boolean).join(' — ') || '—'],
       ['Contrato nº', o.contrato || '—'], ['ART/RRT', o.art || '—'], ['Início', br(o.inicio)],
       ['Prazo', o.prazoDias ? o.prazoDias + ' dias corridos' : '—'], ['Fiscalização', o.fiscalNome || '—'], ['Construtora', c.empresa || '—']], 3) +
    '<h4>Resumo do período</h4>' +
    g([['Diários no período', rs.length], ['Dias com expediente', trab.length], ['Dias sem expediente', rs.length - trab.length],
       ['Dias com chuva', chuva], ['Efetivo médio', ef.length ? Math.round(ef.reduce((a, b) => a + b, 0) / ef.length) + ' pessoas' : '—'],
       ['Ocorrências', rs.reduce((n, r) => n + (r.ocorrencias || []).length, 0)], ['Impacto no prazo', imp ? imp + ' dia(s)' : '—'],
       ['Fotos', rs.reduce((n, r) => n + (r.fotos || []).length, 0)], ['Emitido em', br(hojeIso())]], 3) + '</div>';
}

function folhaDia(o, r, n, total, comFotos) {
  const pz = prazoDe(o, r.data), cl = r.clima;
  const g = (lin, col) => '<div class="g" style="grid-template-columns:repeat(' + col + ',1fr)">' + lin.map(x => '<div><i>' + x[0] + '</i>' + esc(x[1]) + '</div>').join('') + '</div>';
  let h = '<div class="pg folha-dia">' + cabPdf(o, r) +
    g([['Obra', o.nome], ['Contratante', o.cliente || '—'], ['Contrato / ART', (o.contrato || '—') + ' / ' + (o.art || '—')],
       ['Prazo', textoPrazo(pz) || '—'],
       ['Situação', r.status === 'concluido' ? 'Fechado' : 'Rascunho'], ['Turnos', (o.turnoManha || '') + ' / ' + (o.turnoTarde || '')]], 3);

  if (cl.houve === false) {
    h += '<h4>Expediente</h4>' + g([['Houve expediente', 'Não'], ['Motivo', cl.motivo || '—']], 2);
  } else {
    h += '<h4>Clima</h4>' + g([['Manhã', rotClima(cl.manha) || '—'], ['Tarde', rotClima(cl.tarde) || '—'],
      ['Horas paradas', (cl.horasParadas || 0) + ' h'], ['Chuva', cl.chuvaMm != null ? String(cl.chuvaMm).replace('.', ',') + ' mm' : '—']], 4);
    const mao = Object.entries(r.maoDeObra).filter(([, v]) => v > 0);
    if (mao.length || r.terceiros.length) {
      h += '<h4>Mão de obra</h4>';
      if (mao.length) h += '<div class="g" style="grid-template-columns:repeat(5,1fr)">' + mao.map(([f, v]) => '<div><i>' + esc(f) + '</i>' + v + '</div>').join('') + '</div>';
      if (r.terceiros.length) h += '<table><tr><th>Terceirizada</th><th>Serviço</th><th>Pessoas</th></tr>' +
        r.terceiros.map(t => '<tr><td>' + esc(t.empresa) + '</td><td>' + esc(t.servico) + '</td><td>' + (t.qtd || 0) + '</td></tr>').join('') + '</table>';
      h += '<div class="tot">Total no canteiro: ' + totalMao(r) + '</div>';
    }
    if (r.atividades.length) h += '<h4>Serviços executados</h4><table><tr><th style="width:24%">Frente</th><th>O que foi feito</th><th style="width:14%">Situação</th></tr>' +
      r.atividades.map(a => '<tr><td>' + esc(a.frente || '—') + '</td><td class="txt">' + esc(a.descricao) + '</td><td>' +
        ((STATUS_ATIV.find(s => s[0] === a.status) || [, ''])[1]) + '</td></tr>').join('') + '</table>';
    const eq = Object.entries(r.equipamentos).filter(([, v]) => v > 0);
    if (eq.length) h += '<h4>Equipamentos</h4><div>' + eq.map(([e, v]) => esc(e) + ' (' + v + ')').join(' · ') + '</div>';
    if (r.ocorrencias.length) h += '<h4>Ocorrências</h4><table><tr><th style="width:20%">Tipo</th><th>Descrição</th><th style="width:12%">Impacto</th></tr>' +
      r.ocorrencias.map(x => '<tr><td>' + esc(x.tipo || '—') + '</td><td class="txt">' + esc(x.descricao) + '</td><td>' + (x.impacto ? x.impacto + ' dia(s)' : '—') + '</td></tr>').join('') + '</table>';
    const s = r.seguranca;
    if (s.dds !== null || s.acidente !== null) h += '<h4>Segurança do trabalho</h4>' +
      g([['DDS', s.dds ? 'Sim' + (s.tema ? ' — ' + s.tema : '') : s.dds === false ? 'Não' : '—'], ['Acidente / incidente', s.acidente ? 'SIM' : s.acidente === false ? 'Não' : '—']], 2) +
      (s.acidente && s.descAcidente ? '<div class="txt">' + esc(s.descAcidente) + '</div>' : '');
    if (r.materiais.length) h += '<h4>Materiais recebidos</h4><table><tr><th>Material</th><th>Qtd</th><th>Fornecedor</th><th>NF</th></tr>' +
      r.materiais.map(m => '<tr><td>' + esc(m.material) + '</td><td>' + esc(m.qtd) + '</td><td>' + esc(m.fornecedor) + '</td><td>' + esc(m.nf) + '</td></tr>').join('') + '</table>';
    if (r.visitas.length) h += '<h4>Visitas</h4><table><tr><th>Nome</th><th>Empresa / órgão</th><th>Motivo</th></tr>' +
      r.visitas.map(v => '<tr><td>' + esc(v.nome) + '</td><td>' + esc(v.empresa) + '</td><td>' + esc(v.motivo) + '</td></tr>').join('') + '</table>';
  }
  if ((r.observacoes || '').trim()) h += '<h4>Observações</h4><div class="txt">' + esc(r.observacoes) + '</div>';
  if (r.fotos && r.fotos.length) h += '<div style="margin-top:2mm;color:#555">Registro fotográfico: ' + r.fotos.length + ' foto(s)' +
    (comFotos ? ' na folha seguinte.' : ' guardada(s) no diário (impressão sem fotos).') + '</div>';

  const as = r.assinaturas, bloco = (a, papel) => '<div>' + (a && a.img ? '<img src="' + a.img + '" alt="">' : '<div class="vz"></div>') +
    '<div class="ln">' + esc((a && a.nome) || '') + '<br><span style="color:#666">' + papel + '</span></div></div>';
  h += '<div class="ass">' + bloco(as.responsavel, 'Responsável técnico' + ((o.crea || App.config.crea) ? ' — ' + (o.crea || App.config.crea) : '')) +
    bloco(as.fiscal, 'Fiscalização' + (o.fiscalCargo ? ' — ' + o.fiscalCargo : '')) + '</div>' +
    '<div class="rod">' + esc(o.nome) + ' · diário ' + n + ' de ' + total + '</div></div>';
  return h;
}

function folhaFotos(o, r, fotos, k, urls) {
  return '<div class="pg">' + cabPdf(o, r) + '<h4 style="margin-top:0">Registro fotográfico' + (k ? ' (continuação)' : '') + '</h4>' +
    '<div class="fotos">' + fotos.map((f, i) => '<figure><img src="' + (urls[f.id] || '') + '" alt=""><figcaption>Foto ' + (k + i + 1) +
      (f.legenda ? ' — ' + esc(f.legenda) : '') + '</figcaption></figure>').join('') + '</div></div>';
}

/* ---------------- EXCEL (.xlsx) — gerado aqui mesmo, sem internet ---------------- */
function gerarExcel(o) {
  const rs = rdosDa(o.id).sort((a, b) => a.data < b.data ? -1 : 1);
  if (!rs.length) return toast('Nenhum diário para exportar');
  const sim = v => v === true ? 'Sim' : v === false ? 'Não' : '';
  const abas = [
    ['Diários', ['Data','Dia da semana','Dia de execução','Situação','Teve expediente','Motivo da parada','Clima manhã','Clima tarde',
      'Horas paradas','Chuva (mm)','Efetivo total','Mão de obra','Terceirizados','Frentes','Serviços','Equipamentos','Ocorrências',
      'Dias de impacto','DDS','Tema DDS','Acidente','Materiais','Visitas','Observações','Fotos','Responsável'],
      rs.map(r => { const pz = prazoDe(o, r.data), c = r.clima; return [
        br(r.data), SEMANA[dataDe(r.data).getDay()], pz ? pz.dia : '', r.status === 'concluido' ? 'Fechado' : 'Rascunho',
        c.houve === false ? 'Não' : 'Sim', c.motivo || '', rotClima(c.manha), rotClima(c.tarde), +c.horasParadas || 0,
        c.chuvaMm == null ? '' : c.chuvaMm, totalMao(r),
        Object.entries(r.maoDeObra).filter(([, v]) => v > 0).map(([f, v]) => f + ': ' + v).join('; '),
        r.terceiros.map(t => t.empresa + ' (' + t.qtd + ')').join('; '),
        [...new Set(r.atividades.map(a => a.frente).filter(Boolean))].join('; '),
        r.atividades.map(a => a.descricao).filter(Boolean).join(' | '),
        Object.entries(r.equipamentos).filter(([, v]) => v > 0).map(([e, v]) => e + ': ' + v).join('; '),
        r.ocorrencias.map(x => (x.tipo || '') + (x.descricao ? ': ' + x.descricao : '')).join(' | '),
        r.ocorrencias.reduce((n, x) => n + (+x.impacto || 0), 0),
        sim(r.seguranca.dds), r.seguranca.tema || '', sim(r.seguranca.acidente),
        r.materiais.map(m => m.material + (m.qtd ? ' ' + m.qtd : '') + (m.nf ? ' NF ' + m.nf : '')).join('; '),
        r.visitas.map(v => v.nome + (v.motivo ? ' (' + v.motivo + ')' : '')).join('; '),
        r.observacoes || '', (r.fotos || []).length, (r.assinaturas.responsavel || {}).nome || '' ]; })],
    ['Serviços', ['Data','Frente','O que foi feito','Situação'],
      rs.flatMap(r => r.atividades.map(a => [br(r.data), a.frente || '', a.descricao || '', (STATUS_ATIV.find(s => s[0] === a.status) || [, ''])[1]]))],
    ['Mão de obra', ['Data','Função','Quantidade'],
      rs.flatMap(r => Object.entries(r.maoDeObra).filter(([, v]) => v > 0).map(([f, v]) => [br(r.data), f, v])
        .concat(r.terceiros.map(t => [br(r.data), 'Terceirizado: ' + t.empresa, +t.qtd || 0])))],
    ['Ocorrências', ['Data','Tipo','Descrição','Dias de impacto'],
      rs.flatMap(r => r.ocorrencias.map(x => [br(r.data), x.tipo || '', x.descricao || '', +x.impacto || 0]))],
    ['Fotos', ['Data','Nº','Legenda'], rs.flatMap(r => (r.fotos || []).map((f, i) => [br(r.data), i + 1, f.legenda || '']))]
  ];
  const blob = montarXlsx(abas);
  baixarArquivo('Diario_' + o.nome.replace(/[^\wÀ-ÿ]+/g, '_') + '_' + hojeIso() + '.xlsx', blob);
  toast('Planilha gerada');
}

function montarXlsx(abas) {
  const xe = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  const col = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const folha = (cab, linhas) => {
    const todas = [cab].concat(linhas);
    const larg = cab.map((c, j) => Math.min(60, Math.max(10, ...todas.map(l => String(l[j] == null ? '' : l[j]).length + 2))));
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + larg.map((w, j) => '<col min="' + (j + 1) + '" max="' + (j + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols><sheetData>' +
      todas.map((l, i) => '<row r="' + (i + 1) + '">' + l.map((v, j) => {
        const ref = col(j) + (i + 1), st = i === 0 ? ' s="1"' : '';
        if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
        return '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + xe(v == null ? '' : v) + '</t></is></c>';
      }).join('') + '</row>').join('') + '</sheetData></worksheet>';
  };
  const arquivos = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      abas.map((a, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      abas.map((a, i) => '<sheet name="' + xe(a[0]) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      abas.map((a, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (abas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1D3550"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'
  };
  abas.forEach((a, i) => arquivos['xl/worksheets/sheet' + (i + 1) + '.xml'] = folha(a[1], a[2]));
  return zipar(arquivos, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/* ZIP sem compressão (formato aceito por Excel, LibreOffice e Google Planilhas) */
const _crc = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = _crc[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipar(arquivos, tipo) {
  const enc = new TextEncoder(), partes = [], central = []; let pos = 0;
  const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  Object.entries(arquivos).forEach(([nome, txt]) => {
    const nm = enc.encode(nome), dado = enc.encode(txt), crc = crc32(dado);
    const loc = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(dado.length), ...u32(dado.length), ...u16(nm.length), ...u16(0)]);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(dado.length), ...u32(dado.length), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), nm);
    partes.push(loc, nm, dado); pos += loc.length + nm.length + dado.length;
  });
  const tamCentral = central.reduce((n, p) => n + p.length, 0);
  const fim = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length / 2), ...u16(central.length / 2),
    ...u32(tamCentral), ...u32(pos), ...u16(0)]);
  return new Blob([...partes, ...central, fim], { type: tipo });
}
