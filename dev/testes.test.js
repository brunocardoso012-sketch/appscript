/**
 * Testes do backend (Code.gs) sem precisar do Apps Script.
 * Rodar:  node --test dev/
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { carregarGas, servicosFalsos } = require('./gas');

test('normalizações', () => {
  const { run } = carregarGas();
  assert.equal(run('normPlanta_(1)'), '01');
  assert.equal(run("normPlanta_('Planta 3')"), '03');
  assert.equal(run("normPlanta_('todas')"), 'TODAS');
  assert.equal(run("normPlanta_('*')"), 'TODAS');
  assert.equal(run("normMarca_('Boticário')"), 'BOT');
  assert.equal(run("normMarca_('bot + qdb')"), 'BOT+QDB');
  assert.equal(run("normMarca_('#ff8800')"), '#FF8800');
  assert.equal(run("normMarca_('Quem disse, berenice?')"), 'QDB');
  assert.equal(run("normSimbolo_('▶')"), 'MOVIMENTO');
  assert.equal(run("normSimbolo_('e')"), 'EXPOSICAO');
  assert.equal(run("normSecao_('TV/Rádio')"), 'TV');
  assert.equal(run("numero_('1,5')"), 1.5);
  assert.equal(run("numero_('2.25')"), 2.25);
});

test('layout padrão + ciclo de exemplo são lidos sem avisos', () => {
  const { run } = carregarGas();
  const d = run('montarDados_(valoresLayoutPadrao_(), valoresMovimentosExemplo_(), valoresPaineisExemplo_())');
  assert.deepEqual(d.plantas.map((p) => p.id), ['01', '02', '03', '04']);
  assert.deepEqual(d.ciclos, ['Ciclo exemplo']);
  assert.deepEqual(d.avisos, []);
  assert.ok(d.movimentos['Ciclo exemplo'].TODAS['PE-01']);
});

test('avisos para marca desconhecida e móvel inexistente', () => {
  const { run } = carregarGas();
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Marca do Móvel'],
    ['C1', '01', 'PE-01', 'Natura'],
    ['C1', '01', 'NAO-EXISTE', 'BOT'],
  ], null)`);
  assert.ok(d.avisos.some((a) => /Natura/.test(a)));
  assert.ok(d.avisos.some((a) => /NAO-EXISTE/.test(a)));
});

test('configurar → importar → salvar ajustes (planilha vinculada)', () => {
  const f = servicosFalsos({ vinculada: true });
  const { ctx, run } = carregarGas(f.globais);

  const conf = run('configurarPlanilha()');
  assert.deepEqual(Array.from(conf.criadas), ['Layout', 'Movimentos', 'Painéis']);
  assert.ok(f.planilha.getSheetByName('Página1'), 'aba do usuário é mantida');
  assert.equal(f.planilha.getSheetByName('Movimentos')._aba.congeladas, 3);
  assert.equal(run('configurarPlanilha()').criadas.length, 0, 'não sobrescreve abas existentes');

  const d1 = run('getDados()');
  assert.equal(d1.precisaConfigurar, false);
  assert.deepEqual(Array.from(d1.avisos), []);
  assert.ok(d1.movimentos['Ciclo exemplo']['01'], 'planta "01" continua texto');

  ctx.__payload = {
    movimentos: [
      ['Planta', 'Ciclo', 'ID Móvel', 'Marca do Móvel', 'Etiqueta 1', 'Marca Etiqueta 1', 'Símbolo'],
      ['2', 'C15/2026', 'ilha-01', 'Eudora', 'OUTLET EUD', 'EUD', '▶'],
      ['01', 'Ciclo exemplo', 'PIR-01', 'BOT+QDB', '10/2026', '', ''],
      ['', '', '', '', '', '', ''],
    ],
    paineis: [
      ['Ciclo', 'Planta', 'Seção', 'Texto', 'Marca', 'Aponta para (ID Móvel)'],
      ['C15/2026', 'TODAS', 'tv/rádio', 'GRADE NOVA', 'MULTI', ''],
    ],
  };
  const r = run('importarPlanilha(__payload)');
  assert.equal(r.movimentos, 2);
  assert.equal(r.paineis, 1);

  const d2 = run('getDados()');
  assert.deepEqual(Array.from(d2.ciclos), ['Ciclo exemplo', 'C15/2026']);
  const ilha = d2.movimentos['C15/2026']['02']['ILHA-01'];
  assert.equal(ilha.marca, 'EUD');
  assert.equal(ilha.simbolo, 'MOVIMENTO');
  assert.deepEqual(Object.keys(d2.movimentos['Ciclo exemplo']['01']), ['PIR-01'], 'par (ciclo, planta) substituído');
  assert.equal(d2.movimentos['Ciclo exemplo']['01']['PIR-01'].etiquetas[0].texto, '10/2026');
  assert.equal(Object.keys(d2.movimentos['Ciclo exemplo']['02']).length, 8, 'outras plantas intactas');
  assert.equal(d2.paineis['C15/2026'].TODAS[0].secao, 'TV');

  const aj = run("salvarAjustesEtiquetas('2', { 'PIR-01': { x: 40.4, y: -12 } })");
  assert.equal(aj.atualizados, 1);
  const d3 = run('getDados()');
  const pir = d3.plantas.find((p) => p.id === '02').moveis.find((m) => m.id === 'PIR-01');
  assert.equal(pir.ajusteX, 40);
  assert.equal(pir.ajusteY, -12);
});

test('importação com colunas obrigatórias faltando dá erro claro', () => {
  const f = servicosFalsos();
  const { ctx, run } = carregarGas(f.globais);
  run('configurarPlanilha()');
  ctx.__ruim = { movimentos: [['Ciclo', 'Planta', 'Etiqueta 1'], ['C1', '01', 'x']] };
  assert.throws(() => run('importarPlanilha(__ruim)'), /ID Móvel/);
  assert.throws(() => run('importarPlanilha({})'), /Movimentos/);
});

test('modo standalone cria a planilha e guarda o ID', () => {
  const f = servicosFalsos({ vinculada: false });
  const { run } = carregarGas(f.globais);
  assert.equal(run('getDados()').precisaConfigurar, true);
  run('configurarPlanilha()');
  assert.equal(f.propriedades.SPREADSHEET_ID, 'TESTE');
  assert.deepEqual(f.planilha.getSheets().map((s) => s.getName()), ['Layout', 'Movimentos', 'Painéis']);
  assert.equal(run('getDados()').plantas.length, 4);
});
