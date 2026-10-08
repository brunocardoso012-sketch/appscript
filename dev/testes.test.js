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
  assert.ok(d.movimentos['Ciclo exemplo'].TODAS['EXTRA-CESTINHAS']);
  assert.ok(d.movimentos['Ciclo exemplo']['01']['GONDOLA 1/LADO-A']);
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
      ['01', 'Ciclo exemplo', 'Pirâmide 1', 'BOT+QDB', '10/2026', '', ''],
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
  assert.deepEqual(Object.keys(d2.movimentos['Ciclo exemplo']['01']), ['PIRAMIDE 1'], 'par (ciclo, planta) substituído; ID sem acento');
  assert.equal(d2.movimentos['Ciclo exemplo']['01']['PIRAMIDE 1'].etiquetas[0].texto, '10/2026');
  assert.equal(Object.keys(d2.movimentos['Ciclo exemplo']['02']).length, 10, 'outras plantas intactas');
  assert.equal(d2.paineis['C15/2026'].TODAS[0].secao, 'TV');

  const aj = run("salvarAjustesEtiquetas('2', { 'PIRAMIDE 1': { x: 40.4, y: -12 } })");
  assert.equal(aj.atualizados, 1);
  const d3 = run('getDados()');
  const pir = d3.plantas.find((p) => p.id === '02').moveis.find((m) => m.id === 'PIRAMIDE 1');
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
  assert.equal(d.plantas.find((p) => p.id === '03').moveis.length, 31, 'outras plantas intactas');
  assert.ok(r.avisos.some((a) => /não existe no Layout/.test(a)) === false, 'sem avisos de movimentos (não importados)');
});

test('gôndola: espaços, divisão dos meios e IDs de espaço na planilha', () => {
  const { run } = carregarGas();
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'GONDOLA', dividido: '' })").map((e) => e.id), ['LADO-A', 'MEIO-A', 'MEIO-B', 'LADO-B']);
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'GONDOLA', dividido: 'A' })").map((e) => e.id), ['LADO-A', 'MEIO-A-1', 'MEIO-A-2', 'MEIO-B', 'LADO-B']);
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
    ['C1', '01', 'GON-01/LADO-A', 'BOT'],
    ['C1', '01', 'GON-01/MEIO-A-2', 'EUD'],
    ['C1', '01', 'GON-01/MEIO-A', 'EUD'],
  ], null)`);
  assert.equal(d.plantas[0].moveis[0].dividido, 'A');
  assert.deepEqual(d.avisos, [], 'meio inteiro e metades são sempre aceitos na gôndola');
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
    return atualizarModelosPlantas_({ layout: layout, movimentos: movimentos }, { '01': 11, '03': 7, '04': 8, _exemplo: 7 }); // só a 02 pendente
  })()`);
  assert.deepEqual(r.plantas, ['02']);
  assert.equal(r.versoes['02'], 10);
  const ids = (planta) => r.abas.layout.slice(1).filter((l) => l[0] === planta).map((l) => l[1]);
  assert.ok(!ids('02').includes('VELHO-01') && ids('02').includes('MESA DESTAQUE 1') && ids('02').includes('LOJA'), 'planta 02 com o modelo novo');
  assert.ok(ids('01').includes('MEU-01'), 'planta 01 intacta');
  const mov = r.abas.movimentos.slice(1).filter((l) => l[1] === '02');
  assert.ok(mov.some((l) => l[0] === 'Ciclo exemplo' && l[2] === 'GONDOLA 2/LADO-A'), 'exemplo da planta 02 atualizado');
  assert.ok(!mov.some((l) => l[0] === 'Ciclo exemplo' && l[2] === 'VELHO-01'));
  assert.ok(mov.some((l) => l[0] === 'C9'), 'outros ciclos da planta 02 intactos');
  const de_novo = run(`atualizarModelosPlantas_({ layout: valoresLayoutPadrao_(), movimentos: [] }, versoesAtuais_())`);
  assert.deepEqual(de_novo.plantas, [], 'não repete quando a versão já foi aplicada');
});

