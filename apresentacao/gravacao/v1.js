// Vídeo 1: montar uma gôndola num ciclo em construção em branco, com os números da ER mudando na hora.
const { abrir, Gravador, entrarConstrucao, movel } = require('./lib');
(async () => {
  const { p, fechar } = await abrir();
  await entrarConstrucao(p, 'Bruno');
  // Ciclo em branco, com os tipos de movimento (e o GMV) do C15 já cadastrados (passo 1), para a planta começar vazia.
  await p.evaluate(async () => {
    const C = { papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bruno' };
    const run = (pedido) => new Promise((ok, falha) => google.script.run.withSuccessHandler(ok).withFailureHandler(falha).salvarRascunho(C, pedido));
    await run({ acao: 'criar', ciclo: 'C16/2026', origem: '' });
    const tipos = Object.values(App.estado.dados.tiposMovimento['C15/2026']).map((t) => ({ etiqueta: t.texto, classificacao: t.classificacao, gmv: t.gmv }));
    await run({ acao: 'salvarTipos', ciclo: 'C16/2026', linhas: tipos });
  });
  await p.reload();
  await p.waitForFunction(() => typeof App !== 'undefined' && App.estado.dados && App.estado.ciclo === 'C16/2026', null, { timeout: 15000 });
  await p.waitForSelector('#toast', { state: 'hidden', timeout: 12000 }).catch(() => {});
  await p.waitForTimeout(800);

  const g = new Gravador(p, 'v1-montar-movel');
  const verNumeros = async (ms) => {
    await g.rolar('#pcStats h3', 'start');
    let h = null;
    for (let i = 0; i < 20 && !h; i++) { h = await p.locator('#pcStats h3').first().boundingBox(); if (!h) await p.waitForTimeout(150); }
    await g.cam({ x: h.x - 12, y: h.y - 14, w: h.width + 24, h: 470 }, { dur: 1.1, margem: 0 });
    await g.espera(ms);
  };
  const espaco = (id) => p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 1/' + id + '"]').first();
  const gondola = () => p.evaluate(() => {
    const r = [...document.querySelectorAll('#slide .movel[data-movel^="GONDOLA 1"]')].map((e) => e.getBoundingClientRect());
    const x = Math.min(...r.map((b) => b.left)), y = Math.min(...r.map((b) => b.top));
    return { x, y, w: Math.max(...r.map((b) => b.right)) - x, h: Math.max(...r.map((b) => b.bottom)) - y };
  });
  /** Câmera com a gôndola e o espaço do formulário lado a lado. */
  const juntos = async (id) => {
    const gb = await gondola();
    const fb = await espaco(id).boundingBox();
    const x = gb.x - 110;
    const y = Math.min(gb.y - 140, fb.y - 20);
    await g.cam({ x, y, w: fb.x + fb.width + 14 - x, h: Math.max(gb.y + gb.h + 80, fb.y + fb.height) - y }, { dur: 0.9, margem: 0 });
  };
  /** Preenche um espaço da gôndola: marca e etiquetas (a etiqueta segue a cor da marca do espaço). */
  const preencher = async (id, marca, etiquetas) => {
    // Rola o painel até o espaço ficar logo abaixo do cabeçalho fixo (ciclo e "Tudo salvo").
    await espaco(id).evaluate((e) => {
      let c = e.parentElement;
      while (c && !(c.scrollHeight > c.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(c).overflowY))) c = c.parentElement;
      const topo = document.getElementById('pcTopo').getBoundingClientRect().bottom;
      c.scrollBy({ top: e.getBoundingClientRect().top - topo - 12, behavior: 'smooth' });
    });
    await g.espera(700);
    await juntos(id);
    await g.selecionar(espaco(id).locator('select.rs-marca').first(), marca, { depois: 700 });
    for (let i = 0; i < etiquetas.length; i++) {
      if (i) await g.clicar(espaco(id).locator('button', { hasText: 'Adicionar etiqueta' }), { depois: 400 });
      await g.selecionar(espaco(id).locator('.rs-etq').nth(i).locator('select').first(), etiquetas[i], { depois: 650 });
    }
  };

  await g.iniciar();
  await g.espera(1100);
  // Antes: a ER sem nada preenchido.
  await verNumeros(2000);
  await g.cam('tudo', { dur: 0.9 });
  await g.espera(400);
  await g.clicarDom(movel('GONDOLA 1'), { depois: 800 });
  await preencher('PONTA-A', 'BOT', ['BOTIPROMO', 'LÇTO EGEO']);
  await preencher('MEIO-A', 'EUD', ['SIÀGE ULTIMATE']);
  await preencher('MEIO-B', 'QDB', ['LIQUIDA QDB']);
  // Zoom na gôndola pintada.
  const gb = await gondola();
  await g.cam({ x: gb.x - 120, y: gb.y - 120, w: gb.w + 240, h: gb.h + 200 }, { dur: 1, zoomMax: 2.3 });
  await g.espera(1900);
  await p.waitForFunction(() => document.getElementById('pcGravacao').textContent === 'Tudo salvo');
  // Tira a seleção: os números da ER aparecem com a gôndola.
  await g.cam('tudo', { dur: 0.9 });
  const x = p.locator('#pcForm button[aria-label="Tirar a seleção"]');
  await x.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await g.ir(x);
  await g.espera(200);
  const bx = await x.boundingBox();
  g.cliques.push({ t: g.agora(), x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 });
  await x.click();
  await g.espera(600);
  await verNumeros(3000);
  await g.cam('tudo', { dur: 1 });
  await g.espera(1100);
  await g.parar();
  await fechar();
})();
