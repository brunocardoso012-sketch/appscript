/**
 * ============================================================================
 *  CICLOS EM CONSTRUÇÃO (rascunhos montados na planta e aprovados pelo validador)
 * ============================================================================
 *  O construtor da estratégia cria um ciclo novo (em branco ou copiando outro),
 *  preenche os espaços, as Comunicações ER e os Tipos de movimento direto no app
 *  e envia para aprovação. O validador aprova (o ciclo passa para as abas
 *  Movimentos, Painéis e Tipos de movimento, junto com os demais) ou devolve
 *  (com um comentário na aba Comentários).
 *
 *  Enquanto não é aprovado, o ciclo fica nas abas "Rascunho Movimentos",
 *  "Rascunho Painéis" e "Rascunho Tipos", com as mesmas colunas das abas
 *  publicadas (as mesmas regras de cascata entre as ERs), e o status na aba
 *  "Rascunhos". Este arquivo só tem regras sobre matrizes: quem lê e grava as
 *  abas é o Code.gs, o Visualizador.gs e, na versão web, o web/backend-local.js
 *  (executarRascunho_, com o leitor / gravador de cada um).
 */

const STATUS_RASCUNHO = {
  EM_CONSTRUCAO: { nome: 'Em construção' },
  ENVIADO: { nome: 'Aguardando aprovação' },
  APROVADO: { nome: 'Aprovado' },
};

/** Colunas da aba Rascunhos (uma linha por ciclo em construção; a dos aprovados fica como histórico). */
function colunasRascunhos_() {
  return [
    { titulo: 'Ciclo', chave: 'ciclo', obrigatoria: true, texto: true },
    { titulo: 'Status', chave: 'status', texto: true },
    { titulo: 'Copiado de', chave: 'origem', texto: true },
    { titulo: 'Criado por', chave: 'criadoPor', texto: true },
    { titulo: 'Criado em', chave: 'criadoEm', texto: true },
    { titulo: 'Enviado em', chave: 'enviadoEm', texto: true },
    { titulo: 'Decidido por', chave: 'decididoPor', texto: true },
    { titulo: 'Decidido em', chave: 'decididoEm', texto: true },
  ];
}

/**
 * As abas que os rascunhos usam: nome na planilha, colunas e o campo em "abas" (executarRascunho_).
 * As três publicadas só são gravadas na aprovação.
 */
function abasRascunho_() {
  return [
    { campo: 'rascunhos', aba: CONFIG.ABAS.RASCUNHOS, colunas: colunasRascunhos_() },
    { campo: 'rMovimentos', aba: CONFIG.ABAS.R_MOVIMENTOS, colunas: colunasMovimentos_() },
    { campo: 'rPaineis', aba: CONFIG.ABAS.R_PAINEIS, colunas: colunasPaineis_() },
    { campo: 'rTipos', aba: CONFIG.ABAS.R_TIPOS, colunas: colunasTipos_() },
    { campo: 'movimentos', aba: CONFIG.ABAS.MOVIMENTOS, colunas: colunasMovimentos_(), publicada: true },
    { campo: 'paineis', aba: CONFIG.ABAS.PAINEIS, colunas: colunasPaineis_(), publicada: true },
    { campo: 'tipos', aba: CONFIG.ABAS.TIPOS, colunas: colunasTipos_(), publicada: true },
    { campo: 'comentarios', aba: CONFIG.ABAS.COMENTARIOS, colunas: colunasComentarios_() },
  ];
}

/** Matriz (com o cabeçalho das colunas) a partir de objetos {chave: valor}. */
function matrizDeObjetos_(objetos, colunas) {
  return [colunas.map(function (c) { return c.titulo; })].concat(objetos.map(function (o) {
    return colunas.map(function (c) {
      const v = o[c.chave];
      return v === null || v === undefined ? '' : typeof v === 'number' ? v : texto_(v);
    });
  }));
}

/** Objetos {chave: valor} das linhas de uma matriz (sem as linhas vazias). */
function objetosDaMatriz_(matriz, colunas) {
  return objetosDeValores_(matriz, colunas).linhas.filter(function (o) {
    return colunas.some(function (c) { return texto_(o[c.chave]) !== ''; });
  });
}

/** Ciclos que já têm linhas nas abas publicadas. */
function ciclosPublicados_(abas) {
  const ciclos = {};
  [['movimentos', colunasMovimentos_()], ['paineis', colunasPaineis_()], ['tipos', colunasTipos_()]].forEach(function (x) {
    objetosDaMatriz_(abas[x[0]], x[1]).forEach(function (o) { if (texto_(o.ciclo)) ciclos[texto_(o.ciclo)] = true; });
  });
  return ciclos;
}

