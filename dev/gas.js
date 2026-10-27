/**
 * Carrega os arquivos .gs num contexto isolado do Node (como o Apps Script faz:
 * todos os arquivos compartilham o mesmo escopo global) e oferece uma planilha
 * em memória que imita o SpreadsheetApp — só o necessário para os testes.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src');
const ARQUIVOS_GS = ['Config.gs', 'Dados.gs', 'Code.gs', 'Layouts.gs', 'Validacao.gs', 'Rascunhos.gs', 'Antecipacoes.gs', 'Prateleiras.gs', 'Desenvolvedor.gs'];

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
  const aba = { grade: [], maxLinhas: 1000, maxColunas: 26, formatos: {}, filtro: null, congeladas: 0, validacoes: [] };
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
      // Como o Sheets: uma regra de validação que rejeita valores fora da lista barra a gravação.
      vals.forEach((l, i) => l.forEach((v, j) => {
        const lin = r + i;
        const col = c + j;
        const regra = aba.validacoes.find((x) => !x.permite && lin >= x.r && lin < x.r + x.nr && col >= x.c && col < x.c + x.nc);
        if (regra && !vazio(v) && regra.lista.indexOf(String(v)) < 0) {
          throw new Error('Os dados inseridos na célula ' + String.fromCharCode(64 + col) + lin + ' violam o respectivo conjunto de regras de validação de dados.');
        }
      }));
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
    setDataValidation(regra) {
      aba.validacoes = aba.validacoes.filter((x) => !(x.c >= c && x.c < c + nc));
      aba.validacoes.push(Object.assign({ r, c, nr, nc }, regra));
      return this;
    },
    clearDataValidations() {
      aba.validacoes = aba.validacoes.filter((x) => x.c + x.nc <= c || x.c >= c + nc || x.r + x.nr <= r || x.r >= r + nr);
      return this;
    },
    createFilter() { aba.filtro = { remove() { aba.filtro = null; } }; return aba.filtro; },
  });
  return encadeavel({
    _aba: aba,
    getName: () => nome,
    setName: (n) => { nome = n; },
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

function criarPlanilha(id) {
  const abas = [criarAba('Página1')];
  const codigo = id || 'TESTE';
  return encadeavel({
    getSheetByName: (n) => abas.find((a) => a.getName() === n) || null,
    insertSheet: (n) => { const a = criarAba(n); abas.push(a); return a; },
    getSheets: () => abas.slice(),
    deleteSheet: (a) => abas.splice(abas.indexOf(a), 1),
    getUrl: () => 'https://docs.google.com/spreadsheets/d/' + codigo + '/edit',
    getId: () => codigo,
    getName: () => 'Planilha ' + codigo,
  });
}

/** Globais do Apps Script com uma planilha em memória. */
function servicosFalsos(opcoes) {
  const op = Object.assign({ vinculada: true }, opcoes);
  const planilha = criarPlanilha();
  const propriedades = {};
  // Outras planilhas (ex.: a do layout, separada): create() cria uma nova; openById() abre pelo ID.
  // Sem planilha vinculada, o primeiro create() devolve a principal (é o "Configurar planilha").
  const outras = {};
  let principalCriada = op.vinculada;
  const construtor = () => encadeavel({ build: () => ({}) });
  // Regra de validação: guarda a lista e se aceita valores fora dela (setAllowInvalid).
  const validacao = () => {
    const regra = { lista: [], permite: true };
    const b = encadeavel({
      requireValueInList: (lista) => { regra.lista = lista.map(String); return b; },
      setAllowInvalid: (v) => { regra.permite = !!v; return b; },
      build: () => regra,
    });
    return b;
  };
  return {
    planilha,
    propriedades,
    outras,
    globais: {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => (op.vinculada ? planilha : null),
        create: () => {
          if (!principalCriada) { principalCriada = true; return planilha; }
          const id = 'EXTRA' + (Object.keys(outras).length + 1);
          outras[id] = criarPlanilha(id);
          return outras[id];
        },
        openById: (id) => {
          if (outras[id]) return outras[id];
          if (id === 'TESTE' || !String(id).startsWith('EXTRA')) return planilha;
          throw new Error('Planilha não encontrada: ' + id);
        },
        newConditionalFormatRule: construtor,
        newDataValidation: validacao,
      },
      LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k) => propriedades[k] || null,
          setProperty: (k, v) => { propriedades[k] = v; },
          deleteProperty: (k) => { delete propriedades[k]; },
        }),
      },
    },
  };
}

/**
 * Configura a planilha e grava nela os ciclos de exemplo de Layouts.gs ("Ciclo exemplo" e "Ciclo exemplo
 * cheio"), usados como dados dos testes. O app não grava mais esses ciclos.
 */
function configurarComExemplo(run) {
  const r = run('configurarPlanilha()');
  run(`(function () {
    const ss = planilha_();
    escreverAba_(ss, CONFIG.ABAS.MOVIMENTOS, colunasMovimentos_(), valoresMovimentosExemplo_());
    escreverAba_(ss, CONFIG.ABAS.PAINEIS, colunasPaineis_(), valoresPaineisExemplo_());
    escreverAba_(ss, CONFIG.ABAS.TIPOS, colunasTipos_(), valoresTiposExemplo_());
  })()`);
  return r;
}

module.exports = { carregarGas, servicosFalsos, configurarComExemplo, SRC };
