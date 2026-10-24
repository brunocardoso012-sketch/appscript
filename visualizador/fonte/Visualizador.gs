/**
 * ============================================================================
 *  PLANO DE VAREJO · VISUALIZADOR — versão só de visualização (Apps Script)
 * ============================================================================
 *  Mostra as plantas de cada ciclo a partir de UMA planilha (abas "Movimentos",
 *  "Painéis" e, opcional, "Tipos de movimento"). A estratégia é montada direto na planilha ou, com o
 *  login da validação, no próprio app (ciclos em construção, que entram nas abas quando aprovados).
 *  Não tem o modo "Construir loja" nem "Baixar / Importar planilha": o layout
 *  das lojas fica no código (seção LAYOUT PADRÃO, mais abaixo).
 *
 *  Conectar a planilha (um dos dois):
 *   1. Abrir o Apps Script pela própria planilha (Extensões > Apps Script) —
 *      o script fica vinculado a ela e nada mais precisa ser configurado; ou
 *   2. Colar o link (ou o ID) da planilha em VISUALIZADOR.PLANILHA, logo abaixo.
 *
 *  Este arquivo é gerado por dev/build-visualizador.js a partir de
 *  visualizador/fonte/Visualizador.gs + src/Config.gs, Layouts.gs e Dados.gs.
 */

const VISUALIZADOR = {
  /** Link ou ID da planilha com os ciclos. Vazio = planilha a que o script está vinculado. */
  PLANILHA: '',
  /** Prefixo das propriedades do script que guardam as posições das etiquetas (uma por planta). */
  PROPRIEDADE_AJUSTES: 'AJUSTES_ETIQUETAS_',
};

/* =============================== ENTRADA ================================== */

/** Publicação como App da Web. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(CONFIG.TITULO)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Menu na planilha (quando o script está vinculado a ela). */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Plano de Varejo')
    .addItem('Abrir visualizador', 'abrirVisualizador')
    .addToUi();
}

function abrirVisualizador() {
  const html = HtmlService.createHtmlOutputFromFile('Index').setWidth(1480).setHeight(880);
  SpreadsheetApp.getUi().showModalDialog(html, CONFIG.TITULO);
}

/* ============================ API DA PÁGINA =============================== */

/**
 * Tudo o que a página precisa: plantas (layout do código, com as posições de
 * etiquetas salvas), ciclos, movimentos e painéis da planilha e os avisos.
 */
function getDados() {
  let ss;
  try {
    ss = planilhaVisualizador_();
  } catch (e) {
    return { precisaConfigurar: true, mensagem: e.message };
  }
  const movimentos = lerAbaTexto_(ss, CONFIG.ABAS.MOVIMENTOS);
  if (!movimentos) {
    return {
      precisaConfigurar: true,
      mensagem: 'A planilha "' + ss.getName() + '" não tem a aba "' + CONFIG.ABAS.MOVIMENTOS + '". ' +
        'Use a planilha base do visualizador (abas "' + CONFIG.ABAS.MOVIMENTOS + '" e "' + CONFIG.ABAS.PAINEIS + '").',
    };
  }
  const dados = montarDados_(valoresLayoutPadrao_(), movimentos, lerAbaTexto_(ss, CONFIG.ABAS.PAINEIS),
    lerAbaTexto_(ss, CONFIG.ABAS.TIPOS));
  aplicarAjustesSalvos_(dados.plantas);
  dados.antecipacoes = antecipacoesDeValores_(lerAbaTexto_(ss, CONFIG.ABAS.ANTECIPACOES));
  dados.prateleiras = prateleirasDeValores_(lerAbaTexto_(ss, CONFIG.ABAS.PRATELEIRAS));
  dados.planilhaUrl = ss.getUrl();
  dados.appUrl = urlDoApp_();
  dados.precisaConfigurar = false;
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

/**
 * Grava a posição das etiquetas arrastadas em "Ajustar etiquetas". Fica nas
 * propriedades do script (a planilha não é alterada).
 * @param {string} planta
 * @param {Object<string, {x:number, y:number}>} ajustes  ID do móvel (ajuste do móvel inteiro) ou
 *   ID da pilha ("GONDOLA 1/LADO-A", ajuste só daquela pilha) → deslocamento em px.
 */
function salvarAjustesEtiquetas(planta, ajustes) {
  planta = normPlanta_(planta);
  if (!planta || planta === CONFIG.PLANTA_TODAS || !ajustes || typeof ajustes !== 'object') {
    throw new Error('Dados inválidos.');
  }
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    const salvos = lerAjustes_(planta);
    let atualizados = 0;
    Object.keys(ajustes).forEach(function (id) {
      const a = ajustes[id] || {};
      if (normId_(id) === 'LOJA') {
        // Tamanho das etiquetas da planta (em %).
        // Tamanho das etiquetas (%) e largura do slide (posições fixas) da planta.
        const t = normTamanhoEtiquetas_(a.escala);
        const s = normSlide_(a.slide) || (salvos.LOJA && salvos.LOJA.slide) || 0;
        if (t !== 100 || s) salvos.LOJA = { escala: t, slide: s };
        else delete salvos.LOJA;
        return;
      }
      const x = Math.round(Number(a.x) || 0);
      const y = Math.round(Number(a.y) || 0);
      const chave = normId_(id);
      if (!chave) return;
      if (x || y) salvos[chave] = { x: x, y: y };
      else delete salvos[chave]; // "Organizar automaticamente" volta para a posição calculada
      atualizados++;
    });
    PropertiesService.getScriptProperties().setProperty(VISUALIZADOR.PROPRIEDADE_AJUSTES + planta, JSON.stringify(salvos));
    return { atualizados: atualizados };
  } finally {
    trava.releaseLock();
  }
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
  return comentariosDeValores_(lerComentariosDaPlanilha_(planilhaVisualizador_()));
}

