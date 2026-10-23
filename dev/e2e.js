/**
 * Testes end to end da versão web (index.html): abre o app num Chromium (Playwright) e usa
 * os botões como uma pessoa faria — ciclos, plantas, visões, zoom, filtro, tela do móvel,
 * Comunicações ER, Analytics, PNG, planilha base (baixar e importar), ajuste de etiquetas,
 * Construir loja, validação e tutorial.
 *
 * Em cada teste, qualquer erro de JavaScript na página, console.error ou toast de erro
 * reprova o teste (é a "busca de erros" em tempo de execução).
 *
 * Rodar (depois de npm run build:web):  npm run test:e2e
 * Precisa do Playwright (local ou global). A ExcelJS vem do cdnjs; se estiver instalada
 * (npm i exceljs@4.4.0, ou EXCELJS_DIR apontando para a pasta), a cópia local é usada.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');

function exigir(nome) {
  try { return require(nome); } catch (e) { /* tenta a instalação global */ }
  return require(path.join(execSync('npm root -g').toString().trim(), nome));
}

function excelLocal() {
  const caminhos = [process.env.EXCELJS_DIR, RAIZ].filter(Boolean);
  for (const base of caminhos) {
    try { return require.resolve('exceljs/dist/exceljs.min.js', { paths: [base] }); } catch (e) { /* próximo */ }
  }
  return null;
}

const { chromium } = exigir('playwright');
const EXCEL_LOCAL = excelLocal();
const PASTA = fs.mkdtempSync(path.join(os.tmpdir(), 'plano-varejo-e2e-'));

/*
 * O index.html é servido por HTTP (como no Netlify), não por file://: no Chromium, com file://,
 * o localStorage às vezes se perde num reload logo depois de gravar (acontece até numa página
 * em branco), o que deixaria os testes de "continua salvo" instáveis.
 */
let navegador;
let servidor;
let INDEX;
test.before(async () => {
  servidor = http.createServer((req, res) => {
    if (req.url !== '/' && req.url !== '/index.html') { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(RAIZ, 'index.html')));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  INDEX = 'http://127.0.0.1:' + servidor.address().port + '/';
  navegador = await chromium.launch();
});
test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
  fs.rmSync(PASTA, { recursive: true, force: true });
});

/**
 * Abre o app num navegador limpo (localStorage vazio) e junta os erros da página.
 * Por padrão marca o tutorial como visto, para o cartão de boas-vindas não cobrir a tela.
 */
async function abrir(t, opcoes) {
  const op = Object.assign({ tutorial: false, largura: 1440, altura: 900 }, opcoes);
  const ctx = await navegador.newContext({ viewport: { width: op.largura, height: op.altura }, acceptDownloads: true });
  if (!op.tutorial) await ctx.addInitScript(() => localStorage.setItem('planoVarejo.tutorialVisto', '1'));
  // Fonte do Google: resposta vazia (sem depender da rede; o app usa a fonte de reserva).
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  if (EXCEL_LOCAL) await ctx.route('**/exceljs.min.js', (r) => r.fulfill({ path: EXCEL_LOCAL, contentType: 'text/javascript' }));

  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  pagina.on('console', (m) => { if (m.type() === 'error') erros.push('console.error: ' + m.text()); });
  pagina.on('dialog', (d) => d.accept()); // window.confirm (Restaurar exemplo, descartar…)
  await pagina.goto(INDEX + (op.hash || ''));
  await pagina.waitForFunction(() => typeof App !== 'undefined' && App.estado.dados && App.estado.dados.ciclos.length);

  t.after(async () => {
    // Toast de erro na tela também conta como erro.
    const toastErro = await pagina.evaluate(() => {
      const el = document.getElementById('toast');
      return !el.hidden && el.classList.contains('erro') ? el.textContent : '';
    }).catch(() => '');
    if (toastErro) erros.push('toast de erro: ' + toastErro);
    await ctx.close();
    assert.deepStrictEqual(erros, [], 'Erros na página:\n' + erros.join('\n'));
  });
  return pagina;
}

const estado = (p, expr) => p.evaluate(expr);
const escolherCiclo = (p, ciclo) => p.selectOption('#selCiclo', ciclo);
const abaPlanta = (p, nome) => p.locator('#abasPlanta .aba', { hasText: new RegExp('^' + nome + '$') });

/** Clica num item do menu de configurações (engrenagem). */
async function menuConfig(p, id) {
  await p.click('#btnConfig');
  await p.click('#' + id);
}

/** Espera um download disparado por `acao` e devolve { nome, bytes }. */
async function baixar(p, acao) {
  const [d] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), acao()]);
  const destino = path.join(PASTA, Date.now() + '-' + d.suggestedFilename());
  await d.saveAs(destino);
  return { nome: d.suggestedFilename(), destino, bytes: fs.readFileSync(destino) };
}

const ehPng = (b) => b.length > 1000 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const ehZip = (b) => b.length > 1000 && b[0] === 0x50 && b[1] === 0x4b; // .xlsx é um zip

/* ------------------------------------------------------------------------- */

test('abre sem ciclo, com as 4 plantas, em modo local', async (t) => {
  const p = await abrir(t);
  assert.deepStrictEqual(await p.locator('#abasPlanta .aba').allTextContents(), ['ER P', 'ER M', 'ER G', 'ER GG']);
  assert.strictEqual(await p.inputValue('#selCiclo'), '');
  const opcoes = await p.locator('#selCiclo option').allTextContents();
  assert.ok(opcoes.includes('Ciclo exemplo') && opcoes.includes('Ciclo exemplo cheio'), opcoes.join(', '));
  assert.ok(await p.isVisible('#avisoLocal'));
  assert.ok(await p.locator('#slide [data-movel]').count() > 10, 'a planta deveria ter móveis desenhados');
  assert.strictEqual(await p.isVisible('#telaConfig'), false);
});

test('ciclos × plantas × visões desenham sem erro', async (t) => {
  const p = await abrir(t);
  for (const ciclo of ['Ciclo exemplo', 'Ciclo exemplo cheio', '']) {
    await escolherCiclo(p, ciclo);
    for (const nome of ['ER P', 'ER M', 'ER G', 'ER GG']) {
      await abaPlanta(p, nome).click();
      assert.strictEqual(await abaPlanta(p, nome).getAttribute('aria-selected'), 'true');
      for (const visao of ['planta', 'simplificada']) {
        await p.click('#abasVisao .aba[data-visao="' + visao + '"]');
        const moveis = await p.locator('#slide [data-movel]').count();
        assert.ok(moveis > 0, ciclo + ' / ' + nome + ' / ' + visao + ': nada desenhado');
      }
    }
  }
  // Com ciclo, a visão na planta tem etiquetas com texto.
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  await p.click('#abasVisao .aba[data-visao="planta"]');
  const textos = await p.locator('#slide text').allTextContents();
  assert.ok(textos.filter((x) => x.trim()).length > 20, 'etiquetas do ciclo não apareceram');
});

