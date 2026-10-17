/* ===== visualizador/fonte/Visualizador.gs ===== */
/**
 * ============================================================================
 *  PLANO DE VAREJO · VISUALIZADOR — versão só de visualização (Apps Script)
 * ============================================================================
 *  Mostra as plantas de cada ciclo a partir de UMA planilha (abas "Movimentos",
 *  "Painéis" e, opcional, "Tipos de movimento"). A estratégia é montada direto na planilha; o app só lê.
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
  dados.planilhaUrl = ss.getUrl();
  dados.precisaConfigurar = false;
  return dados;
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
    TIPOS: 'Tipos de movimento',
    LAYOUT: 'Layout',
    COMENTARIOS: 'Comentários',
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
 * Senhas de acesso à validação da estratégia (botão "Validação"), uma por papel.
 * Provisórias: no futuro virão da planilha (troque em senhasDeAcesso_, Validacao.gs).
 */
const SENHAS_ACESSO = {
  VALIDADOR: '1234',
  CONSTRUTOR: '1234',
};

/**
 * Nome de cada planta (abas, título do slide e PNG). Na coluna "Planta" das
 * abas vale tanto o número (01) quanto o nome (ER P). Planta que não aparece
 * aqui é chamada de "PLANTA <número>".
 */
const NOMES_PLANTAS = { '01': 'ER P', '02': 'ER M', '03': 'ER G', '04': 'ER GG' };

/**
 * Quantas etiquetas a linha de um móvel de um espaço só mostra (as outras colunas
 * "Etiqueta N" são ignoradas). Tipos que não aparecem aqui mostram até
 * CONFIG.MAX_ETIQUETAS (pirâmide: até 4, empilhadas).
 * Balcão recepção: um espaço só (uma cor), com até 3 etiquetas empilhadas.
 * Gôndola, mesas, totem e móvel make não têm linha do móvel inteiro: cada espaço tem a
 * sua (veja ETIQUETAS_POR_BLOCO).
 */
const ETIQUETAS_POR_TIPO = { VITRINE_L: 3 };

/** Tipos de móvel que não levam cor nem etiqueta (móvel de atendimento): linhas deles na planilha são ignoradas. */
const TIPOS_SEM_ETIQUETA = ['CAIXA'];

/**
 * Quantas etiquetas a linha de um espaço mostra (GONDOLA 1/PONTA-A,
 * MESA DESTAQUE 1/FRENTE-2, TOTEM 1/PAINEL-3…). Tipos que não aparecem aqui
 * (painéis do totem, testeiras do móvel make) mostram só a Etiqueta 1. Blocos vizinhos com as
 * mesmas etiquetas (texto e cor) viram uma pilha só.
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
  FIXO: { descricao: 'Espaço fixo (sem mudança nos ciclos)', apelidos: ['ESPACOFIXO', 'CADEADO', '🔒', '◆', 'LOSANGO'] },
  EXPOSICAO: { descricao: 'Exposição, sem comunicação', apelidos: ['E', 'EXPOSICAOSEMCOMUNICACAO'] },
  NOVO: { descricao: 'Novidade', apelidos: ['NEW', 'NOVIDADE'] },
};

/**
 * Classificação dos movimentos (aba "Tipos de movimento"): aparece no Analytics (movimentos e
 * classificação em cada ER). A planilha também aceita outro texto (vira uma classificação própria).
 */
const CLASSIFICACOES = {
  LANCAMENTO: { nome: 'Lançamento', cor: '#0E7490', apelidos: ['LANCAMENTOS', 'LANC', 'LCTO', 'NOVIDADE', 'NEW'] },
  PROMOCAO: { nome: 'Promoção', cor: '#C2410C', apelidos: ['PROMO', 'PROMOCIONAL', 'PROMOCOES', 'OFERTA'] },
  LIQUIDACAO: { nome: 'Liquidação / outlet', cor: '#A16207', apelidos: ['LIQUIDA', 'LIQUIDACAOOUTLET', 'OUTLET', 'EXAUSTAO', 'QUEIMA'] },
  INSTITUCIONAL: { nome: 'Institucional / portfólio', cor: '#475569', apelidos: ['PORTFOLIO', 'INSTITUCIONALPORTFOLIO', 'PERMANENTE', 'REGULAR'] },
  OUTRO: { nome: 'Outro', cor: '#6B7280', apelidos: ['OUTROS'] },
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
  GONDOLA: 'Gôndola: ponta A, meio A, meio B e ponta B (o A virado para quem olha; cada meio pode ser dividido em dois), 4 níveis, até 4 etiquetas por bloco',
  FILA: 'Móvel de fila: bloco único retangular com 3 níveis',
  GONDOLA_PAREDE: 'Móvel de parede: estante encostada na parede, com prateleiras',
  CUBO: 'PDV móvel: cubo de vidro sobre rodapé',
  MESA: 'Mesa destaque: 2 frentes (nicho, lâmina do fundo e cartaz), cada uma com cor e até 4 etiquetas próprias, e o verso (atrás das lâminas)',
  MESA_3: 'Mesa destaque 3 frentes: 3 frentes (nicho, lâmina do fundo e cartaz), cada uma com cor e até 4 etiquetas próprias, e o verso (atrás das lâminas)',
  TOTEM: 'Totem: estrutura metálica com 3 painéis, cada um com cor e etiqueta próprias (Etiqueta 1–3 = painel 1, o de cima, 2 e 3)',
  PAINEL: 'Parede O.U.i: painel alto com moldura',
  EXPOSITOR_OUI: 'Totem O.U.i: expositor estreito com moldura, na altura da gôndola',
  ILHA_OUI: 'Ilha premium O.U.i: base com prateleiras e painel alto atrás, com faixas claras nas laterais',
  MAKE: 'Móvel make: estante de parede com prateleiras e 4 testeiras no alto (cada uma pode ter cor própria)',
  VITRINE_L: 'Balcão recepção: em "L", com os dois lados do mesmo tamanho; um espaço só, com uma cor e até 3 etiquetas',
  CAIXA: 'Móvel de atendimento (caixa): balcão com tela preta em cima',
  EXTRA: 'Item fora da planta (Cestinhas, Espaço da Beleza, Cavalete…)',
};

/** Tipos oferecidos no modo "Construir loja". */
const TIPOS_CONSTRUCAO = [
  'GONDOLA', 'PIRAMIDE', 'FILA', 'GONDOLA_PAREDE', 'TOTEM', 'CUBO', 'MESA', 'MESA_3', 'VITRINE_L', 'CAIXA', 'PAINEL', 'EXPOSITOR_OUI', 'ILHA_OUI', 'MAKE',
];

/**
 * Espaços (blocos) de um móvel, cada um com cor e etiqueta próprias na planilha:
 *  - gôndola: Ponta A, Meio A, Meio B e Ponta B (o "A" é sempre o lado virado para
 *    quem olha a planta; cada meio pode ser dividido em dois);
 *  - mesa destaque: Frente 1 e 2 (3 frentes: Frente 1, 2 e 3) e o Verso, atrás das lâminas
 *    (espaço de VM: vm = true);
 *  - totem: Painel 1 a 3 (o 1 é o de cima);
 *  - móvel make: Testeira 1 a 4.
 * Na planilha, cada espaço é endereçado como "<ID do móvel>/<espaço>", ex.:
 * GONDOLA 1/PONTA-A, GONDOLA 1/MEIO-A-2, MESA DESTAQUE 1/FRENTE-2, MESA DESTAQUE 1/VERSO.
 * Móvel com espaços é preenchido só espaço por espaço: a linha só com o ID do móvel
 * é ignorada (espaço sem linha fica branco).
 * (A página tem uma cópia desta regra em Render.espacos.)
 * @param {{tipo: string, dividido: string}} m  dividido = '', 'A', 'B' ou 'AB'
 * @return {Array<{id: string, nome: string, vm?: boolean}>}
 */
