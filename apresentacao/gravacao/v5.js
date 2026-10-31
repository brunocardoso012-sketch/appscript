// Vídeo 5: empilhamento dos movimentos por ciclo (calendário dos ciclos).
const { abrir, Gravador, entrarConstrucao } = require('./lib');
(async () => {
  const { p, fechar } = await abrir();
  await entrarConstrucao(p, 'Bruno');
  // Fecha o painel da validação para o calendário usar a largura toda.
  await p.evaluate(() => { const b = [...document.querySelectorAll('#painelValidacao button')].find((x) => /Fechar|✕|×/.test(x.textContent + (x.getAttribute('aria-label') || ''))); if (b) b.click(); });
  await p.waitForTimeout(500);
  const g = new Gravador(p, 'v5-empilhamento');
  await g.iniciar();
  await g.espera(900);
  await g.clicar('#btnCalendario', { depois: 1000 });
  await g.clicar('#calCorpo .cal-controle button[data-valor="compacta"]', { depois: 700 });
  await g.selecionar(p.locator('#calCorpo .cal-controle', { hasText: 'Movimentos por ciclo' }).locator('select'), '5', { depois: 900 });
  const quadro = async () => {
    const a = await p.locator('#calCorpo .cal-trilha').first().boundingBox();
    const ms = await p.locator('#calCorpo .cal-movs .cal-mov').evaluateAll((l) => l.map((e) => e.getBoundingClientRect().bottom));
    return { x: 120, y: a.y - 70, w: 1450, h: Math.max(...ms) - a.y + 90 };
  };
  await g.cam(await quadro(), { dur: 1.1 });
  await g.espera(2600);
  const ctl = (v) => '#calCorpo .cal-controle button[data-valor="' + v + '"]';
  // Troca o critério do empilhamento.
  await g.cam({ x: 0, y: 170, w: 1600, h: 470 }, { dur: 0.8 });
  await g.clicar(ctl('gmv'), { depois: 1700 });
  await g.clicar(ctl('exposicao'), { depois: 1700 });
  await g.clicar(ctl('equilibrio'), { depois: 1200 });
  // Zoom no topo do ciclo da tela.
  const c15 = await p.locator('#calCorpo .cal-mov[data-ciclo="C15/2026"]').evaluateAll((l) => {
    const r = l.slice(0, 3).map((e) => e.getBoundingClientRect());
    return { x: Math.min(...r.map((b) => b.left)), y: Math.min(...r.map((b) => b.top)), w: Math.max(...r.map((b) => b.right)) - Math.min(...r.map((b) => b.left)), h: Math.max(...r.map((b) => b.bottom)) - Math.min(...r.map((b) => b.top)) };
  });
  await g.cam({ x: c15.x - 30, y: c15.y - 90, w: c15.w + 60, h: c15.h + 110 }, { dur: 1 });
  await g.espera(2200);
  // Construção: ordem e selos (medalha e hotspot).
  await g.cam('tudo', { dur: 0.9 });
  await g.clicar('#calCorpo .cal-ordenar', { depois: 900 });
  await p.waitForSelector('#calCorpo .cal-ordem li');
  const item = (i) => p.locator('#calCorpo .cal-ordem li').nth(i);
  await g.cam('#calCorpo .cal-ordem', { margem: 20, dur: 0.9, zoomMax: 1.8 });
  await g.clicar(item(0).locator('.cal-ordem-hot'), { depois: 600 });
  await g.selecionar(item(0).locator('.cal-ordem-medalha'), 'OURO', { depois: 600 });
  await g.selecionar(item(1).locator('.cal-ordem-medalha'), 'PRATA', { depois: 600 });
  await g.selecionar(item(2).locator('.cal-ordem-medalha'), 'BRONZE', { depois: 600 });
  await g.clicar(p.locator('#calCorpo .cal-ordem button:text-is("Salvar")'), { depois: 900 });
  await p.waitForFunction(() => App.estado.dados.selosCalendario['C15/2026']);
  const sel = await p.locator('#calCorpo .cal-mov[data-ciclo="C15/2026"]').first().boundingBox();
  await g.cam({ x: sel.x - 40, y: sel.y - 60, w: sel.width + 80, h: 260 }, { dur: 1 });
  await g.espera(2400);
  await g.cam('tudo', { dur: 1 });
  await g.espera(1500);
  await g.parar();
  await fechar();
})();