test('setas do teclado trocam de planta e o zoom muda o percentual', async (t) => {
  const p = await abrir(t);
  await abaPlanta(p, 'ER P').click();
  await p.locator('body').press('ArrowRight');
  assert.strictEqual(await estado(p, () => App.estado.planta), '02');
  await p.locator('body').press('ArrowLeft');
  assert.strictEqual(await estado(p, () => App.estado.planta), '01');

  // 100% é o mínimo: o "−" fica desligado.
  assert.ok(await p.isDisabled('#zoomMenos'));
  await p.click('#zoomMais');
  assert.strictEqual(await p.textContent('#zoomNivel'), '150%');
  await p.click('#zoomMais');
  await p.click('#zoomMenos');
  assert.strictEqual(await p.textContent('#zoomNivel'), '150%');
  await p.click('#zoomNivel');
  assert.strictEqual(await p.textContent('#zoomNivel'), '100%');
  await p.locator('body').press('+');
  assert.ok(await estado(p, () => App.estado.zoom.k) > 1);
  await p.locator('body').press('0');
  assert.strictEqual(await estado(p, () => App.estado.zoom.k), 1);
});

test('filtro por marca na legenda liga e desliga', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  const chip = p.locator('#legenda button', { hasText: /^BOT$/ }).first();
  await chip.click();
  assert.ok(await estado(p, () => App.estado.filtro), 'filtro não foi ligado');
  await chip.click();
  assert.strictEqual(await estado(p, () => App.estado.filtro), '');
});

test('clicar num móvel abre a tela com a estratégia dele', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  const id = await p.evaluate(() => {
    const g = [...document.querySelectorAll('#slide [data-movel]')].find((e) => /^GONDOLA/.test(e.getAttribute('data-movel')));
    g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return g.getAttribute('data-movel').split('/')[0];
  });
  await p.waitForSelector('#dlgMovel[open]');
  assert.ok((await p.textContent('#mvTitulo')).length > 0);
  assert.ok(await p.locator('#mvDesenho *').count() > 0, 'desenho do móvel vazio (' + id + ')');
  assert.ok((await p.textContent('#mvEstrategia')).trim().length > 0, 'estratégia vazia (' + id + ')');
  await p.keyboard.press('Escape');
  await p.waitForSelector('#dlgMovel:not([open])', { state: 'attached' });
});

test('Comunicações ER abre e fecha, mostrando o ciclo', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  if (!(await p.isVisible('#painelLoja'))) await p.click('#btnLoja');
  assert.ok(await p.isVisible('#painelLoja'));
  assert.match(await p.textContent('#lojaSub'), /Ciclo exemplo/);
  await p.click('#lojaFechar');
  assert.strictEqual(await p.isVisible('#painelLoja'), false);
});

test('Analytics: cartões, mapa, "Sobre a análise" e "ver na planta"', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  await p.click('#btnAnalytics');
  assert.ok(await p.isVisible('#painelAnalytics'));
  assert.ok(await p.locator('#anCorpo .an-cartao').count() >= 3, 'faltam cartões no Analytics');
  assert.ok(await p.locator('#anCorpo .an-celula button').count() > 0, 'mapa movimento × ER vazio');

  // Alternar a medida e ordenar por outra ER.
  for (const b of await p.locator('#anCorpo .an-segmentado button').all()) await b.click();
  const ultimaEr = p.locator('#anCorpo th.an-col-er button').last();
  await ultimaEr.click();
  assert.match(await p.locator('#anCorpo th.an-col-er button').last().textContent(), /▾/, 'não ordenou pela ER');

  await p.click('#anInfo');
  await p.waitForSelector('#dlgAnInfo[open]');
  assert.ok(await p.locator('#anInfoCorpo svg').count() > 0, 'legenda dos espaços sem miniaturas');
  await p.click('#dlgAnInfo button[value="ok"]');

  // Setas trocam a ER em destaque; clicar numa célula leva para a planta filtrada.
  await p.locator('body').press('ArrowRight');
  await p.locator('#anCorpo .an-celula button').first().click();
  assert.strictEqual(await p.isVisible('#painelAnalytics'), false);
  assert.ok(await estado(p, () => App.estado.filtroEtiqueta), 'filtro da etiqueta não foi ligado');

  // Esc fecha o Analytics.
  await p.click('#btnAnalytics');
  await p.locator('body').press('Escape');
  assert.strictEqual(await p.isVisible('#painelAnalytics'), false);
});

test('cascata ER M → ER G: o lado B da gôndola 2 vira o lado A da gôndola 3; os lados B são definidos de novo', async (t) => {
  const p = await abrir(t);
  const mov = (er, id) => p.evaluate(([e, i]) => {
    const l = App.resolver.movimento('Ciclo exemplo', e, i);
    return l && l.etiquetas.map((x) => x.texto).join(',');
  }, [er, id]);
  // A gôndola 3 (ER G e ER GG) herda o lado B da gôndola 2 da ER M.
  assert.strictEqual(await mov('02', 'GONDOLA 2/PONTA-B'), 'OUTLET EUD');
  assert.strictEqual(await mov('02', 'GONDOLA 2/MEIO-B'), 'CUIDADOS');
  for (const er of ['03', '04']) {
    assert.strictEqual(await mov(er, 'GONDOLA 3/PONTA-A'), 'OUTLET EUD', er);
    assert.strictEqual(await mov(er, 'GONDOLA 3/MEIO-A'), 'CUIDADOS', er);
  }
  // Os lados B das gôndolas 1 e 2 na ER G são os da própria ER G; sem a linha dela, ficam vazios (não vêm da ER M).
  assert.strictEqual(await mov('03', 'GONDOLA 2/PONTA-B'), 'JUICY MOOD');
  assert.strictEqual(await mov('04', 'GONDOLA 2/PONTA-B'), 'JUICY MOOD', 'a ER GG herda da ER G');
  await p.evaluate(() => {
    const g = App.estado.dados.movimentos['Ciclo exemplo']['03'];
    ['GONDOLA 1/PONTA-B', 'GONDOLA 1/MEIO-B', 'GONDOLA 2/PONTA-B', 'GONDOLA 2/MEIO-B'].forEach((k) => delete g[k]);
  });
  for (const id of ['GONDOLA 1/PONTA-B', 'GONDOLA 1/MEIO-B', 'GONDOLA 2/PONTA-B', 'GONDOLA 2/MEIO-B']) {
    assert.strictEqual(await mov('03', id), null, 'ER G ' + id);
    assert.strictEqual(await mov('04', id), null, 'ER GG ' + id);
  }
  // O lado A das gôndolas 1 e 2 continua vindo das ERs menores.
  assert.strictEqual(await mov('03', 'GONDOLA 1/MEIO-A'), 'BOTIK');
});

/** Inventário de teste: cada móvel nas lojas das ERs que o têm (ER P 350, M 300, G 220, GG 130 = 1000 lojas). */
async function comInventario(p, extra) {
  await p.evaluate((extra) => {
    const tam = { '01': 350, '02': 300, '03': 220, '04': 130 };
    const lojas = {};
    App.estado.dados.plantas.forEach((pl) => pl.moveis.forEach((m) => { lojas[m.id] = (lojas[m.id] || 0) + tam[pl.id]; }));
    App.estado.dados.inventario = { lojas: Object.assign(lojas, extra), total: 1000 };
  }, extra || {});
}

