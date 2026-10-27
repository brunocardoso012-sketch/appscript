/**
 * ============================================================================
 *  VISUALIZADOR DE PLANTAS — BACKEND (Google Apps Script)
 * ============================================================================
 *  Abas da planilha:
 *   - Movimentos: o que muda a cada ciclo (cor do móvel + etiquetas).
 *   - Painéis:    textos fora dos móveis (TV/rádio, A, C, caixas de destaque, notas).
 *   - Tipos de movimento: classificação (lançamento, promoção…) e GMV esperado de cada movimento do ciclo.
 *   - Layout:     posição/tamanho de cada móvel em cada planta (muda raramente).
 *
 *  Funções sem "_" no final podem ser chamadas pela página (google.script.run).
 *  A leitura das abas e as normalizações (sem I/O) ficam em Dados.gs, que também
 *  é usado pela versão web (web/backend-local.js).
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
    lerAba_(ss, CONFIG.ABAS.PAINEIS, true),
    lerAba_(ss, CONFIG.ABAS.TIPOS, true)
  );
  dados.antecipacoes = antecipacoesDeValores_(lerAba_(ss, CONFIG.ABAS.ANTECIPACOES, true));
  dados.produtos = produtosDeValores_(lerAba_(ss, CONFIG.ABAS.PRODUTOS, true));
  dados.prateleiras = prateleirasDeValores_(lerAba_(ss, CONFIG.ABAS.PRATELEIRAS, true), dados.produtos);
  dados.inventario = inventarioDeValores_(lerAbaSemAcento_(ss, CONFIG.ABAS.INVENTARIO));
  dados.planilhaUrl = ss.getUrl();
  dados.appUrl = urlDoApp_();
  dados.precisaConfigurar = !ss.getSheetByName(CONFIG.ABAS.MOVIMENTOS);
  return dados;
}

/** URL do app publicado (para o "Copiar link"); vazia fora de um app da Web. */
function urlDoApp_() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (e) {
    return '';
  }
}

/* ============================= DESENVOLVEDOR ============================== */

/** Confere a senha do módulo Desenvolvedor (Construir loja, Baixar / Importar planilha). */
function entrarDesenvolvedor(acesso) {
  conferirDesenvolvedor_(acesso);
  return { ok: true };
}

/* ======================== VALIDAÇÃO DA ESTRATÉGIA ========================= */

/** Confere papel, nome e senha da validação. @return {{papel, autor, nomePapel}} */
function entrarValidacao(acesso) {
  const quem = conferirAcesso_(acesso);
  return { papel: quem.papel, autor: quem.autor, nomePapel: PAPEIS_ACESSO[quem.papel] };
}

/** Todos os comentários (com as respostas), para quem entrou na validação. */
function getComentarios(acesso) {
  conferirAcesso_(acesso);
  return comentariosDeValores_(lerComentariosDaPlanilha_(planilha_()));
}

/**
 * Cria, responde, resolve / reabre ou exclui um comentário (veja aplicarAcaoComentario_).
 * @return {Array} comentários atualizados
 */
function salvarComentario(acesso, pedido) {
  return executarComentario_(planilha_(), acesso, pedido);
}

/* ======================= CICLOS EM CONSTRUÇÃO ============================ */

/** Leitura e gravação das abas para executarRascunho_ (Rascunhos.gs). */
function ioRascunhos_(ss) {
  // As abas publicadas são lidas com os valores reais (como na importação), para a aprovação regravá-las
  // sem transformar números (ex.: o GMV dos outros ciclos) em texto; as dos rascunhos, como texto.
  const publicadas = [CONFIG.ABAS.MOVIMENTOS, CONFIG.ABAS.PAINEIS, CONFIG.ABAS.TIPOS];
  return {
    ler: function (nome) { return lerAba_(ss, nome, publicadas.indexOf(nome) < 0); },
    gravar: function (nome, colunas, matriz) { escreverAba_(ss, nome, colunas, matriz); },
    layout: function () { return lerAba_(ss, CONFIG.ABAS.LAYOUT, false); },
    travar: comTrava_,
  };
}

/** Ciclos em construção (com os dados deles), para quem entrou na validação. */
function getRascunhos(acesso) {
  return executarRascunho_(ioRascunhos_(planilha_()), acesso, null);
}

