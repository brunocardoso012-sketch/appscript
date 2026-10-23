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
  assert.equal(run("normSimbolo_('▶')"), '', 'o antigo símbolo movimento saiu (sem aviso)');
  assert.equal(run("normSimbolo_('🔒')"), 'FIXO');
  assert.equal(run("normSimbolo_('cadeado')"), 'FIXO');
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
  assert.deepEqual(d.ciclos, ['Ciclo exemplo', 'Ciclo exemplo cheio']);
  assert.deepEqual(d.avisos, []);
  assert.ok(d.movimentos['Ciclo exemplo'].TODAS['EXTRA-CESTINHAS']);
  assert.ok(d.movimentos['Ciclo exemplo']['01']['GONDOLA 1/PONTA-A']);
});

test('aba Inventario: lojas por móvel ou espaço, total da rede e leitura sem acento', () => {
  const { run } = carregarGas();
  const inv = run(`inventarioDeValores_([
    ['ID Móvel', 'Lojas'],
    ['Gôndola 1', 1000],
    ['gondola 1 / ponta b', '900'],
    ['PIRAMIDE 1', '1.000'],
    ['', 5],
    ['GONDOLA 3', 'x'],
  ])`);
  assert.deepEqual(inv.lojas, { 'GONDOLA 1': 1000, 'GONDOLA 1/PONTA-B': 900, 'PIRAMIDE 1': 1000 });
  assert.equal(inv.total, 1000, 'sem linha TOTAL: o maior número da aba');
  assert.equal(run("inventarioDeValores_([['Lojas', 'Móvel'], [350, 'GONDOLA 2'], [1200, 'Total']]).total"), 1200, 'linha TOTAL e colunas pelo nome');
  assert.equal(run('inventarioDeValores_(null)'), null);
  assert.equal(run("inventarioDeValores_([['ID Móvel', 'Lojas']])"), null);

  const f = servicosFalsos({ vinculada: true });
  const { run: run2 } = carregarGas(f.globais);
  run2('configurarPlanilha()');
  assert.equal(run2('getDados()').inventario, null, 'sem a aba, sem inventário');
  f.planilha.insertSheet('Inventário').getRange(1, 1, 3, 2).setValues([['ID Móvel', 'Lojas'], ['GONDOLA 1', 1000], ['GONDOLA 2', 650]]);
  assert.deepEqual(run2('getDados()').inventario, { lojas: { 'GONDOLA 1': 1000, 'GONDOLA 2': 650 }, total: 1000 });
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
  assert.deepEqual(Array.from(conf.criadas), ['Layout', 'Movimentos', 'Painéis', 'Tipos de movimento']);
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
      ['2', 'C15/2026', 'ilha-01', 'Eudora', 'OUTLET EUD', 'EUD', '🔒'],
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
  assert.deepEqual(Array.from(d2.ciclos), ['Ciclo exemplo', 'Ciclo exemplo cheio', 'C15/2026']);
  const ilha = d2.movimentos['C15/2026']['02']['ILHA-01'];
  assert.equal(ilha.marca, 'EUD');
  assert.equal(ilha.simbolo, 'FIXO');
  assert.deepEqual(Object.keys(d2.movimentos['Ciclo exemplo']['01']), ['PIRAMIDE 1'], 'par (ciclo, planta) substituído; ID sem acento');
  assert.equal(d2.movimentos['Ciclo exemplo']['01']['PIRAMIDE 1'].etiquetas[0].texto, '10/2026');
  assert.equal(Object.keys(d2.movimentos['Ciclo exemplo']['02']).length, 11, 'outras plantas intactas');
  assert.equal(d2.paineis['C15/2026'].TODAS[0].secao, 'TV');

  const aj = run("salvarAjustesEtiquetas('2', { 'PIRAMIDE 1': { x: 40.4, y: -12 } })");
  assert.equal(aj.atualizados, 1);
  const d3 = run('getDados()');
  const pir = d3.plantas.find((p) => p.id === '02').moveis.find((m) => m.id === 'PIRAMIDE 1');
  assert.equal(pir.ajusteX, 40);
  assert.equal(pir.ajusteY, -12);

  // Cada pilha da gôndola se move sozinha (por cima do ajuste do móvel inteiro).
  run("salvarAjustesEtiquetas('01', { 'GONDOLA 1/PONTA-A': { x: 15, y: -8 }, 'gondola 1/meio-b+ponta-b': { x: -20, y: 30 } })");
  let g1 = run('getDados()').plantas.find((p) => p.id === '01').moveis.find((m) => m.id === 'GONDOLA 1');
  assert.deepEqual([g1.ajusteX, g1.ajusteY], [0, 0], 'ajuste do móvel inteiro não muda');
  const esp = JSON.parse(JSON.stringify(g1.ajustesEspacos));
  assert.deepEqual([esp['PONTA-A'], esp['MEIO-B+PONTA-B']], [{ x: 15, y: -8 }, { x: -20, y: 30 }]);
  run("salvarAjustesEtiquetas('01', { 'GONDOLA 1': { x: 0, y: 0 }, 'GONDOLA 1/PONTA-A': { x: 0, y: 0 } })"); // organizar
  g1 = run('getDados()').plantas.find((p) => p.id === '01').moveis.find((m) => m.id === 'GONDOLA 1');
  const esp2 = JSON.parse(JSON.stringify(g1.ajustesEspacos));
  assert.ok(!esp2['PONTA-A'], 'pilha zerada volta ao automático');
  assert.deepEqual(esp2['MEIO-B+PONTA-B'], { x: -20, y: 30 });
});

