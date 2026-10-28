/**
 * Testes do backend (Code.gs) sem precisar do Apps Script.
 * Rodar:  node --test dev/
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { carregarGas, servicosFalsos, configurarComExemplo } = require('./gas');

/** Acesso do módulo Desenvolvedor (Construir loja, Baixar / Importar planilha). */
const DEV = "{ senha: 'desenvolvedor_exposicao' }";

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
  assert.equal(run("normClassificacao_('Baseline')"), 'INSTITUCIONAL');
  assert.equal(run("normClassificacao_('Institucional / portfólio')"), 'INSTITUCIONAL', 'o nome antigo continua aceito');
  assert.equal(run('CLASSIFICACOES.INSTITUCIONAL.nome'), 'Baseline');
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
  assert.deepEqual(Array.from(conf.criadas), ['Layout', 'Movimentos', 'Painéis', 'Tipos de movimento', 'Produtos']);
  assert.ok(f.planilha.getSheetByName('Página1'), 'aba do usuário é mantida');
  assert.equal(f.planilha.getSheetByName('Movimentos')._aba.congeladas, 3);
  assert.equal(run('configurarPlanilha()').criadas.length, 0, 'não sobrescreve abas existentes');
  const d0 = run('getDados()');
  assert.equal(d0.precisaConfigurar, false);
  assert.deepEqual(Array.from(d0.ciclos), [], 'a planilha nova começa sem ciclos (nem os de exemplo)');
  assert.deepEqual(Array.from(d0.avisos), []);

  configurarComExemplo(run);
  const d1 = run('getDados()');
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
  const r = run(`importarPlanilha(${DEV}, __payload)`);
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
  configurarComExemplo(run);
  ctx.__ruim = { movimentos: [['Ciclo', 'Planta', 'Etiqueta 1'], ['C1', '01', 'x']] };
  assert.throws(() => run(`importarPlanilha(${DEV}, __ruim)`), /ID Móvel/);
  assert.throws(() => run(`importarPlanilha(${DEV}, {})`), /Movimentos/);
});

test('modo standalone cria a planilha e guarda o ID', () => {
  const f = servicosFalsos({ vinculada: false });
  const { run } = carregarGas(f.globais);
  assert.equal(run('getDados()').precisaConfigurar, true);
  configurarComExemplo(run);
  assert.equal(f.propriedades.SPREADSHEET_ID, 'TESTE');
  assert.deepEqual(f.planilha.getSheets().map((s) => s.getName()), ['Layout', 'Movimentos', 'Painéis', 'Tipos de movimento', 'Produtos']);
  assert.equal(run('getDados()').plantas.length, 4);
});

