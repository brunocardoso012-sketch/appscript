/**
 * Testes da versão só de visualização (visualizador/apps-script/), gerada a partir de src/.
 * Rodar:  node --test dev/
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const { carregarGas, servicosFalsos } = require('./gas');
const { gerarCodigo, gerarIndex, gerarArquivoUnico, ARQUIVO_UNICO } = require('./build-visualizador');

/** Carrega o Codigo.gs gerado com uma planilha em memória (abas do ciclo de exemplo, se pedido). */
function carregarVisualizador(opcoes) {
  const op = Object.assign({ comAbas: true, vinculada: true, codigo: null }, opcoes);
  const falsos = servicosFalsos({ vinculada: op.vinculada });
  const abertas = [];
  falsos.globais.SpreadsheetApp.openById = (id) => { abertas.push(id); return falsos.planilha; };
  falsos.planilha.getName = () => 'Plano de Varejo';
  if (op.comAbas) {
    const { run } = carregarGas();
    [['Movimentos', run('valoresMovimentosExemplo_()')], ['Painéis', run('valoresPaineisExemplo_()')]].forEach(([nome, valores]) => {
      const aba = falsos.planilha.insertSheet(nome);
      aba.getRange(1, 1, valores.length, valores[0].length).setValues(valores);
    });
  }
  const ctx = vm.createContext(Object.assign({ console }, falsos.globais));
  vm.runInContext(op.codigo || gerarCodigo(), ctx, { filename: 'Codigo.gs' });
  const run = (expr) => {
    const v = vm.runInContext(expr, ctx);
    return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
  };
  return { run, falsos, abertas };
}

test('visualizador lê os ciclos da planilha vinculada, com o layout do código', () => {
  const { run } = carregarVisualizador();
  const d = run('getDados()');
  assert.equal(d.precisaConfigurar, false);
  assert.deepEqual(d.ciclos, ['Ciclo exemplo']);
  assert.deepEqual(d.avisos, []);
  assert.deepEqual(d.plantas.map((p) => p.nome), ['ER P', 'ER M', 'ER G', 'ER GG']);
  assert.ok(d.movimentos['Ciclo exemplo']['01']['GONDOLA 1/LADO-A']);
  assert.ok(d.paineis['Ciclo exemplo'].TODAS.some((p) => p.secao === 'CALLOUT'));
  assert.equal(d.planilhaUrl, 'https://docs.google.com/spreadsheets/d/TESTE');
});

test('visualizador sem planilha conectada ou sem a aba Movimentos pede configuração', () => {
  const semPlanilha = carregarVisualizador({ vinculada: false }).run('getDados()');
  assert.equal(semPlanilha.precisaConfigurar, true);
  assert.match(semPlanilha.mensagem, /VISUALIZADOR\.PLANILHA/);
  const semAba = carregarVisualizador({ comAbas: false }).run('getDados()');
  assert.equal(semAba.precisaConfigurar, true);
  assert.match(semAba.mensagem, /Movimentos/);
});

test('visualizador abre a planilha pelo link colado em VISUALIZADOR.PLANILHA', () => {
  const { run, abertas } = carregarVisualizador({ vinculada: false });
  run("VISUALIZADOR.PLANILHA = 'https://docs.google.com/spreadsheets/d/1AbC-d_9/edit#gid=0'");
  assert.deepEqual(run('getDados()').ciclos, ['Ciclo exemplo']);
  assert.deepEqual(abertas, ['1AbC-d_9']);
});

