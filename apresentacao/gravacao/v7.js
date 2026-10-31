// Vídeo 7: o tutorial guiando um usuário novo.
const { abrir, Gravador } = require('./lib');
(async () => {
  const { p, fechar } = await abrir({ tutorial: true });
  await p.waitForSelector('.tut-boas-vindas');
  const g = new Gravador(p, 'v7-tutorial');
  await g.iniciar();
  await g.espera(800);
  await g.cam('.tut-boas-vindas', { margem: 60, dur: 1, zoomMax: 1.8 });
  await g.espera(2600);
  await g.clicar('.tut-boas-vindas button:has-text("Fazer o tour")', { depois: 700 });
  const uniao = async () => p.evaluate(() => {
    const r = ['.tut-foco', '.tut-balao'].map((s) => document.querySelector(s)).filter(Boolean).map((e) => e.getBoundingClientRect()).filter((b) => b.width);
    const x0 = Math.min(...r.map((b) => b.left)), y0 = Math.min(...r.map((b) => b.top));
    return { x: x0, y: y0, w: Math.max(...r.map((b) => b.right)) - x0, h: Math.max(...r.map((b) => b.bottom)) - y0 };
  });
  let n = 0;
  while (await p.locator('.tut-balao button:has-text("Próximo")').count()) {
    await p.waitForTimeout(350);
    await g.cam(await uniao(), { margem: 50, dur: 0.8, zoomMax: 1.7 });
    await g.espera(n === 2 ? 1700 : 1250);
    await g.clicar('.tut-balao button:has-text("Próximo")', { depois: 250 });
    n++;
  }
  await p.waitForTimeout(350);
  await g.cam(await uniao(), { margem: 50, dur: 0.8, zoomMax: 1.7 });
  await g.espera(1600);
  await g.clicar('.tut-balao button:has-text("Concluir")', { depois: 500 });
  await g.cam('tudo', { dur: 1 });
  await g.espera(1500);
  // Para rever: engrenagem › Ver o tutorial.
  await g.clicar('#btnConfig', { depois: 500 });
  await g.cam('#btnTutorial', { margem: 160, dur: 0.8, zoomMax: 1.8 });
  await g.ir('#btnTutorial');
  await g.espera(1800);
  await g.parar();
  console.log('passos', n);
  await fechar();
})();
