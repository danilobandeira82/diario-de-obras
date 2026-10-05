/* =====================================================================
 * EXTRAS — clima automático, assinatura, cópia de segurança, exemplo
 * ===================================================================== */

/* ---------- clima automático (Open-Meteo, grátis, sem cadastro) ----------
 * Só usa a internet quando o engenheiro toca no botão. Nada do diário sai do aparelho:
 * vai apenas o nome da cidade e a data. */
const UFS = { AC:'Acre', AL:'Alagoas', AP:'Amapá', AM:'Amazonas', BA:'Bahia', CE:'Ceará', DF:'Distrito Federal', ES:'Espírito Santo',
  GO:'Goiás', MA:'Maranhão', MT:'Mato Grosso', MS:'Mato Grosso do Sul', MG:'Minas Gerais', PA:'Pará', PB:'Paraíba', PR:'Paraná',
  PE:'Pernambuco', PI:'Piauí', RJ:'Rio de Janeiro', RN:'Rio Grande do Norte', RS:'Rio Grande do Sul', RO:'Rondônia', RR:'Roraima',
  SC:'Santa Catarina', SP:'São Paulo', SE:'Sergipe', TO:'Tocantins' };
function preencherClima() {
  const o = App.obraAtual, r = R();
  if (!o.cidade) { toast('Cadastre a cidade na aba Obra → Editar'); return; }
  if (!navigator.onLine) { toast('Sem internet agora. Marque o clima à mão.'); return; }
  toast('Buscando o clima…', 1500);
  const sem = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const geo = o.lat ? Promise.resolve() : fetch('https://geocoding-api.open-meteo.com/v1/search?count=10&language=pt&countryCode=BR&name=' +
      encodeURIComponent(o.cidade.split(/[,/\-–]/)[0].trim()))
    .then(x => x.json()).then(j => {
      if (!j.results || !j.results.length) throw new Error('Cidade não encontrada: ' + o.cidade);
      const uf = (o.cidade.toUpperCase().match(/[,/\-–\s]\s*([A-Z]{2})\s*$/) || [])[1];
      const c = (uf && UFS[uf] && j.results.find(x => sem(x.admin1) === sem(UFS[uf]))) || j.results[0];
      o.lat = c.latitude; o.lon = c.longitude; return salvarObra(o);
    });
  geo.then(() => {
    const dias = difDias(r.data, hojeIso());
    const base = dias > 80 ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
    return fetch(base + '?latitude=' + o.lat + '&longitude=' + o.lon + '&hourly=weather_code,precipitation&timezone=auto' +
      '&start_date=' + r.data + '&end_date=' + r.data).then(x => x.json());
  }).then(j => {
    if (!j.hourly) throw new Error('Clima indisponível para esta data');
    const per = (h0, h1) => {
      let cod = 0, mm = 0;
      j.hourly.time.forEach((t, i) => { const h = +t.slice(11, 13);
        if (h >= h0 && h <= h1) { cod = Math.max(cod, j.hourly.weather_code[i] || 0); mm += j.hourly.precipitation[i] || 0; } });
      if (cod >= 95 || mm >= 8) return 'impraticavel';
      if (cod >= 51 || mm >= 0.5) return 'chuva';
      if (cod >= 2) return 'nublado';
      return 'bom';
    };
    r.clima.manha = per(7, 11); r.clima.tarde = per(13, 17);
    r.clima.chuvaMm = Math.round(j.hourly.precipitation.reduce((a, b) => a + (b || 0), 0) * 10) / 10;
    alterado('clima'); toast('Clima preenchido — confira se bate com o que você viu');
  }).catch(e => toast(e.message || 'Não foi possível buscar o clima', 3500));
}

/* ---------- assinatura no dedo ---------- */
function montarAssinaturas() {
  document.querySelectorAll('canvas[data-ass]').forEach(cv => {
    if (cv._pronto) return; cv._pronto = true;
    const dpr = window.devicePixelRatio || 1, ret = cv.getBoundingClientRect();
    cv.width = ret.width * dpr; cv.height = ret.height * dpr;
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#0b1f3a';
    let ativo = false, ult = null;
    const pos = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    cv.addEventListener('pointerdown', e => { ativo = true; ult = pos(e); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!ativo) return; const p = pos(e);
      c.beginPath(); c.moveTo(ult[0], ult[1]); c.lineTo(p[0], p[1]); c.stroke(); ult = p; cv._temTraco = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cv.addEventListener(t, () => ativo = false));
    cv._limpar = () => { c.clearRect(0, 0, cv.width, cv.height); cv._temTraco = false; };
    cv._imagem = () => {
      // recorta e reduz para não pesar no PDF
      const out = document.createElement('canvas'); out.width = 600; out.height = 220;
      const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, 600, 220);
      o.drawImage(cv, 0, 0, 600, 220); return out.toDataURL('image/png');
    };
  });
}

