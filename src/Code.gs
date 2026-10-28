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
  if (abaDe_(ss, CONFIG.ABAS.LAYOUT)) atualizarModelosNaPlanilha_(ss);
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
  dados.calendario = lerCalendario_(ss);
  dados.ordemCalendario = ordemCalendarioDeValores_(lerAba_(ss, CONFIG.ABAS.ORDEM_CALENDARIO, true));
  dados.calendario.avisos.forEach(function (a) { if (dados.avisos.length < 60) dados.avisos.push(a); });
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

/** Confere a senha do módulo Desenvolvedor (a engrenagem). */
function entrarDesenvolvedor(acesso) {
  conferirDesenvolvedor_(acesso);
  return { ok: true };
}

/** Configuração do app para o painel do Desenvolvedor: plantas, regras da cascata e senhas. */
function getConfigDev(acesso) {
  return executarConfigDev_(ioRascunhos_(planilha_()), acesso, null);
}

/** Muda a configuração do app (renomear, ordenar ou apagar plantas, regras, senhas; veja aplicarAcaoConfigDev_). */
function salvarConfigDev(acesso, pedido) {
  return executarConfigDev_(ioRascunhos_(planilha_()), acesso, pedido);
}

let configAppCarregada_ = false;

/** Aplica a aba "Config do app" (uma vez por execução; sem a aba, vale o que está no código). */
function carregarConfigAppDe_(ss) {
  if (configAppCarregada_) return;
  configAppCarregada_ = true;
  try {
    aplicarConfigApp_(configAppDeValores_(lerAba_(ss, CONFIG.ABAS.CONFIG_APP, true)));
  } catch (e) { /* aba com problema: vale o padrão */ }
}

/** Chamado antes de conferir as senhas (Validacao.gs): elas podem ter sido trocadas pelo Desenvolvedor. */
function carregarConfigApp_() {
  try { planilha_(); } catch (e) { /* sem planilha: senhas do código */ }
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

/* ===================== ORDEM DOS MOVIMENTOS NO CALENDÁRIO ===================== */

/**
 * Grava (ou apaga) a ordem dos movimentos de um ciclo no calendário (veja executarOrdemCalendario_). Só o
 * construtor da estratégia; todo mundo recebe a ordem no getDados.
 * @return {Object} ciclo → { movimentos, por, em }
 */
function salvarOrdemCalendario(acesso, pedido) {
  return executarOrdemCalendario_(ioRascunhos_(planilha_()), acesso, pedido);
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
    if (!abaDe_(ss, CONFIG.ABAS.LAYOUT)) gravarVersoesModelo_(versoesAtuais_());
    if (criarSeVazia_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), valoresLayoutPadrao_())) {
      lista.push(CONFIG.ABAS.LAYOUT);
    }
    // Os ciclos começam vazios (só o cabeçalho): o primeiro entra pelo Importar planilha ou pela Construção.
    if (criarSeVazia_(ss, CONFIG.ABAS.MOVIMENTOS, colunasMovimentos_(), valoresVazios_(colunasMovimentos_()))) {
      lista.push(CONFIG.ABAS.MOVIMENTOS);
    }
    if (criarSeVazia_(ss, CONFIG.ABAS.PAINEIS, colunasPaineis_(), valoresVazios_(colunasPaineis_()))) {
      lista.push(CONFIG.ABAS.PAINEIS);
    }
    if (criarSeVazia_(ss, CONFIG.ABAS.TIPOS, colunasTipos_(), valoresVazios_(colunasTipos_()))) {
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
      const sh = abaDe_(ss, p.bloco.aba);
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
    if (!abaDe_(ss, CONFIG.ABAS.LAYOUT)) {
      escreverAba_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), valoresLayoutPadrao_());
    }
    const sh = abaDe_(ss, CONFIG.ABAS.LAYOUT);
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
 * @param {string} planta  'NOVA' cria uma planta com o próximo número livre
 * @param {{loja: {largura, profundidade, alturaParede}, moveis: Array<Object>}} layout
 * @param {string=} nome   nome da planta (para a planta nova)
 */
