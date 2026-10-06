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
 *  A leitura das abas e as normalizações (sem I/O) ficam em Dados.gs, que também
 *  é usado pela versão só de visualização (pasta visualizador/).
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
  if (ss.getSheetByName(CONFIG.ABAS.LAYOUT)) atualizarModelosNaPlanilha_(ss);
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
    // Planilha nova já nasce com os modelos atuais.
    if (!ss.getSheetByName(CONFIG.ABAS.LAYOUT)) gravarVersoesModelo_(versoesAtuais_());
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

/**
 * Grava uma planta inteira (dimensões da loja + móveis) na aba Layout,
 * substituindo as linhas dessa planta. Usado pelo modo "Construir loja".
 * @param {string} planta
 * @param {{loja: {largura, profundidade, alturaParede}, moveis: Array<Object>}} layout
 */
function salvarLayout(planta, layout) {
  const objetos = objetosLayoutDaPlanta_(planta, layout);
  const ss = planilha_();
  return comTrava_(function () {
    const sh = ss.getSheetByName(CONFIG.ABAS.LAYOUT);
    const existentes = sh ? sh.getDataRange().getValues() : valoresLayoutPadrao_();
    escreverAba_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), mesclarLinhas_(existentes, objetos, colunasLayout_()));
    return { planta: normPlanta_(planta), moveis: objetos.length - 1 };
  });
}

/* ======================= TRANSFORMAÇÃO (sem I/O) ========================== */

/** Versões de tudo o que vem do código: modelo de cada planta + ciclo de exemplo ("_exemplo"). */
function versoesAtuais_() {
  const v = { _exemplo: VERSAO_EXEMPLO };
  Object.keys(VERSAO_MODELO_PLANTAS).forEach(function (p) { v[p] = VERSAO_MODELO_PLANTAS[p]; });
  return v;
}

/** Há algo do código mais novo do que o que está gravado? */
function modeloPendente_(versoes) {
  const atuais = versoesAtuais_();
  return Object.keys(atuais).some(function (k) { return (versoes[k] || 1) < atuais[k]; });
}

/**
 * Atualiza para o modelo base mais novo as plantas cuja versão salva é menor
 * que VERSAO_MODELO_PLANTAS (layout da planta + linhas dela no ciclo de exemplo).
 * Se VERSAO_EXEMPLO subiu, troca o "Ciclo exemplo" inteiro (Movimentos e Painéis).
 * Função pura: recebe e devolve as matrizes das abas.
 * @param {{layout: Array, movimentos: Array, paineis: Array}} abas
 * @param {Object<string, number>} versoes  versões já aplicadas (planta → número)
 * @return {{abas: Object, versoes: Object, plantas: string[]}} plantas = as que mudaram
 */
function atualizarModelosPlantas_(abas, versoes) {
  const novas = {};
  Object.keys(versoes || {}).forEach(function (k) { novas[k] = versoes[k]; });
  const mudaram = [];
  Object.keys(VERSAO_MODELO_PLANTAS).forEach(function (planta) {
    if ((novas[planta] || 1) >= VERSAO_MODELO_PLANTAS[planta]) return;
    const daPlanta = function (o) { return normPlanta_(o.planta) === planta; };
    const layout = objetosDeValores_(valoresLayoutPadrao_(), colunasLayout_()).linhas.filter(daPlanta);
    abas.layout = mesclarLinhas_(abas.layout || [], layout, colunasLayout_());
    const exemplo = objetosDeValores_(valoresMovimentosExemplo_(), colunasMovimentos_()).linhas.filter(daPlanta);
    if (exemplo.length) abas.movimentos = mesclarLinhas_(abas.movimentos || [], exemplo, colunasMovimentos_());
    novas[planta] = VERSAO_MODELO_PLANTAS[planta];
    mudaram.push(planta);
  });
  if ((novas._exemplo || 1) < VERSAO_EXEMPLO) {
    const semExemplo = function (valores, colunas) {
      if (!valores || !valores.length) return valores || [];
      const i = acharColuna_(valores[0].map(chave_), colunas.filter(function (c) { return c.chave === 'ciclo'; })[0]);
      return i < 0 ? valores : [valores[0]].concat(valores.slice(1).filter(function (l) { return texto_(l[i]) !== EXEMPLO_CICLO; }));
    };
    const trocar = function (valores, padrao, colunas) {
      const novos = objetosDeValores_(padrao, colunas).linhas;
      return mesclarLinhas_(semExemplo(valores, colunas), novos, colunas);
    };
    abas.movimentos = trocar(abas.movimentos, valoresMovimentosExemplo_(), colunasMovimentos_());
    abas.paineis = trocar(abas.paineis, valoresPaineisExemplo_(), colunasPaineis_());
    novas._exemplo = VERSAO_EXEMPLO;
    mudaram.push('exemplo');
  }
  return { abas: abas, versoes: novas, plantas: mudaram };
}

