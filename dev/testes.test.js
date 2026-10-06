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
  assert.equal(run("normPlanta_('ER P')"), '01');
  assert.equal(run("normPlanta_('er gg')"), '04');
  assert.equal(run("normPlanta_('Planta ER M')"), '02');
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
  assert.deepEqual(d.plantas.map((p) => p.nome), ['ER P', 'ER M', 'ER G', 'ER GG']);
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
  assert.equal(Object.keys(d2.movimentos['Ciclo exemplo']['02']).length, 11, 'outras plantas intactas');
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

test('importar aba Layout substitui só as plantas presentes e mantém números', () => {
  const f = servicosFalsos();
  const { ctx, run } = carregarGas(f.globais);
  run('configurarPlanilha()');
  ctx.__layout = {
    layout: [
      ['Planta', 'ID Móvel', 'Tipo', 'X', 'Y', 'Largura (eixo X)', 'Profundidade (eixo Y)', 'Altura'],
      ['02', 'LOJA', 'LOJA', 0, 0, 30, 25, 5],
      ['02', 'PIR-01', 'PIRAMIDE', 3, 15, 1.7, 1.7, 3.6],
    ],
  };
  const r = run('importarPlanilha(__layout)');
  assert.equal(r.layout, 2);
  const d = run('getDados()');
  const p2 = d.plantas.find((p) => p.id === '02');
  assert.deepEqual(p2.loja, { largura: 30, profundidade: 25, alturaParede: 5 });
  assert.equal(p2.moveis.length, 1);
  assert.equal(p2.moveis[0].x, 3);
  assert.equal(d.plantas.find((p) => p.id === '03').moveis.length, 39, 'outras plantas intactas');
  assert.ok(r.avisos.some((a) => /não existe no Layout/.test(a)) === false, 'sem avisos de movimentos (não importados)');
});

test('gôndola: espaços, divisão dos meios e IDs de espaço na planilha', () => {
  const { run } = carregarGas();
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'GONDOLA', dividido: '' })").map((e) => e.id), ['PONTA-1', 'MEIO-A', 'MEIO-B', 'PONTA-2']);
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'GONDOLA', dividido: 'A' })").map((e) => e.id), ['PONTA-1', 'MEIO-A-1', 'MEIO-A-2', 'MEIO-B', 'PONTA-2']);
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'PIRAMIDE' })"), []);
  assert.equal(run("normDivisao_('a e b')"), 'AB');
  assert.equal(run("normDivisao_('sim')"), 'AB');
  assert.equal(run("normDivisao_('não')"), '');
  const d = run(`montarDados_([
    ['Planta', 'ID Móvel', 'Tipo', 'X', 'Y', 'Largura (eixo X)', 'Profundidade (eixo Y)', 'Altura', 'Meios divididos'],
    ['01', 'LOJA', 'LOJA', 0, 0, 20, 20, 4],
    ['01', 'GON-01', 'GONDOLA', 5, 5, 4, 1.6, 3, 'A'],
  ], [
    ['Ciclo', 'Planta', 'ID Móvel', 'Marca do Móvel'],
    ['C1', '01', 'GON-01', 'BOT'],
    ['C1', '01', 'GON-01/MEIO-A-2', 'EUD'],
    ['C1', '01', 'GON-01/MEIO-A', 'EUD'],
  ], null)`);
  assert.equal(d.plantas[0].moveis[0].dividido, 'A');
  assert.equal(d.avisos.length, 1, 'só MEIO-A (inexistente com o meio dividido) gera aviso: ' + d.avisos);
  assert.match(d.avisos[0], /GON-01\/MEIO-A"/);
  const linhas = run(`objetosLayoutDaPlanta_('01', { loja: { largura: 10, profundidade: 10, alturaParede: 4 }, moveis: [
    { id: 'gon-02', tipo: 'GONDOLA', x: 1, y: 1, w: 4, d: 1.6, h: 3, dividido: 'b' },
    { id: 'PIR-01', tipo: 'PIRAMIDE', x: 1, y: 4, w: 1.7, d: 1.7, h: 3.6, dividido: 'AB' },
  ] })`);
  assert.equal(linhas[1].dividido, 'B');
  assert.equal(linhas[2].dividido, '', 'divisão só vale para gôndola');
});

