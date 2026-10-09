/**
 * ============================================================================
 *  VALIDAÇÃO DA ESTRATÉGIA (comentários do validador para o construtor)
 * ============================================================================
 *  O validador comenta a estratégia de um ciclo (numa planta ou num móvel); o
 *  construtor da estratégia vê, responde e marca como resolvido. Cada acesso
 *  pede o papel e a senha (SENHAS_ACESSO, em Config.gs), conferidos aqui a cada
 *  gravação.
 *
 *  Os comentários ficam na aba "Comentários" (uma linha por mensagem; as
 *  respostas apontam para o comentário na coluna "Responde a"). Este arquivo só
 *  tem regras, sem ler nem gravar nada: quem lê e grava a aba é o Code.gs, o
 *  Visualizador.gs e, na versão web, o web/backend-local.js.
 */

const PAPEIS_ACESSO = {
  VALIDADOR: 'Validador',
  CONSTRUTOR: 'Construtor da estratégia',
};

const STATUS_COMENTARIO = { ABERTO: 'ABERTO', RESOLVIDO: 'RESOLVIDO' };

/** Colunas da aba Comentários (mesmo formato das outras abas: titulo, chave, apelidos). */
function colunasComentarios_() {
  return [
    { titulo: 'ID', chave: 'id', obrigatoria: true, texto: true },
    { titulo: 'Responde a', chave: 'pai', texto: true },
    { titulo: 'Ciclo', chave: 'ciclo', texto: true },
    { titulo: 'Planta', chave: 'planta', texto: true },
    { titulo: 'ID Móvel', chave: 'movel', texto: true },
    { titulo: 'Papel', chave: 'papel', texto: true },
    { titulo: 'Autor', chave: 'autor', texto: true },
    { titulo: 'Data', chave: 'data', texto: true },
    { titulo: 'Texto', chave: 'texto', obrigatoria: true, texto: true },
    { titulo: 'Status', chave: 'status', texto: true },
  ];
}

/**
 * Senhas de cada papel. Por enquanto vêm de SENHAS_ACESSO (Config.gs); este é o
 * único lugar a mudar quando elas passarem a ser lidas da planilha.
 */
function senhasDeAcesso_() {
  return SENHAS_ACESSO;
}

/**
 * Confere papel e senha. @return {{papel: string, autor: string}} ou lança erro.
 * @param {{papel: string, senha: string, nome: string}} acesso
 */
function conferirAcesso_(acesso) {
  const a = acesso || {};
  const papel = String(a.papel || '').toUpperCase();
  if (!PAPEIS_ACESSO[papel]) throw new Error('Escolha se você é validador ou construtor da estratégia.');
  const senha = senhasDeAcesso_()[papel];
  if (!senha || String(a.senha || '') !== String(senha)) throw new Error('Senha incorreta.');
  const autor = String(a.nome || '').trim().slice(0, 60);
  if (!autor) throw new Error('Informe o seu nome.');
  return { papel: papel, autor: autor };
}

/** Matriz vazia da aba (só o cabeçalho). */
function valoresComentariosVazios_() {
  return [colunasComentarios_().map(function (c) { return c.titulo; })];
}

/**
 * Comentários da aba, já com as respostas dentro de cada um (ordem de criação).
 * @return {Array<{id, ciclo, planta, movel, papel, autor, data, texto, status, respostas: Array}>}
 */
function comentariosDeValores_(valores) {
  if (!valores || !valores.length) return [];
  const lido = objetosDeValores_(valores, colunasComentarios_());
  const porId = {};
  const lista = [];
  const respostas = [];
  lido.linhas.forEach(function (l) {
    const c = {
      id: texto_(l.id),
      ciclo: texto_(l.ciclo),
      planta: normPlanta_(l.planta),
      movel: l.movel ? normId_(l.movel) : '',
      papel: String(texto_(l.papel)).toUpperCase(),
      autor: texto_(l.autor),
      data: texto_(l.data),
      texto: texto_(l.texto),
    };
    if (!c.id || !c.texto) return;
    const pai = texto_(l.pai);
    if (pai) {
      c.pai = pai;
      respostas.push(c);
      return;
    }
    c.status = String(texto_(l.status)).toUpperCase() === STATUS_COMENTARIO.RESOLVIDO ? STATUS_COMENTARIO.RESOLVIDO : STATUS_COMENTARIO.ABERTO;
    c.respostas = [];
    porId[c.id] = c;
    lista.push(c);
  });
  respostas.forEach(function (r) { if (porId[r.pai]) porId[r.pai].respostas.push(r); });
  return lista;
}

/**
 * Aplica uma ação aos comentários e devolve a matriz nova da aba (sem gravar nada).
 *  - novo:      { acao: 'novo', ciclo, planta, movel?, texto }   — só o validador;
 *  - responder: { acao: 'responder', id, texto }                 — os dois papéis;
 *  - status:    { acao: 'status', id, status: ABERTO|RESOLVIDO } — o construtor resolve;
 *               o validador resolve ou reabre;
 *  - excluir:   { acao: 'excluir', id }                          — só o validador (com as respostas).
 * @param {Array<Array>} valores  matriz atual da aba (com cabeçalho), ou vazia
 * @param {{papel, autor}} quem   resultado de conferirAcesso_
 * @param {Object} pedido
 * @param {Date=} agora
 * @return {{valores: Array<Array>, id: string}}
 */