function salvarLayout(acesso, planta, layout, nome) {
  return executarSalvarLayout_(ioRascunhos_(planilha_()), acesso, planta, layout, nome);
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
 * que VERSAO_MODELO_PLANTAS (o layout da planta).
 * Se VERSAO_EXEMPLO subiu, tira as linhas dos ciclos de exemplo antigos ("Ciclo exemplo" e
 * "Ciclo exemplo cheio") das abas Movimentos, Painéis e Tipos de movimento.
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
    if (PLANTAS_EXCLUIDAS.indexOf(planta) >= 0) { // apagada pelo Desenvolvedor: o modelo não a recria
      novas[planta] = VERSAO_MODELO_PLANTAS[planta];
      return;
    }
    const daPlanta = function (o) { return normPlanta_(o.planta) === planta; };
    const layout = objetosDeValores_(valoresLayoutPadrao_(), colunasLayout_()).linhas.filter(daPlanta);
    abas.layout = mesclarLinhas_(abas.layout || [], layout, colunasLayout_());
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
    abas.movimentos = semExemplo(abas.movimentos, colunasMovimentos_());
    abas.paineis = semExemplo(abas.paineis, colunasPaineis_());
    // Planilha antiga sem a aba Tipos de movimento: ela é criada (só com o cabeçalho).
    abas.tipos = semExemplo(abas.tipos && abas.tipos.length ? abas.tipos : valoresVazios_(colunasTipos_()), colunasTipos_());
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
      layout: abaDe_(ss, CONFIG.ABAS.LAYOUT).getDataRange().getValues(),
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
  const ss = abrirPlanilha_();
  carregarConfigAppDe_(ss);
  return ss;
}

/* --------------------- planilha separada para o layout -------------------- */
/*
 * Um Apps Script pode ler e gravar em quantas planilhas quiser (SpreadsheetApp.openById). A aba Layout (as
 * posições e os tamanhos dos móveis de todas as plantas) pode ficar numa planilha só dela: o ID fica na
 * propriedade do script CONFIG.PROPRIEDADE_PLANILHA_LAYOUT. lerAba_, escreverAba_ e criarSeVazia_ mandam a
 * aba Layout para lá sozinhas; as outras abas continuam na planilha principal.
 */

let planilhaLayoutAberta_ = null;

/**
 * A planilha em que a aba fica: a do layout (se houver uma separada) para a aba Layout; a do calendário (se
 * houver uma vinculada) para as abas do calendário dos ciclos e dos feriados; a principal para as outras.
 */
function ssDaAba_(ss, nome) {
  if (nome === CONFIG.ABAS.CICLOS || nome === CONFIG.ABAS.FERIADOS) return planilhaCalendario_(ss);
  if (nome !== CONFIG.ABAS.LAYOUT) return ss;
  const id = PropertiesService.getScriptProperties().getProperty(CONFIG.PROPRIEDADE_PLANILHA_LAYOUT);
  if (!id) return ss;
  if (!planilhaLayoutAberta_ || planilhaLayoutAberta_.getId() !== id) {
    try {
      planilhaLayoutAberta_ = SpreadsheetApp.openById(id);
    } catch (e) {
      throw new Error('Não consegui abrir a planilha do layout (ID ' + id + '). Confira se ela existe e se a conta que publicou o app ' +
        'tem acesso; ou, em Desenvolvedor › Planilhas, volte o layout para a planilha principal.');
    }
  }
  return planilhaLayoutAberta_;
}

/* ------------------- planilha do calendário dos ciclos --------------------- */
/*
 * O calendário dos ciclos (aba "Calendário de ciclos": Marca, Ciclo, Início, Fim) e os feriados (aba "Feriados":
 * Data, Feriado) vêm de uma planilha vinculada em Desenvolvedor › Planilhas (o ID fica na propriedade do
 * script CONFIG.PROPRIEDADE_PLANILHA_CALENDARIO). Sem ela, o app procura as duas abas na planilha principal.
 * O app só lê essas abas: as datas são mantidas na própria planilha.
 */

let planilhaCalendarioAberta_ = null;

/** A planilha do calendário (a vinculada; sem ela, a principal). */
function planilhaCalendario_(ss) {
  const id = PropertiesService.getScriptProperties().getProperty(CONFIG.PROPRIEDADE_PLANILHA_CALENDARIO);
  if (!id) return ss;
  if (!planilhaCalendarioAberta_ || planilhaCalendarioAberta_.getId() !== id) {
    try {
      planilhaCalendarioAberta_ = SpreadsheetApp.openById(id);
    } catch (e) {
      throw new Error('Não consegui abrir a planilha do calendário dos ciclos (ID ' + id + '). Confira se ela existe e se a conta que ' +
        'publicou o app tem acesso; ou, em Desenvolvedor › Planilhas, desvincule a planilha do calendário.');
    }
  }
  return planilhaCalendarioAberta_;
}

