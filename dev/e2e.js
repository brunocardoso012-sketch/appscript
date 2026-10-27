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

/** jsPDF local (o briefing em PDF): JSPDF_JS = caminho do jspdf.umd.min.js, ou o pacote jspdf instalado. */
function jspdfLocal() {
  if (process.env.JSPDF_JS && fs.existsSync(process.env.JSPDF_JS)) return process.env.JSPDF_JS;
  try { return require.resolve('jspdf/dist/jspdf.umd.min.js', { paths: [RAIZ] }); } catch (e) { return null; }
}

const { chromium } = exigir('playwright');
const { carregarGas } = require('./gas');

/**
 * Dados dos testes no navegador: o app não tem mais ciclos de exemplo, então cada teste começa com os
 * de Layouts.gs ("Ciclo exemplo" e "Ciclo exemplo cheio") gravados no armazenamento da versão web.
 */
const SEMENTE = (() => {
  const { run } = carregarGas();
  return JSON.stringify({
    layout: run('valoresLayoutPadrao_()'),
    movimentos: run('valoresMovimentosExemplo_()'),
    paineis: run('valoresPaineisExemplo_()'),
    tipos: run('valoresTiposExemplo_()'),
    produtos: run('valoresProdutosExemplo_()'),
    versoesModelo: run('versoesAtuais_()'),
  });
})();
const EXCEL_LOCAL = excelLocal();
const JSPDF_LOCAL = jspdfLocal();
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
  const op = Object.assign({ tutorial: false, largura: 1440, altura: 900, exemplo: true }, opcoes);
  const ctx = await navegador.newContext({ viewport: { width: op.largura, height: op.altura }, acceptDownloads: true });
  if (!op.tutorial) await ctx.addInitScript(() => localStorage.setItem('planoVarejo.tutorialVisto', '1'));
  // Só quando o navegador ainda não tem dados: depois de recarregar, valem as mudanças feitas no teste.
  if (op.exemplo) {
    await ctx.addInitScript((semente) => {
      if (!localStorage.getItem('planoVarejo.planilhaLocal.v1')) localStorage.setItem('planoVarejo.planilhaLocal.v1', semente);
    }, SEMENTE);
  }
  // Fonte do Google: resposta vazia (sem depender da rede; o app usa a fonte de reserva).
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  if (EXCEL_LOCAL) await ctx.route('**/exceljs.min.js', (r) => r.fulfill({ path: EXCEL_LOCAL, contentType: 'text/javascript' }));
  if (JSPDF_LOCAL) await ctx.route('**/jspdf.umd.min.js', (r) => r.fulfill({ path: JSPDF_LOCAL, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }));

  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  pagina.on('console', (m) => { if (m.type() === 'error') erros.push('console.error: ' + m.text()); });
  pagina.on('dialog', (d) => d.accept()); // window.confirm (Restaurar exemplo, descartar…)
  await pagina.goto(INDEX + (op.hash || ''));
  await pagina.waitForFunction((comCiclos) => typeof App !== 'undefined' && App.estado.dados && (!comCiclos || App.estado.dados.ciclos.length), op.exemplo);

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
// Validação e Construção: um item na engrenagem e uma senha para cada papel (SENHAS_ACESSO, em Config.gs).
const MENU = { VALIDADOR: 'btnValidacao', CONSTRUTOR: 'btnConstrucao' };
const SENHA = { VALIDADOR: 'validacao_exposicao', CONSTRUTOR: 'construcao_exposicao', DESENVOLVEDOR: 'desenvolvedor_exposicao' };
const escolherCiclo = (p, ciclo) => p.selectOption('#selCiclo', ciclo);
const abaPlanta = (p, nome) => p.locator('#abasPlanta .aba', { hasText: new RegExp('^' + nome + '$') });

/** Módulos que ficam no painel do desenvolvedor; os outros itens ficam direto no menu da engrenagem. */
const DO_PAINEL = ['btnConstruir', 'btnModelo', 'btnImportar'];

/**
 * Abre o painel do desenvolvedor: engrenagem › Modo desenvolvedor (com a senha, se a sessão ainda não tem),
 * na seção Construção da loja.
 */
async function abrirPainelDev(p) {
  await p.click('#btnConfig');
  await p.click('#btnDesenvolvedor');
  await p.waitForSelector('#dlgDesenvolvedor[open], #dlgDev[open]');
  if (await p.locator('#dlgDesenvolvedor[open]').count()) {
    await p.fill('#devSenha', SENHA.DESENVOLVEDOR);
    await p.click('#devEntrar');
  }
  await p.waitForSelector('#dlgDev[open]');
  await p.click('#dlgDev [data-dev-aba="modulos"]');
}

/** Escolhe um item: no menu da engrenagem ou, para a construção da loja, no painel do desenvolvedor. */
async function menuConfig(p, id) {
  if (DO_PAINEL.indexOf(id) < 0) {
    await p.click('#btnConfig');
    await p.click('#' + id);
    return;
  }
  await abrirPainelDev(p);
  await p.click('#' + id);
  if (await p.locator('#dlgDev[open]').count()) await p.click('#devFechar');
}