/* ---------- cópia de segurança ---------- */
function salvarBackup() {
  toast('Montando a cópia…', 1500);
  Promise.all([Banco.todos('fotos'), Banco.todos('docs')]).then(([fotos, docs]) =>
    Promise.all([
      Promise.all(fotos.map(f => blobParaUrl(f.blob).then(u => ({ id: f.id, obraId: f.obraId, data: f.data, url: u })))),
      Promise.all(docs.map(d => blobParaUrl(d.blob).then(u => ({ id: d.id, nome: d.nome, tipo: d.tipo, url: u }))))
    ])
  ).then(([fotos, docs]) => {
    App.config.ultimoBackup = hojeIso();
    const pacote = { app: 'diario-de-obras', versao: 2, geradoEm: new Date().toISOString(), config: App.config,
      obras: App.obras, rdos: Object.values(App.rdos), fotos, docs };
    const blob = new Blob([JSON.stringify(pacote)], { type: 'application/json' });
    baixarArquivo('diario-de-obras-copia-' + hojeIso() + '.json', blob);
    return salvarConfig().then(() => { toast('Cópia salva (' + mb(blob.size) + '). Guarde fora deste aparelho.', 4500); render(); });
  }).catch(e => toast('Falha ao montar a cópia: ' + e.message, 5000));
}

function restaurarBackup(arq) {
  lerComo(arq, 'url').then(u => fetch(u)).then(r => r.json()).then(p => {
    if (!p || p.app !== 'diario-de-obras') throw new Error('Este arquivo não é uma cópia do Diário de Obras.');
    return confirmar('Restaurar a cópia de ' + br((p.geradoEm || '').slice(0, 10)) + '?',
      'Substitui tudo que está neste aparelho por: ' + p.obras.length + ' obra(s), ' + p.rdos.length + ' diário(s) e ' + p.fotos.length + ' foto(s).',
      'Restaurar', true).then(ok => {
      if (!ok) return;
      toast('Restaurando…', 3000);
      return Promise.all(['config', 'obras', 'rdos', 'fotos', 'docs'].map(l => Banco.limpar(l))).then(() => {
        const t = [Banco.gravar('config', 'geral', p.config || {})];
        p.obras.forEach(o => t.push(Banco.gravar('obras', o.id, o)));
        p.rdos.forEach(r => t.push(Banco.gravar('rdos', chaveRdo(r.obraId, r.data), r)));
        return Promise.all(t)
          .then(() => p.fotos.reduce((pr, f) => pr.then(() => urlParaBlob(f.url).then(b => Banco.gravar('fotos', f.id, { id: f.id, obraId: f.obraId, data: f.data, blob: b }))), Promise.resolve()))
          .then(() => p.docs.reduce((pr, d) => pr.then(() => urlParaBlob(d.url).then(b => Banco.gravar('docs', d.id, { id: d.id, nome: d.nome, tipo: d.tipo, blob: b }))), Promise.resolve()));
      }).then(() => carregarTudo()).then(() => { toast('Cópia restaurada'); ir('#/'); });
    });
  }).catch(e => toast(e.message || 'Arquivo inválido', 5000));
}