test('importar aba Layout substitui só as plantas presentes e mantém números', () => {
  const f = servicosFalsos();
  const { ctx, run } = carregarGas(f.globais);
  configurarComExemplo(run);
  ctx.__layout = {
    layout: [
      ['Planta', 'ID Móvel', 'Tipo', 'X', 'Y', 'Largura (eixo X)', 'Profundidade (eixo Y)', 'Altura'],
      ['02', 'LOJA', 'LOJA', 0, 0, 30, 25, 5],
      ['02', 'PIR-01', 'PIRAMIDE', 3, 15, 1.7, 1.7, 3.6],
    ],
  };
  const r = run(`importarPlanilha(${DEV}, __layout)`);
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

test('modelo base novo de uma planta substitui só o layout daquela planta', () => {
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
  assert.deepEqual(mov.map((l) => l[0]), ['Ciclo exemplo', 'C9'], 'os ciclos não mudam (o modelo não grava mais o exemplo)');
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

test('versão 18: os ciclos de exemplo saem da base (e só eles)', () => {
  const { run } = carregarGas();
  const r = run(`atualizarModelosPlantas_({
    layout: valoresLayoutPadrao_(),
    movimentos: [colunasMovimentos_().map(function (c) { return c.titulo; }),
      ['Ciclo exemplo', 'TODAS', 'GON-01', '', 'BOT'], ['C9', '01', 'GONDOLA 1', '', 'EUD']],
    paineis: [colunasPaineis_().map(function (c) { return c.titulo; }),
      ['Ciclo exemplo', 'TODAS', 'CALLOUT', 'velho', 'BOT', 'PAR-02'], ['C9', 'TODAS', 'NOTA', 'minha nota', '', '']],
  }, { '01': 13, '02': 12, '03': 9, '04': 11, _exemplo: 1 })`);
  assert.deepEqual(r.plantas, ['exemplo']);
  assert.equal(r.versoes._exemplo, 18);
  assert.ok(!r.abas.movimentos.some((l) => /^Ciclo exemplo/.test(l[0])), 'as linhas do exemplo saem e não voltam');
  assert.ok(r.abas.movimentos.some((l) => l[0] === 'C9'), 'outro ciclo fica');
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

test('desenvolvedor: senha própria para importar a planilha e salvar o layout', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  assert.deepEqual(run(`entrarDesenvolvedor(${DEV})`), { ok: true });
  assert.throws(() => run("entrarDesenvolvedor({ senha: 'errada' })"), /Senha incorreta/);
  assert.throws(() => run('entrarDesenvolvedor()'), /Senha incorreta/);
  // A senha de outro módulo não libera o desenvolvedor, e a do desenvolvedor não entra na validação.
  assert.throws(() => run("entrarDesenvolvedor({ senha: 'construcao_exposicao' })"), /Senha incorreta/);
  assert.throws(() => run("entrarValidacao({ papel: 'DESENVOLVEDOR', senha: 'desenvolvedor_exposicao', nome: 'Dev' })"), /Escolha o módulo/);
  const payload = "{ movimentos: [['Planta', 'Ciclo', 'ID Móvel', 'Marca do Móvel'], ['01', 'C1', 'PIRAMIDE 1', 'BOT']] }";
  assert.throws(() => run(`importarPlanilha({ senha: 'x' }, ${payload})`), /Senha incorreta/);
  assert.ok(!run('getDados()').ciclos.includes('C1'), 'nada gravado sem a senha');
  assert.equal(run(`importarPlanilha(${DEV}, ${payload})`).movimentos, 1);
  const layout = "{ loja: { largura: 10, profundidade: 8, alturaParede: 3 }, moveis: [{ id: 'PIRAMIDE 1', tipo: 'PIRAMIDE', x: 1, y: 1, w: 1, d: 1, h: 2 }] }";
  assert.throws(() => run(`salvarLayout({ senha: '' }, '01', ${layout})`), /Senha incorreta/);
  assert.deepEqual(run(`salvarLayout(${DEV}, '01', ${layout})`), { planta: '01', nome: 'ER P', moveis: 1 });
});

test('desenvolvedor: plantas (criar, renomear, ordenar, apagar), regras da cascata e senhas', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  const cfg = () => run(`getConfigDev(${DEV})`);
  const salvar = (pedido) => run(`salvarConfigDev(${DEV}, ${JSON.stringify(pedido)})`);
  assert.throws(() => run("getConfigDev({ senha: 'x' })"), /Senha incorreta/);
  assert.deepEqual(cfg().plantas.map((p) => p.nome), ['ER P', 'ER M', 'ER G', 'ER GG']);
  assert.ok(cfg().espacosPorEr['GONDOLA 1/PONTA-B'], 'regra do código vale sem a aba');
  assert.equal(cfg().senhas.DESENVOLVEDOR, 'desenvolvedor_exposicao');

  // Planta nova pelo Salvar planta: próximo número livre e o nome escolhido.
  const layout = "{ loja: { largura: 10, profundidade: 8, alturaParede: 3 }, moveis: [{ id: 'PIRAMIDE 1', tipo: 'PIRAMIDE', x: 1, y: 1, w: 1, d: 1, h: 2 }] }";
  assert.deepEqual(run(`salvarLayout(${DEV}, 'NOVA', ${layout}, 'ER Outlet')`), { planta: '05', nome: 'ER Outlet', moveis: 1 });
  assert.throws(() => run(`salvarLayout(${DEV}, 'NOVA', ${layout}, 'er m')`), /Já existe uma planta chamada/);
  assert.equal(run('getDados()').plantas.find((p) => p.id === '05').nome, 'ER Outlet');

  // Renomear: o nome antigo continua valendo nas abas (apelido).
  salvar({ acao: 'renomearPlanta', planta: '03', nome: 'ER Grande' });
  assert.equal(run("normPlanta_('ER G')"), '03');
  const d = run('getDados()');
  assert.equal(d.plantas.find((p) => p.id === '03').nome, 'ER Grande');
  assert.ok(d.movimentos['Ciclo exemplo']['03'], 'linhas gravadas como "ER G" continuam na planta');
  assert.ok(f.planilha.getSheetByName('Config do app'), 'aba criada');

  // Ordem das plantas (é a ordem da cascata).
  salvar({ acao: 'ordemPlantas', ordem: ['01', '02', '03', '05', '04'] });
  assert.deepEqual(run('getDados()').plantas.map((p) => p.id), ['01', '02', '03', '05', '04']);
  assert.throws(() => salvar({ acao: 'ordemPlantas', ordem: ['01', '02'] }), /todas as plantas/);

  // Regras: espaço fixo (aqui, a ponta B da gôndola 1 fixa de O.U.i na ER G) e mudança de espaço.
  salvar({ acao: 'config', chave: 'espacosPorEr', valor: [{ espaco: 'gondola 1/ponta-b', fixo: { plantas: ['03'], marca: 'oui' }, livre: { nome: 'Livre' } }] });
  let c = cfg();
  assert.deepEqual(c.espacosPorEr, { 'GONDOLA 1/PONTA-B': { fixo: { plantas: ['03'], marca: 'OUI', nome: 'Fixo OUI' }, livre: { nome: 'Livre' } } });
  assert.deepEqual(run('getDados()').config.espacosPorEr, c.espacosPorEr, 'a página recebe a regra nova');
  assert.throws(() => salvar({ acao: 'config', chave: 'espacosPorEr', valor: [{ espaco: 'GONDOLA 1/PONTA-B', fixo: { plantas: [], marca: 'OUI' } }] }), /ao menos uma ER/);
  salvar({ acao: 'config', chave: 'herancaEntreErs', valor: [{ para: '04', espacos: [{ novo: 'GONDOLA 4/PONTA-A', antigo: 'GONDOLA 2/PONTA-B' }], semHeranca: ['GONDOLA 2/PONTA-B'] }] });
  assert.deepEqual(cfg().herancaEntreErs, [{ de: '05', para: '04', espacos: { 'GONDOLA 4/PONTA-A': 'GONDOLA 2/PONTA-B' }, semHeranca: ['GONDOLA 2/PONTA-B'] }]);
  salvar({ acao: 'padrao', chave: 'herancaEntreErs' });
  assert.equal(cfg().herancaEntreErs[0].para, '03', 'volta ao padrão do código');

  // Apagar: não apaga planta usada numa regra; apaga as linhas da planta e o modelo do código não a recria.
  assert.throws(() => salvar({ acao: 'excluirPlanta', planta: '03' }), /regras da cascata/);
  salvar({ acao: 'excluirPlanta', planta: '04', apagarDados: true });
  const d2 = run('getDados()');
  assert.deepEqual(d2.plantas.map((p) => p.id), ['01', '02', '03', '05']);
  assert.ok(!d2.movimentos['Ciclo exemplo']['04'], 'linhas da ER GG apagadas');
  assert.deepEqual(d2.avisos, []);

  // Senhas: a nova vale (no servidor), a antiga não.
  assert.throws(() => salvar({ acao: 'config', chave: 'senhas', valor: { DESENVOLVEDOR: 'nova-dev', VALIDADOR: 'nova-val', CONSTRUTOR: 'nova-val' } }), /senha diferente/);
  salvar({ acao: 'config', chave: 'senhas', valor: { DESENVOLVEDOR: 'nova-dev', VALIDADOR: 'nova-val', CONSTRUTOR: 'nova-cons' } });
  assert.throws(() => run(`getConfigDev(${DEV})`), /Senha incorreta/);
  assert.deepEqual(run("entrarDesenvolvedor({ senha: 'nova-dev' })"), { ok: true });
  assert.equal(run("entrarValidacao({ papel: 'VALIDADOR', senha: 'nova-val', nome: 'Ana' })").papel, 'VALIDADOR');
  // Um acesso só para a Construção (as abas Ciclo e Planograma ficam na tela).
  assert.throws(() => run("entrarValidacao({ papel: 'PLANOGRAMA', senha: 'nova-cons', nome: 'Pli' })"), /Escolha o módulo/);
  assert.throws(() => run("salvarConfigDev({ senha: 'nova-dev' }, { acao: 'config', chave: 'senhas', valor: { DESENVOLVEDOR: 'a', VALIDADOR: 'bbbb', CONSTRUTOR: 'cccc' } })"), /4 caracteres/);
});

test('calendário dos ciclos e feriados: abas lidas da planilha do calendário (vinculada em Desenvolvedor › Planilhas)', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  let cal = run('getDados()').calendario;
  assert.deepEqual(cal.ciclos, { BOT: [], EUD: [] }, 'sem as abas, o calendário fica vazio');
  assert.deepEqual(cal.abas, { ciclos: false, feriados: false });

  // Só a Eudora tem calendário próprio: as outras marcas seguem o do Boticário.
  assert.equal(run("calendarioDaMarca_('Eudora')"), 'EUD');
  ['Boticário', 'BOT', 'QDB', 'OUI', 'MULTI', '', 'BOT+EUD'].forEach((m) => assert.equal(run(`calendarioDaMarca_('${m}')`), 'BOT', m));

  // Sem planilha vinculada, as abas são procuradas na principal (nome sem diferença de acento e maiúsculas).
  run(`(function () {
    const ss = planilha_();
    ss.insertSheet('calendario de ciclos').getRange(1, 1, 8, 4).setValues([
      ['Marca', 'Ciclo', 'Data de início', 'Fim'],
      ['Boticário', 'Ciclo exemplo', new Date(2026, 9, 1), '21/10/2026'],
      ['Boticário', ' Ciclo  exemplo cheio ', '2026-10-24', '11/11/2026'],
      ['Eudora', 'Ciclo exemplo', '05/10/2026', '25/10/2026'],
      ['EUD', 'Ciclo exemplo', '05/10/2026', '25/10/2026'],
      ['Boticário', 'C sem data', 'amanhã', '25/10/2026'],
      ['Boticário', 'C invertido', '25/10/2026', '01/10/2026'],
      ['Eudora', 'Ciclo exemplo cheio', '20/10/2026', '15/11/2026'],
    ]);
    ss.insertSheet('Feriados').getRange(1, 1, 4, 2).setValues([['Data', 'Nome'], ['12/10/2026', 'Nossa Senhora Aparecida'], ['02/11/2026', ''], ['xx', 'ruim']]);
  })()`);
  cal = run('getDados()').calendario;
  assert.deepEqual(cal.ciclos.BOT, [
    { ciclo: 'Ciclo exemplo', inicio: '2026-10-01', fim: '2026-10-21' },
    { ciclo: 'Ciclo exemplo cheio', inicio: '2026-10-24', fim: '2026-11-11' },
  ]);
  assert.deepEqual(cal.ciclos.EUD.map((c) => c.ciclo), ['Ciclo exemplo', 'Ciclo exemplo cheio']);
  assert.deepEqual(cal.feriados, [{ data: '2026-10-12', nome: 'Nossa Senhora Aparecida' }, { data: '2026-11-02', nome: 'Feriado' }]);
  const avisos = cal.avisos.join('\n');
  assert.match(avisos, /linha 5: o Ciclo exemplo já aparece antes no calendário Eudora/);
  assert.match(avisos, /C sem data\): o início ou o fim não é uma data/);
  assert.match(avisos, /C invertido\): o fim vem antes do início/);
  assert.match(avisos, /Eudora, o Ciclo exemplo cheio se sobrepõe ao Ciclo exemplo/);
  assert.match(avisos, /Feriados, linha 4: "xx" não é uma data/);
  assert.ok(run('getDados()').avisos.some((a) => /C invertido/.test(a)), 'os avisos aparecem no app');
  // Observações (não impedem nada): dias sem ciclo e começo num fim de semana ou feriado.
  assert.deepEqual(cal.observacoes, [
    'Boticário: 2 dias sem ciclo entre o Ciclo exemplo e o Ciclo exemplo cheio.',
    'Boticário: o Ciclo exemplo cheio começa num fim de semana (24/10/2026).',
  ]);
  assert.equal(run("diasUteis_('2026-10-01', '2026-10-21', [{ data: '2026-10-12' }])"), 14);

  // Criar a planilha do calendário: leva as abas da principal e passa a ler dela.
  assert.equal(run(`getPlanilhas(${DEV})`).calendario, null);
  assert.throws(() => run("mudarPlanilhaCalendario({ senha: 'x' }, { acao: 'criar' })"), /Senha incorreta/);
  const info = run(`mudarPlanilhaCalendario(${DEV}, { acao: 'criar' })`);
  const idCal = info.calendario.id;
  const nova = f.outras[idCal];
  assert.ok(nova.getSheetByName('Calendário de ciclos').getLastRow() > 5, 'ciclos levados para a planilha nova');
  assert.ok(nova.getSheetByName('Feriados'), 'feriados levados para a planilha nova');
  assert.ok(!nova.getSheetByName('Página1'), 'sem a aba vazia da planilha nova');
  assert.equal(info.leituraCalendario.ciclos.find((c) => c.cod === 'BOT').qtd, 2);
  run("planilha_().getSheetByName('calendario de ciclos').getRange(2, 2, 1, 1).setValues([['Outro nome']])");
  assert.equal(run('getDados()').calendario.ciclos.BOT[0].ciclo, 'Ciclo exemplo', 'lê da planilha vinculada, não da principal');

  // Desvincular: volta a ler as abas da principal.
  run(`mudarPlanilhaCalendario(${DEV}, { acao: 'desvincular' })`);
  assert.equal(run(`getPlanilhas(${DEV})`).calendario, null);
  assert.equal(run('getDados()').calendario.ciclos.BOT[0].ciclo, 'Outro nome');
  assert.throws(() => run(`mudarPlanilhaCalendario(${DEV}, { acao: 'desvincular' })`), /Nenhuma planilha/);

  // Vincular uma planilha que já existe: as abas que faltam são criadas, só com o cabeçalho.
  const outra = run("SpreadsheetApp.create('Calendário corporativo').getId()");
  const idLongo = outra + 'XXXXXXXXXXXXXXXXXXXXXX';
  f.outras[idLongo] = f.outras[outra];
  assert.throws(() => run(`mudarPlanilhaCalendario(${DEV}, { acao: 'vincular', url: 'abc' })`), /Cole o link/);
  assert.throws(() => run(`mudarPlanilhaCalendario(${DEV}, { acao: 'vincular', url: 'https://docs.google.com/spreadsheets/d/TESTE00000000000000000000/edit' })`), /principal/);
  const v = run(`mudarPlanilhaCalendario(${DEV}, { acao: 'vincular', url: 'https://docs.google.com/spreadsheets/d/${idLongo}/edit' })`);
  assert.equal(v.calendario.id, outra);
  assert.deepEqual(f.outras[outra].getSheetByName('Calendário de ciclos').getRange(1, 1, 1, 4).getValues()[0], ['Marca', 'Ciclo', 'Início', 'Fim']);
  assert.deepEqual(f.outras[outra].getSheetByName('Feriados').getRange(1, 1, 1, 2).getValues()[0], ['Data', 'Feriado']);
  assert.deepEqual(v.leituraCalendario.abas, { ciclos: true, feriados: true });
  assert.deepEqual(run('getDados()').calendario.ciclos, { BOT: [], EUD: [] });

  // Planilha vinculada que sumiu: o app abre, com o aviso.
  f.propriedades.CALENDARIO_SPREADSHEET_ID = 'EXTRA_SUMIU';
  const d = run('getDados()');
  assert.ok(d.avisos.some((a) => /planilha do calendário/.test(a)));
  assert.match(run(`getPlanilhas(${DEV})`).calendario.erro, /Não consegui abrir/);
});

test('ordem dos movimentos no calendário: o construtor salva a ordem de um ciclo e pode voltar à automática', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  const C = "{ papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' }";
  const V = "{ papel: 'VALIDADOR', senha: 'validacao_exposicao', nome: 'Ana' }";
  const salvar = (acesso, pedido) => run(`salvarOrdemCalendario(${acesso}, ${JSON.stringify(pedido)})`);
  assert.deepEqual(run('getDados()').ordemCalendario, {}, 'sem ordem salva');
  assert.throws(() => salvar(V, { ciclo: 'Ciclo exemplo', movimentos: ['BOTIPROMO'] }), /Só o construtor/);
  assert.throws(() => salvar(C, { ciclo: 'Não existe', movimentos: ['BOTIPROMO'] }), /não existe no app/);
  assert.throws(() => salvar(C, { ciclo: 'Ciclo exemplo', movimentos: [] }), /ao menos um movimento/);

  // A observação depois do "|" e as repetições saem; a ordem fica na aba e chega na página.
  salvar(C, { ciclo: 'Ciclo exemplo', movimentos: ['LÇTO EGEO', 'botipromo', 'BOTIPROMO | só no kit', 'OUTLET EUD'] });
  salvar(C, { ciclo: 'Ciclo exemplo cheio', movimentos: ['JUICY MOOD'] });
  let ordem = run('getDados()').ordemCalendario;
  assert.deepEqual(ordem['Ciclo exemplo'].movimentos, ['LÇTO EGEO', 'botipromo', 'OUTLET EUD']);
  assert.equal(ordem['Ciclo exemplo'].por, 'Bia');
  assert.deepEqual(ordem['Ciclo exemplo cheio'].movimentos, ['JUICY MOOD']);
  const aba = f.planilha.getSheetByName('Ordem do calendário');
  assert.deepEqual(aba.getRange(1, 1, 1, 3).getValues()[0], ['Ciclo', 'Posição', 'Movimento (etiqueta)']);

  // Salvar de novo troca só aquele ciclo; limpar volta à ordem automática.
  salvar(C, { ciclo: 'Ciclo exemplo', movimentos: ['OUTLET EUD', 'LÇTO EGEO'] });
  ordem = run('getDados()').ordemCalendario;
  assert.deepEqual(ordem['Ciclo exemplo'].movimentos, ['OUTLET EUD', 'LÇTO EGEO']);
  assert.deepEqual(ordem['Ciclo exemplo cheio'].movimentos, ['JUICY MOOD']);
  salvar(C, { ciclo: 'Ciclo exemplo', limpar: true });
  assert.deepEqual(Object.keys(run('getDados()').ordemCalendario), ['Ciclo exemplo cheio']);
});

