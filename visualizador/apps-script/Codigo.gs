/* ===== visualizador/fonte/Visualizador.gs ===== */
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

/* ===== src/Config.gs ===== */
/**
 * ============================================================================
 *  CONFIGURAÇÕES DO VISUALIZADOR DE PLANTAS
 * ============================================================================
 *  Tudo o que costuma mudar (cores das marcas, nomes das abas, quantidade de
 *  etiquetas por móvel) fica neste arquivo.
 */

const CONFIG = {
  TITULO: 'Plano de Varejo · Visualizador de Plantas',
  ABAS: {
    MOVIMENTOS: 'Movimentos',
    PAINEIS: 'Painéis',
    LAYOUT: 'Layout',
  },
  /** Quantidade de etiquetas (caixas de texto) por móvel na planilha. */
  MAX_ETIQUETAS: 4,
  /** Limite de linhas aceitas em uma importação. */
  MAX_LINHAS_IMPORTACAO: 10000,
  /** Usado quando o script NÃO está vinculado a uma planilha (projeto standalone). */
  PROPRIEDADE_PLANILHA: 'SPREADSHEET_ID',
  /** Planta coringa: linhas com esse valor valem para todas as plantas. */
  PLANTA_TODAS: 'TODAS',
};

/**
 * Nome de cada planta (abas, título do slide e PNG). Na coluna "Planta" das
 * abas vale tanto o número (01) quanto o nome (ER P). Planta que não aparece
 * aqui é chamada de "PLANTA <número>".
 */
const NOMES_PLANTAS = { '01': 'ER P', '02': 'ER M', '03': 'ER G', '04': 'ER GG' };

/**
 * Espaços que mudam de móvel ao passar de uma planta para a seguinte na cascata.
 * A partir da planta "aPartirDe" (e nas seguintes), o espaço "para" mostra o que o
 * espaço "de" tinha na planta anterior, e o espaço "de" fica livre (branco, sem
 * etiqueta) para receber outro movimento. Uma linha própria na planilha (a partir
 * dessa planta) tem prioridade sobre a transferência.
 * Vale para espaços de gôndola (LADO-A, MEIO-A, MEIO-B, LADO-B) e metades de meio.
 */
const TRANSFERENCIAS = [
  // ER M → ER G / ER GG: o lado B da Gôndola 2 da ER M vira o lado A da Gôndola 3,
  // e o meio B da Gôndola 2 vira o meio A da Gôndola 3.
  { aPartirDe: 'ER G', de: 'GONDOLA 2/LADO-B', para: 'GONDOLA 3/LADO-A' },
  { aPartirDe: 'ER G', de: 'GONDOLA 2/MEIO-B', para: 'GONDOLA 3/MEIO-A' },
];

/**
 * Quantas etiquetas a linha do móvel inteiro mostra (as outras colunas "Etiqueta N"
 * são ignoradas). Tipos que não aparecem aqui mostram até CONFIG.MAX_ETIQUETAS
 * (pirâmide e mesas: até 4, empilhadas).
 * Gôndola: na linha da gôndola inteira, Etiqueta 1 = Lado A, 2 = Meio A, 3 = Meio B
 * e 4 = Lado B (uma por bloco); a linha de um espaço (GONDOLA 1/MEIO-A…) substitui
 * as etiquetas daquele bloco (veja ETIQUETAS_POR_BLOCO).
 * Balcão recepção: uma cor só; Etiqueta 1, 2 e 3 vão para o bloco 1, o canto e o bloco 3.
 * Totem: Etiqueta 1, 2 e 3 vão para o painel 1 (o de cima), 2 e 3, e a "Marca Etiqueta N"
 * pinta o painel N; a linha de um painel (TOTEM 1/PAINEL-2…) tem prioridade.
 */
const ETIQUETAS_POR_TIPO = { GONDOLA: 4, VITRINE_L: 3, TOTEM: 3 };

/**
 * Quantas etiquetas a linha de um bloco mostra em cima dele (GONDOLA 1/LADO-A,
 * MESA DESTAQUE 1/FRENTE-2, TOTEM 1/PAINEL-3…). Tipos que não aparecem aqui
 * (totem, testeiras do móvel make) mostram só a Etiqueta 1. Blocos vizinhos com as
 * mesmas etiquetas (texto e cor) viram uma pilha só, centralizada.
 */
const ETIQUETAS_POR_BLOCO = { GONDOLA: 4, MESA: 4, MESA_3: 4 };

/**
 * Marcas e cores.
 *  - etiqueta: cor da caixa de texto (fundo) — texto sempre branco.
 *  - movel:    cor de preenchimento do móvel na planta.
 *  - apelidos: outras formas aceitas na planilha (comparação ignora acentos,
 *              maiúsculas, espaços e pontuação).
 *
 * Na planilha também é possível:
 *  - combinar marcas com "+" (ex.: BOT+QDB) → gera um degradê;
 *  - usar uma cor livre em hexadecimal (ex.: #FF8800).
 */
const MARCAS = {
  BOT: {
    nome: 'Boticário',
    etiqueta: '#3E9D6B',
    movel: '#7CC9A0',
    apelidos: ['BOTICARIO', 'OBOTICARIO', 'BOTI', 'VERDE'],
  },
  QDB: {
    nome: 'Quem disse, berenice?',
    etiqueta: '#E23FB4',
    movel: '#F07ACD',
    apelidos: ['QUEMDISSEBERENICE', 'BERENICE', 'ROSA'],
  },
  EUD: {
    nome: 'Eudora',
    etiqueta: '#A11FC9',
    movel: '#B666D8',
    apelidos: ['EUDORA', 'ROXO'],
  },
  OUI: {
    nome: 'O.U.i',
    etiqueta: '#E1262F',
    movel: '#C9343F',
    apelidos: ['OUIPARIS', 'VERMELHO'],
  },
  MULTI: {
    nome: 'Multimarca',
    etiqueta: '#2B4DE3',
    movel: '#7D90EC',
    apelidos: ['MULTIMARCA', 'MM', 'AZUL'],
  },
  NEUTRO: {
    nome: 'Neutro (sem marca)',
    etiqueta: '#4A4A4A',
    movel: '#F4F4F4',
    apelidos: ['SEMMARCA', 'BRANCO', 'CINZA', 'NENHUMA', 'NENHUM'],
  },
};

