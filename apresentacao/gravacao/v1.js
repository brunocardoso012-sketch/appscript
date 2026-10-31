// Vídeo 1: montar um móvel no ciclo em construção, com os números da ER mudando na hora.
const { abrir, Gravador, entrarConstrucao, novoCiclo, movel } = require('./lib');
(async () => {
  const { p, fechar } = await abrir();
  await entrarConstrucao(p, 'Bruno');
  await novoCiclo(p, 'C16/2026', 'C15/2026');
  await p.waitForSelector('#toast', { state: 'hidden', timeout: 15000 }).catch(() => {});
  await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; document.getElementById('pcCorpo') && (document.getElementById('pcCorpo').scrollTop = 0); });
  const g = new Gravador(p, 'v1-montar-movel');
  const verNumeros = async (ms) => {
    await p.locator('#pcStats h3').first().waitFor({ timeout: 3000 }).catch(()=>{});
    await g.rolar('#pcStats h3', 'start');
    let h = null;
    await p.screenshot({ path: 'shots/dbg-v1.png' }).catch(()=>{});
    for (let i = 0; i < 20 && !h; i++) { h = await p.locator('#pcStats h3').first().boundingBox(); if (!h) await p.waitForTimeout(150); }
    console.log('numeros', h);
    await g.cam({ x: h.x - 12, y: h.y - 14, w: h.width + 24, h: 470 }, { dur: 1.1, margem: 0 });
    await g.espera(ms);
  };
  await g.iniciar();
  await g.espera(1500);
  // Números da ER antes da mudança.
  await verNumeros(2600);
  await g.cam('tudo', { dur: 0.9 });
  // Seleciona a pirâmide na planta.
  await g.clicarDom(movel('PIRAMIDE 1'), { depois: 700 });
  const esp = p.locator('#pcForm .pc-espaco[data-espaco="PIRAMIDE 1"]');
  // Câmera na pirâmide + formulário.
  const b1 = await p.locator(movel('PIRAMIDE 1')).first().boundingBox();
  const b2 = await esp.boundingBox();
  const x0 = b1.x - 160;
  await g.cam({ x: x0, y: Math.min(b1.y, b2.y) - 60, w: b2.x + b2.width + 10 - x0, h: 600 }, { dur: 1 });
  await g.espera(900);
  await g.selecionar(esp.locator('select.rs-marca').first(), 'EUD', { depois: 900 });
  const etq = esp.locator('.rs-etq');
  await g.selecionar(etq.nth(0).locator('select').first(), 'OUTLET EUD', { depois: 300 });
  await g.selecionar(etq.nth(0).locator('select.rs-marca'), 'EUD', { depois: 900 });
  await g.selecionar(etq.nth(1).locator('select').first(), 'SIÀGE ULTIMATE', { depois: 300 });
  await g.selecionar(etq.nth(1).locator('select.rs-marca'), 'EUD', { depois: 900 });
  await g.selecionar(esp.locator('select').nth(1), '', { depois: 700 });
  // Zoom na pirâmide pintada.
  await g.cam({ x: b1.x - 140, y: b1.y - 120, w: b1.width + 280, h: b1.height + 200 }, { dur: 1, zoomMax: 2.2 });
  await g.espera(2000);
  await p.waitForFunction(() => document.getElementById('pcGravacao').textContent === 'Tudo salvo');
  // Tira a seleção: os números da ER aparecem com a mudança.
  await g.cam('tudo', { dur: 0.9 });
  const x = p.locator('#pcForm button[aria-label="Tirar a seleção"]');
  await g.ir(x);
  await g.espera(200);
  const bx = await x.boundingBox();
  g.cliques.push({ t: g.agora(), x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 });
  await x.click();
  await g.espera(700);
  await verNumeros(3600);
  await g.cam('tudo', { dur: 1 });
  await g.espera(1800);
  await g.parar();
  await fechar();
})();