/* Junta cópias de vários engenheiros num aparelho só (diretoria). Não apaga nada. */
function juntarBackups(arqs) {
  let obras = 0, dias = 0, fotos = 0;
  toast('Juntando…', 3000);
  arqs.reduce((pr, arq) => pr.then(() => lerComo(arq, 'url').then(u => fetch(u)).then(r => r.json()).then(p => {
    if (!p || p.app !== 'diario-de-obras') throw new Error(arq.name + ' não é uma cópia do Diário de Obras.');
    const t = [];
    p.obras.forEach(o => { t.push(Banco.gravar('obras', o.id, o)); obras++; });
    p.rdos.forEach(r => { t.push(Banco.gravar('rdos', chaveRdo(r.obraId, r.data), r)); dias++; });
    return Promise.all(t)
      .then(() => p.fotos.reduce((q, f) => q.then(() => urlParaBlob(f.url).then(b => { fotos++; return Banco.gravar('fotos', f.id, { id: f.id, obraId: f.obraId, data: f.data, blob: b }); })), Promise.resolve()))
      .then(() => (p.docs || []).reduce((q, d) => q.then(() => urlParaBlob(d.url).then(b => Banco.gravar('docs', d.id, { id: d.id, nome: d.nome, tipo: d.tipo, blob: b }))), Promise.resolve()));
  })), Promise.resolve())
    .then(() => carregarTudo())
    .then(() => { toast('Juntado: ' + obras + ' obra(s), ' + dias + ' diário(s), ' + fotos + ' foto(s)', 4000); ir('#/'); })
    .catch(e => { toast(e.message || 'Arquivo inválido', 5000); carregarTudo().then(render); });
}

function testarAparelho() {
  const linhas = [], tam = 3 * 1048576;
  const blob = new Blob([new Uint8Array(tam)]);
  const t0 = performance.now();
  Banco.gravar('fotos', '__teste__', { id: '__teste__', blob }).then(() => Banco.ler('fotos', '__teste__'))
    .then(v => { const ok = v && v.blob && v.blob.size === tam;
      linhas.push(ok ? '✔ Gravou e leu 3 MB de volta (' + Math.round(performance.now() - t0) + ' ms)' : '✘ Falhou ao ler de volta');
      return Banco.apagar('fotos', '__teste__').then(() => ok); })
    .then(ok => Banco.espaco().then(e => {
      linhas.push('✔ Guardando em: ' + (Banco.motor === 'indexeddb' ? 'banco do navegador' : 'memória (NÃO salva)'));
      if (e) { const livre = e.total - e.usado; linhas.push('✔ Espaço livre: ' + mb(livre) + ' — dá para ~' +
        Math.max(0, Math.floor(livre / (4 * 250 * 1024 * 300))) + ' anos de obra com 4 fotos por dia'); }
      const bom = ok && Banco.motor === 'indexeddb';
      abrirFolha('<h3>' + (bom ? 'Tudo certo neste aparelho' : 'Este aparelho NÃO está salvando') + '</h3>' +
        '<div class="aviso ' + (bom ? 'o' : 'e') + '">' + ic(bom ? 'ok' : 'alerta') + '<div>' + linhas.map(esc).join('<br>') + '</div></div>' +
        (bom ? '<p style="font-size:14px;color:var(--tinta2)">Mesmo assim, salve a cópia de segurança toda semana.</p>'
             : '<p style="font-size:14px">Abra no Google Chrome ou Microsoft Edge. Se abriu o arquivo de dentro do ZIP, extraia antes.</p>') +
        '<button class="btn sec cheio" data-a="fecharFolha">Fechar</button>');
    }))
    .catch(e => toast('Erro no teste: ' + e.message, 5000));
}

/* ---------- obra de exemplo ---------- */
function fotoExemplo(txt, cor) {
  const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 900;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, cor); g.addColorStop(1, '#0d1620');
  c.fillStyle = g; c.fillRect(0, 0, 1200, 900);
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2;
  for (let x = 0; x < 1200; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 900); c.stroke(); }
  for (let y = 0; y < 900; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(1200, y); c.stroke(); }
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = 'bold 54px Arial'; c.fillText('FOTO DE EXEMPLO', 600, 430);
  c.font = '34px Arial'; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText(txt, 600, 490);
  return new Promise(res => cv.toBlob(res, 'image/jpeg', 0.7));
}