test('ajuste das pilhas por espaço: texto da planilha ↔ objeto', () => {
  const { run } = carregarGas();
  assert.deepEqual(JSON.parse(JSON.stringify(run("lerAjustesEspacos_('ponta-a: 10, -5; MEIO-B + PONTA-B = -3,5 ; FRENTE-1: 0, 0; lixo')"))),
    { 'PONTA-A': { x: 10, y: -5 }, 'MEIO-B+PONTA-B': { x: -3, y: 5 } });
  assert.equal(run("textoAjustesEspacos_({ 'MEIO-A': { x: 1, y: 2 }, 'PONTA-A': { x: -4, y: 0 }, 'PONTA-B': { x: 0, y: 0 } })"),
    'MEIO-A: 1, 2; PONTA-A: -4, 0');
  // Nomes antigos das pontas (Lado A / Lado B) viram Ponta A / Ponta B, também dentro de uma pilha.
  assert.deepEqual(JSON.parse(JSON.stringify(run("lerAjustesEspacos_('LADO-A: 1, 2; MEIO-B+LADO-B: 3, 4')"))),
    { 'PONTA-A': { x: 1, y: 2 }, 'MEIO-B+PONTA-B': { x: 3, y: 4 } });
  assert.deepEqual(JSON.parse(JSON.stringify(run("lerAjustesEspacos_('')"))), {});
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
  assert.deepEqual(f.planilha.getSheets().map((s) => s.getName()), ['Layout', 'Movimentos', 'Painéis', 'Tipos de movimento']);
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
  assert.deepEqual(p2.loja, { largura: 30, profundidade: 25, alturaParede: 5, escalaEtiquetas: 100, slide: 0 });
  assert.equal(p2.moveis.length, 1);
  assert.equal(p2.moveis[0].x, 3);
  assert.equal(d.plantas.find((p) => p.id === '03').moveis.length, 31, 'outras plantas intactas');
  assert.ok(r.avisos.some((a) => /não existe no Layout/.test(a)) === false, 'sem avisos de movimentos (não importados)');
});

test('gôndola: espaços, divisão dos meios e IDs de espaço na planilha', () => {
  const { run } = carregarGas();
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'GONDOLA', dividido: '' })").map((e) => e.id), ['PONTA-A', 'MEIO-A', 'MEIO-B', 'PONTA-B']);
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'GONDOLA', dividido: 'A' })").map((e) => e.id), ['PONTA-A', 'MEIO-A-1', 'MEIO-A-2', 'MEIO-B', 'PONTA-B']);
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
    ['C1', '01', 'GON-01/PONTA-A', 'BOT'],
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
    return atualizarModelosPlantas_({ layout: layout, movimentos: movimentos }, { '01': 13, '03': 9, '04': 11, _exemplo: VERSAO_EXEMPLO }); // só a 02 pendente
  })()`);
  assert.deepEqual(r.plantas, ['02']);
  assert.equal(r.versoes['02'], 12);
  const ids = (planta) => r.abas.layout.slice(1).filter((l) => l[0] === planta).map((l) => l[1]);
  assert.ok(!ids('02').includes('VELHO-01') && ids('02').includes('MESA DESTAQUE 1') && ids('02').includes('LOJA'), 'planta 02 com o modelo novo');
  assert.ok(ids('01').includes('MEU-01'), 'planta 01 intacta');
  const mov = r.abas.movimentos.slice(1).filter((l) => l[1] === '02');
  assert.ok(mov.some((l) => l[0] === 'Ciclo exemplo' && l[2] === 'GONDOLA 2/PONTA-A'), 'exemplo da planta 02 atualizado');
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
  }, { '01': 13, '02': 12, '03': 9, '04': 11, _exemplo: 1 })`);
  assert.deepEqual(r.plantas, ['exemplo']);
  assert.ok(!r.abas.movimentos.some((l) => l[2] === 'GON-01'), 'linha antiga do exemplo sai');
  assert.ok(r.abas.movimentos.some((l) => l[0] === 'C9'), 'outro ciclo fica');
  assert.ok(r.abas.movimentos.some((l) => l[0] === 'Ciclo exemplo' && l[2] === 'MOVEL MAKE 1/TESTEIRA-2'));
  assert.ok(!r.abas.paineis.some((l) => l[3] === 'velho'));
  assert.ok(r.abas.paineis.some((l) => l[3] === 'minha nota'));
  assert.equal(run("normId_('Móvel de  fila 3')"), 'MOVEL DE FILA 3');
});