/** Entra no modo desenvolvedor e fecha o painel. */
async function entrarDesenvolvedor(p) {
  await abrirPainelDev(p);
  await p.click('#devFechar');
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

test('abre no último ciclo aprovado, com as 4 plantas, em modo local', async (t) => {
  const p = await abrir(t);
  assert.deepStrictEqual(await p.locator('#abasPlanta .aba').allTextContents(), ['ER P', 'ER M', 'ER G', 'ER GG']);
  assert.strictEqual(await p.inputValue('#selCiclo'), 'Ciclo exemplo cheio', 'o último ciclo da planilha');
  assert.ok(await p.locator('#slide .grupo-etiquetas').count() > 0, 'a planta abre com as etiquetas do ciclo');
  // Atualizar mantém o ciclo escolhido; não há opção "sem ciclo".
  await escolherCiclo(p, 'Ciclo exemplo');
  await p.click('#btnAtualizar');
  await p.waitForSelector('#carregando', { state: 'hidden' });
  assert.strictEqual(await estado(p, () => App.estado.ciclo), 'Ciclo exemplo');
  // Copiar link fica no topo; Abrir planilha, na engrenagem (no modo local não há planilha).
  assert.ok(await p.isVisible('#btnLink'));
  assert.ok(await p.locator('#menuConfigLista #lnkPlanilha').count() === 1);
  const opcoes = await p.locator('#selCiclo option').allTextContents();
  assert.deepStrictEqual(opcoes, ['Ciclo exemplo', 'Ciclo exemplo cheio']);
  assert.ok(await p.isVisible('#avisoLocal'));
  assert.ok(await p.locator('#slide [data-movel]').count() > 10, 'a planta deveria ter móveis desenhados');
  assert.strictEqual(await p.isVisible('#telaConfig'), false);
});

test('ciclos × plantas × visões desenham sem erro', async (t) => {
  const p = await abrir(t);
  for (const ciclo of ['Ciclo exemplo', 'Ciclo exemplo cheio']) {
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

  // Meia tela: a planta continua visível à esquerda.
  const [planta, painel] = await Promise.all(['#slide', '#painelAnalytics'].map((s) => p.locator(s).boundingBox()));
  assert.ok(planta.width > 300 && planta.x + planta.width <= painel.x + 1, 'a planta fica à esquerda do Analytics');
  assert.ok(Math.abs(painel.width - 1440 / 2) < 20, 'o Analytics ocupa metade da tela: ' + painel.width);
  // Marcas: bolinhas ao lado do nome do movimento (sem a coluna Marcas); gráficos de marcas e classificação empilhados.
  assert.strictEqual(await p.locator('#anCorpo th.an-col-marcas').count(), 0);
  assert.ok(await p.locator('#anCorpo .an-mov-nome .an-marcas-mov i').count() > 0, 'sem as bolinhas das marcas');
  const barras = await p.locator('#anCorpo .an-cartao', { hasText: /em cada ER/ }).evaluateAll((cs) => cs.map((c) => c.getBoundingClientRect().top));
  assert.ok(barras.length >= 2 && barras[1] > barras[0] + 40, 'os gráficos de marcas e classificação ficam um em cima do outro');

  // Setas trocam a ER em destaque; clicar numa célula filtra a planta ao lado (o Analytics continua aberto).
  await p.locator('body').press('ArrowRight');
  await p.locator('#anCorpo .an-celula button').first().click();
  assert.ok(await p.isVisible('#painelAnalytics'));
  assert.ok(await estado(p, () => App.estado.filtroEtiqueta), 'filtro da etiqueta não foi ligado');
  assert.ok(await p.inputValue('#filtroMovimento'), 'o menu de movimento mostra a etiqueta escolhida');

  // Esc fecha o Analytics.
  await p.locator('body').press('Escape');
  assert.strictEqual(await p.isVisible('#painelAnalytics'), false);
});

test('filtros por tipo de movimento e por movimento (menus ao lado das marcas); legenda e notas paradas com zoom', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  const tipos = await p.locator('#filtroTipo option').allTextContents();
  assert.strictEqual(tipos[0], 'Todos os tipos');
  assert.ok(tipos.includes('Promoção') && tipos.includes('Baseline'), tipos.join(', '));
  const todos = await p.locator('#filtroMovimento option').count();
  await p.selectOption('#filtroTipo', { label: 'Promoção' });
  assert.strictEqual(await estado(p, () => App.estado.filtroClassificacao), 'PROMOCAO');
  const daPromo = await p.locator('#filtroMovimento option').allTextContents();
  assert.ok(daPromo.length > 1 && daPromo.length < todos, 'com um tipo, o menu de movimento só tem os dele');
  await p.selectOption('#filtroMovimento', daPromo[1]);
  assert.strictEqual(await estado(p, () => App.estado.filtroEtiqueta), daPromo[1]);
  // Escolher uma marca limpa os dois.
  await p.locator('#legenda .chip').first().click();
  assert.deepStrictEqual(await estado(p, () => [App.estado.filtroClassificacao, App.estado.filtroEtiqueta]), ['', '']);
  assert.strictEqual(await p.inputValue('#filtroTipo'), '');

  // Zoom: a caixa das notas e a legenda dos símbolos ficam no mesmo lugar da tela.
  const lugar = () => p.locator('#slide .fixo-zoom').boundingBox();
  const antes = await lugar();
  await p.click('#zoomMais');
  await p.click('#zoomMais');
  const depois = await lugar();
  assert.ok(Math.abs(antes.x - depois.x) < 2 && Math.abs(antes.y - depois.y) < 2 && Math.abs(antes.width - depois.width) < 2,
    'a legenda mexeu com o zoom: ' + JSON.stringify([antes, depois]));
});

test('cascata ER M → ER G: o lado B da gôndola 2 vira o lado A da gôndola 3 e é definido de novo; a gôndola 1 segue a cascata', async (t) => {
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
  // O lado B da gôndola 2 na ER G é o da própria ER G; sem a linha dela, fica vazio (não vem da ER M).
  assert.strictEqual(await mov('03', 'GONDOLA 2/PONTA-B'), 'JUICY MOOD');
  assert.strictEqual(await mov('04', 'GONDOLA 2/PONTA-B'), 'JUICY MOOD', 'a ER GG herda da ER G');
  await p.evaluate(() => {
    const g = App.estado.dados.movimentos['Ciclo exemplo']['03'];
    ['GONDOLA 2/PONTA-B', 'GONDOLA 2/MEIO-B'].forEach((k) => delete g[k]);
  });
  for (const id of ['GONDOLA 2/PONTA-B', 'GONDOLA 2/MEIO-B']) {
    assert.strictEqual(await mov('03', id), null, 'ER G ' + id);
    assert.strictEqual(await mov('04', id), null, 'ER GG ' + id);
  }
  // A gôndola 1 segue a cascata: o meio B (da ER P) e a ponta B livre (da ER M) valem na ER G e na ER GG.
  for (const er of ['03', '04']) {
    assert.strictEqual(await mov(er, 'GONDOLA 1/MEIO-B'), 'UOMINI HERO', 'ER ' + er + ' meio B');
    assert.strictEqual(await mov(er, 'GONDOLA 1/PONTA-B'), 'BOTI PROMO', 'ER ' + er + ' ponta B livre');
  }
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
  // Balão arredondado (no lugar da dica do navegador), em duas linhas.
  const balao = async (sel) => {
    // O mouse entra no desenho do espaço (no meio da caixa dele pode estar outro móvel, na vista isométrica).
    await p.locator(sel).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: r.x + 4, clientY: r.y + 4 }));
    });
    await p.waitForSelector('.balao-rede:not([hidden])');
    return p.locator('.balao-rede span').allTextContents();
  };
  assert.deepStrictEqual(await balao('#slide .movel[data-movel="GONDOLA 1"][data-espaco="PONTA-B"]'), ['Presente em 900 lojas', '90% da rede']);
  assert.deepStrictEqual(await balao('#slide .movel[data-movel="GONDOLA 1"][data-espaco="PONTA-A"]'), ['Presente em 1.000 lojas', '100% da rede']);
  assert.strictEqual(await p.locator('#slide .movel[data-movel="GONDOLA 1"] > title').count(), 0, 'sem a dica antiga');
  assert.notStrictEqual(await p.$eval('.balao-rede', (b) => getComputedStyle(b).borderTopLeftRadius), '0px', 'balão arredondado');
  await abaPlanta(p, 'ER GG').click();
  assert.deepStrictEqual(await balao('#slide .movel[data-movel="GONDOLA 4"]'), ['Presente em 130 lojas', '13% da rede']);
  const caixa = await p.locator('#slide').boundingBox();
  await p.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await p.mouse.move(2, 2);
  assert.ok(await p.locator('.balao-rede').isHidden(), 'some ao sair da planta');

  // Analytics: coluna "Na rede" com a presença de cada movimento.
  await p.click('#btnAnalytics');
  assert.match(await p.textContent('#anCorpo th.an-col-rede'), /Na rede.*% das lojas · lojas · espaços/);
  assert.match(await p.getAttribute('#anCorpo th.an-col-rede', 'title'), /1\.000 lojas/);
  assert.deepStrictEqual((await p.locator('#anCorpo .an-mapa').first().locator('thead th').allTextContents()).slice(0, 4).map((x) => x.split(/\d/)[0].trim()),
    ['Movimento', 'Móveis', 'Na rede% das lojas · lojas · espaços', 'ER P'], 'Móveis e Na rede antes das ERs');
  const linha = (texto) => p.locator('#anCorpo tbody tr', { has: p.locator('.an-mov-nome', { hasText: new RegExp('^' + texto + '$') }) }).first();
  // Móveis: um ícone por tipo de móvel em que o movimento está.
  assert.deepStrictEqual(await linha('EXAUSTÃO OUI').locator('.an-movel-icone').evaluateAll((s) => s.map((x) => x.getAttribute('aria-label'))), ['Gôndola']);
  assert.ok(await linha('BOTIPROMO').locator('.an-movel-icone').count() >= 2, 'BOTIPROMO está em mais de um tipo de móvel');
  // Espaços na rede: soma todos os espaços do movimento (EXAUSTÃO OUI: ponta A da gôndola 4, nas 130 lojas da ER GG).
  assert.match(await linha('EXAUSTÃO OUI').locator('td.an-col-rede small').textContent(), /≈ 130 espaços/);
  assert.match(await linha('EXAUSTÃO OUI').locator('td.an-col-rede .an-rede-lojas').textContent(), /≈ 130 lojas/, 'as lojas ao lado do %');
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
  assert.strictEqual((await p.textContent('#dlgMovel .mv-aviso')).trim(), 'Página em construção');
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

