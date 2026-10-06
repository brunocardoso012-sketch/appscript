/**
 * ============================================================================
 *  VISUALIZADOR DE PLANTAS — BACKEND (Google Apps Script)
 * ============================================================================
 *  Abas da planilha:
 *   - Movimentos: o que muda a cada ciclo (cor do móvel + etiquetas).
 *   - Painéis:    textos fora dos móveis (TV/rádio, A, C, caixas de destaque, notas).
 *   - Layout:     posição/tamanho de cada móvel em cada planta (muda raramente).
 *
 *  Funções sem "_" no final podem ser chamadas pela página (google.script.run).
 */

/* =============================== ENTRADA ================================== */

/** Publicação como App da Web. */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.TITULO)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Permite <?!= include('Arquivo'); ?> dentro dos HTML. */
function include(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/** Menu na planilha (quando o script está vinculado a ela). */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Plano de Varejo')
    .addItem('Abrir visualizador', 'abrirVisualizador')
    .addSeparator()
    .addItem('Configurar planilha (criar abas que faltam)', 'menuConfigurarPlanilha')
    .addItem('Restaurar layout padrão das plantas…', 'menuRestaurarLayout')
    .addToUi();
}

function abrirVisualizador() {
  const html = HtmlService.createTemplateFromFile('Index').evaluate().setWidth(1480).setHeight(880);
  SpreadsheetApp.getUi().showModalDialog(html, CONFIG.TITULO);
}

function menuConfigurarPlanilha() {
  SpreadsheetApp.getUi().alert(configurarPlanilha().mensagem);
}

function menuRestaurarLayout() {
  const ui = SpreadsheetApp.getUi();
  const resposta = ui.alert(
    'Restaurar layout padrão',
    'A aba "' + CONFIG.ABAS.LAYOUT + '" será substituída pelo layout padrão (posições e ajustes de ' +
      'etiquetas serão perdidos). Deseja continuar?',
    ui.ButtonSet.YES_NO
  );
  if (resposta !== ui.Button.YES) return;
  const ss = planilha_();
  comTrava_(function () {
    escreverAba_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), valoresLayoutPadrao_());
  });
  ui.alert('Layout padrão restaurado.');
}

/* ============================ API DA PÁGINA =============================== */

/**
 * Retorna tudo o que a página precisa: plantas (layout), ciclos, movimentos,
 * painéis, cores das marcas e avisos de validação.
 */
function getDados() {
  let ss;
  try {
    ss = planilha_();
  } catch (e) {
    return { precisaConfigurar: true, mensagem: e.message };
  }
  const dados = montarDados_(
    lerAba_(ss, CONFIG.ABAS.LAYOUT, false),
    lerAba_(ss, CONFIG.ABAS.MOVIMENTOS, true),
    lerAba_(ss, CONFIG.ABAS.PAINEIS, true)
  );
  dados.planilhaUrl = ss.getUrl();
  dados.precisaConfigurar = !ss.getSheetByName(CONFIG.ABAS.MOVIMENTOS);
  return dados;
}

/**
 * Cria as abas que faltam (com layout padrão e um ciclo de exemplo).
 * Nunca sobrescreve abas que já têm dados.
 */
function configurarPlanilha() {
  let ss;
  let criouPlanilha = false;
  try {
    ss = planilha_();
  } catch (e) {
    ss = SpreadsheetApp.create('Plano de Varejo – Plantas');
    PropertiesService.getScriptProperties().setProperty(CONFIG.PROPRIEDADE_PLANILHA, ss.getId());
    criouPlanilha = true;
  }

  const criadas = comTrava_(function () {
    const lista = [];
    if (criarSeVazia_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), valoresLayoutPadrao_())) {
      lista.push(CONFIG.ABAS.LAYOUT);
    }
    if (criarSeVazia_(ss, CONFIG.ABAS.MOVIMENTOS, colunasMovimentos_(), valoresMovimentosExemplo_())) {
      lista.push(CONFIG.ABAS.MOVIMENTOS);
    }
    if (criarSeVazia_(ss, CONFIG.ABAS.PAINEIS, colunasPaineis_(), valoresPaineisExemplo_())) {
      lista.push(CONFIG.ABAS.PAINEIS);
    }
    if (criouPlanilha) removerAbaPadraoVazia_(ss);
    return lista;
  });

  return {
    url: ss.getUrl(),
    criadas: criadas,
    mensagem: criadas.length
      ? 'Abas criadas: ' + criadas.join(', ') + '.'
      : 'Todas as abas já existiam — nada foi alterado.',
  };
}