test('blocos do balcão e das mesas; nomes antigos das pontas da gôndola', () => {
  const { run } = carregarGas();
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'VITRINE_L' })"), [], 'balcão: uma cor só');
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'MESA' })").map((e) => e.id), ['FRENTE-1', 'FRENTE-2', 'VERSO']);
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'MESA_3' })").map((e) => e.id), ['FRENTE-1', 'FRENTE-2', 'FRENTE-3', 'VERSO']);
  assert.equal(run("espacosDoMovel_({ tipo: 'MESA' })")[2].vm, true, 'verso da mesa é espaço de VM');
  assert.deepEqual(run("espacosDoMovel_({ tipo: 'TOTEM' })").map((e) => e.id), ['PAINEL-1', 'PAINEL-2', 'PAINEL-3']);
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Marca do Móvel'],
    ['C1', 'ER P', 'GONDOLA 1/PONTA-2', 'QDB'],
    ['C1', 'ER P', 'GONDOLA 1/LADO-B', 'BOT'],
    ['C1', 'ER P', 'GONDOLA 1/MEIO-B-2', 'EUD'],
    ['C1', 'ER P', 'MESA DESTAQUE 1/FRENTE-2', 'BOT'],
    ['C1', 'ER P', 'MESA DESTAQUE 1/VERSO', 'EUD'],
  ], null)`);
  assert.deepEqual(d.avisos, []);
  assert.deepEqual(Object.keys(d.movimentos.C1['01']).sort(),
    ['GONDOLA 1/MEIO-B-2', 'GONDOLA 1/PONTA-A', 'GONDOLA 1/PONTA-B', 'MESA DESTAQUE 1/FRENTE-2', 'MESA DESTAQUE 1/VERSO']);
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
    ['GONDOLA 1/MEIO-A-2', 'GONDOLA 1/PONTA-A', 'MESA DESTAQUE 1/FRENTE-2', 'TOTEM 1/PAINEL-1', 'TOTEM 1/PAINEL-2']);
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
  assert.match(d.avisos[0], /GONDOLA 1\/PONTA-A/);
  assert.deepEqual(Object.keys(d.movimentos.C1['01']).sort(), ['GONDOLA 1/MEIO-B', 'PIRAMIDE 1']);
});

test('validação: senha por papel, quem pode o quê e aba Comentários', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  const V = "{ papel: 'validador', senha: '1234', nome: 'Ana' }";
  const C = "{ papel: 'CONSTRUTOR', senha: '1234', nome: 'Bia' }";
  assert.deepEqual(run(`entrarValidacao(${V})`), { papel: 'VALIDADOR', autor: 'Ana', nomePapel: 'Validador' });
  assert.throws(() => run("entrarValidacao({ papel: 'VALIDADOR', senha: '0000', nome: 'Ana' })"), /Senha incorreta/);
  assert.throws(() => run("entrarValidacao({ papel: 'VALIDADOR', senha: '1234', nome: ' ' })"), /nome/);
  assert.throws(() => run("entrarValidacao({ papel: 'CHEFE', senha: '1234', nome: 'X' })"), /validador ou construtor/);

  assert.throws(() => run(`salvarComentario(${C}, { acao: 'novo', ciclo: 'C1', planta: '01', texto: 'x' })`), /Só o validador cria/);
  let l = run(`salvarComentario(${V}, { acao: 'novo', ciclo: 'C1', planta: 'ER P', movel: 'gôndola 1', texto: 'Trocar o lado A' })`);
  assert.equal(l.length, 1);
  assert.deepEqual([l[0].planta, l[0].movel, l[0].status, l[0].autor], ['01', 'GONDOLA 1', 'ABERTO', 'Ana']);
  const id = l[0].id;
  l = run(`salvarComentario(${C}, { acao: 'responder', id: '${id}', texto: 'Feito' })`);
  l = run(`salvarComentario(${C}, { acao: 'status', id: '${id}', status: 'resolvido' })`);
  assert.equal(l[0].status, 'RESOLVIDO');
  assert.deepEqual(l[0].respostas.map((r) => [r.autor, r.papel, r.texto]), [['Bia', 'CONSTRUTOR', 'Feito']]);
  assert.throws(() => run(`salvarComentario(${C}, { acao: 'status', id: '${id}', status: 'ABERTO' })`), /Só o validador reabre/);
  assert.throws(() => run(`salvarComentario(${C}, { acao: 'excluir', id: '${id}' })`), /Só o validador exclui/);
  assert.throws(() => run(`getComentarios({ papel: 'CONSTRUTOR', senha: 'x', nome: 'Bia' })`), /Senha incorreta/);

  const aba = run("lerComentariosDaPlanilha_(planilha_())");
  assert.deepEqual(aba[0], ['ID', 'Responde a', 'Ciclo', 'Planta', 'ID Móvel', 'Papel', 'Autor', 'Data', 'Texto', 'Status']);
  assert.equal(aba[1][3], 'ER P', 'planta gravada pelo nome');
  assert.equal(aba.length, 3, 'comentário + resposta');
  l = run(`salvarComentario(${V}, { acao: 'excluir', id: '${id}' })`);
  assert.deepEqual(l, []);
  assert.equal(run("lerComentariosDaPlanilha_(planilha_())").length, 1, 'resposta sai junto');
});

test('ciclo em construção: criar, editar, enviar, devolver e aprovar', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  run('configurarPlanilha()');
  const V = "{ papel: 'VALIDADOR', senha: '1234', nome: 'Ana' }";
  const C = "{ papel: 'CONSTRUTOR', senha: '1234', nome: 'Bia' }";
  const salvar = (quem, pedido) => run(`salvarRascunho(${quem}, ${JSON.stringify(pedido)})`);
  const exemplo = run('getDados()');
  const nLinhasExemplo = Object.values(exemplo.movimentos['Ciclo exemplo']).reduce((s, p) => s + Object.keys(p).length, 0);

  assert.deepEqual(run(`getRascunhos(${V})`).rascunhos, []);
  assert.throws(() => run("getRascunhos({ papel: 'VALIDADOR', senha: 'x', nome: 'Ana' })"), /Senha incorreta/);
  assert.throws(() => salvar(V, { acao: 'criar', ciclo: 'C11' }), /Só o construtor/);
  assert.throws(() => salvar(C, { acao: 'criar', ciclo: 'Ciclo exemplo' }), /Já existe/);
  assert.throws(() => salvar(C, { acao: 'criar', ciclo: 'C11', origem: 'Não existe' }), /não foi encontrado/);

  // Copiando um ciclo publicado: as mesmas linhas, com o nome novo (a cascata entre as ERs continua igual).
  let r = salvar(C, { acao: 'criar', ciclo: 'C11', origem: 'Ciclo exemplo' });
  assert.deepEqual(r.rascunhos.map((x) => [x.ciclo, x.status, x.origem, x.criadoPor]), [['C11', 'EM_CONSTRUCAO', 'Ciclo exemplo', 'Bia']]);
  assert.deepEqual(r.movimentos.C11, exemplo.movimentos['Ciclo exemplo']);
  assert.deepEqual(r.paineis.C11, exemplo.paineis['Ciclo exemplo']);
  assert.ok(!run('getDados()').ciclos.includes('C11'), 'rascunho não aparece para quem não entrou');
  // Todo movimento dos espaços fica cadastrado nos tipos (os que o ciclo de origem não tinha, sem GMV).
  const usadas = (movs) => new Set(Object.values(movs).flatMap((pl) => Object.values(pl).flatMap((i) => i.etiquetas.map((e) => e.texto.toUpperCase()))));
  const tiposC11 = Object.keys(r.tiposMovimento.C11);
  assert.ok([...usadas(r.movimentos.C11)].every((k) => tiposC11.includes(k)));
  const semGmv = tiposC11.filter((k) => r.tiposMovimento.C11[k].gmv === null);
  assert.ok(semGmv.length > 0, 'o exemplo tem etiquetas sem tipo');
  assert.throws(() => salvar(C, { acao: 'enviar', ciclo: 'C11' }), /Passo 1: falta o GMV/);

  // Espaços só com movimentos dos tipos.
  assert.throws(() => salvar(C, { acao: 'salvarEspaco', ciclo: 'C11', planta: '01', movel: 'PIRAMIDE 1', linha: { etiquetas: [{ texto: 'INVENTADO' }] } }),
    /fora dos Tipos de movimento do ciclo: "INVENTADO"/);
  // Um espaço da ER M: vira linha própria dessa ER; linha vazia apaga.
  r = salvar(C, { acao: 'salvarEspaco', ciclo: 'C11', planta: 'ER M', movel: 'gondola 1/ponta a', linha: {
    marca: 'BOT', simbolo: 'FIXO', etiquetas: [{ texto: 'BOTIPROMO', marca: 'BOT' }, { texto: 'LÇTO EGEO' }, { texto: ' ' }],
  } });
  assert.deepEqual(r.movimentos.C11['02']['GONDOLA 1/PONTA-A'], {
    marca: 'BOT', simbolo: 'FIXO', observacao: '',
    etiquetas: [{ texto: 'BOTIPROMO', marca: 'BOT', posicao: 1 }, { texto: 'LÇTO EGEO', marca: '', posicao: 2 }],
  });
  r = salvar(C, { acao: 'salvarEspaco', ciclo: 'C11', planta: '02', movel: 'GONDOLA 1/PONTA-A', linha: { etiquetas: [] } });
  assert.ok(!(r.movimentos.C11['02'] || {})['GONDOLA 1/PONTA-A']);

  // Comunicações ER da ER P: substituem as do ciclo.
  r = salvar(C, { acao: 'salvarPaineis', ciclo: 'C11', planta: 'ER P', linhas: [
    { secao: 'TV', texto: 'GRADE NOVA', marca: 'MULTI' }, { secao: 'C', texto: '' }, { secao: 'x', texto: 'sem seção' },
  ] });
  assert.deepEqual(r.paineis.C11['01'], [{ secao: 'TV', texto: 'GRADE NOVA', marca: 'MULTI', movel: '' }]);

  // Tipos: a lista toda é substituída; movimento sem GMV também fica (é o cadastro do que o ciclo pode usar).
  const comGmv = (lista) => lista.map((k) => ({ etiqueta: r.tiposMovimento.C11[k] ? r.tiposMovimento.C11[k].texto : k, gmv: '100 mil' }));
  const todos = tiposC11.filter((k) => k !== 'BOTIPROMO');
  r = salvar(C, { acao: 'salvarTipos', ciclo: 'C11', linhas: [
    { etiqueta: 'BOTIPROMO', classificacao: 'promo', gmv: '1,5 mi' }, { etiqueta: 'botipromo', classificacao: 'Lançamento' }, { etiqueta: 'NÃO USADO' },
  ].concat(comGmv(todos)) });
  assert.equal(r.tiposMovimento.C11.BOTIPROMO.classificacao, 'PROMOCAO');
  assert.equal(r.tiposMovimento.C11.BOTIPROMO.gmv, 1500000);
  assert.equal(r.tiposMovimento.C11['NÃO USADO'].gmv, null);
  assert.throws(() => salvar(C, { acao: 'enviar', ciclo: 'C11' }), /falta o GMV esperado de "NÃO USADO"/);
  // Tirar dos tipos um movimento que os espaços usam: o envio aponta.
  r = salvar(C, { acao: 'salvarTipos', ciclo: 'C11', linhas: [{ etiqueta: 'BOTIPROMO', classificacao: 'promo', gmv: '1,5 mi' }, { etiqueta: 'NÃO USADO', gmv: 5 }]
    .concat(comGmv(todos.filter((k) => k !== 'LÇTO EGEO'))) });
  assert.throws(() => salvar(C, { acao: 'enviar', ciclo: 'C11' }), /Passo 2: há espaços com movimentos fora dos Tipos de movimento: "LÇTO EGEO"/);
  r = salvar(C, { acao: 'salvarTipos', ciclo: 'C11', linhas: [{ etiqueta: 'BOTIPROMO', classificacao: 'promo', gmv: '1,5 mi' }, { etiqueta: 'NÃO USADO', gmv: 5 }]
    .concat(comGmv(todos)) });

  // Enviar trava a edição; o construtor não aprova; devolver vira comentário e destrava.
  assert.throws(() => salvar(V, { acao: 'enviar', ciclo: 'C11' }), /Só o construtor/);
  r = salvar(C, { acao: 'enviar', ciclo: 'C11' });
  assert.equal(r.rascunhos[0].status, 'ENVIADO');
  assert.throws(() => salvar(C, { acao: 'salvarEspaco', ciclo: 'C11', planta: '01', movel: 'PIRAMIDE 1', linha: { marca: 'BOT' } }), /foi enviado/);
  assert.throws(() => salvar(C, { acao: 'aprovar', ciclo: 'C11' }), /Só o validador/);
  assert.throws(() => salvar(V, { acao: 'devolver', ciclo: 'C11', motivo: ' ' }), /Escreva/);
  r = salvar(V, { acao: 'devolver', ciclo: 'C11', planta: 'ER G', motivo: 'Faltou a pirâmide' });
  assert.equal(r.rascunhos[0].status, 'EM_CONSTRUCAO');
  const coment = run(`getComentarios(${V})`);
  assert.deepEqual(coment.map((c) => [c.ciclo, c.planta, c.texto]), [['C11', '03', 'Devolvido para ajustes: Faltou a pirâmide']]);
  assert.throws(() => salvar(V, { acao: 'aprovar', ciclo: 'C11' }), /não está aguardando/);

  // Aprovar: as linhas vão para as abas publicadas e saem das de rascunho (os tipos que nenhum espaço usa ficam de fora).
  salvar(C, { acao: 'enviar', ciclo: 'C11' });
  r = salvar(V, { acao: 'aprovar', ciclo: 'C11' });
  assert.deepEqual(r.rascunhos, []);
  assert.ok(!r.movimentos.C11);
  const d = run('getDados()');
  assert.ok(d.ciclos.includes('C11') && d.ciclos.includes('Ciclo exemplo'));
  assert.deepEqual(d.paineis.C11['01'], [{ secao: 'TV', texto: 'GRADE NOVA', marca: 'MULTI', movel: '' }]);
  assert.equal(d.tiposMovimento.C11.BOTIPROMO.gmv, 1500000);
  assert.ok(!d.tiposMovimento.C11['NÃO USADO']);
  assert.ok(!d.avisos.some((a) => /C11/.test(a)), 'sem avisos do ciclo novo: ' + d.avisos.filter((a) => /C11/.test(a)).join(' | '));
  assert.deepEqual(d.tiposMovimento['Ciclo exemplo'], exemplo.tiposMovimento['Ciclo exemplo'], 'os tipos dos outros ciclos ficam como estavam');
  assert.deepEqual(d.paineis['Ciclo exemplo'], exemplo.paineis['Ciclo exemplo']);
  assert.equal(Object.values(d.movimentos.C11).reduce((s, p) => s + Object.keys(p).length, 0), nLinhasExemplo);
  assert.deepEqual(d.movimentos['Ciclo exemplo'], exemplo.movimentos['Ciclo exemplo'], 'os outros ciclos ficam como estavam');
  assert.equal(run(`lerAba_(planilha_(), '${'Rascunhos'}', true)`)[1][1], 'APROVADO', 'histórico na aba Rascunhos');
  assert.throws(() => salvar(C, { acao: 'criar', ciclo: 'C11' }), /Já existe/);

  // Em branco: precisa dos tipos antes de enviar; excluir.
  r = salvar(C, { acao: 'criar', ciclo: 'C12' });
  assert.deepEqual([r.rascunhos.length, r.movimentos.C12], [1, undefined]);
  assert.throws(() => salvar(C, { acao: 'enviar', ciclo: 'C12' }), /Passo 1: cadastre os Tipos/);
  r = salvar(C, { acao: 'salvarTipos', ciclo: 'C12', linhas: [{ etiqueta: 'X', gmv: 1 }] });
  assert.throws(() => salvar(C, { acao: 'enviar', ciclo: 'C12' }), /Passo 2: o ciclo está vazio/);
  r = salvar(C, { acao: 'excluir', ciclo: 'C12' });
  assert.deepEqual(r.rascunhos, []);

  // Só os movimentos fixos do ciclo anterior: as linhas com 🔒 e os tipos delas; sem as comunicações.
  const fixos = Object.values(exemplo.movimentos['Ciclo exemplo']).flatMap((pl) => Object.values(pl)).filter((i) => i.simbolo === 'FIXO');
  assert.ok(fixos.length > 0);
  r = salvar(C, { acao: 'criar', ciclo: 'C13', origem: 'Ciclo exemplo', copiar: 'fixos' });
  assert.equal(r.rascunhos[0].origem, 'Ciclo exemplo (só os fixos)');
  const linhasC13 = Object.values(r.movimentos.C13).flatMap((pl) => Object.values(pl));
  assert.equal(linhasC13.length, fixos.length);
  assert.ok(linhasC13.every((i) => i.simbolo === 'FIXO'));
  assert.deepEqual(r.paineis.C13 || {}, {});
  assert.deepEqual(new Set(Object.keys(r.tiposMovimento.C13)), usadas(r.movimentos.C13));
  assert.throws(() => salvar(C, { acao: 'criar', ciclo: 'C14', origem: 'C12', copiar: 'fixos' }), /não foi encontrado/);
});

test('tipos de movimento: classificação e GMV esperado por etiqueta do ciclo', () => {
  const { run } = carregarGas();
  assert.equal(run("numeroGmv_('R$ 1.500.000,00')"), 1500000);
  assert.equal(run("numeroGmv_('1.500.000')"), 1500000);
  assert.equal(run("numeroGmv_('1,5 mi')"), 1500000);
  assert.equal(run("numeroGmv_('250 mil')"), 250000);
  assert.equal(run("numeroGmv_('1,500,000.50')"), 1500000.5);
  assert.equal(run('numeroGmv_(42)'), 42);
  assert.equal(run("numeroGmv_('')"), null);
  assert.equal(run("numeroGmv_('abc')"), null);
  assert.equal(run("normClassificacao_('lançamento')"), 'LANCAMENTO');
  assert.equal(run("normClassificacao_('Promo')"), 'PROMOCAO');
  assert.equal(run("normClassificacao_('Sazonal')"), 'Sazonal');
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Etiqueta 1'],
    ['C1', '01', 'PIRAMIDE 1', 'Multi  Promo'],
  ], null, [
    ['Ciclo', 'Movimento (etiqueta)', 'Classificação', 'GMV esperado (R$)'],
    ['C1', 'MULTI PROMO', 'Promoção', 'R$ 2.000.000'],
    ['C1', 'multi promo', 'Lançamento', ''],
    ['C1', 'NÃO EXISTE', 'Lançamento', 'x'],
    ['', '', '', ''],
  ])`);
  const c1 = d.tiposMovimento.C1;
  assert.deepEqual([c1['MULTI PROMO'].classificacao, c1['MULTI PROMO'].gmv], ['PROMOCAO', 2000000]);
  assert.equal(c1['NÃO EXISTE'].gmv, null);
  assert.ok(d.avisos.some((a) => /linha 3: "multi promo" já aparece/.test(a)), d.avisos.join('|'));
  assert.ok(d.avisos.some((a) => /"NÃO EXISTE" não aparece em nenhuma etiqueta/.test(a)));
  assert.ok(d.avisos.some((a) => /GMV esperado "x"/.test(a)));
  assert.deepEqual(d.ciclos, ['C1'], 'a aba não cria ciclos sozinha');
  const ex = run('montarDados_(valoresLayoutPadrao_(), valoresMovimentosExemplo_(), valoresPaineisExemplo_(), valoresTiposExemplo_())');
  assert.deepEqual(ex.avisos, [], 'exemplo sem avisos');
  assert.equal(ex.tiposMovimento['Ciclo exemplo']['LÇTO EGEO'].classificacao, 'LANCAMENTO');
});

