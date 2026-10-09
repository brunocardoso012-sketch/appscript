/**
 * Carrega os arquivos .gs num contexto isolado do Node (como o Apps Script faz:
 * todos os arquivos compartilham o mesmo escopo global) e oferece uma planilha
 * em memória que imita o SpreadsheetApp — só o necessário para os testes.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src');
const ARQUIVOS_GS = ['Config.gs', 'Dados.gs', 'Code.gs', 'Layouts.gs', 'Validacao.gs'];

function carregarGas(globais) {
  const ctx = vm.createContext(Object.assign({ console }, globais));
  const codigo = ARQUIVOS_GS.map((f) => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n;\n');
  vm.runInContext(codigo, ctx, { filename: 'apps-script.js' });
  // Resultados passam por JSON para virarem objetos "normais" do Node (outro contexto de execução).
  const run = (expr) => {
    const v = vm.runInContext(expr, ctx);
    return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
  };
  return { ctx, run };
}

/** Objeto em que qualquer método desconhecido devolve ele mesmo (formatação encadeada). */
function encadeavel(alvo) {
  return new Proxy(alvo, { get: (t, k) => (k in t ? t[k] : () => encadeavel(t)) });
}

function criarAba(nome) {
  const aba = { grade: [], maxLinhas: 1000, maxColunas: 26, formatos: {}, filtro: null, congeladas: 0 };
  const vazio = (v) => v === '' || v === null || v === undefined;
  const ultimaLinha = () => {
    for (let r = aba.grade.length - 1; r >= 0; r--) if ((aba.grade[r] || []).some((v) => !vazio(v))) return r + 1;
    return 0;
  };
  const ultimaColuna = () => Math.max(0, ...aba.grade.map((l) => {
    for (let c = (l || []).length - 1; c >= 0; c--) if (!vazio(l[c])) return c + 1;
    return 0;
  }));
  const range = (r, c, nr, nc) => encadeavel({
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => {
      const v = (aba.grade[r - 1 + i] || [])[c - 1 + j];
      return vazio(v) ? '' : v;
    })),
    getDisplayValues() { return this.getValues().map((l) => l.map(String)); },
    setValues(vals) {
      if (vals.length !== nr || vals.some((l) => l.length !== nc)) {
        throw new Error('setValues: dimensões ' + vals.length + 'x' + vals[0].length + ' != ' + nr + 'x' + nc);
      }
      vals.forEach((l, i) => l.forEach((v, j) => {
        const lin = r - 1 + i;
        aba.grade[lin] = aba.grade[lin] || [];
        // Imita a conversão automática do Sheets ("01" → 1) quando a coluna não está como texto.
        const texto = aba.formatos[c + j] === '@';
        aba.grade[lin][c - 1 + j] = !texto && typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
      }));
      return this;
    },
    setValue(v) { return this.setValues([[v]]); },
    setNumberFormat(f) { for (let j = 0; j < nc; j++) aba.formatos[c + j] = f; return this; },
    createFilter() { aba.filtro = { remove() { aba.filtro = null; } }; return aba.filtro; },
  });
  return encadeavel({
    _aba: aba,
    getName: () => nome,
    getLastRow: ultimaLinha,
    getMaxRows: () => aba.maxLinhas,
    getMaxColumns: () => aba.maxColunas,
    insertRowsAfter: (_, n) => { aba.maxLinhas += n; },
    insertColumnsAfter: (_, n) => { aba.maxColunas += n; },
    clearContents: () => { aba.grade = []; },
    getRange: (r, c, nr, nc) => range(r, c, nr || 1, nc || 1),
    getDataRange: () => range(1, 1, Math.max(1, ultimaLinha()), Math.max(1, ultimaColuna())),
    getFilter: () => aba.filtro,
    setFrozenColumns: (n) => { aba.congeladas = n; },
  });
}

function criarPlanilha() {
  const abas = [criarAba('Página1')];
  return encadeavel({
    getSheetByName: (n) => abas.find((a) => a.getName() === n) || null,
    insertSheet: (n) => { const a = criarAba(n); abas.push(a); return a; },
    getSheets: () => abas.slice(),
    deleteSheet: (a) => abas.splice(abas.indexOf(a), 1),
    getUrl: () => 'https://docs.google.com/spreadsheets/d/TESTE',
    getId: () => 'TESTE',
  });
}

/** Globais do Apps Script com uma planilha em memória. */
function servicosFalsos(opcoes) {
  const op = Object.assign({ vinculada: true }, opcoes);
  const planilha = criarPlanilha();
  const propriedades = {};
  const construtor = () => encadeavel({ build: () => ({}) });
  return {
    planilha,
    propriedades,
    globais: {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => (op.vinculada ? planilha : null),
        create: () => planilha,
        openById: () => planilha,
        newConditionalFormatRule: construtor,
        newDataValidation: construtor,
      },
      LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k) => propriedades[k] || null,
          setProperty: (k, v) => { propriedades[k] = v; },
        }),
      },
    },
  };
}

module.exports = { carregarGas, servicosFalsos, SRC };
