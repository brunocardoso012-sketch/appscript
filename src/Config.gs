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
 * Quantas etiquetas cada tipo de móvel mostra na planta (as outras colunas
 * "Etiqueta N" da linha são ignoradas). Tipos que não aparecem aqui mostram
 * até CONFIG.MAX_ETIQUETAS. Pirâmide e mesa destaque usam a primeira etiqueta
 * preenchida.
 * Gôndola: uma etiqueta por bloco. Na linha da gôndola inteira, Etiqueta 1 =
 * Ponta 1, 2 = Meio A, 3 = Meio B e 4 = Ponta 2; a linha de um espaço
 * (GON-01/MEIO-A…) usa só a Etiqueta 1 e substitui a do bloco.
 */
const ETIQUETAS_POR_TIPO = { PIRAMIDE: 1, MESA: 1, GONDOLA: 4 };

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
  PIRAMIDE: 'Pirâmide: 4 blocos iguais empilhados (1 etiqueta)',
  GONDOLA: 'Gôndola: 2 pontas + 2 meios (cada meio pode ser dividido em dois), 4 níveis de prateleira, 1 etiqueta por bloco',
  FILA: 'Móvel de fila: bloco único retangular com 4 níveis, na altura da gôndola',
  GONDOLA_PAREDE: 'Móvel de parede: estante encostada na parede, com prateleiras',
  CUBO: 'PDV móvel: cubo de vidro sobre rodapé',
  MESA: 'Mesa destaque: 2 nichos baixos sobre estrutura, painel de vidro ao fundo e 2 painéis na frente, embaixo (1 etiqueta)',
  MESA_3: 'Mesa destaque 3 frentes: 3 nichos sobre estrutura, com painel de vidro ao fundo',
  TOTEM: 'Totem: estrutura metálica com 3 painéis',
  PAINEL: 'Parede O.U.i: painel alto com moldura',
  EXPOSITOR_OUI: 'Totem O.U.i: expositor estreito com moldura, na altura da gôndola',
  ILHA_OUI: 'Ilha premium O.U.i: base com prateleiras e painel alto atrás, com faixas claras nas laterais',
  MAKE: 'Móvel make: estante de parede com prateleiras e 4 testeiras no alto (cada uma pode ter cor própria)',
  VITRINE_L: 'Balcão recepção: em "L", com os dois lados do mesmo tamanho',
  CAIXA: 'Móvel de atendimento (caixa): balcão com tela preta em cima',
  EXTRA: 'Item fora da planta (Cestinhas, Espaço da Beleza, Cavalete…)',
};

/** Tipos oferecidos no modo "Construir loja". */
const TIPOS_CONSTRUCAO = [
  'GONDOLA', 'PIRAMIDE', 'FILA', 'GONDOLA_PAREDE', 'TOTEM', 'CUBO', 'MESA', 'MESA_3', 'VITRINE_L', 'CAIXA', 'PAINEL', 'EXPOSITOR_OUI', 'ILHA_OUI', 'MAKE',
];

/**
 * Espaços de um móvel: os da gôndola (pontas e meios) e as 4 testeiras do
 * móvel make. Na planilha, cada espaço é endereçado como "<ID do móvel>/<espaço>",
 * ex.: GON-01/MEIO-A, GON-01/MEIO-A-2 ou MAKE-01/TESTEIRA-2.
 * Uma linha só com o ID do móvel vale para todos os espaços sem linha própria.
 * (A página tem uma cópia desta regra em Render.espacos.)
 * @param {{tipo: string, dividido: string}} m  dividido = '', 'A', 'B' ou 'AB'
 * @return {Array<{id: string, nome: string}>}
 */
function espacosDoMovel_(m) {
  if (m && m.tipo === 'MAKE') {
    return [1, 2, 3, 4].map(function (n) { return { id: 'TESTEIRA-' + n, nome: 'Testeira ' + n }; });
  }
  if (!m || m.tipo !== 'GONDOLA') return [];
  const div = String(m.dividido || '').toUpperCase();
  const lista = [{ id: 'PONTA-1', nome: 'Ponta 1' }];
  ['A', 'B'].forEach(function (lado) {
    if (div.indexOf(lado) >= 0) {
      lista.push({ id: 'MEIO-' + lado + '-1', nome: 'Meio ' + lado + ' (metade 1)' });
      lista.push({ id: 'MEIO-' + lado + '-2', nome: 'Meio ' + lado + ' (metade 2)' });
    } else {
      lista.push({ id: 'MEIO-' + lado, nome: 'Meio ' + lado });
    }
  });
  lista.push({ id: 'PONTA-2', nome: 'Ponta 2' });
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