test('Inventario: o mouse no móvel mostra as lojas da rede; o Analytics, a presença de cada movimento', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  await comInventario(p, { 'GONDOLA 1/PONTA-B': 900 });
  await abaPlanta(p, 'ER M').click();
  await abaPlanta(p, 'ER P').click(); // redesenha com o inventário
  const dica = (sel) => p.locator(sel + ' > title').first().textContent();
  assert.match(await dica('#slide .movel[data-movel="GONDOLA 1"][data-espaco="PONTA-B"]'), /Presente em 900 lojas · 90% da rede/);
  assert.match(await dica('#slide .movel[data-movel="GONDOLA 1"][data-espaco="PONTA-A"]'), /Presente em 1\.000 lojas · 100% da rede/);
  assert.doesNotMatch(await dica('#slide .movel[data-movel="GONDOLA 1"][data-espaco="PONTA-A"]'), /Marca:/, 'no lugar do que mostrava antes');
  await abaPlanta(p, 'ER GG').click();
  assert.match(await dica('#slide .movel[data-movel="GONDOLA 4"]'), /Presente em 130 lojas · 13% da rede/);

  // Analytics: coluna "Na rede" com a presença de cada movimento.
  await p.click('#btnAnalytics');
  assert.match(await p.textContent('#anCorpo th.an-col-rede'), /Na rede.*1\.000 lojas/);
  const pct = (texto) => p.locator('#anCorpo tbody tr', { has: p.locator('.an-mov-nome', { hasText: new RegExp('^' + texto + '$') }) })
    .first().locator('td.an-col-rede strong').textContent();
  assert.strictEqual(await pct('EXAUSTÃO OUI'), '13%', 'só na gôndola 4 (só ER GG)');
  assert.strictEqual(await pct('LIQUIDA QDB'), '100%', 'na ponta A da gôndola 1, de todas as ERs');
});

test('tela do móvel: aviso fixo de página em construção', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  await p.evaluate(() => document.querySelector('#slide .movel[data-movel="GONDOLA 1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await p.waitForSelector('#dlgMovel[open]');
  assert.match(await p.textContent('#dlgMovel .mv-aviso'), /Página em construção/);
  const antes = await p.locator('#dlgMovel .mv-aviso').boundingBox();
  await p.locator('#mvEstrategia').evaluate((el) => { el.closest('.mv-corpo').scrollTop = 400; el.scrollTop = 400; });
  assert.deepStrictEqual(await p.locator('#dlgMovel .mv-aviso').boundingBox(), antes, 'não rola com o conteúdo');
});

test('Analytics sem ciclo não quebra', async (t) => {
  const p = await abrir(t);
  await p.click('#btnAnalytics');
  assert.ok(await p.isVisible('#painelAnalytics'));
  await p.click('#anFechar');
});

test('Baixar PNG: cada conteúdo em cada formato', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  for (const conteudo of ['planta', 'simplificada', 'estrategia']) {
    for (const formato of ['png', 'slide']) {
      await p.click('#btnPng');
      await p.waitForSelector('#dlgPng[open]');
      await p.check('#dlgPng input[name="pngConteudo"][value="' + conteudo + '"]');
      await p.check('#dlgPng input[name="pngFormato"][value="' + formato + '"]');
      const d = await baixar(p, () => p.click('#dlgPng button[value="baixar"]'));
      assert.match(d.nome, /\.png$/i, conteudo + '/' + formato);
      assert.ok(ehPng(d.bytes), conteudo + '/' + formato + ': arquivo não é um PNG válido');
    }
  }
});

test('todas as ERs num PowerPoint: um slide por ER', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  const nPlantas = await estado(p, () => App.estado.dados.plantas.length);
  await p.click('#btnPng');
  await p.waitForSelector('#dlgPng[open]');
  await p.check('#dlgPng input[name="pngErs"][value="todas"]');
  assert.ok(await p.isDisabled('#dlgPng input[name="pngFormato"][value="png"]'), 'o formato fica fixo no slide');
  assert.strictEqual((await p.textContent('#pngBaixar')).trim(), 'Baixar .pptx');
  const d = await baixar(p, () => p.click('#dlgPng button[value="baixar"]'));
  assert.match(d.nome, /todas as ERs.*\.pptx$/);
  assert.strictEqual(d.bytes.slice(0, 2).toString(), 'PK', 'não é um .pptx (zip)');
  const nomes = d.bytes.toString('latin1');
  for (let i = 1; i <= nPlantas; i++) assert.ok(nomes.includes('ppt/slides/slide' + i + '.xml'), 'falta o slide ' + i);
  assert.ok(!nomes.includes('ppt/slides/slide' + (nPlantas + 1) + '.xml'), 'slide a mais');
});

test('planilha base: baixar e importar de volta como ciclo novo', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  await p.click('#btnModelo');
  await p.waitForSelector('#dlgModelo[open]');
  await p.fill('#mdCiclo', 'C99/2026');
  await p.check('#dlgModelo input[name="mdConteudo"][value="copiar"]');
  await p.check('#mdLayout');
  const d = await baixar(p, () => p.click('#dlgModelo button[value="baixar"]'));
  assert.match(d.nome, /\.xlsx$/i);
  assert.ok(ehZip(d.bytes), 'o .xlsx baixado não é válido');

  await p.setInputFiles('#arquivo', d.destino);
  await p.waitForSelector('#dlgResultado[open]', { timeout: 30000 });
  assert.match(await p.textContent('#resTexto'), /C99\/2026/);
  await p.click('#dlgResultado button[value="ok"]');
  assert.strictEqual(await p.inputValue('#selCiclo'), 'C99/2026');
  assert.ok(await p.locator('#slide text').count() > 0);

  // O ciclo importado continua lá depois de recarregar a página (localStorage).
  await p.reload();
  await p.waitForFunction(() => App.estado.dados && App.estado.dados.ciclos.includes('C99/2026'));

  // Restaurar exemplo volta ao estado inicial.
  await p.click('#btnRestaurar');
  await p.waitForFunction(() => !App.estado.dados.ciclos.includes('C99/2026'));
});

test('planilha base em branco, só uma planta', async (t) => {
  const p = await abrir(t);
  await p.click('#btnModelo');
  await p.waitForSelector('#dlgModelo[open]');
  await p.check('#dlgModelo input[name="mdConteudo"][value="branco"]');
  const opcoes = await p.locator('#mdPlantas option').evaluateAll((os) => os.map((o) => o.value));
  await p.selectOption('#mdPlantas', opcoes[opcoes.length - 1]);
  const d = await baixar(p, () => p.click('#dlgModelo button[value="baixar"]'));
  assert.ok(ehZip(d.bytes));
});

