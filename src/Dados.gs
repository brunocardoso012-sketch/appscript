/**
 * ============================================================================
 *  LEITURA DAS ABAS E NORMALIZAÇÃO (funções puras, sem I/O)
 * ============================================================================
 *  Usado pelo app (Code.gs) e pela versão estática (web/). Não acessa a planilha: recebe as matrizes
 *  [cabeçalho, ...linhas] e devolve o objeto que a página desenha.
 */

/**
 * Converte as matrizes das abas no objeto usado pela página.
 * Função pura (não acessa a planilha) — facilita testes.
 */
function montarDados_(valoresLayout, valoresMov, valoresPain, valoresTipos) {
  const avisos = [];
  const aviso = function (msg) { if (avisos.length < 60) avisos.push(msg); };

  // ---------- Layout ----------
  let linhasLayout;
  if (valoresLayout && valoresLayout.length) {
    const lido = objetosDeValores_(valoresLayout, colunasLayout_());
    if (lido.faltando.length) {
      aviso('Aba "' + CONFIG.ABAS.LAYOUT + '": coluna(s) não encontrada(s): ' + lido.faltando.join(', ') + '.');
    }
    linhasLayout = lido.linhas;
  } else {
    aviso('Aba "' + CONFIG.ABAS.LAYOUT + '" não encontrada ou vazia — usando o layout padrão.');
    linhasLayout = objetosDeValores_(valoresLayoutPadrao_(), colunasLayout_()).linhas;
  }
  const plantas = montarPlantas_(linhasLayout, aviso);
  const idsPorPlanta = {};
  const comEspacos = {}; // ID dos móveis preenchidos por espaço (gôndola, mesas, totem, móvel make)
  plantas.forEach(function (p) {
    idsPorPlanta[p.id] = {};
    p.moveis.forEach(function (m) {
      idsPorPlanta[p.id][m.id] = true;
      if (espacosDoMovel_(m).length) comEspacos[m.id] = true;
      espacosAceitos_(m).forEach(function (e) { idsPorPlanta[p.id][m.id + '/' + e] = true; });
    });
  });
  const existeMovel = function (planta, id) {
    if (planta === CONFIG.PLANTA_TODAS) {
      return plantas.some(function (p) { return idsPorPlanta[p.id][id]; });
    }
    return !!(idsPorPlanta[planta] && idsPorPlanta[planta][id]);
  };

  const movelDe = function (id) {
    for (let i = 0; i < plantas.length; i++) {
      const m = plantas[i].moveis.filter(function (x) { return x.id === id; })[0];
      if (m) return m;
    }
    return null;
  };

  const ciclos = [];
  const registrarCiclo = function (c) { if (ciclos.indexOf(c) < 0) ciclos.push(c); };

  // ---------- Movimentos ----------
  const movimentos = {};
  if (valoresMov && valoresMov.length) {
    const lido = objetosDeValores_(valoresMov, colunasMovimentos_());
    if (lido.faltando.length) {
      aviso('Aba "' + CONFIG.ABAS.MOVIMENTOS + '": coluna(s) não encontrada(s): ' + lido.faltando.join(', ') + '.');
    }
    lido.linhas.forEach(function (l) {
      const ciclo = texto_(l.ciclo);
      const planta = normPlanta_(l.planta);
      // Aceita os nomes antigos das pontas da gôndola (LADO-A, PONTA-2…).
      const id = normIdEspaco_(l.movel);
      const onde = CONFIG.ABAS.MOVIMENTOS + ', linha ' + l._linha;
      if (!ciclo || !planta || !id) {
        aviso(onde + ': Ciclo, Planta e ID Móvel são obrigatórios — linha ignorada.');
        return;
      }
      if (PLANTAS_EXCLUIDAS.indexOf(planta) >= 0) return; // planta apagada pelo Desenvolvedor (linhas mantidas)
      if (!idsPorPlanta[planta] && planta !== CONFIG.PLANTA_TODAS) {
        aviso(onde + ': planta "' + planta + '" não existe no Layout.');
      } else if (!existeMovel(planta, id)) {
        aviso(onde + ': móvel "' + id + '" não existe no Layout da planta ' + planta + '.');
      } else if (movelDe(id) && TIPOS_SEM_ETIQUETA.indexOf(movelDe(id).tipo) >= 0) {
        aviso(onde + ': "' + id + '" é móvel de atendimento, que não leva cor nem etiqueta — linha ignorada.');
        return;
      } else if (comEspacos[id]) {
        aviso(onde + ': "' + id + '" é preenchido por espaço (ex.: ' + id + '/' + espacosDoMovel_(movelDe(id))[0].id + ') — linha do móvel inteiro ignorada.');
        return;
      }
      const etiquetas = [];
      for (let i = 1; i <= CONFIG.MAX_ETIQUETAS; i++) {
        const t = texto_(l['etiqueta' + i]);
        // posicao = número da coluna (na gôndola, cada uma vai para um bloco).
        if (t) etiquetas.push(etiquetaDaLinha_(l, i, t, aviso, onde));
      }
      registrarCiclo(ciclo);
      movimentos[ciclo] = movimentos[ciclo] || {};
      movimentos[ciclo][planta] = movimentos[ciclo][planta] || {};
      movimentos[ciclo][planta][id] = {
        marca: normMarca_(l.marca, aviso, onde),
        etiquetas: etiquetas,
        simbolo: normSimbolo_(l.simbolo, aviso, onde),
        observacao: texto_(l.observacao),
      };
    });
  }

  // ---------- Painéis ----------
  const paineis = {};
  if (valoresPain && valoresPain.length) {
    const lido = objetosDeValores_(valoresPain, colunasPaineis_());
    if (lido.faltando.length) {
      aviso('Aba "' + CONFIG.ABAS.PAINEIS + '": coluna(s) não encontrada(s): ' + lido.faltando.join(', ') + '.');
    }
    lido.linhas.forEach(function (l) {
      const ciclo = texto_(l.ciclo);
      const planta = normPlanta_(l.planta);
      const texto = texto_(l.texto);
      const onde = CONFIG.ABAS.PAINEIS + ', linha ' + l._linha;
      const secao = normSecao_(l.secao);
      if (!ciclo || !planta || !texto) {
        aviso(onde + ': Ciclo, Planta e Texto são obrigatórios — linha ignorada.');
        return;
      }
      if (PLANTAS_EXCLUIDAS.indexOf(planta) >= 0) return; // planta apagada pelo Desenvolvedor (linhas mantidas)
      if (!secao) {
        aviso(onde + ': seção "' + texto_(l.secao) + '" inválida (use ' + Object.keys(SECOES_PAINEL).join(', ') + ').');
        return;
      }
      const movel = normId_(l.movel);
      if (movel && !existeMovel(planta, movel)) {
        aviso(onde + ': móvel "' + movel + '" não existe no Layout da planta ' + planta + '.');
      }
      registrarCiclo(ciclo);
      paineis[ciclo] = paineis[ciclo] || {};
      paineis[ciclo][planta] = paineis[ciclo][planta] || [];
      paineis[ciclo][planta].push({ secao: secao, texto: texto, marca: normMarca_(l.marca, aviso, onde), movel: movel });
    });
  }

  // ---------- Tipos de movimento (classificação e GMV esperado por etiqueta) ----------
  const tiposMovimento = {};
  if (valoresTipos && valoresTipos.length) {
    const lido = objetosDeValores_(valoresTipos, colunasTipos_());
    if (lido.faltando.length) {
      aviso('Aba "' + CONFIG.ABAS.TIPOS + '": coluna(s) não encontrada(s): ' + lido.faltando.join(', ') + '.');
    }
    // Movimento cadastrado sem nenhum espaço no ciclo é válido (ex.: cadastrado na construção do ciclo).
    lido.linhas.forEach(function (l) {
      const ciclo = texto_(l.ciclo);
      const texto = texto_(l.etiqueta);
      const onde = CONFIG.ABAS.TIPOS + ', linha ' + l._linha;
      if (!ciclo && !texto) return;
      if (!ciclo || !texto) {
        aviso(onde + ': Ciclo e Movimento (etiqueta) são obrigatórios — linha ignorada.');
        return;
      }
      const k = chaveEtiqueta_(texto);
      tiposMovimento[ciclo] = tiposMovimento[ciclo] || {};
      if (tiposMovimento[ciclo][k]) {
        aviso(onde + ': "' + texto + '" já aparece antes no ciclo ' + ciclo + ' — linha ignorada.');
        return;
      }
      const gmv = numeroGmv_(l.gmv);
      if (gmv === null && texto_(l.gmv)) aviso(onde + ': GMV esperado "' + texto_(l.gmv) + '" não é um número — ignorado.');
      tiposMovimento[ciclo][k] = {
        texto: movimentoDaEtiqueta_(texto),
        classificacao: normClassificacao_(l.classificacao),
        gmv: gmv,
        observacao: texto_(l.observacao),
      };
    });
  }

  return {
    versao: 1,
    plantas: plantas,
    ciclos: ciclos,
    movimentos: movimentos,
    paineis: paineis,
    tiposMovimento: tiposMovimento,
    classificacoes: CLASSIFICACOES,
    avisos: avisos,
    marcas: MARCAS,
    simbolos: SIMBOLOS,
    secoes: SECOES_PAINEL,
    tipos: TIPOS_MOVEL,
    tiposConstrucao: TIPOS_CONSTRUCAO,
    medalhas: MEDALHAS,
    colunas: { movimentos: colunasMovimentos_(), paineis: colunasPaineis_(), tipos: colunasTipos_(), layout: colunasLayout_(), produtos: colunasProdutos_() },
    config: {
      maxEtiquetas: CONFIG.MAX_ETIQUETAS, plantaTodas: CONFIG.PLANTA_TODAS, abas: CONFIG.ABAS,
      etiquetasPorTipo: ETIQUETAS_POR_TIPO, etiquetasPorBloco: ETIQUETAS_POR_BLOCO, nomesPlantas: NOMES_PLANTAS,
      limitesPrateleira: LIMITES_PRATELEIRA,
      espacosPorEr: ESPACOS_POR_ER,
      herancaEntreErs: HERANCA_ENTRE_ERS,
    },
  };
}