test('etiquetas guardam a coluna de origem; planta aceita o nome', () => {
  const { run } = carregarGas();
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Etiqueta 1', 'Etiqueta 2', 'Etiqueta 3', 'Etiqueta 4'],
    ['C1', 'ER P', 'balcão recepção 1', '', 'CANTO', '', ''],
    ['C1', 'ER P', 'pirâmide 1', 'A', '', '', 'D'],
  ], null)`);
  assert.deepEqual(d.avisos, []);
  const balcao = d.movimentos.C1['01']['BALCAO RECEPCAO 1'];
  assert.deepEqual(balcao.etiquetas.map((e) => [e.texto, e.posicao]), [['CANTO', 2]]);
  assert.deepEqual(d.movimentos.C1['01']['PIRAMIDE 1'].etiquetas.map((e) => e.posicao), [1, 4]);
  assert.deepEqual(d.config.etiquetasPorTipo, { VITRINE_L: 3 }, 'pirâmide mostra até 4');
  assert.deepEqual(d.config.etiquetasPorBloco, { GONDOLA: 4, MESA: 4, MESA_3: 4 });
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

test('ciclo de exemplo novo troca todas as linhas dele (e só dele)', () => {
  const { run } = carregarGas();
  const r = run(`atualizarModelosPlantas_({
    layout: valoresLayoutPadrao_(),
    movimentos: [colunasMovimentos_().map(function (c) { return c.titulo; }),
      ['Ciclo exemplo', 'TODAS', 'GON-01', '', 'BOT'], ['C9', '01', 'GONDOLA 1', '', 'EUD']],
    paineis: [colunasPaineis_().map(function (c) { return c.titulo; }),
      ['Ciclo exemplo', 'TODAS', 'CALLOUT', 'velho', 'BOT', 'PAR-02'], ['C9', 'TODAS', 'NOTA', 'minha nota', '', '']],
  }, { '01': 11, '02': 10, '03': 7, '04': 8, _exemplo: 1 })`);
  assert.deepEqual(r.plantas, ['exemplo']);
  assert.ok(!r.abas.movimentos.some((l) => l[2] === 'GON-01'), 'linha antiga do exemplo sai');
  assert.ok(r.abas.movimentos.some((l) => l[0] === 'C9'), 'outro ciclo fica');
  assert.ok(r.abas.movimentos.some((l) => l[0] === 'Ciclo exemplo' && l[2] === 'MOVEL MAKE 1/TESTEIRA-2'));
  assert.ok(!r.abas.paineis.some((l) => l[3] === 'velho'));
  assert.ok(r.abas.paineis.some((l) => l[3] === 'minha nota'));
  assert.equal(run("normId_('Móvel de  fila 3')"), 'MOVEL DE FILA 3');
});

test('blocos do balcão e das mesas; nomes antigos dos lados da gôndola', () => {
  const { run } = carregarGas();
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'VITRINE_L' })"), [], 'balcão: uma cor só');
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'MESA' })").map((e) => e.id), ['FRENTE-1', 'FRENTE-2']);
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'MESA_3' })").map((e) => e.id), ['FRENTE-1', 'FRENTE-2', 'FRENTE-3']);
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'TOTEM' })").map((e) => e.id), ['PAINEL-1', 'PAINEL-2', 'PAINEL-3']);
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Marca do Móvel'],
    ['C1', 'ER P', 'GONDOLA 1/PONTA-2', 'QDB'],
    ['C1', 'ER P', 'GONDOLA 1/MEIO-B-2', 'EUD'],
    ['C1', 'ER P', 'MESA DESTAQUE 1/FRENTE-2', 'BOT'],
  ], null)`);
  assert.deepEqual(d.avisos, []);
  assert.deepEqual(Object.keys(d.movimentos.C1['01']).sort(), ['GONDOLA 1/LADO-A', 'GONDOLA 1/MEIO-B-2', 'MESA DESTAQUE 1/FRENTE-2']);
});

test('painéis do totem aceitam cor e etiqueta próprias na planilha', () => {
  const { run } = carregarGas();
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Marca do Móvel', 'Etiqueta 1', 'Etiqueta 2', 'Etiqueta 3', 'Etiqueta 4'],
    ['C1', 'ER P', 'TOTEM 1/PAINEL-3', 'EUD', 'SIÀGE', '', '', ''],
    ['C1', 'ER P', 'TOTEM 1/PAINEL-4', 'BOT', '', '', '', ''],
    ['C1', 'ER P', 'GONDOLA 1/MEIO-A', 'BOT', 'A', 'B', 'C', 'D'],
  ], null)`);
  assert.deepEqual(d.avisos, ['Movimentos, linha 3: móvel "TOTEM 1/PAINEL-4" não existe no Layout da planta 01.']);
  assert.equal(d.movimentos.C1['01']['TOTEM 1/PAINEL-3'].marca, 'EUD');
  assert.equal(d.movimentos.C1['01']['GONDOLA 1/MEIO-A'].etiquetas.length, 4);
});

test('IDs de espaço aceitam variações de digitação', () => {
  const { run } = carregarGas();
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Marca do Móvel'],
    ['C1', 'ER P', 'Totem 1 / painel 1', 'OUI'],
    ['C1', 'ER P', 'TOTEM 1/PAINEL2', 'EUD'],
    ['C1', 'ER P', 'gôndola 1/lado a', 'QDB'],
    ['C1', 'ER P', 'GONDOLA 1/MEIO_A_2', 'BOT'],
    ['C1', 'ER P', 'MESA DESTAQUE 1/FRENTE 2', 'BOT'],
  ], null)`);
  assert.deepEqual(d.avisos, []);
  assert.deepEqual(Object.keys(d.movimentos.C1['01']).sort(),
    ['GONDOLA 1/LADO-A', 'GONDOLA 1/MEIO-A-2', 'MESA DESTAQUE 1/FRENTE-2', 'TOTEM 1/PAINEL-1', 'TOTEM 1/PAINEL-2']);
});

test('gôndola, mesas, totem e móvel make: linha do móvel inteiro é ignorada (só valem os espaços)', () => {
  const { run } = carregarGas();
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Marca do Móvel', 'Etiqueta 1'],
    ['C1', 'ER P', 'GONDOLA 1', 'BOT', 'X'],
    ['C1', 'ER P', 'TOTEM 1', 'BOT', 'Y'],
    ['C1', 'ER P', 'MESA DESTAQUE 1', 'EUD', ''],
    ['C1', 'ER P', 'MOVEL MAKE 1', 'QDB', ''],
    ['C1', 'ER P', 'GONDOLA 1/MEIO-B', 'BOT', 'Z'],
    ['C1', 'ER P', 'PIRAMIDE 1', 'EUD', 'P'],
  ], null)`);
  assert.equal(d.avisos.length, 4);
  assert.ok(d.avisos.every((a) => /linha do móvel inteiro ignorada/.test(a)));
  assert.match(d.avisos[0], /GONDOLA 1\/LADO-A/);
  assert.deepEqual(Object.keys(d.movimentos.C1['01']).sort(), ['GONDOLA 1/MEIO-B', 'PIRAMIDE 1']);
});
