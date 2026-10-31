// Vídeo 9: Construir loja — aumentar a ER, adicionar 3 móveis e ajustar a posição de outros.
const { abrir, Gravador } = require('./lib');
(async () => {
  const { p, fechar } = await abrir();
  // Modo desenvolvedor e Construir loja abertos antes da gravação, na ER P.
  await p.click('#abasPlanta .aba:has-text("ER P")');
  await p.click('#btnConfig');
  await p.click('#btnDesenvolvedor');
  await p.waitForSelector('#dlgDesenvolvedor[open], #dlgDev[open]');
  if (await p.locator('#dlgDesenvolvedor[open]').count()) {
    await p.fill('#devSenha', 'desenvolvedor_exposicao');
    await p.click('#devEntrar');
  }
  await p.waitForSelector('#dlgDev[open]');
  await p.click('#dlgDev [data-dev-aba="modulos"]');
  await p.click('#btnConstruir');
  if (await p.locator('#dlgDev[open]').count()) await p.click('#devFechar');
  await p.waitForSelector('#toast', { state: 'hidden', timeout: 12000 }).catch(() => {});
  await p.waitForTimeout(600);

  const g = new Gravador(p, 'v9-construir-loja');
  /** Vetores na tela de 1 m em X e em Y no piso, pelas marcas da grade (X 0, X 5… / Y 0, Y 5…). */
  const eixos = () => p.evaluate(() => {
    const pos = {};
    document.querySelectorAll('#slide text').forEach((t) => {
      const s = t.textContent.trim();
      if (/^[XY] \d+$/.test(s)) { const b = t.getBoundingClientRect(); pos[s] = { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
    });
    return { x: { x: (pos['X 5'].x - pos['X 0'].x) / 5, y: (pos['X 5'].y - pos['X 0'].y) / 5 }, y: { x: (pos['Y 5'].x - pos['Y 0'].x) / 5, y: (pos['Y 5'].y - pos['Y 0'].y) / 5 } };
  });
  const campos = () => p.evaluate(() => ({ x: +document.querySelector('#cnsCampos [data-campo="x"]').value, y: +document.querySelector('#cnsCampos [data-campo="y"]').value }));
  /** Um ponto visível do móvel (que não esteja coberto por outro), para pegar com o mouse. */
  const pegador = (id) => p.evaluate((id) => {
    const gs = [...document.querySelectorAll('#slide g.movel')].filter((e) => e.getAttribute('data-movel') === id);
    for (const e of gs) {
      const b = e.getBoundingClientRect();
      for (const [fx, fy] of [[0.5, 0.55], [0.5, 0.7], [0.35, 0.6], [0.65, 0.6], [0.5, 0.4], [0.5, 0.85]]) {
        const x = b.x + b.width * fx, y = b.y + b.height * fy;
        const alvo = document.elementFromPoint(x, y);
        const m = alvo && alvo.closest && alvo.closest('g.movel');
        if (m && m.getAttribute('data-movel') === id) return { x, y };
      }
    }
    return null;
  }, id);
  /** Arrasta o móvel até a posição (x, y) do piso. */
  const arrastar = async (id, tx, ty) => {
    const ini = await pegador(id);
    if (!ini) throw new Error('não achei ' + id);
    await g.mover(ini.x, ini.y);
    await g.espera(150);
    await p.mouse.down();
    g.cliques.push({ t: g.agora(), x: ini.x, y: ini.y });
    await g.espera(150);
    const atual = await campos();
    const u = await eixos();
    const dx = tx - atual.x, dy = ty - atual.y;
    await g.mover(ini.x + u.x.x * dx + u.y.x * dy, ini.y + u.x.y * dx + u.y.y * dy, 0.9);
    await g.espera(120);
    await p.mouse.up();
    await g.espera(500);
  };
  const piso = () => p.evaluate(() => {
    const r = [...document.querySelectorAll('#slide g.movel, #slide text')].filter((e) => e.tagName !== 'text' || /^[XY] \d+$/.test(e.textContent.trim()))
      .map((e) => e.getBoundingClientRect()).filter((b) => b.width && b.x < 1300);
    const x = Math.min(...r.map((b) => b.left)), y = Math.min(...r.map((b) => b.top));
    return { x, y, w: Math.max(...r.map((b) => b.right)) - x, h: Math.max(...r.map((b) => b.bottom)) - y };
  });
  const adicionar = async (nome) => {
    await g.clicar(p.locator('#cnsPaleta button', { hasText: new RegExp('^' + nome + '$') }).first(), { depois: 450 });
    return p.inputValue('#cnsId');
  };
  /** Aperta a seta num campo de número, um passo de cada vez (a loja cresce na tela a cada passo). */
  const subir = async (sel, vezes) => {
    await g.clicar(sel, { depois: 200 });
    for (let i = 0; i < vezes; i++) { await p.keyboard.press('ArrowUp'); await g.espera(170); }
    await g.espera(500);
  };

  await g.iniciar();
  await g.espera(800);
  // 1. Aumenta a ER: largura 12 → 16 m e fundo 10 → 13 m.
  await g.clicar('#painelConstrutor summary:has-text("Tamanho da loja")', { depois: 500 });
  await p.locator('#cnsLargura').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await g.espera(300);
  g.legenda('Largura 12 → 16 m');
  await subir('#cnsLargura', 8);
  g.legenda('Fundo 10 → 13 m');
  await subir('#cnsProfundidade', 6);
  await p.keyboard.press('Escape');
  // 2. Adiciona 3 móveis e leva cada um para a área nova.
  await p.locator('#cnsPaleta').evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await g.espera(400);
  const zoomPiso = async () => {
    const pf = await piso();
    await g.cam({ x: pf.x - 20, y: pf.y - 20, w: pf.w + 40, h: pf.h + 40 }, { dur: 0.7 });
  };
  for (const [nome, tx, ty] of [['Gôndola', 3, 11.2], ['Pirâmide', 14, 2], ['Mesa destaque', 12.8, 5.5]]) {
    await g.cam('tudo', { dur: 0.6 });
    const id = await adicionar(nome);
    await zoomPiso();
    await arrastar(id, tx, ty);
  }
  // 3. Ajusta a posição de dois móveis que já estavam na planta.
  await arrastar('PDV MOVEL 1', 13.6, 10.2);
  await arrastar('PIRAMIDE 2', 9.6, 11.4);
  await p.keyboard.press('Escape');
  await g.espera(500);
  await g.cam('tudo', { dur: 0.9 });
  // Salvo sozinho.
  await p.waitForFunction(() => /Salvo na planilha/.test(document.getElementById('cnsStatus').textContent), null, { timeout: 15000 });
  await g.cam('#painelConstrutor .cns-rodape', { margem: 60, dur: 0.9, zoomMax: 2.2 });
  await g.espera(1100);
  // Fecha o editor: a ER P já aparece com a loja nova.
  await g.cam('tudo', { dur: 0.8 });
  await g.clicar('#cnsFechar', { depois: 900 });
  await g.camPlanta({ margem: 10 });
  await g.espera(1900);
  await g.parar();
  console.log(await p.evaluate(() => App.estado.dados.plantas.find((x) => x.nome === 'ER P').moveis
    .filter((m) => /GONDOLA 2|PIRAMIDE 3|MESA DESTAQUE 2|PDV MOVEL 1|PIRAMIDE 2/.test(m.id)).map((m) => m.id + ' ' + m.x + ',' + m.y + ' ' + m.w + 'x' + m.d)));
  await fechar();
})();
