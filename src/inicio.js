/* =====================================================================
 * PARTIDA
 * ===================================================================== */
function carregarTudo() {
  return Promise.all([Banco.ler('config', 'geral'), Banco.todos('obras'), Banco.todos('rdos')]).then(([c, obras, rdos]) => {
    App.config = c || {}; App.obras = obras || []; App.rdos = {};
    (rdos || []).forEach(r => App.rdos[chaveRdo(r.obraId, r.data)] = r);
  });
}
Banco.abrir().then(carregarTudo).then(render).catch(e => {
  document.getElementById('app').innerHTML = '<main><div class="aviso e">Erro ao iniciar: ' + esc(e.message) + '</div></main>';
});
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