/**
 * Valida o layout de uma planta vindo do modo "Construir loja" e devolve as
 * linhas (objetos com as chaves de colunasLayout_), começando pela linha LOJA.
 */
function objetosLayoutDaPlanta_(planta, layout) {
  planta = normPlanta_(planta);
  if (!planta || planta === CONFIG.PLANTA_TODAS) throw new Error('Planta inválida.');
  if (!layout || !layout.loja || !Array.isArray(layout.moveis)) throw new Error('Layout inválido.');
  const n = function (v, padrao) { return Math.round(numero_(v, padrao) * 100) / 100; };
  const loja = layout.loja;
  const linhas = [{
    planta: planta, movel: 'LOJA', descricao: 'Piso e paredes da loja', tipo: 'LOJA', x: 0, y: 0, z: 0,
    largura: Math.max(1, n(loja.largura, 20)), profundidade: Math.max(1, n(loja.profundidade, 20)),
    altura: Math.max(0, n(loja.alturaParede, 4.5)), ajusteX: 0, ajusteY: 0,
  }];
  const vistos = {};
  layout.moveis.forEach(function (m, i) {
    const id = normId_(m && m.id);
    if (!id || id === 'LOJA') throw new Error('Móvel ' + (i + 1) + ': ID vazio ou inválido.');
    if (vistos[id]) throw new Error('ID de móvel repetido: ' + id + '.');
    vistos[id] = true;
    if (!TIPOS_MOVEL[m.tipo] || m.tipo === 'LOJA') throw new Error('Móvel ' + id + ': tipo "' + m.tipo + '" inválido.');
    linhas.push({
      planta: planta, movel: id, descricao: texto_(m.descricao), tipo: m.tipo,
      x: n(m.x, 0), y: n(m.y, 0), z: n(m.z, 0),
      largura: Math.max(0.1, n(m.w, 1)), profundidade: Math.max(0.1, n(m.d, 1)), altura: Math.max(0.1, n(m.h, 1)),
      ajusteX: Math.round(numero_(m.ajusteX, 0)), ajusteY: Math.round(numero_(m.ajusteY, 0)),
      dividido: m.tipo === 'GONDOLA' ? normDivisao_(m.dividido) : '',
      giro: normGiro_(m.giro),
    });
  });
  return linhas;
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

const PROPRIEDADE_VERSOES_MODELO = 'VERSOES_MODELO_PLANTAS';

function lerVersoesModelo_() {
  try {
    return JSON.parse(PropertiesService.getScriptProperties().getProperty(PROPRIEDADE_VERSOES_MODELO) || '{}');
  } catch (e) {
    return {};
  }
}

function gravarVersoesModelo_(versoes) {
  PropertiesService.getScriptProperties().setProperty(PROPRIEDADE_VERSOES_MODELO, JSON.stringify(versoes));
}

/** Aplica atualizarModelosPlantas_ nas abas da planilha (só grava se algo mudou). */
function atualizarModelosNaPlanilha_(ss) {
  const versoes = lerVersoesModelo_();
  if (!modeloPendente_(versoes)) return;
  comTrava_(function () {
    const abas = {
      layout: ss.getSheetByName(CONFIG.ABAS.LAYOUT).getDataRange().getValues(),
      movimentos: ss.getSheetByName(CONFIG.ABAS.MOVIMENTOS) ? ss.getSheetByName(CONFIG.ABAS.MOVIMENTOS).getDataRange().getValues() : [],
      paineis: ss.getSheetByName(CONFIG.ABAS.PAINEIS) ? ss.getSheetByName(CONFIG.ABAS.PAINEIS).getDataRange().getValues() : [],
    };
    const r = atualizarModelosPlantas_(abas, versoes);
    escreverAba_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), r.abas.layout);
    if (r.abas.movimentos.length) escreverAba_(ss, CONFIG.ABAS.MOVIMENTOS, colunasMovimentos_(), r.abas.movimentos);
    if (r.abas.paineis.length) escreverAba_(ss, CONFIG.ABAS.PAINEIS, colunasPaineis_(), r.abas.paineis);
    gravarVersoesModelo_(r.versoes);
  });
}

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