/** Símbolos exibidos ao lado da primeira etiqueta do móvel. */
const SIMBOLOS = {
  MOVIMENTO: { descricao: 'Movimento definido nesta planta', apelidos: ['MOV', 'SETA', '▶', '>'] },
  FIXO: { descricao: 'Espaço fixo (sem mudança nos ciclos)', apelidos: ['ESPACOFIXO', '◆', 'LOSANGO'] },
  EXPOSICAO: { descricao: 'Exposição, sem comunicação', apelidos: ['E', 'EXPOSICAOSEMCOMUNICACAO'] },
  NOVO: { descricao: 'Novidade', apelidos: ['NEW', 'NOVIDADE'] },
};

/** Seções da aba "Painéis" (textos fora dos móveis). */
const SECOES_PAINEL = {
  TV: { descricao: 'Lista ao lado dos ícones de TV / rádio', apelidos: ['TVRADIO', 'RADIO', 'GRADE', 'MIDIA'] },
  A: { descricao: 'Lista ao lado do ícone (A)', apelidos: [] },
  C: { descricao: 'Lista ao lado do ícone (C)', apelidos: [] },
  CALLOUT: {
    descricao: 'Caixa de destaque sobre a planta (pode apontar para um móvel)',
    apelidos: ['BALAO', 'DESTAQUE', 'CAIXA', 'CAIXADETEXTO'],
  },
  NOTA: {
    descricao: 'Nota no canto inferior esquerdo (texto antes de ":" fica em negrito)',
    apelidos: ['NOTAS', 'OBS', 'OBSERVACAO', 'RODAPE'],
  },
};

/**
 * Tipos de móvel aceitos na aba "Layout" (definem o desenho 3D).
 * O modo "Construir loja" oferece os tipos de TIPOS_CONSTRUCAO; os demais
 * continuam sendo desenhados para não quebrar layouts antigos.
 */
const TIPOS_MOVEL = {
  LOJA: 'Dimensões da loja (piso + paredes). Uma linha por planta.',
  PIRAMIDE: 'Pirâmide: 4 blocos iguais empilhados (até 4 etiquetas)',
  GONDOLA: 'Gôndola: lado A, meio A, meio B e lado B (o A virado para quem olha; cada meio pode ser dividido em dois), 4 níveis, até 4 etiquetas por bloco',
  FILA: 'Móvel de fila: bloco único retangular com 3 níveis',
  GONDOLA_PAREDE: 'Móvel de parede: estante encostada na parede, com prateleiras',
  CUBO: 'PDV móvel: cubo de vidro sobre rodapé',
  MESA: 'Mesa destaque: 2 frentes (nicho, lâmina do fundo e cartaz), cada uma com cor e até 4 etiquetas próprias',
  MESA_3: 'Mesa destaque 3 frentes: 3 frentes (nicho, lâmina do fundo e cartaz), cada uma com cor e até 4 etiquetas próprias',
  TOTEM: 'Totem: estrutura metálica com 3 painéis, cada um com cor e etiqueta próprias (Etiqueta 1–3 = painel 1, o de cima, 2 e 3)',
  PAINEL: 'Parede O.U.i: painel alto com moldura',
  EXPOSITOR_OUI: 'Totem O.U.i: expositor estreito com moldura, na altura da gôndola',
  ILHA_OUI: 'Ilha premium O.U.i: base com prateleiras e painel alto atrás, com faixas claras nas laterais',
  MAKE: 'Móvel make: estante de parede com prateleiras e 4 testeiras no alto (cada uma pode ter cor própria)',
  VITRINE_L: 'Balcão recepção: em "L", com os dois lados do mesmo tamanho; uma cor só e uma etiqueta por bloco (Etiqueta 1–3)',
  CAIXA: 'Móvel de atendimento (caixa): balcão com tela preta em cima',
  EXTRA: 'Item fora da planta (Cestinhas, Espaço da Beleza, Cavalete…)',
};

/** Tipos oferecidos no modo "Construir loja". */
const TIPOS_CONSTRUCAO = [
  'GONDOLA', 'PIRAMIDE', 'FILA', 'GONDOLA_PAREDE', 'TOTEM', 'CUBO', 'MESA', 'MESA_3', 'VITRINE_L', 'CAIXA', 'PAINEL', 'EXPOSITOR_OUI', 'ILHA_OUI', 'MAKE',
];

/**
 * Espaços (blocos) de um móvel, cada um com cor e etiqueta próprias na planilha:
 *  - gôndola: Lado A, Meio A, Meio B e Lado B (o "A" é sempre o lado virado para
 *    quem olha a planta; cada meio pode ser dividido em dois);
 *  - mesa destaque: Frente 1 e 2 (3 frentes: Frente 1, 2 e 3);
 *  - totem: Painel 1 a 3 (o 1 é o de cima);
 *  - móvel make: Testeira 1 a 4.
 * Na planilha, cada espaço é endereçado como "<ID do móvel>/<espaço>", ex.:
 * GONDOLA 1/LADO-A, GONDOLA 1/MEIO-A-2, MESA DESTAQUE 1/FRENTE-2.
 * Uma linha só com o ID do móvel vale para todos os espaços sem linha própria.
 * (A página tem uma cópia desta regra em Render.espacos.)
 * @param {{tipo: string, dividido: string}} m  dividido = '', 'A', 'B' ou 'AB'
 * @return {Array<{id: string, nome: string}>}
 */