test('selos dos movimentos no calendário: hotspot e medalha (ouro, prata, bronze), só o construtor', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  const C = "{ papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' }";
  const V = "{ papel: 'VALIDADOR', senha: 'validacao_exposicao', nome: 'Ana' }";
  const salvar = (acesso, pedido) => run(`salvarSelosCalendario(${acesso}, ${JSON.stringify(pedido)})`);
  assert.deepEqual(run('getDados()').selosCalendario, {});
  assert.deepEqual(Object.keys(run('getDados()').medalhas), ['OURO', 'PRATA', 'BRONZE']);
  assert.throws(() => salvar(V, { ciclo: 'Ciclo exemplo', selos: [{ movimento: 'BOTIPROMO', hotspot: true }] }), /Só o construtor/);
  assert.throws(() => salvar(C, { ciclo: 'Outro', selos: [] }), /não existe no app/);
  assert.throws(() => salvar(C, { ciclo: 'Ciclo exemplo', selos: [{ movimento: 'BOTIPROMO', medalha: 'platina' }] }), /Medalha desconhecida/);

  salvar(C, { ciclo: 'Ciclo exemplo', selos: [
    { movimento: 'BOTIPROMO | kit', hotspot: true, medalha: 'ouro' },
    { movimento: 'LÇTO EGEO', medalha: 'PRATA' },
    { movimento: 'JUICY MOOD', hotspot: false, medalha: '' }, // sem selo: não entra
  ] });
  salvar(C, { ciclo: 'Ciclo exemplo cheio', selos: [{ movimento: 'BOTIK', medalha: 'Bronze' }] });
  let selos = run('getDados()').selosCalendario;
  assert.deepEqual(selos['Ciclo exemplo'], {
    BOTIPROMO: { texto: 'BOTIPROMO', hotspot: true, medalha: 'OURO' },
    'LÇTO EGEO': { texto: 'LÇTO EGEO', hotspot: false, medalha: 'PRATA' },
  });
  assert.equal(selos['Ciclo exemplo cheio'].BOTIK.medalha, 'BRONZE');
  const aba = f.planilha.getSheetByName('Selos dos movimentos');
  assert.deepEqual(aba.getRange(2, 1, 1, 4).getValues()[0], ['Ciclo exemplo', 'BOTIPROMO', 'SIM', 'Ouro']);

  // Salvar de novo troca só os do ciclo; a aba editada à mão também vale ("x" no hotspot, "ouro" minúsculo).
  salvar(C, { ciclo: 'Ciclo exemplo', selos: [] });
  selos = run('getDados()').selosCalendario;
  assert.ok(!selos['Ciclo exemplo'] && selos['Ciclo exemplo cheio']);
  run("planilha_().getSheetByName('Selos dos movimentos').getRange(3, 1, 1, 4).setValues([['Ciclo exemplo', 'JUICY MOOD', 'x', 'ouro']])");
  assert.deepEqual(run('getDados()').selosCalendario['Ciclo exemplo']['JUICY MOOD'], { texto: 'JUICY MOOD', hotspot: true, medalha: 'OURO' });
});