test('importar aba Tipos de movimento substitui só o ciclo presente', () => {
  const f = servicosFalsos();
  const { ctx, run } = carregarGas(f.globais);
  run('configurarPlanilha()');
  ctx.__tipos = { tipos: [
    ['Ciclo', 'Movimento (etiqueta)', 'Classificação', 'GMV esperado (R$)'],
    ['C20', 'BOTIPROMO', 'Promoção', 300000],
  ] };
  assert.equal(run('importarPlanilha(__tipos)').tipos, 1);
  const d = run('getDados()');
  assert.equal(d.tiposMovimento.C20.BOTIPROMO.gmv, 300000);
  assert.ok(Object.keys(d.tiposMovimento['Ciclo exemplo']).length > 10, 'exemplo mantido');
});

test('tamanho das etiquetas da planta fica na linha LOJA do Layout', () => {
  const f = servicosFalsos();
  const { run } = carregarGas(f.globais);
  run('configurarPlanilha()');
  assert.equal(run('getDados()').plantas[0].loja.escalaEtiquetas, 100);
  run("salvarAjustesEtiquetas('01', { LOJA: { escala: 140 }, 'PIRAMIDE 1': { x: 3, y: 4 } })");
  const p = run('getDados()').plantas[0];
  assert.equal(p.loja.escalaEtiquetas, 140);
  assert.deepEqual([p.moveis.find((m) => m.id === 'PIRAMIDE 1').ajusteX, run('getDados()').plantas[1].loja.escalaEtiquetas], [3, 100]);
  assert.equal(run("normTamanhoEtiquetas_('500%')"), 250);
  assert.equal(run("normTamanhoEtiquetas_('')"), 100);
});