/**
 * Recebe o conteúdo de uma planilha preenchida (lida no navegador) e grava
 * nas abas. Para cada par (Ciclo, Planta) presente no arquivo, as linhas
 * antigas desse par são substituídas pelas novas; o restante é mantido.
 * Se o arquivo tiver a aba Layout, as plantas presentes nela são substituídas.
 *
 * @param {{movimentos?: Array<Array<*>>, paineis?: Array<Array<*>>, layout?: Array<Array<*>>}} payload
 *        Cada item é uma matriz [cabeçalho, ...linhas] com os valores das células.
 */
function importarPlanilha(payload) {
  const ss = planilha_();
  const prep = prepararImportacao_(payload); // valida tudo antes de gravar

  const resultado = { movimentos: 0, paineis: 0, layout: 0 };
  comTrava_(function () {
    prep.preparados.forEach(function (p) {
      const sh = ss.getSheetByName(p.bloco.aba);
      const existentes = sh ? sh.getDataRange().getValues() : [];
      escreverAba_(ss, p.bloco.aba, p.bloco.colunas, mesclarLinhas_(existentes, p.linhas, p.bloco.colunas));
      resultado[p.bloco.campo] = p.linhas.length;
    });
  });

  const verificacao = verificarImportacao_(lerAba_(ss, CONFIG.ABAS.LAYOUT, false), prep);
  resultado.ciclos = verificacao.ciclos;
  resultado.avisos = verificacao.avisos;
  return resultado;
}

/** Blocos aceitos na importação. */
function blocosImportacao_() {
  return [
    { campo: 'movimentos', aba: CONFIG.ABAS.MOVIMENTOS, colunas: colunasMovimentos_() },
    { campo: 'paineis', aba: CONFIG.ABAS.PAINEIS, colunas: colunasPaineis_() },
    { campo: 'layout', aba: CONFIG.ABAS.LAYOUT, colunas: colunasLayout_() },
  ];
}

/**
 * Valida o conteúdo importado (função pura).
 * @return {{preparados: Array<{bloco, linhas, matriz}>, avisosLeitura: string[]}}
 */
function prepararImportacao_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Arquivo vazio ou inválido.');
  const preparados = [];
  const avisosLeitura = [];
  blocosImportacao_().forEach(function (b) {
    const valores = payload[b.campo];
    if (!Array.isArray(valores) || !valores.length) return;
    if (valores.length - 1 > CONFIG.MAX_LINHAS_IMPORTACAO) {
      throw new Error('Aba "' + b.aba + '" tem linhas demais (máx. ' + CONFIG.MAX_LINHAS_IMPORTACAO + ').');
    }
    const matriz = sanitizarMatriz_(valores);
    const lido = objetosDeValores_(matriz, b.colunas);
    if (lido.faltando.length) {
      throw new Error('Aba "' + b.aba + '" do arquivo: coluna(s) obrigatória(s) não encontrada(s): ' +
        lido.faltando.join(', ') + '.');
    }
    const validas = lido.linhas.filter(function (o) {
      let ok;
      if (b.campo === 'layout') ok = normPlanta_(o.planta) && normId_(o.movel) && texto_(o.tipo);
      else if (b.campo === 'paineis') ok = texto_(o.ciclo) && normPlanta_(o.planta) && texto_(o.texto) && texto_(o.secao);
      else ok = texto_(o.ciclo) && normPlanta_(o.planta) && normId_(o.movel);
      if (!ok && avisosLeitura.length < 30) {
        avisosLeitura.push(b.aba + ', linha ' + o._linha + ': faltam campos obrigatórios — linha ignorada.');
      }
      return ok;
    });
    preparados.push({ bloco: b, linhas: validas, matriz: matriz });
  });
  if (!preparados.length) {
    throw new Error('Não encontrei as abas "' + CONFIG.ABAS.MOVIMENTOS + '", "' + CONFIG.ABAS.PAINEIS +
      '" ou "' + CONFIG.ABAS.LAYOUT + '" no arquivo.');
  }
  return { preparados: preparados, avisosLeitura: avisosLeitura };
}