/** Drive em memória (DriveApp e Utilities), só o que a pasta dos briefings usa. */
function driveFalso() {
  const pastas = {};
  let n = 0;
  const iterador = (l) => { let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; };
  const pasta = (nome) => {
    const id = 'PASTA' + (++n) + 'ABCDEFGHIJKL';
    const p = {
      nome, filhos: [], arquivos: [],
      getId: () => id, getName: () => nome, getUrl: () => 'https://drive.google.com/drive/folders/' + id,
      getFoldersByName: (x) => iterador(p.filhos.filter((f) => f.nome === x)),
      createFolder: (x) => { const f = pasta(x); p.filhos.push(f); return f; },
      getFilesByName: (x) => iterador(p.arquivos.filter((a) => a.nome === x && !a.lixeira)),
      createFile: (blob) => {
        const a = { nome: blob.nome, tipo: blob.tipo, texto: Buffer.from(blob.bytes).toString(), lixeira: false, descricao: '' };
        Object.assign(a, { setTrashed: (v) => { a.lixeira = v; }, setDescription: (d) => { a.descricao = d; }, getUrl: () => 'https://drive.google.com/file/d/' + a.nome });
        p.arquivos.push(a);
        return a;
      },
    };
    pastas[id] = p;
    return p;
  };
  return {
    pastas,
    globais: {
      DriveApp: { createFolder: pasta, getFolderById: (id) => { if (!pastas[id]) throw new Error('Pasta não encontrada'); return pastas[id]; } },
      Utilities: { base64Decode: (b) => Array.from(Buffer.from(b, 'base64')), newBlob: (bytes, tipo, nome) => ({ bytes, tipo, nome }) },
    },
  };
}

test('briefing na pasta do Drive: o desenvolvedor vincula a pasta; a Construção salva numa subpasta por ciclo, substituindo', () => {
  const f = servicosFalsos({ vinculada: true });
  const drive = driveFalso();
  const { run } = carregarGas(Object.assign(f.globais, drive.globais));
  configurarComExemplo(run);
  const C = "{ papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' }";
  const V = "{ papel: 'VALIDADOR', senha: 'validacao_exposicao', nome: 'Ana' }";
  const pdf = (t) => Buffer.from(t).toString('base64');
  const salvar = (acesso, pedido) => run(`salvarBriefingNoDrive(${acesso}, ${JSON.stringify(pedido)})`);
  assert.equal(run('getDados()').pastaBriefings, false);
  assert.equal(run(`getPlanilhas(${DEV})`).pastaBriefings, null);
  assert.throws(() => salvar(C, { ciclo: 'C15/2026', er: 'ER M', base64: pdf('PDF') }), /Nenhuma pasta do Drive vinculada/);

  // Criar a pasta (só o desenvolvedor).
  assert.throws(() => run("mudarPastaBriefings({ senha: 'x' }, { acao: 'criar' })"), /Senha incorreta/);
  const info = run(`mudarPastaBriefings(${DEV}, { acao: 'criar' })`);
  assert.equal(info.pastaBriefings.nome, 'Plano de Varejo – Briefings');
  assert.equal(run('getDados()').pastaBriefings, true);
  const raiz = drive.pastas[info.pastaBriefings.id];

  // Só a Construção salva; o nome leva o ciclo e a ER; a subpasta é a do ciclo.
  assert.throws(() => salvar(V, { ciclo: 'C15/2026', er: 'ER M', base64: pdf('PDF') }), /Só quem entrou na Construção/);
  assert.throws(() => salvar(C, { ciclo: '', er: 'ER M', base64: pdf('PDF') }), /Escolha um ciclo/);
  let r = salvar(C, { ciclo: 'C15/2026', er: 'ER M', base64: 'data:application/pdf;base64,' + pdf('PDF 1') });
  assert.deepEqual([r.nome, r.pasta, r.substituidos], ['Briefing - C15-2026 - ER M.pdf', 'C15-2026', 0]);
  assert.ok(r.url && r.pastaUrl);
  // De novo: substitui (o anterior vai para a lixeira); a subpasta é a mesma.
  r = salvar(C, { ciclo: 'C15/2026', er: 'ER M', base64: pdf('PDF 2') });
  assert.equal(r.substituidos, 1);
  salvar(C, { ciclo: 'C15/2026', er: '', base64: pdf('TODAS') });
  salvar(C, { ciclo: 'C16/2026', er: 'ER P', base64: pdf('OUTRO') });
  assert.deepEqual(raiz.filhos.map((x) => x.nome), ['C15-2026', 'C16-2026']);
  const ativos = raiz.filhos[0].arquivos.filter((a) => !a.lixeira);
  assert.deepEqual(ativos.map((a) => [a.nome, a.texto, a.tipo]), [
    ['Briefing - C15-2026 - ER M.pdf', 'PDF 2', 'application/pdf'],
    ['Briefing - C15-2026 - Todas as ERs.pdf', 'TODAS', 'application/pdf'],
  ]);
  assert.match(ativos[0].descricao, /salvo por Bia/);

  // Vincular outra pasta (link do Drive) e desvincular.
  const outra = run("DriveApp.createFolder('Briefings 2027').getId()");
  assert.throws(() => run(`mudarPastaBriefings(${DEV}, { acao: 'vincular', url: 'abc' })`), /Cole o link/);
  assert.throws(() => run(`mudarPastaBriefings(${DEV}, { acao: 'vincular', url: 'https://drive.google.com/drive/folders/NAOEXISTE123456' })`), /Não consegui abrir essa pasta/);
  assert.equal(run(`mudarPastaBriefings(${DEV}, { acao: 'vincular', url: 'https://drive.google.com/drive/folders/${outra}?usp=sharing' })`).pastaBriefings.nome, 'Briefings 2027');
  run(`mudarPastaBriefings(${DEV}, { acao: 'desvincular' })`);
  assert.equal(run('getDados()').pastaBriefings, false);
  assert.throws(() => run(`mudarPastaBriefings(${DEV}, { acao: 'desvincular' })`), /Nenhuma pasta/);
});