/**
 * Cria, responde, resolve / reabre ou exclui um comentário (veja aplicarAcaoComentario_).
 * @return {Array} comentários atualizados
 */
function salvarComentario(acesso, pedido) {
  return executarComentario_(planilhaVisualizador_(), acesso, pedido);
}

/* ======================= CICLOS EM CONSTRUÇÃO ============================ */
/* O construtor monta o ciclo no app; na aprovação, ele vai para as abas       */
/* Movimentos, Painéis e Tipos de movimento (as únicas gravações nelas).       */

/** Leitura e gravação das abas para executarRascunho_ (Rascunhos.gs). */
function ioRascunhos_(ss) {
  return {
    ler: function (nome) { return lerAbaTexto_(ss, nome); },
    gravar: function (nome, colunas, matriz) { gravarAbaTexto_(ss, nome, matriz); },
    layout: function () { return valoresLayoutPadrao_(); },
    travar: function (fn) {
      const trava = LockService.getScriptLock();
      trava.waitLock(30000);
      try {
        return fn();
      } finally {
        trava.releaseLock();
      }
    },
  };
}

/** Ciclos em construção (com os dados deles), para quem entrou na validação. */
function getRascunhos(acesso) {
  return executarRascunho_(ioRascunhos_(planilhaVisualizador_()), acesso, null);
}

/** Cria, edita, envia, devolve, aprova ou exclui um ciclo em construção (veja aplicarAcaoRascunho_). */
function salvarRascunho(acesso, pedido) {
  return executarRascunho_(ioRascunhos_(planilhaVisualizador_()), acesso, pedido);
}

/* ============================ ANTECIPAÇÕES =============================== */
/* Itens do ciclo seguinte adiantados para o ciclo atual (aba Antecipações).   */

/**
 * Cria, edita ou exclui uma antecipação (veja aplicarAcaoAntecipacao_). Todo mundo as recebe no getDados.
 * @return {Array} antecipações atualizadas
 */
function salvarAntecipacao(acesso, pedido) {
  return executarAntecipacao_(ioRascunhos_(planilhaVisualizador_()), acesso, pedido);
}

/* ============================= PRATELEIRAS =============================== */
/* Produtos de cada prateleira de cada espaço (aba Prateleiras).              */

/**
 * Grava os produtos das prateleiras de um espaço (veja aplicarAcaoPrateleiras_). Todo mundo as recebe no getDados.
 * @return {Array} prateleiras atualizadas
 */