test('engrenagem: todos os itens no menu; o modo desenvolvedor pede senha e abre o painel', async (t) => {
  const p = await abrir(t);
  await p.click('#btnConfig');
  for (const id of ['btnValidacao', 'btnConstrucao', 'btnEditar', 'btnTema', 'btnTutorial', 'btnDesenvolvedor']) {
    assert.ok(await p.isVisible('#menuConfigLista #' + id), id + ' não está no menu');
  }
  // A construção da loja fica no painel do desenvolvedor (com senha).
  for (const id of DO_PAINEL) assert.strictEqual(await p.isVisible('#' + id), false, id + ' aparece sem a senha');
  assert.strictEqual(await p.isVisible('#devFaixa'), false);
  await p.click('#btnDesenvolvedor');
  await p.waitForSelector('#dlgDesenvolvedor[open]');
  await p.fill('#devSenha', SENHA.CONSTRUTOR);
  await p.click('#devEntrar');
  await p.waitForSelector('#devErro:not([hidden])');
  assert.match(await p.textContent('#devErro'), /Senha incorreta/);
  await p.click('#devCancelar');

  await abrirPainelDev(p);
  for (const id of DO_PAINEL) assert.ok(await p.isVisible('#' + id), id + ' não aparece no painel');
  await p.click('#devFechar');
  await p.click('#btnConfig');
  assert.strictEqual(await p.getAttribute('#btnDesenvolvedor', 'aria-pressed'), 'true', 'o item fica marcado com a sessão aberta');
  await p.click('#btnConfig');
  await abrirPainelDev(p);
  // Visual do modo desenvolvedor: faixa no alto e a classe no corpo.
  assert.ok(await p.isVisible('#devFaixa'));
  assert.ok(await estado(p, () => document.body.classList.contains('modo-dev')));

  // Plantas: renomear a ER G (o nome antigo continua valendo) e ver a ordem da cascata.
  await p.click('#dlgDev [data-dev-aba="plantas"]');
  const er = (id) => p.locator('#devPlantas .dev-planta[data-planta="' + id + '"]');
  await er('03').locator('.dev-nome').fill('ER Grande');
  await er('03').locator('button', { hasText: 'Salvar alterações' }).click();
  await p.waitForFunction(() => App.estado.dados.plantas.find((x) => x.id === '03').nome === 'ER Grande');
  assert.ok(await abaPlanta(p, 'ER Grande').count(), 'aba da planta com o nome novo');
  await er('04').locator('button[title="Subir na cascata"]').click();
  await p.waitForFunction(() => App.estado.dados.plantas.map((x) => x.id).join() === '01,02,04,03');
  await er('04').locator('button[title="Descer na cascata"]').click();
  await p.waitForFunction(() => App.estado.dados.plantas.map((x) => x.id).join() === '01,02,03,04');

  // Cascata: a ponta B da gôndola 1 passa a ser fixa de O.U.i na ER G (e livre nas outras).
  await p.click('#dlgDev [data-dev-aba="cascata"]');
  const regra = p.locator('#devCascata .dev-regra').first();
  await regra.locator('.dev-opcao', { hasText: 'ER P' }).locator('input').uncheck();
  await regra.locator('.dev-opcao', { hasText: 'ER Grande' }).locator('input').check();
  assert.match(await regra.locator('.dev-resumo').textContent(), /Fixo na ER Grande; livre na ER P, ER M e ER GG/);
  await p.click('#devCascata button:has-text("Salvar espaços fixos")');
  await p.waitForFunction(() => App.estado.dados.config.espacosPorEr['GONDOLA 1/PONTA-B'].fixo.plantas.join() === '03');
  assert.match(await p.textContent('#devMsg'), /Espaços fixos salvos/);
  await p.click('#devCascata button:has-text("Voltar ao padrão do código")');
  await p.waitForFunction(() => App.estado.dados.config.espacosPorEr['GONDOLA 1/PONTA-B'].fixo.plantas.join() === '01');

  // Senhas: as três aparecem.
  await p.click('#dlgDev [data-dev-aba="senhas"]');
  assert.strictEqual(await p.inputValue('#devSenhas [data-senha="DESENVOLVEDOR"]'), SENHA.DESENVOLVEDOR);
  await p.click('#devFechar');

  // Construir loja › Salvar planta › Criar uma planta nova; depois, apagar a planta pelo painel.
  await menuConfig(p, 'btnConstruir');
  await p.click('#cnsSalvar');
  await p.waitForSelector('#dlgSalvarPlanta[open]');
  await p.check('#formSalvarPlanta input[value="nova"]');
  await p.fill('#spNome', 'ER Teste');
  await p.click('#spSalvar');
  await p.waitForFunction(() => App.estado.dados.plantas.some((x) => x.nome === 'ER Teste'));
  assert.strictEqual(await estado(p, () => App.estado.planta), '05');
  await p.click('#cnsFechar');
  await abrirPainelDev(p);
  await p.click('#dlgDev [data-dev-aba="plantas"]');
  await er('05').locator('button', { hasText: /^Apagar$/ }).click();
  await er('05').locator('button', { hasText: 'Apagar de vez' }).click();
  await p.waitForFunction(() => !App.estado.dados.plantas.some((x) => x.id === '05'));
  await p.click('#devFechar');

  // Continua no modo desenvolvedor depois de recarregar (mesma aba); Sair volta a pedir a senha.
  await p.reload();
  await p.waitForFunction(() => App.estado.dados);
  assert.ok(await p.isVisible('#devFaixa'));
  await p.click('#devFaixaSair');
  assert.strictEqual(await p.isVisible('#devFaixa'), false);
  await p.click('#btnConfig');
  await p.click('#btnDesenvolvedor');
  await p.waitForSelector('#dlgDesenvolvedor[open]');
  await p.click('#devCancelar');
});