/**
 * Linha da aba Movimentos de um espaço, a partir do que a página manda.
 * @param {{marca, simbolo, observacao, etiquetas: Array<{texto, marca}>}} l
 * @return {Object|null} null quando o espaço fica vazio (a linha sai)
 */
function linhaDeEspaco_(ciclo, planta, movel, l) {
  const x = l || {};
  const o = {
    ciclo: ciclo, planta: planta, movel: movel,
    marca: normMarca_(x.marca), simbolo: normSimbolo_(x.simbolo), observacao: texto_(x.observacao).slice(0, 2000),
  };
  const etiquetas = (Array.isArray(x.etiquetas) ? x.etiquetas : [])
    .filter(function (e) { return e && texto_(e.texto); })
    .slice(0, CONFIG.MAX_ETIQUETAS);
  for (let i = 1; i <= CONFIG.MAX_ETIQUETAS; i++) {
    const e = etiquetas[i - 1];
    o['etiqueta' + i] = e ? texto_(e.texto).slice(0, 200) : '';
    o['marcaEtiqueta' + i] = e ? normMarca_(e.marca) : '';
  }
  return o.marca || o.simbolo || o.observacao || etiquetas.length ? o : null;
}

/**
 * Aplica uma ação aos rascunhos e devolve as abas novas (sem gravar nada).
 *  - criar:          { acao, ciclo, origem? }        construtor; origem = ciclo (publicado ou em construção) a copiar;
 *  - salvarEspaco:   { acao, ciclo, planta, movel, linha }  construtor; linha vazia apaga a linha do espaço nessa ER;
 *  - salvarPaineis:  { acao, ciclo, planta, linhas: [{secao, texto, marca, movel}] }  construtor;
 *  - salvarTipos:    { acao, ciclo, linhas: [{etiqueta, classificacao, gmv, observacao}] }  construtor;
 *  - enviar:         { acao, ciclo }                  construtor: trava a edição até o validador decidir;
 *  - excluir:        { acao, ciclo }                  construtor (antes da aprovação);
 *  - devolver:       { acao, ciclo, planta, motivo }   validador: volta para construção, com um comentário;
 *  - aprovar:        { acao, ciclo }                  validador: as linhas vão para as abas publicadas.
 * @param {Object} abas  matrizes (com cabeçalho) de cada campo de abasRascunho_()
 * @param {{papel, autor}} quem  resultado de conferirAcesso_
 * @return {{abas: Object, gravar: string[]}} gravar: campos das abas que mudaram
 */