test('planilha separada para o layout: criar, ler e gravar nela, vincular e voltar para a principal', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  assert.throws(() => run("getPlanilhas({ senha: 'x' })"), /Senha incorreta/);
  assert.equal(run(`getPlanilhas(${DEV})`).layout, null, 'o layout começa na principal');

  const info = run(`mudarPlanilhaLayout(${DEV}, { acao: 'criar' })`);
  assert.equal(info.layout.id, 'EXTRA1');
  const separada = f.outras.EXTRA1;
  assert.ok(separada.getSheetByName('Layout').getLastRow() > 10, 'layout copiado para a planilha nova');
  assert.ok(!separada.getSheetByName('Página1'), 'sem a aba vazia da planilha nova');
  assert.ok(!f.planilha.getSheetByName('Layout'), 'a principal não tem mais a aba Layout');
  assert.ok(f.planilha.getSheetByName('Layout (antigo)'), 'a antiga fica guardada com outro nome');
  assert.deepEqual(run('getDados()').plantas.map((p) => p.id), ['01', '02', '03', '04'], 'lê o layout da planilha separada');

  // Construir loja e Ajustar etiquetas gravam na planilha separada.
  const layout = "{ loja: { largura: 10, profundidade: 8, alturaParede: 3 }, moveis: [{ id: 'PIRAMIDE 1', tipo: 'PIRAMIDE', x: 1, y: 1, w: 1, d: 1, h: 2 }] }";
  run(`salvarLayout(${DEV}, '01', ${layout})`);
  run("salvarAjustesEtiquetas('01', { 'PIRAMIDE 1': { x: 5, y: 6 } })");
  assert.ok(!f.planilha.getSheetByName('Layout'));
  const p1 = run('getDados()').plantas.find((p) => p.id === '01');
  assert.deepEqual(p1.moveis.map((m) => [m.id, m.ajusteX, m.ajusteY]), [['PIRAMIDE 1', 5, 6]]);

  // Vincular: link inválido, a própria principal e uma planilha que já tem o layout (vale o que está nela).
  assert.throws(() => run(`mudarPlanilhaLayout(${DEV}, { acao: 'vincular', url: 'abc' })`), /Cole o link/);
  assert.throws(() => run(`mudarPlanilhaLayout(${DEV}, { acao: 'vincular', url: 'https://docs.google.com/spreadsheets/d/TESTE00000000000000000000/edit' })`), /principal/);

  // Voltar: o layout (com a mudança) volta para a principal.
  run(`mudarPlanilhaLayout(${DEV}, { acao: 'voltar' })`);
  assert.equal(run(`getPlanilhas(${DEV})`).layout, null);
  assert.ok(f.planilha.getSheetByName('Layout'));
  assert.equal(run('getDados()').plantas.find((p) => p.id === '01').moveis.length, 1);
});

test('regra de validação da planilha que rejeita valores não impede o app de gravar', () => {
  // Planilha com a coluna Classificação validada à mão ("rejeitar entrada"), com outra lista de valores.
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  const aba = f.planilha.getSheetByName('Tipos de movimento');
  const lista = ['Promoção', 'Exaustão', 'Institucional', 'Lançamento'];
  aba.getRange(2, 3, 500, 1).setDataValidation(f.globais.SpreadsheetApp.newDataValidation().requireValueInList(lista).setAllowInvalid(false).build());
  aba.getRange(2, 3).setValue('Exaustão');
  assert.throws(() => aba.getRange(3, 3).setValue('Baseline'), /violam/, 'a planilha falsa barra como o Sheets');
  // O app regrava a aba inteira (ex.: ao importar ou aprovar um ciclo) com outras classificações.
  const r = run(`importarPlanilha(${DEV}, { tipos: [['Ciclo', 'Movimento (etiqueta)', 'Classificação', 'GMV esperado (R$)'], ['C1', 'LÇTO X', 'Liquidação / outlet', '100']] })`);
  assert.equal(r.tipos, 1);
  const regra = aba._aba.validacoes.find((x) => x.c === 3);
  assert.ok(regra && regra.permite, 'a regra da coluna passa a só avisar');
  assert.ok(regra.lista.includes('Exaustão'), 'a lista mantém as classificações já usadas na coluna');
  assert.ok(regra.lista.includes('Liquidação / outlet'));
  assert.equal(run('getDados()').tiposMovimento.C1['LÇTO X'].classificacao, 'LIQUIDACAO');
});

test('validação: senha por papel, quem pode o quê e aba Comentários', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  const V = "{ papel: 'validador', senha: 'validacao_exposicao', nome: 'Ana' }";
  const C = "{ papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' }";
  assert.deepEqual(run(`entrarValidacao(${V})`), { papel: 'VALIDADOR', autor: 'Ana', nomePapel: 'Validador' });
  assert.throws(() => run("entrarValidacao({ papel: 'VALIDADOR', senha: '0000', nome: 'Ana' })"), /Senha incorreta/);
  // Cada módulo tem a sua senha: a da construção não entra na validação, e vice-versa.
  assert.throws(() => run("entrarValidacao({ papel: 'VALIDADOR', senha: 'construcao_exposicao', nome: 'Ana' })"), /Senha incorreta/);
  assert.throws(() => run("entrarValidacao({ papel: 'CONSTRUTOR', senha: 'validacao_exposicao', nome: 'Bia' })"), /Senha incorreta/);
  assert.equal(run(`entrarValidacao(${C})`).papel, 'CONSTRUTOR');
  assert.throws(() => run("entrarValidacao({ papel: 'VALIDADOR', senha: 'validacao_exposicao', nome: ' ' })"), /nome/);
  assert.throws(() => run("entrarValidacao({ papel: 'CHEFE', senha: 'validacao_exposicao', nome: 'X' })"), /Escolha o módulo/);

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
  assert.deepEqual(aba[0], ['ID', 'Responde a', 'Ciclo', 'Planta', 'ID Móvel', 'Papel', 'Autor', 'Data', 'Texto', 'Status', 'Tipo']);
  assert.equal(aba[1][3], 'ER P', 'planta gravada pelo nome');
  assert.equal(aba.length, 3, 'comentário + resposta');
  assert.deepEqual([aba[1][10], aba[2][10]], ['Ciclo', 'Ciclo'], 'sem tipo: comentário da construção do ciclo');
  assert.equal(l[0].tipo, 'CICLO');

  // Comentário da aba Planograma (os produtos das prateleiras): separado dos do ciclo; a resposta fica no tipo dele.
  l = run(`salvarComentario(${V}, { acao: 'novo', ciclo: 'C1', planta: 'ER P', movel: 'GONDOLA 1', tipo: 'planograma', texto: 'Faltam frentes no meio A' })`);
  const idP = l[1].id;
  assert.deepEqual(l.map((c) => c.tipo), ['CICLO', 'PLANOGRAMA']);
  l = run(`salvarComentario(${C}, { acao: 'responder', id: '${idP}', texto: 'Ajustei' })`);
  assert.equal(run("lerComentariosDaPlanilha_(planilha_())")[4][10], 'Planograma', 'a resposta é do planograma');
  // Comentários de antes (sem a coluna Tipo) contam como do ciclo.
  assert.equal(run("comentariosDeValores_([['ID', 'Texto'], ['X1', 'antigo']])")[0].tipo, 'CICLO');
  run(`salvarComentario(${V}, { acao: 'excluir', id: '${idP}' })`);

  l = run(`salvarComentario(${V}, { acao: 'excluir', id: '${id}' })`);
  assert.deepEqual(l, []);
  assert.equal(run("lerComentariosDaPlanilha_(planilha_())").length, 1, 'resposta sai junto');
});