/** Nomes aceitos para as abas do calendário (sem diferença de acento e maiúsculas). */
const NOMES_ABA_CICLOS_ = ['Calendário de ciclos', 'Calendário dos ciclos', 'Ciclos', 'Calendário'];
const NOMES_ABA_FERIADOS_ = ['Feriados', 'Feriado'];

/** Valores de uma aba da planilha, por um dos nomes aceitos (null sem a aba). */
function lerAbaPorNomes_(alvo, nomes) {
  const chaves = nomes.map(chave_);
  const sh = alvo.getSheets().filter(function (s) { return chaves.indexOf(chave_(s.getName())) >= 0; })[0];
  if (!sh) return null;
  return sh.getLastRow() >= 1 ? sh.getDataRange().getValues() : [];
}

/** Calendário dos ciclos e feriados (calendarioDeValores_), da planilha do calendário. Erro ao abrir vira aviso. */
function lerCalendario_(ss) {
  let alvo;
  try {
    alvo = planilhaCalendario_(ss);
  } catch (e) {
    const vazio = calendarioDeValores_(null, null);
    vazio.avisos.push(e.message);
    vazio.erro = e.message;
    return vazio;
  }
  return calendarioDeValores_(lerAbaPorNomes_(alvo, NOMES_ABA_CICLOS_), lerAbaPorNomes_(alvo, NOMES_ABA_FERIADOS_));
}

/** Cria as abas do calendário que faltam na planilha (só o cabeçalho, com um exemplo na aba dos ciclos). */
function criarAbasCalendario_(ss) {
  const alvo = planilhaCalendario_(ss);
  if (!lerAbaPorNomes_(alvo, NOMES_ABA_CICLOS_)) {
    escreverAba_(ss, CONFIG.ABAS.CICLOS, colunasCiclos_(), valoresVazios_(colunasCiclos_()));
  }
  if (!lerAbaPorNomes_(alvo, NOMES_ABA_FERIADOS_)) {
    escreverAba_(ss, CONFIG.ABAS.FERIADOS, colunasFeriados_(), valoresVazios_(colunasFeriados_()));
  }
}

/**
 * Desenvolvedor › Planilhas › Calendário dos ciclos:
 *  - { acao: 'criar' }          cria a planilha "Plano de Varejo – Calendário dos ciclos", com as abas "Calendário de
 *                               ciclos" e "Feriados" (levando as da principal, se ela já tinha);
 *  - { acao: 'vincular', url }  usa uma planilha que já existe (as abas que faltam são criadas, só com o cabeçalho);
 *  - { acao: 'desvincular' }    deixa de usar a planilha vinculada (ela não é apagada): o app volta a procurar as
 *                               abas na principal.
 */
function mudarPlanilhaCalendario(acesso, pedido) {
  conferirDesenvolvedor_(acesso);
  const ss = planilha_();
  const props = PropertiesService.getScriptProperties();
  const p = pedido || {};
  return comTrava_(function () {
    if (p.acao === 'criar' || p.acao === 'vincular') {
      let destino;
      // Na criação, leva as abas que já estavam na planilha de onde o app lia o calendário.
      const antes = p.acao === 'criar' ? planilhaCalendario_(ss) : null;
      const ciclos = antes && lerAbaPorNomes_(antes, NOMES_ABA_CICLOS_);
      const feriados = antes && lerAbaPorNomes_(antes, NOMES_ABA_FERIADOS_);
      if (p.acao === 'criar') {
        destino = SpreadsheetApp.create('Plano de Varejo – Calendário dos ciclos');
      } else {
        const id = idDePlanilha_(p.url);
        try {
          destino = SpreadsheetApp.openById(id);
        } catch (e) {
          throw new Error('Não consegui abrir essa planilha. Confira o link e se a conta que publicou o app tem acesso a ela.');
        }
      }
      if (destino.getId() === ss.getId()) throw new Error('Essa é a planilha principal. Para usar as abas da principal, desvincule a planilha do calendário.');
      props.setProperty(CONFIG.PROPRIEDADE_PLANILHA_CALENDARIO, destino.getId());
      planilhaCalendarioAberta_ = destino;
      if (ciclos && ciclos.length > 1) escreverAba_(ss, CONFIG.ABAS.CICLOS, colunasCiclos_(), ciclos);
      if (feriados && feriados.length > 1) escreverAba_(ss, CONFIG.ABAS.FERIADOS, colunasFeriados_(), feriados);
      criarAbasCalendario_(ss);
      if (p.acao === 'criar') removerAbaPadraoVazia_(destino);
    } else if (p.acao === 'desvincular') {
      if (!props.getProperty(CONFIG.PROPRIEDADE_PLANILHA_CALENDARIO)) throw new Error('Nenhuma planilha do calendário está vinculada.');
      props.deleteProperty(CONFIG.PROPRIEDADE_PLANILHA_CALENDARIO);
      planilhaCalendarioAberta_ = null;
    } else {
      throw new Error('Ação desconhecida.');
    }
    return infoPlanilhas_(ss);
  });
}

