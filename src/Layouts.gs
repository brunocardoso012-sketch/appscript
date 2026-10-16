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
 *  Loja: [largura, profundidade, altura da parede, (tamanho das etiquetas em %, padrão 100)].
 *  Móvel: [ID, descrição, tipo, x, y, largura, profundidade, altura, (elevação), (ajuste etiqueta X), (ajuste Y),
 *          (meios divididos da gôndola: '', 'A', 'B' ou 'AB'), (giro em graus: 0, 90, 180 ou 270),
 *          (ajuste das pilhas de etiquetas por espaço: { 'LADO-A': {x, y} })]
 *  O botão "Baixar código da loja" (modo Construir loja) gera este mesmo formato; o botão "Baixar
 *  posições" (modo ajuste das etiquetas) gera os ajustes de etiqueta (índices 9, 10 e 13) e o tamanho.
 */

/**
 * Versão do modelo base de cada planta. Ao mudar o modelo de uma planta aqui,
 * aumente o número dela: na próxima abertura, essa planta (layout + linhas do
 * ciclo de exemplo) é atualizada para o modelo novo; as demais ficam intactas.
 * Plantas que não aparecem aqui estão na versão 1.
 */
const VERSAO_MODELO_PLANTAS = { '01': 12, '02': 11, '03': 8, '04': 9 };

/**
 * Versão do ciclo de exemplo inteiro (Movimentos + Painéis, todas as plantas e TODAS).
 * Ao aumentar, todas as linhas do "Ciclo exemplo" são trocadas pelas atuais na próxima
 * abertura (os outros ciclos não mudam).
 */
const VERSAO_EXEMPLO = 12;

