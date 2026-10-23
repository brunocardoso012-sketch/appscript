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
 * @param {{marca, simbolo, observacao, etiquetas: Array<{texto, marca, simbolo?, data?}>}} l  data: da antecipação (⏩)
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
    const simbolo = e ? normSimbolo_(e.simbolo, null, null, true) : '';
    o['simboloEtiqueta' + i] = simbolo;
    o['dataEtiqueta' + i] = simbolo === 'ANTECIPADO' ? dataAntecipacaoTexto_(dataAntecipacao_(e.data)) : '';
  }
  return o.marca || o.simbolo || o.observacao || etiquetas.length ? o : null;
}

/** Textos das etiquetas de uma linha da aba Movimentos (objeto). */
function etiquetasDaLinha_(o) {
  const lista = [];
  for (let i = 1; i <= CONFIG.MAX_ETIQUETAS; i++) if (texto_(o['etiqueta' + i])) lista.push(texto_(o['etiqueta' + i]));
  return lista;
}

/**
 * Linhas novas da aba Tipos para as etiquetas usadas em `movimentos` que ainda não estão em `tipos`
 * (só o movimento, sem classificação nem GMV): todo movimento dos móveis fica cadastrado nos tipos.
 */
function tiposQueFaltam_(ciclo, movimentos, tipos) {
  const tem = {};
  tipos.forEach(function (t) { tem[chaveEtiqueta_(t.etiqueta)] = true; });
  const novos = [];
  movimentos.forEach(function (o) {
    etiquetasDaLinha_(o).forEach(function (e) {
      const k = chaveEtiqueta_(e);
      if (tem[k]) return;
      tem[k] = true;
      novos.push({ ciclo: ciclo, etiqueta: movimentoDaEtiqueta_(e), classificacao: '', gmv: '', observacao: '' });
    });
  });
  return novos;
}

/** Lista curta para mensagens: "A", "B" e "C" (e mais N). */
function listaCurta_(itens) {
  const q = itens.slice(0, 5).map(function (x) { return '"' + x + '"'; });
  return q.join(', ') + (itens.length > 5 ? ' e mais ' + (itens.length - 5) : '');
}