test('ciclo de exemplo cheio: todos os móveis com etiquetas, na quantidade de cada tipo', () => {
  const { run } = carregarGas();
  const d = run('montarDados_(valoresLayoutPadrao_(), valoresMovimentosExemplo_())');
  const qtd = { GONDOLA: 2, PIRAMIDE: 2, FILA: 2, CUBO: 2, GONDOLA_PAREDE: 3, TOTEM: 1, MESA: 2, MESA_3: 2, PAINEL: 3, EXPOSITOR_OUI: 3, ILHA_OUI: 3, VITRINE_L: 3, MAKE: 1, EXTRA: 1 };
  const espacos = { GONDOLA: ['PONTA-A', 'MEIO-A', 'MEIO-B', 'PONTA-B'], TOTEM: ['PAINEL-1', 'PAINEL-2', 'PAINEL-3'], MESA: ['FRENTE-1', 'FRENTE-2'], MESA_3: ['FRENTE-1', 'FRENTE-2', 'FRENTE-3'], MAKE: ['TESTEIRA-1', 'TESTEIRA-2', 'TESTEIRA-3', 'TESTEIRA-4'] };
  d.plantas.forEach((p) => {
    const movs = d.movimentos['Ciclo exemplo cheio'][p.id];
    p.moveis.forEach((m) => {
      if (m.tipo === 'CAIXA') {
        assert.ok(!movs[m.id], 'móvel de atendimento sem etiqueta');
        return;
      }
      (espacos[m.tipo] || ['']).forEach((e) => {
        const linha = movs[m.id + (e ? '/' + e : '')];
        assert.ok(linha, p.id + ' ' + m.id + ' ' + e + ' preenchido');
        assert.equal(linha.etiquetas.length, qtd[m.tipo], p.id + ' ' + m.id + ' ' + e);
      });
    });
  });
});