const LAYOUT_PADRAO = {
  // PLANTA 01 (ER P): layout montado no modo "Construir loja".
  '01': {
    loja: [12, 10, 4.4],
    moveis: [
      ['MOVEL DE PAREDE 1', 'Perf. Fem. BOT', 'GONDOLA_PAREDE', 0, 0, 3, 1.1, 3.2],
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
      ['MOVEL DE PAREDE 2', 'Perf. Masc. BOT', 'GONDOLA_PAREDE', 3, 0, 3, 1.1, 3.2],
      ['MOVEL DE PAREDE 3', 'Perf. Fem. EUD', 'GONDOLA_PAREDE', 6, 0, 3, 1.1, 3.2],
      ['MOVEL DE PAREDE 4', 'CBEM/NSPA', 'GONDOLA_PAREDE', 9, 0, 3, 1.1, 3.2],
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
      ['MOVEL DE PAREDE 1', 'Perf. Fem. BOT', 'GONDOLA_PAREDE', 0, 0, 3, 1.1, 3.2],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', 0, 2.5, 1.4, 6, 3.2],
      ['MOVEL DE ATENDIMENTO 2', 'Móvel de atendimento 2', 'CAIXA', 0, 11.5, 1.2, 1.8, 1.7],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 9.5, 1.2, 1.8, 1.7],
      ['MOVEL DE FILA 4', 'Móvel de fila 4', 'FILA', 4, 12.5, 1.5, 0.4, 1.46],
      ['MOVEL DE FILA 2', 'Móvel de fila 2', 'FILA', 4, 10.5, 1.5, 0.4, 1.46],
      ['PAREDE OUI 1', 'Parede O.U.i 1', 'PAINEL', 12.5, 0, 3.6, 0.9, 5],
      ['TOTEM OUI 1', 'Totem O.U.i 1', 'EXPOSITOR_OUI', 8.5, 9.4, 0.8, 0.8, 1.94],
      ['PIRAMIDE 3', 'Pirâmide 3', 'PIRAMIDE', 14, 3.5, 1.02, 1.02, 1.94],
      ['MOVEL DE PAREDE 2', 'Perf. Masc. BOT', 'GONDOLA_PAREDE', 3, 0, 3, 1.1, 3.2],
      ['MOVEL DE PAREDE 3', 'Perf. Fem. EUD', 'GONDOLA_PAREDE', 6, 0, 3, 1.1, 3.2],
      ['MOVEL DE PAREDE 4', 'CBEM/NSPA', 'GONDOLA_PAREDE', 9, 0, 3, 1.1, 3.2],
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
      ['MOVEL DE PAREDE 1', 'Perf. Fem. BOT', 'GONDOLA_PAREDE', 0.5, 0, 2.5, 1.1, 3.2],
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
      ['MOVEL DE PAREDE 2', 'Perf. Masc. BOT', 'GONDOLA_PAREDE', 3, 0, 2.5, 1.1, 3.2],
      ['MOVEL DE PAREDE 3', 'Perf. Fem. EUD', 'GONDOLA_PAREDE', 5.5, 0, 2.5, 1.1, 3.2],
      ['MOVEL DE PAREDE 4', 'CBEM/NSPA', 'GONDOLA_PAREDE', 8, 0, 2.5, 1.1, 3.2],
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
      ['MOVEL DE PAREDE 1', 'Perf. Fem. BOT', 'GONDOLA_PAREDE', 0, -0.5, 4, 1.1, 3.2],
      ['MOVEL DE PAREDE 2', 'Perf. Masc. BOT', 'GONDOLA_PAREDE', 4, -0.5, 4, 1.1, 3.2],
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
      ['MOVEL DE PAREDE 3', 'Perf. Fem. EUD', 'GONDOLA_PAREDE', 8, -0.5, 4, 1.1, 3.2],
      ['MOVEL DE FILA 1', 'Móvel de fila 1', 'FILA', 1.5, 13, 1.5, 0.4, 1.46],
      ['MOVEL DE ATENDIMENTO 1', 'Móvel de atendimento 1', 'CAIXA', 0, 13, 1.2, 1.8, 1.7],
      ['MOVEL MAKE 1', 'Móvel make 1', 'MAKE', 0, 3.5, 1.4, 6, 3.2],
      ['MOVEL DE PAREDE 4', 'CBEM/NSPA', 'GONDOLA_PAREDE', 12, -0.5, 4, 1.1, 3.2],
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
 *  Gôndola, mesas, totem e móvel make são preenchidos espaço por espaço
 *  (GONDOLA 1/LADO-A, MESA DESTAQUE 1/FRENTE-1, TOTEM 1/PAINEL-1…), sem linha do móvel inteiro.
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
    'GONDOLA 1/LADO-A': ['QDB', [['LIQUIDA QDB', 'QDB'], ['JUICY MOOD', 'QDB']]],
    'GONDOLA 1/MEIO-A': ['BOT', [['BOTIK', 'BOT']], 'FIXO'],
    'GONDOLA 1/MEIO-B': ['BOT', [['UOMINI HERO', 'BOT']], 'FIXO'],
    'GONDOLA 1/LADO-B': ['BOT', [['BOTI PROMO', 'BOT']], 'FIXO'],
    'PIRAMIDE 1': ['EUD', [['MULTI PROMO', 'MULTI']]],
    'PIRAMIDE 2': ['BOT', [['PRINCIPAIS OPORTUNIDADES', 'BOT']]],
    'MESA DESTAQUE 1/FRENTE-1': ['BOT', [['UOMINI GLORIFICADO', 'BOT']]],
    'MESA DESTAQUE 1/FRENTE-2': ['EUD', [['SIÀGE GLORIFICADO', 'EUD']]],
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
    'GONDOLA 2/LADO-A': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GONDOLA 2/MEIO-A': ['EUD', [['PERFUMARIA', 'EUD']]],
    'GONDOLA 2/MEIO-A-2': ['BOT', [['BOTI PROMO', 'BOT']]],
    'GONDOLA 2/MEIO-B': ['EUD', [['CUIDADOS', 'EUD']]],
    'GONDOLA 2/LADO-B': ['EUD', [['OUTLET EUD', 'EUD']]],
    'PIRAMIDE 3': ['EUD', [['MULTI PROMO', 'MULTI']]],
    'MOVEL DE FILA 3': ['BOT', [['BOTIPROMO', 'BOT']]],
    'MOVEL DE FILA 4': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'PAREDE OUI 1': ['OUI', [['MON AMIE + LOÇÃO', 'OUI']], 'EXPOSICAO'],
    'TOTEM OUI 1': ['OUI', [['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
  },
  '03': {
    // Lado A e meio A iguais ao lado B e ao meio B da gôndola 2 da ER M.
    'GONDOLA 3/LADO-A': ['EUD', [['OUTLET EUD', 'EUD']]],
    'GONDOLA 3/MEIO-A': ['EUD', [['CUIDADOS', 'EUD']]],
    'GONDOLA 3/MEIO-B': ['MULTI', [['+PEC REGIONAL', 'MULTI']]],
    'GONDOLA 3/LADO-B': ['MULTI', []],
    'MOVEL DE FILA 6': ['BOT', [['BOTIPROMO', 'BOT']]],
    'MOVEL DE FILA 8': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'MESA DESTAQUE 3 FRENTES 1/FRENTE-1': ['BOT', [['UOMINI GLORIFICADO', 'BOT']]],
    'MESA DESTAQUE 3 FRENTES 1/FRENTE-2': ['MULTI', [['VM PERMANENTE MULTI PROMO', 'MULTI']]],
    'MESA DESTAQUE 3 FRENTES 1/FRENTE-3': ['EUD', [['SIÀGE GLORIFICADO', 'EUD']]],
  },
  '04': {
    'PIRAMIDE 4': ['MULTI', [['ISCAS EXAUSTÃO', 'EUD']]],
    'PIRAMIDE 5': ['BOT', [['ISCAS EXAUSTÃO', 'BOT']]],
    'GONDOLA 4/LADO-A': ['OUI', [['EXAUSTÃO OUI', 'OUI']]],
    'GONDOLA 4/MEIO-A': ['OUI', []],
    'GONDOLA 4/MEIO-B': ['OUI', []],
    'GONDOLA 4/LADO-B': ['OUI', []],
    'GONDOLA 5/LADO-A': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GONDOLA 5/MEIO-A': ['QDB'],
    'GONDOLA 5/MEIO-B': ['QDB'],
    'GONDOLA 5/LADO-B': ['QDB'],
    'GONDOLA 6/LADO-A': ['EUD', [['EXAUSTÃO EUD', 'EUD']]],
    'GONDOLA 6/MEIO-A': ['EUD', []],
    'GONDOLA 6/MEIO-B': ['EUD', []],
    'GONDOLA 6/LADO-B': ['EUD', []],
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
 *  balcão recepção: 3; móvel de atendimento: 1; móvel make: 1 por testeira; itens fora da planta: 1.
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
  atendimento: [['STOPPER LÇTO EGEO', 'BOT'], ['OUTLET EUD', 'EUD'], ['LIQUIDA QDB', 'QDB']],
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
    ['STOPPER LÇTO EGEO', 'LANCAMENTO', 120000],
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
      const ids = ['LADO-A'];
      ['A', 'B'].forEach(function (l) { if (div.indexOf(l) >= 0) ids.push('MEIO-' + l + '-1', 'MEIO-' + l + '-2'); else ids.push('MEIO-' + l); });
      ids.push('LADO-B');
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
    } else if (tipo === 'PAINEL' || tipo === 'EXPOSITOR_OUI' || tipo === 'ILHA_OUI') {
      saida[id] = ['OUI', E.oui, tipo === 'ILHA_OUI' ? 'EXPOSICAO' : ''];
    } else if (tipo === 'VITRINE_L') {
      saida[id] = ['BOT', E.balcao, ''];
    } else if (tipo === 'CAIXA') {
      saida[id] = linha([E.atendimento[(num - 1) % E.atendimento.length]]);
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
      tamanhoEtiquetas: p.loja[3] || '',
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
