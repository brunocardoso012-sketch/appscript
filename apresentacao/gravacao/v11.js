// Vídeo 11: inventário da rede — em quantas lojas cada móvel está (balão na planta) e a coluna "Na rede" no Analytics.
const fs = require('fs');
const { abrir, Gravador, movel } = require('./lib');

// Aba "Inventario" de exemplo: uma rede de 1.000 lojas (ER P 380, ER M 320, ER G 200, ER GG 100). Cada móvel está
// em todas as lojas das ERs que o têm, menos alguns que só parte das lojas tem.
const LOJAS_POR_ER = { 'ER P': 380, 'ER M': 320, 'ER G': 200, 'ER GG': 100 };
const EXCECOES = { 'PIRAMIDE 2': 540, 'TOTEM 1': 860, 'MESA DESTAQUE 1': 780, 'PDV MOVEL 1': 610, 'MOVEL DE FILA 2': 720 };

(async () => {
  const { p, fechar } = await abrir();
  const linhas = await p.evaluate(([porEr, excecoes]) => {
    const lojas = {};
    App.estado.dados.plantas.forEach((pl) => pl.moveis.forEach((m) => {
      if (/^EXTRA/.test(m.id) || porEr[pl.nome] === undefined) return;
      lojas[m.id] = (lojas[m.id] || 0) + porEr[pl.nome];
    }));
    Object.keys(excecoes).forEach((id) => { if (lojas[id]) lojas[id] = excecoes[id]; });
    const total = Object.values(porEr).reduce((a, b) => a + b, 0);
    return [['ID Móvel', 'Lojas'], ['TOTAL', total]].concat(Object.keys(lojas).sort().map((id) => [id, lojas[id]]));
  }, [LOJAS_POR_ER, EXCECOES]);
  fs.mkdirSync(__dirname + '/out', { recursive: true });
  fs.writeFileSync(__dirname + '/out/Inventario (exemplo).csv', linhas.map((l) => l.join(';')).join('\n') + '\n');
  // A versão web não lê a aba Inventario (só o Apps Script): entra aqui, pelo mesmo leitor do app.
  await p.evaluate((v) => { App.estado.dados.inventario = inventarioDeValores_(v); }, linhas);
  await p.click('#abasPlanta .aba:has-text("ER M")');
  await p.click('#abasPlanta .aba:has-text("ER P")');
  await p.waitForTimeout(500);

  const g = new Gravador(p, 'v11-inventario');
  /** Um ponto do móvel (ou do espaço) que não esteja coberto por outro. */
  const ponto = (id, espaco) => p.evaluate(([id, espaco]) => {
    const gs = [...document.querySelectorAll('#slide .movel')].filter((e) => e.getAttribute('data-movel') === id && (!espaco || e.getAttribute('data-espaco') === espaco));
    for (const e of gs) {
      const b = e.getBoundingClientRect();
      for (const [fx, fy] of [[0.5, 0.6], [0.5, 0.75], [0.35, 0.6], [0.65, 0.6], [0.5, 0.4], [0.3, 0.8], [0.7, 0.8]]) {
        const x = b.x + b.width * fx, y = b.y + b.height * fy;
        const alvo = document.elementFromPoint(x, y);
        const m = alvo && alvo.closest && alvo.closest('.movel');
        if (m && m.getAttribute('data-movel') === id && (!espaco || m.getAttribute('data-espaco') === espaco)) return { x, y };
      }
    }
    return null;
  }, [id, espaco || '']);
  const passar = async (id, espaco, ms) => {
    const c = await ponto(id, espaco);
    if (!c) throw new Error('não achei ' + id);
    await g.mover(c.x, c.y);
    await p.waitForSelector('.balao-rede:not([hidden])');
    // Câmera com o móvel e o balão (que fica no canto de cima à direita da planta).
    const bl = await p.locator('.balao-rede').boundingBox();
    const x0 = Math.min(c.x - 170, bl.x - 30), y0 = Math.min(c.y - 150, bl.y - 30);
    const x1 = Math.max(c.x + 170, bl.x + bl.width + 14), y1 = Math.max(c.y + 130, bl.y + bl.height + 30);
    await g.cam({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, { dur: 0.8 });
    await g.espera(ms || 1800);
  };

  await g.iniciar();
  await g.espera(900);
  await g.camPlanta({ margem: 20, zoomMax: 1.8 });
  await g.espera(500);
  // ER P: a gôndola está em toda a rede; o totem e a pirâmide 2, só em parte das lojas.
  await passar('GONDOLA 1', 'PONTA-A');
  await passar('TOTEM 1', null);
  await passar('PIRAMIDE 2', null);
  // ER GG: um móvel que só as lojas maiores têm.
  await g.cam('tudo', { dur: 0.7 });
  await g.clicar('#abasPlanta .aba:has-text("ER GG")', { depois: 700 });
  await g.camPlanta({ margem: 20, zoomMax: 1.8 });
  await passar('GONDOLA 4', null, 2000);
  await g.mover(1500, 860);
  // Analytics: a coluna "Na rede" com o alcance de cada movimento.
  await g.cam('tudo', { dur: 0.7 });
  await g.clicar('#btnAnalytics', { depois: 900 });
  const mapa = p.locator('#anCorpo .an-mapa-cartao').first();
  const th = await mapa.locator('th.an-col-rede').boundingBox();
  const tab = await mapa.boundingBox();
  await g.cam({ x: tab.x, y: th.y - 30, w: th.x + th.width + 30 - tab.x, h: 420 }, { dur: 1 });
  await g.espera(2000);
  const celula = mapa.locator('td.an-col-rede').nth(2);
  await g.ir(celula);
  await g.espera(2600);
  await g.cam('tudo', { dur: 0.9 });
  await g.espera(1200);
  await g.parar();
  await fechar();
})();