function aplicarAcaoRascunho_(abas, quem, pedido, agora) {
  const p = pedido || {};
  const quando = formatarDataComentario_(agora || new Date());
  const defs = {};
  abasRascunho_().forEach(function (d) { defs[d.campo] = d; });
  const objs = function (campo) { return objetosDaMatriz_(abas[campo], defs[campo].colunas); };
  const novas = Object.assign({}, abas);
  const gravar = [];
  const trocar = function (campo, lista) {
    novas[campo] = matrizDeObjetos_(lista, defs[campo].colunas);
    if (gravar.indexOf(campo) < 0) gravar.push(campo);
  };
  const exigir = function (papel, oQue) {
    if (quem.papel !== papel) throw new Error('Só o ' + PAPEIS_ACESSO[papel].toLowerCase() + ' ' + oQue + '.');
  };

  const ciclo = texto_(p.ciclo).slice(0, 60);
  if (!ciclo) throw new Error('Informe o nome do ciclo.');
  const rascunhos = objs('rascunhos');
  const doCiclo = function (o) { return texto_(o.ciclo) === ciclo; };
  const atual = rascunhos.filter(function (r) { return doCiclo(r) && texto_(r.status) !== 'APROVADO'; })[0];
  const comStatus = function (status, extra) {
    trocar('rascunhos', rascunhos.map(function (r) {
      return r === atual ? Object.assign({}, r, { status: status }, extra || {}) : r;
    }));
  };
  const exigirRascunho = function (status) {
    if (!atual) throw new Error('O ciclo "' + ciclo + '" não está em construção (pode ter sido aprovado ou excluído). Clique em Atualizar.');
    if (status && texto_(atual.status) !== status) {
      throw new Error(status === 'EM_CONSTRUCAO'
        ? 'O ciclo "' + ciclo + '" foi enviado para aprovação: só volta a ser editado se o validador devolver.'
        : 'O ciclo "' + ciclo + '" não está aguardando aprovação.');
    }
  };
  const semCiclo = function (campo) { return objs(campo).filter(function (o) { return !doCiclo(o); }); };

  if (p.acao === 'criar') {
    exigir('CONSTRUTOR', 'cria ciclos');
    if (atual || ciclosPublicados_(abas)[ciclo]) throw new Error('Já existe um ciclo "' + ciclo + '". Escolha outro nome.');
    const origem = texto_(p.origem);
    if (origem) {
      // Copia do ciclo de origem: os rascunhos dele, se estiver em construção; senão as abas publicadas.
      const emConstrucao = rascunhos.some(function (r) { return texto_(r.ciclo) === origem && texto_(r.status) !== 'APROVADO'; });
      [['movimentos', 'rMovimentos'], ['paineis', 'rPaineis'], ['tipos', 'rTipos']].forEach(function (x) {
        const daOrigem = objs(emConstrucao ? x[1] : x[0]).filter(function (o) { return texto_(o.ciclo) === origem; });
        if (!daOrigem.length && x[0] === 'movimentos') throw new Error('O ciclo "' + origem + '" não foi encontrado.');
        trocar(x[1], objs(x[1]).concat(daOrigem.map(function (o) { return Object.assign({}, o, { ciclo: ciclo }); })));
      });
    }
    trocar('rascunhos', rascunhos.filter(function (r) { return !doCiclo(r); }).concat([{
      ciclo: ciclo, status: 'EM_CONSTRUCAO', origem: origem, criadoPor: quem.autor, criadoEm: quando,
    }]));
    return { abas: novas, gravar: gravar };
  }

  if (p.acao === 'salvarEspaco') {
    exigir('CONSTRUTOR', 'edita o ciclo');
    exigirRascunho('EM_CONSTRUCAO');
    const planta = normPlanta_(p.planta);
    const movel = normIdEspaco_(p.movel);
    if (!planta || !movel) throw new Error('Escolha a ER e o espaço.');
    const mesmo = function (o) { return doCiclo(o) && normPlanta_(o.planta) === planta && normIdEspaco_(o.movel) === movel; };
    const linha = linhaDeEspaco_(ciclo, planta, movel, p.linha);
    trocar('rMovimentos', objs('rMovimentos').filter(function (o) { return !mesmo(o); }).concat(linha ? [linha] : []));
    return { abas: novas, gravar: gravar };
  }

  if (p.acao === 'salvarPaineis') {
    exigir('CONSTRUTOR', 'edita o ciclo');
    exigirRascunho('EM_CONSTRUCAO');
    const planta = normPlanta_(p.planta);
    if (!planta) throw new Error('Escolha a ER.');
    const linhas = (Array.isArray(p.linhas) ? p.linhas : []).map(function (l) {
      const secao = normSecao_(l && l.secao);
      const t = texto_(l && l.texto).slice(0, 2000);
      if (!secao || !t) return null;
      return { ciclo: ciclo, planta: planta, secao: secao, texto: t, marca: normMarca_(l.marca), movel: l.movel ? normId_(l.movel) : '' };
    }).filter(Boolean);
    trocar('rPaineis', objs('rPaineis').filter(function (o) { return !(doCiclo(o) && normPlanta_(o.planta) === planta); }).concat(linhas));
    return { abas: novas, gravar: gravar };
  }

  if (p.acao === 'salvarTipos') {
    exigir('CONSTRUTOR', 'edita o ciclo');
    exigirRascunho('EM_CONSTRUCAO');
    const vistos = {};
    const linhas = (Array.isArray(p.linhas) ? p.linhas : []).map(function (l) {
      const etiqueta = texto_(l && l.etiqueta).slice(0, 200);
      const k = chaveEtiqueta_(etiqueta);
      if (!etiqueta || vistos[k]) return null;
      vistos[k] = true;
      const gmv = numeroGmv_(l.gmv);
      const o = { ciclo: ciclo, etiqueta: etiqueta, classificacao: normClassificacao_(l.classificacao), gmv: gmv === null ? '' : gmv, observacao: texto_(l.observacao).slice(0, 2000) };
      return o.classificacao || o.gmv !== '' || o.observacao ? o : null;
    }).filter(Boolean);
    trocar('rTipos', semCiclo('rTipos').concat(linhas));
    return { abas: novas, gravar: gravar };
  }

  if (p.acao === 'enviar') {
    exigir('CONSTRUTOR', 'envia o ciclo para aprovação');
    exigirRascunho('EM_CONSTRUCAO');
    if (!objs('rMovimentos').some(doCiclo)) throw new Error('O ciclo está vazio: preencha pelo menos um espaço antes de enviar.');
    comStatus('ENVIADO', { enviadoEm: quando });
    return { abas: novas, gravar: gravar };
  }

  if (p.acao === 'excluir') {
    exigir('CONSTRUTOR', 'exclui um ciclo em construção');
    exigirRascunho();
    ['rMovimentos', 'rPaineis', 'rTipos'].forEach(function (c) { trocar(c, semCiclo(c)); });
    trocar('rascunhos', rascunhos.filter(function (r) { return r !== atual; }));
    return { abas: novas, gravar: gravar };
  }

  if (p.acao === 'devolver') {
    exigir('VALIDADOR', 'devolve o ciclo');
    exigirRascunho('ENVIADO');
    const motivo = texto_(p.motivo);
    if (!motivo) throw new Error('Escreva o que precisa mudar.');
    const c = aplicarAcaoComentario_(abas.comentarios, quem, {
      acao: 'novo', ciclo: ciclo, planta: p.planta || Object.keys(NOMES_PLANTAS)[0], texto: 'Devolvido para ajustes: ' + motivo,
    }, agora);
    novas.comentarios = c.valores;
    gravar.push('comentarios');
    comStatus('EM_CONSTRUCAO', { decididoPor: quem.autor, decididoEm: quando });
    return { abas: novas, gravar: gravar };
  }

  if (p.acao === 'aprovar') {
    exigir('VALIDADOR', 'aprova o ciclo');
    exigirRascunho('ENVIADO');
    if (ciclosPublicados_(abas)[ciclo]) throw new Error('Já existe um ciclo "' + ciclo + '" publicado. Peça para o construtor renomear (criar outro copiando este).');
    [['movimentos', 'rMovimentos'], ['paineis', 'rPaineis'], ['tipos', 'rTipos']].forEach(function (x) {
      const linhas = objs(x[1]).filter(doCiclo);
      if (linhas.length) {
        novas[x[0]] = mesclarLinhas_(abas[x[0]] && abas[x[0]].length ? abas[x[0]] : [], linhas, defs[x[0]].colunas);
        gravar.push(x[0]);
      }
      trocar(x[1], semCiclo(x[1]));
    });
    comStatus('APROVADO', { decididoPor: quem.autor, decididoEm: quando });
    return { abas: novas, gravar: gravar };
  }

  throw new Error('Ação inválida.');
}