test('móvel de atendimento não leva etiqueta: a linha dele é ignorada, com aviso', () => {
  const { run } = carregarGas();
  const d = run(`montarDados_(valoresLayoutPadrao_(), [
    ['Ciclo', 'Planta', 'ID Móvel', 'Marca do Móvel', 'Etiqueta 1', 'Marca Etiqueta 1'],
    ['C1', '01', 'MOVEL DE ATENDIMENTO 1', 'BOT', 'STOPPER', 'BOT'],
    ['C1', '01', 'PIRAMIDE 1', 'BOT', 'BOTIPROMO', 'BOT'],
  ])`);
  assert.ok(!d.movimentos.C1['01']['MOVEL DE ATENDIMENTO 1']);
  assert.ok(d.movimentos.C1['01']['PIRAMIDE 1']);
  assert.ok(d.avisos.some((a) => /atendimento/.test(a)));
});

test('ER GG: posições fixas das etiquetas (largura do slide salva na linha LOJA)', () => {
  const { run } = carregarGas();
  const d = run('montarDados_(valoresLayoutPadrao_(), [])');
  const gg = d.plantas.filter((p) => p.id === '04')[0];
  assert.equal(gg.loja.slide, 3072);
  const g1 = gg.moveis.filter((m) => m.id === 'GONDOLA 1')[0];
  assert.ok(g1.ajustesEspacos['PONTA-A'].x > 0, 'pilha com posição fixa');
  assert.equal(run("normSlide_('abc')"), 0);
});

