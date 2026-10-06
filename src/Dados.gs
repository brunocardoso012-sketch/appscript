/**
 * ============================================================================
 *  LEITURA DAS ABAS E NORMALIZAÇÃO (funções puras, sem I/O)
 * ============================================================================
 *  Usado pelo app completo (Code.gs), pela versão estática (web/) e pela versão
 *  só de visualização (visualizador/). Não acessa a planilha: recebe as matrizes
 *  [cabeçalho, ...linhas] e devolve o objeto que a página desenha.
 */

/**
 * Converte as matrizes das abas no objeto usado pela página.
 * Função pura (não acessa a planilha) — facilita testes.
 */
function montarDados_(valoresLayout, valoresMov, valoresPain) {
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
  plantas.forEach(function (p) {
    idsPorPlanta[p.id] = {};
    p.moveis.forEach(function (m) {
      idsPorPlanta[p.id][m.id] = true;
      espacosAceitos_(m).forEach(function (e) { idsPorPlanta[p.id][m.id + '/' + e] = true; });
    });
  });
  const existeMovel = function (planta, id) {
    if (planta === CONFIG.PLANTA_TODAS) {
      return plantas.some(function (p) { return idsPorPlanta[p.id][id]; });
    }
    return !!(idsPorPlanta[planta] && idsPorPlanta[planta][id]);
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
      // Nomes antigos dos lados da gôndola: Ponta 2 era o lado da frente (A), Ponta 1 o de trás (B).
      const id = normId_(l.movel).replace(/\/PONTA-2$/, '/LADO-A').replace(/\/PONTA-1$/, '/LADO-B');
      const onde = CONFIG.ABAS.MOVIMENTOS + ', linha ' + l._linha;
      if (!ciclo || !planta || !id) {
        aviso(onde + ': Ciclo, Planta e ID Móvel são obrigatórios — linha ignorada.');
        return;
      }
      if (!idsPorPlanta[planta] && planta !== CONFIG.PLANTA_TODAS) {
        aviso(onde + ': planta "' + planta + '" não existe no Layout.');
      } else if (!existeMovel(planta, id)) {
        aviso(onde + ': móvel "' + id + '" não existe no Layout da planta ' + planta + '.');
      }
      const etiquetas = [];
      for (let i = 1; i <= CONFIG.MAX_ETIQUETAS; i++) {
        const t = texto_(l['etiqueta' + i]);
        // posicao = número da coluna (na gôndola, cada uma vai para um bloco).
        if (t) etiquetas.push({ texto: t, marca: normMarca_(l['marcaEtiqueta' + i], aviso, onde), posicao: i });
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

  return {
    versao: 1,
    plantas: plantas,
    ciclos: ciclos,
    movimentos: movimentos,
    paineis: paineis,
    avisos: avisos,
    marcas: MARCAS,
    simbolos: SIMBOLOS,
    secoes: SECOES_PAINEL,
    tipos: TIPOS_MOVEL,
    tiposConstrucao: TIPOS_CONSTRUCAO,
    colunas: { movimentos: colunasMovimentos_(), paineis: colunasPaineis_(), layout: colunasLayout_() },
    config: {
      maxEtiquetas: CONFIG.MAX_ETIQUETAS, plantaTodas: CONFIG.PLANTA_TODAS, abas: CONFIG.ABAS,
      etiquetasPorTipo: ETIQUETAS_POR_TIPO, etiquetasPorBloco: ETIQUETAS_POR_BLOCO, nomesPlantas: NOMES_PLANTAS,
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

  ordem.sort(function (a, b) { return a.localeCompare(b, 'pt-BR', { numeric: true }); });
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

/** Giro do móvel (hoje só o balcão recepção usa): 0, 90, 180 ou 270. */
function normGiro_(v) {
  const n = Math.round(numero_(v, 0) / 90) * 90;
  return ((n % 360) + 360) % 360;
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

function normSimbolo_(v, aviso, onde) {
  const s = texto_(v);
  if (!s) return '';
  const bruto = s.toUpperCase();
  const k = chave_(s);
  const codigos = Object.keys(SIMBOLOS);
  for (let i = 0; i < codigos.length; i++) {
    const nomes = [codigos[i]].concat(SIMBOLOS[codigos[i]].apelidos || []);
    for (let j = 0; j < nomes.length; j++) {
      const n = nomes[j].toUpperCase();
      if (n === bruto || (k && chave_(n) === k)) return codigos[i];
    }
  }
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
