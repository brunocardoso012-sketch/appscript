// Vídeo 2: prateleiras da gôndola com os produtos do catálogo do movimento, e o briefing em PDF.
const fs = require('fs');
const { execFileSync } = require('child_process');
const { abrir, Gravador, entrarConstrucao, movel } = require('./lib');

async function mostrarImagem(p, arq, selo, nome) {
  const b64 = fs.readFileSync(arq).toString('base64');
  await p.evaluate(([src, selo, nome]) => {
    const f = document.createElement('div');
    f.id = 'demoPreview';
    f.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(20,22,28,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;opacity:0;transition:opacity .4s;font:600 15px Inter,system-ui,sans-serif;color:#fff';
    f.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><span style="background:#22a06b;border-radius:99px;padding:3px 10px;font-size:13px">' + selo + '</span><span>' + nome + '</span></div>';
    const img = new Image();
    img.id = 'demoImg';
    img.src = src;
    img.style.cssText = 'max-width:90vw;max-height:84vh;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.5);background:#fff';
    f.appendChild(img);
    document.body.appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = '1'; }));
  }, ['data:image/png;base64,' + b64, selo, nome]);
  await p.waitForTimeout(500);
}

(async () => {
  const { p, fechar } = await abrir();
  await entrarConstrucao(p, 'Bruno');
  await p.evaluate(() => { const b = [...document.querySelectorAll('#painelValidacao button')].find((x) => /Fechar|✕|×/.test(x.textContent + (x.getAttribute('aria-label') || ''))); if (b) b.click(); });
  await p.waitForTimeout(400);
  const g = new Gravador(p, 'v2-prateleiras-briefing');
  await g.iniciar();
  await g.espera(700);
  await g.clicarDom(movel('GONDOLA 1'), { depois: 900 });
  await p.waitForSelector('#dlgMovel[open] .mv-plano');
  await g.clicar('.pr-espaco[data-espaco="GONDOLA 1/PONTA-A"] [data-acao="editar-prateleiras"]', { depois: 700 });
  const card = p.locator('.pr-espaco.editando');
  const tela = card.locator('.pr-tela[data-numero="1"]');
  await tela.evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await g.espera(900);
  const arrastar = async (x1, x2) => {
    const r = await tela.boundingBox();
    await g.mover(r.x + r.width * x1, r.y + r.height * 0.5);
    await p.mouse.down();
    g.cliques.push({ t: g.agora(), x: r.x + r.width * x1, y: r.y + r.height * 0.5 });
    await g.mover(r.x + r.width * x2, r.y + r.height * 0.5, 0.7);
    await p.mouse.up();
    await g.espera(500);
  };
  // Primeiro quadrado: BOTIPROMO, com os produtos do movimento.
  await arrastar(0.005, 0.55);
  const r0 = await tela.boundingBox();
  await g.cam({ x: r0.x - 20, y: r0.y - 60, w: r0.width + 40, h: 640 }, { dur: 1 });
  await g.selecionar(card.locator('.pr-painel .pr-ed-mov'), 'BOTIPROMO', { depois: 700 });
  const produto = (nome) => card.locator('.pr-resultado', { hasText: nome }).first();
  await g.clicar(produto('Malbec Gold'), { depois: 400 });
  await g.clicar(produto('Lily Eau de Parfum'), { depois: 400 });
  await g.clicar(produto('Floratta Rose'), { depois: 500 });
  // Segundo quadrado: LÇTO EGEO.
  await tela.evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await g.espera(600);
  await arrastar(0.57, 0.995);
  await g.selecionar(card.locator('.pr-painel .pr-ed-mov'), 'LÇTO EGEO', { depois: 700 });
  await g.clicar(produto('Egeo Dolce'), { depois: 600 });
  await g.cam('tudo', { dur: 0.8 });
  await g.clicar(card.locator('[data-acao="salvar-prateleiras"]'), { depois: 600 });
  await p.waitForSelector('.mv-plano .pg-desenhada[data-espaco="GONDOLA 1/PONTA-A"] .pr-quadrado');
  // O planograma (para todo mundo) já mostra os produtos.
  await p.locator('.mv-plano').first().evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await g.espera(900);
  await g.cam('.mv-plano .pg-desenhada[data-espaco="GONDOLA 1/PONTA-A"][data-numero="1"]', { margem: 60, dur: 1, zoomMax: 2.0 });
  await g.espera(1600);
  await g.cam('tudo', { dur: 0.8 });
  await g.tecla('Escape', 'Esc', 400);
  // Briefing em PDF para quem monta o planograma.
  await g.clicar('#btnBriefing', { depois: 700 });
  await g.cam('#dlgBriefing', { margem: 30, dur: 0.9, zoomMax: 1.8 });
  await g.espera(800);
  const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), g.clicar('#briefingBaixar', { depois: 200 })]);
  const pdf = __dirname + '/out/' + d.suggestedFilename();
  await d.saveAs(pdf);
  execFileSync('pdftoppm', ['-png', '-r', '150', '-f', '2', '-l', '2', pdf, __dirname + '/out/briefing-p']);
  const png = fs.readdirSync(__dirname + '/out').filter((f) => f.startsWith('briefing-p') && f.endsWith('.png'))[0];
  await g.cam('tudo', { dur: 0.7 });
  await mostrarImagem(p, __dirname + '/out/' + png, 'PDF gerado', d.suggestedFilename() + ' · página da Gôndola 1');
  await g.espera(700);
  const bi = await p.locator('#demoImg').boundingBox();
  // Zoom no planograma com os códigos e na tabela de produtos.
  await g.cam({ x: bi.x, y: bi.y, w: bi.width * 0.62, h: bi.height * 0.6 }, { dur: 1.1 });
  await g.espera(1500);
  await g.cam({ x: bi.x, y: bi.y + bi.height * 0.45, w: bi.width, h: bi.height * 0.55 }, { dur: 1.1 });
  await g.espera(2100);
  await g.parar();
  await fechar();
})();