/**
 * O que a página recebe: os ciclos em construção (status, quem criou…) e os dados deles já montados
 * (movimentos, paineis e tiposMovimento, como os do getDados), para entrarem no seletor de ciclos.
 */
function dadosDosRascunhos_(valoresLayout, abas) {
  const lista = objetosDaMatriz_(abas.rascunhos, colunasRascunhos_())
    .filter(function (r) { return texto_(r.ciclo) && texto_(r.status) !== 'APROVADO'; })
    .map(function (r) {
      const status = STATUS_RASCUNHO[texto_(r.status)] ? texto_(r.status) : 'EM_CONSTRUCAO';
      return {
        ciclo: texto_(r.ciclo), status: status, nomeStatus: STATUS_RASCUNHO[status].nome, origem: texto_(r.origem),
        criadoPor: texto_(r.criadoPor), criadoEm: texto_(r.criadoEm), enviadoEm: texto_(r.enviadoEm),
        decididoPor: texto_(r.decididoPor), decididoEm: texto_(r.decididoEm),
      };
    });
  const d = montarDados_(valoresLayout, abas.rMovimentos, abas.rPaineis, abas.rTipos);
  return { rascunhos: lista, movimentos: d.movimentos, paineis: d.paineis, tiposMovimento: d.tiposMovimento };
}

/**
 * Executa um pedido da página: confere o acesso, lê as abas, aplica a ação (se houver) e grava as que
 * mudaram. io = { ler(nomeDaAba) → matriz ou null, gravar(nomeDaAba, colunas, matriz), layout() → matriz,
 * travar(fn) }. Sem pedido (ou acao "listar"), só lê.
 */
function executarRascunho_(io, acesso, pedido) {
  const quem = conferirAcesso_(acesso);
  return io.travar(function () {
    const abas = {};
    abasRascunho_().forEach(function (d) {
      const m = io.ler(d.aba);
      abas[d.campo] = m && m.length ? m : [d.colunas.map(function (c) { return c.titulo; })];
    });
    let atuais = abas;
    if (pedido && pedido.acao && pedido.acao !== 'listar') {
      const r = aplicarAcaoRascunho_(abas, quem, pedido);
      abasRascunho_().forEach(function (d) { if (r.gravar.indexOf(d.campo) >= 0) io.gravar(d.aba, d.colunas, r.abas[d.campo]); });
      atuais = r.abas;
    }
    return dadosDosRascunhos_(io.layout(), atuais);
  });
}