function espacosDoMovel_(m) {
  const numerados = function (prefixo, nome, n) {
    const lista = [];
    for (let i = 1; i <= n; i++) lista.push({ id: prefixo + '-' + i, nome: nome + ' ' + i });
    return lista;
  };
  if (!m) return [];
  if (m.tipo === 'MAKE') return numerados('TESTEIRA', 'Testeira', 4);
  if (m.tipo === 'MESA' || m.tipo === 'MESA_3') {
    return numerados('FRENTE', 'Frente', m.tipo === 'MESA' ? 2 : 3).concat([{ id: 'VERSO', nome: 'Verso', vm: true }]);
  }
  if (m.tipo === 'TOTEM') return numerados('PAINEL', 'Painel', 3);
  if (m.tipo !== 'GONDOLA') return [];
  const div = String(m.dividido || '').toUpperCase();
  const lista = [{ id: 'PONTA-A', nome: 'Ponta A' }];
  ['A', 'B'].forEach(function (lado) {
    if (div.indexOf(lado) >= 0) {
      lista.push({ id: 'MEIO-' + lado + '-1', nome: 'Meio ' + lado + ' (metade 1)' });
      lista.push({ id: 'MEIO-' + lado + '-2', nome: 'Meio ' + lado + ' (metade 2)' });
    } else {
      lista.push({ id: 'MEIO-' + lado, nome: 'Meio ' + lado });
    }
  });
  lista.push({ id: 'PONTA-B', nome: 'Ponta B' });
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

/** Aba "Tipos de movimento": classificação e GMV esperado de cada movimento (texto da etiqueta) no ciclo. */
function colunasTipos_() {
  return [
    { chave: 'ciclo', titulo: 'Ciclo', obrigatoria: true, texto: true },
    { chave: 'etiqueta', titulo: 'Movimento (etiqueta)', obrigatoria: true, texto: true, apelidos: ['Movimento', 'Etiqueta', 'Texto da etiqueta'] },
    { chave: 'classificacao', titulo: 'Classificação', texto: true, apelidos: ['Tipo', 'Tipo de movimento'] },
    { chave: 'gmv', titulo: 'GMV esperado (R$)', apelidos: ['GMV esperado', 'GMV', 'GMV (R$)'] },
    { chave: 'observacao', titulo: 'Observação', texto: true, apelidos: ['Obs'] },
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
    { chave: 'ajusteEspacos', titulo: 'Ajuste Etiquetas por espaço (px)', texto: true, apelidos: ['Ajuste por espaço', 'Ajuste Espaços'] },
    { chave: 'tamanhoEtiquetas', titulo: 'Tamanho das etiquetas (%)', apelidos: ['Tamanho etiquetas', 'Tamanho das etiquetas'] },
    { chave: 'slide', titulo: 'Largura do slide (px)', apelidos: ['Largura do slide', 'Slide'] },
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
 *  Loja: [largura, profundidade, altura da parede, (tamanho das etiquetas em %, padrão 100),
 *         (largura do slide em px: com ela, os ajustes de etiqueta são posições fixas — veja abaixo)].
 *  Posições fixas: ajuste X/Y = canto de baixo à esquerda da etiqueta mais baixa da pilha, em px do
 *  slide; a pilha cresce para cima. Valem em qualquer ciclo (o slide fica com a largura salva).
 *  Móvel: [ID, descrição, tipo, x, y, largura, profundidade, altura, (elevação), (ajuste etiqueta X), (ajuste Y),
 *          (meios divididos da gôndola: '', 'A', 'B' ou 'AB'), (giro em graus: 0, 90, 180 ou 270),
 *          (ajuste das pilhas de etiquetas por espaço: { 'PONTA-A': {x, y} })]
 *  O botão "Baixar código da loja" (modo Construir loja) gera este mesmo formato; o botão "Baixar
 *  posições" (modo ajuste das etiquetas) gera os ajustes de etiqueta (índices 9, 10 e 13) e o tamanho.
 */

/**
 * Versão do modelo base de cada planta. Ao mudar o modelo de uma planta aqui,
 * aumente o número dela: na próxima abertura, essa planta (layout + linhas do
 * ciclo de exemplo) é atualizada para o modelo novo; as demais ficam intactas.
 * Plantas que não aparecem aqui estão na versão 1.
 */
const VERSAO_MODELO_PLANTAS = { '01': 13, '02': 12, '03': 9, '04': 11 };

/**
 * Versão do ciclo de exemplo inteiro (Movimentos + Painéis, todas as plantas e TODAS).
 * Ao aumentar, todas as linhas do "Ciclo exemplo" são trocadas pelas atuais na próxima
 * abertura (os outros ciclos não mudam).
 */
const VERSAO_EXEMPLO = 14;

const LAYOUT_PADRAO = {
  // PLANTA 01 (ER P): layout montado no modo "Construir loja"; etiquetas em posições fixas (as do Ciclo exemplo cheio, valem em qualquer ciclo).
  '01': {
    loja: [12, 10, 4.4, 100, 1920], // posições fixas das etiquetas (slide de 1920 px)
    moveis: [
      ['MOVEL DE PAREDE 1', 'Perf. Fem. BOT', 'GONDOLA_PAREDE', 0, 0, 3, 1.1, 3.2, 0, 910, 237, '', 0],
      ['GONDOLA 1', 'Gôndola 1', 'GONDOLA', 2.5, 2, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 707, y: 559 }, 'PONTA-B': { x: 947, y: 414 }, 'MEIO-A': { x: 861, y: 530 }, 'MEIO-B': { x: 788, y: 452 } }],
      ['PIRAMIDE 1', 'Pirâmide 1', 'PIRAMIDE', 6, 2.5, 1.02, 1.02, 1.94, 0, 1036, 573, '', 0],
      ['PIRAMIDE 2', 'Pirâmide 2', 'PIRAMIDE', 6, 4.5, 1.02, 1.02, 1.94, 0, 921, 630, '', 0],
      ['MESA DESTAQUE 1', 'Mesa destaque 1', 'MESA', 8.5, 3.5, 2.6, 1.4, 2.6, 0, 0, 0, '', 0, { 'FRENTE-1': { x: 1156, y: 656 }, 'FRENTE-2': { x: 1213, y: 749 } }],
      ['PDV MOVEL 1', 'PDV móvel 1', 'CUBO', 5.5, 7, 1.3, 1.3, 1.44, 0, 815, 742, '', 0],
      ['BALCAO RECEPCAO 1', 'Balcão recepção 1', 'VITRINE_L', 9.5, 6.5, 2.4, 2.4, 1.28, 0, 858, 898, '', 90],
      ['MOVEL DE FILA 2', 'Móvel de fila 2', 'FILA', 2, 9.5, 1.5, 0.4, 1.46, 0, 455, 651, '', 0],
      ['MOVEL DE FILA 1', 'Móvel de fila 1', 'FILA', 2, 8, 1.5, 0.4, 1.46, 0, 577, 596, '', 0],
      ['TOTEM 1', 'Totem 1', 'TOTEM', 6, 8.5, 0.35, 1.5, 3.4, 0, 0, 0, '', 0, { 'PAINEL-1': { x: 642, y: 658 }, 'PAINEL-2': { x: 644, y: 709 }, 'PAINEL-3': { x: 644, y: 760 } }],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', 0, 1.5, 0.6, 6, 3.2, 0, 0, 0, '', 0, { 'TESTEIRA-1': { x: 773, y: 275 }, 'TESTEIRA-2': { x: 655, y: 320 }, 'TESTEIRA-3': { x: 585, y: 364 }, 'TESTEIRA-4': { x: 522, y: 409 } }],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 8, 1.2, 1.8, 1.7],
      ['MOVEL DE PAREDE 2', 'Perf. Masc. BOT', 'GONDOLA_PAREDE', 3, 0, 3, 1.1, 3.2, 0, 1066, 334, '', 0],
      ['MOVEL DE PAREDE 3', 'Perf. Fem. EUD', 'GONDOLA_PAREDE', 6, 0, 3, 1.1, 3.2, 0, 1224, 418, '', 0],
      ['MOVEL DE PAREDE 4', 'CBEM/NSPA', 'GONDOLA_PAREDE', 9, 0, 3, 1.1, 3.2, 0, 1335, 522, '', 0],
    ],
  },
  // PLANTA 02 (ER M): layout montado no modo "Construir loja"; etiquetas em posições fixas (as do Ciclo exemplo cheio, valem em qualquer ciclo).
  '02': {
    loja: [16, 14, 4.4, 100, 2208], // posições fixas das etiquetas (slide de 2208 px)
    moveis: [
      ['GONDOLA 1', 'Gôndola 1', 'GONDOLA', 3.5, 3, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 839, y: 588 }, 'PONTA-B': { x: 1090, y: 441 }, 'MEIO-A': { x: 1005, y: 553 }, 'MEIO-B': { x: 910, y: 470 } }],
      ['GONDOLA 2', 'Gôndola 2', 'GONDOLA', 7, 3, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1031, y: 680 }, 'PONTA-B': { x: 1267, y: 542 }, 'MEIO-A': { x: 1201, y: 648 }, 'MEIO-B': { x: 1121, y: 576 } }],
      ['PIRAMIDE 1', 'Pirâmide 1', 'PIRAMIDE', 10, 3.5, 1.02, 1.02, 1.94, 0, 1355, 649, '', 0],
      ['PIRAMIDE 2', 'Pirâmide 2', 'PIRAMIDE', 12, 3.5, 1.02, 1.02, 1.94, 0, 1472, 707, '', 0],
      ['MESA DESTAQUE 1', 'Mesa destaque 1', 'MESA', 11.5, 7.5, 2.6, 1.4, 2.6, 0, 0, 0, '', 0, { 'FRENTE-1': { x: 1149, y: 811 }, 'FRENTE-2': { x: 1255, y: 904 } }],
      ['MOVEL DE FILA 1', 'Móvel de fila 1', 'FILA', 2.5, 10.5, 1.5, 0.4, 1.46, 0, 666, 652, '', 0],
      ['MOVEL DE FILA 3', 'Móvel de fila 3', 'FILA', 2.5, 12.5, 1.5, 0.4, 1.46, 0, 464, 795, '', 0],
      ['PDV MOVEL 1', 'PDV móvel 1', 'CUBO', 8, 11, 1.3, 1.3, 1.44, 0, 917, 900, '', 0],
      ['BALCAO RECEPCAO 1', 'Balcão recepção 1', 'VITRINE_L', 13.5, 11, 2.4, 2.4, 1.28, 0, 963, 1089, '', 90],
      ['TOTEM 1', 'Totem 1', 'TOTEM', 8.5, 12.5, 0.35, 1.5, 3.4, 0, 0, 0, '', 0, { 'PAINEL-1': { x: 717, y: 807 }, 'PAINEL-2': { x: 724, y: 852 }, 'PAINEL-3': { x: 716, y: 894 } }],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['MOVEL DE PAREDE 1', 'Perf. Fem. BOT', 'GONDOLA_PAREDE', 0, 0, 3, 1.1, 3.2, 0, 1035, 267, '', 0],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', 0, 2.5, 1.4, 6, 3.2, 0, 0, 0, '', 0, { 'TESTEIRA-1': { x: 878, y: 255 }, 'TESTEIRA-2': { x: 779, y: 309 }, 'TESTEIRA-3': { x: 700, y: 363 }, 'TESTEIRA-4': { x: 641, y: 416 } }],
      ['MOVEL DE ATENDIMENTO 2', 'Móvel de atendimento 2', 'CAIXA', 0, 11.5, 1.2, 1.8, 1.7],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 9.5, 1.2, 1.8, 1.7],
      ['MOVEL DE FILA 4', 'Móvel de fila 4', 'FILA', 4, 12.5, 1.5, 0.4, 1.46, 0, 565, 860, '', 0],
      ['MOVEL DE FILA 2', 'Móvel de fila 2', 'FILA', 4, 10.5, 1.5, 0.4, 1.46, 0, 771, 715, '', 0],
      ['PAREDE OUI 1', 'Parede O.U.i 1', 'PAINEL', 12.5, 0, 3.6, 0.9, 5, 0, 1642, 584, '', 0],
      ['TOTEM OUI 1', 'Totem O.U.i 1', 'EXPOSITOR_OUI', 8.5, 9.4, 0.8, 0.8, 1.94, 0, 989, 843, '', 0],
      ['PIRAMIDE 3', 'Pirâmide 3', 'PIRAMIDE', 14, 3.5, 1.02, 1.02, 1.94, 0, 1587, 791, '', 0],
      ['MOVEL DE PAREDE 2', 'Perf. Masc. BOT', 'GONDOLA_PAREDE', 3, 0, 3, 1.1, 3.2, 0, 1175, 356, '', 0],
      ['MOVEL DE PAREDE 3', 'Perf. Fem. EUD', 'GONDOLA_PAREDE', 6, 0, 3, 1.1, 3.2, 0, 1316, 435, '', 0],
      ['MOVEL DE PAREDE 4', 'CBEM/NSPA', 'GONDOLA_PAREDE', 9, 0, 3, 1.1, 3.2, 0, 1438, 519, '', 0],
    ],
  },
  // PLANTA 03 (ER G): layout montado no modo "Construir loja"; etiquetas em posições fixas (as do Ciclo exemplo cheio, valem em qualquer ciclo).
  '03': {
    loja: [14, 16, 4.6, 100, 2784], // posições fixas das etiquetas (slide de 2784 px)
    moveis: [
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['PIRAMIDE 1', 'Pirâmide 1', 'PIRAMIDE', 12.5, 2.5, 1.02, 1.02, 1.94, 0, 2092, 992, '', 0],
      ['GONDOLA 1', 'Gôndola 1', 'GONDOLA', 3, 2.5, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1230, y: 721 }, 'PONTA-B': { x: 1497, y: 520 }, 'MEIO-A': { x: 1455, y: 611 }, 'MEIO-B': { x: 1225, y: 561 } }],
      ['PDV MOVEL 1', 'PDV móvel 1', 'CUBO', 6.5, 12, 1.3, 1.3, 1.44, 0, 1101, 1084, '', 0],
      ['BALCAO RECEPCAO 1', 'Balcão recepção 1', 'VITRINE_L', 11.5, 12.5, 2.4, 2.4, 1.28, 0, 1166, 1371, '', 90],
      ['MOVEL DE ATENDIMENTO 3', 'Móvel de atendimento 3', 'CAIXA', 0, 13, 1.2, 1.8, 1.7],
      ['PAREDE OUI 1', 'Parede O.U.i 1', 'PAINEL', 11, 0.5, 3, 0.8, 4.5, 0, 2070, 733, '', 0],
      ['MOVEL DE FILA 6', 'Móvel de fila 6', 'FILA', 3.5, 13, 1.5, 0.4, 1.46, 0, 846, 974, '', 0],
      ['TOTEM OUI 1', 'Totem O.U.i 1', 'EXPOSITOR_OUI', 7, 10.4, 0.8, 0.8, 1.94, 0, 1208, 1042, '', 0],
      ['MOVEL DE PAREDE 1', 'Perf. Fem. BOT', 'GONDOLA_PAREDE', 0.5, 0, 2.5, 1.1, 3.2, 0, 1432, 353, '', 0],
      ['GONDOLA 2', 'Gôndola 2', 'GONDOLA', 6, 2.5, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1364, y: 812 }, 'PONTA-B': { x: 1698, y: 619 }, 'MEIO-A': { x: 1646, y: 726 }, 'MEIO-B': { x: 1424, y: 694 } }],
      ['GONDOLA 3', 'Gôndola 3', 'GONDOLA', 9, 2.5, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1561, y: 925 }, 'PONTA-B': { x: 1871, y: 747 }, 'MEIO-A': { x: 1798, y: 886 }, 'MEIO-B': { x: 1658, y: 794 } }],
      ['PIRAMIDE 2', 'Pirâmide 2', 'PIRAMIDE', 12.5, 4.5, 1.02, 1.02, 1.94, 0, 1961, 1067, '', 0],
      ['PIRAMIDE 3', 'Pirâmide 3', 'PIRAMIDE', 12.5, 6.5, 1.02, 1.02, 1.94, 0, 1835, 1146, '', 0],
      ['MOVEL DE ATENDIMENTO 2', 'Móvel de atendimento 2', 'CAIXA', 0, 11, 1.2, 1.8, 1.7],
      ['MOVEL DE FILA 1', 'Móvel de fila 1', 'FILA', 2, 9, 1.5, 0.4, 1.46, 0, 958, 764, '', 0],
      ['MOVEL DE FILA 7', 'Móvel de fila 7', 'FILA', 2, 15, 1.5, 0.4, 1.46, 0, 619, 977, '', 0],
      ['MOVEL DE FILA 3', 'Móvel de fila 3', 'FILA', 2, 11, 1.5, 0.4, 1.46, 0, 836, 847, '', 0],
      ['MOVEL DE FILA 5', 'Móvel de fila 5', 'FILA', 2, 13, 1.5, 0.4, 1.46, 0, 721, 905, '', 0],
      ['MOVEL DE FILA 4', 'Móvel de fila 4', 'FILA', 3.5, 11, 1.5, 0.4, 1.46, 0, 893, 916, '', 0],
      ['MOVEL DE FILA 8', 'Móvel de fila 8', 'FILA', 3.5, 15, 1.5, 0.4, 1.46, 0, 717, 1050, '', 0],
      ['MOVEL DE FILA 2', 'Móvel de fila 2', 'FILA', 3.5, 9, 1.5, 0.4, 1.46, 0, 1089, 841, '', 0],
      ['MESA DESTAQUE 3 FRENTES 1', 'Mesa destaque 3 frentes 1', 'MESA_3', 9, 9, 3.9, 1.4, 2.6, 0, 0, 0, '', 0, { 'FRENTE-1': { x: 1346, y: 967 }, 'FRENTE-2': { x: 1435, y: 1040 }, 'FRENTE-3': { x: 1519, y: 1130 } }],
      ['TOTEM 1', 'Totem 1', 'TOTEM', 7.5, 14, 0.35, 1.5, 3.4, 0, 0, 0, '', 0, { 'PAINEL-1': { x: 903, y: 1048 }, 'PAINEL-2': { x: 901, y: 1098 }, 'PAINEL-3': { x: 899, y: 1146 } }],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', -0.5, 1.5, 1.4, 6, 3.2, 0, 0, 0, '', 0, { 'TESTEIRA-1': { x: 1268, y: 309 }, 'TESTEIRA-2': { x: 1135, y: 362 }, 'TESTEIRA-3': { x: 1050, y: 415 }, 'TESTEIRA-4': { x: 971, y: 469 } }],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 9, 1.2, 1.8, 1.7],
      ['MOVEL DE PAREDE 2', 'Perf. Masc. BOT', 'GONDOLA_PAREDE', 3, 0, 2.5, 1.1, 3.2, 0, 1610, 442, '', 0],
      ['MOVEL DE PAREDE 3', 'Perf. Fem. EUD', 'GONDOLA_PAREDE', 5.5, 0, 2.5, 1.1, 3.2, 0, 1781, 543, '', 0],
      ['MOVEL DE PAREDE 4', 'CBEM/NSPA', 'GONDOLA_PAREDE', 8, 0, 2.5, 1.1, 3.2, 0, 1921, 619, '', 0],
    ],
  },
  // PLANTA 04 (ER GG): layout montado no modo "Construir loja"; etiquetas em posições fixas (as do Ciclo exemplo cheio, valem em qualquer ciclo).
  '04': {
    loja: [17, 20, 4.6, 100, 3072], // posições fixas das etiquetas (slide de 3072 px)
    moveis: [
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['PIRAMIDE 1', 'Pirâmide 1', 'PIRAMIDE', 14.5, 2.5, 1.02, 1.02, 1.94, 0, 2352, 1006, '', 0],
      ['GONDOLA 1', 'Gôndola 1', 'GONDOLA', 3.5, 2.5, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1454, y: 695 }, 'PONTA-B': { x: 1699, y: 514 }, 'MEIO-A': { x: 1585, y: 648 }, 'MEIO-B': { x: 1435, y: 552 } }],
      ['PDV MOVEL 1', 'PDV móvel 1', 'CUBO', 6, 17, 1.3, 1.3, 1.44, 0, 985, 1151, '', 0],
      ['BALCAO RECEPCAO 1', 'Balcão recepção 1', 'VITRINE_L', 14.5, 17.5, 2.4, 2.4, 1.28, 0, 1222, 1566, '', 0],
      ['MOVEL DE ATENDIMENTO 3', 'Móvel de atendimento 3', 'CAIXA', 0, 17, 1.2, 1.8, 1.7],
      ['MOVEL DE FILA 6', 'Móvel de fila 6', 'FILA', 3, 17, 1.5, 0.4, 1.46, 0, 791, 1054, '', 0],
      ['TOTEM OUI 1', 'Totem O.U.i 1', 'EXPOSITOR_OUI', 6.5, 16, 0.8, 0.8, 1.94, 0, 1029, 1088, '', 0],
      ['MOVEL DE PAREDE 1', 'Perf. Fem. BOT', 'GONDOLA_PAREDE', 0, -0.5, 4, 1.1, 3.2, 0, 1643, 329, '', 0],
      ['MOVEL DE PAREDE 2', 'Perf. Masc. BOT', 'GONDOLA_PAREDE', 4, -0.5, 4, 1.1, 3.2, 0, 1876, 464, '', 0],
      ['GONDOLA 2', 'Gôndola 2', 'GONDOLA', 7, 2.5, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1642, y: 817 }, 'PONTA-B': { x: 1914, y: 642 }, 'MEIO-A': { x: 1799, y: 791 }, 'MEIO-B': { x: 1688, y: 706 } }],
      ['GONDOLA 3', 'Gôndola 3', 'GONDOLA', 10.5, 2.5, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1847, y: 927 }, 'PONTA-B': { x: 2115, y: 760 }, 'MEIO-A': { x: 2042, y: 873 }, 'MEIO-B': { x: 1927, y: 796 } }],
      ['GONDOLA 4', 'Gôndola 4', 'GONDOLA', 3.5, 8, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1025, y: 824 }, 'PONTA-B': { x: 1344, y: 694 }, 'MEIO-A': { x: 1282, y: 824 }, 'MEIO-B': { x: 1157, y: 753 } }],
      ['GONDOLA 5', 'Gôndola 5', 'GONDOLA', 7, 8, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1307, y: 999 }, 'MEIO-A': { x: 1484, y: 988 }, 'MEIO-B': { x: 1368, y: 911 }, 'PONTA-B': { x: 1524, y: 835 } }],
      ['GONDOLA 6', 'Gôndola 6', 'GONDOLA', 10.5, 8, 1.6, 4, 1.94, 0, 0, 0, '', 0, { 'PONTA-A': { x: 1539, y: 1114 }, 'MEIO-A': { x: 1715, y: 1089 }, 'MEIO-B': { x: 1622, y: 1001 }, 'PONTA-B': { x: 1743, y: 953 } }],
      ['PIRAMIDE 2', 'Pirâmide 2', 'PIRAMIDE', 14.5, 4.5, 1.02, 1.02, 1.94, 0, 2229, 1079, '', 0],
      ['PIRAMIDE 3', 'Pirâmide 3', 'PIRAMIDE', 14.5, 6.5, 1.02, 1.02, 1.94, 0, 2096, 1155, '', 0],
      ['PIRAMIDE 4', 'Pirâmide 4', 'PIRAMIDE', 14.5, 8.5, 1.02, 1.02, 1.94, 0, 1981, 1231, '', 0],
      ['PIRAMIDE 5', 'Pirâmide 5', 'PIRAMIDE', 14.5, 10.5, 1.02, 1.02, 1.94, 0, 1866, 1297, '', 0],
      ['MOVEL DE ATENDIMENTO 2', 'Móvel de atendimento 2', 'CAIXA', 0, 15, 1.2, 1.8, 1.7],
      ['MOVEL DE FILA 7', 'Móvel de fila 7', 'FILA', 1.5, 19, 1.5, 0.4, 1.46, 0, 568, 1062, '', 0],
      ['MOVEL DE FILA 5', 'Móvel de fila 5', 'FILA', 1.5, 17, 1.5, 0.4, 1.46, 0, 679, 994, '', 0],
      ['MOVEL DE FILA 2', 'Móvel de fila 2', 'FILA', 3, 13, 1.5, 0.4, 1.46, 0, 957, 906, '', 0],
      ['MOVEL DE FILA 3', 'Móvel de fila 3', 'FILA', 1.5, 15, 1.5, 0.4, 1.46, 0, 820, 932, '', 0],
      ['MOVEL DE FILA 4', 'Móvel de fila 4', 'FILA', 3, 15, 1.5, 0.4, 1.46, 0, 914, 988, '', 0],
      ['MOVEL DE FILA 8', 'Móvel de fila 8', 'FILA', 3, 19, 1.5, 0.4, 1.46, 0, 691, 1119, '', 0],
      ['MESA DESTAQUE 3 FRENTES 1', 'Mesa destaque 3 frentes 1', 'MESA_3', 8.5, 14.5, 3.9, 1.4, 2.6, 0, 0, 0, '', 0, { 'FRENTE-1': { x: 1130, y: 1169 }, 'FRENTE-2': { x: 1220, y: 1242 }, 'FRENTE-3': { x: 1311, y: 1332 } }],
      ['TOTEM 1', 'Totem 1', 'TOTEM', 7, 18.5, 0.35, 1.5, 3.4, 0, 0, 0, '', 0, { 'PAINEL-1': { x: 806, y: 1137 }, 'PAINEL-2': { x: 806, y: 1179 }, 'PAINEL-3': { x: 804, y: 1225 } }],
      ['MOVEL DE PAREDE 3', 'Perf. Fem. EUD', 'GONDOLA_PAREDE', 8, -0.5, 4, 1.1, 3.2, 0, 2113, 598, '', 0],
      ['MOVEL DE FILA 1', 'Móvel de fila 1', 'FILA', 1.5, 13, 1.5, 0.4, 1.46, 0, 877, 847, '', 0],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 13, 1.2, 1.8, 1.7],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', 0, 3.5, 1.4, 6, 3.2, 0, 0, 0, '', 0, { 'TESTEIRA-1': { x: 1384, y: 381 }, 'TESTEIRA-2': { x: 1244, y: 432 }, 'TESTEIRA-3': { x: 1163, y: 483 }, 'TESTEIRA-4': { x: 1075, y: 533 } }],
      ['MOVEL DE PAREDE 4', 'CBEM/NSPA', 'GONDOLA_PAREDE', 12, -0.5, 4, 1.1, 3.2, 0, 2308, 732, '', 0],
      ['ILHA PREMIUM OUI 1', 'Ilha premium O.U.i 1', 'ILHA_OUI', 13.5, 14, 3, 1.6, 3, 0, 1647, 1445, '', 0],
    ],
  },
};

