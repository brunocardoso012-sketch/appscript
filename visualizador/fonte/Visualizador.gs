/**
 * ============================================================================
 *  PLANO DE VAREJO · VISUALIZADOR — versão só de visualização (Apps Script)
 * ============================================================================
 *  Mostra as plantas de cada ciclo a partir de UMA planilha (abas "Movimentos"
 *  e "Painéis"). A estratégia é montada direto na planilha; o app só lê.
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
  const dados = montarDados_(valoresLayoutPadrao_(), movimentos, lerAbaTexto_(ss, CONFIG.ABAS.PAINEIS));
  aplicarAjustesSalvos_(dados.plantas);
  dados.planilhaUrl = ss.getUrl();
  dados.precisaConfigurar = false;
  return dados;
}

/**
 * Grava a posição das etiquetas arrastadas em "Ajustar etiquetas". Fica nas
 * propriedades do script (a planilha não é alterada).
 * @param {string} planta
 * @param {Object<string, {x:number, y:number}>} ajustes  ID do móvel → deslocamento em px.
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
    p.moveis.forEach(function (m) {
      const a = ajustes[m.id];
      if (a) { m.ajusteX = Number(a.x) || 0; m.ajusteY = Number(a.y) || 0; }
    });
  });
}