test('ER G: posições fixas das etiquetas no layout padrão', () => {
  const { run } = carregarGas();
  const g = run('montarDados_(valoresLayoutPadrao_(), [])').plantas.filter((p) => p.id === '03')[0];
  assert.equal(g.loja.slide, 2784);
  assert.ok(g.moveis.filter((m) => m.id === 'MESA DESTAQUE 3 FRENTES 1')[0].ajustesEspacos['FRENTE-1'].x > 0);
});

test('ER M: posições fixas das etiquetas no layout padrão', () => {
  const { run } = carregarGas();
  const m = run('montarDados_(valoresLayoutPadrao_(), [])').plantas.filter((p) => p.id === '02')[0];
  assert.equal(m.loja.slide, 2208);
  assert.ok(m.moveis.filter((x) => x.id === 'MESA DESTAQUE 1')[0].ajustesEspacos['FRENTE-1'].x > 0);
});

test('ER P: posições fixas das etiquetas no layout padrão', () => {
  const { run } = carregarGas();
  const p = run('montarDados_(valoresLayoutPadrao_(), [])').plantas.filter((x) => x.id === '01')[0];
  assert.equal(p.loja.slide, 1920);
  assert.ok(p.moveis.filter((m) => m.id === 'GONDOLA 1')[0].ajustesEspacos['PONTA-A'].x > 0);
});