/** A aba (na planilha certa), ou null. */
function abaDe_(ss, nome) {
  return ssDaAba_(ss, nome).getSheetByName(nome);
}

/** ID de uma planilha a partir do link (…/spreadsheets/d/ID/edit) ou do próprio ID. */
function idDePlanilha_(texto) {
  const t = String(texto || '').trim();
  const m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(t);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(t)) return t;
  throw new Error('Cole o link da planilha (https://docs.google.com/spreadsheets/d/…) ou o ID dela.');
}

/**
 * Onde está cada coisa: a planilha principal, a do layout (null = o Layout está na principal) e a do calendário
 * dos ciclos (null = as abas do calendário são procuradas na principal), com o que foi lido do calendário.
 */
function infoPlanilhas_(ss) {
  const info = { principal: { url: ss.getUrl(), nome: ss.getName() }, layout: null, calendario: null };
  const id = PropertiesService.getScriptProperties().getProperty(CONFIG.PROPRIEDADE_PLANILHA_LAYOUT);
  if (id) {
    try {
      const l = ssDaAba_(ss, CONFIG.ABAS.LAYOUT);
      info.layout = { id: id, url: l.getUrl(), nome: l.getName() };
    } catch (e) {
      info.layout = { id: id, erro: e.message };
    }
  }
  const idCal = PropertiesService.getScriptProperties().getProperty(CONFIG.PROPRIEDADE_PLANILHA_CALENDARIO);
  if (idCal) {
    try {
      const c = planilhaCalendario_(ss);
      info.calendario = { id: idCal, url: c.getUrl(), nome: c.getName() };
    } catch (e) {
      info.calendario = { id: idCal, erro: e.message };
    }
  }
  info.leituraCalendario = resumoCalendario_(lerCalendario_(ss));
  return info;
}

/** O que o painel do Desenvolvedor mostra do calendário lido: quantidades, avisos e observações. */
function resumoCalendario_(cal) {
  return {
    abas: cal.abas,
    ciclos: Object.keys(cal.ciclos).map(function (k) { return { cod: k, nome: CALENDARIOS[k].nome, qtd: cal.ciclos[k].length }; }),
    feriados: cal.feriados.length,
    avisos: cal.avisos,
    observacoes: cal.observacoes,
  };
}

/** Desenvolvedor › Planilhas: onde ficam as abas do app. */
function getPlanilhas(acesso) {
  conferirDesenvolvedor_(acesso);
  return infoPlanilhas_(planilha_());
}

/**
 * Leva a aba Layout para uma planilha separada, ou a traz de volta para a principal.
 *  - { acao: 'criar' }          cria uma planilha nova ("Plano de Varejo – Layout das plantas") com o layout atual;
 *  - { acao: 'vincular', url }  usa uma planilha que já existe: se ela já tem a aba Layout com móveis, vale o que
 *                               está nela; senão, recebe o layout atual;
 *  - { acao: 'voltar' }         copia o layout da planilha separada para a principal e desliga a separada.
 * Na principal, a aba Layout antiga ganha o nome "Layout (antigo)" (o app não lê mais) ao separar.
 */