function montarPlantas_(linhas, aviso) {
  const mapa = {};
  const ordem = [];
  const tipos = {};
  Object.keys(TIPOS_MOVEL).forEach(function (t) { tipos[chave_(t)] = t; });

  linhas.forEach(function (l) {
    const planta = normPlanta_(l.planta);
    const id = normId_(l.movel);
    if (!planta && !id) return;
    const onde = CONFIG.ABAS.LAYOUT + ', linha ' + l._linha;
    if (!planta || !id || planta === CONFIG.PLANTA_TODAS) {
      aviso(onde + ': Planta e ID Móvel são obrigatórios (e a planta não pode ser "TODAS").');
      return;
    }
    let tipo = tipos[chave_(l.tipo)];
    if (!tipo) {
      aviso(onde + ': tipo "' + texto_(l.tipo) + '" desconhecido — desenhado como GONDOLA.');
      tipo = 'GONDOLA';
    }
    if (!mapa[planta]) {
      mapa[planta] = { id: planta, nome: nomePlanta_(planta), loja: null, moveis: [] };
      ordem.push(planta);
    }
    const p = mapa[planta];
    if (tipo === 'LOJA') {
      p.loja = {
        largura: Math.max(1, numero_(l.largura, 20)),
        profundidade: Math.max(1, numero_(l.profundidade, 20)),
        alturaParede: Math.max(0, numero_(l.altura, 4.5)),
        escalaEtiquetas: normTamanhoEtiquetas_(l.tamanhoEtiquetas),
        // Com largura do slide, os ajustes de etiqueta da planta são posições fixas (valem em qualquer ciclo).
        slide: normSlide_(l.slide),
      };
      return;
    }
    if (p.moveis.some(function (m) { return m.id === id; })) {
      aviso(onde + ': ID "' + id + '" repetido na planta ' + planta + ' — ignorado.');
      return;
    }
    p.moveis.push({
      id: id,
      descricao: texto_(l.descricao),
      tipo: tipo,
      x: numero_(l.x, 0),
      y: numero_(l.y, 0),
      z: numero_(l.z, 0),
      w: Math.max(0.1, numero_(l.largura, 1)),
      d: Math.max(0.1, numero_(l.profundidade, 1)),
      h: Math.max(0.1, numero_(l.altura, 1)),
      ajusteX: numero_(l.ajusteX, 0),
      ajusteY: numero_(l.ajusteY, 0),
      ajustesEspacos: lerAjustesEspacos_(l.ajusteEspacos),
      dividido: normDivisao_(l.dividido),
      giro: normGiro_(l.giro),
    });
  });

  ordem.forEach(function (id) {
    const p = mapa[id];
    if (p.loja) return;
    let maxX = 1;
    let maxY = 1;
    p.moveis.forEach(function (m) {
      if (m.tipo === 'EXTRA') return;
      maxX = Math.max(maxX, m.x + m.w);
      maxY = Math.max(maxY, m.y + m.d);
    });
    p.loja = { largura: Math.ceil(maxX + 1), profundidade: Math.ceil(maxY + 1), alturaParede: 4.5 };
    aviso('Planta ' + id + ': sem linha do tipo LOJA no Layout — tamanho calculado automaticamente.');
  });

  // Ordem do Desenvolvedor (é a ordem da cascata); as plantas que não estão nela vão depois, pelo número.
  const pos = function (id) { const i = ORDEM_PLANTAS.indexOf(id); return i < 0 ? ORDEM_PLANTAS.length : i; };
  ordem.sort(function (a, b) { return pos(a) - pos(b) || a.localeCompare(b, 'pt-BR', { numeric: true }); });
  return ordem.map(function (id) { return mapa[id]; });
}

