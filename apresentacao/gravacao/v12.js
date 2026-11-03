// Vídeo 12: ajuste de estratégia no modo desenvolvedor — a ponta B da gôndola 1, fixa de O.U.i só na ER P,
// passa a ser fixa também na ER M (regra da cascata), e a planta da ER M muda na hora.
const { abrir, Gravador, movel } = require('./lib');
(async () => {
  const { p, fechar } = await abrir();
  await p.click('#abasPlanta .aba:has-text("ER M")');
  await p.waitForTimeout(500);

  const g = new Gravador(p, 'v12-regras-cascata');
  const gondola = () => p.evaluate(() => {
    const r = [...document.querySelectorAll('#slide .movel[data-movel="GONDOLA 1"][data-espaco="PONTA-B"], #slide .grupo-etiquetas[data-movel="GONDOLA 1/PONTA-B"]')]
      .map((e) => e.getBoundingClientRect()).filter((b) => b.width);
    const x = Math.min(...r.map((b) => b.left)), y = Math.min(...r.map((b) => b.top));
    return { x, y, w: Math.max(...r.map((b) => b.right)) - x, h: Math.max(...r.map((b) => b.bottom)) - y };
  });
  const regra = p.locator('#dlgDev .dev-bloco', { hasText: 'Espaços fixos numa ER' }).first();

  await g.iniciar();
  await g.espera(800);
  // Antes: na ER M, a ponta B da gôndola 1 é livre (aqui, MULTI PROMO).
  const g1 = await gondola();
  await g.cam({ x: g1.x - 90, y: g1.y - 70, w: g1.w + 180, h: g1.h + 140 }, { dur: 1, zoomMax: 2.8 });
  await g.espera(2200);
  // Entra no modo desenvolvedor (com senha).
  await g.cam('tudo', { dur: 0.8 });
  await g.clicar('#btnConfig', { depois: 300 });
  await g.clicar('#btnDesenvolvedor', { depois: 500 });
  await p.waitForSelector('#dlgDesenvolvedor[open]');
  await g.cam('#dlgDesenvolvedor', { margem: 40, dur: 0.6, zoomMax: 2 });
  await g.clicar('#devSenha', { depois: 150 });
  await p.locator('#devSenha').pressSequentially('desenvolvedor_exposicao', { delay: 25 });
  await g.clicar('#devEntrar', { depois: 200 });
  await p.waitForSelector('#dlgDev[open]');
  await g.cam('tudo', { dur: 0.7 });
  await g.espera(700);
  // Cascata entre ERs: a ordem e as exceções.
  await g.clicar('#dlgDev [data-dev-aba="cascata"]', { depois: 600 });
  await g.cam(regra, { margem: 16, dur: 0.9 });
  await g.espera(1600);
  // A regra muda: fixo também na ER M.
  await g.clicar(regra.locator('label.dev-opcao', { hasText: /^ER M$/ }), { depois: 500 });
  await g.cam(regra.locator('.dev-regra').first(), { margem: 20, dur: 0.8, zoomMax: 2.2 });
  await g.espera(1800);
  await g.cam(regra, { margem: 16, dur: 0.8 });
  await g.clicar(regra.locator('button', { hasText: 'Salvar espaços fixos' }), { depois: 900 });
  // O selo passa de "padrão do código" para "personalizado", com o "Voltar ao padrão do código".
  await g.cam(regra.locator('.dev-secao-topo'), { margem: 24, dur: 0.8, zoomMax: 2.2 });
  await g.espera(1800);
  // Depois: a ponta B da ER M fica fixa de O.U.i (hachura e cadeado).
  await g.cam('tudo', { dur: 0.7 });
  await g.clicar('#devFechar', { depois: 700 });
  const g2 = await gondola();
  await g.cam({ x: g2.x - 90, y: g2.y - 70, w: g2.w + 180, h: g2.h + 140 }, { dur: 1, zoomMax: 2.8 });
  await g.espera(2800);
  await g.cam('tudo', { dur: 1 });
  await g.espera(900);
  await g.parar();
  console.log(await p.evaluate(() => JSON.stringify(App.resolver.movimento('C15/2026', '02', 'GONDOLA 1/PONTA-B'))));
  await fechar();
})();