/** Cria, edita, envia, devolve, aprova ou exclui um ciclo em construção (veja aplicarAcaoRascunho_). */
function salvarRascunho(acesso, pedido) {
  return executarRascunho_(ioRascunhos_(planilha_()), acesso, pedido);
}

/* ============================ ANTECIPAÇÕES =============================== */

/**
 * Cria, edita ou exclui uma antecipação (veja aplicarAcaoAntecipacao_). Todo mundo as recebe no getDados.
 * @return {Array} antecipações atualizadas
 */
function salvarAntecipacao(acesso, pedido) {
  return executarAntecipacao_(ioRascunhos_(planilha_()), acesso, pedido);
}

/* ============================= PRATELEIRAS =============================== */

/**
 * Grava os produtos das prateleiras de um espaço (veja aplicarAcaoPrateleiras_). Todo mundo as recebe no getDados.
 * @return {Array} prateleiras atualizadas
 */
function salvarPrateleiras(acesso, pedido) {
  return executarPrateleiras_(ioRascunhos_(planilha_()), acesso, pedido);
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
    if (criarSeVazia_(ss, CONFIG.ABAS.TIPOS, colunasTipos_(), valoresTiposExemplo_())) {
      lista.push(CONFIG.ABAS.TIPOS);
    }
    if (criarSeVazia_(ss, CONFIG.ABAS.PRODUTOS, colunasProdutos_(), valoresProdutosExemplo_())) {
      lista.push(CONFIG.ABAS.PRODUTOS);
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
 * @param {{senha: string}} acesso  senha do módulo Desenvolvedor
 * @param {{movimentos?: Array<Array<*>>, paineis?: Array<Array<*>>, layout?: Array<Array<*>>}} payload
 *        Cada item é uma matriz [cabeçalho, ...linhas] com os valores das células.
 */
function importarPlanilha(acesso, payload) {
  conferirDesenvolvedor_(acesso);
  const ss = planilha_();
  const prep = prepararImportacao_(payload); // valida tudo antes de gravar

  const resultado = { movimentos: 0, paineis: 0, tipos: 0, layout: 0, produtos: 0 };
  comTrava_(function () {
    prep.preparados.forEach(function (p) {
      const sh = ss.getSheetByName(p.bloco.aba);
      const existentes = sh ? sh.getDataRange().getValues() : [];
      escreverAba_(ss, p.bloco.aba, p.bloco.colunas, mesclarLinhas_(existentes, p.linhas, p.bloco.colunas, p.bloco.chave));
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
    { campo: 'tipos', aba: CONFIG.ABAS.TIPOS, colunas: colunasTipos_() },
    { campo: 'layout', aba: CONFIG.ABAS.LAYOUT, colunas: colunasLayout_() },
    // O catálogo de produtos vem inteiro: a aba Produtos do arquivo substitui a da planilha.
    { campo: 'produtos', aba: CONFIG.ABAS.PRODUTOS, colunas: colunasProdutos_(), chave: function () { return 'TODOS'; } },
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
      else if (b.campo === 'tipos') ok = texto_(o.ciclo) && texto_(o.etiqueta);
      else if (b.campo === 'produtos') ok = normSku_(o.sku) && texto_(o.nome);
      else ok = texto_(o.ciclo) && normPlanta_(o.planta) && normId_(o.movel);
      if (!ok && avisosLeitura.length < 30) {
        avisosLeitura.push(b.aba + ', linha ' + o._linha + ': faltam campos obrigatórios — linha ignorada.');
      }
      return ok;
    });
    preparados.push({ bloco: b, linhas: validas, matriz: matriz });
  });
  if (!preparados.length) {
    throw new Error('Não encontrei as abas "' + CONFIG.ABAS.MOVIMENTOS + '", "' + CONFIG.ABAS.PAINEIS + '", "' +
      CONFIG.ABAS.TIPOS + '", "' + CONFIG.ABAS.LAYOUT + '" ou "' + CONFIG.ABAS.PRODUTOS + '" no arquivo.');
  }
  return { preparados: preparados, avisosLeitura: avisosLeitura };
}

/** Avisos de conteúdo (IDs inexistentes, marcas desconhecidas…) só do que foi importado. */
function verificarImportacao_(valoresLayout, prep) {
  const matriz = function (campo) {
    const p = prep.preparados.filter(function (x) { return x.bloco.campo === campo; })[0];
    return p ? p.matriz : null;
  };
  const verificacao = montarDados_(valoresLayout, matriz('movimentos'), matriz('paineis'), matriz('tipos'));
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
 * @param {Object<string, {x:number, y:number}>} ajustes  ID do móvel (ajuste do móvel inteiro) ou
 *   ID da pilha ("GONDOLA 1/PONTA-A", ajuste só daquela pilha) → deslocamento em px.
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
    let iE = col('ajusteEspacos');
    let iT = col('tamanhoEtiquetas');
    let iS = col('slide');
    if (iPlanta < 0 || iId < 0) throw new Error('Aba Layout sem as colunas Planta / ID Móvel.');
    let largura = valores[0].length;
    if (iX < 0) { iX = largura++; sh.getRange(1, iX + 1).setValue('Ajuste Etiqueta X (px)'); }
    if (iY < 0) { iY = largura++; sh.getRange(1, iY + 1).setValue('Ajuste Etiqueta Y (px)'); }
    if (iE < 0) {
      iE = largura++;
      sh.getRange(1, iE + 1).setValue('Ajuste Etiquetas por espaço (px)');
    }
    const tamanho = ajustes.LOJA && ajustes.LOJA.escala ? normTamanhoEtiquetas_(ajustes.LOJA.escala) : 0;
    if (iT < 0 && tamanho) {
      iT = largura++;
      sh.getRange(1, iT + 1).setValue('Tamanho das etiquetas (%)');
    }
    const slide = ajustes.LOJA ? normSlide_(ajustes.LOJA.slide) : 0;
    if (iS < 0 && slide) {
      iS = largura++;
      sh.getRange(1, iS + 1).setValue('Largura do slide (px)');
    }

    const n = valores.length - 1;
    if (n < 1) return { atualizados: 0 };
    const colX = sh.getRange(2, iX + 1, n, 1).getValues();
    const colY = sh.getRange(2, iY + 1, n, 1).getValues();
    const colE = sh.getRange(2, iE + 1, n, 1).getValues();
    let atualizados = 0;
    for (let r = 1; r <= n; r++) {
      if (normPlanta_(valores[r][iPlanta]) !== planta) continue;
      if (normId_(valores[r][iId]) === 'LOJA') {
        // Linha da loja: guarda o tamanho das etiquetas da planta.
        if (tamanho) sh.getRange(r + 1, iT + 1).setValue(tamanho);
        if (slide) sh.getRange(r + 1, iS + 1).setValue(slide);
        continue;
      }
      const atual = { x: colX[r - 1][0], y: colY[r - 1][0], espacos: lerAjustesEspacos_(colE[r - 1][0]) };
      if (!aplicarAjusteEtiquetas_(valores[r][iId], ajustes, atual)) continue;
      colX[r - 1][0] = Math.round(Number(atual.x) || 0);
      colY[r - 1][0] = Math.round(Number(atual.y) || 0);
      colE[r - 1][0] = textoAjustesEspacos_(atual.espacos);
      atualizados++;
    }
    sh.getRange(2, iX + 1, n, 1).setValues(colX);
    sh.getRange(2, iY + 1, n, 1).setValues(colY);
    sh.getRange(2, iE + 1, n, 1).setNumberFormat('@').setValues(colE);
    return { atualizados: atualizados };
  });
}

