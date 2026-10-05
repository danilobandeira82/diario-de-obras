/* =====================================================================
 * RELATÓRIOS — PDF em folha A4 e planilha Excel (.xlsx)
 * ===================================================================== */
function periodosPdf(o) {
  const hoje = hojeIso(), d = dataDe(hoje), A_ = d.getFullYear(), M = d.getMonth();
  const seg = somaDias(hoje, -((d.getDay() + 6) % 7));           // segunda-feira desta semana
  return [
    [seg, somaDias(seg, 6), 'Esta semana'],
    [somaDias(seg, -7), somaDias(seg, -1), 'Semana passada'],
    [isoDe(new Date(A_, M, 1)), isoDe(new Date(A_, M + 1, 0)), cap(MESES[M]) + ' (mês atual)'],
    [isoDe(new Date(A_, M - 1, 1)), isoDe(new Date(A_, M, 0)), cap(MESES[(M + 11) % 12]) + ' (mês anterior)'],
    [A_ + '-01-01', A_ + '-12-31', 'Ano de ' + A_],
    [o.inicio, hoje > o.inicio ? hoje : o.inicio, 'Obra inteira']
  ];
}
function periodoEscolhido(o) {
  const i = App.pdfPer == null ? 2 : App.pdfPer;
  if (i === 'outro') { const a = ($('#pIni') || {}).value, b = ($('#pFim') || {}).value; return { ini: a, fim: b, rotulo: 'Período ' + br(a) + ' a ' + br(b) }; }
  const p = periodosPdf(o)[i]; return { ini: p[0], fim: p[1], rotulo: p[2] };
}
function abaRelatorios(o) {
  const hoje = hojeIso(), per = periodosPdf(o), sel = App.pdfPer == null ? 2 : App.pdfPer;
  const fotos = App.pdfFotos !== false;
  const qtd = (ini, fim) => rdosDa(o.id).filter(r => r.data >= ini && r.data <= fim).length;
  const item = (i, rot, sub) => '<button class="item escolha' + (sel === i ? ' on' : '') + '" data-a="pdfPer" data-v="' + i + '">' +
    '<span class="bola"></span><span style="flex:1"><b>' + esc(rot) + '</b><span style="display:block;font-size:12.5px;color:var(--tinta2)">' + sub + '</span></span></button>';
  return '<div class="grade2">' +
    '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('pdf') + '</div><h2>Diário em PDF<span class="resumo">Folha A4 · cada dia numa folha</span></h2></div>' +
    '<div class="cartao-corpo"><label class="rot" style="margin-top:0">1. Período</label>' +
    per.map((p, i) => item(i, p[2], br(p[0]) + ' a ' + br(p[1]) + ' · ' + qtd(p[0], p[1]) + ' diário(s)')).join('') +
    item('outro', 'Outro período', 'escolha as datas') +
    (sel === 'outro' ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px"><input type="date" class="campo" id="pIni" value="' + per[2][0] + '">' +
      '<input type="date" class="campo" id="pFim" value="' + hoje + '"></div>' : '') +
    '<label class="rot">2. Fotos</label><div class="seg">' +
      '<button class="' + (fotos ? 'on' : '') + '" data-a="pdfFotos" data-v="1">' + ic('camera') + 'Com fotos</button>' +
      '<button class="' + (fotos ? '' : 'on') + '" data-a="pdfFotos" data-v="0">' + ic('pdf') + 'Sem fotos</button></div>' +
    '<p class="dica" style="margin:6px 0 12px">' + (fotos ? 'Depois de cada dia vêm as fotos dele, 6 por folha, todas do mesmo tamanho.'
      : 'Só a folha de cada dia, com tudo numa página.') + '</p>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">' +
      '<button class="btn pri" data-a="pdfSalvar">' + ic('baixar') + 'Salvar PDF</button>' +
      '<button class="btn sec" data-a="pdfImprimir">' + ic('pdf') + 'Imprimir</button></div>' +
    '<p class="dica">Imprimir abre o PDF; use o botão de imprimir ou compartilhar do aparelho.</p></div></div>' +
    '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('planilha') + '</div><h2>Planilha Excel<span class="resumo">Todos os dias, um por linha</span></h2></div>' +
    '<div class="cartao-corpo"><p style="font-size:14px;color:var(--tinta2);margin:0 0 12px">Abas: Diários, Serviços, Mão de obra, Ocorrências e Fotos. ' +
    'Bom para o arquivo de encerramento e para medir produtividade.</p>' +
    '<button class="btn pri cheio" data-a="excel">' + ic('baixar') + 'Baixar planilha (.xlsx)</button></div></div>' +
    '<div class="cartao"><div class="cartao-cab"><div class="ico">' + ic('escudo') + '</div><h2>Cópia de segurança</h2></div>' +
    '<div class="cartao-corpo"><p style="font-size:14px;color:var(--tinta2);margin:0 0 12px">Mande junto com o PDF do mês para o escritório.</p>' +
    '<button class="btn sec cheio" data-a="backup">' + ic('baixar') + 'Salvar cópia de segurança</button></div></div></div>';
}

/* ---------------- EXCEL (.xlsx) — gerado aqui mesmo, sem internet ---------------- */
function gerarExcel(o) {
  const rs = rdosDa(o.id).sort((a, b) => a.data < b.data ? -1 : 1);
  if (!rs.length) return toast('Nenhum diário para exportar');
  const sim = v => v === true ? 'Sim' : v === false ? 'Não' : '';
  const abas = [
    ['Diários', ['Data','Dia da semana','Dia de execução','Situação','Teve expediente','Motivo da parada','Clima manhã','Clima tarde',
      'Horas paradas','Chuva (mm)','Efetivo total','Mão de obra','Terceirizados','Frentes','Serviços','Equipamentos','Ocorrências',
      'Dias de impacto','DDS','Tema DDS','Acidente','Materiais','Visitas','Observações','Obs. da fiscalização','Fotos','Responsável'],
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
        r.observacoes || '', r.obsFiscal || '', (r.fotos || []).length, (r.assinaturas.responsavel || {}).nome || '' ]; })],
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
  baixarArquivo('Diario_' + nomeArq(o.nome) + '_' + hojeIso() + '.xlsx', blob);
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
