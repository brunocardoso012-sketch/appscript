/**
 * Testes dos arquivos de instalação (instalacao/), gerados a partir de src/.
 * Rodar:  node --test dev/
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const { servicosFalsos, carregarGas } = require('./gas');
const { gerarCompleto, gerarPaginaCompleta, ARQUIVOS } = require('./build-instalacao');

function carregar(codigo, falsos) {
  const ctx = vm.createContext(Object.assign({ console }, falsos.globais));
  vm.runInContext(codigo, ctx, { filename: 'Codigo.gs' });
  return (expr) => {
    const v = vm.runInContext(expr, ctx);
    return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
  };
}

test('instalacao/ está atualizada com src/ (rode npm run build:instalacao)', () => {
  assert.equal(fs.readFileSync(ARQUIVOS.completo, 'utf8'), gerarCompleto(), 'App completo desatualizado');
  assert.equal(fs.readFileSync(ARQUIVOS.manifesto, 'utf8'), fs.readFileSync(require('path').join(__dirname, '..', 'src', 'appsscript.json'), 'utf8'));
});

test('app completo em arquivo único: serve a página embutida, sem Index.html nem include', () => {
  const codigo = gerarCompleto();
  assert.ok(!/createTemplateFromFile|createHtmlOutputFromFile\('Index'\)/.test(codigo), 'não depende do Index.html');
  const pagina = gerarPaginaCompleta();
  ['const Construtor', 'const Planilha', 'const Estrategia', 'const Tutorial', 'const Analytics', 'const App', 'const Desenvolvedor', 'id="btnConstruir"', 'id="dlgDev"', 'id="btnAnalytics"']
    .forEach((x) => assert.ok(pagina.includes(x), x));
  const falsos = servicosFalsos({ vinculada: true });
  const run = carregar(codigo, falsos);
  run('HtmlService = { createHtmlOutput: (html) => { globalThis.__pagina = html; const o = { setTitle: () => o, addMetaTag: () => o, setWidth: () => o, setHeight: () => o }; return o; } }');
  run('doGet()');
  assert.equal(run('globalThis.__pagina'), pagina);
  run('configurarPlanilha()');
  assert.ok(run('getDados()').tiposMovimento['Ciclo exemplo'], 'cria a aba Tipos de movimento');
});

test('atualização numa planilha que já existe: ganha a aba Tipos de movimento e mantém os ciclos do usuário', () => {
  // Planilha "antiga": Layout, Movimentos e Painéis com um ciclo próprio, sem a aba Tipos de movimento,
  // e o script com as versões de antes desta atualização (exemplo 8).
  const falsos = servicosFalsos({ vinculada: true });
  const { run: base } = carregarGas();
  const abas = { Layout: base('valoresLayoutPadrao_()'), Movimentos: base('valoresMovimentosExemplo_()'), 'Painéis': base('valoresPaineisExemplo_()') };
  const linha = ['C15/2026', '01', 'PIRAMIDE 1', 'Pirâmide 1', 'BOT', 'MEU MOVIMENTO', 'BOT'];
  abas.Movimentos.push(linha.concat(Array(abas.Movimentos[0].length - linha.length).fill('')));
  Object.keys(abas).forEach((nome) => {
    const aba = falsos.planilha.insertSheet(nome);
    aba.getRange(1, 1, abas[nome].length, abas[nome][0].length).setValues(abas[nome]);
  });
  const versoes = base('versoesAtuais_()');
  versoes._exemplo = 8;
  falsos.propriedades.VERSOES_MODELO_PLANTAS = JSON.stringify(versoes);
  const run = carregar(gerarCompleto(), falsos);
  const d = run('getDados()');
  assert.ok(falsos.planilha.getSheetByName('Tipos de movimento'), 'aba criada na primeira abertura');
  assert.equal(d.movimentos['C15/2026']['01']['PIRAMIDE 1'].etiquetas[0].texto, 'MEU MOVIMENTO', 'ciclo do usuário intacto');
  assert.deepEqual(d.ciclos.sort(), ['C15/2026', 'Ciclo exemplo', 'Ciclo exemplo cheio']);
});