/**
 * Grava uma planta inteira (dimensões da loja + móveis) na aba Layout,
 * substituindo as linhas dessa planta. Usado pelo modo "Construir loja".
 * @param {{senha: string}} acesso  senha do módulo Desenvolvedor
 * @param {string} planta
 * @param {{loja: {largura, profundidade, alturaParede}, moveis: Array<Object>}} layout
 */
function salvarLayout(acesso, planta, layout) {
  conferirDesenvolvedor_(acesso);
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
 * @param {{layout: Array, movimentos: Array, paineis: Array, tipos?: Array}} abas
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
      const exemplos = [EXEMPLO_CICLO, EXEMPLO_CICLO_CHEIO];
      return i < 0 ? valores : [valores[0]].concat(valores.slice(1).filter(function (l) { return exemplos.indexOf(texto_(l[i])) < 0; }));
    };
    const trocar = function (valores, padrao, colunas) {
      const novos = objetosDeValores_(padrao, colunas).linhas;
      return mesclarLinhas_(semExemplo(valores, colunas), novos, colunas);
    };
    abas.movimentos = trocar(abas.movimentos, valoresMovimentosExemplo_(), colunasMovimentos_());
    abas.paineis = trocar(abas.paineis, valoresPaineisExemplo_(), colunasPaineis_());
    abas.tipos = trocar(abas.tipos, valoresTiposExemplo_(), colunasTipos_());
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
    tamanhoEtiquetas: loja.escalaEtiquetas && loja.escalaEtiquetas !== 100 ? normTamanhoEtiquetas_(loja.escalaEtiquetas) : '',
    slide: normSlide_(loja.slide) || '',
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
      ajusteEspacos: textoAjustesEspacos_(m.ajustesEspacos),
      dividido: m.tipo === 'GONDOLA' ? normDivisao_(m.dividido) : '',
      giro: normGiro_(m.giro),
    });
  });
  return linhas;
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
      tipos: ss.getSheetByName(CONFIG.ABAS.TIPOS) ? ss.getSheetByName(CONFIG.ABAS.TIPOS).getDataRange().getValues() : [],
    };
    const r = atualizarModelosPlantas_(abas, versoes);
    escreverAba_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), r.abas.layout);
    if (r.abas.movimentos.length) escreverAba_(ss, CONFIG.ABAS.MOVIMENTOS, colunasMovimentos_(), r.abas.movimentos);
    if (r.abas.paineis.length) escreverAba_(ss, CONFIG.ABAS.PAINEIS, colunasPaineis_(), r.abas.paineis);
    if (r.abas.tipos && r.abas.tipos.length) escreverAba_(ss, CONFIG.ABAS.TIPOS, colunasTipos_(), r.abas.tipos);
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