function salvarPrateleiras(acesso, pedido) {
  return executarPrateleiras_(ioRascunhos_(planilhaVisualizador_()), acesso, pedido);
}

/* ================================ I/O ===================================== */

/** Planilha dos ciclos: a de VISUALIZADOR.PLANILHA (link ou ID), a propriedade SPREADSHEET_ID ou a vinculada. */
function planilhaVisualizador_() {
  const ref = String(VISUALIZADOR.PLANILHA ||
    PropertiesService.getScriptProperties().getProperty(CONFIG.PROPRIEDADE_PLANILHA) || '').trim();
  if (ref) {
    const link = ref.match(/\/d\/([a-zA-Z0-9_-]+)/);
    try {
      return SpreadsheetApp.openById(link ? link[1] : ref);
    } catch (e) {
      throw new Error('Não consegui abrir a planilha "' + ref + '". Confira o link/ID em VISUALIZADOR.PLANILHA ' +
        'e se a conta que publicou o app tem acesso a ela.');
    }
  }
  const ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (ativa) return ativa;
  throw new Error('Nenhuma planilha conectada. Abra o Apps Script pela planilha (Extensões > Apps Script) ' +
    'ou cole o link dela em VISUALIZADOR.PLANILHA, no início do arquivo Codigo.gs.');
}

/**
 * Grava a matriz inteira numa aba (cria se não existir), tudo como texto simples, com o cabeçalho
 * em negrito e congelado. Usada pelos ciclos em construção e, na aprovação, pelas abas publicadas.
 */
function gravarAbaTexto_(ss, nome, valores) {
  let sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.setFrozenRows(1);
  }
  const largura = valores[0].length;
  const linhas = valores.map(function (row) {
    const r = row.slice(0, largura);
    while (r.length < largura) r.push('');
    return r;
  });
  sh.clearContents();
  if (sh.getMaxColumns() < largura) sh.insertColumnsAfter(sh.getMaxColumns(), largura - sh.getMaxColumns());
  if (sh.getMaxRows() < linhas.length) sh.insertRowsAfter(sh.getMaxRows(), linhas.length - sh.getMaxRows());
  const faixa = sh.getRange(1, 1, linhas.length, largura);
  faixa.setNumberFormat('@');
  faixa.setValues(linhas);
  sh.getRange(1, 1, 1, largura).setFontWeight('bold');
}

/** Aba inteira com os valores exibidos (evita que "10/2026" vire data ou "01" vire 1). Null se não existe. */
function lerAbaTexto_(ss, nome) {
  const sh = ss.getSheetByName(nome);
  if (!sh) return null;
  if (sh.getLastRow() < 1) return [];
  return sh.getDataRange().getDisplayValues();
}

function lerAjustes_(planta) {
  try {
    return JSON.parse(PropertiesService.getScriptProperties().getProperty(VISUALIZADOR.PROPRIEDADE_AJUSTES + planta) || '{}') || {};
  } catch (e) {
    return {};
  }
}

function aplicarAjustesSalvos_(plantas) {
  plantas.forEach(function (p) {
    const ajustes = lerAjustes_(p.id);
    if (ajustes.LOJA && p.loja) {
      p.loja.escalaEtiquetas = normTamanhoEtiquetas_(ajustes.LOJA.escala);
      if (normSlide_(ajustes.LOJA.slide)) p.loja.slide = normSlide_(ajustes.LOJA.slide);
    }
    // Posições salvas antes de a planta ter posições fixas (deslocamentos a partir do arranjo automático)
    // não valem mais quando o código traz a largura do slide: ficam as posições fixas do código.
    if (p.loja && p.loja.slide && !(ajustes.LOJA && normSlide_(ajustes.LOJA.slide))) return;
    p.moveis.forEach(function (m) {
      const atual = { x: m.ajusteX || 0, y: m.ajusteY || 0, espacos: m.ajustesEspacos || {} };
      if (!aplicarAjusteEtiquetas_(m.id, ajustes, atual)) return;
      m.ajusteX = atual.x;
      m.ajusteY = atual.y;
      m.ajustesEspacos = atual.espacos;
    });
  });
}
