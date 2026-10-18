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
  await pagina.goto(INDEX);
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
  const chip = p.locator('#legenda button', { hasText: 'Boticário' }).first();
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
  await menuConfig(p, 'btnTema');
  assert.strictEqual(await tema(), 'escuro');
  assert.notStrictEqual(await fundo(), claro);
  assert.notStrictEqual(await fundoPlanta(), plantaClara);
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
  await menuConfig(p, 'btnTema');
  assert.strictEqual(await tema(), 'claro');
  assert.strictEqual(await fundo(), claro);
  assert.strictEqual(await fundoPlanta(), plantaClara);
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
