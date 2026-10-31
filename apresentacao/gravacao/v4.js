// Vídeo 4: representatividade por marca e por tipo de movimento (barras 100% por ER) e o filtro na planta.
const { abrir, Gravador } = require('./lib');
(async () => {
  const { p, fechar } = await abrir();
  const g = new Gravador(p, 'v4-marca-tipo');
  await g.iniciar();
  await g.espera(1000);
  await g.clicar('#btnAnalytics', { depois: 700 });
  const marcas = p.locator('#anCorpo .an-cartao', { hasText: 'Marcas em cada ER' }).first();
  const classes = p.locator('#anCorpo .an-cartao', { hasText: 'Classificação em cada ER' }).first();
  await g.rolar('#anCorpo .an-cartao:has(.an-barras)', 'start');
  // Os dois gráficos juntos.
  const bm = await marcas.boundingBox();
  const bc = await classes.boundingBox();
  await g.cam({ x: bm.x - 10, y: bm.y - 10, w: bm.width + 20, h: bc.y + bc.height - bm.y + 20 }, { dur: 1.1 });
  await g.espera(2600);
  // Zoom nas marcas.
  await g.cam(marcas, { margem: 14, dur: 0.9 });
  await g.espera(1500);
  const seg = (er, nome) => p.locator('#anCorpo button.an-seg[title^="' + er + ' · ' + nome + '"]').first();
  await g.clicar(seg('ER P', 'EUD'), { depois: 600 });
  // A planta ao lado mostra só a Eudora.
  await g.camPlanta({ margem: 0 });
  await g.espera(2600);
  await g.cam('tudo', { dur: 0.9 });
  await g.espera(600);
  await g.cam(classes, { margem: 14, dur: 0.9 });
  await g.espera(1400);
  await g.clicar(seg('ER G', 'Promoção'), { depois: 600 });
  await g.camPlanta({ margem: 0 });
  await g.espera(2200);
  await g.cam({ x: 0, y: 80, w: 860, h: 50 }, { dur: 0.9 });
  await g.espera(1600);
  await g.cam('tudo', { dur: 1 });
  await g.espera(1800);
  await g.parar();
  await fechar();
})();
