/**
 * ============================================================================
 *  ANTECIPAÇÕES (itens do ciclo seguinte que entram antes, no ciclo atual)
 * ============================================================================
 *  Uma mudança de estratégia de curto prazo: um movimento que estava para o
 *  próximo ciclo é adiantado para um espaço do ciclo atual, a partir de uma
 *  data. Quem entrou na validação (validador ou construtor da estratégia) cria,
 *  edita e exclui; todo mundo vê na planta: o espaço passa a mostrar o
 *  movimento antecipado, com o símbolo de antecipação (SIMBOLOS.ANTECIPADO).
 *
 *  As antecipações ficam na aba "Antecipações" (uma linha por antecipação) e
 *  não mudam as linhas da aba Movimentos: a página junta as duas na hora de
 *  desenhar (Antecipacao.html). Este arquivo só tem regras sobre matrizes: quem
 *  lê e grava a aba é o Code.gs e, na versão web, o
 *  web/backend-local.js (executarAntecipacao_, com o leitor / gravador de cada um).
 */

/** Como o movimento antecipado entra no espaço. */
const MODOS_ANTECIPACAO = {
  SUBSTITUIR: { nome: 'Substitui o que está no espaço' },
  SOMAR: { nome: 'Soma às etiquetas do espaço' },
};

/** Colunas da aba Antecipações. */
function colunasAntecipacoes_() {
  return [
    { titulo: 'ID', chave: 'id', obrigatoria: true, texto: true },
    { titulo: 'Ciclo', chave: 'ciclo', obrigatoria: true, texto: true },
    { titulo: 'Planta', chave: 'planta', texto: true },
    { titulo: 'ID Móvel', chave: 'movel', obrigatoria: true, texto: true, apelidos: ['Espaço', 'Móvel'] },
    { titulo: 'Movimento (etiqueta)', chave: 'etiqueta', obrigatoria: true, texto: true, apelidos: ['Movimento', 'Etiqueta'] },
    { titulo: 'Marca', chave: 'marca', texto: true, apelidos: ['Cor'] },
    { titulo: 'Como entra', chave: 'modo', texto: true, apelidos: ['Modo'] },
    { titulo: 'Data de entrada', chave: 'data', texto: true, apelidos: ['Entra em', 'Data'] },
    { titulo: 'Vem do ciclo', chave: 'origem', texto: true, apelidos: ['Ciclo de origem', 'Origem'] },
    { titulo: 'Observação', chave: 'observacao', texto: true, apelidos: ['Obs'] },
    { titulo: 'Criado por', chave: 'criadoPor', texto: true },
    { titulo: 'Criado em', chave: 'criadoEm', texto: true },
  ];
}

/** Matriz vazia da aba (só o cabeçalho). */
function valoresAntecipacoesVazios_() {
  return [colunasAntecipacoes_().map(function (c) { return c.titulo; })];
}

/**
 * Data de entrada: aceita "25/10/2026", "2026-10-25" ou uma data do Sheets.
 * @return {string} "2026-10-25" (ou '' quando vazia ou inválida)
 */
function dataAntecipacao_(v) {
  const s = texto_(v); // texto_ já passa as datas do Sheets para dd/mm/aaaa
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let a, mes, d;
  if (m) {
    a = +m[1]; mes = +m[2]; d = +m[3];
  } else {
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!m) return '';
    d = +m[1]; mes = +m[2]; a = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  }
  const data = new Date(a, mes - 1, d);
  if (data.getFullYear() !== a || data.getMonth() !== mes - 1 || data.getDate() !== d) return '';
  const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  return a + '-' + p2(mes) + '-' + p2(d);
}

/** "2026-10-25" → "25/10/2026". */
function dataAntecipacaoTexto_(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}

/**
 * Antecipações da aba, já normalizadas (as linhas sem ciclo, espaço, movimento ou data válida ficam de fora),
 * em ordem de entrada (data e, no mesmo dia, de criação).
 * @return {Array<{id, ciclo, planta, movel, etiqueta, marca, modo, data, dataTexto, origem, observacao, criadoPor, criadoEm}>}
 *   planta: ID da ER ("02") ou "TODAS"; data: "2026-10-25"
 */