/**
 * Transforma uma matriz [cabeçalho, ...linhas] em objetos {chave: valor},
 * localizando as colunas pelo título (ignorando acentos/maiúsculas/ordem).
 */
function objetosDeValores_(valores, colunas) {
  if (!valores || !valores.length) {
    return { linhas: [], faltando: colunas.filter(function (c) { return c.obrigatoria; }).map(function (c) { return c.titulo; }) };
  }
  const cab = valores[0].map(chave_);
  const idx = {};
  colunas.forEach(function (c) {
    const i = acharColuna_(cab, c);
    if (i >= 0) idx[c.chave] = i;
  });
  const faltando = colunas
    .filter(function (c) { return c.obrigatoria && !(c.chave in idx); })
    .map(function (c) { return c.titulo; });
  const linhas = [];
  for (let r = 1; r < valores.length; r++) {
    const row = valores[r] || [];
    if (row.every(function (v) { return texto_(v) === ''; })) continue;
    const o = { _linha: r + 1 };
    colunas.forEach(function (c) { o[c.chave] = c.chave in idx ? row[idx[c.chave]] : ''; });
    linhas.push(o);
  }
  return { linhas: linhas, faltando: faltando };
}

function acharColuna_(cabecalhoNormalizado, coluna) {
  if (!coluna) return -1;
  const nomes = [coluna.titulo].concat(coluna.apelidos || []).map(chave_);
  for (let n = 0; n < nomes.length; n++) {
    const i = cabecalhoNormalizado.indexOf(nomes[n]);
    if (i >= 0) return i;
  }
  return -1;
}

/* ------------------------- Calendário dos ciclos -------------------------- */

/** Calendário dos ciclos que a marca segue: só a Eudora tem o dela; todas as outras seguem o do Boticário. */
function calendarioDaMarca_(marca) {
  return normMarca_(marca) === 'EUD' ? 'EUD' : 'BOT';
}

/** "2026-10-25" → dia corrido (para contar dias sem fuso nem horário de verão). */
function diaDaData_(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN;
}

