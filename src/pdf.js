/* =====================================================================
 * PDF A4 — o próprio app monta o arquivo, sem biblioteca e sem depender
 * da impressão do navegador (que no iPhone sai em papel Carta e com margens
 * próprias). Cada dia cabe numa folha: a letra diminui só o necessário.
 * ===================================================================== */
const LARG_HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const LARG_HELV_B = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
const MMPT = 72 / 25.4, PG_W = 210, PG_H = 297, MG = 12, LW = PG_W - 2 * MG;
const CP1252 = { '€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,
  '‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159 };
function paraAnsi(s) {
  let o = '';
  for (const ch of String(s == null ? '' : s).normalize('NFC')) {
    const c = ch.charCodeAt(0);
    if ((c >= 32 && c < 127) || (c >= 128 && c < 256)) o += ch;      // 128–159: já convertido antes
    else if (CP1252[ch]) o += String.fromCharCode(CP1252[ch]);
    else if (ch === '\t') o += ' ';
    else o += '?';
  }
  return o;
}
/* largura em mm de um texto já convertido */
function largTxt(s, pt, negrito) {
  const t = negrito ? LARG_HELV_B : LARG_HELV; let w = 0;
  for (let i = 0; i < s.length; i++) w += t[s.charCodeAt(i) - 32] || 556;
  return w / 1000 * pt / MMPT;
}
/* quebra em linhas que cabem na largura (mm) */
function quebrar(txt, largMm, pt, negrito) {
  const linhas = [];
  paraAnsi(txt).split(/\r?\n/).forEach(par => {
    let atual = '';
    par.split(/ +/).forEach(pal => {
      while (largTxt(pal, pt, negrito) > largMm) {             // palavra maior que a coluna
        let k = pal.length; while (k > 1 && largTxt((atual ? atual + ' ' : '') + pal.slice(0, k), pt, negrito) > largMm) k--;
        if (k <= 1 && atual) { linhas.push(atual); atual = ''; continue; }
        linhas.push((atual ? atual + ' ' : '') + pal.slice(0, k)); atual = ''; pal = pal.slice(k);
      }
      const t = atual ? atual + ' ' + pal : pal;
      if (largTxt(t, pt, negrito) <= largMm) atual = t; else { linhas.push(atual); atual = pal; }
    });
    linhas.push(atual);
  });
  return linhas;
}
const altLinha = pt => pt * 1.22 / MMPT;

class DocPdf {
  constructor(imagens) { this.paginas = []; this.imagens = imagens || {}; this.usadas = []; }
  nova() { this.pg = []; this.paginas.push(this.pg); return this; }
  _y(y) { return ((PG_H - y) * MMPT).toFixed(2); }
  _x(x) { return (x * MMPT).toFixed(2); }
  /* texto: y = linha de base, em mm a partir do topo */
  txt(x, y, s, pt, negrito, cor, alinhar) {
    s = paraAnsi(s); if (!s) return;
    if (alinhar === 'c') x -= largTxt(s, pt, negrito) / 2; else if (alinhar === 'd') x -= largTxt(s, pt, negrito);
    this.pg.push('BT /F' + (negrito ? 2 : 1) + ' ' + pt.toFixed(2) + ' Tf ' + (cor || '0.07 0.07 0.07') + ' rg ' + this._x(x) + ' ' + this._y(y) +
      ' Td (' + s.replace(/[\\()]/g, '\\$&') + ') Tj ET');
  }
  ret(x, y, w, h, borda, fundo) {
    const r = this._x(x) + ' ' + this._y(y + h) + ' ' + (w * MMPT).toFixed(2) + ' ' + (h * MMPT).toFixed(2) + ' re';
    if (fundo) this.pg.push(fundo + ' rg ' + r + ' f');
    if (borda) this.pg.push('0.3 w ' + borda + ' RG ' + r + ' S');
  }
  linha(x1, y1, x2, y2, esp, cor) { this.pg.push((esp || 0.3) + ' w ' + (cor || '0 0 0') + ' RG ' + this._x(x1) + ' ' + this._y(y1) + ' m ' + this._x(x2) + ' ' + this._y(y2) + ' l S'); }
  /* imagem "contida" na caixa, centralizada */
  img(chave, x, y, w, h) {
    const im = this.imagens[chave]; if (!im) return;
    const f = Math.min(w / im.w, h / im.h), iw = im.w * f, ih = im.h * f;
    let n = this.usadas.indexOf(chave); if (n < 0) { this.usadas.push(chave); n = this.usadas.length - 1; }
    this.pg.push('q ' + (iw * MMPT).toFixed(2) + ' 0 0 ' + (ih * MMPT).toFixed(2) + ' ' + this._x(x + (w - iw) / 2) + ' ' + this._y(y + (h - ih) / 2 + ih) + ' cm /Im' + n + ' Do Q');
  }
  blob() {
    const partes = [], ofs = []; let pos = 0;
    const bin = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
    const por = p => { partes.push(p); pos += p.length; };
    const obj = (n, corpo) => { ofs[n] = pos; por(bin(n + ' 0 obj\n')); (Array.isArray(corpo) ? corpo : [corpo]).forEach(c => por(typeof c === 'string' ? bin(c) : c)); por(bin('\nendobj\n')); };
    por(bin('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    const nImg = this.usadas.length, base = 5 + nImg, nPg = this.paginas.length;
    const recursos = '<< /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ' + this.usadas.map((k, i) => '/Im' + i + ' ' + (5 + i) + ' 0 R').join(' ') + ' >> >>';
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Count ' + nPg + ' /Kids [' + this.paginas.map((p, i) => (base + i * 2) + ' 0 R').join(' ') + '] >>');
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    this.usadas.forEach((k, i) => { const im = this.imagens[k];
      obj(5 + i, ['<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.bytes.length + ' >>\nstream\n', im.bytes, '\nendstream']); });
    this.paginas.forEach((p, i) => {
      const cont = bin(p.join('\n'));
      obj(base + i * 2, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources ' + recursos + ' /Contents ' + (base + i * 2 + 1) + ' 0 R >>');
      obj(base + i * 2 + 1, ['<< /Length ' + cont.length + ' >>\nstream\n', cont, '\nendstream']);
    });
    const total = base + nPg * 2, xref = pos;
    let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (let n = 1; n < total; n++) x += String(ofs[n]).padStart(10, '0') + ' 00000 n \n';
    por(bin(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n'));
    return new Blob(partes, { type: 'application/pdf' });
  }
}

/* ---------- imagens: tudo vira JPEG com fundo branco ---------- */
function jpegDe(fonte, max, qual) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      if (Math.max(w, h) > max) { const f = max / Math.max(w, h); w = Math.round(w * f); h = Math.round(h * f); }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      cv.toBlob(b => b ? b.arrayBuffer().then(a => res({ bytes: new Uint8Array(a), w, h })) : rej(new Error('imagem')), 'image/jpeg', qual || 0.8);
    };
    img.onerror = () => rej(new Error('imagem inválida'));
    img.src = fonte;
  });
}

/* ---------- desenho de uma folha (L guarda posição, escala e quebra) ---------- */
const COR = { azul: '0.114 0.208 0.314', cinza: '0.36 0.40 0.45', linha: '0.72 0.76 0.80', fundo: '0.93 0.95 0.97' };

function cabecalhoPdf(d, o, r) {
  const c = App.config, pz = r ? prazoDe(o, r.data) : null;
  let x = MG;
  if (c.logo && d.imagens.logo) { d.img('logo', MG, MG, 32, 14); x = MG + 36; }
  d.txt(x, MG + 6, 'RELATÓRIO DIÁRIO DE OBRA', 13, true, COR.azul);
  d.txt(x, MG + 11.5, (c.empresa || '') + (c.cnpj ? ' · CNPJ ' + c.cnpj : ''), 8, false, COR.cinza);
  if (r) {
    d.ret(PG_W - MG - 40, MG - 1, 40, 17, COR.azul);
    if (pz && pz.dia > 0) d.txt(PG_W - MG - 2.5, MG + 3.4, 'RDO nº ' + pz.dia, 8.5, true, COR.azul, 'd');
    d.txt(PG_W - MG - 2.5, MG + 9.4, br(r.data), 12, true, null, 'd');
    d.txt(PG_W - MG - 2.5, MG + 14, SEMANA[dataDe(r.data).getDay()], 7.5, false, COR.cinza, 'd');
  }
  d.linha(MG, MG + 18.5, PG_W - MG, MG + 18.5, 1.2, COR.azul);
  return MG + 22;
}

function novoL(d, s, limite, quebra) { return { d, s, y: 0, limite, quebra, pt: 9.5 * s, ptR: 6.4 * s }; }
/* garante espaço; se não couber e a quebra estiver liberada, abre outra folha */
function espaco(L, h) { if (L.y + h > L.limite && L.quebra) { L.y = L.quebra(); } }

function tituloPdf(L, t) {
  const h = 2.6 * L.s + altLinha(8 * L.s) + 1.2;
  espaco(L, h + altLinha(L.pt) * 2);
  L.y += 2.6 * L.s + altLinha(8 * L.s) * 0.8;
  L.d.txt(MG, L.y, t.toUpperCase(), 8 * L.s, true, COR.azul);
  L.y += 1; L.d.linha(MG, L.y, PG_W - MG, L.y, 0.4, COR.linha); L.y += 1.2;
}

/* grade de campos: [[rótulo, valor], ...] em n colunas */
function gradePdf(L, campos, cols) {
  const cw = LW / cols, pad = Math.max(0.5, 1.4 * L.s), lr = altLinha(L.ptR), lv = altLinha(L.pt);
  for (let i = 0; i < campos.length; i += cols) {
    const lin = campos.slice(i, i + cols).map(c => quebrar(c[1] == null || c[1] === '' ? '—' : String(c[1]), cw - pad * 2, L.pt));
    const h = pad * 2 + lr + Math.max(...lin.map(l => l.length)) * lv;
    espaco(L, h);
    campos.slice(i, i + cols).forEach((c, j) => {
      const x = MG + j * cw;
      L.d.ret(x, L.y, cw, h, COR.linha);
      L.d.txt(x + pad, L.y + pad + lr * 0.8, String(c[0]).toUpperCase(), L.ptR, true, COR.cinza);
      lin[j].forEach((t, k) => L.d.txt(x + pad, L.y + pad + lr + lv * (k + 0.8), t, L.pt));
    });
    for (let j = campos.slice(i, i + cols).length; j < cols; j++) L.d.ret(MG + j * cw, L.y, cw, h, COR.linha);
    L.y += h;
  }
  L.y += 1.5 * L.s;
}

/* tabela: cols = [[título, fração], ...]; linhas = [[txt, txt, ...], ...] */
function tabelaPdf(L, cols, linhas) {
  const pad = Math.max(0.45, 1.3 * L.s), lv = altLinha(L.pt), lc = altLinha(L.ptR);
  const ws = cols.map(c => c[1] * LW);
  const cab = () => { const h = pad * 2 + lc; espaco(L, h + lv + pad * 2); let x = MG;
    cols.forEach((c, j) => { L.d.ret(x, L.y, ws[j], h, COR.linha, COR.fundo); L.d.txt(x + pad, L.y + pad + lc * 0.8, c[0].toUpperCase(), L.ptR, true, COR.cinza); x += ws[j]; });
    L.y += h; };
  cab();
  linhas.forEach(l => {
    const q = l.map((t, j) => quebrar(t == null || t === '' ? '—' : String(t), ws[j] - pad * 2, L.pt));
    const h = pad * 2 + Math.max(...q.map(x => x.length)) * lv;
    const antes = L.y; espaco(L, h); if (L.y < antes) cab();
    let x = MG;
    q.forEach((ls, j) => { L.d.ret(x, L.y, ws[j], h, COR.linha); ls.forEach((t, k) => L.d.txt(x + pad, L.y + pad + lv * (k + 0.8), t, L.pt)); x += ws[j]; });
    L.y += h;
  });
  L.y += 1.5 * L.s;
}

function textoPdf(L, txt, cor) {
  const lv = altLinha(L.pt);
  quebrar(txt, LW, L.pt).forEach(t => { espaco(L, lv); L.d.txt(MG, L.y + lv * 0.8, t, L.pt, false, cor); L.y += lv; });
  L.y += 1.2 * L.s;
}

/* corpo do dia (tudo menos cabeçalho e assinaturas) */
function corpoDiaPdf(L, o, r, comFotos) {
  const pz = prazoDe(o, r.data), cl = r.clima;
  gradePdf(L, [['Obra', o.nome], ['Contratante', o.cliente], ['Contrato / ART', (o.contrato || '—') + ' / ' + (o.art || '—')],
    ['Prazo', textoPrazo(pz)], ['Situação', r.status === 'concluido' ? 'Fechado' : 'Rascunho'], ['Turnos', [o.turnoManha, o.turnoTarde].filter(Boolean).join(' / ')]], 3);
  if (cl.houve === false) {
    tituloPdf(L, 'Expediente'); gradePdf(L, [['Houve expediente', 'Não'], ['Motivo', cl.motivo]], 2);
  } else {
    tituloPdf(L, 'Clima');
    gradePdf(L, [['Manhã', rotClima(cl.manha)], ['Tarde', rotClima(cl.tarde)], ['Horas paradas', (cl.horasParadas || 0) + ' h'],
      ['Chuva', cl.chuvaMm != null ? String(cl.chuvaMm).replace('.', ',') + ' mm' : '']], 4);
    const mao = Object.entries(r.maoDeObra).filter(([, v]) => v > 0);
    if (mao.length || r.terceiros.length) {
      tituloPdf(L, 'Mão de obra — total no canteiro: ' + totalMao(r));
      if (mao.length) gradePdf(L, mao.map(([f, v]) => [f, v]), mao.length > 4 ? 6 : Math.max(mao.length, 3));
      if (r.terceiros.length) tabelaPdf(L, [['Terceirizada', .4], ['Serviço', .45], ['Pessoas', .15]], r.terceiros.map(t => [t.empresa, t.servico, t.qtd || 0]));
    }
    if (r.atividades.length) { tituloPdf(L, 'Serviços executados');
      tabelaPdf(L, [['Frente', .24], ['O que foi feito', .6], ['Situação', .16]],
        r.atividades.map(a => [a.frente, a.descricao, (STATUS_ATIV.find(s => s[0] === a.status) || [, ''])[1]])); }
    const eq = Object.entries(r.equipamentos).filter(([, v]) => v > 0);
    if (eq.length) { tituloPdf(L, 'Equipamentos'); textoPdf(L, eq.map(([e, v]) => e + ' (' + v + ')').join(' · ')); }
    if (r.ocorrencias.length) { tituloPdf(L, 'Ocorrências');
      tabelaPdf(L, [['Tipo', .22], ['Descrição', .63], ['Impacto', .15]], r.ocorrencias.map(x => [x.tipo, x.descricao, x.impacto ? x.impacto + ' dia(s)' : ''])); }
    const s = r.seguranca;
    if (s.dds !== null || s.acidente !== null) { tituloPdf(L, 'Segurança do trabalho');
      gradePdf(L, [['DDS', s.dds ? 'Sim' + (s.tema ? ' — ' + s.tema : '') : s.dds === false ? 'Não' : ''],
        ['Acidente / incidente', s.acidente ? 'SIM' + (s.descAcidente ? ' — ' + s.descAcidente : '') : s.acidente === false ? 'Não' : '']], 2); }
    if (r.materiais.length) { tituloPdf(L, 'Materiais recebidos');
      tabelaPdf(L, [['Material', .4], ['Qtd', .15], ['Fornecedor', .3], ['NF', .15]], r.materiais.map(m => [m.material, m.qtd, m.fornecedor, m.nf])); }
    if (r.visitas.length) { tituloPdf(L, 'Visitas');
      tabelaPdf(L, [['Nome', .35], ['Empresa / órgão', .35], ['Motivo', .3]], r.visitas.map(v => [v.nome, v.empresa, v.motivo])); }
  }
  if ((r.observacoes || '').trim()) { tituloPdf(L, 'Observações da construtora'); textoPdf(L, r.observacoes); }
  if (r.fotos && r.fotos.length) textoPdf(L, 'Registro fotográfico: ' + r.fotos.length + ' foto(s)' + (comFotos ? ' nas folhas seguintes.' : ' guardada(s) no diário.'), COR.cinza);
  // espaço da fiscalização: sempre sai, com linhas para escrever à mão se estiver em branco
  tituloPdf(L, 'Observações da fiscalização');
  const of = (r.obsFiscal || '').trim();
  if (of) textoPdf(L, of);
  else { const lh = 7 * L.s, n = Math.min(8, Math.max(3, Math.floor((L.limite - L.y - 1) / lh))); espaco(L, n * lh);
    for (let i = 1; i <= n; i++) L.d.linha(MG, L.y + i * lh, PG_W - MG, L.y + i * lh, 0.25, COR.linha); L.y += n * lh + 1; }
}

const ASS_H = 27;   // altura do bloco de assinaturas, preso ao pé da folha
function assinaturasPdf(d, o, r, n, total) {
  const y0 = PG_H - MG - ASS_H, w = (LW - 12) / 2, as = r.assinaturas;
  [[as.responsavel, 'Responsável técnico' + ((o.crea || App.config.crea) ? ' — ' + (o.crea || App.config.crea) : ''), 'ass_r_' + r.data],
   [as.fiscal, 'Fiscalização' + (o.fiscalCargo ? ' — ' + o.fiscalCargo : ''), 'ass_f_' + r.data]].forEach(([a, papel, k], i) => {
    const x = MG + i * (w + 12);
    if (a && a.img) d.img(k, x, y0, w, 14);
    d.linha(x, y0 + 15.5, x + w, y0 + 15.5, 0.35, '0.2 0.2 0.2');
    d.txt(x + w / 2, y0 + 19.5, (a && a.nome) || '', 8.5, true, null, 'c');
    d.txt(x + w / 2, y0 + 23.2, papel, 7.2, false, COR.cinza, 'c');
  });
  d.txt(PG_W / 2, PG_H - MG + 4, o.nome + ' · diário ' + n + ' de ' + total, 6.5, false, COR.cinza, 'c');
}

function folhaDiaPdf(doc, o, r, n, total, comFotos) {
  const limite = PG_H - MG - ASS_H - 3;
  // procura a maior letra em que o dia cabe inteiro numa folha
  let s = 1;
  for (; s > 0.42; s -= 0.04) {
    const t = new DocPdf(doc.imagens).nova(), L = novoL(t, s, limite, null);
    L.y = cabecalhoPdf(t, o, r); corpoDiaPdf(L, o, r, comFotos);
    if (L.y <= limite) break;
  }
  doc.nova();
  const L = novoL(doc, Math.max(s, 0.42), limite, () => { doc.nova(); return cabecalhoPdf(doc, o, r); });  // só quebra em caso extremo
  L.y = cabecalhoPdf(doc, o, r); corpoDiaPdf(L, o, r, comFotos);
  assinaturasPdf(doc, o, r, n, total);
}

function folhasFotosPdf(doc, o, r) {
  const fotos = r.fotos || [];
  for (let k = 0; k < fotos.length; k += 6) {
    doc.nova(); const y0 = cabecalhoPdf(doc, o, r);
    doc.txt(MG, y0 + 3, 'REGISTRO FOTOGRÁFICO' + (k ? ' (continuação)' : ''), 8, true, COR.azul);
    const top = y0 + 6, gap = 5, cw = (LW - gap) / 2, ch = (PG_H - MG - 4 - top - gap * 2) / 3, ih = ch - 6;
    fotos.slice(k, k + 6).forEach((f, i) => {
      const x = MG + (i % 2) * (cw + gap), y = top + Math.floor(i / 2) * (ch + gap);
      doc.ret(x, y, cw, ih, COR.linha, '0.95 0.96 0.97');
      doc.img('foto_' + f.id, x, y, cw, ih);
      const leg = quebrar('Foto ' + (k + i + 1) + (f.legenda ? ' — ' + f.legenda : ''), cw, 7.5)[0];
      doc.txt(x, y + ih + 3.8, leg, 7.5, false, '0.25 0.25 0.25');
    });
    doc.txt(PG_W / 2, PG_H - MG + 4, o.nome + ' · fotos de ' + br(r.data), 6.5, false, COR.cinza, 'c');
  }
}

function capaPdfArq(doc, o, rs, rotulo) {
  const c = App.config;
  doc.nova();
  let y = 40;
  if (c.logo && doc.imagens.logo) { doc.img('logo', PG_W / 2 - 30, 25, 60, 24); y = 62; }
  doc.txt(PG_W / 2, y + 10, 'DIÁRIO DE OBRA', 24, true, COR.azul, 'c');
  doc.txt(PG_W / 2, y + 18, String(rotulo || '').toUpperCase(), 10, true, COR.cinza, 'c');
  const trab = rs.filter(r => r.clima.houve !== false), ef = trab.map(totalMao).filter(Boolean);
  const chuva = rs.filter(r => ['chuva', 'impraticavel'].includes(r.clima.manha) || ['chuva', 'impraticavel'].includes(r.clima.tarde)).length;
  const imp = rs.reduce((n, r) => n + (r.ocorrencias || []).reduce((m, x) => m + (+x.impacto || 0), 0), 0);
  const L = novoL(doc, 1, PG_H, null); L.y = y + 30;
  gradePdf(L, [['Obra', o.nome], ['Contratante', o.cliente], ['Endereço', [o.endereco, o.cidade].filter(Boolean).join(' — ')],
    ['Contrato nº', o.contrato], ['ART/RRT', o.art], ['Início', br(o.inicio)],
    ['Prazo', o.prazoDias ? o.prazoDias + ' dias corridos' : ''], ['Engenheiro responsável', o.engenheiro || c.responsavel], ['Fiscalização', o.fiscalNome],
    ['Construtora', c.empresa], ['Período', br(rs[0].data) + ' a ' + br(rs[rs.length - 1].data)], ['Emitido em', br(hojeIso())]], 3);
  tituloPdf(L, 'Resumo do período');
  gradePdf(L, [['Diários no período', rs.length], ['Dias com expediente', trab.length], ['Dias sem expediente', rs.length - trab.length],
    ['Dias com chuva', chuva], ['Efetivo médio', ef.length ? Math.round(ef.reduce((a, b) => a + b, 0) / ef.length) + ' pessoas' : ''],
    ['Ocorrências', rs.reduce((n, r) => n + (r.ocorrencias || []).length, 0)], ['Impacto no prazo', imp ? imp + ' dia(s)' : ''],
    ['Fotos', rs.reduce((n, r) => n + (r.fotos || []).length, 0)], ['Diários fechados', rs.filter(r => r.status === 'concluido').length]], 3);
}

/* monta o PDF de um período. modo: 'salvar' (baixa o arquivo) ou 'abrir' (abre para imprimir/compartilhar) */
function gerarPdfArquivo(p, modo) {
  const o = obraPor(App.rota.id);
  const rs = rdosDa(o.id).filter(r => r.data >= p.ini && r.data <= p.fim).sort((a, b) => a.data < b.data ? -1 : 1);
  if (!rs.length) return toast('Nenhum diário neste período');
  const comFotos = p.fotos !== '0', imagens = {}, tarefas = [];
  if (App.config.logo) tarefas.push(() => jpegDe(App.config.logo, 600, 0.9).then(im => imagens.logo = im));
  rs.forEach(r => {
    const as = r.assinaturas || {};
    if (as.responsavel && as.responsavel.img) tarefas.push(() => jpegDe(as.responsavel.img, 600, 0.9).then(im => imagens['ass_r_' + r.data] = im));
    if (as.fiscal && as.fiscal.img) tarefas.push(() => jpegDe(as.fiscal.img, 600, 0.9).then(im => imagens['ass_f_' + r.data] = im));
    if (comFotos) (r.fotos || []).forEach(f => tarefas.push(() => obterFotoBlob(f.id).then(b => {
      if (!b) return; const u = URL.createObjectURL(b);
      return jpegDe(u, 1100, 0.72).then(im => { imagens['foto_' + f.id] = im; URL.revokeObjectURL(u); });
    })));
  });
  let feitas = 0;
  toast('Montando o PDF…', 2500);
  tarefas.reduce((pr, t) => pr.then(() => t().catch(() => {})).then(() => {
    feitas++; if (tarefas.length > 8 && feitas % 6 === 0) toast('Preparando imagens ' + feitas + ' de ' + tarefas.length + '…', 1500);
  }), Promise.resolve()).then(() => {
    const doc = new DocPdf(imagens);
    capaPdfArq(doc, o, rs, p.rotulo);
    rs.forEach((r, i) => { folhaDiaPdf(doc, o, r, i + 1, rs.length, comFotos); if (comFotos) folhasFotosPdf(doc, o, r); });
    const blob = doc.blob(), nome = 'Diario_' + nomeArq(o.nome) + '_' + p.ini + '_a_' + p.fim + '.pdf';
    App.ultimoPdf = { blob, nome, folhas: doc.paginas.length };
    if (modo === 'abrir') pdfPronto();
    else { baixarArquivo(nome, paraBaixar(blob)); toast('PDF salvo: ' + doc.paginas.length + ' folha(s)', 3500); }
  }).catch(e => toast('Não foi possível montar o PDF: ' + e.message, 5000));
}

/* para baixar com o nome certo (alguns navegadores trocam o nome de arquivos marcados como PDF) */
const paraBaixar = b => new Blob([b], { type: 'application/octet-stream' });

/* PDF pronto para imprimir: no celular abre o menu de compartilhar (tem "Imprimir");
 * no computador abre o PDF numa aba, com o botão de imprimir do próprio leitor. */
function pdfPronto() {
  const u = App.ultimoPdf; if (!u) return;
  const arq = window.File ? new File([u.blob], u.nome, { type: 'application/pdf' }) : null;
  const podeCompart = !!(arq && navigator.canShare && navigator.canShare({ files: [arq] }));
  abrirFolha('<h3>PDF pronto — ' + u.folhas + ' folha(s)</h3>' +
    (podeCompart ? '<button class="btn pri cheio" data-acao="compart">' + ic('pdf') + 'Imprimir ou enviar</button>' +
      '<p class="dica" style="margin:6px 0 12px">No menu que abrir, escolha "Imprimir" (ou WhatsApp, e-mail…).</p>' : '') +
    '<button class="btn ' + (podeCompart ? 'sec' : 'pri') + ' cheio" data-acao="abrir" style="margin-bottom:9px">' + ic('pdf') + 'Abrir o PDF para imprimir</button>' +
    '<button class="btn sec cheio" data-acao="salvar">' + ic('baixar') + 'Salvar no aparelho</button>',
    f => f.querySelectorAll('[data-acao]').forEach(b => b.onclick = () => {
      const a = b.dataset.acao;
      if (a === 'compart') navigator.share({ files: [arq], title: u.nome }).catch(() => {});
      else if (a === 'abrir') { const w = window.open(URL.createObjectURL(u.blob), '_blank'); if (!w) baixarArquivo(u.nome, paraBaixar(u.blob)); }
      else baixarArquivo(u.nome, paraBaixar(u.blob));
    }));
}