/** Aba pelo nome, sem ligar para acento e maiúsculas ("Inventario" acha "Inventário"); null sem a aba. */
function lerAbaSemAcento_(ss, nome) {
  const sh = ss.getSheets().filter(function (s) { return chave_(s.getName()) === chave_(nome); })[0];
  return sh && sh.getLastRow() >= 1 ? sh.getDataRange().getValues() : null;
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

  const larguras = { ciclo: 110, planta: 70, movel: 110, descricao: 260, secao: 100, texto: 420, tipo: 150, observacao: 260, etiqueta: 260, classificacao: 190, gmv: 150 };
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
    } else if (c.chave === 'simbolo' || /^simboloEtiqueta/.test(c.chave)) {
      // No espaço, o de antecipação vem só da aba Antecipações; na etiqueta, pode vir daqui (com a data ao lado).
      lista = Object.keys(SIMBOLOS).filter(function (k) { return c.chave !== 'simbolo' || !SIMBOLOS[k].automatico; });
      ajuda = lista.map(function (k) { return k + ' = ' + SIMBOLOS[k].descricao; }).join(' | ')
        + (c.chave === 'simbolo' ? '' : '. Com ANTECIPADO, preencha a data na coluna ao lado (dd/mm/aaaa).');
    } else if (c.chave === 'secao') {
      lista = Object.keys(SECOES_PAINEL);
      ajuda = Object.keys(SECOES_PAINEL).map(function (k) { return k + ' = ' + SECOES_PAINEL[k].descricao; }).join(' | ');
    } else if (c.chave === 'tipo') {
      lista = Object.keys(TIPOS_MOVEL);
      ajuda = 'Tipo de desenho do móvel.';
    } else if (c.chave === 'classificacao') {
      lista = Object.keys(CLASSIFICACOES).map(function (k) { return CLASSIFICACOES[k].nome; });
      ajuda = 'Tipo do movimento: ' + lista.join(', ') + '. Também aceita outro texto.';
    } else if (c.chave === 'gmv') {
      coluna.setNumberFormat('"R$" #,##0');
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
  const nossas = [CONFIG.ABAS.MOVIMENTOS, CONFIG.ABAS.PAINEIS, CONFIG.ABAS.TIPOS, CONFIG.ABAS.LAYOUT];
  ss.getSheets().forEach(function (sh) {
    if (nossas.indexOf(sh.getName()) < 0 && sh.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sh);
    }
  });
}