test('ajustar etiquetas: tamanho, salvar e baixar posições', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  await menuConfig(p, 'btnEditar');
  assert.ok(await p.isVisible('#barraEdicao'));
  await p.click('#etqMaior');
  assert.strictEqual(await p.textContent('#etqTamanho'), '110%');

  // Arrasta uma pilha de etiquetas.
  const pilha = p.locator('#slide .arrastavel').first();
  const caixa = await pilha.boundingBox();
  assert.ok(caixa, 'nenhuma etiqueta arrastável');
  await p.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await p.mouse.down();
  await p.mouse.move(caixa.x + caixa.width / 2 + 40, caixa.y + caixa.height / 2 + 20, { steps: 5 });
  await p.mouse.up();
  assert.ok(await estado(p, () => Object.keys(App.estado.ajustes).length) > 0, 'o arraste não gerou ajuste');

  const d = await baixar(p, () => p.click('#btnBaixarPosicoes'));
  const json = JSON.parse(d.bytes.toString('utf8'));
  assert.ok(json && typeof json === 'object');

  await p.click('#btnSalvarAjustes');
  await p.waitForFunction(() => !Object.keys(App.estado.ajustes).length);
  await p.click('#btnAutoOrganizar');
  await p.click('#btnDescartar');
  await menuConfig(p, 'btnEditar');
  assert.strictEqual(await p.isVisible('#barraEdicao'), false);
});

test('Construir loja: adicionar, desfazer e salvar um móvel', async (t) => {
  const p = await abrir(t);
  await abaPlanta(p, 'ER M').click();
  const antes = await estado(p, () => App.estado.dados.plantas.find((x) => x.id === '02').moveis.length);
  await p.click('#btnConstruir');
  assert.ok(await p.isVisible('#painelConstrutor'));

  await p.locator('#cnsPaleta button', { hasText: 'Gôndola' }).first().click();
  assert.ok(await p.isVisible('#cnsCampos'), 'o móvel novo deveria ficar selecionado');
  assert.match(await p.inputValue('#cnsId'), /^GONDOLA \d+$/);
  await p.click('#cnsDesfazer');
  await p.locator('#cnsPaleta button', { hasText: 'Pirâmide' }).first().click();
  await p.locator('#slide').press('ArrowRight');
  await p.click('#cnsSalvar');
  await p.waitForFunction((n) => App.estado.dados.plantas.find((x) => x.id === '02').moveis.length === n + 1, antes);

  await p.click('#btnConstruir');
  assert.strictEqual(await p.isVisible('#painelConstrutor'), false);
});

test('Construir loja: baixar o código da loja', async (t) => {
  const p = await abrir(t);
  await p.click('#btnConstruir');
  const d = await baixar(p, () => p.click('#cnsBaixarCodigo'));
  const json = JSON.parse(d.bytes.toString('utf8'));
  assert.ok(Object.keys(json).length > 0, 'código da loja vazio');
});

test('validação: senha errada, comentário, resposta e resolução', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');

  const entrar = async (papel, nome, senha) => {
    await menuConfig(p, 'btnValidacao');
    await p.waitForSelector('#dlgAcesso[open]');
    await p.check('#dlgAcesso input[name="papel"][value="' + papel + '"]');
    await p.fill('#acessoNome', nome);
    await p.fill('#acessoSenha', senha);
    await p.click('#acessoEntrar');
  };

  await entrar('VALIDADOR', 'Teste E2E', 'errada');
  await p.waitForSelector('#acessoErro:not([hidden])');
  await p.click('#acessoCancelar');

  await entrar('VALIDADOR', 'Teste E2E', '1234');
  await p.waitForSelector('#painelValidacao:not([hidden])');
  await p.fill('#valCorpo .val-novo textarea', 'Trocar a cor da gôndola 1');
  await p.click('#valCorpo .val-novo button[type="submit"]');
  await p.waitForSelector('#valCorpo .val-cartao');
  assert.match(await p.textContent('#valBadge'), /1/);
  await p.click('#valCorpo button:has-text("Sair")');

  await entrar('CONSTRUTOR', 'Construtor E2E', '1234');
  await p.waitForSelector('#valCorpo .val-cartao');
  const cartao = p.locator('#valCorpo .val-cartao').first();
  await cartao.locator('button', { hasText: 'Responder' }).first().click();
  await cartao.locator('.val-responder textarea').fill('Feito.');
  await cartao.locator('.val-responder button[type="submit"]').click();
  await p.waitForFunction(() => document.querySelector('#valCorpo .val-cartao').textContent.includes('Feito.'));
  await p.locator('#valCorpo .val-cartao button', { hasText: 'Marcar como resolvido' }).first().click();
  await p.waitForFunction(() => document.getElementById('valBadge').hidden);
  await p.click('#valFechar');
});

test('tutorial: boas-vindas na primeira visita e o tour inteiro', async (t) => {
  const p = await abrir(t, { tutorial: true });
  await p.waitForSelector('.tut-boas-vindas');
  await p.click('.tut-boas-vindas button:has-text("Fazer o tour")');
  let passos = 0;
  while (await p.locator('.tut-balao button:has-text("Próximo")').count()) {
    await p.click('.tut-balao button:has-text("Próximo")');
    assert.ok(++passos < 40, 'o tour não termina');
  }
  assert.ok(passos >= 5, 'tour curto demais: ' + passos + ' passos');
  await p.click('.tut-balao button:has-text("Concluir")');
  assert.strictEqual(await p.locator('.tut-balao').count(), 0);

  // Não aparece de novo ao recarregar; abre pelo menu e fecha com Esc.
  await p.reload();
  await p.waitForFunction(() => App.estado.dados);
  await p.waitForTimeout(800);
  assert.strictEqual(await p.locator('.tut-boas-vindas').count(), 0);
  await menuConfig(p, 'btnTutorial');
  await p.waitForSelector('.tut-balao');
  await p.keyboard.press('Escape');
  await p.waitForSelector('.tut-balao', { state: 'detached' });
});

test('comparar ciclos: só o que mudou fica colorido, com a lista no painel', async (t) => {
  const p = await abrir(t);
  assert.ok(await p.isHidden('#campoComparar'), 'sem ciclo, não há comparação');
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  const cinzas = () => p.locator('#slide .movel polygon[fill="#D2D2D2"]').count();
  assert.strictEqual(await cinzas(), 0);
  await p.selectOption('#selComparar', 'Ciclo exemplo');
  assert.ok(await p.isVisible('#painelLoja'), 'o painel abre com a lista');
  const mudancas = await p.locator('.lj-mudanca').count();
  assert.ok(mudancas > 0, 'nenhuma mudança listada');
  assert.ok(await cinzas() > 0, 'nada ficou em cinza');
  // Clicar numa mudança abre o móvel.
  await p.locator('.lj-mudanca').first().click();
  await p.waitForSelector('#dlgMovel[open]');
  await p.keyboard.press('Escape');
  // O mesmo ciclo some da lista; voltar a "Não comparar" deixa tudo colorido.
  const opcoes = await p.locator('#selComparar option').allTextContents();
  assert.ok(opcoes.indexOf('Ciclo exemplo cheio') < 0);
  await p.selectOption('#selComparar', '');
  assert.strictEqual(await p.locator('.lj-mudanca').count(), 0);
  assert.strictEqual(await cinzas(), 0);
});