function antecipacoesDeValores_(valores) {
  if (!valores || !valores.length) return [];
  const lista = [];
  objetosDeValores_(valores, colunasAntecipacoes_()).linhas.forEach(function (l, i) {
    const data = dataAntecipacao_(l.data);
    const a = {
      id: texto_(l.id), ciclo: texto_(l.ciclo), planta: normPlanta_(l.planta) || CONFIG.PLANTA_TODAS,
      movel: normIdEspaco_(l.movel), etiqueta: texto_(l.etiqueta), marca: normMarca_(l.marca),
      modo: MODOS_ANTECIPACAO[chave_(l.modo)] ? chave_(l.modo) : 'SUBSTITUIR',
      data: data, dataTexto: dataAntecipacaoTexto_(data), origem: texto_(l.origem), observacao: texto_(l.observacao),
      criadoPor: texto_(l.criadoPor), criadoEm: texto_(l.criadoEm), _ordem: i,
    };
    if (a.id && a.ciclo && a.movel && a.etiqueta && a.data) lista.push(a);
  });
  lista.sort(function (x, y) { return x.data < y.data ? -1 : x.data > y.data ? 1 : x._ordem - y._ordem; });
  return lista.map(function (a) { delete a._ordem; return a; });
}

/**
 * Espaço do layout que a antecipação usa: o ID do móvel (móveis de um espaço só) ou "MÓVEL/ESPAÇO"
 * (gôndola, mesas, totem e móvel make). @return {{id, movel}} ou lança erro com o motivo
 */
function espacoDaAntecipacao_(plantas, planta, id) {
  const base = id.split('/')[0];
  const espaco = id.indexOf('/') >= 0 ? id.slice(id.indexOf('/') + 1) : '';
  const onde = planta === CONFIG.PLANTA_TODAS ? plantas : plantas.filter(function (p) { return p.id === planta; });
  if (!onde.length) throw new Error('A ER escolhida não existe no layout.');
  const moveis = [];
  onde.forEach(function (p) { p.moveis.forEach(function (m) { if (m.id === base) moveis.push(m); }); });
  if (!moveis.length) {
    throw new Error('O móvel "' + base + '" não existe ' + (planta === CONFIG.PLANTA_TODAS ? 'em nenhuma ER.' : 'na ' + nomePlanta_(planta) + '.'));
  }
  const m = moveis[0];
  if (m.tipo === 'EXTRA' || TIPOS_SEM_ETIQUETA.indexOf(m.tipo) >= 0) throw new Error('"' + base + '" não leva movimento: escolha outro móvel.');
  if (espacosDoMovel_(m).length && !espaco) throw new Error('Escolha o espaço do móvel "' + base + '" (ex.: ' + base + '/' + espacosDoMovel_(m)[0].id + ').');
  if (espaco && !moveis.some(function (x) { return espacosAceitos_(x).indexOf(espaco) >= 0; })) {
    throw new Error('O móvel "' + base + '" não tem o espaço "' + espaco + '".');
  }
  return { id: id, movel: m };
}

/**
 * Aplica uma ação às antecipações e devolve a matriz nova da aba (sem gravar nada).
 *  - salvar:  { acao, id?, ciclo, planta, movel, etiqueta, marca, modo, data, origem, observacao }
 *             cria (sem id) ou troca a antecipação do id; ciclo = um ciclo publicado; planta = ER ou "TODAS";
 *  - excluir: { acao, id }.
 * Os dois papéis da validação podem tudo (a mudança de curto prazo não espera o validador).
 * @param {Array<Array>} valores  matriz atual da aba (com cabeçalho), ou vazia
 * @param {{plantas: Array, ciclos: Object}} contexto  plantas do layout (montarPlantas_) e ciclos publicados
 * @param {{papel, autor}} quem  resultado de conferirAcesso_
 * @return {{valores: Array<Array>, id: string}}
 */
