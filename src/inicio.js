/* =====================================================================
 * PARTIDA
 * ===================================================================== */
function carregarTudo() {
  return Promise.all([Banco.ler('config', 'geral'), Banco.todos('obras'), Banco.todos('rdos')]).then(([c, obras, rdos]) => {
    App.config = c || {}; App.obras = obras || []; App.rdos = {};
    (rdos || []).forEach(r => App.rdos[chaveRdo(r.obraId, r.data)] = r);
  });
}

/* link de convite: #convite=… traz o endereço do servidor e o código da empresa */
function receberConvite() {
  if (location.hash.indexOf('#convite=') !== 0) return;
  const cv = Nuvem.lerConvite(location.hash);
  history.replaceState(null, '', location.pathname + '#/');
  if (!cv) return toast('Link de convite inválido', 4000);
  abrirFolha('<h3>Bem-vindo ao Diário de Obras</h3><p style="font-size:14.5px;color:var(--tinta2);margin:0 0 10px">Digite seu nome. ' +
    'Os diários vão ficar salvos na nuvem da construtora e abrem em qualquer aparelho.</p>' +
    '<input class="campo" id="cvNome" placeholder="Seu nome (ex.: Eng. João Silva)" style="margin-bottom:12px">' +
    '<button class="btn pri cheio" id="cvOk">' + ic('ok') + 'Entrar</button>', f => {
      f.querySelector('#cvOk').onclick = () => {
        const nome = f.querySelector('#cvNome').value.trim(); if (!nome) return toast('Digite seu nome');
        f.querySelector('#cvOk').disabled = true; toast('Conectando…', 2000);
        Nuvem.conectar(cv.u, cv.c, nome).then(() => { fecharFolha(); toast('Pronto! Baixando os diários da construtora…', 4000); render(); })
          .catch(e => { f.querySelector('#cvOk').disabled = false; toast(e.message, 5000); });
      };
    });
}

Banco.abrir().then(carregarTudo).then(() => Nuvem.carregar()).then(() => {
  render(); receberConvite(); Nuvem.sincronizar();
}).catch(e => {
  document.getElementById('app').innerHTML = '<main><div class="aviso e">Erro ao iniciar: ' + esc(e.message) + '</div></main>';
});
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