/** Avisos de conteúdo (IDs inexistentes, marcas desconhecidas…) só do que foi importado. */
function verificarImportacao_(valoresLayout, prep) {
  const matriz = function (campo) {
    const p = prep.preparados.filter(function (x) { return x.bloco.campo === campo; })[0];
    return p ? p.matriz : null;
  };
  const verificacao = montarDados_(valoresLayout, matriz('movimentos'), matriz('paineis'));
  return {
    ciclos: verificacao.ciclos,
    avisos: prep.avisosLeitura.concat(verificacao.avisos.filter(function (a) {
      return a.indexOf('Aba "' + CONFIG.ABAS.LAYOUT + '"') !== 0 || !!matriz('layout');
    })),
  };
}

/**
 * Grava a posição manual das etiquetas (arrastadas na tela) na aba Layout.
 * @param {string} planta
 * @param {Object<string, {x:number, y:number}>} ajustes  ID do móvel → deslocamento em px.
 */
function salvarAjustesEtiquetas(planta, ajustes) {
  planta = normPlanta_(planta);
  if (!planta || !ajustes || typeof ajustes !== 'object') throw new Error('Dados inválidos.');
  const ss = planilha_();
  return comTrava_(function () {
    if (!ss.getSheetByName(CONFIG.ABAS.LAYOUT)) {
      escreverAba_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), valoresLayoutPadrao_());
    }
    const sh = ss.getSheetByName(CONFIG.ABAS.LAYOUT);
    const valores = sh.getDataRange().getValues();
    const cab = valores[0].map(chave_);
    const cols = colunasLayout_();
    const col = function (chave) {
      return acharColuna_(cab, cols.filter(function (c) { return c.chave === chave; })[0]);
    };
    const iPlanta = col('planta');
    const iId = col('movel');
    let iX = col('ajusteX');
    let iY = col('ajusteY');
    if (iPlanta < 0 || iId < 0) throw new Error('Aba Layout sem as colunas Planta / ID Móvel.');
    if (iX < 0) { iX = valores[0].length; sh.getRange(1, iX + 1).setValue('Ajuste Etiqueta X (px)'); }
    if (iY < 0) { iY = Math.max(valores[0].length, iX + 1); sh.getRange(1, iY + 1).setValue('Ajuste Etiqueta Y (px)'); }

    const n = valores.length - 1;
    if (n < 1) return { atualizados: 0 };
    const colX = sh.getRange(2, iX + 1, n, 1).getValues();
    const colY = sh.getRange(2, iY + 1, n, 1).getValues();
    let atualizados = 0;
    for (let r = 1; r <= n; r++) {
      if (normPlanta_(valores[r][iPlanta]) !== planta) continue;
      const a = ajustes[normId_(valores[r][iId])];
      if (!a) continue;
      colX[r - 1][0] = Math.round(Number(a.x) || 0);
      colY[r - 1][0] = Math.round(Number(a.y) || 0);
      atualizados++;
    }
    sh.getRange(2, iX + 1, n, 1).setValues(colX);
    sh.getRange(2, iY + 1, n, 1).setValues(colY);
    return { atualizados: atualizados };
  });
}