function espacosDoMovel_(m) {
  const numerados = function (prefixo, nome, n) {
    const lista = [];
    for (let i = 1; i <= n; i++) lista.push({ id: prefixo + '-' + i, nome: nome + ' ' + i });
    return lista;
  };
  if (!m) return [];
  if (m.tipo === 'MAKE') return numerados('TESTEIRA', 'Testeira', 4);
  if (m.tipo === 'MESA') return numerados('FRENTE', 'Frente', 2);
  if (m.tipo === 'MESA_3') return numerados('FRENTE', 'Frente', 3);
  if (m.tipo === 'TOTEM') return numerados('PAINEL', 'Painel', 3);
  if (m.tipo !== 'GONDOLA') return [];
  const div = String(m.dividido || '').toUpperCase();
  const lista = [{ id: 'LADO-A', nome: 'Lado A' }];
  ['A', 'B'].forEach(function (lado) {
    if (div.indexOf(lado) >= 0) {
      lista.push({ id: 'MEIO-' + lado + '-1', nome: 'Meio ' + lado + ' (metade 1)' });
      lista.push({ id: 'MEIO-' + lado + '-2', nome: 'Meio ' + lado + ' (metade 2)' });
    } else {
      lista.push({ id: 'MEIO-' + lado, nome: 'Meio ' + lado });
    }
  });
  lista.push({ id: 'LADO-B', nome: 'Lado B' });
  return lista;
}

/**
 * IDs de espaço aceitos na planilha. Além dos de espacosDoMovel_, a gôndola sempre
 * aceita o meio inteiro e as duas metades (MEIO-A, MEIO-A-1, MEIO-A-2…): preencher
 * a 2ª metade (MEIO-A-2) na planilha divide aquele meio em dois movimentos.
 */
function espacosAceitos_(m) {
  const lista = espacosDoMovel_(m).map(function (e) { return e.id; });
  if (m && m.tipo === 'GONDOLA') {
    ['A', 'B'].forEach(function (l) {
      ['MEIO-' + l, 'MEIO-' + l + '-1', 'MEIO-' + l + '-2'].forEach(function (id) { if (lista.indexOf(id) < 0) lista.push(id); });
    });
  }
  return lista;
}

/* --------------------------------------------------------------------------
 *  Colunas das abas. "titulo" é o cabeçalho na planilha; "apelidos" são
 *  cabeçalhos alternativos aceitos na leitura/importação.
 * ------------------------------------------------------------------------ */

function colunasMovimentos_() {
  const cols = [
    { chave: 'ciclo', titulo: 'Ciclo', obrigatoria: true, texto: true },
    { chave: 'planta', titulo: 'Planta', obrigatoria: true, texto: true },
    { chave: 'movel', titulo: 'ID Móvel', obrigatoria: true, texto: true, apelidos: ['ID', 'Código Móvel', 'Móvel ID'] },
    { chave: 'descricao', titulo: 'Móvel (referência)', apelidos: ['Móvel', 'Descrição'] },
    { chave: 'marca', titulo: 'Marca do Móvel', apelidos: ['Marca', 'Cor do Móvel', 'Cor'] },
  ];
  for (let i = 1; i <= CONFIG.MAX_ETIQUETAS; i++) {
    cols.push({ chave: 'etiqueta' + i, titulo: 'Etiqueta ' + i, texto: true, apelidos: ['Texto ' + i] });
    cols.push({ chave: 'marcaEtiqueta' + i, titulo: 'Marca Etiqueta ' + i, apelidos: ['Cor Etiqueta ' + i] });
  }
  cols.push({ chave: 'simbolo', titulo: 'Símbolo' });
  cols.push({ chave: 'observacao', titulo: 'Observação', texto: true, apelidos: ['Obs'] });
  return cols;
}

function colunasPaineis_() {
  return [
    { chave: 'ciclo', titulo: 'Ciclo', obrigatoria: true, texto: true },
    { chave: 'planta', titulo: 'Planta', obrigatoria: true, texto: true },
    { chave: 'secao', titulo: 'Seção', obrigatoria: true },
    { chave: 'texto', titulo: 'Texto', obrigatoria: true, texto: true },
    { chave: 'marca', titulo: 'Marca', apelidos: ['Cor'] },
    { chave: 'movel', titulo: 'Aponta para (ID Móvel)', texto: true, apelidos: ['ID Móvel', 'Móvel'] },
  ];
}

function colunasLayout_() {
  return [
    { chave: 'planta', titulo: 'Planta', obrigatoria: true, texto: true },
    { chave: 'movel', titulo: 'ID Móvel', obrigatoria: true, texto: true, apelidos: ['ID'] },
    { chave: 'descricao', titulo: 'Móvel (descrição)', apelidos: ['Móvel', 'Descrição'] },
    { chave: 'tipo', titulo: 'Tipo', obrigatoria: true },
    { chave: 'x', titulo: 'X' },
    { chave: 'y', titulo: 'Y' },
    { chave: 'z', titulo: 'Elevação (Z)', apelidos: ['Z', 'Elevação'] },
    { chave: 'largura', titulo: 'Largura (eixo X)', apelidos: ['Largura'] },
    { chave: 'profundidade', titulo: 'Profundidade (eixo Y)', apelidos: ['Profundidade'] },
    { chave: 'altura', titulo: 'Altura', apelidos: ['Altura (Z)'] },
    { chave: 'ajusteX', titulo: 'Ajuste Etiqueta X (px)', apelidos: ['Ajuste X'] },
    { chave: 'ajusteY', titulo: 'Ajuste Etiqueta Y (px)', apelidos: ['Ajuste Y'] },
    { chave: 'dividido', titulo: 'Meios divididos', texto: true, apelidos: ['Divisão', 'Dividido'] },
    { chave: 'giro', titulo: 'Giro (graus)', apelidos: ['Giro', 'Rotação', 'Rotacao'] },
  ];
}