test('planilha base: baixar e importar de volta como ciclo novo', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  await entrarDesenvolvedor(p);
  await menuConfig(p, 'btnModelo');
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

  // Apagar dados volta ao começo: sem nenhum ciclo (nem os de exemplo).
  await p.click('#btnRestaurar');
  await p.waitForFunction(() => App.estado.dados.ciclos.length === 0);
});

test('o app começa sem ciclos de exemplo', async (t) => {
  const p = await abrir(t, { exemplo: false });
  assert.deepStrictEqual(await estado(p, () => App.estado.dados.ciclos), []);
  assert.strictEqual(await p.isDisabled('#selCiclo'), true);
  assert.match(await p.textContent('#selCiclo'), /nenhum ciclo/);
});

test('planilha base em branco, só uma planta', async (t) => {
  const p = await abrir(t);
  await entrarDesenvolvedor(p);
  await menuConfig(p, 'btnModelo');
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
  await entrarDesenvolvedor(p);
  await menuConfig(p, 'btnConstruir');
  assert.ok(await p.isVisible('#painelConstrutor'));

  await p.locator('#cnsPaleta button', { hasText: 'Gôndola' }).first().click();
  assert.ok(await p.isVisible('#cnsCampos'), 'o móvel novo deveria ficar selecionado');
  assert.match(await p.inputValue('#cnsId'), /^GONDOLA \d+$/);
  await p.click('#cnsDesfazer');
  await p.locator('#cnsPaleta button', { hasText: 'Pirâmide' }).first().click();
  await p.locator('#slide').press('ArrowRight');
  // Salva sozinho na planilha (sem clicar em nada).
  await p.waitForFunction((n) => App.estado.dados.plantas.find((x) => x.id === '02').moveis.length === n + 1, antes);
  await p.waitForFunction(() => /Salvo na planilha/.test(document.getElementById('cnsStatus').textContent));
  // O rodapé (status e botões) fica fixo embaixo do menu, sem cobrir as seções: só o meio rola.
  const caixas = await p.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return { corpo: r('#painelConstrutor .cns-corpo'), rodape: r('#painelConstrutor .cns-rodape') };
  });
  assert.ok(caixas.corpo.bottom <= caixas.rodape.top + 1, 'o rodapé cobre o menu');
  assert.strictEqual(await p.locator('#cnsBaixarCodigo, #cnsCarregarCodigo').count(), 0, 'sem os botões do código da loja');

  await menuConfig(p, 'btnConstruir');
  assert.strictEqual(await p.isVisible('#painelConstrutor'), false);
  await p.reload();
  await p.waitForFunction((n) => App.estado.dados && App.estado.dados.plantas.find((x) => x.id === '02').moveis.length === n + 1, antes);
});