/** Dias úteis entre duas datas (inclusive): de segunda a sexta, menos os feriados. */
function diasUteis_(inicio, fim, feriados) {
  const fer = {};
  (feriados || []).forEach(function (f) { fer[diaDaData_(f.data)] = true; });
  let n = 0;
  for (let d = diaDaData_(inicio); d <= diaDaData_(fim); d++) {
    const semana = new Date(d * 86400000).getUTCDay();
    if (semana !== 0 && semana !== 6 && !fer[d]) n++;
  }
  return n;
}

/**
 * Calendário dos ciclos e feriados, das abas "Calendário de ciclos" (Marca, Ciclo, Início, Fim) e "Feriados"
 * (Data, Feriado). A Marca diz o calendário: Eudora (EUD) tem o dela; qualquer outra (ou vazia), o do Boticário.
 * Datas: data do Sheets, dd/mm/aaaa ou aaaa-mm-dd. Linhas com problema ficam de fora, com aviso; ciclos que se
 * sobrepõem no mesmo calendário ficam, com aviso.
 * @return {{calendarios, ciclos: {BOT: Array<{ciclo, inicio, fim}>, EUD: Array}, feriados: Array<{data, nome}>,
 *   avisos: string[], observacoes: string[], abas: {ciclos: boolean, feriados: boolean}}}
 *   avisos: problemas de leitura; observacoes: dias sem ciclo entre dois ciclos e ciclos que começam num
 *   feriado ou fim de semana (só informativo)
 */
function calendarioDeValores_(valoresCiclos, valoresFeriados) {
  const avisos = [];
  const aviso = function (msg) { if (avisos.length < 40) avisos.push(msg); };
  const ciclos = {};
  Object.keys(CALENDARIOS).forEach(function (k) { ciclos[k] = []; });
  const dataBr = function (iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4); };

  if (valoresCiclos && valoresCiclos.length) {
    const lido = objetosDeValores_(valoresCiclos, colunasCiclos_());
    if (lido.faltando.length) {
      aviso('Aba "' + CONFIG.ABAS.CICLOS + '": coluna(s) não encontrada(s): ' + lido.faltando.join(', ') + '.');
    } else {
      const vistos = {};
      lido.linhas.forEach(function (l) {
        const onde = CONFIG.ABAS.CICLOS + ', linha ' + l._linha;
        const ciclo = texto_(l.ciclo).replace(/\s+/g, ' ');
        const inicio = dataAntecipacao_(l.inicio);
        const fim = dataAntecipacao_(l.fim);
        if (!ciclo) { aviso(onde + ': sem o nome do ciclo — linha ignorada.'); return; }
        if (!inicio || !fim) { aviso(onde + ' (' + ciclo + '): o início ou o fim não é uma data — linha ignorada.'); return; }
        if (fim < inicio) { aviso(onde + ' (' + ciclo + '): o fim vem antes do início — linha ignorada.'); return; }
        const cal = calendarioDaMarca_(l.calendario);
        const k = cal + '|' + chave_(ciclo);
        if (vistos[k]) { aviso(onde + ': o ' + ciclo + ' já aparece antes no calendário ' + CALENDARIOS[cal].nome + ' — linha ignorada.'); return; }
        vistos[k] = true;
        ciclos[cal].push({ ciclo: ciclo, inicio: inicio, fim: fim });
      });
    }
  }
  Object.keys(ciclos).forEach(function (k) {
    ciclos[k].sort(function (a, b) { return a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0; });
    ciclos[k].forEach(function (c, i) {
      const ant = ciclos[k][i - 1];
      if (ant && c.inicio <= ant.fim) aviso(CONFIG.ABAS.CICLOS + ': no calendário ' + CALENDARIOS[k].nome + ', o ' + c.ciclo + ' se sobrepõe ao ' + ant.ciclo + '.');
    });
  });

  const feriados = [];
  if (valoresFeriados && valoresFeriados.length) {
    const lido = objetosDeValores_(valoresFeriados, colunasFeriados_());
    if (lido.faltando.length) {
      aviso('Aba "' + CONFIG.ABAS.FERIADOS + '": coluna(s) não encontrada(s): ' + lido.faltando.join(', ') + '.');
    } else {
      const vistos = {};
      lido.linhas.forEach(function (l) {
        const data = dataAntecipacao_(l.data);
        if (!data) { aviso(CONFIG.ABAS.FERIADOS + ', linha ' + l._linha + ': "' + texto_(l.data) + '" não é uma data — linha ignorada.'); return; }
        if (vistos[data]) return;
        vistos[data] = true;
        feriados.push({ data: data, nome: texto_(l.nome).replace(/\s+/g, ' ') || 'Feriado' });
      });
      feriados.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
    }
  }

  // Observações (não impedem nada): buracos entre os ciclos e começo em feriado ou fim de semana.
  const observacoes = [];
  const fer = {};
  feriados.forEach(function (f) { fer[f.data] = f.nome; });
  Object.keys(ciclos).forEach(function (k) {
    const nomeCal = CALENDARIOS[k].nome;
    ciclos[k].forEach(function (c, i) {
      const ant = ciclos[k][i - 1];
      const buraco = ant ? diaDaData_(c.inicio) - diaDaData_(ant.fim) - 1 : 0;
      if (buraco > 0) observacoes.push(nomeCal + ': ' + buraco + (buraco === 1 ? ' dia' : ' dias') + ' sem ciclo entre o ' + ant.ciclo + ' e o ' + c.ciclo + '.');
      if (fer[c.inicio]) observacoes.push(nomeCal + ': o ' + c.ciclo + ' começa num feriado (' + fer[c.inicio] + ', ' + dataBr(c.inicio) + ').');
      else if ([0, 6].indexOf(new Date(diaDaData_(c.inicio) * 86400000).getUTCDay()) >= 0) {
        observacoes.push(nomeCal + ': o ' + c.ciclo + ' começa num fim de semana (' + dataBr(c.inicio) + ').');
      }
    });
  });

  return {
    calendarios: CALENDARIOS,
    ciclos: ciclos,
    feriados: feriados,
    avisos: avisos,
    observacoes: observacoes.slice(0, 40),
    abas: { ciclos: !!valoresCiclos, feriados: !!valoresFeriados },
  };
}