function aplicarAcaoAntecipacao_(valores, contexto, quem, pedido, agora) {
  const p = pedido || {};
  const cols = colunasAntecipacoes_();
  const objetos = valores && valores.length ? objetosDaMatriz_(valores, cols) : [];
  const id = texto_(p.id);
  const existe = function () {
    if (!objetos.some(function (o) { return texto_(o.id) === id; })) {
      throw new Error('Antecipação não encontrada (pode ter sido excluída). Clique em Atualizar.');
    }
  };

  if (p.acao === 'excluir') {
    existe();
    return { valores: matrizDeObjetos_(objetos.filter(function (o) { return texto_(o.id) !== id; }), cols), id: id };
  }

  if (p.acao === 'salvar') {
    if (id) existe();
    const ciclo = texto_(p.ciclo).slice(0, 60);
    if (!ciclo) throw new Error('Escolha o ciclo que recebe a antecipação.');
    if (!contexto.ciclos[ciclo]) throw new Error('O ciclo "' + ciclo + '" não está publicado: a antecipação vale só para um ciclo da planilha.');
    const planta = normPlanta_(p.planta) || CONFIG.PLANTA_TODAS;
    const movel = normIdEspaco_(p.movel);
    if (!movel) throw new Error('Escolha o móvel (ou o espaço do móvel) que recebe a antecipação.');
    espacoDaAntecipacao_(contexto.plantas, planta, movel);
    const etiqueta = texto_(p.etiqueta).slice(0, 200);
    if (!etiqueta) throw new Error('Escreva o movimento (texto da etiqueta) que vai ser antecipado.');
    const data = dataAntecipacao_(p.data);
    if (!data) throw new Error('Informe a data em que a antecipação entra.');
    const modo = MODOS_ANTECIPACAO[chave_(p.modo)] ? chave_(p.modo) : 'SUBSTITUIR';
    const origem = texto_(p.origem).slice(0, 60);
    if (origem && origem === ciclo) throw new Error('O ciclo de origem tem de ser outro (o ciclo seguinte), não o próprio ciclo.');
    const anterior = objetos.filter(function (o) { return texto_(o.id) === id; })[0];
    const novoId = id || 'A' + (agora || new Date()).getTime().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
    const linha = {
      id: novoId, ciclo: ciclo, planta: planta === CONFIG.PLANTA_TODAS ? CONFIG.PLANTA_TODAS : nomePlanta_(planta),
      movel: movel, etiqueta: etiqueta, marca: normMarca_(p.marca), modo: modo, data: dataAntecipacaoTexto_(data),
      origem: origem, observacao: texto_(p.observacao).slice(0, 2000),
      // Editar não muda quem criou.
      criadoPor: anterior ? texto_(anterior.criadoPor) : quem.autor,
      criadoEm: anterior ? texto_(anterior.criadoEm) : formatarDataComentario_(agora || new Date()),
    };
    const lista = anterior
      ? objetos.map(function (o) { return o === anterior ? linha : o; })
      : objetos.concat([linha]);
    return { valores: matrizDeObjetos_(lista, cols), id: novoId };
  }

  throw new Error('Ação inválida.');
}

/**
 * Executa um pedido da página: confere o acesso, lê a aba, aplica a ação e grava. io = o mesmo dos rascunhos
 * ({ ler(nomeDaAba), gravar(nomeDaAba, colunas, matriz), layout(), travar(fn) }).
 * @return {Array} antecipações atualizadas (como em antecipacoesDeValores_)
 */
function executarAntecipacao_(io, acesso, pedido) {
  const quem = conferirAcesso_(acesso);
  return io.travar(function () {
    const valores = io.ler(CONFIG.ABAS.ANTECIPACOES);
    const abas = {
      movimentos: io.ler(CONFIG.ABAS.MOVIMENTOS) || [],
      paineis: io.ler(CONFIG.ABAS.PAINEIS) || [],
      tipos: io.ler(CONFIG.ABAS.TIPOS) || [],
    };
    const layout = io.layout();
    const linhasLayout = objetosDeValores_(layout && layout.length ? layout : valoresLayoutPadrao_(), colunasLayout_()).linhas;
    const contexto = { plantas: montarPlantas_(linhasLayout, function () {}), ciclos: ciclosPublicados_(abas) };
    const r = aplicarAcaoAntecipacao_(valores, contexto, quem, pedido);
    io.gravar(CONFIG.ABAS.ANTECIPACOES, colunasAntecipacoes_(), r.valores);
    return antecipacoesDeValores_(r.valores);
  });
}
