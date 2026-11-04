// Vídeo 13 (clipe curto): checagem em tempo real — os números da ER mostram os espaços vazios; um clique leva ao
// espaço, ele é preenchido e a contagem sobe na hora.
const { abrir, Gravador, entrarConstrucao } = require('./lib');
(async () => {
  const { p, fechar } = await abrir();
  await entrarConstrucao(p, 'Bruno');
  // Ciclo em branco, com os tipos de movimento do C15 já cadastrados.
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
  await p.locator('#pcStats h3').first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(600);

  const g = new Gravador(p, 'v13-checagem');
  const regiao = { x: 560, y: 200, w: 1040, h: 585 };
  const numeros = async () => {
    const h = await p.locator('#pcStats h3').first().boundingBox();
    return { x: h.x - 14, y: h.y - 14, w: h.width + 28, h: 330 };
  };
  await g.iniciar();
  await g.cam(await numeros(), { dur: 0 });
  await g.espera(1600);
  // Os espaços vazios aparecem na hora; um clique leva ao primeiro.
  await g.clicar(p.locator('#pcStats .pc-vazios summary'), { depois: 700 });
  await g.clicar(p.locator('#pcStats .pc-vazios button', { hasText: /Pir.mide 1|PIRAMIDE 1/ }).first(), { depois: 700 });
  await g.cam(regiao, { dur: 0.8 });
  const esp = p.locator('#pcForm .pc-espaco[data-espaco="PIRAMIDE 1"]');
  await g.selecionar(esp.locator('select.rs-marca').first(), 'BOT', { depois: 500 });
  await g.selecionar(esp.locator('.rs-etq').first().locator('select').first(), 'BOTIPROMO', { depois: 700 });
  await p.waitForFunction(() => document.getElementById('pcGravacao').textContent === 'Tudo salvo');
  // Tira a seleção: a contagem já subiu.
  const x = p.locator('#pcForm button[aria-label="Tirar a seleção"]');
  await x.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await g.ir(x);
  const bx = await x.boundingBox();
  g.cliques.push({ t: g.agora(), x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 });
  await x.click();
  await g.espera(300);
  await g.rolar('#pcStats h3', 'start');
  await g.cam(await numeros(), { dur: 0.8 });
  await g.espera(2400);
  await g.parar();
  await fechar();
})();