/* ------------------------------ Inventário -------------------------------- */

/**
 * Aba "Inventario" (opcional, criada à mão): em quantas lojas da rede cada móvel ou espaço existe.
 * Colunas: ID Móvel (o móvel, "GONDOLA 1", ou um espaço dele, "GONDOLA 1/PONTA-B") e Lojas. Uma linha
 * TOTAL (ou REDE) informa o total de lojas da rede; sem ela, o total é o maior número da aba (o móvel
 * que toda loja tem). Sem as colunas pelo nome, usa as duas primeiras.
 * @return {{lojas: Object<string, number>, total: number}|null} null sem a aba (ou sem nenhum número)
 */
function inventarioDeValores_(valores) {
  if (!valores || valores.length < 2) return null;
  const cab = valores[0].map(chave_);
  const coluna = function (re) { for (let i = 0; i < cab.length; i++) if (re.test(cab[i])) return i; return -1; };
  let cId = coluna(/MOVEL|ESPACO|^ID/);
  let cLojas = coluna(/LOJA|QUANT|QTD|PRESEN/);
  if (cId < 0) cId = cLojas === 0 ? 1 : 0;
  if (cLojas < 0) cLojas = cId === 0 ? 1 : 0;
  const lojas = {};
  let total = 0;
  let maior = 0;
  valores.slice(1).forEach(function (l) {
    const id = normIdEspaco_(l[cId]);
    // Contagem de lojas: "1.000" é mil (ponto de milhar), não 1.
    const bruto = texto_(l[cLojas]).replace(/\s/g, '');
    const n = /^\d{1,3}(\.\d{3})+$/.test(bruto) ? Number(bruto.replace(/\./g, '')) : numero_(l[cLojas], NaN);
    if (!id || !(n >= 0)) return;
    if (['TOTAL', 'REDE', 'TOTALDELOJAS', 'TOTALDAREDE'].indexOf(chave_(id)) >= 0) { total = n; return; }
    lojas[id] = Math.max(lojas[id] || 0, n);
    maior = Math.max(maior, n);
  });
  if (!Object.keys(lojas).length) return null;
  return { lojas: lojas, total: total || maior };
}

/* ---------------------------- Normalização -------------------------------- */

/** "Móvel (referência)" → "MOVELREFERENCIA" */
function chave_(v) {
  return String(v === null || v === undefined ? '' : v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function texto_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return p2(v.getDate()) + '/' + p2(v.getMonth() + 1) + '/' + v.getFullYear();
  }
  return String(v).replace(/\r\n?/g, '\n').trim();
}

/** Aceita número, "1.5" ou "1,5". */
function numero_(v, padrao) {
  if (typeof v === 'number' && isFinite(v)) return v;
  const s = texto_(v).replace(/\s/g, '');
  if (!s) return padrao;
  const n = Number(s.indexOf(',') >= 0 ? s.replace(/\./g, '').replace(',', '.') : s);
  return isFinite(n) ? n : padrao;
}

/** "1", "01", "Planta 1", "ER P" → "01"; "todas" / "*" → "TODAS". */
function normPlanta_(v) {
  const s = texto_(v).toUpperCase().replace(/^PLANTA\s*/, '').trim();
  if (!s) return '';
  const k = chave_(s);
  if (s === '*' || k === 'TODAS' || k === 'TODOS' || k === 'GERAL') return CONFIG.PLANTA_TODAS;
  const porNome = Object.keys(NOMES_PLANTAS).filter(function (id) { return chave_(NOMES_PLANTAS[id]) === k; })[0];
  if (porNome) return porNome;
  const porApelido = Object.keys(APELIDOS_PLANTAS).filter(function (id) {
    return (APELIDOS_PLANTAS[id] || []).some(function (n) { return chave_(n) === k; });
  })[0];
  if (porApelido) return porApelido;
  if (/^\d+([.,]0+)?$/.test(s)) {
    const n = parseInt(s, 10);
    return (n < 10 ? '0' : '') + n;
  }
  return s;
}

/** "01" → "ER P" (ou "PLANTA 05" para planta sem nome em NOMES_PLANTAS). */
function nomePlanta_(id) {
  return NOMES_PLANTAS[id] || 'PLANTA ' + id;
}

/** Tamanho das etiquetas da planta, em % (linha LOJA do Layout): 60 a 250; vazio ou inválido = 100. */
function normTamanhoEtiquetas_(v) {
  const n = Math.round(numero_(String(texto_(v)).replace('%', ''), 100));
  return n > 0 ? Math.max(60, Math.min(250, n)) : 100;
}

