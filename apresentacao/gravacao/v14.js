// Vídeo 14 (clipe curto): estratégia unificada — todos os ciclos no mesmo lugar (troca de ciclo e de ER na hora)
// e um único link para ver a estratégia.
const { abrir, Gravador } = require('./lib');
(async () => {
  const { p, fechar } = await abrir({ antes: (ctx) => ctx.grantPermissions(['clipboard-read', 'clipboard-write']) });
  const g = new Gravador(p, 'v14-um-link');
  await g.iniciar();
  await g.espera(900);
  // Os ciclos, um depois do outro, no mesmo app.
  await g.cam({ x: 0, y: 0, w: 1200, h: 675 }, { dur: 0.8 });
  for (const ciclo of ['C13/2026', 'C14/2026', 'C15/2026']) {
    await g.selecionar('#selCiclo', ciclo, { depois: 1000 });
  }
  // As ERs também.
  await g.clicar('#abasPlanta .aba:has-text("ER G")', { depois: 1200 });
  await g.clicar('#abasPlanta .aba:has-text("ER P")', { depois: 900 });
  // Um único link para ver a estratégia, no mesmo ciclo e ER.
  await g.clicar('#btnLink', { depois: 300 });
  await g.cam('tudo', { dur: 0.7 }); // o aviso "Link copiado" aparece embaixo
  console.log('toast:', await p.locator('#toast').textContent().catch(() => ''));
  await g.espera(2200);
  await g.parar();
  await fechar();
})();