test('antecipação: item do próximo ciclo num espaço do ciclo atual, a partir de uma data', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  run('configurarPlanilha()');
  const V = "{ papel: 'VALIDADOR', senha: '1234', nome: 'Ana' }";
  const C = "{ papel: 'CONSTRUTOR', senha: '1234', nome: 'Bia' }";
  const salvar = (quem, pedido) => run(`salvarAntecipacao(${quem}, ${JSON.stringify(pedido)})`);
  assert.deepEqual(run('getDados()').antecipacoes, []);

  const base = { acao: 'salvar', ciclo: 'Ciclo exemplo', planta: 'ER M', movel: 'GONDOLA 1/PONTA-A', etiqueta: 'LÇTO NATIVA', marca: 'bot', data: '2026-10-25', origem: 'C12' };
  assert.throws(() => salvar("{ papel: 'CONSTRUTOR', senha: 'x', nome: 'Bia' }", base), /Senha incorreta/);
  assert.throws(() => salvar(C, Object.assign({}, base, { ciclo: 'C99' })), /não está publicado/);
  assert.throws(() => salvar(C, Object.assign({}, base, { movel: 'GONDOLA 1' })), /Escolha o espaço/);
  assert.throws(() => salvar(C, Object.assign({}, base, { movel: 'GONDOLA 1/PAINEL-1' })), /não tem o espaço/);
  assert.throws(() => salvar(C, Object.assign({}, base, { movel: 'NAO EXISTE 9' })), /não existe na ER M/);
  assert.throws(() => salvar(C, Object.assign({}, base, { data: '31/02/2026' })), /data/);
  assert.throws(() => salvar(C, Object.assign({}, base, { etiqueta: ' ' })), /movimento/);
  assert.throws(() => salvar(C, Object.assign({}, base, { origem: 'Ciclo exemplo' })), /ciclo de origem/);

  let l = salvar(C, base);
  assert.equal(l.length, 1);
  assert.deepEqual(
    [l[0].ciclo, l[0].planta, l[0].movel, l[0].etiqueta, l[0].marca, l[0].modo, l[0].data, l[0].dataTexto, l[0].origem, l[0].criadoPor],
    ['Ciclo exemplo', '02', 'GONDOLA 1/PONTA-A', 'LÇTO NATIVA', 'BOT', 'SUBSTITUIR', '2026-10-25', '25/10/2026', 'C12', 'Bia']
  );
  const id = l[0].id;
  // O validador também pode (mudança de curto prazo); a data aceita dd/mm/aaaa; editar mantém quem criou.
  l = salvar(V, Object.assign({}, base, { id, planta: 'TODAS', movel: 'piramide 1', modo: 'SOMAR', data: '20/10/2026' }));
  assert.deepEqual([l.length, l[0].id, l[0].planta, l[0].movel, l[0].modo, l[0].data, l[0].criadoPor], [1, id, 'TODAS', 'PIRAMIDE 1', 'SOMAR', '2026-10-20', 'Bia']);
  salvar(C, Object.assign({}, base, { data: '2026-10-18' }));
  const d = run('getDados()');
  assert.deepEqual(d.antecipacoes.map((a) => a.data), ['2026-10-18', '2026-10-20'], 'em ordem de entrada');
  assert.deepEqual(d.avisos, []);
  assert.equal(d.simbolos.ANTECIPADO.automatico, true);
  // A aba Movimentos não muda: a página junta as duas na hora de desenhar.
  assert.ok(!JSON.stringify(d.movimentos).includes('LÇTO NATIVA'));
  const aba = run(`lerAba_(planilha_(), 'Antecipações', true)`);
  assert.deepEqual(aba[0].slice(0, 8), ['ID', 'Ciclo', 'Planta', 'ID Móvel', 'Movimento (etiqueta)', 'Marca', 'Como entra', 'Data de entrada']);
  assert.equal(aba[1][7], '20/10/2026');
  // O símbolo de antecipação não vem da planilha.
  assert.equal(run("normSimbolo_('ANTECIPADO')"), '');

  assert.throws(() => salvar(C, { acao: 'excluir', id: 'X' }), /não encontrada/);
  l = salvar(C, { acao: 'excluir', id });
  assert.deepEqual(l.map((a) => a.data), ['2026-10-18']);
});

test('observação da etiqueta depois do "|": aparece na etiqueta, mas o movimento é o que vem antes', () => {
  const { run } = carregarGas();
  assert.equal(run("chaveEtiqueta_('Lçto  Egeo | só no kit')"), run("chaveEtiqueta_('LÇTO EGEO')"));
  assert.equal(run("movimentoDaEtiqueta_('BOTIPROMO|50% off')"), 'BOTIPROMO');
  const mov = [['Ciclo', 'Planta', 'ID Móvel', 'Etiqueta 1'], ['C1', 'ER P', 'PIRAMIDE 1', 'BOTIPROMO | 50% off']];
  const tipos = [['Ciclo', 'Movimento (etiqueta)', 'GMV esperado (R$)'], ['C1', 'BOTIPROMO', '100']];
  const d = run(`montarDados_(valoresLayoutPadrao_(), ${JSON.stringify(mov)}, [], ${JSON.stringify(tipos)})`);
  assert.equal(d.movimentos.C1['01']['PIRAMIDE 1'].etiquetas[0].texto, 'BOTIPROMO | 50% off', 'a planta mostra a etiqueta inteira');
  assert.deepEqual(Object.keys(d.tiposMovimento.C1), ['BOTIPROMO']);
  assert.ok(!d.avisos.some((a) => /não aparece em nenhuma etiqueta/.test(a)), 'o tipo acha o movimento');
});

test('ciclo em construção: etiqueta com observação usa o movimento cadastrado nos tipos', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  run('configurarPlanilha()');
  const C = "{ papel: 'CONSTRUTOR', senha: '1234', nome: 'Bia' }";
  const salvar = (pedido) => run(`salvarRascunho(${C}, ${JSON.stringify(pedido)})`);
  salvar({ acao: 'criar', ciclo: 'C30' });
  salvar({ acao: 'salvarTipos', ciclo: 'C30', linhas: [{ etiqueta: 'OUTLET | não vai', gmv: '10 mil' }] });
  const r = salvar({ acao: 'salvarEspaco', ciclo: 'C30', planta: 'ER P', movel: 'PIRAMIDE 1', linha: { marca: 'EUD', etiquetas: [{ texto: 'OUTLET | só no kit' }, { texto: 'outlet | vitrine' }] } });
  assert.deepEqual(Object.keys(r.tiposMovimento.C30), ['OUTLET'], 'o tipo fica sem a observação');
  assert.deepEqual(r.movimentos.C30['01']['PIRAMIDE 1'].etiquetas.map((e) => e.texto), ['OUTLET | só no kit', 'outlet | vitrine']);
  assert.throws(() => salvar({ acao: 'salvarEspaco', ciclo: 'C30', planta: 'ER P', movel: 'PIRAMIDE 2', linha: { etiquetas: [{ texto: 'OUTRO | OUTLET' }] } }), /fora dos Tipos/);
  salvar({ acao: 'enviar', ciclo: 'C30' });
});