/* ======================= TRANSFORMAÇÃO (sem I/O) ========================== */

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
    p.moveis.forEach(function (m) { idsPorPlanta[p.id][m.id] = true; });
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
      const id = normId_(l.movel);
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
        if (t) etiquetas.push({ texto: t, marca: normMarca_(l['marcaEtiqueta' + i], aviso, onde) });
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
    colunas: { movimentos: colunasMovimentos_(), paineis: colunasPaineis_(), layout: colunasLayout_() },
    config: { maxEtiquetas: CONFIG.MAX_ETIQUETAS, plantaTodas: CONFIG.PLANTA_TODAS, abas: CONFIG.ABAS },
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
      mapa[planta] = { id: planta, nome: 'PLANTA ' + planta, loja: null, moveis: [] };
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
 * Junta linhas existentes de uma aba com linhas importadas: remove as antigas
 * cujo (Ciclo, Planta) aparece na importação e acrescenta as novas (no Layout,
 * que não tem Ciclo, a chave é só a Planta).
 * @return {Array<Array<string>>} matriz completa (com cabeçalho) para gravar.
 */
function mesclarLinhas_(existentes, novos, colunas) {
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
  const par = function (ciclo, planta) { return texto_(ciclo) + '||' + normPlanta_(planta); };
  const substituir = {};
  novos.forEach(function (o) { substituir[par(o.ciclo, o.planta)] = true; });

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
    return !substituir[par(row[idx.ciclo], row[idx.planta])];
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

/** "1", "01", "Planta 1" → "01"; "todas" / "*" → "TODAS". */
function normPlanta_(v) {
  const s = texto_(v).toUpperCase().replace(/^PLANTA\s*/, '').trim();
  if (!s) return '';
  const k = chave_(s);
  if (s === '*' || k === 'TODAS' || k === 'TODOS' || k === 'GERAL') return CONFIG.PLANTA_TODAS;
  if (/^\d+([.,]0+)?$/.test(s)) {
    const n = parseInt(s, 10);
    return (n < 10 ? '0' : '') + n;
  }
  return s;
}

function normId_(v) {
  return texto_(v).toUpperCase().replace(/\s+/g, ' ');
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

/* ================================ I/O ===================================== */

function planilha_() {
  const ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (ativa) return ativa;
  const id = PropertiesService.getScriptProperties().getProperty(CONFIG.PROPRIEDADE_PLANILHA);
  if (id) return SpreadsheetApp.openById(id);
  throw new Error(
    'Nenhuma planilha vinculada ao script. Clique em "Configurar planilha" para criar uma, ' +
      'ou defina a propriedade de script ' + CONFIG.PROPRIEDADE_PLANILHA + ' com o ID da planilha.'
  );
}

/**
 * Lê uma aba inteira. Para abas de texto usa os valores exibidos (evita que
 * "10/2026" vire data ou "01" vire 1). Retorna null se a aba não existe.
 */
function lerAba_(ss, nome, comoTexto) {
  const sh = ss.getSheetByName(nome);
  if (!sh || sh.getLastRow() < 1) return sh ? [] : null;
  const range = sh.getDataRange();
  return comoTexto ? range.getDisplayValues() : range.getValues();
}

function comTrava_(fn) {
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    return fn();
  } finally {
    trava.releaseLock();
  }
}

/** Cria/preenche a aba apenas se ela não existir ou estiver vazia. */
function criarSeVazia_(ss, nome, colunas, valores) {
  const sh = ss.getSheetByName(nome);
  if (sh && sh.getLastRow() > 1) return false;
  escreverAba_(ss, nome, colunas, valores);
  return true;
}

/** Substitui todo o conteúdo da aba por "valores" (com cabeçalho) e formata. */
function escreverAba_(ss, nome, colunas, valores) {
  const sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
  const largura = valores[0].length;
  const linhas = valores.map(function (row) {
    const r = row.slice(0, largura);
    while (r.length < largura) r.push('');
    return r;
  });
  sh.clearContents();
  const maxLinhas = Math.max(linhas.length + 500, sh.getMaxRows());
  if (sh.getMaxRows() < maxLinhas) sh.insertRowsAfter(sh.getMaxRows(), maxLinhas - sh.getMaxRows());
  if (sh.getMaxColumns() < largura) sh.insertColumnsAfter(sh.getMaxColumns(), largura - sh.getMaxColumns());

  // Colunas de texto em formato "texto simples" ANTES de gravar (evita conversões automáticas).
  const cab = linhas[0].map(chave_);
  colunas.forEach(function (c) {
    const i = acharColuna_(cab, c);
    if (i >= 0 && c.texto) sh.getRange(1, i + 1, maxLinhas, 1).setNumberFormat('@');
  });
  sh.getRange(1, 1, linhas.length, largura).setValues(linhas);
  formatarAba_(sh, colunas, cab, maxLinhas);
  return sh;
}

function formatarAba_(sh, colunas, cab, maxLinhas) {
  const largura = cab.length;
  sh.setFrozenRows(1);
  // Na aba Movimentos, congela até a coluna "ID Móvel" (Ciclo, Planta, ID sempre visíveis).
  if (sh.getName() === CONFIG.ABAS.MOVIMENTOS) {
    const iMovel = acharColuna_(cab, colunas.filter(function (c) { return c.chave === 'movel'; })[0]);
    if (iMovel >= 0) sh.setFrozenColumns(iMovel + 1);
  }
  sh.getRange(1, 1, 1, largura)
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground('#202124')
    .setWrap(true)
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 36);

  const larguras = { ciclo: 110, planta: 70, movel: 110, descricao: 260, secao: 100, texto: 420, tipo: 150, observacao: 260 };
  const regrasCor = [];
  colunas.forEach(function (c) {
    const i = acharColuna_(cab, c);
    if (i < 0) return;
    const coluna = sh.getRange(2, i + 1, maxLinhas - 1, 1);
    let px = larguras[c.chave];
    if (!px) px = /^etiqueta/.test(c.chave) ? 190 : /marca/i.test(c.chave) ? 120 : 110;
    sh.setColumnWidth(i + 1, px);

    let lista = null;
    let ajuda = '';
    if (/^marca/i.test(c.chave)) {
      lista = Object.keys(MARCAS);
      ajuda = 'Use ' + lista.join(', ') + '. Também aceita combinação (BOT+QDB) ou cor livre (#RRGGBB).';
      Object.keys(MARCAS).forEach(function (cod) {
        regrasCor.push(
          SpreadsheetApp.newConditionalFormatRule()
            .whenTextContains(cod)
            .setBackground(cod === 'NEUTRO' ? '#E8E8E8' : MARCAS[cod].etiqueta)
            .setFontColor(cod === 'NEUTRO' ? '#333333' : '#FFFFFF')
            .setRanges([coluna])
            .build()
        );
      });
    } else if (c.chave === 'simbolo') {
      lista = Object.keys(SIMBOLOS);
      ajuda = Object.keys(SIMBOLOS).map(function (k) { return k + ' = ' + SIMBOLOS[k].descricao; }).join(' | ');
    } else if (c.chave === 'secao') {
      lista = Object.keys(SECOES_PAINEL);
      ajuda = Object.keys(SECOES_PAINEL).map(function (k) { return k + ' = ' + SECOES_PAINEL[k].descricao; }).join(' | ');
    } else if (c.chave === 'tipo') {
      lista = Object.keys(TIPOS_MOVEL);
      ajuda = 'Tipo de desenho do móvel.';
    }
    if (lista) {
      coluna.setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(lista, true).setAllowInvalid(true).setHelpText(ajuda).build()
      );
    }
    if (c.chave === 'descricao') coluna.setFontColor('#666666').setFontStyle('italic');
  });
  if (regrasCor.length) sh.setConditionalFormatRules(regrasCor);
  // Filtro cobrindo todas as linhas (recriado para incluir linhas novas).
  const filtro = sh.getFilter();
  if (filtro) filtro.remove();
  sh.getRange(1, 1, maxLinhas, largura).createFilter();
}

function removerAbaPadraoVazia_(ss) {
  const nossas = [CONFIG.ABAS.MOVIMENTOS, CONFIG.ABAS.PAINEIS, CONFIG.ABAS.LAYOUT];
  ss.getSheets().forEach(function (sh) {
    if (nossas.indexOf(sh.getName()) < 0 && sh.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sh);
    }
  });
}