/* ===== src/Layouts.gs ===== */
/**
 * ============================================================================
 *  LAYOUT PADRÃO DAS PLANTAS + CICLO DE EXEMPLO
 * ============================================================================
 *  Usado apenas para criar as abas "Layout", "Movimentos" e "Painéis" na
 *  primeira configuração. Depois disso, a fonte da verdade é a planilha.
 *
 *  Sistema de coordenadas (unidades livres, ~0,5 m cada):
 *   - Canto do fundo da loja (topo do desenho) = (0, 0).
 *   - X cresce ao longo da parede do fundo à DIREITA (em direção ao canto direito).
 *   - Y cresce ao longo da parede do fundo à ESQUERDA (em direção à frente/caixas).
 *   - Z é a elevação (0 = chão). Largura = eixo X, Profundidade = eixo Y.
 *
 *  Móvel: [ID, descrição, tipo, x, y, largura, profundidade, altura, (elevação), (ajuste etiqueta X), (ajuste Y),
 *          (meios divididos da gôndola: '', 'A', 'B' ou 'AB'), (giro em graus: 0, 90, 180 ou 270)]
 *  O botão "Baixar código da loja" (modo Construir loja) gera este mesmo formato.
 */

/**
 * Versão do modelo base de cada planta. Ao mudar o modelo de uma planta aqui,
 * aumente o número dela: na próxima abertura, essa planta (layout + linhas do
 * ciclo de exemplo) é atualizada para o modelo novo; as demais ficam intactas.
 * Plantas que não aparecem aqui estão na versão 1.
 */
const VERSAO_MODELO_PLANTAS = { '01': 11, '02': 10, '03': 7, '04': 8 };

/**
 * Versão do ciclo de exemplo inteiro (Movimentos + Painéis, todas as plantas e TODAS).
 * Ao aumentar, todas as linhas do "Ciclo exemplo" são trocadas pelas atuais na próxima
 * abertura (os outros ciclos não mudam).
 */
const VERSAO_EXEMPLO = 7;