test('busca (Ctrl+K): etiqueta, marca e móvel', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  // Etiqueta (sem acento acha com acento): mostra na planta só onde ela aparece.
  await p.keyboard.press('Control+k');
  await p.waitForSelector('#dlgBusca[open]');
  await p.fill('#buscaTexto', 'lcto egeo');
  await p.waitForSelector('.busca-item');
  await p.keyboard.press('Enter');
  await p.waitForSelector('#dlgBusca', { state: 'hidden' });
  assert.strictEqual(await estado(p, () => App.estado.filtroEtiqueta), 'LÇTO EGEO');
  // Marca: vira o filtro por marca.
  await p.click('#btnBusca');
  await p.fill('#buscaTexto', 'eudora');
  await p.locator('.busca-item', { hasText: 'Marca' }).first().click();
  assert.strictEqual(await estado(p, () => App.estado.filtro), 'EUD');
  // Móvel de outra ER: troca de ER e abre a tela do móvel.
  const alvo = await estado(p, () => {
    const pl = App.estado.dados.plantas[App.estado.dados.plantas.length - 1];
    return { er: pl.id, nome: pl.nome, id: pl.moveis.find((m) => m.tipo === 'GONDOLA').id };
  });
  await p.keyboard.press('/');
  await p.waitForSelector('#dlgBusca[open]');
  await p.fill('#buscaTexto', alvo.id);
  await p.locator('.busca-item').filter({ hasText: new RegExp('Móvel · .*' + alvo.nome + '$') }).first().click();
  await p.waitForSelector('#dlgMovel[open]');
  assert.strictEqual(await estado(p, () => App.estado.planta), alvo.er);
  assert.match(await p.textContent('#mvTitulo'), new RegExp(alvo.id));
});

test('link: o #hash abre no ciclo, ER, visão e filtro, e acompanha a tela', async (t) => {
  const p = await abrir(t, { hash: '#ciclo=Ciclo+exemplo+cheio&er=ER+G&visao=simplificada&marca=BOT&comparar=Ciclo+exemplo' });
  const e = await estado(p, () => {
    const s = App.estado;
    return { ciclo: s.ciclo, er: s.dados.plantas.find((x) => x.id === s.planta).nome, visao: s.visao, filtro: s.filtro, comparar: s.comparar };
  });
  assert.deepStrictEqual(e, { ciclo: 'Ciclo exemplo cheio', er: 'ER G', visao: 'simplificada', filtro: 'BOT', comparar: 'Ciclo exemplo' });
  assert.strictEqual(await p.inputValue('#selCiclo'), 'Ciclo exemplo cheio');
  assert.strictEqual(await p.inputValue('#selComparar'), 'Ciclo exemplo');
  // Trocar de ER atualiza o hash.
  await abaPlanta(p, 'ER M').click();
  assert.match(await p.evaluate(() => location.hash), /er=ER\+M/);
  // Copiar link (sem área de transferência no teste: cai no prompt, que o teste aceita).
  await menuConfig(p, 'btnLink');
});

test('modo apresentação: F mostra só a planta; setas trocam a ER; F sai', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  await p.locator('body').click({ position: { x: 700, y: 600 } });
  await p.keyboard.press('Escape');
  await p.keyboard.press('f');
  assert.ok(await p.evaluate(() => document.body.classList.contains('apresentando')));
  assert.ok(await p.isHidden('.topo'), 'o topo continua visível');
  assert.ok(await p.isVisible('#apresRotulo'));
  const antes = await estado(p, () => App.estado.planta);
  await p.keyboard.press('ArrowRight');
  assert.notStrictEqual(await estado(p, () => App.estado.planta), antes);
  await p.keyboard.press('f');
  assert.ok(!(await p.evaluate(() => document.body.classList.contains('apresentando'))));
  assert.ok(await p.isVisible('.topo'));
  // Também pelo botão do topo.
  await p.click('#btnApresentar');
  assert.ok(await p.evaluate(() => document.body.classList.contains('apresentando')));
});