/**
 * Aplica uma ação aos rascunhos e devolve as abas novas (sem gravar nada). O ciclo é montado em
 * três passos: (1) os Tipos de movimento, com o GMV de cada um; (2) os móveis, só com os movimentos
 * cadastrados nos tipos; (3) o envio para aprovação, que confere os dois.
 *  - criar:          { acao, ciclo, origem?, copiar? }  construtor; origem = ciclo (publicado ou em construção) a copiar;
 *                    copiar = 'tudo' (padrão: movimentos, comunicações e tipos) ou 'fixos' (só as linhas com 🔒 e os
 *                    tipos desses movimentos);
 *  - salvarTipos:    { acao, ciclo, linhas: [{etiqueta, classificacao, gmv, observacao}] }  construtor: os movimentos
 *                    que o ciclo pode usar (substitui a lista toda);
 *  - salvarEspaco:   { acao, ciclo, planta, movel, linha }  construtor; só com movimentos dos tipos; linha vazia apaga
 *                    a linha do espaço nessa ER;
 *  - salvarPaineis:  { acao, ciclo, planta, linhas: [{secao, texto, marca, movel}] }  construtor;
 *  - enviar:         { acao, ciclo }                  construtor: confere os tipos (todos com GMV) e os móveis (só
 *                    movimentos dos tipos) e trava a edição até o validador decidir;
 *  - excluir:        { acao, ciclo }                  construtor (antes da aprovação);
 *  - devolver:       { acao, ciclo, planta, motivo }   validador: volta para construção, com um comentário;
 *  - aprovar:        { acao, ciclo }                  validador: as linhas vão para as abas publicadas (todos os
 *                    tipos cadastrados vão para a aba Tipos de movimento, mesmo os que nenhum espaço usa).
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
    const soFixos = p.copiar === 'fixos';
    if (origem) {
      // Copia do ciclo de origem: os rascunhos dele, se estiver em construção; senão as abas publicadas.
      const emConstrucao = rascunhos.some(function (r) { return texto_(r.ciclo) === origem && texto_(r.status) !== 'APROVADO'; });
      const daOrigem = function (publicada, rascunho) {
        return objs(emConstrucao ? rascunho : publicada).filter(function (o) { return texto_(o.ciclo) === origem; })
          .map(function (o) { return Object.assign({}, o, { ciclo: ciclo }); });
      };
      let movimentos = daOrigem('movimentos', 'rMovimentos');
      if (!movimentos.length) throw new Error('O ciclo "' + origem + '" não foi encontrado.');
      let tipos = daOrigem('tipos', 'rTipos');
      if (soFixos) {
        // Só os espaços fixos (🔒), com os tipos dos movimentos deles; as comunicações ficam em branco.
        movimentos = movimentos.filter(function (o) { return normSimbolo_(o.simbolo) === 'FIXO'; });
        if (!movimentos.length) throw new Error('O ciclo "' + origem + '" não tem espaços fixos (🔒).');
        const usados = {};
        movimentos.forEach(function (o) { etiquetasDaLinha_(o).forEach(function (e) { usados[chaveEtiqueta_(e)] = true; }); });
        tipos = tipos.filter(function (t) { return usados[chaveEtiqueta_(t.etiqueta)]; });
      } else {
        trocar('rPaineis', objs('rPaineis').concat(daOrigem('paineis', 'rPaineis')));
      }
      trocar('rMovimentos', objs('rMovimentos').concat(movimentos));
      trocar('rTipos', objs('rTipos').concat(tipos, tiposQueFaltam_(ciclo, movimentos, tipos)));
    }
    trocar('rascunhos', rascunhos.filter(function (r) { return !doCiclo(r); }).concat([{
      ciclo: ciclo, status: 'EM_CONSTRUCAO', origem: origem ? origem + (soFixos ? ' (só os fixos)' : '') : '',
      criadoPor: quem.autor, criadoEm: quando,
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
    // Só movimentos cadastrados nos Tipos de movimento do ciclo.
    const tipos = {};
    objs('rTipos').filter(doCiclo).forEach(function (t) { tipos[chaveEtiqueta_(t.etiqueta)] = true; });
    const fora = linha ? etiquetasDaLinha_(linha).filter(function (e) { return !tipos[chaveEtiqueta_(e)]; }) : [];
    if (fora.length) {
      throw new Error('Movimento fora dos Tipos de movimento do ciclo: ' + listaCurta_(fora) + '. Cadastre primeiro em Tipos de movimento (com o GMV).');
    }
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
      // O tipo é o movimento: uma observação depois do "|" fica só nas etiquetas dos espaços.
      const etiqueta = movimentoDaEtiqueta_(l && l.etiqueta).slice(0, 200);
      const k = chaveEtiqueta_(etiqueta);
      if (!etiqueta || vistos[k]) return null;
      vistos[k] = true;
      const gmv = numeroGmv_(l.gmv);
      // Cada linha é um movimento que o ciclo pode usar, mesmo antes de ter classificação ou GMV.
      return { ciclo: ciclo, etiqueta: etiqueta, classificacao: normClassificacao_(l.classificacao), gmv: gmv === null ? '' : gmv, observacao: texto_(l.observacao).slice(0, 2000) };
    }).filter(Boolean);
    trocar('rTipos', semCiclo('rTipos').concat(linhas));
    return { abas: novas, gravar: gravar };
  }

  if (p.acao === 'enviar') {
    exigir('CONSTRUTOR', 'envia o ciclo para aprovação');
    exigirRascunho('EM_CONSTRUCAO');
    const tipos = objs('rTipos').filter(doCiclo);
    if (!tipos.length) throw new Error('Passo 1: cadastre os Tipos de movimento do ciclo (com o GMV) antes de enviar.');
    const semGmv = tipos.filter(function (t) { return typeof t.gmv === 'number' ? !isFinite(t.gmv) : numeroGmv_(t.gmv) === null; });
    if (semGmv.length) {
      throw new Error('Passo 1: falta o GMV esperado de ' + listaCurta_(semGmv.map(function (t) { return texto_(t.etiqueta); })) + ' em Tipos de movimento.');
    }
    const movimentos = objs('rMovimentos').filter(doCiclo);
    if (!movimentos.length) throw new Error('Passo 2: o ciclo está vazio. Preencha pelo menos um espaço antes de enviar.');
    const fora = tiposQueFaltam_(ciclo, movimentos, tipos).map(function (t) { return t.etiqueta; });
    if (fora.length) {
      throw new Error('Passo 2: há espaços com movimentos fora dos Tipos de movimento: ' + listaCurta_(fora) + '. Cadastre-os nos tipos ou troque nos espaços.');
    }
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
    // Todos os Tipos de movimento cadastrados no ciclo vão para a aba "Tipos de movimento", inclusive os movimentos
    // novos que ainda não estão em nenhum espaço; o GMV vai como número.
    const comoPublicada = function (campo, o) {
      if (campo !== 'tipos') return o;
      const gmv = typeof o.gmv === 'number' ? o.gmv : numeroGmv_(o.gmv);
      return Object.assign({}, o, { gmv: gmv === null ? '' : gmv });
    };
    [['movimentos', 'rMovimentos'], ['paineis', 'rPaineis'], ['tipos', 'rTipos']].forEach(function (x) {
      const linhas = objs(x[1]).filter(doCiclo).map(function (o) { return comoPublicada(x[0], o); });
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