test('ciclo em construção: criar, editar, enviar, devolver e publicar', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  const V = "{ papel: 'VALIDADOR', senha: 'validacao_exposicao', nome: 'Ana' }";
  const C = "{ papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' }";
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
  // Duas marcas no espaço e na etiqueta (até duas, ou MM): gravadas como "BOT+QDB" e lidas de volta.
  r = salvar(C, { acao: 'salvarEspaco', ciclo: 'C11', planta: 'ER M', movel: 'PIRAMIDE 1', linha: {
    marca: 'bot+qdb', etiquetas: [{ texto: 'BOTIPROMO', marca: 'EUD+OUI' }, { texto: 'LÇTO EGEO', marca: 'MULTI' }],
  } });
  assert.deepEqual(r.movimentos.C11['02']['PIRAMIDE 1'].marca, 'BOT+QDB');
  assert.deepEqual(r.movimentos.C11['02']['PIRAMIDE 1'].etiquetas.map((e) => e.marca), ['EUD+OUI', 'MULTI']);
  r = salvar(C, { acao: 'salvarEspaco', ciclo: 'C11', planta: 'ER M', movel: 'PIRAMIDE 1', linha: { etiquetas: [] } });
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

  // Enviar trava a edição; devolver vira comentário e destrava.
  assert.throws(() => salvar(V, { acao: 'enviar', ciclo: 'C11' }), /Só o construtor/);
  r = salvar(C, { acao: 'enviar', ciclo: 'C11' });
  assert.equal(r.rascunhos[0].status, 'ENVIADO');
  assert.throws(() => salvar(C, { acao: 'salvarEspaco', ciclo: 'C11', planta: '01', movel: 'PIRAMIDE 1', linha: { marca: 'BOT' } }), /foi enviado/);
  assert.throws(() => salvar(V, { acao: 'devolver', ciclo: 'C11', motivo: ' ' }), /Escreva/);
  r = salvar(V, { acao: 'devolver', ciclo: 'C11', planta: 'ER G', motivo: 'Faltou a pirâmide' });
  assert.equal(r.rascunhos[0].status, 'EM_CONSTRUCAO');
  const coment = run(`getComentarios(${V})`);
  assert.deepEqual(coment.map((c) => [c.ciclo, c.planta, c.texto]), [['C11', '03', 'Devolvido para ajustes: Faltou a pirâmide']]);

  // Aprovar: as linhas vão para as abas publicadas e saem das de rascunho (os tipos que nenhum espaço usa ficam de fora).
  salvar(C, { acao: 'enviar', ciclo: 'C11' });
  r = salvar(V, { acao: 'aprovar', ciclo: 'C11' });
  assert.deepEqual(r.rascunhos, []);
  assert.ok(!r.movimentos.C11);
  const d = run('getDados()');
  assert.ok(d.ciclos.includes('C11') && d.ciclos.includes('Ciclo exemplo'));
  assert.deepEqual(d.paineis.C11['01'], [{ secao: 'TV', texto: 'GRADE NOVA', marca: 'MULTI', movel: '' }]);
  assert.equal(d.tiposMovimento.C11.BOTIPROMO.gmv, 1500000);
  assert.equal(d.tiposMovimento.C11['NÃO USADO'].gmv, 5, 'os tipos ainda sem espaço também entram na aba');
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
  assert.throws(() => salvar(C, { acao: 'aprovar', ciclo: 'C12' }), /Passo 2: o ciclo está vazio/);
  r = salvar(C, { acao: 'excluir', ciclo: 'C12' });
  assert.deepEqual(r.rascunhos, []);

  // Publicar direto da construção (construtor ou validador), sem enviar: confere só os espaços; GMV pode faltar.
  salvar(C, { acao: 'criar', ciclo: 'C15' });
  salvar(C, { acao: 'salvarTipos', ciclo: 'C15', linhas: [{ etiqueta: 'SEM GMV' }] });
  salvar(C, { acao: 'salvarEspaco', ciclo: 'C15', planta: '01', movel: 'PIRAMIDE 1', linha: { marca: 'BOT', etiquetas: [{ texto: 'SEM GMV' }] } });
  assert.throws(() => run("salvarRascunho({ papel: 'VALIDADOR', senha: 'x', nome: 'Ana' }, { acao: 'aprovar', ciclo: 'C15' })"), /Senha incorreta/);
  r = salvar(C, { acao: 'aprovar', ciclo: 'C15' });
  assert.deepEqual(r.rascunhos, []);
  assert.ok(run('getDados()').ciclos.includes('C15'));
  salvar(C, { acao: 'criar', ciclo: 'C16', origem: 'C15' });
  r = salvar(V, { acao: 'aprovar', ciclo: 'C16' });
  assert.ok(run('getDados()').ciclos.includes('C16'), 'o validador também publica um ciclo ainda em construção');

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
  assert.ok(!d.avisos.some((a) => /NÃO EXISTE/.test(a) && !/GMV/.test(a)), 'movimento cadastrado sem espaço é válido');
  assert.ok(d.avisos.some((a) => /GMV esperado "x"/.test(a)));
  assert.deepEqual(d.ciclos, ['C1'], 'a aba não cria ciclos sozinha');
  const ex = run('montarDados_(valoresLayoutPadrao_(), valoresMovimentosExemplo_(), valoresPaineisExemplo_(), valoresTiposExemplo_())');
  assert.deepEqual(ex.avisos, [], 'exemplo sem avisos');
  assert.equal(ex.tiposMovimento['Ciclo exemplo']['LÇTO EGEO'].classificacao, 'LANCAMENTO');
});

test('importar aba Tipos de movimento substitui só o ciclo presente', () => {
  const f = servicosFalsos();
  const { ctx, run } = carregarGas(f.globais);
  configurarComExemplo(run);
  ctx.__tipos = { tipos: [
    ['Ciclo', 'Movimento (etiqueta)', 'Classificação', 'GMV esperado (R$)'],
    ['C20', 'BOTIPROMO', 'Promoção', 300000],
  ] };
  assert.equal(run(`importarPlanilha(${DEV}, __tipos)`).tipos, 1);
  const d = run('getDados()');
  assert.equal(d.tiposMovimento.C20.BOTIPROMO.gmv, 300000);
  assert.ok(Object.keys(d.tiposMovimento['Ciclo exemplo']).length > 10, 'exemplo mantido');
});