test('ciclo em construção: o construtor monta na planta, o validador devolve e aprova', async (t) => {
  const p = await abrir(t);
  const entrar = async (papel, nome) => {
    await menuConfig(p, 'btnValidacao');
    await p.waitForSelector('#dlgAcesso[open]');
    await p.check('#dlgAcesso input[name="papel"][value="' + papel + '"]');
    await p.fill('#acessoNome', nome);
    await p.fill('#acessoSenha', '1234');
    await p.click('#acessoEntrar');
    await p.waitForSelector('#dlgAcesso', { state: 'hidden' });
    await p.waitForSelector('.rs-secao');
  };
  // Construindo, o painel da validação fica atrás do de construção: "Comentários" mostra o painel (com o Sair).
  const sair = async () => {
    if (await p.isVisible('#painelConstrucao')) await p.locator('#pcTopo button', { hasText: 'Comentários' }).click();
    await p.locator('#valCorpo .val-quem button', { hasText: 'Sair' }).click();
  };
  const acao = (texto) => p.locator('#rascunhoAcoes button', { hasText: texto }).click(); // faixa (validador)
  const passo = (texto) => p.locator('#pcPassos button', { hasText: texto }).click(); // painel de construção
  const gravado = () => p.waitForFunction(() => document.getElementById('pcGravacao').textContent === 'Tudo salvo');

  // Construtor: novo ciclo copiando o "Ciclo exemplo".
  await entrar('CONSTRUTOR', 'Bia');
  await p.locator('.rs-secao button', { hasText: 'Novo ciclo' }).click();
  await p.fill('#rascunhoCorpo input', 'C11/2026');
  await p.selectOption('#rascunhoCorpo select', 'Ciclo exemplo');
  await p.click('#rascunhoOk');
  await p.waitForSelector('#dlgRascunho', { state: 'hidden' });
  assert.strictEqual(await estado(p, () => App.estado.ciclo), 'C11/2026');
  assert.ok(await p.locator('#selCiclo optgroup[label="Em construção"] option').count() === 1);
  // O construtor monta pelo painel da lateral (no lugar da faixa e do painel da validação).
  assert.ok(await p.isVisible('#painelConstrucao'));
  assert.ok(await p.isHidden('#barraRascunho') && await p.isHidden('#painelValidacao'));

  // O painel mostra os passos: o 1 (tipos com GMV) ainda não está pronto (o servidor recusa o envio; testes.test.js).
  assert.match(await p.textContent('#pcPassos .rs-passos li:first-child'), /Tipos de movimento.*sem GMV/);
  assert.ok(!(await p.getAttribute('#pcPassos .rs-passos li:first-child', 'class')));
  assert.ok(await p.locator('#pcStats .pc-alertas li.aviso', { hasText: 'sem GMV' }).count() === 1);

  // Passo 1: tipos de movimento. Completa os GMVs que faltam e cadastra um movimento novo.
  await passo('1. Tipos de movimento');
  await p.waitForSelector('#dlgRascunho[open] .rs-tipos');
  const faltam = p.locator('.rs-tipos input.falta');
  while (await faltam.count()) await faltam.first().fill('100 mil');
  await p.locator('#rascunhoCorpo button', { hasText: '+ Adicionar movimento' }).click();
  await p.fill('input[aria-label="Nome do movimento novo"]', 'NOVO MOVIMENTO OUI');
  await p.locator('.rs-tipos select').last().selectOption('LANCAMENTO');
  await p.locator('.rs-tipos input[inputmode="decimal"]').last().fill('300 mil');
  await p.click('#rascunhoOk');
  await p.waitForSelector('#dlgRascunho', { state: 'hidden' });
  assert.strictEqual(await estado(p, () => App.estado.dados.tiposMovimento['C11/2026']['NOVO MOVIMENTO OUI'].gmv), 300000);
  assert.strictEqual(await p.locator('#pcPassos .rs-passos li.ok').count(), 2, 'passos 1 e 2 prontos');
  assert.ok(await p.locator('#pcStats .pc-alertas li.info', { hasText: 'NOVO MOVIMENTO OUI' }).count() === 1, 'o movimento novo ainda sem espaço');

  // Passo 2, na lateral: clicar na gôndola 1 seleciona (não abre a tela do móvel); a planta muda antes de gravar.
  const espacos = () => estado(p, () => App.estado.dados.movimentos['C11/2026']);
  await p.evaluate(() => document.querySelector('#slide .movel[data-movel="GONDOLA 1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await p.waitForSelector('#pcForm .pc-espaco[data-espaco="GONDOLA 1/PONTA-A"]');
  assert.ok(await p.isHidden('#dlgMovel'));
  assert.strictEqual(await p.locator('#slide .movel.selecionado[data-movel="GONDOLA 1"]').count() > 0, true, 'contorno no móvel selecionado');
  const ponta = p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 1/PONTA-A"]');
  const opcoes = await ponta.locator('.rs-etq select:not(.rs-marca)').first().locator('option').allTextContents();
  assert.ok(opcoes.includes('NOVO MOVIMENTO OUI') && !opcoes.some((o) => /fora dos tipos/.test(o)));
  await ponta.locator('select.rs-marca').first().selectOption('OUI');
  await ponta.locator('select').nth(1).selectOption('FIXO');
  await ponta.locator('.rs-etq select:not(.rs-marca)').first().selectOption('NOVO MOVIMENTO OUI');
  assert.ok(await p.locator('#slide .grupo-etiquetas', { hasText: 'NOVO MOVIMENTO OUI' }).count() > 0, 'a etiqueta aparece na planta na hora');
  assert.notStrictEqual(await p.textContent('#pcGravacao'), 'Tudo salvo', 'ainda não gravou');
  await ponta.locator('.rs-etq select.rs-marca').first().selectOption('OUI');
  await gravado();
  const linha = (await espacos())['01']['GONDOLA 1/PONTA-A'];
  assert.strictEqual(linha.simbolo, 'FIXO');
  assert.deepStrictEqual(linha.etiquetas[0], { texto: 'NOVO MOVIMENTO OUI', marca: 'OUI', posicao: 1 });
  // O servidor tem a mesma linha (Atualizar recarrega tudo).
  await p.click('#btnAtualizar');
  await p.waitForFunction(() => ((App.estado.dados.movimentos['C11/2026'] || {})['01'] || {})['GONDOLA 1/PONTA-A']);
  assert.deepStrictEqual((await espacos())['01']['GONDOLA 1/PONTA-A'], linha);
  assert.ok(await p.locator('#pcStats .pc-gmv', { hasText: 'NOVO MOVIMENTO OUI' }).count() === 1, 'GMV × espaço lista o movimento');
  assert.ok(await p.locator('#pcStats .pc-legenda', { hasText: 'OUI' }).count() > 0, 'a marca entra no espaço por marca');
  // Observação da etiqueta: aparece na planta depois do "|", mas o movimento (e as contas) continua o mesmo.
  await ponta.locator('.rs-etq-obs').first().fill('só no kit');
  await ponta.locator('.rs-etq-obs').first().dispatchEvent('change');
  await gravado();
  assert.strictEqual((await espacos())['01']['GONDOLA 1/PONTA-A'].etiquetas[0].texto, 'NOVO MOVIMENTO OUI | só no kit');
  const textosPlanta = await p.$$eval('#slide .grupo-etiquetas', (gs) => gs.map((g) => g.textContent.replace(/\s+/g, '').toLowerCase()));
  assert.ok(textosPlanta.some((t) => t.includes('novomovimentooui|sónokit')), 'a observação aparece depois do |');
  assert.ok(await p.locator('#pcStats .pc-gmv', { hasText: 'NOVO MOVIMENTO OUI' }).count() === 1, 'conta no mesmo movimento');
  assert.strictEqual(await p.locator('#pcStats .pc-alertas li.erro').count(), 0, 'não fica fora dos tipos');
  assert.strictEqual(await p.inputValue('#pcForm .pc-espaco[data-espaco="GONDOLA 1/PONTA-A"] .rs-etq-obs'), 'só no kit');
  // Ponta B da gôndola 1: fixa de O.U.i na ER P e livre nas ERs maiores, em duas partes separadas.
  const fixa = p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 1/PONTA-B"][data-parte="fixo"]');
  const livre = p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 1/PONTA-B"][data-parte="livre"]');
  assert.ok(await fixa.isVisible() && await livre.isVisible(), 'a ponta B mostra a parte fixa e a livre');
  assert.match(await fixa.textContent(), /Só na ER P/);
  assert.match(await livre.textContent(), /Vale para ER M\./, 'a ER G define o lado B da gôndola 1 de novo');
  assert.ok(await fixa.locator('select.rs-marca').first().isDisabled(), 'a marca da parte fixa não muda');
  assert.strictEqual(await fixa.locator('select.rs-marca').first().inputValue(), 'OUI');
  await fixa.locator('.rs-etq select:not(.rs-marca)').first().selectOption('NOVO MOVIMENTO OUI');
  const outro = (await livre.locator('.rs-etq select:not(.rs-marca)').first().locator('option').evaluateAll((os) => os.map((o) => o.value)))
    .find((v) => v && v !== 'NOVO MOVIMENTO OUI');
  await livre.locator('select.rs-marca').first().selectOption('BOT');
  await livre.locator('.rs-etq select:not(.rs-marca)').first().selectOption(outro);
  await gravado();
  assert.strictEqual((await espacos())['01']['GONDOLA 1/PONTA-B'].marca, 'OUI');
  assert.strictEqual((await espacos())['02']['GONDOLA 1/PONTA-B'].etiquetas[0].texto, outro, 'a parte livre grava na ER M');
  const pontaB = (er) => p.evaluate((e) => App.resolver.movimento('C11/2026', e, 'GONDOLA 1/PONTA-B'), er);
  assert.strictEqual((await pontaB('01')).etiquetas[0].texto, 'NOVO MOVIMENTO OUI');
  assert.strictEqual((await pontaB('02')).etiquetas[0].texto, outro, 'ER M: só a parte livre');
  // Na ER G, o lado B da gôndola 1 é definido de novo (não vem da ER M); o "Ciclo exemplo" tem a linha da ER G.
  assert.strictEqual((await pontaB('03')).etiquetas[0].texto, 'BOTI PROMO', 'ER G: a linha da própria ER G');
  // Sem a parte livre, a ER M fica sem nada na ponta B (não herda a parte fixa da ER P).
  await livre.locator('button', { hasText: 'Limpar espaço' }).click();
  await gravado();
  assert.strictEqual(await pontaB('02'), null, 'ER M: a parte fixa não passa');
  // Limpar um espaço: some da planta e o espaço vazio aparece na lista; clicar nele seleciona o móvel.
  await p.evaluate(() => document.querySelector('#slide .movel[data-movel="PIRAMIDE 1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await p.waitForSelector('#pcForm .pc-espaco[data-espaco="PIRAMIDE 1"]');
  await p.locator('#pcForm .pc-espaco button', { hasText: 'Limpar espaço' }).click();
  await gravado();
  assert.ok(!(await espacos())['01']['PIRAMIDE 1']);
  await p.evaluate(() => document.querySelector('#slide .movel[data-movel="GONDOLA 1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await p.locator('#pcStats .pc-vazios summary').click();
  await p.locator('#pcStats .pc-vazios button', { hasText: /Pir.mide|PIRAMIDE 1/ }).first().click();
  await p.waitForSelector('#pcForm .pc-espaco[data-espaco="PIRAMIDE 1"]');
  // Esc tira a seleção.
  await p.locator('#pcTopo h2').click();
  await p.keyboard.press('Escape');
  await p.waitForSelector('#pcForm .pc-espaco', { state: 'detached' });

  // Comunicações ER.
  if (!(await p.isVisible('.lj-editar'))) await p.click('#btnLoja');
  await p.click('.lj-editar');
  await p.waitForSelector('#dlgRascunho[open] .rs-painel');
  await p.locator('.rs-painel').first().locator('textarea').first().fill('GRADE NOVA');
  await p.click('#rascunhoOk');
  await p.waitForSelector('#dlgRascunho', { state: 'hidden' });
  assert.strictEqual(await estado(p, () => App.estado.dados.paineis['C11/2026']['01'].find((x) => x.secao === 'TV').texto), 'GRADE NOVA');

  // Passo 3: enviar. A edição trava: o painel sai e a faixa mostra o status.
  await passo('3. Enviar para aprovação');
  await p.waitForFunction(() => document.querySelector('#rascunhoInfo .rs-status') && document.querySelector('#rascunhoInfo .rs-status').textContent === 'Aguardando aprovação');
  assert.strictEqual(await p.locator('#rascunhoAcoes button').count(), 0);
  assert.ok(await p.isHidden('#painelConstrucao'));

  // Validador: devolve (vira comentário).
  await sair();
  assert.strictEqual(await estado(p, () => App.estado.ciclo), '', 'sem login, o rascunho some');
  await entrar('VALIDADOR', 'Ana');
  await p.selectOption('#selCiclo', 'C11/2026');
  await acao('Devolver');
  await p.fill('#rascunhoCorpo textarea', 'Faltou o totem');
  await p.click('#rascunhoOk');
  await p.waitForFunction(() => document.querySelector('#rascunhoInfo .rs-status').textContent === 'Em construção');
  await p.waitForSelector('.val-cartao', { hasText: 'Devolvido para ajustes: Faltou o totem' });

  // Construtor reenvia; validador aprova: o ciclo entra na planilha e aparece para todos.
  await sair();
  await entrar('CONSTRUTOR', 'Bia');
  await p.selectOption('#selCiclo', 'C11/2026');
  await passo('3. Enviar para aprovação');
  await p.waitForFunction(() => document.querySelector('#rascunhoInfo .rs-status') && document.querySelector('#rascunhoInfo .rs-status').textContent === 'Aguardando aprovação');
  await sair();
  await entrar('VALIDADOR', 'Ana');
  await p.selectOption('#selCiclo', 'C11/2026');
  await acao('Aprovar e publicar');
  await p.waitForFunction(() => App.estado.dados.ciclos.includes('C11/2026'));
  assert.ok(await p.isHidden('#barraRascunho'));
  await sair();
  assert.ok((await p.locator('#selCiclo option').allTextContents()).includes('C11/2026'), 'publicado, aparece sem login');
  await escolherCiclo(p, 'C11/2026');
  assert.ok(await p.locator('#slide .grupo-etiquetas', { hasText: 'NOVO MOVIMENTO OUI' }).count() > 0);

  // Novo ciclo só com os movimentos fixos do anterior.
  await entrar('CONSTRUTOR', 'Bia');
  await p.locator('.rs-secao button', { hasText: 'Novo ciclo' }).click();
  await p.fill('#rascunhoCorpo input', 'C12/2026');
  await p.selectOption('#rascunhoCorpo select', 'C11/2026');
  await p.check('input[name="rsCopiar"][value="fixos"]');
  await p.click('#rascunhoOk');
  await p.waitForSelector('#dlgRascunho', { state: 'hidden' });
  const fixos = await estado(p, () => {
    const linhas = (c) => Object.values(App.estado.dados.movimentos[c]).flatMap((pl) => Object.values(pl));
    return { c11: linhas('C11/2026').filter((i) => i.simbolo === 'FIXO').length, c12: linhas('C12/2026'), tipos: Object.keys(App.estado.dados.tiposMovimento['C12/2026']) };
  });
  assert.strictEqual(fixos.c12.length, fixos.c11);
  assert.ok(fixos.c12.every((i) => i.simbolo === 'FIXO'));
  assert.ok(fixos.tipos.includes('NOVO MOVIMENTO OUI'), 'os tipos dos movimentos fixos vêm junto');
});

test('antecipação: item do próximo ciclo num espaço, com a data e o símbolo ⏩', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  await abaPlanta(p, 'ER P').click();
  await menuConfig(p, 'btnValidacao');
  await p.waitForSelector('#dlgAcesso[open]');
  await p.check('#dlgAcesso input[name="papel"][value="CONSTRUTOR"]');
  await p.fill('#acessoNome', 'Bia');
  await p.fill('#acessoSenha', '1234');
  await p.click('#acessoEntrar');
  await p.waitForSelector('#btnNovaAntecipacao');

  // Nova antecipação: o espaço é escolhido na planta (o diálogo fecha e volta com o espaço clicado).
  await p.click('#btnNovaAntecipacao');
  await p.waitForSelector('#dlgAntecipacao[open]');
  await p.locator('#antCorpo button', { hasText: 'Escolher na planta' }).click();
  await p.waitForSelector('#dlgAntecipacao', { state: 'hidden' });
  assert.ok(await estado(p, () => document.body.classList.contains('escolhendo-antecipacao')));
  await p.locator('#slide .movel[data-movel="GONDOLA 1"][data-espaco="PONTA-A"]').first().dispatchEvent('click');
  await p.waitForSelector('#dlgAntecipacao[open]');
  assert.strictEqual(await p.inputValue('#antMovel'), 'GONDOLA 1/PONTA-A');
  assert.ok(!(await p.isVisible('#dlgMovel[open]')), 'o clique não abre a tela do móvel');
  await p.fill('#antEtiqueta', 'LÇTO ANTECIPADO');
  await p.selectOption('#antMarca', 'EUD');
  await p.fill('#antData', '2026-10-25');
  await p.click('#antOk');
  await p.waitForSelector('#dlgAntecipacao', { state: 'hidden' });
  await p.waitForSelector('#valCorpo .an-item');
  assert.match(await p.textContent('#valCorpo .an-item'), /25\/10\/2026[\s\S]*LÇTO ANTECIPADO/);

  // A planta mostra o item no espaço, com o símbolo de antecipação (e a legenda dele).
  assert.ok((await estado(p, () => App.estado.simbolos)).includes('ANTECIPADO'));
  assert.match(await p.textContent('#slide'), /LÇTO ANTECIPADO/);
  assert.match(await p.textContent('#slide'), /Antecipação \(item adiantado do próximo ciclo\)/);
  const linha = await estado(p, () => App.resolver.movimento('Ciclo exemplo', '01', 'GONDOLA 1/PONTA-A'));
  assert.ok(!linha || !linha.etiquetas.some((e) => e.texto === 'LÇTO ANTECIPADO'), 'a planilha base não leva a antecipação');

  // Tela do móvel: quando entra e o que tinha antes.
  await p.locator('#valCorpo .an-item .val-movel').first().click();
  await p.waitForSelector('#dlgMovel[open]');
  assert.match(await p.textContent('#mvEstrategia'), /Entra em 25\/10\/2026/);
  assert.match(await p.textContent('#mvEstrategia'), /Antes/);
  await p.keyboard.press('Escape');
  await p.waitForSelector('#dlgMovel:not([open])', { state: 'attached' });

  // Comunicações ER lista as antecipações da ER, para todo mundo.
  if (!(await p.isVisible('#painelLoja'))) await p.click('#btnLoja');
  await p.waitForSelector('#lojaCorpo .an-item');

  // Editar (vale em todas as ERs, soma às etiquetas) e excluir.
  await p.locator('#valCorpo .an-item button', { hasText: 'Editar' }).click();
  await p.waitForSelector('#dlgAntecipacao[open]');
  await p.check('#antCorpo input[name="antOnde"][value="TODAS"]');
  await p.click('#antOk');
  await p.waitForSelector('#dlgAntecipacao', { state: 'hidden' });
  assert.strictEqual(await estado(p, () => App.estado.dados.antecipacoes[0].planta), 'TODAS');
  await abaPlanta(p, 'ER M').click();
  assert.match(await p.textContent('#slide'), /LÇTO ANTECIPADO/);
  await p.locator('#valCorpo .an-item button', { hasText: 'Excluir' }).click();
  await p.waitForFunction(() => !App.estado.dados.antecipacoes.length);
  assert.ok(!(await estado(p, () => App.estado.simbolos)).includes('ANTECIPADO'));
});

test('modo noturno: liga pelo menu, lembra ao recarregar e desliga', async (t) => {
  const p = await abrir(t);
  const tema = () => p.evaluate(() => document.documentElement.dataset.tema || 'claro');
  const fundo = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.strictEqual(await tema(), 'claro');
  const claro = await fundo();
  // Fundo do desenho da planta (o primeiro retângulo do slide).
  const fundoPlanta = () => p.evaluate(() => document.querySelector('#slide > rect').getAttribute('fill'));
  await escolherCiclo(p, 'Ciclo exemplo');
  const plantaClara = await fundoPlanta();
  // Cor da primeira etiqueta da planta: no modo noturno, a versão mais escura da cor da marca.
  const corEtiqueta = () => p.evaluate(() => document.querySelector('#slide .etq').getAttribute('fill'));
  const etiquetaClara = await corEtiqueta();
  // Espaços fixos (cadeado): móveis e etiquetas com a hachura.
  assert.ok(await p.locator('#slide .camada-planta .hachura').count() > 0, 'móvel fixo sem hachura');
  assert.ok(await p.locator('#slide .camada-etiquetas .hachura').count() > 0, 'etiqueta fixa sem hachura');
  await menuConfig(p, 'btnTema');
  assert.strictEqual(await tema(), 'escuro');
  assert.notStrictEqual(await fundo(), claro);
  assert.notStrictEqual(await fundoPlanta(), plantaClara);
  assert.notStrictEqual(await corEtiqueta(), etiquetaClara);
  assert.strictEqual(await p.getAttribute('#btnTema', 'aria-pressed'), 'true');
  // O PNG do slide sai com as cores claras de sempre, mesmo no modo noturno.
  await p.click('#btnPng');
  await p.waitForSelector('#dlgPng[open]');
  await p.check('#dlgPng input[name="pngConteudo"][value="planta"]');
  await p.check('#dlgPng input[name="pngFormato"][value="slide"]');
  const d = await baixar(p, () => p.click('#dlgPng button[value="baixar"]'));
  const canto = await p.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    return Array.from(g.getImageData(img.width - 3, 3, 1, 1).data.slice(0, 3));
  }, d.bytes.toString('base64'));
  assert.ok(canto.every((v) => v > 200), 'PNG escuro no modo noturno: ' + canto);
  assert.notStrictEqual(await fundoPlanta(), plantaClara); // a tela continua escura depois do PNG
  await p.reload();
  await p.waitForFunction(() => App.estado.dados);
  assert.strictEqual(await tema(), 'escuro');
  assert.strictEqual(await p.getAttribute('#btnTema', 'aria-pressed'), 'true');
  assert.notStrictEqual(await fundoPlanta(), plantaClara);
  await escolherCiclo(p, 'Ciclo exemplo'); // depois de recarregar, a planta abre limpa
  assert.notStrictEqual(await corEtiqueta(), etiquetaClara);
  await menuConfig(p, 'btnTema');
  assert.strictEqual(await tema(), 'claro');
  assert.strictEqual(await fundo(), claro);
  assert.strictEqual(await fundoPlanta(), plantaClara);
  assert.strictEqual(await corEtiqueta(), etiquetaClara);
});

test('tela de celular: abre e troca de ciclo sem erro', async (t) => {
  const p = await abrir(t, { largura: 390, altura: 844 });
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  await p.click('#abasVisao .aba[data-visao="simplificada"]');
  await p.click('#btnAnalytics');
  await p.click('#anFechar');
  assert.ok(await p.locator('#slide [data-movel]').count() > 0);
});

test('dados corrompidos no navegador voltam ao exemplo', async (t) => {
  const p = await abrir(t);
  await p.evaluate(() => localStorage.setItem('planoVarejo.planilhaLocal.v1', '{quebrado'));
  await p.reload();
  await p.waitForFunction(() => App.estado.dados && App.estado.dados.ciclos.includes('Ciclo exemplo'));
});