test('validação: senha errada, comentário, resposta e resolução', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');

  const entrar = async (papel, nome, senha) => {
    await menuConfig(p, MENU[papel]);
    await p.waitForSelector('#dlgAcesso[open]');
    await p.fill('#acessoNome', nome);
    await p.fill('#acessoSenha', senha);
    await p.click('#acessoEntrar');
  };

  await entrar('VALIDADOR', 'Teste E2E', 'errada');
  await p.waitForSelector('#acessoErro:not([hidden])');
  assert.strictEqual(await p.textContent('#acessoTitulo'), 'Validação');
  await p.click('#acessoCancelar');
  // A senha da construção não entra na validação.
  await entrar('VALIDADOR', 'Teste E2E', SENHA.CONSTRUTOR);
  await p.waitForSelector('#acessoErro:not([hidden])');
  await p.click('#acessoCancelar');

  await entrar('VALIDADOR', 'Teste E2E', SENHA.VALIDADOR);
  await p.waitForSelector('#painelValidacao:not([hidden])');
  await p.fill('#valCorpo .val-novo textarea', 'Trocar a cor da gôndola 1');
  await p.click('#valCorpo .val-novo button[type="submit"]');
  await p.waitForSelector('#valCorpo .val-cartao');
  assert.match(await p.textContent('#valBadge'), /1/);
  await p.click('#valCorpo button:has-text("Sair")');

  await entrar('CONSTRUTOR', 'Construtor E2E', SENHA.CONSTRUTOR);
  await p.waitForSelector('#valCorpo .val-cartao');
  assert.strictEqual(await p.textContent('#valTitulo'), 'Construção', 'o painel mostra o módulo de construção');
  assert.strictEqual(await p.getAttribute('#btnConstrucao', 'aria-pressed'), 'true');
  assert.strictEqual(await p.getAttribute('#btnValidacao', 'aria-pressed'), 'false');
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
  const p = await abrir(t, { hash: '#ciclo=Ciclo+exemplo+cheio&er=ER+G&visao=simplificada&marca=BOT' });
  const e = await estado(p, () => {
    const s = App.estado;
    return { ciclo: s.ciclo, er: s.dados.plantas.find((x) => x.id === s.planta).nome, visao: s.visao, filtro: s.filtro };
  });
  assert.deepStrictEqual(e, { ciclo: 'Ciclo exemplo cheio', er: 'ER G', visao: 'simplificada', filtro: 'BOT' });
  assert.strictEqual(await p.inputValue('#selCiclo'), 'Ciclo exemplo cheio');
  // Trocar de ER atualiza o hash.
  await abaPlanta(p, 'ER M').click();
  assert.match(await p.evaluate(() => location.hash), /er=ER\+M/);
  // Copiar link (sem área de transferência no teste: cai no prompt, que o teste aceita).
  await p.click('#btnLink');
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
    await menuConfig(p, MENU[papel]);
    await p.waitForSelector('#dlgAcesso[open]');
    await p.fill('#acessoNome', nome);
    await p.fill('#acessoSenha', SENHA[papel]);
    await p.click('#acessoEntrar');
    await p.waitForSelector('#dlgAcesso', { state: 'hidden' });
    // O painel da validação ou, se o papel tem um ciclo em construção (que abre sozinho), o de construção.
    await p.locator('.rs-secao:visible, #painelConstrucao:visible').first().waitFor();
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
  // O construtor monta pelo painel da lateral (no lugar do painel da validação); a faixa do topo avisa que o ciclo
  // está em construção, sem as ações (que ficam no painel).
  assert.ok(await p.isVisible('#painelConstrucao'));
  assert.ok(await p.isHidden('#painelValidacao'));
  assert.match(await p.textContent('#barraRascunho'), /Ciclo C11\/2026 \(não publicado\).*Em construção.*Você está montando/);
  assert.strictEqual(await p.locator('#rascunhoAcoes button').count(), 0);

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
  const opcoes = await ponta.locator('.rs-etq select:not(.rs-marca):not(.rs-etq-simbolo)').first().locator('option').allTextContents();
  assert.ok(opcoes.includes('NOVO MOVIMENTO OUI') && !opcoes.some((o) => /fora dos tipos/.test(o)));
  await ponta.locator('select.rs-marca').first().selectOption('OUI');
  await ponta.locator('select').nth(1).selectOption('FIXO');
  await ponta.locator('.rs-etq select:not(.rs-marca):not(.rs-etq-simbolo)').first().selectOption('NOVO MOVIMENTO OUI');
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
  assert.match(await livre.textContent(), /Vale para ER M, ER G, ER GG\./);
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
  // A parte livre definida na ER M vale da ER M até a ER GG (cascata).
  for (const er of ['03', '04']) assert.strictEqual((await pontaB(er)).etiquetas[0].texto, outro, 'ER ' + er + ': a parte livre da ER M');
  // Sem a parte livre, as ERs maiores ficam sem nada na ponta B (não herdam a parte fixa da ER P).
  await livre.locator('button', { hasText: 'Limpar espaço' }).click();
  await gravado();
  for (const er of ['02', '03', '04']) assert.strictEqual(await pontaB(er), null, 'ER ' + er + ': a parte fixa não passa');
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
  assert.strictEqual(await estado(p, () => App.estado.ciclo), 'Ciclo exemplo cheio', 'sem login, o rascunho some (volta ao último aprovado)');
  await entrar('VALIDADOR', 'Ana');
  // Ao entrar, o validador vai direto para o ciclo que aguarda aprovação, com o aviso em destaque.
  await p.waitForFunction(() => App.estado.ciclo === 'C11/2026');
  assert.match(await p.textContent('#barraRascunho'), /Ciclo C11\/2026 \(não publicado\).*Aguardando aprovação.*aprove ou devolva/);
  await acao('Devolver');
  await p.fill('#rascunhoCorpo textarea', 'Faltou o totem');
  await p.click('#rascunhoOk');
  await p.waitForFunction(() => document.querySelector('#rascunhoInfo .rs-status').textContent === 'Em construção');
  await p.waitForSelector('.val-cartao', { hasText: 'Devolvido para ajustes: Faltou o totem' });

  // Construtor reenvia; validador aprova: o ciclo entra na planilha e aparece para todos.
  await sair();
  await entrar('CONSTRUTOR', 'Bia');
  // Ao entrar, o construtor vai direto para o ciclo que está montando (devolvido, de novo em construção).
  await p.waitForFunction(() => App.estado.ciclo === 'C11/2026');
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

test('ciclo em construção: fixos na planta, meio dividido, etiquetas e cores das marcas', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  await abaPlanta(p, 'ER P').click();
  await menuConfig(p, 'btnConstrucao');
  await p.waitForSelector('#dlgAcesso[open]');
  await p.fill('#acessoNome', 'Bia');
  await p.fill('#acessoSenha', SENHA.CONSTRUTOR);
  await p.click('#acessoEntrar');
  await p.waitForSelector('.rs-secao');
  await p.locator('.rs-secao button', { hasText: 'Novo ciclo' }).click();
  await p.fill('#rascunhoCorpo input', 'C20/2026');
  await p.selectOption('#rascunhoCorpo select', 'Ciclo exemplo');
  await p.check('input[name="rsCopiar"][value="fixos"]');
  await p.click('#rascunhoOk');
  await p.waitForSelector('#dlgRascunho', { state: 'hidden' });
  const fixos = await estado(p, () => Object.keys(App.estado.dados.movimentos['C20/2026']['01']).length);
  assert.ok(fixos > 0);
  assert.strictEqual(await p.locator('#slide .grupo-etiquetas').count(), fixos, 'as etiquetas dos fixos aparecem na planta');
  // Na ER M valem os fixos da ER P (cascata), menos a ponta B da gôndola 1: fixa de O.U.i só na ER P.
  await abaPlanta(p, 'ER M').click();
  assert.strictEqual(await p.locator('#slide .grupo-etiquetas').count(), fixos - 1, 'os fixos da ER P valem na ER M (cascata)');
  // O resto na ER M, que tem a gôndola 2.

  // Etiquetas: começa com uma e "+ Adicionar etiqueta" põe outra, até 4.
  const gravado = () => p.waitForFunction(() => document.getElementById('pcGravacao').textContent === 'Tudo salvo');
  await p.evaluate(() => document.querySelector('#slide .movel[data-movel="GONDOLA 2"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const ponta = p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 2/PONTA-A"]');
  await ponta.waitFor();
  assert.strictEqual(await ponta.locator('.rs-etq').count(), 1);
  const add = ponta.locator('button', { hasText: '+ Adicionar etiqueta' });
  for (let k = 0; k < 3; k++) await add.click();
  assert.strictEqual(await ponta.locator('.rs-etq').count(), 4);
  assert.ok(await add.isHidden(), 'no limite, o botão some');
  const tipos = await ponta.locator('.rs-etq').first().locator('select:not(.rs-marca):not(.rs-etq-simbolo) option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
  await ponta.locator('.rs-etq').nth(0).locator('select:not(.rs-marca):not(.rs-etq-simbolo)').selectOption(tipos[0]);
  await ponta.locator('.rs-etq').nth(1).locator('select:not(.rs-marca):not(.rs-etq-simbolo)').selectOption(tipos[1] || tipos[0]);
  await gravado();
  assert.strictEqual((await estado(p, () => App.estado.dados.movimentos['C20/2026']['02']['GONDOLA 2/PONTA-A'])).etiquetas.length, 2);
  // "×" tira uma etiqueta.
  await ponta.locator('.rs-etq').nth(3).locator('.pc-tirar-etq').click();
  assert.strictEqual(await ponta.locator('.rs-etq').count(), 3);
  assert.ok(await add.isVisible());

  // Cores: a marca escolhida pinta o fundo do select, e as opções seguem a ordem BOT | EUD | QDB | OUI | MM.
  const marca = ponta.locator('select.rs-marca').first();
  assert.deepStrictEqual(await marca.locator('option').allTextContents(), ['Sem marca (branco)', 'BOT', 'EUD', 'QDB', 'OUI', 'MM']);
  await marca.selectOption('EUD');
  const fundo = await marca.evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.strictEqual(fundo, 'rgb(161, 31, 201)');
  assert.strictEqual(await marca.locator('option[value="QDB"]').evaluate((el) => el.style.backgroundColor), 'rgb(226, 63, 180)');
  assert.deepStrictEqual(await p.locator('#legenda .chip').allTextContents().then((x) => x.map((s) => s.trim())), ['BOT', 'EUD', 'QDB', 'OUI', 'MM']);
  await gravado();

  // Símbolo por etiqueta: a antecipação (⏩) pede a data logo em seguida; a planta mostra o símbolo e a data.
  const etq1 = ponta.locator('.rs-etq').nth(0);
  assert.ok(await etq1.locator('.rs-etq-data').isHidden(), 'sem antecipação, sem data');
  await etq1.locator('.rs-etq-simbolo').selectOption('ANTECIPADO');
  assert.ok(await etq1.locator('.rs-etq-data').isVisible(), 'com a antecipação, a data aparece em seguida');
  await etq1.locator('.rs-etq-data').fill('2026-10-25');
  await etq1.locator('.rs-etq-data').dispatchEvent('change');
  await ponta.locator('.rs-etq').nth(1).locator('.rs-etq-simbolo').selectOption('NOVO');
  await gravado();
  const comSimbolos = (await estado(p, () => App.estado.dados.movimentos['C20/2026']['02']['GONDOLA 2/PONTA-A'])).etiquetas;
  assert.deepStrictEqual([comSimbolos[0].simbolo, comSimbolos[0].data, comSimbolos[1].simbolo], ['ANTECIPADO', '2026-10-25', 'NOVO']);
  assert.ok(await p.locator('#slide text', { hasText: '25/10' }).count() > 0, 'a data aparece ao lado do símbolo, na planta');
  assert.ok((await estado(p, () => App.estado.simbolos)).includes('ANTECIPADO'), 'a antecipação entra na legenda');
  await p.click('#btnAtualizar');
  await p.waitForSelector('#carregando', { state: 'hidden' });
  assert.strictEqual((await estado(p, () => App.estado.dados.movimentos['C20/2026']['02']['GONDOLA 2/PONTA-A'])).etiquetas[0].data, '2026-10-25', 'o servidor guardou a data');

  // Meio da gôndola em 2: o que estava no meio vai para a metade 1; a planta divide o meio na hora.
  const meio = p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 2/MEIO-A"]');
  await meio.locator('.rs-etq select:not(.rs-marca):not(.rs-etq-simbolo)').first().selectOption(tipos[0]);
  await gravado();
  await meio.locator('button', { hasText: 'Dividir em 2' }).click();
  await p.waitForSelector('#pcForm .pc-espaco[data-espaco="GONDOLA 2/MEIO-A-2"]');
  assert.ok(await p.locator('#slide .movel[data-movel="GONDOLA 2"][data-espaco="MEIO-A-2"]').count() > 0, 'a planta mostra as duas metades');
  const m1 = p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 2/MEIO-A-1"]');
  assert.strictEqual(await m1.locator('.rs-etq select:not(.rs-marca):not(.rs-etq-simbolo)').first().inputValue(), tipos[0]);
  const m2 = p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 2/MEIO-A-2"]');
  await m2.locator('.rs-etq select:not(.rs-marca):not(.rs-etq-simbolo)').first().selectOption(tipos[1] || tipos[0]);
  await gravado();
  let er = await estado(p, () => App.estado.dados.movimentos['C20/2026']['02']);
  assert.ok(!er['GONDOLA 2/MEIO-A'] && er['GONDOLA 2/MEIO-A-1'] && er['GONDOLA 2/MEIO-A-2']);
  // O servidor guardou as metades (Atualizar recarrega tudo).
  await p.click('#btnAtualizar');
  await p.waitForFunction(() => ((App.estado.dados.movimentos['C20/2026'] || {})['02'] || {})['GONDOLA 2/MEIO-A-2']);
  // Juntar: volta a ser um meio só, com o que estava na metade 1.
  await p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 2/MEIO-A-1"] button', { hasText: 'Juntar metades' }).click();
  await p.waitForSelector('#pcForm .pc-espaco[data-espaco="GONDOLA 2/MEIO-A"]');
  await gravado();
  er = await estado(p, () => App.estado.dados.movimentos['C20/2026']['02']);
  assert.ok(er['GONDOLA 2/MEIO-A'] && !er['GONDOLA 2/MEIO-A-1'] && !er['GONDOLA 2/MEIO-A-2']);
  assert.strictEqual(er['GONDOLA 2/MEIO-A'].etiquetas[0].texto, tipos[0]);
  // Dividir um meio vazio também divide a planta (as metades ficam para preencher).
  await p.locator('#pcForm .pc-espaco[data-espaco="GONDOLA 2/MEIO-B"] button', { hasText: 'Dividir em 2' }).click();
  await p.waitForSelector('#pcForm .pc-espaco[data-espaco="GONDOLA 2/MEIO-B-2"]');
  assert.ok(await p.locator('#slide .movel[data-movel="GONDOLA 2"][data-espaco="MEIO-B-1"]').count() > 0);
});

test('prateleiras: o construtor desenha os quadrados e escolhe os produtos do catálogo', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  await abaPlanta(p, 'ER P').click();
  const abrirGondola = () => p.evaluate(() => {
    const g = [...document.querySelectorAll('#slide [data-movel]')].find((e) => /^GONDOLA 1(\/|$)/.test(e.getAttribute('data-movel')));
    g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  // Sem login: só o planograma; a construção das prateleiras fica no modo de construção.
  await abrirGondola();
  await p.waitForSelector('#dlgMovel[open] .mv-plano');
  assert.strictEqual(await p.locator('.pr-secao').count(), 0);
  assert.strictEqual(await p.locator('[data-acao="editar-prateleiras"]').count(), 0);
  await p.keyboard.press('Escape');

  await menuConfig(p, 'btnConstrucao');
  await p.waitForSelector('#dlgAcesso[open]');
  await p.fill('#acessoNome', 'Bia');
  await p.fill('#acessoSenha', SENHA.CONSTRUTOR);
  await p.click('#acessoEntrar');
  await p.waitForSelector('#dlgAcesso', { state: 'hidden' });
  await abrirGondola();
  await p.locator('.pr-espaco[data-espaco="GONDOLA 1/PONTA-A"] [data-acao="editar-prateleiras"]').click();
  const card = p.locator('.pr-espaco.editando');
  /** Arrasta na prateleira, de (x1, y1) a (x2, y2), em fração da prateleira. */
  const arrastar = async (numero, x1, y1, x2, y2) => {
    const tela = card.locator('.pr-tela[data-numero="' + numero + '"]');
    await tela.scrollIntoViewIfNeeded();
    const r = await tela.boundingBox();
    await p.mouse.move(r.x + r.width * x1, r.y + r.height * y1);
    await p.mouse.down();
    await p.mouse.move(r.x + r.width * x2, r.y + r.height * y2, { steps: 6 });
    await p.mouse.up();
  };
  // Arrastar na prateleira cria um quadrado na altura toda; o painel dele abre com a busca no catálogo.
  await arrastar(1, 0.005, 0.5, 0.5, 0.55);
  await card.locator('.pr-painel .pr-ed-mov').selectOption('LÇTO EGEO');
  await card.locator('.pr-busca').fill('egeo dolce');
  await card.locator('.pr-resultado').first().click();
  await card.locator('.pr-resultado').first().click(); // de novo: soma uma frente
  // Arrastar também na vertical não muda nada: o quadrado continua na altura toda (não há quadrado em cima de outro).
  await arrastar(1, 0.6, 0.02, 0.9, 0.48);
  await card.locator('.pr-busca').fill('malbec gold');
  await card.locator('.pr-resultado').first().click();
  // Sobre a largura de outro quadrado não entra; no espaço livre, entra.
  await arrastar(1, 0.55, 0.6, 0.62, 0.65);
  await arrastar(1, 0.92, 0.5, 0.995, 0.5);
  assert.strictEqual(await card.locator('.pr-tela[data-numero="1"] .pr-quadrado').count(), 3, 'o quadrado sobreposto não entra; o do espaço livre, sim');
  // Delete apaga o quadrado escolhido.
  await card.locator('.pr-tela[data-numero="1"] .pr-quadrado.escolhido').click();
  await p.keyboard.press('Delete');
  assert.strictEqual(await card.locator('.pr-tela[data-numero="1"] .pr-quadrado').count(), 2);
  // Dividir em 2: dois quadrados iguais, de ponta a ponta.
  await card.locator('.pr-ed-prateleira').nth(2).locator('.pr-ed-dividir select').selectOption('2');
  assert.strictEqual(await card.locator('.pr-tela[data-numero="3"] .pr-quadrado').count(), 2);
  await card.locator('select[data-campo="vale"]').selectOption('TODAS');
  await card.locator('[data-acao="salvar-prateleiras"]').click();
  // O que foi salvo aparece no planograma ("como as prateleiras estão divididas").
  await p.waitForSelector('.mv-plano .pg-desenhada[data-espaco="GONDOLA 1/PONTA-A"] .pr-quadrado');
  assert.strictEqual(await p.locator('.mv-plano .pg-desenhada[data-espaco="GONDOLA 1/PONTA-A"][data-numero="1"] .pr-quadrado').count(), 2);
  assert.match(await p.textContent('.mv-plano .pg-desenhada[data-espaco="GONDOLA 1/PONTA-A"][data-numero="1"]'), /Egeo Dolce/);
  const g = await estado(p, () => App.estado.dados.prateleiras.filter((x) => x.espaco === 'GONDOLA 1/PONTA-A'));
  assert.deepStrictEqual(g.map((x) => x.planta), ['01', '02', '03', '04'], 'vale em todas as ERs que têm o espaço');
  const p1 = g[0].prateleiras[0];
  assert.deepStrictEqual(p1.quadrados.map((q) => [q.x, q.y, q.w, q.h]), [[1, 0, 49, 100], [60, 0, 30, 100]]);
  assert.deepStrictEqual(p1.quadrados.map((q) => q.produtos.map((x) => x.sku + '×' + x.frentes)), [['48211×2'], ['50111×1']]);
  assert.strictEqual(p1.movimento, 'LÇTO EGEO');
  assert.deepStrictEqual(g[0].prateleiras[1].quadrados.map((q) => [q.x, q.w]), [[0, 50], [50, 50]]);
  assert.match(await p.textContent('.pr-espaco[data-espaco="GONDOLA 1/PONTA-A"] .pr-resumo'), /2 produtos · 3 frentes/);
  assert.ok(await p.locator('.mv-plano .pg-celula:not(.pg-desenhada)').count() > 0, 'os espaços sem desenho continuam com a divisão automática');

  // Mudança sem salvar: fechar pergunta (o teste aceita) e descarta.
  await p.locator('.pr-espaco[data-espaco="GONDOLA 1/MEIO-A"] [data-acao="editar-prateleiras"]').click();
  await card.locator('.pr-ed-prateleira').first().locator('.pr-ed-dividir select').selectOption('2');
  await p.keyboard.press('Escape');
  await p.waitForSelector('#dlgMovel:not([open])', { state: 'attached' });

  // Continua salvo depois de recarregar e aparece também nas outras ERs, para quem não entrou na construção.
  await p.evaluate(() => sessionStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof App !== 'undefined' && App.estado.dados && App.estado.dados.ciclos.length);
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  await abaPlanta(p, 'ER G').click();
  await abrirGondola();
  await p.waitForSelector('#dlgMovel[open] .mv-plano .pg-desenhada[data-espaco="GONDOLA 1/PONTA-A"] .pr-quadrado');
  assert.match(await p.textContent('.mv-plano'), /Egeo Dolce/);
  assert.strictEqual(await p.locator('.pr-secao').count(), 0);
});

test('briefing das gôndolas e pirâmides: PDF com o planograma desenhado de cada móvel', { skip: !JSPDF_LOCAL && 'sem o jsPDF local (JSPDF_JS ou npm i jspdf)' }, async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo cheio');
  await abaPlanta(p, 'ER P').click();
  // Um espaço da gôndola e uma pirâmide desenhados (o mesmo que o editor grava).
  await p.evaluate(async () => {
    const C = { papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' };
    const salvar = (pedido) => new Promise((ok, falha) => google.script.run.withSuccessHandler(ok).withFailureHandler(falha).salvarPrateleiras(C, pedido));
    await salvar({
      acao: 'salvar', ciclo: 'Ciclo exemplo cheio', planta: 'ER P', espaco: 'GONDOLA 1/PONTA-A',
      prateleiras: [{ numero: 1, quadrados: [{ x: 0, w: 60, movimento: 'LÇTO EGEO', produtos: [{ sku: '48211', frentes: 3 }] }] }],
    });
    await salvar({
      acao: 'salvar', ciclo: 'Ciclo exemplo cheio', planta: 'ER P', espaco: 'PIRAMIDE 1/LADO-2',
      prateleiras: [{ numero: 4, quadrados: [{ x: 0, w: 100, produtos: [{ sku: '50110', frentes: 4 }] }] }],
    });
    await App.carregar({ ciclo: 'Ciclo exemplo cheio' });
  });
  await abaPlanta(p, 'ER P').click();
  await p.click('#btnBriefing');
  await p.waitForSelector('#dlgBriefing[open]');
  const naEr = await estado(p, () => App.estado.dados.plantas.find((x) => x.nome === 'ER P').moveis.filter((m) => m.tipo === 'PIRAMIDE').length);
  assert.match(await p.textContent('#briefingResumo'), new RegExp('1 gôndola e ' + naEr + ' pirâmide'));
  await p.check('input[name="briefingErs"][value="todas"]');
  const conta = (tipo) => p.evaluate((t) => App.estado.dados.plantas.reduce((s, x) => s + x.moveis.filter((m) => m.tipo === t).length, 0), tipo);
  const gondolas = await conta('GONDOLA');
  const piramides = await conta('PIRAMIDE');
  const n = gondolas + piramides;
  assert.match(await p.textContent('#briefingResumo'), new RegExp(gondolas + ' gôndolas e ' + piramides + ' pirâmides'));
  const d = await baixar(p, () => p.click('#briefingBaixar'));
  assert.match(d.nome, /^briefing-planogramas-Ciclo-exemplo-cheio\.pdf$/);
  assert.strictEqual(d.bytes.subarray(0, 5).toString(), '%PDF-');
  // Capa + uma página por gôndola (no mínimo).
  const paginas = (d.bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  assert.ok(paginas >= n + 1, paginas + ' páginas para ' + n + ' gôndolas e pirâmides');
  assert.match(await p.textContent('#toast'), new RegExp(gondolas + ' gôndolas e ' + piramides + ' pirâmides'));
});

test('antecipação: item do próximo ciclo num espaço, com a data e o símbolo ⏩', async (t) => {
  const p = await abrir(t);
  await escolherCiclo(p, 'Ciclo exemplo');
  await abaPlanta(p, 'ER P').click();
  await menuConfig(p, 'btnConstrucao');
  await p.waitForSelector('#dlgAcesso[open]');
  await p.fill('#acessoNome', 'Bia');
  await p.fill('#acessoSenha', SENHA.CONSTRUTOR);
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

  // Tela do móvel: o planograma já mostra o item antecipado no espaço (a data fica em Comunicações ER).
  await p.locator('#valCorpo .an-item .val-movel').first().click();
  await p.waitForSelector('#dlgMovel[open]');
  assert.match(await p.textContent('.mv-plano'), /LÇTO ANTECIPADO/);
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

test('dados corrompidos no navegador voltam ao começo (as plantas, sem ciclos)', async (t) => {
  const p = await abrir(t);
  await p.evaluate(() => localStorage.setItem('planoVarejo.planilhaLocal.v1', '{quebrado'));
  await p.reload();
  await p.waitForFunction(() => App.estado.dados && App.estado.dados.plantas.length === 4 && App.estado.dados.ciclos.length === 0);
});