test('tamanho das etiquetas da planta fica na linha LOJA do Layout', () => {
  const f = servicosFalsos();
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
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
  configurarComExemplo(run);
  const V = "{ papel: 'VALIDADOR', senha: 'validacao_exposicao', nome: 'Ana' }";
  const C = "{ papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' }";
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

test('prateleiras: quadrados desenhados em cada prateleira, com produtos da aba Produtos', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  const V = "{ papel: 'VALIDADOR', senha: 'validacao_exposicao', nome: 'Ana' }";
  const C = "{ papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' }";
  // As prateleiras são da Construção (aba Planograma, na tela): o mesmo construtor do ciclo.
  const P = C;
  const salvar = (quem, pedido) => run(`salvarPrateleiras(${quem}, ${JSON.stringify(pedido)})`);
  let d = run('getDados()');
  assert.deepEqual(d.prateleiras, []);
  // O catálogo vem da aba Produtos (criada com os produtos de exemplo).
  assert.ok(d.produtos.length >= 10);
  assert.deepEqual(Object.keys(d.produtos[0]), ['sku', 'nome', 'marca', 'categoria', 'movimento']);
  assert.ok(run(`lerAba_(planilha_(), 'Produtos', true)`)[0].includes('SKU'));

  const prateleiras = [
    { numero: 1, quadrados: [
      { x: 0, y: 0, w: 60, h: 100, movimento: 'LÇTO EGEO', observacao: 'altura dos olhos', produtos: [{ sku: '48211', frentes: 3 }, { sku: ' 48212 ', frentes: '2' }] },
      { x: 60, y: 0, w: 20, h: 50, movimento: 'BOTIPROMO', produtos: [] }, // a altura é ignorada: todos na altura toda
      { x: 80, w: 20, movimento: 'BOTIPROMO', produtos: [{ sku: '50110' }] },
    ] },
    { numero: 4, quadrados: [{ x: 10, y: 0, w: 30, h: 100, produtos: [{ sku: '90001', frentes: 0 }] }] },
  ];
  const base = { acao: 'salvar', ciclo: 'Ciclo exemplo', planta: 'ER M', espaco: 'Gondola 1 / ponta a', prateleiras };
  assert.throws(() => salvar(V, base), /Só a Construção \(aba Planograma\)/);
  assert.throws(() => salvar(P, Object.assign({}, base, { ciclo: 'C99' })), /não foi encontrado/);
  assert.throws(() => salvar(P, Object.assign({}, base, { espaco: 'GONDOLA 1' })), /Escolha o espaço/);
  assert.throws(() => salvar(P, Object.assign({}, base, { espaco: 'TOTEM 1/PAINEL-1' })), /não leva produtos/);
  assert.throws(() => salvar(P, Object.assign({}, base, { espaco: 'MESA DESTAQUE 1/VERSO' })), /não tem prateleiras/);
  assert.throws(() => salvar(P, Object.assign({}, base, { prateleiras: [{ numero: 5, quadrados: [] }] })), /vai de 1 a 4/);
  const comQuadrados = (q) => Object.assign({}, base, { prateleiras: [{ numero: 1, quadrados: q }] });
  assert.throws(() => salvar(P, comQuadrados([{ x: 0, w: 50 }, { x: 40, w: 30 }])), /sobrepostos/);
  // Um quadrado não fica em cima do outro: as alturas não contam, então dois na mesma largura se sobrepõem.
  assert.throws(() => salvar(P, comQuadrados([{ x: 0, y: 0, w: 50, h: 50 }, { x: 0, y: 50, w: 50, h: 50 }])), /sobrepostos/);
  assert.throws(() => salvar(P, comQuadrados([{ x: 0, y: 0, w: 1, h: 100 }])), /pequeno demais/);
  assert.throws(() => salvar(P, comQuadrados([{ x: 0, y: 0, w: 50, h: 100, produtos: [{ sku: 'NAO-EXISTE' }] }])), /fora da aba Produtos: SKU "NAO-EXISTE"/);

  let l = salvar(P, base);
  assert.equal(l.length, 1);
  assert.deepEqual([l[0].ciclo, l[0].planta, l[0].espaco, l[0].autor], ['Ciclo exemplo', '02', 'GONDOLA 1/PONTA-A', 'Bia']);
  const p1 = l[0].prateleiras[0];
  assert.equal(p1.movimento, 'LÇTO EGEO', 'o movimento da prateleira é o do maior quadrado');
  assert.deepEqual(p1.quadrados.map((q) => [q.x, q.y, q.w, q.h, q.movimento, q.produtos.length]),
    [[0, 0, 60, 100, 'LÇTO EGEO', 2], [60, 0, 20, 100, 'BOTIPROMO', 0], [80, 0, 20, 100, 'BOTIPROMO', 1]]);
  assert.deepEqual(p1.quadrados[0].produtos.map((x) => [x.sku, x.frentes, x.foraDoCatalogo]), [['48211', 3, false], ['48212', 2, false]]);
  assert.match(p1.quadrados[0].produtos[0].nome, /Egeo Dolce/, 'o nome vem do catálogo');
  assert.equal(p1.quadrados[0].observacao, 'altura dos olhos');
  assert.equal(l[0].prateleiras[1].quadrados[0].produtos[0].frentes, 1, 'frentes vazias ou inválidas = 1');
  const aba = run(`lerAba_(planilha_(), 'Prateleiras', true)`);
  assert.deepEqual(aba[0].slice(0, 11), ['Ciclo', 'Planta', 'ID Móvel', 'Prateleira', 'Quadrado', 'X (%)', 'Largura (%)', 'Movimento (etiqueta)', 'SKU', 'Produto', 'Frentes']);
  assert.equal(aba.length, 1 + 5, 'uma linha por produto e uma pelo quadrado sem produto');

  // Quem tira um produto da aba Produtos continua vendo o quadrado, com o produto marcado.
  run(`escreverAba_(planilha_(), 'Produtos', colunasProdutos_(), [['SKU', 'Produto'], ['48212', 'Egeo Bomb']])`);
  d = run('getDados()');
  const q0 = d.prateleiras[0].prateleiras[0].quadrados[0];
  assert.deepEqual(q0.produtos.map((x) => [x.sku, x.foraDoCatalogo]), [['48211', true], ['48212', false]]);
  run(`escreverAba_(planilha_(), 'Produtos', colunasProdutos_(), valoresProdutosExemplo_())`);

  // Móveis de um espaço só usam o ID do móvel; o móvel make, as prateleiras do corpo; a mesa, o nicho de cada frente.
  salvar(P, { acao: 'salvar', ciclo: 'Ciclo exemplo', planta: 'ER M', espaco: 'MOVEL MAKE 1', prateleiras: [{ numero: 5, quadrados: [{ x: 0, y: 0, w: 100, h: 100, produtos: [{ sku: '61030' }] }] }] });
  assert.throws(() => salvar(P, { acao: 'salvar', ciclo: 'Ciclo exemplo', planta: 'ER M', espaco: 'MESA DESTAQUE 1/FRENTE-1', prateleiras: [{ numero: 2, quadrados: [] }] }), /vai de 1 a 1/);
  // A pirâmide: os 4 lados, do mesmo tamanho, cada um com as 4 prateleiras.
  assert.throws(() => salvar(P, { acao: 'salvar', ciclo: 'Ciclo exemplo', planta: 'ER P', espaco: 'PIRAMIDE 1', prateleiras: [] }), /Escolha o espaço/);
  assert.throws(() => salvar(P, { acao: 'salvar', ciclo: 'Ciclo exemplo', planta: 'ER P', espaco: 'PIRAMIDE 1/LADO-5', prateleiras: [] }), /não tem prateleiras/);
  assert.throws(() => salvar(P, { acao: 'salvar', ciclo: 'Ciclo exemplo', planta: 'ER P', espaco: 'PIRAMIDE 1/LADO-2', prateleiras: [{ numero: 5, quadrados: [] }] }), /vai de 1 a 4/);
  // Todas as ERs: cada ER que tem o espaço recebe as mesmas prateleiras.
  const umQuadrado = [{ numero: 2, quadrados: [{ x: 0, y: 0, w: 100, h: 100, produtos: [{ sku: '50111' }] }] }];
  l = salvar(P, { acao: 'salvar', ciclo: 'Ciclo exemplo', planta: 'TODAS', espaco: 'piramide 1/lado 2', prateleiras: umQuadrado });
  assert.deepEqual(l.filter((g) => g.espaco === 'PIRAMIDE 1/LADO-2').map((g) => g.planta), ['01', '02', '03', '04']);
  // Salvar de novo troca as prateleiras do espaço (só nessa ER); a lista vazia apaga.
  l = salvar(P, { acao: 'salvar', ciclo: 'Ciclo exemplo', planta: 'ER P', espaco: 'PIRAMIDE 1/LADO-2', prateleiras: [] });
  assert.deepEqual(l.filter((g) => g.espaco === 'PIRAMIDE 1/LADO-2').map((g) => g.planta), ['02', '03', '04']);
  assert.equal(run('getDados()').prateleiras.length, 5);

  // Ciclo em construção: copiar "tudo" leva as prateleiras; excluir apaga as do ciclo.
  const rascunho = (pedido) => run(`salvarRascunho(${C}, ${JSON.stringify(pedido)})`);
  rascunho({ acao: 'criar', ciclo: 'C40', origem: 'Ciclo exemplo' });
  d = run('getDados()');
  assert.equal(d.prateleiras.filter((g) => g.ciclo === 'C40').length, 5, 'a cópia leva as prateleiras');
  salvar(P, Object.assign({}, base, { ciclo: 'C40', prateleiras: umQuadrado }));
  d = run('getDados()');
  assert.deepEqual(d.prateleiras.find((g) => g.ciclo === 'C40' && g.espaco === 'GONDOLA 1/PONTA-A').prateleiras.map((p) => p.quadrados[0].produtos[0].sku), ['50111']);
  assert.deepEqual(d.prateleiras.find((g) => g.ciclo === 'Ciclo exemplo' && g.espaco === 'GONDOLA 1/PONTA-A').prateleiras.map((p) => p.numero), [1, 4], 'o ciclo de origem não muda');
  rascunho({ acao: 'excluir', ciclo: 'C40' });
  assert.ok(!run('getDados()').prateleiras.some((g) => g.ciclo === 'C40'), 'excluir o ciclo em construção apaga as prateleiras dele');
});

test('produtos: a aba Produtos da planilha importada substitui o catálogo', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  const r = run(`importarPlanilha(${DEV}, { produtos: [['SKU', 'Nome', 'Marca', 'Categoria'], ['A1', 'Batom', 'qdb', 'Make'], ['', 'sem sku'], ['A2', 'Base', 'EUD', '']] })`);
  assert.equal(r.produtos, 2);
  assert.deepEqual(run('getDados()').produtos.map((p) => [p.sku, p.nome, p.marca]), [['A2', 'Base', 'EUD'], ['A1', 'Batom', 'QDB']]);
});