test('posições das etiquetas ficam nas propriedades do script, sem mexer na planilha', () => {
  const { run, falsos } = carregarVisualizador();
  const antes = JSON.stringify(falsos.planilha.getSheets().map((a) => a._aba.grade));
  assert.deepEqual(run("salvarAjustesEtiquetas('ER P', { 'Gôndola 1': { x: 12.4, y: -30 }, 'PIRAMIDE 1': { x: 5, y: 0 } })"), { atualizados: 2 });
  let g = run('getDados()').plantas[0].moveis.find((m) => m.id === 'GONDOLA 1');
  assert.deepEqual([g.ajusteX, g.ajusteY], [12, -30]);
  run("salvarAjustesEtiquetas('01', { 'GONDOLA 1': { x: 0, y: 0 } })"); // organizar automaticamente
  g = run('getDados()').plantas[0].moveis.find((m) => m.id === 'GONDOLA 1');
  assert.deepEqual([g.ajusteX, g.ajusteY], [0, 0]);
  assert.deepEqual(JSON.parse(falsos.propriedades.AJUSTES_ETIQUETAS_01), { 'PIRAMIDE 1': { x: 5, y: 0 } });
  run("salvarAjustesEtiquetas('01', { 'GONDOLA 1/LADO-A': { x: 7, y: 9 } })"); // uma pilha só
  g = run('getDados()').plantas[0].moveis.find((m) => m.id === 'GONDOLA 1');
  assert.deepEqual(JSON.parse(JSON.stringify(g.ajustesEspacos)), { 'LADO-A': { x: 7, y: 9 } });
  assert.deepEqual([g.ajusteX, g.ajusteY], [0, 0]);
  assert.equal(JSON.stringify(falsos.planilha.getSheets().map((a) => a._aba.grade)), antes);
});

test('Index.html do visualizador não tem Construir loja nem Baixar / Importar planilha', () => {
  const html = gerarIndex();
  ['btnModelo', 'btnImportar', 'btnConstruir', 'painelConstrutor', 'dlgModelo', 'dlgResultado', 'btnConfigurar']
    .forEach((id) => assert.ok(!html.includes('id="' + id + '"'), id + ' deveria ficar de fora'));
  ['btnPng', 'btnEditar', 'btnAtualizar', 'selCiclo', 'legenda', 'slide'].forEach((id) => assert.ok(html.includes('id="' + id + '"'), id));
  assert.ok(!/<\?/.test(html), 'sem tags de template do Apps Script');
  assert.ok(!/const Construtor =|const Planilha =/.test(html), 'sem os módulos de construção e planilha');
});

test('visualizador/apps-script está atualizado com src/ (rode npm run build:visualizador)', () => {
  const fs = require('fs');
  const path = require('path');
  const { DESTINO } = require('./build-visualizador');
  const ler = (n) => fs.readFileSync(path.join(DESTINO, n), 'utf8');
  assert.equal(ler('Codigo.gs'), gerarCodigo(), 'Codigo.gs desatualizado');
  assert.equal(ler('Index.html'), gerarIndex(), 'Index.html desatualizado');
});

test('visualizador: comentários da validação ficam na aba Comentários da planilha conectada', () => {
  const { run, falsos } = carregarVisualizador();
  const V = "{ papel: 'VALIDADOR', senha: '1234', nome: 'Ana' }";
  const l = run(`salvarComentario(${V}, { acao: 'novo', ciclo: 'Ciclo exemplo', planta: '02', texto: 'Rever a ER M' })`);
  assert.equal(l.length, 1);
  assert.ok(falsos.planilha.getSheetByName('Comentários'), 'aba criada');
  assert.equal(run(`getComentarios(${V})`)[0].texto, 'Rever a ER M');
});

test('arquivo único para o Apps Script: atualizado, serve a página embutida e lê a planilha', () => {
  const fs = require('fs');
  const unico = fs.readFileSync(ARQUIVO_UNICO, 'utf8');
  assert.equal(unico, gerarArquivoUnico(), 'Plano de Varejo - Apps Script.gs desatualizado (rode npm run build:visualizador)');
  assert.ok(!unico.includes('createHtmlOutputFromFile'), 'não depende do arquivo Index.html');
  const { run } = carregarVisualizador({ codigo: unico });
  // HtmlService de mentira: guarda a página que o doGet entrega.
  run('HtmlService = { createHtmlOutput: (html) => { globalThis.__pagina = html; const o = { setTitle: () => o, addMetaTag: () => o }; return o; } }');
  run('doGet()');
  assert.equal(run('globalThis.__pagina'), gerarIndex(), 'a página servida é o Index.html do visualizador');
  assert.deepEqual(run('getDados()').ciclos, ['Ciclo exemplo']);
});