/* --------------------------------------------------------------------------
 *  CICLO DE EXEMPLO (transcrito das telas de referência)
 *  Móvel: ID → [marca do móvel, [[etiqueta, marca da etiqueta], ...], símbolo]
 *  Cascata: o que é definido numa planta vale também para as seguintes
 *  (ER P → ER M → ER G → ER GG), então cada móvel aparece só na primeira planta
 *  que o tem. Uma linha da própria planta tem prioridade; "TODAS" vale para todas.
 *  Gôndola, mesas, totem e móvel make são preenchidos espaço por espaço
 *  (GONDOLA 1/PONTA-A, MESA DESTAQUE 1/FRENTE-1, TOTEM 1/PAINEL-1…), sem linha do móvel inteiro.
 * ------------------------------------------------------------------------ */

const EXEMPLO_CICLO = 'Ciclo exemplo';

const EXEMPLO_MOVIMENTOS = {
  TODAS: {
    'EXTRA-CESTINHAS': ['NEUTRO', [['LÇTO EGEO', 'BOT+QDB']]],
    'EXTRA-BELEZA': ['NEUTRO', [['BOTIPROMO MAKE B.', 'BOT'], ['LIQUIDA MAKE', 'QDB']]],
    'EXTRA-CAVALETE': ['NEUTRO', [['SIÀGE ULTIMATE', 'EUD']]],
  },
  '01': {
    // Móveis de parede: as etiquetas são o que vai na placa de comunicação (espaço destaque).
    'MOVEL DE PAREDE 1': ['NEUTRO', [['PERF FEM', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'MOVEL DE PAREDE 2': ['NEUTRO', [['PERF MASC', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'MOVEL DE PAREDE 3': ['NEUTRO', [['PERF FEM', 'EUD'], ['MULTI PROMO', 'MULTI']]],
    'MOVEL DE PAREDE 4': ['NEUTRO', [['CUIDADOS (CBEM/NSPA)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'GONDOLA 1/PONTA-A': ['QDB', [['LIQUIDA QDB', 'QDB'], ['JUICY MOOD', 'QDB']]],
    'GONDOLA 1/MEIO-A': ['BOT', [['BOTIK', 'BOT']], 'FIXO'],
    'GONDOLA 1/MEIO-B': ['BOT', [['UOMINI HERO', 'BOT']], 'FIXO'],
    'GONDOLA 1/PONTA-B': ['BOT', [['BOTI PROMO', 'BOT']], 'FIXO'],
    'PIRAMIDE 1': ['EUD', [['MULTI PROMO', 'MULTI']]],
    'PIRAMIDE 2': ['BOT', [['PRINCIPAIS OPORTUNIDADES', 'BOT'], ['BOTIPROMO', 'BOT']]],
    'MESA DESTAQUE 1/FRENTE-1': ['BOT', [['UOMINI GLORIFICADO', 'BOT']]],
    'MESA DESTAQUE 1/FRENTE-2': ['EUD', [['SIÀGE GLORIFICADO', 'EUD']]],
    'MESA DESTAQUE 1/VERSO': ['BOT', [['LÇTO UOMINI', 'BOT']]],
    'PDV MOVEL 1': ['EUD', [['SIÀGE ULTIMATE', 'EUD']]],
    'BALCAO RECEPCAO 1': ['BOT', [['LÇTO EGEO', 'BOT+QDB'], ['JUICY MOOD', 'QDB'], ['SIÀGE ULTIMATE', 'EUD']]],
    'MOVEL DE FILA 1': ['EUD', [['OUTLET EUD', 'EUD']]],
    'MOVEL DE FILA 2': ['BOT', [['BOTIPROMO', 'BOT']]],
    'TOTEM 1/PAINEL-1': ['BOT', [['LÇTO UOMINI', 'BOT']]],
    'TOTEM 1/PAINEL-2': ['BOT', [['BOTIPROMO', 'BOT']]],
    'TOTEM 1/PAINEL-3': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'MOVEL MAKE 1/TESTEIRA-1': ['#1F1F1F'],
    'MOVEL MAKE 1/TESTEIRA-2': ['BOT', [['BOTIPROMO MAKE B.', 'BOT']]],
    'MOVEL MAKE 1/TESTEIRA-3': ['BOT', [['BOTIPROMO MAKE B.', 'BOT']]],
    'MOVEL MAKE 1/TESTEIRA-4': ['EUD'],
  },
  '02': {
    'GONDOLA 2/PONTA-A': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GONDOLA 2/MEIO-A': ['EUD', [['PERFUMARIA', 'EUD']]],
    'GONDOLA 2/MEIO-A-2': ['BOT', [['BOTI PROMO', 'BOT']]],
    'GONDOLA 2/MEIO-B': ['EUD', [['CUIDADOS', 'EUD']]],
    'GONDOLA 2/PONTA-B': ['EUD', [['OUTLET EUD', 'EUD']]],
    'PIRAMIDE 3': ['EUD', [['MULTI PROMO', 'MULTI']]],
    'MOVEL DE FILA 3': ['BOT', [['BOTIPROMO', 'BOT']]],
    'MOVEL DE FILA 4': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'PAREDE OUI 1': ['OUI', [['MON AMIE + LOÇÃO', 'OUI']], 'EXPOSICAO'],
    'TOTEM OUI 1': ['OUI', [['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
  },
  '03': {
    // Ponta A e meio A iguais à ponta B e ao meio B da gôndola 2 da ER M.
    'GONDOLA 3/PONTA-A': ['EUD', [['OUTLET EUD', 'EUD']]],
    'GONDOLA 3/MEIO-A': ['EUD', [['CUIDADOS', 'EUD']]],
    'GONDOLA 3/MEIO-B': ['MULTI', [['+PEC REGIONAL', 'MULTI']]],
    'GONDOLA 3/PONTA-B': ['MULTI', []],
    'MOVEL DE FILA 6': ['BOT', [['BOTIPROMO', 'BOT']]],
    'MOVEL DE FILA 8': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'MESA DESTAQUE 3 FRENTES 1/FRENTE-1': ['BOT', [['UOMINI GLORIFICADO', 'BOT']]],
    'MESA DESTAQUE 3 FRENTES 1/FRENTE-2': ['MULTI', [['VM PERMANENTE MULTI PROMO', 'MULTI']]],
    'MESA DESTAQUE 3 FRENTES 1/FRENTE-3': ['EUD', [['SIÀGE GLORIFICADO', 'EUD']]],
    'MESA DESTAQUE 3 FRENTES 1/VERSO': ['EUD', [['SIÀGE ULTIMATE', 'EUD']]],
  },
  '04': {
    'PIRAMIDE 4': ['MULTI', [['ISCAS EXAUSTÃO', 'EUD']]],
    'PIRAMIDE 5': ['BOT', [['ISCAS EXAUSTÃO', 'BOT']]],
    'GONDOLA 4/PONTA-A': ['OUI', [['EXAUSTÃO OUI', 'OUI']]],
    'GONDOLA 4/MEIO-A': ['OUI', []],
    'GONDOLA 4/MEIO-B': ['OUI', []],
    'GONDOLA 4/PONTA-B': ['OUI', []],
    'GONDOLA 5/PONTA-A': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GONDOLA 5/MEIO-A': ['QDB'],
    'GONDOLA 5/MEIO-B': ['QDB'],
    'GONDOLA 5/PONTA-B': ['QDB'],
    'GONDOLA 6/PONTA-A': ['EUD', [['EXAUSTÃO EUD', 'EUD']]],
    'GONDOLA 6/MEIO-A': ['EUD', []],
    'GONDOLA 6/MEIO-B': ['EUD', []],
    'GONDOLA 6/PONTA-B': ['EUD', []],
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

/**
 * Tipos de movimento do ciclo de exemplo: [movimento (texto da etiqueta), classificação, GMV esperado (R$)].
 * Os valores de GMV são só ilustrativos.
 */
const EXEMPLO_TIPOS = [
  ['LÇTO EGEO', 'LANCAMENTO', 1800000],
  ['LÇTO UOMINI', 'LANCAMENTO', 950000],
  ['JUICY MOOD', 'LANCAMENTO', 620000],
  ['SIÀGE ULTIMATE', 'LANCAMENTO', 780000],
  ['UOMINI GLORIFICADO', 'LANCAMENTO', 540000],
  ['SIÀGE GLORIFICADO', 'LANCAMENTO', 480000],
  ['MON AMIE + LOÇÃO', 'LANCAMENTO', 260000],
  ['BOTIPROMO', 'PROMOCAO', 2400000],
  ['BOTI PROMO', 'PROMOCAO', 1200000],
  ['BOTIPROMO MAKE B.', 'PROMOCAO', 430000],
  ['MULTI PROMO', 'PROMOCAO', 1500000],
  ['PRINCIPAIS OPORTUNIDADES', 'PROMOCAO', 700000],
  ['LIQUIDA QDB', 'LIQUIDACAO', 900000],
  ['LIQUIDA MAKE', 'LIQUIDACAO', 210000],
  ['OUTLET EUD', 'LIQUIDACAO', 1100000],
  ['ISCAS EXAUSTÃO', 'LIQUIDACAO', 380000],
  ['BOTIK', 'INSTITUCIONAL', 650000],
  ['UOMINI HERO', 'INSTITUCIONAL', 520000],
  ['PERFUMARIA', 'INSTITUCIONAL', 870000],
  ['CUIDADOS', 'INSTITUCIONAL', 610000],
  ['+PEC REGIONAL', 'OUTRO', 150000],
];

/* --------------------------------------------------------------------------
 *  CICLO DE EXEMPLO CHEIO: todos os móveis de todas as plantas preenchidos, para
 *  ver a planta com o máximo de etiquetas (e posicioná-las no modo ajuste).
 *  Etiquetas por móvel: gôndola (cada espaço), pirâmide, móvel de fila e PDV móvel: 2;
 *  móvel de parede: 3; totem: 1 por painel; mesa destaque: 2 por frente; O.U.i: 3;
 *  balcão recepção: 3; móvel make: 1 por testeira; itens fora da planta: 1 (móvel de atendimento não leva etiqueta).
 * ------------------------------------------------------------------------ */

const EXEMPLO_CICLO_CHEIO = 'Ciclo exemplo cheio';

const EXEMPLO_CHEIO = {
  // Pares que se revezam nas gôndolas, pirâmides, móveis de fila e PDV móvel.
  pares: [
    [['BOTIPROMO', 'BOT'], ['LÇTO EGEO', 'BOT']],
    [['OUTLET EUD', 'EUD'], ['SIÀGE ULTIMATE', 'EUD']],
    [['LIQUIDA QDB', 'QDB'], ['JUICY MOOD', 'QDB']],
    [['MULTI PROMO', 'MULTI'], ['PRINCIPAIS OPORTUNIDADES', 'BOT']],
    [['UOMINI HERO', 'BOT'], ['LÇTO UOMINI', 'BOT']],
    [['CUIDADOS', 'EUD'], ['PERFUMARIA', 'EUD']],
  ],
  // Móveis de parede (pelo número): marca das placas e as 3 etiquetas.
  parede: {
    1: ['BOT', [['PERF FEM', 'BOT'], ['FLORATTA', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    2: ['BOT', [['PERF MASC', 'BOT'], ['MALBEC', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    3: ['EUD', [['PERF FEM', 'EUD'], ['SIÀGE', 'EUD'], ['OUTLET EUD', 'EUD']]],
    4: ['BOT', [['CUIDADOS (CBEM/NSPA)', 'BOT'], ['NATIVA SPA', 'BOT'], ['MULTI PROMO', 'MULTI']]],
  },
  totem: [['LÇTO UOMINI', 'BOT'], ['BOTIPROMO', 'BOT'], ['LIQUIDA QDB', 'QDB']],
  mesa: [
    [['UOMINI GLORIFICADO', 'BOT'], ['LÇTO UOMINI', 'BOT']],
    [['SIÀGE GLORIFICADO', 'EUD'], ['SIÀGE ULTIMATE', 'EUD']],
    [['VM PERMANENTE MULTI PROMO', 'MULTI'], ['MULTI PROMO', 'MULTI']],
  ],
  oui: [['MON AMIE + LOÇÃO', 'OUI'], ['Hôtel de Ville 193', 'OUI'], ['LÇTO MON AMIE', 'OUI']],
  balcao: [['LÇTO EGEO', 'BOT+QDB'], ['JUICY MOOD', 'QDB'], ['SIÀGE ULTIMATE', 'EUD']],
  make: [['MAKE B.', 'BOT'], ['BOTIPROMO MAKE B.', 'BOT'], ['OUTLET MAKE EUD', 'EUD'], ['LIQUIDA MAKE', 'QDB']],
  extras: { 'EXTRA-CESTINHAS': ['LÇTO EGEO', 'BOT+QDB'], 'EXTRA-BELEZA': ['BOTIPROMO MAKE B.', 'BOT'], 'EXTRA-CAVALETE': ['SIÀGE ULTIMATE', 'EUD'] },
  // Movimentos que não estão em EXEMPLO_TIPOS: [texto, classificação, GMV esperado (ilustrativo)].
  tipos: [
    ['PERF FEM', 'INSTITUCIONAL', 980000],
    ['PERF MASC', 'INSTITUCIONAL', 760000],
    ['FLORATTA', 'INSTITUCIONAL', 540000],
    ['MALBEC', 'INSTITUCIONAL', 610000],
    ['SIÀGE', 'INSTITUCIONAL', 470000],
    ['CUIDADOS (CBEM/NSPA)', 'INSTITUCIONAL', 520000],
    ['NATIVA SPA', 'INSTITUCIONAL', 390000],
    ['LÇTO MON AMIE', 'LANCAMENTO', 240000],
    ['Hôtel de Ville 193', 'LANCAMENTO', 180000],
    ['VM PERMANENTE MULTI PROMO', 'PROMOCAO', 300000],
    ['MAKE B.', 'INSTITUCIONAL', 350000],
    ['OUTLET MAKE EUD', 'LIQUIDACAO', 160000],
  ],
};

/**
 * Linhas do ciclo cheio de uma planta: { 'ID' ou 'ID/ESPACO': [marca, [[etiqueta, marca]...], símbolo] }.
 * Cada planta tem todas as suas linhas (não depende da cascata entre plantas).
 */
function movimentosExemploCheio_(planta) {
  const E = EXEMPLO_CHEIO;
  const saida = {};
  let k = 0; // reveza os pares entre os móveis
  const par = function () { return E.pares[k++ % E.pares.length]; };
  const linha = function (etiquetas, simbolo) { return [etiquetas[0][1].split('+')[0], etiquetas, simbolo || '']; };
  LAYOUT_PADRAO[planta].moveis.forEach(function (m) {
    const id = m[0], tipo = m[2];
    const num = Number((/(\d+)\s*$/.exec(id) || [0, 1])[1]);
    if (tipo === 'GONDOLA') {
      const div = String(m[11] || '').toUpperCase();
      const ids = ['PONTA-A'];
      ['A', 'B'].forEach(function (l) { if (div.indexOf(l) >= 0) ids.push('MEIO-' + l + '-1', 'MEIO-' + l + '-2'); else ids.push('MEIO-' + l); });
      ids.push('PONTA-B');
      ids.forEach(function (e) { saida[id + '/' + e] = linha(par(), num === 1 && /^MEIO/.test(e) ? 'FIXO' : ''); });
    } else if (tipo === 'PIRAMIDE' || tipo === 'FILA' || tipo === 'CUBO') {
      saida[id] = linha(par(), tipo === 'PIRAMIDE' && num === 1 ? 'NOVO' : '');
    } else if (tipo === 'GONDOLA_PAREDE') {
      const p = E.parede[num] || E.parede[1];
      saida[id] = [p[0], p[1], ''];
    } else if (tipo === 'TOTEM') {
      E.totem.forEach(function (et, i) { saida[id + '/PAINEL-' + (i + 1)] = linha([et]); });
    } else if (tipo === 'MESA' || tipo === 'MESA_3') {
      const n = tipo === 'MESA' ? 2 : 3;
      for (let i = 0; i < n; i++) saida[id + '/FRENTE-' + (i + 1)] = linha(E.mesa[i]);
      saida[id + '/VERSO'] = linha([E.totem[0]]);
    } else if (tipo === 'PAINEL' || tipo === 'EXPOSITOR_OUI' || tipo === 'ILHA_OUI') {
      saida[id] = ['OUI', E.oui, tipo === 'ILHA_OUI' ? 'EXPOSICAO' : ''];
    } else if (tipo === 'VITRINE_L') {
      saida[id] = ['BOT', E.balcao, ''];
    } else if (tipo === 'MAKE') {
      E.make.forEach(function (et, i) { saida[id + '/TESTEIRA-' + (i + 1)] = linha([et]); });
    } else if (tipo === 'EXTRA' && E.extras[id]) {
      saida[id] = ['NEUTRO', [E.extras[id]], ''];
    }
  });
  return saida;
}

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
      tamanhoEtiquetas: p.loja[3] && p.loja[3] !== 100 ? p.loja[3] : '', slide: p.loja[4] || '',
    }));
    p.moveis.forEach(function (m) {
      linhas.push(linha({
        planta: planta, movel: m[0], descricao: m[1], tipo: m[2], x: m[3], y: m[4], z: m[8] || 0,
        largura: m[5], profundidade: m[6], altura: m[7], ajusteX: m[9] || 0, ajusteY: m[10] || 0, dividido: m[11] || '', giro: m[12] || 0,
        ajusteEspacos: textoAjustesEspacos_(m[13] || {}),
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
  const ciclos = [[EXEMPLO_CICLO, EXEMPLO_MOVIMENTOS]];
  const cheio = {};
  Object.keys(LAYOUT_PADRAO).forEach(function (planta) { cheio[planta] = movimentosExemploCheio_(planta); });
  ciclos.push([EXEMPLO_CICLO_CHEIO, cheio]);
  ciclos.forEach(function (c) { Object.keys(c[1]).forEach(function (planta) {
    const moveis = c[1][planta];
    Object.keys(moveis).forEach(function (id) {
      const m = moveis[id];
      const o = {
        ciclo: c[0], planta: planta, movel: id, descricao: descricoes[id.split('/')[0]] || '',
        marca: m[0], simbolo: m[2] || '', observacao: '',
      };
      (m[1] || []).slice(0, CONFIG.MAX_ETIQUETAS).forEach(function (e, i) {
        o['etiqueta' + (i + 1)] = e[0];
        o['marcaEtiqueta' + (i + 1)] = e[1];
      });
      linhas.push(cols.map(function (c) { return o[c.chave] === undefined ? '' : o[c.chave]; }));
    });
  }); });
  return linhas;
}

/** Matriz [cabeçalho, ...linhas] da aba Tipos de movimento com o ciclo de exemplo. */
function valoresTiposExemplo_() {
  const cols = colunasTipos_();
  const linhas = [cols.map(function (c) { return c.titulo; })];
  // Ciclo cheio: só os movimentos que aparecem nas etiquetas dele.
  const usados = {};
  Object.keys(LAYOUT_PADRAO).forEach(function (planta) {
    const movs = movimentosExemploCheio_(planta);
    Object.keys(movs).forEach(function (id) { movs[id][1].forEach(function (e) { usados[e[0]] = true; }); });
  });
  const doCheio = EXEMPLO_TIPOS.concat(EXEMPLO_CHEIO.tipos).filter(function (t) { return usados[t[0]]; });
  const tipos = [[EXEMPLO_CICLO, EXEMPLO_TIPOS], [EXEMPLO_CICLO_CHEIO, doCheio]];
  tipos.forEach(function (c) { c[1].forEach(function (t) {
    const o = { ciclo: c[0], etiqueta: t[0], classificacao: CLASSIFICACOES[t[1]] ? CLASSIFICACOES[t[1]].nome : t[1], gmv: t[2] };
    linhas.push(cols.map(function (c) { return o[c.chave] === undefined ? '' : o[c.chave]; }));
  }); });
  return linhas;
}

/** Matriz [cabeçalho, ...linhas] da aba Painéis com o ciclo de exemplo. */
function valoresPaineisExemplo_() {
  const cols = colunasPaineis_();
  const linhas = [cols.map(function (c) { return c.titulo; })];
  [EXEMPLO_CICLO, EXEMPLO_CICLO_CHEIO].forEach(function (ciclo) { EXEMPLO_PAINEIS.forEach(function (p) {
    const o = { ciclo: ciclo, planta: p[0], secao: p[1], texto: p[2], marca: p[3], movel: p[4] };
    linhas.push(cols.map(function (c) { return o[c.chave] === undefined ? '' : o[c.chave]; }));
  }); });
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

  // ---------- Tipos de movimento (classificação e GMV esperado por etiqueta) ----------
  const tiposMovimento = {};
  if (valoresTipos && valoresTipos.length) {
    const lido = objetosDeValores_(valoresTipos, colunasTipos_());
    if (lido.faltando.length) {
      aviso('Aba "' + CONFIG.ABAS.TIPOS + '": coluna(s) não encontrada(s): ' + lido.faltando.join(', ') + '.');
    }
    // Etiquetas de cada ciclo (para avisar de movimento que não aparece em nenhuma etiqueta).
    const etiquetasDoCiclo = function (ciclo) {
      const vistas = {};
      const c = movimentos[ciclo] || {};
      Object.keys(c).forEach(function (p) {
        Object.keys(c[p]).forEach(function (id) {
          c[p][id].etiquetas.forEach(function (e) { vistas[chaveEtiqueta_(e.texto)] = true; });
        });
      });
      return vistas;
    };
    const etiquetasPorCiclo = {};
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
      if (movimentos[ciclo]) {
        etiquetasPorCiclo[ciclo] = etiquetasPorCiclo[ciclo] || etiquetasDoCiclo(ciclo);
        if (!etiquetasPorCiclo[ciclo][k]) aviso(onde + ': "' + texto + '" não aparece em nenhuma etiqueta do ciclo ' + ciclo + '.');
      }
      tiposMovimento[ciclo][k] = {
        texto: texto,
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
    colunas: { movimentos: colunasMovimentos_(), paineis: colunasPaineis_(), tipos: colunasTipos_(), layout: colunasLayout_() },
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

/** Tamanho das etiquetas da planta, em % (linha LOJA do Layout): 60 a 250; vazio ou inválido = 100. */
function normTamanhoEtiquetas_(v) {
  const n = Math.round(numero_(String(texto_(v)).replace('%', ''), 100));
  return n > 0 ? Math.max(60, Math.min(250, n)) : 100;
}

/** Mesmo texto de etiqueta, com variações de maiúsculas e espaços (igual ao Analytics). */
function chaveEtiqueta_(t) {
  return texto_(t).replace(/\s+/g, ' ').toUpperCase();
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

/* ===== src/Validacao.gs ===== */
/**
 * ============================================================================
 *  VALIDAÇÃO DA ESTRATÉGIA (comentários do validador para o construtor)
 * ============================================================================
 *  O validador comenta a estratégia de um ciclo (numa planta ou num móvel); o
 *  construtor da estratégia vê, responde e marca como resolvido. Cada acesso
 *  pede o papel e a senha (SENHAS_ACESSO, em Config.gs), conferidos aqui a cada
 *  gravação.
 *
 *  Os comentários ficam na aba "Comentários" (uma linha por mensagem; as
 *  respostas apontam para o comentário na coluna "Responde a"). Este arquivo só
 *  tem regras, sem ler nem gravar nada: quem lê e grava a aba é o Code.gs, o
 *  Visualizador.gs e, na versão web, o web/backend-local.js.
 */

const PAPEIS_ACESSO = {
  VALIDADOR: 'Validador',
  CONSTRUTOR: 'Construtor da estratégia',
};

const STATUS_COMENTARIO = { ABERTO: 'ABERTO', RESOLVIDO: 'RESOLVIDO' };

/** Colunas da aba Comentários (mesmo formato das outras abas: titulo, chave, apelidos). */
function colunasComentarios_() {
  return [
    { titulo: 'ID', chave: 'id', obrigatoria: true, texto: true },
    { titulo: 'Responde a', chave: 'pai', texto: true },
    { titulo: 'Ciclo', chave: 'ciclo', texto: true },
    { titulo: 'Planta', chave: 'planta', texto: true },
    { titulo: 'ID Móvel', chave: 'movel', texto: true },
    { titulo: 'Papel', chave: 'papel', texto: true },
    { titulo: 'Autor', chave: 'autor', texto: true },
    { titulo: 'Data', chave: 'data', texto: true },
    { titulo: 'Texto', chave: 'texto', obrigatoria: true, texto: true },
    { titulo: 'Status', chave: 'status', texto: true },
  ];
}

/**
 * Senhas de cada papel. Por enquanto vêm de SENHAS_ACESSO (Config.gs); este é o
 * único lugar a mudar quando elas passarem a ser lidas da planilha.
 */
function senhasDeAcesso_() {
  return SENHAS_ACESSO;
}

/**
 * Confere papel e senha. @return {{papel: string, autor: string}} ou lança erro.
 * @param {{papel: string, senha: string, nome: string}} acesso
 */
function conferirAcesso_(acesso) {
  const a = acesso || {};
  const papel = String(a.papel || '').toUpperCase();
  if (!PAPEIS_ACESSO[papel]) throw new Error('Escolha se você é validador ou construtor da estratégia.');
  const senha = senhasDeAcesso_()[papel];
  if (!senha || String(a.senha || '') !== String(senha)) throw new Error('Senha incorreta.');
  const autor = String(a.nome || '').trim().slice(0, 60);
  if (!autor) throw new Error('Informe o seu nome.');
  return { papel: papel, autor: autor };
}

/** Matriz vazia da aba (só o cabeçalho). */
function valoresComentariosVazios_() {
  return [colunasComentarios_().map(function (c) { return c.titulo; })];
}

/**
 * Comentários da aba, já com as respostas dentro de cada um (ordem de criação).
 * @return {Array<{id, ciclo, planta, movel, papel, autor, data, texto, status, respostas: Array}>}
 */
function comentariosDeValores_(valores) {
  if (!valores || !valores.length) return [];
  const lido = objetosDeValores_(valores, colunasComentarios_());
  const porId = {};
  const lista = [];
  const respostas = [];
  lido.linhas.forEach(function (l) {
    const c = {
      id: texto_(l.id),
      ciclo: texto_(l.ciclo),
      planta: normPlanta_(l.planta),
      movel: l.movel ? normId_(l.movel) : '',
      papel: String(texto_(l.papel)).toUpperCase(),
      autor: texto_(l.autor),
      data: texto_(l.data),
      texto: texto_(l.texto),
    };
    if (!c.id || !c.texto) return;
    const pai = texto_(l.pai);
    if (pai) {
      c.pai = pai;
      respostas.push(c);
      return;
    }
    c.status = String(texto_(l.status)).toUpperCase() === STATUS_COMENTARIO.RESOLVIDO ? STATUS_COMENTARIO.RESOLVIDO : STATUS_COMENTARIO.ABERTO;
    c.respostas = [];
    porId[c.id] = c;
    lista.push(c);
  });
  respostas.forEach(function (r) { if (porId[r.pai]) porId[r.pai].respostas.push(r); });
  return lista;
}

/**
 * Aplica uma ação aos comentários e devolve a matriz nova da aba (sem gravar nada).
 *  - novo:      { acao: 'novo', ciclo, planta, movel?, texto }   — só o validador;
 *  - responder: { acao: 'responder', id, texto }                 — os dois papéis;
 *  - status:    { acao: 'status', id, status: ABERTO|RESOLVIDO } — o construtor resolve;
 *               o validador resolve ou reabre;
 *  - excluir:   { acao: 'excluir', id }                          — só o validador (com as respostas).
 * @param {Array<Array>} valores  matriz atual da aba (com cabeçalho), ou vazia
 * @param {{papel, autor}} quem   resultado de conferirAcesso_
 * @param {Object} pedido
 * @param {Date=} agora
 * @return {{valores: Array<Array>, id: string}}
 */
function aplicarAcaoComentario_(valores, quem, pedido, agora) {
  const p = pedido || {};
  const cols = colunasComentarios_();
  const base = valores && valores.length ? valores : valoresComentariosVazios_();
  const cab = base[0].map(chave_);
  const idx = {};
  cols.forEach(function (c) { idx[c.chave] = acharColuna_(cab, c); });
  // Aba sem alguma coluna (editada à mão): recria com o cabeçalho certo, mantendo os dados.
  if (cols.some(function (c) { return idx[c.chave] < 0; })) {
    const objetos = objetosDeValores_(base, cols).linhas;
    return aplicarAcaoComentario_(
      valoresComentariosVazios_().concat(objetos.map(function (o) { return cols.map(function (c) { return o[c.chave] || ''; }); })),
      quem, p, agora
    );
  }
  const linhas = base.map(function (r) { return r.slice(); });
  const largura = linhas[0].length;
  const linhaDe = function (id) {
    for (let i = 1; i < linhas.length; i++) if (texto_(linhas[i][idx.id]) === id && !texto_(linhas[i][idx.pai])) return i;
    return -1;
  };
  const textoDe = function (t) {
    const s = String(t || '').trim();
    if (!s) throw new Error('Escreva o comentário.');
    return s.slice(0, 2000);
  };
  const data = formatarDataComentario_(agora || new Date());
  const novoId = 'C' + (agora || new Date()).getTime().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
  const nova = function (o) {
    const r = [];
    for (let k = 0; k < largura; k++) r.push('');
    cols.forEach(function (c) { if (o[c.chave] !== undefined) r[idx[c.chave]] = o[c.chave]; });
    linhas.push(r);
  };
  const exigirComentario = function () {
    const i = linhaDe(String(p.id || ''));
    if (i < 0) throw new Error('Comentário não encontrado (pode ter sido excluído). Clique em Atualizar.');
    return i;
  };

  if (p.acao === 'novo') {
    if (quem.papel !== 'VALIDADOR') throw new Error('Só o validador cria comentários.');
    const ciclo = String(p.ciclo || '').trim();
    const planta = normPlanta_(p.planta);
    if (!ciclo || !planta) throw new Error('Escolha o ciclo e a planta do comentário.');
    nova({
      id: novoId, pai: '', ciclo: ciclo, planta: nomePlanta_(planta), movel: p.movel ? normId_(p.movel) : '',
      papel: quem.papel, autor: quem.autor, data: data, texto: textoDe(p.texto), status: STATUS_COMENTARIO.ABERTO,
    });
    return { valores: linhas, id: novoId };
  }
  if (p.acao === 'responder') {
    const i = exigirComentario();
    nova({
      id: novoId, pai: texto_(linhas[i][idx.id]), ciclo: linhas[i][idx.ciclo], planta: linhas[i][idx.planta], movel: linhas[i][idx.movel],
      papel: quem.papel, autor: quem.autor, data: data, texto: textoDe(p.texto), status: '',
    });
    return { valores: linhas, id: novoId };
  }
  if (p.acao === 'status') {
    const i = exigirComentario();
    const status = String(p.status || '').toUpperCase();
    if (!STATUS_COMENTARIO[status]) throw new Error('Status inválido.');
    if (status === STATUS_COMENTARIO.ABERTO && quem.papel !== 'VALIDADOR') throw new Error('Só o validador reabre um comentário.');
    linhas[i][idx.status] = status;
    return { valores: linhas, id: texto_(linhas[i][idx.id]) };
  }
  if (p.acao === 'excluir') {
    if (quem.papel !== 'VALIDADOR') throw new Error('Só o validador exclui comentários.');
    const i = exigirComentario();
    const id = texto_(linhas[i][idx.id]);
    return {
      valores: linhas.filter(function (r, k) { return k === 0 || (texto_(r[idx.id]) !== id && texto_(r[idx.pai]) !== id); }),
      id: id,
    };
  }
  throw new Error('Ação inválida.');
}

/** "09/10/2026 14:05" (horário do servidor / navegador). */
function formatarDataComentario_(d) {
  const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
}

/* ----------------------- leitura e gravação da aba ----------------------- */
/* (Só no Apps Script: Code.gs e Visualizador.gs usam estas duas funções.)   */

/** Matriz da aba Comentários (valores exibidos), ou a matriz vazia se a aba não existe. */
function lerComentariosDaPlanilha_(ss) {
  const sh = ss.getSheetByName(CONFIG.ABAS.COMENTARIOS);
  if (!sh || sh.getLastRow() < 1) return valoresComentariosVazios_();
  return sh.getDataRange().getDisplayValues();
}

/** Grava a matriz inteira na aba Comentários (cria a aba se não existir), tudo como texto. */
function gravarComentariosNaPlanilha_(ss, valores) {
  let sh = ss.getSheetByName(CONFIG.ABAS.COMENTARIOS);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.ABAS.COMENTARIOS);
    sh.setFrozenRows(1);
  }
  const largura = valores[0].length;
  sh.clearContents();
  if (sh.getMaxColumns() < largura) sh.insertColumnsAfter(sh.getMaxColumns(), largura - sh.getMaxColumns());
  if (sh.getMaxRows() < valores.length) sh.insertRowsAfter(sh.getMaxRows(), valores.length - sh.getMaxRows());
  const faixa = sh.getRange(1, 1, valores.length, largura);
  faixa.setNumberFormat('@');
  faixa.setValues(valores);
  sh.getRange(1, 1, 1, largura).setFontWeight('bold');
}

/**
 * Executa um pedido da página com a trava do script: confere o acesso, lê a aba,
 * aplica a ação e grava. @return {Array} comentários atualizados
 */
function executarComentario_(ss, acesso, pedido) {
  const quem = conferirAcesso_(acesso);
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    const r = aplicarAcaoComentario_(lerComentariosDaPlanilha_(ss), quem, pedido);
    gravarComentariosNaPlanilha_(ss, r.valores);
    return comentariosDeValores_(r.valores);
  } finally {
    trava.releaseLock();
  }
}