/**
 * Separador da observação da etiqueta: "LÇTO EGEO | só no kit" aparece assim na planta, mas o movimento
 * (o que entra nas contas, nos Tipos de movimento e no Analytics) é só o que vem antes: "LÇTO EGEO".
 */
const SEPARADOR_OBS_ETIQUETA = '|';

/** Movimento de uma etiqueta: o texto sem a observação depois do "|". */
function movimentoDaEtiqueta_(t) {
  const s = texto_(t);
  const i = s.indexOf(SEPARADOR_OBS_ETIQUETA);
  return (i < 0 ? s : s.slice(0, i)).trim();
}

/** Mesmo movimento, com variações de maiúsculas e espaços e sem a observação depois do "|" (igual ao Analytics). */
function chaveEtiqueta_(t) {
  return movimentoDaEtiqueta_(t).replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Classificação do movimento: código de CLASSIFICACOES ("Lançamento", "promo", "OUTLET" → LANCAMENTO,
 * PROMOCAO, LIQUIDACAO…). Outro texto fica como está (classificação própria). Vazio → ''.
 */
function normClassificacao_(v) {
  const k = chave_(v);
  if (!k) return '';
  const cod = Object.keys(CLASSIFICACOES).filter(function (c) {
    const x = CLASSIFICACOES[c];
    return [c, x.nome].concat(x.apelidos || []).map(chave_).indexOf(k) >= 0;
  })[0];
  return cod || texto_(v);
}

/**
 * GMV em reais: aceita número ou texto ("R$ 1.500.000,00", "1500000", "1,5 mi", "250 mil", "1.2M").
 * @return {number|null} null quando vazio ou inválido
 */
function numeroGmv_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = texto_(v).toUpperCase().replace(/R\$/g, '').replace(/\s+/g, '');
  if (!s) return null;
  let fator = 1;
  const sufixo = s.match(/(MILHOES|MILHÕES|MILHAO|MILHÃO|MI|MM|M|MIL|K)$/);
  if (sufixo) {
    fator = /^(MIL|K)$/.test(sufixo[1]) ? 1e3 : 1e6;
    s = s.slice(0, -sufixo[1].length);
  }
  if (!/^-?[\d.,]+$/.test(s)) return null;
  const virgula = s.lastIndexOf(',');
  const ponto = s.lastIndexOf('.');
  if (virgula >= 0 && ponto >= 0) {
    // O último separador é o decimal ("1.500,50" ou "1,500.50").
    s = virgula > ponto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (virgula >= 0) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) && fator === 1 ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s) && fator === 1) {
    s = s.replace(/\./g, ''); // "1.500.000"
  }
  const n = Number(s) * fator;
  return isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Giro do móvel (hoje só o balcão recepção usa): 0, 90, 180 ou 270. */
function normGiro_(v) {
  const n = Math.round(numero_(v, 0) / 90) * 90;
  return ((n % 360) + 360) % 360;
}

/**
 * Posição manual de cada pilha de etiquetas de um móvel com espaços (gôndola, mesas, totem, make),
 * somada ao ajuste do móvel inteiro. Na planilha: "PONTA-A: 10, -5; MEIO-B+PONTA-B: 0, 20" (a chave é
 * o espaço da pilha; espaços vizinhos com as mesmas etiquetas formam uma pilha só, ligados por "+").
 * Aceita também o objeto já lido ({ 'PONTA-A': {x, y} }) e os nomes antigos das pontas (LADO-A…).
 * Deslocamento zero fica de fora.
 * @return {Object<string, {x: number, y: number}>}
 */
function lerAjustesEspacos_(v) {
  const mapa = {};
  const por = function (chave, x, y) {
    const k = normEspacos_(normId_(chave).replace(/\s+/g, ''));
    x = Math.round(numero_(x, 0));
    y = Math.round(numero_(y, 0));
    if (k && (x || y)) mapa[k] = { x: x, y: y };
  };
  if (v && typeof v === 'object') {
    Object.keys(v).forEach(function (k) { por(k, v[k] && v[k].x, v[k] && v[k].y); });
    return mapa;
  }
  texto_(v).split(/[;\n]+/).forEach(function (parte) {
    const m = parte.match(/^\s*([^:=]+?)\s*[:=]\s*(-?\d+(?:[.,]\d+)?)\s*[,/ ]\s*(-?\d+(?:[.,]\d+)?)\s*$/);
    if (m) por(m[1], m[2].replace(',', '.'), m[3].replace(',', '.'));
  });
  return mapa;
}

/** Texto da coluna "Ajuste Etiquetas por espaço" (inverso de lerAjustesEspacos_). */
function textoAjustesEspacos_(mapa) {
  const limpo = lerAjustesEspacos_(mapa || {});
  return Object.keys(limpo).sort().map(function (k) { return k + ': ' + limpo[k].x + ', ' + limpo[k].y; }).join('; ');
}

/**
 * Aplica ajustes de etiquetas ({ id → {x, y} }) às linhas de um móvel: "GONDOLA 1" é o ajuste do
 * móvel inteiro; "GONDOLA 1/PONTA-A" (ou ".../MEIO-B+PONTA-B") é o de uma pilha, por cima do do móvel.
 * @param {{x: number, y: number, espacos: Object}} atual  ajuste do móvel e das pilhas (é alterado)
 * @return {boolean} se algum ajuste era deste móvel
 */