test('modelo base novo de uma planta substitui só aquela planta (e o exemplo dela)', () => {
  const { run } = carregarGas();
  const r = run(`(function () {
    const layout = valoresLayoutPadrao_().filter(function (l, i) { return i === 0 || l[0] !== '02'; });
    layout.push(['02', 'VELHO-01', 'Móvel antigo', 'GONDOLA', 1, 1, 0, 2, 1, 2, 0, 0, '']);
    layout.push(['01', 'MEU-01', 'Meu móvel', 'PIRAMIDE', 3, 3, 0, 1, 1, 2, 0, 0, '']);
    const movimentos = valoresMovimentosExemplo_().filter(function (l, i) { return i === 0 || l[1] !== '02'; });
    movimentos.push(['Ciclo exemplo', '02', 'VELHO-01', '', 'BOT']);
    movimentos.push(['C9', '02', 'VELHO-01', '', 'EUD']);
    return atualizarModelosPlantas_({ layout: layout, movimentos: movimentos }, { '01': 6, '03': 2, '04': 2 }); // só a 02 pendente
  })()`);
  assert.deepEqual(r.plantas, ['02']);
  assert.equal(r.versoes['02'], 5);
  const ids = (planta) => r.abas.layout.slice(1).filter((l) => l[0] === planta).map((l) => l[1]);
  assert.ok(!ids('02').includes('VELHO-01') && ids('02').includes('MESA-01') && ids('02').includes('LOJA'), 'planta 02 com o modelo novo');
  assert.ok(ids('01').includes('MEU-01'), 'planta 01 intacta');
  const mov = r.abas.movimentos.slice(1).filter((l) => l[1] === '02');
  assert.ok(mov.some((l) => l[0] === 'Ciclo exemplo' && l[2] === 'MESA-01'), 'exemplo da planta 02 atualizado');
  assert.ok(!mov.some((l) => l[0] === 'Ciclo exemplo' && l[2] === 'VELHO-01'));
  assert.ok(mov.some((l) => l[0] === 'C9'), 'outros ciclos da planta 02 intactos');
  const de_novo = run(`atualizarModelosPlantas_({ layout: valoresLayoutPadrao_(), movimentos: [] }, VERSAO_MODELO_PLANTAS)`);
  assert.deepEqual(de_novo.plantas, [], 'não repete quando a versão já foi aplicada');
});

test('etiquetas guardam a coluna de origem; planta aceita o nome', () => {
  const { run } = carregarGas();
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Etiqueta 1', 'Etiqueta 2', 'Etiqueta 3', 'Etiqueta 4'],
    ['C1', 'ER P', 'GON-01', '', 'MEIO A', '', 'PONTA 2'],
  ], null)`);
  assert.deepEqual(d.avisos, []);
  const gon = d.movimentos.C1['01']['GON-01'];
  assert.deepEqual(gon.etiquetas.map((e) => [e.texto, e.posicao]), [['MEIO A', 2], ['PONTA 2', 4]]);
  assert.deepEqual(d.config.etiquetasPorTipo, { PIRAMIDE: 1, MESA: 1, GONDOLA: 4 });
});

test('giro do balcão e testeiras do móvel make', () => {
  const { run } = carregarGas();
  assert.equal(run("normGiro_('90')"), 90);
  assert.equal(run('normGiro_(-90)'), 270);
  assert.equal(run('normGiro_(360)'), 0);
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'MAKE' })").map((e) => e.id), ['TESTEIRA-1', 'TESTEIRA-2', 'TESTEIRA-3', 'TESTEIRA-4']);
  const d = run(`montarDados_([
    ['Planta', 'ID Móvel', 'Tipo', 'X', 'Y', 'Largura (eixo X)', 'Profundidade (eixo Y)', 'Altura', 'Giro (graus)'],
    ['01', 'LOJA', 'LOJA', 0, 0, 20, 20, 4],
    ['01', 'BALCAO-01', 'VITRINE_L', 5, 5, 2.4, 2.4, 1.92, 180],
    ['01', 'MAKE-01', 'MAKE', 0, 0, 6, 1.4, 3.2],
  ], [
    ['Ciclo', 'Planta', 'ID Móvel', 'Marca do Móvel'],
    ['C1', '01', 'MAKE-01/TESTEIRA-3', 'QDB'],
  ], null)`);
  assert.deepEqual(d.avisos, []);
  assert.equal(d.plantas[0].moveis[0].giro, 180);
  const linhas = run(`objetosLayoutDaPlanta_('01', { loja: { largura: 10, profundidade: 10, alturaParede: 4 }, moveis: [
    { id: 'BALCAO-01', tipo: 'VITRINE_L', x: 1, y: 1, w: 2, d: 2, h: 2, giro: 270 },
  ] })`);
  assert.equal(linhas[1].giro, 270);
});