function criarExemplo() {
  const hoje = hojeIso(), ini = somaDias(hoje, -12);
  const o = { id: uid(), nome: 'Fórum Municipal — Exemplo', tipo: 'Edificação nova', cliente: 'Prefeitura (exemplo)',
    endereco: 'Rua Central, 1000', cidade: 'Iporã, PR', contrato: '012/2026', art: 'PR-0000000', inicio: ini, prazoDias: '365',
    fiscalNome: 'Eng. Fiscal do Contrato', fiscalCargo: 'Fiscalização', turnoManha: '07:30 às 12:00', turnoTarde: '13:00 às 17:30',
    equipePadrao: EQUIPE_PADRAO.slice(), equipPadrao: EQUIP_PADRAO.slice(), secoes: Object.assign({}, SECOES_PADRAO), docs: [],
    criadaEm: new Date().toISOString() };
  const docs = DOCS_EXIGIDOS.map(t => ({ id: uid(), tipo: t, nome: t.replace('/', '-') + ' (exemplo).txt', tamanho: 40, em: hoje }));
  o.docs = docs;
  if (!App.config.empresa) App.config.empresa = 'Sua Construtora';
  const tarefas = [salvarObra(o), salvarConfig()];
  docs.forEach(d => tarefas.push(Banco.gravar('docs', d.id, { id: d.id, nome: d.nome, tipo: 'text/plain', blob: new Blob(['Documento de exemplo: ' + d.tipo], { type: 'text/plain' }) })));
  App.obras.push(o);

  const servicos = [['Fundação', 'Escavação e armação dos blocos B1 a B6'], ['Estrutura', 'Forma e armação dos pilares do térreo'],
    ['Estrutura', 'Concretagem da laje do térreo — 42 m³ fck 30'], ['Alvenaria', 'Elevação de alvenaria do bloco A, eixo 1 a 4'],
    ['Instalações elétricas', 'Passagem de eletrodutos na laje'], ['Instalações hidrossanitárias', 'Tubulação de esgoto sob o piso']];
  const fotosPend = [];
  for (let i = 12; i >= 1; i--) {
    const d = somaDias(hoje, -i), dow = dataDe(d).getDay();
    if (i === 4 || i === 2) continue;                          // dois dias sem lançamento, para ver o vermelho
    const r = novoRdo(o, d);
    if (dow === 0) { r.clima.houve = false; r.clima.motivo = 'Domingo'; r.nada.observacoes = true; }
    else {
      const chuva = i === 6;
      r.clima.manha = chuva ? 'chuva' : 'bom'; r.clima.tarde = chuva ? 'chuva' : (i % 3 ? 'bom' : 'nublado');
      r.clima.horasParadas = chuva ? 3 : 0;
      Object.assign(r.maoDeObra, { 'Mestre de obras': 1, 'Pedreiro': 4 + (i % 3), 'Servente': 6 - (chuva ? 2 : 0), 'Carpinteiro': 2, 'Armador': 2, 'Eletricista': i % 2 });
      r.equipamentos['Betoneira'] = 1; r.equipamentos['Vibrador de imersão'] = i % 2;
      const s = servicos[i % servicos.length], s2 = servicos[(i + 2) % servicos.length];
      r.atividades = [{ id: uid(), frente: s[0], descricao: s[1], status: 'andamento' }, { id: uid(), frente: s2[0], descricao: s2[1], status: i % 4 ? 'andamento' : 'concluida' }];
      r.seguranca = { dds: true, tema: TEMAS_DDS[i % 6], acidente: false, descAcidente: '' };
      if (chuva) r.ocorrencias = [{ id: uid(), tipo: 'Chuva', descricao: 'Chuva forte pela manhã impediu a concretagem prevista. Equipe remanejada para serviços internos.', impacto: 1 }];
      else r.nada.ocorrencias = true;
      r.observacoes = i % 3 ? '' : 'Fiscalização solicitou relatório de ensaios de concreto até sexta-feira.';
      if (!r.observacoes) r.nada.observacoes = true;
      if (i % 3 === 0) { r.nada.fotos = false; fotosPend.push([r, s[1]]); } else r.nada.fotos = true;
    }
    r.assinaturas.responsavel.nome = 'Eng. Responsável';
    r.status = i === 1 ? 'rascunho' : 'concluido';
    if (r.status === 'concluido') r.concluidoEm = d + 'T18:00:00';
    App.rdos[chaveRdo(o.id, d)] = r;
  }
  return Promise.all(tarefas).then(() => fotosPend.reduce((p, [r, leg]) => p.then(() =>
    fotoExemplo(leg, '#2a4a6d').then(b => { const id = uid(); r.fotos.push({ id, legenda: leg });
      return Banco.gravar('fotos', id, { id, obraId: o.id, data: r.data, blob: b }); })), Promise.resolve()))
    .then(() => Promise.all(Object.values(App.rdos).filter(r => r.obraId === o.id).map(r => Banco.gravar('rdos', chaveRdo(o.id, r.data), r))));
}