function aplicarAjusteEtiquetas_(movel, ajustes, atual) {
  let achou = false;
  const id = normId_(movel);
  Object.keys(ajustes).forEach(function (chave) {
    const k = normId_(chave);
    const a = ajustes[chave] || {};
    if (k === id) {
      atual.x = Math.round(Number(a.x) || 0);
      atual.y = Math.round(Number(a.y) || 0);
      achou = true;
    } else if (k.indexOf(id + '/') === 0) {
      const espaco = normEspacos_(k.slice(id.length + 1).replace(/\s+/g, ''));
      const x = Math.round(Number(a.x) || 0);
      const y = Math.round(Number(a.y) || 0);
      if (x || y) atual.espacos[espaco] = { x: x, y: y };
      else delete atual.espacos[espaco];
      achou = true;
    }
  });
  return achou;
}

/** Largura do slide da planta (px): 0 = automática (o slide cresce com as etiquetas). */
function normSlide_(v) {
  const n = Math.round(numero_(v, 0));
  return n >= 960 && n <= 9600 ? n : 0;
}

/** Meios divididos da gôndola: "a", "B", "A e B", "sim" → '', 'A', 'B' ou 'AB'. */
function normDivisao_(v) {
  const k = chave_(v);
  if (!k || k === 'NAO' || k === 'N') return '';
  if (k === 'SIM' || k === 'S' || k === 'AMBOS' || k === 'TODOS') return 'AB';
  return (k.indexOf('A') >= 0 ? 'A' : '') + (k.indexOf('B') >= 0 ? 'B' : '');
}