function mudarPlanilhaLayout(acesso, pedido) {
  conferirDesenvolvedor_(acesso);
  const ss = planilha_();
  const props = PropertiesService.getScriptProperties();
  const p = pedido || {};
  return comTrava_(function () {
    const atual = lerAba_(ss, CONFIG.ABAS.LAYOUT, false);
    const layout = atual && atual.length > 1 ? atual : valoresLayoutPadrao_();
    if (p.acao === 'criar' || p.acao === 'vincular') {
      let destino;
      if (p.acao === 'criar') {
        destino = SpreadsheetApp.create('Plano de Varejo – Layout das plantas');
      } else {
        const id = idDePlanilha_(p.url);
        try {
          destino = SpreadsheetApp.openById(id);
        } catch (e) {
          throw new Error('Não consegui abrir essa planilha. Confira o link e se a conta que publicou o app tem acesso de edição a ela.');
        }
      }
      if (destino.getId() === ss.getId()) throw new Error('Essa é a planilha principal. Escolha outra planilha para o layout.');
      const aba = destino.getSheetByName(CONFIG.ABAS.LAYOUT);
      const jaTem = !!(aba && aba.getLastRow() > 1);
      const velha = ss.getSheetByName(CONFIG.ABAS.LAYOUT);
      props.setProperty(CONFIG.PROPRIEDADE_PLANILHA_LAYOUT, destino.getId());
      planilhaLayoutAberta_ = destino;
      if (!jaTem) escreverAba_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), layout);
      if (p.acao === 'criar') removerAbaPadraoVazia_(destino);
      if (velha) {
        let nome = 'Layout (antigo)';
        for (let i = 2; ss.getSheetByName(nome); i++) nome = 'Layout (antigo ' + i + ')';
        velha.setName(nome);
      }
    } else if (p.acao === 'voltar') {
      if (!props.getProperty(CONFIG.PROPRIEDADE_PLANILHA_LAYOUT)) throw new Error('O layout já está na planilha principal.');
      props.deleteProperty(CONFIG.PROPRIEDADE_PLANILHA_LAYOUT);
      planilhaLayoutAberta_ = null;
      escreverAba_(ss, CONFIG.ABAS.LAYOUT, colunasLayout_(), layout);
    } else {
      throw new Error('Ação desconhecida.');
    }
    return infoPlanilhas_(ss);
  });
}

function abrirPlanilha_() {
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
  const sh = abaDe_(ss, nome);
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
/** Matriz só com o cabeçalho das colunas. */
function valoresVazios_(colunas) {
  return [colunas.map(function (c) { return c.titulo; })];
}

function criarSeVazia_(ss, nome, colunas, valores) {
  const sh = abaDe_(ss, nome);
  if (sh && sh.getLastRow() > (valores.length > 1 ? 1 : 0)) return false;
  escreverAba_(ss, nome, colunas, valores);
  return true;
}

/** Substitui todo o conteúdo da aba por "valores" (com cabeçalho) e formata. */
function escreverAba_(ss, nome, colunas, valores) {
  const alvo = ssDaAba_(ss, nome);
  const sh = alvo.getSheetByName(nome) || alvo.insertSheet(nome);
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
  // Regras de validação criadas à mão na planilha com "rejeitar entrada" barrariam a gravação (ex.: uma
  // classificação fora da lista delas). Saem antes; formatarAba_ põe as do app, que só avisam e mantêm
  // na lista os valores que já estão na coluna.
  sh.getRange(1, 1, maxLinhas, largura).clearDataValidations();
  sh.getRange(1, 1, linhas.length, largura).setValues(linhas);
  formatarAba_(sh, colunas, cab, maxLinhas, linhas);
  return sh;
}

function formatarAba_(sh, colunas, cab, maxLinhas, linhas) {
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
      // Classificações próprias já usadas na planilha (ex.: Exaustão) continuam na lista suspensa.
      (linhas || []).slice(1).forEach(function (l) {
        const v = texto_(l[i]);
        if (v && lista.indexOf(v) < 0 && lista.length < 40) lista.push(v);
      });
    } else if (c.chave === 'gmv') {
      coluna.setNumberFormat('"R$" #,##0');
    } else if (c.chave === 'calendario') {
      lista = Object.keys(CALENDARIOS).map(function (k) { return CALENDARIOS[k].nome; });
      ajuda = 'Eudora tem o calendário dela; qualquer outra marca segue o do Boticário.';
    } else if ((c.chave === 'inicio' || c.chave === 'fim' || c.chave === 'data') && !c.texto) {
      // Datas do calendário dos ciclos e dos feriados (as outras abas guardam a data como texto).
      coluna.setNumberFormat('dd/mm/yyyy');
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
