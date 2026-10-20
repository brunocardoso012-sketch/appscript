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
    // Ciclos em construção (Rascunhos.gs): o status de cada um e as linhas, no formato das abas publicadas.
    RASCUNHOS: 'Rascunhos',
    R_MOVIMENTOS: 'Rascunho Movimentos',
    R_PAINEIS: 'Rascunho Painéis',
    R_TIPOS: 'Rascunho Tipos',
    // Itens do ciclo seguinte adiantados para o ciclo atual (Antecipacoes.gs).
    ANTECIPACOES: 'Antecipações',
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
  VALIDADOR: 'validacao_exposicao',
  CONSTRUTOR: 'construcao_exposicao',
};

/**
 * Nome de cada planta (abas, título do slide e PNG). Na coluna "Planta" das
 * abas vale tanto o número (01) quanto o nome (ER P). Planta que não aparece
 * aqui é chamada de "PLANTA <número>".
 */
const NOMES_PLANTAS = { '01': 'ER P', '02': 'ER M', '03': 'ER G', '04': 'ER GG' };

/**
 * Rede de lojas que as plantas representam: cada planta (ER P, M, G, GG) é a média das lojas daquele
 * tamanho. participacao = fatia da rede (0..1) de cada planta; lojas = total de lojas da rede.
 * O Analytics mostra isso em cada ER e nunca soma os espaços de ERs diferentes.
 * ficticia = true: a divisão abaixo é só um exemplo (troque pelos números reais e passe para false).
 */
const REDE = { lojas: 1000, ficticia: true, participacao: { '01': 0.35, '02': 0.3, '03': 0.22, '04': 0.13 } };

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
 *  - nome:     como a marca aparece no app (legenda, listas, Analytics e PNG): a sigla de 3 letras;
 *  - apelidos: outras formas aceitas na planilha (o nome completo continua aceito) (comparação ignora acentos,
 *              maiúsculas, espaços e pontuação).
 *
 * Na planilha também é possível:
 *  - combinar marcas com "+" (ex.: BOT+QDB) → gera um degradê;
 *  - usar uma cor livre em hexadecimal (ex.: #FF8800).
 */
const MARCAS = {
  BOT: {
    nome: 'BOT',
    etiqueta: '#3E9D6B',
    movel: '#7CC9A0',
    apelidos: ['Boticário', 'BOTICARIO', 'OBOTICARIO', 'BOTI', 'VERDE'],
  },
  EUD: {
    nome: 'EUD',
    etiqueta: '#A11FC9',
    movel: '#B666D8',
    apelidos: ['Eudora', 'EUDORA', 'ROXO'],
  },
  QDB: {
    nome: 'QDB',
    etiqueta: '#E23FB4',
    movel: '#F07ACD',
    apelidos: ['Quem disse, berenice?', 'QUEMDISSEBERENICE', 'BERENICE', 'ROSA'],
  },
  OUI: {
    nome: 'OUI',
    etiqueta: '#E1262F',
    movel: '#C9343F',
    apelidos: ['O.U.i', 'OUIPARIS', 'VERMELHO'],
  },
  MULTI: {
    nome: 'MM',
    etiqueta: '#2B4DE3',
    movel: '#7D90EC',
    apelidos: ['Multimarca', 'MULTIMARCA', 'MM', 'AZUL'],
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
  // No espaço, não vem da planilha: o app põe nos espaços que recebem uma antecipação (aba Antecipações).
  // Na etiqueta, pode vir da planilha (coluna "Símbolo Etiqueta N"), com a data em "Data Etiqueta N".
  ANTECIPADO: { descricao: 'Antecipação (item adiantado do próximo ciclo)', apelidos: ['ANTECIPACAO', 'ANTECIPADA', '⏩'], automatico: true },
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
    // Símbolo próprio da etiqueta (aparece ao lado dela); com a antecipação (⏩), a data em que entra.
    cols.push({ chave: 'simboloEtiqueta' + i, titulo: 'Símbolo Etiqueta ' + i });
    cols.push({ chave: 'dataEtiqueta' + i, titulo: 'Data Etiqueta ' + i, texto: true, apelidos: ['Data Antecipação ' + i] });
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