test('prateleiras: a cópia "só os fixos" leva só as prateleiras dos espaços fixos', () => {
  const { run } = carregarGas();
  const prat = [
    { ciclo: 'C1', planta: 'ER P', espaco: 'GONDOLA 1/MEIO-A-1', prateleira: 1, produto: 'A' },
    { ciclo: 'C1', planta: 'ER M', espaco: 'GONDOLA 1/PONTA-A', prateleira: 1, produto: 'B' },
    { ciclo: 'C1', planta: 'ER P', espaco: 'PIRAMIDE 1/LADO-3', prateleira: 1, produto: 'C' },
    { ciclo: 'C2', planta: 'ER P', espaco: 'PIRAMIDE 2/LADO-1', prateleira: 1, produto: 'D' },
  ];
  const fixos = [{ planta: 'ER P', movel: 'GONDOLA 1/MEIO-A' }, { planta: 'ER G', movel: 'GONDOLA 1/PONTA-A' }, { planta: 'TODAS', movel: 'PIRAMIDE 1' }];
  const r = run(`prateleirasParaCopia_(${JSON.stringify(prat)}, 'C1', 'C9', ${JSON.stringify(fixos)})`);
  assert.deepEqual(r.map((o) => [o.ciclo, o.produto]), [['C9', 'A'], ['C9', 'C']],
    'a metade do meio fixo vai; a ponta fixa só a partir da ER G não vale na ER M; a pirâmide fixa leva os lados dela');
  assert.equal(run(`prateleirasParaCopia_(${JSON.stringify(prat)}, 'C1', 'C9', null)`).length, 3);
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
  configurarComExemplo(run);
  const C = "{ papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' }";
  const salvar = (pedido) => run(`salvarRascunho(${C}, ${JSON.stringify(pedido)})`);
  salvar({ acao: 'criar', ciclo: 'C30' });
  salvar({ acao: 'salvarTipos', ciclo: 'C30', linhas: [{ etiqueta: 'OUTLET | não vai', gmv: '10 mil' }] });
  const r = salvar({ acao: 'salvarEspaco', ciclo: 'C30', planta: 'ER P', movel: 'PIRAMIDE 1', linha: { marca: 'EUD', etiquetas: [{ texto: 'OUTLET | só no kit' }, { texto: 'outlet | vitrine' }] } });
  assert.deepEqual(Object.keys(r.tiposMovimento.C30), ['OUTLET'], 'o tipo fica sem a observação');
  assert.deepEqual(r.movimentos.C30['01']['PIRAMIDE 1'].etiquetas.map((e) => e.texto), ['OUTLET | só no kit', 'outlet | vitrine']);
  assert.throws(() => salvar({ acao: 'salvarEspaco', ciclo: 'C30', planta: 'ER P', movel: 'PIRAMIDE 2', linha: { etiquetas: [{ texto: 'OUTRO | OUTLET' }] } }), /fora dos Tipos/);
  salvar({ acao: 'enviar', ciclo: 'C30' });
});

test('símbolo por etiqueta: colunas "Símbolo Etiqueta N" e, com a antecipação, "Data Etiqueta N"', () => {
  const { run } = carregarGas();
  const mov = [
    ['Ciclo', 'Planta', 'ID Móvel', 'Etiqueta 1', 'Símbolo Etiqueta 1', 'Etiqueta 2', 'Símbolo Etiqueta 2', 'Data Etiqueta 2', 'Etiqueta 3', 'Símbolo Etiqueta 3', 'Data Etiqueta 3', 'Símbolo'],
    ['C1', 'ER P', 'PIRAMIDE 1', 'BOTIPROMO', 'NEW', 'LÇTO EGEO', '⏩', '25/10/2026', 'OUTLET', 'ANTECIPADO', '31/02/2026', ''],
    ['C1', 'ER P', 'PIRAMIDE 2', 'BOTIPROMO', '', '', '', '', '', '', '', 'ANTECIPADO'],
  ];
  const d = run(`montarDados_(valoresLayoutPadrao_(), ${JSON.stringify(mov)}, [], null)`);
  const e = d.movimentos.C1['01']['PIRAMIDE 1'].etiquetas;
  assert.deepEqual(e[0], { texto: 'BOTIPROMO', marca: '', posicao: 1, simbolo: 'NOVO' });
  assert.deepEqual(e[1], { texto: 'LÇTO EGEO', marca: '', posicao: 2, simbolo: 'ANTECIPADO', data: '2026-10-25' });
  assert.equal(e[2].simbolo, 'ANTECIPADO');
  assert.ok(!e[2].data, 'data inválida fica de fora');
  assert.ok(d.avisos.some((a) => /data da etiqueta 3 "31\/02\/2026" inválida/.test(a)), d.avisos.join(' | '));
  // No espaço (coluna Símbolo), a antecipação continua vindo só da aba Antecipações.
  assert.equal(d.movimentos.C1['01']['PIRAMIDE 2'].simbolo, '');
  assert.ok(d.avisos.some((a) => /símbolo "ANTECIPADO" não reconhecido/.test(a)));
});

test('ciclo em construção: símbolo e data de antecipação por etiqueta vão para a aba e voltam', () => {
  const f = servicosFalsos({ vinculada: true });
  const { run } = carregarGas(f.globais);
  configurarComExemplo(run);
  const C = "{ papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bia' }";
  const salvar = (pedido) => run(`salvarRascunho(${C}, ${JSON.stringify(pedido)})`);
  salvar({ acao: 'criar', ciclo: 'C31' });
  salvar({ acao: 'salvarTipos', ciclo: 'C31', linhas: [{ etiqueta: 'OUTLET', gmv: '10 mil' }, { etiqueta: 'BOTIPROMO', gmv: '5 mil' }] });
  const r = salvar({ acao: 'salvarEspaco', ciclo: 'C31', planta: 'ER P', movel: 'PIRAMIDE 1', linha: { marca: 'EUD', etiquetas: [
    { texto: 'OUTLET', simbolo: 'FIXO' }, { texto: 'BOTIPROMO', simbolo: 'ANTECIPADO', data: '2026-11-05' },
  ] } });
  const e = r.movimentos.C31['01']['PIRAMIDE 1'].etiquetas;
  assert.equal(e[0].simbolo, 'FIXO');
  assert.ok(!e[0].data);
  assert.deepEqual([e[1].simbolo, e[1].data], ['ANTECIPADO', '2026-11-05']);
  const aba = f.planilha.getSheetByName('Rascunho Movimentos').getDataRange().getValues();
  const cab = aba[0];
  assert.equal(aba[1][cab.indexOf('Data Etiqueta 2')], '05/11/2026', 'na planilha, a data em dd/mm/aaaa');
  assert.equal(aba[1][cab.indexOf('Símbolo Etiqueta 2')], 'ANTECIPADO');
});