function aplicarAcaoComentario_(valores, quem, pedido, agora) {
  const p = pedido || {};
  const cols = colunasComentarios_();
  const base = valores && valores.length ? valores : valoresComentariosVazios_();
  const cab = base[0].map(chave_);
  const idx = {};
  cols.forEach(function (c) { idx[c.chave] = acharColuna_(cab, c); });
  // Aba sem alguma coluna (editada à mão): recria com o cabeçalho certo, mantendo os dados.
  if (cols.some(function (c) { return idx[c.chave] < 0; })) {
    const objetos = objetosDeValores_(base, cols).linhas;
    return aplicarAcaoComentario_(
      valoresComentariosVazios_().concat(objetos.map(function (o) { return cols.map(function (c) { return o[c.chave] || ''; }); })),
      quem, p, agora
    );
  }
  const linhas = base.map(function (r) { return r.slice(); });
  const largura = linhas[0].length;
  const linhaDe = function (id) {
    for (let i = 1; i < linhas.length; i++) if (texto_(linhas[i][idx.id]) === id && !texto_(linhas[i][idx.pai])) return i;
    return -1;
  };
  const textoDe = function (t) {
    const s = String(t || '').trim();
    if (!s) throw new Error('Escreva o comentário.');
    return s.slice(0, 2000);
  };
  const data = formatarDataComentario_(agora || new Date());
  const novoId = 'C' + (agora || new Date()).getTime().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
  const nova = function (o) {
    const r = [];
    for (let k = 0; k < largura; k++) r.push('');
    cols.forEach(function (c) { if (o[c.chave] !== undefined) r[idx[c.chave]] = o[c.chave]; });
    linhas.push(r);
  };
  const exigirComentario = function () {
    const i = linhaDe(String(p.id || ''));
    if (i < 0) throw new Error('Comentário não encontrado (pode ter sido excluído). Clique em Atualizar.');
    return i;
  };

  if (p.acao === 'novo') {
    if (quem.papel !== 'VALIDADOR') throw new Error('Só o validador cria comentários.');
    const ciclo = String(p.ciclo || '').trim();
    const planta = normPlanta_(p.planta);
    if (!ciclo || !planta) throw new Error('Escolha o ciclo e a planta do comentário.');
    nova({
      id: novoId, pai: '', ciclo: ciclo, planta: nomePlanta_(planta), movel: p.movel ? normId_(p.movel) : '',
      papel: quem.papel, autor: quem.autor, data: data, texto: textoDe(p.texto), status: STATUS_COMENTARIO.ABERTO,
    });
    return { valores: linhas, id: novoId };
  }
  if (p.acao === 'responder') {
    const i = exigirComentario();
    nova({
      id: novoId, pai: texto_(linhas[i][idx.id]), ciclo: linhas[i][idx.ciclo], planta: linhas[i][idx.planta], movel: linhas[i][idx.movel],
      papel: quem.papel, autor: quem.autor, data: data, texto: textoDe(p.texto), status: '',
    });
    return { valores: linhas, id: novoId };
  }
  if (p.acao === 'status') {
    const i = exigirComentario();
    const status = String(p.status || '').toUpperCase();
    if (!STATUS_COMENTARIO[status]) throw new Error('Status inválido.');
    if (status === STATUS_COMENTARIO.ABERTO && quem.papel !== 'VALIDADOR') throw new Error('Só o validador reabre um comentário.');
    linhas[i][idx.status] = status;
    return { valores: linhas, id: texto_(linhas[i][idx.id]) };
  }
  if (p.acao === 'excluir') {
    if (quem.papel !== 'VALIDADOR') throw new Error('Só o validador exclui comentários.');
    const i = exigirComentario();
    const id = texto_(linhas[i][idx.id]);
    return {
      valores: linhas.filter(function (r, k) { return k === 0 || (texto_(r[idx.id]) !== id && texto_(r[idx.pai]) !== id); }),
      id: id,
    };
  }
  throw new Error('Ação inválida.');
}

/** "09/10/2026 14:05" (horário do servidor / navegador). */
function formatarDataComentario_(d) {
  const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
}

/* ----------------------- leitura e gravação da aba ----------------------- */
/* (Só no Apps Script: Code.gs e Visualizador.gs usam estas duas funções.)   */

/** Matriz da aba Comentários (valores exibidos), ou a matriz vazia se a aba não existe. */
function lerComentariosDaPlanilha_(ss) {
  const sh = ss.getSheetByName(CONFIG.ABAS.COMENTARIOS);
  if (!sh || sh.getLastRow() < 1) return valoresComentariosVazios_();
  return sh.getDataRange().getDisplayValues();
}

/** Grava a matriz inteira na aba Comentários (cria a aba se não existir), tudo como texto. */
function gravarComentariosNaPlanilha_(ss, valores) {
  let sh = ss.getSheetByName(CONFIG.ABAS.COMENTARIOS);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.ABAS.COMENTARIOS);
    sh.setFrozenRows(1);
  }
  const largura = valores[0].length;
  sh.clearContents();
  if (sh.getMaxColumns() < largura) sh.insertColumnsAfter(sh.getMaxColumns(), largura - sh.getMaxColumns());
  if (sh.getMaxRows() < valores.length) sh.insertRowsAfter(sh.getMaxRows(), valores.length - sh.getMaxRows());
  const faixa = sh.getRange(1, 1, valores.length, largura);
  faixa.setNumberFormat('@');
  faixa.setValues(valores);
  sh.getRange(1, 1, 1, largura).setFontWeight('bold');
}

/**
 * Executa um pedido da página com a trava do script: confere o acesso, lê a aba,
 * aplica a ação e grava. @return {Array} comentários atualizados
 */
function executarComentario_(ss, acesso, pedido) {
  const quem = conferirAcesso_(acesso);
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    const r = aplicarAcaoComentario_(lerComentariosDaPlanilha_(ss), quem, pedido);
    gravarComentariosNaPlanilha_(ss, r.valores);
    return comentariosDeValores_(r.valores);
  } finally {
    trava.releaseLock();
  }
}