const LAYOUT_PADRAO = {
  // PLANTA 01 (ER P): layout montado no modo "Construir loja".
  '01': {
    loja: [12, 10, 4.4],
    moveis: [
      ['MOVEL DE PAREDE 1', 'Móvel de parede 1', 'GONDOLA_PAREDE', 0, 0, 3, 1.1, 3.2],
      ['GONDOLA 1', 'Gôndola 1', 'GONDOLA', 2.5, 2, 1.6, 4, 1.94],
      ['PIRAMIDE 1', 'Pirâmide 1', 'PIRAMIDE', 6, 2.5, 1.02, 1.02, 1.94],
      ['PIRAMIDE 2', 'Pirâmide 2', 'PIRAMIDE', 6, 4.5, 1.02, 1.02, 1.94],
      ['MESA DESTAQUE 1', 'Mesa destaque 1', 'MESA', 8.5, 3.5, 2.6, 1.4, 2.6],
      ['PDV MOVEL 1', 'PDV móvel 1', 'CUBO', 5.5, 7, 1.3, 1.3, 1.44],
      ['BALCAO RECEPCAO 1', 'Balcão recepção 1', 'VITRINE_L', 9.5, 6.5, 2.4, 2.4, 1.28, 0, 0, 0, '', 90],
      ['MOVEL DE FILA 2', 'Móvel de fila 2', 'FILA', 2, 9.5, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 1', 'Móvel de fila 1', 'FILA', 2, 8, 1.5, 0.4, 1.46],
      ['TOTEM 1', 'Totem 1', 'TOTEM', 6, 8.5, 0.35, 1.5, 3.4],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', 0, 1.5, 0.6, 6, 3.2],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 8, 1.2, 1.8, 1.7],
      ['MOVEL DE PAREDE 2', 'Móvel de parede 2', 'GONDOLA_PAREDE', 3, 0, 3, 1.1, 3.2],
      ['MOVEL DE PAREDE 3', 'Móvel de parede 3', 'GONDOLA_PAREDE', 6, 0, 3, 1.1, 3.2],
      ['MOVEL DE PAREDE 4', 'Móvel de parede 4', 'GONDOLA_PAREDE', 9, 0, 3, 1.1, 3.2],
    ],
  },
  // PLANTA 02 (ER M): layout montado no modo "Construir loja".
  '02': {
    loja: [16, 14, 4.4],
    moveis: [
      ['GONDOLA 1', 'Gôndola 1', 'GONDOLA', 3.5, 3, 1.6, 4, 1.94],
      ['GONDOLA 2', 'Gôndola 2', 'GONDOLA', 7, 3, 1.6, 4, 1.94],
      ['PIRAMIDE 1', 'Pirâmide 1', 'PIRAMIDE', 10, 3.5, 1.02, 1.02, 1.94],
      ['PIRAMIDE 2', 'Pirâmide 2', 'PIRAMIDE', 12, 3.5, 1.02, 1.02, 1.94],
      ['MESA DESTAQUE 1', 'Mesa destaque 1', 'MESA', 11.5, 7.5, 2.6, 1.4, 2.6],
      ['MOVEL DE FILA 1', 'Móvel de fila 1', 'FILA', 2.5, 10.5, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 3', 'Móvel de fila 3', 'FILA', 2.5, 12.5, 1.5, 0.4, 1.46],
      ['PDV MOVEL 1', 'PDV móvel 1', 'CUBO', 8, 11, 1.3, 1.3, 1.44],
      ['BALCAO RECEPCAO 1', 'Balcão recepção 1', 'VITRINE_L', 13.5, 11, 2.4, 2.4, 1.28, 0, 0, 0, '', 90],
      ['TOTEM 1', 'Totem 1', 'TOTEM', 8.5, 12.5, 0.35, 1.5, 3.4],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['MOVEL DE PAREDE 1', 'Móvel de parede 1', 'GONDOLA_PAREDE', 0, 0, 3, 1.1, 3.2],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', 0, 2.5, 1.4, 6, 3.2],
      ['MOVEL DE ATENDIMENTO 2', 'Móvel de atendimento 2', 'CAIXA', 0, 11.5, 1.2, 1.8, 1.7],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 9.5, 1.2, 1.8, 1.7],
      ['MOVEL DE FILA 4', 'Móvel de fila 4', 'FILA', 4, 12.5, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 2', 'Móvel de fila 2', 'FILA', 4, 10.5, 1.5, 0.4, 1.46],
      ['PAREDE OUI 1', 'Parede O.U.i 1', 'PAINEL', 12.5, 0, 3.6, 0.9, 5],
      ['TOTEM OUI 1', 'Totem O.U.i 1', 'EXPOSITOR_OUI', 8.5, 9.4, 0.8, 0.8, 1.94],
      ['PIRAMIDE 3', 'Pirâmide 3', 'PIRAMIDE', 14, 3.5, 1.02, 1.02, 1.94],
      ['MOVEL DE PAREDE 2', 'Móvel de parede 2', 'GONDOLA_PAREDE', 3, 0, 3, 1.1, 3.2],
      ['MOVEL DE PAREDE 3', 'Móvel de parede 3', 'GONDOLA_PAREDE', 6, 0, 3, 1.1, 3.2],
      ['MOVEL DE PAREDE 4', 'Móvel de parede 4', 'GONDOLA_PAREDE', 9, 0, 3, 1.1, 3.2],
    ],
  },
  // PLANTA 03 (ER G): layout montado no modo "Construir loja".
  '03': {
    loja: [14, 16, 4.6],
    moveis: [
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['PIRAMIDE 1', 'Pirâmide 1', 'PIRAMIDE', 12.5, 2.5, 1.02, 1.02, 1.94],
      ['GONDOLA 1', 'Gôndola 1', 'GONDOLA', 3, 2.5, 1.6, 4, 1.94],
      ['PDV MOVEL 1', 'PDV móvel 1', 'CUBO', 6.5, 12, 1.3, 1.3, 1.44],
      ['BALCAO RECEPCAO 1', 'Balcão recepção 1', 'VITRINE_L', 11.5, 12.5, 2.4, 2.4, 1.28, 0, 0, 0, '', 90],
      ['MOVEL DE ATENDIMENTO 3', 'Móvel de atendimento 3', 'CAIXA', 0, 13, 1.2, 1.8, 1.7],
      ['PAREDE OUI 1', 'Parede O.U.i 1', 'PAINEL', 11, 0.5, 3, 0.8, 4.5],
      ['MOVEL DE FILA 6', 'Móvel de fila 6', 'FILA', 3.5, 13, 1.5, 0.4, 1.46],
      ['TOTEM OUI 1', 'Totem O.U.i 1', 'EXPOSITOR_OUI', 7, 10.4, 0.8, 0.8, 1.94],
      ['MOVEL DE PAREDE 1', 'Móvel de parede 1', 'GONDOLA_PAREDE', 0.5, 0, 2.5, 1.1, 3.2],
      ['GONDOLA 2', 'Gôndola 2', 'GONDOLA', 6, 2.5, 1.6, 4, 1.94],
      ['GONDOLA 3', 'Gôndola 3', 'GONDOLA', 9, 2.5, 1.6, 4, 1.94],
      ['PIRAMIDE 2', 'Pirâmide 2', 'PIRAMIDE', 12.5, 4.5, 1.02, 1.02, 1.94],
      ['PIRAMIDE 3', 'Pirâmide 3', 'PIRAMIDE', 12.5, 6.5, 1.02, 1.02, 1.94],
      ['MOVEL DE ATENDIMENTO 2', 'Móvel de atendimento 2', 'CAIXA', 0, 11, 1.2, 1.8, 1.7],
      ['MOVEL DE FILA 1', 'Móvel de fila 1', 'FILA', 2, 9, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 7', 'Móvel de fila 7', 'FILA', 2, 15, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 3', 'Móvel de fila 3', 'FILA', 2, 11, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 5', 'Móvel de fila 5', 'FILA', 2, 13, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 4', 'Móvel de fila 4', 'FILA', 3.5, 11, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 8', 'Móvel de fila 8', 'FILA', 3.5, 15, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 2', 'Móvel de fila 2', 'FILA', 3.5, 9, 1.5, 0.4, 1.46],
      ['MESA DESTAQUE 3 FRENTES 1', 'Mesa destaque 3 frentes 1', 'MESA_3', 9, 9, 3.9, 1.4, 2.6],
      ['TOTEM 1', 'Totem 1', 'TOTEM', 7.5, 14, 0.35, 1.5, 3.4],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', -0.5, 1.5, 1.4, 6, 3.2],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 9, 1.2, 1.8, 1.7],
      ['MOVEL DE PAREDE 2', 'Móvel de parede 2', 'GONDOLA_PAREDE', 3, 0, 2.5, 1.1, 3.2],
      ['MOVEL DE PAREDE 3', 'Móvel de parede 3', 'GONDOLA_PAREDE', 5.5, 0, 2.5, 1.1, 3.2],
      ['MOVEL DE PAREDE 4', 'Móvel de parede 4', 'GONDOLA_PAREDE', 8, 0, 2.5, 1.1, 3.2],
    ],
  },
  // PLANTA 04 (ER GG): layout montado no modo "Construir loja".
  '04': {
    loja: [17, 20, 4.6],
    moveis: [
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['PIRAMIDE 1', 'Pirâmide 1', 'PIRAMIDE', 14.5, 2.5, 1.02, 1.02, 1.94],
      ['GONDOLA 1', 'Gôndola 1', 'GONDOLA', 3.5, 2.5, 1.6, 4, 1.94],
      ['PDV MOVEL 1', 'PDV móvel 1', 'CUBO', 6, 17, 1.3, 1.3, 1.44],
      ['BALCAO RECEPCAO 1', 'Balcão recepção 1', 'VITRINE_L', 14.5, 17.5, 2.4, 2.4, 1.28],
      ['MOVEL DE ATENDIMENTO 3', 'Móvel de atendimento 3', 'CAIXA', 0, 17, 1.2, 1.8, 1.7],
      ['MOVEL DE FILA 6', 'Móvel de fila 6', 'FILA', 3, 17, 1.5, 0.4, 1.46],
      ['TOTEM OUI 1', 'Totem O.U.i 1', 'EXPOSITOR_OUI', 6.5, 16, 0.8, 0.8, 1.94],
      ['MOVEL DE PAREDE 1', 'Móvel de parede 1', 'GONDOLA_PAREDE', 0, -0.5, 4, 1.1, 3.2],
      ['MOVEL DE PAREDE 2', 'Móvel de parede 2', 'GONDOLA_PAREDE', 4, -0.5, 4, 1.1, 3.2],
      ['GONDOLA 2', 'Gôndola 2', 'GONDOLA', 7, 2.5, 1.6, 4, 1.94],
      ['GONDOLA 3', 'Gôndola 3', 'GONDOLA', 10.5, 2.5, 1.6, 4, 1.94],
      ['GONDOLA 4', 'Gôndola 4', 'GONDOLA', 3.5, 8, 1.6, 4, 1.94],
      ['GONDOLA 5', 'Gôndola 5', 'GONDOLA', 7, 8, 1.6, 4, 1.94],
      ['GONDOLA 6', 'Gôndola 6', 'GONDOLA', 10.5, 8, 1.6, 4, 1.94],
      ['PIRAMIDE 2', 'Pirâmide 2', 'PIRAMIDE', 14.5, 4.5, 1.02, 1.02, 1.94],
      ['PIRAMIDE 3', 'Pirâmide 3', 'PIRAMIDE', 14.5, 6.5, 1.02, 1.02, 1.94],
      ['PIRAMIDE 4', 'Pirâmide 4', 'PIRAMIDE', 14.5, 8.5, 1.02, 1.02, 1.94],
      ['PIRAMIDE 5', 'Pirâmide 5', 'PIRAMIDE', 14.5, 10.5, 1.02, 1.02, 1.94],
      ['MOVEL DE ATENDIMENTO 2', 'Móvel de atendimento 2', 'CAIXA', 0, 15, 1.2, 1.8, 1.7],
      ['MOVEL DE FILA 7', 'Móvel de fila 7', 'FILA', 1.5, 19, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 5', 'Móvel de fila 5', 'FILA', 1.5, 17, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 2', 'Móvel de fila 2', 'FILA', 3, 13, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 3', 'Móvel de fila 3', 'FILA', 1.5, 15, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 4', 'Móvel de fila 4', 'FILA', 3, 15, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 8', 'Móvel de fila 8', 'FILA', 3, 19, 1.5, 0.4, 1.46],
      ['MESA DESTAQUE 3 FRENTES 1', 'Mesa destaque 3 frentes 1', 'MESA_3', 8.5, 14.5, 3.9, 1.4, 2.6],
      ['TOTEM 1', 'Totem 1', 'TOTEM', 7, 18.5, 0.35, 1.5, 3.4],
      ['MOVEL DE PAREDE 3', 'Móvel de parede 3', 'GONDOLA_PAREDE', 8, -0.5, 4, 1.1, 3.2],
      ['MOVEL DE FILA 1', 'Móvel de fila 1', 'FILA', 1.5, 13, 1.5, 0.4, 1.46],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 13, 1.2, 1.8, 1.7],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', 0, 3.5, 1.4, 6, 3.2],
      ['MOVEL DE PAREDE 4', 'Móvel de parede 4', 'GONDOLA_PAREDE', 12, -0.5, 4, 1.1, 3.2],
      ['ILHA PREMIUM OUI 1', 'Ilha premium O.U.i 1', 'ILHA_OUI', 13.5, 14, 3, 1.6, 3],
    ],
  },
};

/* --------------------------------------------------------------------------
 *  CICLO DE EXEMPLO (transcrito das telas de referência)
 *  Móvel: ID → [marca do móvel, [[etiqueta, marca da etiqueta], ...], símbolo]
 *  Cascata: o que é definido numa planta vale também para as seguintes
 *  (ER P → ER M → ER G → ER GG), então cada móvel aparece só na primeira planta
 *  que o tem. Uma linha da própria planta tem prioridade; "TODAS" vale para todas.
 *  Pirâmide e mesa destaque mostram 1 etiqueta; na gôndola inteira, as
 *  etiquetas 1–4 vão para Ponta 1, Meio A, Meio B e Ponta 2 (ETIQUETAS_POR_TIPO).
 * ------------------------------------------------------------------------ */

const EXEMPLO_CICLO = 'Ciclo exemplo';

const EXEMPLO_MOVIMENTOS = {
  TODAS: {
    'EXTRA-CESTINHAS': ['NEUTRO', [['LÇTO EGEO', 'BOT+QDB']]],
    'EXTRA-BELEZA': ['NEUTRO', [['BOTIPROMO MAKE B.', 'BOT'], ['LIQUIDA MAKE', 'QDB']]],
    'EXTRA-CAVALETE': ['NEUTRO', [['SIÀGE ULTIMATE', 'EUD']]],
  },
  '01': {
    'MOVEL DE PAREDE 1': ['NEUTRO', [['CUIDADOS (NSPA)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'MOVEL DE PAREDE 2': ['NEUTRO', [['PERF MASC', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'MOVEL DE PAREDE 3': ['NEUTRO', [['CUIDADOS (CBEM)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'MOVEL DE PAREDE 4': ['NEUTRO', [['PERF FEM', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'GONDOLA 1': ['BOT', [['', ''], ['BOTIK', 'BOT'], ['UOMINI HERO', 'BOT'], ['BOTI PROMO', 'BOT']], 'FIXO'],
    'GONDOLA 1/LADO-A': ['QDB', [['LIQUIDA QDB', 'QDB'], ['JUICY MOOD', 'QDB']]],
    'PIRAMIDE 1': ['EUD', [['MULTI PROMO', 'MULTI']]],
    'PIRAMIDE 2': ['BOT', [['PRINCIPAIS OPORTUNIDADES', 'BOT']]],
    'MESA DESTAQUE 1': ['MULTI'],
    'MESA DESTAQUE 1/FRENTE-1': ['BOT', [['UOMINI GLORIFICADO', 'BOT']]],
    'MESA DESTAQUE 1/FRENTE-2': ['EUD', [['SIÀGE GLORIFICADO', 'EUD']]],
    'PDV MOVEL 1': ['EUD', [['SIÀGE ULTIMATE', 'EUD']]],
    'BALCAO RECEPCAO 1': ['BOT', [['LÇTO EGEO', 'BOT+QDB'], ['JUICY MOOD', 'QDB'], ['SIÀGE ULTIMATE', 'EUD']]],
    'MOVEL DE FILA 1': ['EUD', [['OUTLET EUD', 'EUD']]],
    'MOVEL DE FILA 2': ['BOT', [['BOTIPROMO', 'BOT']]],
    'TOTEM 1': ['BOT', [['LÇTO UOMINI', 'BOT'], ['BOTIPROMO', 'BOT'], ['LIQUIDA QDB', 'QDB']]],
    'MOVEL MAKE 1': ['NEUTRO', [['TESTEIRA MAKE MULTIPROMO', 'MULTI']]],
    'MOVEL MAKE 1/TESTEIRA-1': ['#1F1F1F'],
    'MOVEL MAKE 1/TESTEIRA-2': ['BOT', [['BOTIPROMO MAKE B.', 'BOT']]],
    'MOVEL MAKE 1/TESTEIRA-3': ['BOT', [['BOTIPROMO MAKE B.', 'BOT']]],
    'MOVEL MAKE 1/TESTEIRA-4': ['EUD'],
  },
  '02': {
    'GONDOLA 2': ['EUD', [['', ''], ['PERFUMARIA', 'EUD'], ['CUIDADOS', 'EUD'], ['OUTLET EUD', 'EUD']], 'MOVIMENTO'],
    'GONDOLA 2/LADO-A': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GONDOLA 2/MEIO-A-2': ['BOT', [['BOTI PROMO', 'BOT']], 'MOVIMENTO'],
    'PIRAMIDE 3': ['EUD', [['MULTI PROMO', 'MULTI']]],
    'MOVEL DE FILA 3': ['BOT', [['BOTIPROMO', 'BOT']]],
    'MOVEL DE FILA 4': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'PAREDE OUI 1': ['OUI', [['MON AMIE + LOÇÃO', 'OUI']], 'EXPOSICAO'],
    'TOTEM OUI 1': ['OUI', [['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
  },
  '03': {
    // Lado A e meio A da Gôndola 3 vêm do lado B e do meio B da Gôndola 2 da ER M (TRANSFERENCIAS, Config.gs).
    'GONDOLA 3': ['MULTI', [['', ''], ['', ''], ['+PEC REGIONAL', 'MULTI']], 'MOVIMENTO'],
    'MOVEL DE FILA 6': ['BOT', [['BOTIPROMO', 'BOT']]],
    'MOVEL DE FILA 8': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'MESA DESTAQUE 3 FRENTES 1': ['MULTI'],
    'MESA DESTAQUE 3 FRENTES 1/FRENTE-1': ['BOT', [['UOMINI GLORIFICADO', 'BOT']]],
    'MESA DESTAQUE 3 FRENTES 1/FRENTE-2': ['MULTI', [['VM PERMANENTE MULTI PROMO', 'MULTI']]],
    'MESA DESTAQUE 3 FRENTES 1/FRENTE-3': ['EUD', [['SIÀGE GLORIFICADO', 'EUD']]],
  },
  '04': {
    'PIRAMIDE 4': ['MULTI', [['ISCAS EXAUSTÃO', 'EUD']], 'MOVIMENTO'],
    'PIRAMIDE 5': ['BOT', [['ISCAS EXAUSTÃO', 'BOT']], 'MOVIMENTO'],
    'GONDOLA 4': ['OUI', [['EXAUSTÃO OUI', 'OUI']], 'MOVIMENTO'],
    'GONDOLA 5': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GONDOLA 6': ['EUD', [['EXAUSTÃO EUD', 'EUD']], 'MOVIMENTO'],
    'MOVEL DE PAREDE 4': ['NEUTRO', [['CUIDADOS (NSPA)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'ILHA PREMIUM OUI 1': ['OUI', [['MON AMIE + LOÇÃO', 'OUI'], ['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
  },
};

const TEXTO_CALLOUT_BOTIPROMO =
  '- MATERIAIS COMPLEMENTARES PARA BOTIPROMO DESTACANDO AS ISCAS COMERCIAIS: “ATÉ 52% DE DD” / “ITENS A PARTIR DE”.\n\n' +
  'VM COMPLEMENTAR PARA TOP SKUS:\n- FLORATTA ROM/VER\n- ARBO PURO\n- NSPA LOC AMEI/NEG 400\n- MATCH SHAMP NUTR PROFUNDA\n\n' +
  '- STOPPER LÇTO EGEO';

/** [planta, seção, texto, marca, aponta para (ID móvel)] */
const EXEMPLO_PAINEIS = [
  ['TODAS', 'TV', 'GRADE CURTO PRAZO', 'MULTI', ''],
  ['TODAS', 'A', 'BOTIPROMO', 'BOT', ''],
  ['TODAS', 'A', 'OUTLET EUDORA', 'EUD', ''],
  ['TODAS', 'C', 'LÇTO UOMINI', 'BOT', ''],
  ['TODAS', 'C', 'LÇTO EGEO', 'BOT', ''],
  ['TODAS', 'C', 'LÇTO SIÀGE', 'EUD', ''],
  ['TODAS', 'C', 'LÇTO MON AMIE', 'OUI', ''],
  ['TODAS', 'C', 'COMUNICAÇÃO INSTITUCIONAL PERMANENTE (3)', 'MULTI', ''],
  ['TODAS', 'CALLOUT', 'TESTEIRA MAKE MULTIPROMO - BOTI COM BOTIPROMO MAKE.B EUDORA COM OUTLET E QDB COM LIQUIDA', 'MULTI', 'MOVEL MAKE 1'],
  ['TODAS', 'CALLOUT', TEXTO_CALLOUT_BOTIPROMO, 'BOT', 'MOVEL DE PAREDE 2'],
  ['TODAS', 'CALLOUT', 'VMS COMPLEMENTARES DIRECIONADOS PARA O OUTLET. USAR ESSA LISTA DE PRIORIDADE COMO DIRECIONAL.', 'EUD', 'MOVEL DE PAREDE 3'],
  ['01', 'NOTA', 'Destaque PN: Comunicar promo como movimento MM nos espaços destaque', '', ''],
  ['01', 'NOTA', 'Pirâmide principais oportunidades: Itens de alta frequência na promo', '', ''],
  ['02', 'NOTA', 'PEC REGIONAL: Regionalização de exposição SP e NE.', '', ''],
  ['02', 'NOTA', 'Pirâmide: NE exposição de masculino e SP Masculino + Lily', '', ''],
  ['03', 'NOTA', 'PEC REGIONAL: Regionalização de exposição SP e NE.', '', ''],
  ['03', 'NOTA', 'Pirâmide: NE exposição de masculino e SP Masculino + Lily', '', ''],
  ['04', 'NOTA', 'PEC REGIONAL: Regionalização de exposição SP e NE.', '', ''],
  ['04', 'NOTA', 'Meio de gôndola: exclusivo NE, exposição de Lily.', '', ''],
  ['04', 'NOTA', 'Pirâmide: NE exposição de masculino e SP Masculino + Lily', '', ''],
];

/* ------------------------- Conversão em matrizes ------------------------- */

/** Matriz [cabeçalho, ...linhas] da aba Layout padrão. */
function valoresLayoutPadrao_() {
  const cols = colunasLayout_();
  const linhas = [cols.map(function (c) { return c.titulo; })];
  const linha = function (o) { return cols.map(function (c) { return o[c.chave] === undefined ? '' : o[c.chave]; }); };
  Object.keys(LAYOUT_PADRAO).forEach(function (planta) {
    const p = LAYOUT_PADRAO[planta];
    linhas.push(linha({
      planta: planta, movel: 'LOJA', descricao: 'Piso e paredes da loja', tipo: 'LOJA',
      x: 0, y: 0, z: 0, largura: p.loja[0], profundidade: p.loja[1], altura: p.loja[2], ajusteX: 0, ajusteY: 0,
    }));
    p.moveis.forEach(function (m) {
      linhas.push(linha({
        planta: planta, movel: m[0], descricao: m[1], tipo: m[2], x: m[3], y: m[4], z: m[8] || 0,
        largura: m[5], profundidade: m[6], altura: m[7], ajusteX: m[9] || 0, ajusteY: m[10] || 0, dividido: m[11] || '', giro: m[12] || 0,
      }));
    });
  });
  return linhas;
}

/** Matriz [cabeçalho, ...linhas] da aba Movimentos com o ciclo de exemplo. */
function valoresMovimentosExemplo_() {
  const cols = colunasMovimentos_();
  const linhas = [cols.map(function (c) { return c.titulo; })];
  const descricoes = {};
  Object.keys(LAYOUT_PADRAO).forEach(function (planta) {
    LAYOUT_PADRAO[planta].moveis.forEach(function (m) { descricoes[m[0]] = descricoes[m[0]] || m[1]; });
  });
  Object.keys(EXEMPLO_MOVIMENTOS).forEach(function (planta) {
    const moveis = EXEMPLO_MOVIMENTOS[planta];
    Object.keys(moveis).forEach(function (id) {
      const m = moveis[id];
      const o = {
        ciclo: EXEMPLO_CICLO, planta: planta, movel: id, descricao: descricoes[id] || '',
        marca: m[0], simbolo: m[2] || '', observacao: '',
      };
      (m[1] || []).slice(0, CONFIG.MAX_ETIQUETAS).forEach(function (e, i) {
        o['etiqueta' + (i + 1)] = e[0];
        o['marcaEtiqueta' + (i + 1)] = e[1];
      });
      linhas.push(cols.map(function (c) { return o[c.chave] === undefined ? '' : o[c.chave]; }));
    });
  });
  return linhas;
}

/** Matriz [cabeçalho, ...linhas] da aba Painéis com o ciclo de exemplo. */
function valoresPaineisExemplo_() {
  const cols = colunasPaineis_();
  const linhas = [cols.map(function (c) { return c.titulo; })];
  EXEMPLO_PAINEIS.forEach(function (p) {
    const o = { ciclo: EXEMPLO_CICLO, planta: p[0], secao: p[1], texto: p[2], marca: p[3], movel: p[4] };
    linhas.push(cols.map(function (c) { return o[c.chave] === undefined ? '' : o[c.chave]; }));
  });
  return linhas;
}

/* ===== src/Dados.gs ===== */
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
      const id = normIdEspaco_(l.movel);
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
      transferencias: transferencias_(),
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

/** TRANSFERENCIAS (Config.gs) com plantas e IDs normalizados ("ER G" → "03"). */
function transferencias_() {
  return (typeof TRANSFERENCIAS === 'undefined' ? [] : TRANSFERENCIAS).map(function (r) {
    return { planta: normPlanta_(r.aPartirDe), de: normIdEspaco_(r.de), para: normIdEspaco_(r.para) };
  }).filter(function (r) { return r.planta && r.de && r.para; });
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

/**
 * ID da aba Movimentos, que pode ter um espaço depois da "/": aceita variações de digitação
 * ("Totem 1 / painel 1", "TOTEM 1/PAINEL1", "GONDOLA 1/LADO A", "MEIO_A_2") → "TOTEM 1/PAINEL-1",
 * "GONDOLA 1/LADO-A", ".../MEIO-A-2". Nomes antigos dos lados da gôndola: Ponta 2 era o lado da
 * frente (A), Ponta 1 o de trás (B).
 */
function normIdEspaco_(v) {
  const id = normId_(v);
  const i = id.indexOf('/');
  if (i < 0) return id;
  const espaco = id.slice(i + 1).trim()
    .replace(/[\s_.\-]+/g, '-')
    .replace(/([A-Z])(\d)/g, '$1-$2')
    .replace(/^-|-$/g, '');
  return (id.slice(0, i).trim() + '/' + espaco).replace(/\/PONTA-2$/, '/LADO-A').replace(/\/PONTA-1$/, '/LADO-B');
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
