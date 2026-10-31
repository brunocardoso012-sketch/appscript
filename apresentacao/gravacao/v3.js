// Vídeo 3: dispersão GMV esperado × espaço.
const { abrir, Gravador } = require('./lib');
(async () => {
  const { p, fechar } = await abrir();
  const g = new Gravador(p, 'v3-dispersao');
  await g.iniciar();
  await g.espera(1200);
  await g.clicar('#btnAnalytics', { depois: 900 });
  await g.cam('#painelAnalytics', { margem: 0, dur: 1 });
  await g.espera(900);
  await g.rolar('#anCorpo .an-gmv-cartao', 'center');
  await g.cam('#anCorpo .an-gmv-cartao', { margem: 12, dur: 1 });
  await g.espera(1600);
  // Passa o mouse por alguns pontos: acima e abaixo da diagonal.
  const pontos = p.locator('#anCorpo .an-disp-ponto');
  const n = await pontos.count();
  const caixas = [];
  for (let i = 0; i < n; i++) caixas.push(await pontos.nth(i).boundingBox());
  caixas.sort((a, b) => a.y - b.y);
  for (const b of [caixas[0], caixas[Math.floor(n / 2)], caixas[n - 1]]) {
    await g.mover(b.x + b.width / 2, b.y + b.height / 2);
    await g.espera(1700);
  }
  // Troca a ER: os pontos mudam.
  for (const er of ['ER M', 'ER GG', 'ER P']) {
    await g.clicar(p.locator('#anCorpo .an-gmv-cartao .an-segmentado button', { hasText: er }), { depois: 1300 });
  }
  // Clica num ponto (o que rende menos que o espaço): a planta ao lado mostra só onde o movimento está.
  const alvo = p.locator('#anCorpo .an-disp-ponto[aria-label^="SIÀGE ULTIMATE"]').first();
  const b = await alvo.boundingBox();
  await g.mover(b.x + b.width / 2, b.y + b.height / 2);
  await g.espera(900);
  g.cliques.push({ t: g.agora(), x: b.x + b.width / 2, y: b.y + b.height / 2 });
  await alvo.dispatchEvent('click');
  await g.espera(500);
  await g.cam('tudo', { dur: 1.1 });
  await g.espera(1200);
  await g.camPlanta({ margem: 0 });
  await g.espera(2400);
  await g.parar();
  await fechar();
})();