/** ID do móvel: maiúsculas, sem acento e com espaços simples ("Gôndola 1" → "GONDOLA 1"). */
function normId_(v) {
  return texto_(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ');
}

/**
 * ID da aba Movimentos, que pode ter um espaço depois da "/": aceita variações de digitação
 * ("Totem 1 / painel 1", "TOTEM 1/PAINEL1", "GONDOLA 1/PONTA A", "MEIO_A_2") → "TOTEM 1/PAINEL-1",
 * "GONDOLA 1/PONTA-A", ".../MEIO-A-2". Nomes antigos das pontas da gôndola (normEspacos_).
 */
function normIdEspaco_(v) {
  const id = normId_(v);
  const i = id.indexOf('/');
  if (i < 0) return id;
  const espaco = id.slice(i + 1).trim()
    .replace(/[\s_.\-]+/g, '-')
    .replace(/([A-Z])(\d)/g, '$1-$2')
    .replace(/^-|-$/g, '');
  return id.slice(0, i).trim() + '/' + normEspacos_(espaco);
}

/**
 * Nomes antigos das pontas da gôndola, num espaço ou numa pilha ("MEIO-B+LADO-B"): Lado A / Lado B
 * viraram Ponta A / Ponta B; antes disso, Ponta 2 era a da frente (A) e Ponta 1 a de trás (B).
 */
function normEspacos_(espacos) {
  const novo = { 'LADO-A': 'PONTA-A', 'LADO-B': 'PONTA-B', 'PONTA-2': 'PONTA-A', 'PONTA-1': 'PONTA-B' };
  return String(espacos).split('+').map(function (e) { return novo[e] || e; }).join('+');
}

let indiceMarcasCache_ = null;
function indiceMarcas_() {
  if (indiceMarcasCache_) return indiceMarcasCache_;
  const idx = {};
  Object.keys(MARCAS).forEach(function (cod) {
    [cod, MARCAS[cod].nome].concat(MARCAS[cod].apelidos || []).forEach(function (a) {
      const k = chave_(a);
      if (k) idx[k] = cod;
    });
  });
  indiceMarcasCache_ = idx;
  return idx;
}

/**
 * "Boticário" → "BOT"; "bot + qdb" → "BOT+QDB"; "#ff8800" → "#FF8800"; "" → "".
 */
function normMarca_(v, aviso, onde) {
  const s = texto_(v);
  if (!s) return '';
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const idx = indiceMarcas_();
  const codigos = [];
  s.split('+').map(function (p) { return p.trim(); }).filter(String).forEach(function (p) {
    if (hex.test(p)) {
      codigos.push(p.toUpperCase());
      return;
    }
    const cod = idx[chave_(p)];
    if (cod) codigos.push(cod);
    else if (aviso) aviso(onde + ': marca "' + p + '" não reconhecida (use ' + Object.keys(MARCAS).join(', ') + ' ou #RRGGBB).');
  });
  return codigos.join('+');
}

/**
 * Etiqueta N de uma linha da aba Movimentos: texto, marca, posição e, se houver, o símbolo próprio dela e, com a
 * antecipação (⏩), a data em que entra ("2026-10-25"). simbolo e data só aparecem quando preenchidos.
 */
function etiquetaDaLinha_(l, i, t, aviso, onde) {
  const e = { texto: t, marca: normMarca_(l['marcaEtiqueta' + i], aviso, onde), posicao: i };
  const simbolo = normSimbolo_(l['simboloEtiqueta' + i], aviso, onde, true);
  if (simbolo) e.simbolo = simbolo;
  if (simbolo === 'ANTECIPADO') {
    const data = dataAntecipacao_(l['dataEtiqueta' + i]);
    if (data) e.data = data;
    else if (texto_(l['dataEtiqueta' + i]) && aviso) aviso(onde + ': data da etiqueta ' + i + ' "' + texto_(l['dataEtiqueta' + i]) + '" inválida (use dd/mm/aaaa).');
  }
  return e;
}

function normSimbolo_(v, aviso, onde, daEtiqueta) {
  const s = texto_(v);
  if (!s) return '';
  const bruto = s.toUpperCase();
  const k = chave_(s);
  // O de antecipação (automatico) não vem da coluna Símbolo do espaço (só da aba Antecipações); na etiqueta, vem.
  const codigos = Object.keys(SIMBOLOS).filter(function (c) { return daEtiqueta || !SIMBOLOS[c].automatico; });
  for (let i = 0; i < codigos.length; i++) {
    const nomes = [codigos[i]].concat(SIMBOLOS[codigos[i]].apelidos || []);
    for (let j = 0; j < nomes.length; j++) {
      const n = nomes[j].toUpperCase();
      if (n === bruto || (k && chave_(n) === k)) return codigos[i];
    }
  }
  // O antigo símbolo "movimento" (▶) saiu: planilhas antigas que ainda o têm ficam sem símbolo, sem aviso.
  if (['MOVIMENTO', 'MOV', 'SETA', '▶', '>'].some(function (n) { return n === bruto || (k && chave_(n) === k); })) return '';
  if (aviso) aviso(onde + ': símbolo "' + s + '" não reconhecido (use ' + codigos.join(', ') + ').');
  return '';
}

function normSecao_(v) {
  const k = chave_(v);
  if (!k) return '';
  const codigos = Object.keys(SECOES_PAINEL);
  for (let i = 0; i < codigos.length; i++) {
    const nomes = [codigos[i]].concat(SECOES_PAINEL[codigos[i]].apelidos || []);
    if (nomes.some(function (n) { return chave_(n) === k; })) return codigos[i];
  }
  return '';
}

/* ======================= junção de linhas das abas ======================== */

/**
 * Junta linhas existentes de uma aba com linhas importadas: remove as antigas
 * cujo (Ciclo, Planta) aparece na importação e acrescenta as novas (no Layout,
 * que não tem Ciclo, a chave é só a Planta). chaveDe(objeto) troca a chave (opcional).
 * Fica aqui (e não no Code.gs) porque a versão web e os rascunhos também usam.
 * @return {Array<Array<string>>} matriz completa (com cabeçalho) para gravar.
 */
function mesclarLinhas_(existentes, novos, colunas, chaveDe) {
  const cab = existentes.length ? existentes[0].map(texto_) : colunas.map(function (c) { return c.titulo; });
  while (cab.length && !cab[cab.length - 1]) cab.pop();
  const cabChaves = cab.map(chave_);
  const idx = {};
  colunas.forEach(function (c) {
    let i = acharColuna_(cabChaves, c);
    if (i < 0) {
      cab.push(c.titulo);
      cabChaves.push(chave_(c.titulo));
      i = cab.length - 1;
    }
    idx[c.chave] = i;
  });
  const largura = cab.length;
  // Chave das linhas substituídas: (Ciclo, Planta), ou a de chaveDe(objeto) — ex.: (Ciclo, Planta, ID Móvel).
  const chave = chaveDe || function (o) { return texto_(o.ciclo) + '||' + normPlanta_(o.planta); };
  const substituir = {};
  novos.forEach(function (o) { substituir[chave(o)] = true; });

  // Colunas numéricas (ex.: coordenadas do Layout) mantêm números; o resto vira texto.
  const ehTexto = {};
  colunas.forEach(function (c) { if (c.texto || /^(marca|simbolo|secao|tipo|descricao)/.test(c.chave)) ehTexto[idx[c.chave]] = true; });
  const valorCelula = function (v, i) {
    return typeof v === 'number' && !ehTexto[i] ? v : texto_(v);
  };
  const linhaTexto = function (row) {
    const out = [];
    for (let i = 0; i < largura; i++) out.push(valorCelula(row[i], i));
    return out;
  };
  const mantidas = existentes.slice(1).filter(function (row) {
    if (row.every(function (v) { return texto_(v) === ''; })) return false;
    const o = {};
    colunas.forEach(function (c) { o[c.chave] = row[idx[c.chave]]; });
    return !substituir[chave(o)];
  }).map(linhaTexto);

  const adicionadas = novos.map(function (o) {
    const row = [];
    for (let i = 0; i < largura; i++) row.push('');
    colunas.forEach(function (c) {
      let v = valorCelula(o[c.chave], idx[c.chave]);
      if (c.chave === 'planta') v = normPlanta_(v);
      if (c.chave === 'movel') v = normId_(v);
      row[idx[c.chave]] = v;
    });
    return row;
  });
  return [cab].concat(mantidas, adicionadas);
}

/** Garante matriz de valores simples (string/number/boolean) vinda do navegador. */
function sanitizarMatriz_(valores) {
  return valores.map(function (row) {
    return (Array.isArray(row) ? row : []).map(function (v) {
      if (v === null || v === undefined) return '';
      if (typeof v === 'number' || typeof v === 'boolean') return v;
      return String(v).slice(0, 2000);
    });
  });
}
