// Vídeo 6: representatividade de cada móvel e movimento na ER (mapa de calor movimento × ER).
const { abrir, Gravador } = require('./lib');
(async () => {
  const { p, fechar } = await abrir();
  const g = new Gravador(p, 'v6-mapa-er');
  await g.iniciar();
  await g.espera(1000);
  await g.clicar('#btnAnalytics', { depois: 900 });
  const mapa = p.locator('#anCorpo .an-mapa-cartao').first();
  const bm = await mapa.boundingBox();
  // Topo do mapa: movimentos, móveis e a fatia de cada ER.
  await g.cam({ x: bm.x, y: bm.y, w: bm.width, h: 520 }, { dur: 1.1 });
  await g.espera(2200);
  // Ícones dos móveis de cada movimento.
  const linha = (nome) => mapa.locator('tr').filter({ has: p.locator('.an-mov-nome span', { hasText: new RegExp('^' + nome + '$') }) }).first();
  const icones = linha('SIÀGE ULTIMATE').locator('td.an-col-moveis');
  await g.ir(icones);
  await g.cam(icones, { margem: 60, dur: 0.8, zoomMax: 2.4 });
  await g.espera(1800);
  await g.cam({ x: bm.x, y: bm.y, w: bm.width, h: 520 }, { dur: 0.8 });
  // Alterna % da ER / Espaços.
  await g.clicar(mapa.locator('.an-segmentado button', { hasText: 'Espaços' }), { depois: 1500 });
  await g.clicar(mapa.locator('.an-segmentado button', { hasText: '% da ER' }), { depois: 900 });
  // Ordena pela ER G.
  await g.clicar(mapa.locator('th.an-col-er button', { hasText: 'ER G' }).first(), { dx: 18, dy: 8, depois: 1700 });
  // Clica numa célula: a planta da ER G mostra onde o movimento está.
  const cel = linha('BOTIPROMO').locator('td.an-celula button').nth(2);
  await g.clicar(cel, { depois: 700 });
  await g.camPlanta({ margem: 0 });
  await g.espera(2600);
  // Sobre a análise: o que conta como espaço em cada tipo de móvel.
  await g.cam('tudo', { dur: 0.8 });
  await g.clicar('#anInfo', { depois: 900 });
  const h3 = p.locator('#anInfoCorpo h3', { hasText: 'O que conta como espaço' }).first();
  await h3.evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await g.espera(1000);
  const sec = h3.locator('xpath=..');
  await g.cam(sec, { margem: 8, dur: 1.1 });
  await g.espera(3200);
  await g.parar();
  await fechar();
})();
