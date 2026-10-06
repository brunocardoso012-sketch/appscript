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
const VERSAO_MODELO_PLANTAS = { '01': 9, '02': 8, '03': 5, '04': 6 };

const LAYOUT_PADRAO = {
  // PLANTA 01 (ER P): layout montado no modo "Construir loja" (arquivo layout-plantas-2026-10-06_2.json, 2ª versão):
  // loja 12 × 10 com móvel make na parede esquerda, móvel de atendimento e balcão girado.
  '01': {
    loja: [12, 10, 4.4],
    moveis: [
      ['PAR-04', 'Parede do fundo 1', 'GONDOLA_PAREDE', 3.5, 0, 4, 1.1, 3.2],
      ['PAR-01', 'Parede do fundo 2', 'GONDOLA_PAREDE', 7.5, 0, 4, 1.1, 3.2],
      ['PAR-03', 'Parede esquerda 1', 'GONDOLA_PAREDE', 0, 0, 4, 1.1, 3.2],
      ['GON-01', 'Gôndola', 'GONDOLA', 2.5, 2, 1.6, 4, 1.94],
      ['PIR-02', 'Pirâmide 2', 'PIRAMIDE', 6, 2.5, 1.02, 1.02, 1.94],
      ['PIR-01', 'Pirâmide 1', 'PIRAMIDE', 6, 4.5, 1.02, 1.02, 1.94],
      ['MESA-01', 'Mesa destaque', 'MESA', 8.5, 3.5, 2.6, 1.4, 2.6],
      ['PDV-01', 'PDV móvel', 'CUBO', 5.5, 7, 1.3, 1.3, 1.44],
      ['BALCAO-01', 'Balcão recepção', 'VITRINE_L', 9.5, 6.5, 2.4, 2.4, 1.28, 0, 0, 0, '', 90],
      ['FILA-01', 'Móvel de fila 1', 'FILA', 2, 9.5, 1.5, 0.4, 1.46],
      ['FILA-02', 'Móvel de fila 2', 'FILA', 2, 8, 1.5, 0.4, 1.46],
      ['TOTEM-01', 'Totem', 'TOTEM', 6, 8.5, 0.35, 1.5, 3.4],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['MAKE-01', 'Móvel make', 'MAKE', 0, 1.5, 0.6, 6, 3.2],
      ['CX-01', 'Móvel de atendimento', 'CAIXA', 0, 8, 1.2, 1.8, 1.7],
    ],
  },

  // PLANTA 02 (ER M): layout montado no modo "Construir loja" (arquivo layout-plantas-2026-10-06_3.json):
  // loja 16 × 14 com móvel make, parede e totem O.U.i, 2 móveis de atendimento e balcão girado.
  '02': {
    loja: [16, 14, 4.4],
    moveis: [
      ['GON-01', 'Gôndola 1', 'GONDOLA', 3.5, 3, 1.6, 4, 1.94],
      ['GON-02', 'Gôndola 2', 'GONDOLA', 7, 3, 1.6, 4, 1.94],
      ['PIR-01', 'Pirâmide 1', 'PIRAMIDE', 10, 3.5, 1.02, 1.02, 1.94],
      ['PIR-03', 'Pirâmide 3', 'PIRAMIDE', 12, 3.5, 1.02, 1.02, 1.94],
      ['MESA-01', 'Mesa destaque', 'MESA', 11.5, 7.5, 2.6, 1.4, 2.6],
      ['FILA-02', 'Móvel de fila 2', 'FILA', 2.5, 10.5, 1.5, 0.4, 1.46],
      ['FILA-01', 'Móvel de fila 1', 'FILA', 2.5, 12.5, 1.5, 0.4, 1.46],
      ['PDV-01', 'PDV móvel', 'CUBO', 8, 11, 1.3, 1.3, 1.44],
      ['BALCAO-01', 'Balcão recepção', 'VITRINE_L', 13.5, 11, 2.4, 2.4, 1.28, 0, 0, 0, '', 90],
      ['TOTEM-01', 'Totem', 'TOTEM', 8.5, 12.5, 0.35, 1.5, 3.4],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['PAR-01', 'Parede do fundo 1', 'GONDOLA_PAREDE', 0, 0, 4, 1.1, 3.2],
      ['PAR-02', 'Parede do fundo 2', 'GONDOLA_PAREDE', 4, 0, 4, 1.1, 3.2],
      ['PAR-03', 'Parede do fundo 3', 'GONDOLA_PAREDE', 8, 0, 4, 1.1, 3.2],
      ['MAKE-01', 'Móvel make', 'MAKE', 0, 1.5, 1.4, 6, 3.2],
      ['CX-01', 'Móvel de atendimento 1', 'CAIXA', 0, 11.5, 1.2, 1.8, 1.7],
      ['CX-02', 'Móvel de atendimento 2', 'CAIXA', 0, 9.5, 1.2, 1.8, 1.7],
      ['FILA-04', 'Móvel de fila 4', 'FILA', 4, 12.5, 1.5, 0.4, 1.46],
      ['FILA-05', 'Móvel de fila 5', 'FILA', 4, 10.5, 1.5, 0.4, 1.46],
      ['OUI-01', 'Parede O.U.i', 'PAINEL', 12.5, 0, 3.6, 0.9, 5],
      ['OUI-02', 'Totem O.U.i', 'EXPOSITOR_OUI', 8.5, 9.4, 0.8, 0.8, 1.94],
      ['PIR-02', 'Pirâmide 2', 'PIRAMIDE', 14, 3.5, 1.02, 1.02, 1.94],
    ],
  },

  // PLANTA 03 (ER G): layout montado no modo "Construir loja" (arquivo layout-plantas-2026-10-06_4.json,
  // enviado na planta 04), com fila, balcão e totem O.U.i nas medidas atuais.
  '03': {
    loja: [14, 16, 4.6],
    moveis: [
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['PIR-01', 'Pirâmide 1', 'PIRAMIDE', 12.5, 2.5, 1.02, 1.02, 1.94],
      ['GON-01', 'Gôndola 1', 'GONDOLA', 3, 2.5, 1.6, 4, 1.94],
      ['PDV-01', 'PDV móvel', 'CUBO', 6.5, 12, 1.3, 1.3, 1.44],
      ['BALCAO-01', 'Balcão recepção', 'VITRINE_L', 11.5, 12.5, 2.4, 2.4, 1.28, 0, 0, 0, '', 90],
      ['CX-01', 'Móvel de atendimento 1', 'CAIXA', 0, 13, 1.2, 1.8, 1.7],
      ['OUI-01', 'Parede O.U.i', 'PAINEL', 9.5, 0, 3.6, 0.8, 4.5],
      ['FILA-01', 'Móvel de fila 1', 'FILA', 3.5, 13, 1.5, 0.4, 1.46],
      ['OUI-02', 'Totem O.U.i', 'EXPOSITOR_OUI', 7, 10.4, 0.8, 0.8, 1.94],
      ['PAR-01', 'Parede do fundo 1', 'GONDOLA_PAREDE', 0, -0.5, 4, 1.1, 3.2],
      ['PAR-02', 'Parede do fundo 2', 'GONDOLA_PAREDE', 4, -0.5, 4, 1.1, 3.2],
      ['GON-02', 'Gôndola 2', 'GONDOLA', 6, 2.5, 1.6, 4, 1.94],
      ['GON-03', 'Gôndola 3', 'GONDOLA', 9, 2.5, 1.6, 4, 1.94],
      ['PIR-02', 'Pirâmide 2', 'PIRAMIDE', 12.5, 4.5, 1.02, 1.02, 1.94],
      ['PIR-03', 'Pirâmide 3', 'PIRAMIDE', 12.5, 6.5, 1.02, 1.02, 1.94],
      ['CX-02', 'Móvel de atendimento 2', 'CAIXA', 0, 11, 1.2, 1.8, 1.7],
      ['FILA-02', 'Móvel de fila 2', 'FILA', 2, 9, 1.5, 0.4, 1.46],
      ['FILA-03', 'Móvel de fila 3', 'FILA', 2, 15, 1.5, 0.4, 1.46],
      ['FILA-04', 'Móvel de fila 4', 'FILA', 2, 11, 1.5, 0.4, 1.46],
      ['FILA-05', 'Móvel de fila 5', 'FILA', 2, 13, 1.5, 0.4, 1.46],
      ['FILA-06', 'Móvel de fila 6', 'FILA', 3.5, 11, 1.5, 0.4, 1.46],
      ['FILA-07', 'Móvel de fila 7', 'FILA', 3.5, 15, 1.5, 0.4, 1.46],
      ['FILA-08', 'Móvel de fila 8', 'FILA', 3.5, 9, 1.5, 0.4, 1.46],
      ['MESA3-01', 'Mesa destaque 3 frentes', 'MESA_3', 9, 9, 3.9, 1.4, 2.6],
      ['TOTEM-01', 'Totem', 'TOTEM', 7.5, 14, 0.35, 1.5, 3.4],
      ['MAKE-01', 'Móvel make', 'MAKE', -0.5, 1, 1.4, 6, 3.2],
      ['CX-03', 'Móvel de atendimento 3', 'CAIXA', 0, 9, 1.2, 1.8, 1.7],
    ],
  },

  // PLANTA 04 (ER GG): layout montado no modo "Construir loja" (arquivo layout-plantas-2026-10-06_5.json):
  // loja 17 × 20 com móvel make, ilha premium O.U.i, 6 gôndolas, 5 pirâmides e 8 móveis de fila.
  '04': {
    loja: [17, 20, 4.6],
    moveis: [
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
      ['PIR-01', 'Pirâmide 1', 'PIRAMIDE', 14.5, 2.5, 1.02, 1.02, 1.94],
      ['GON-01', 'Gôndola 1', 'GONDOLA', 3.5, 2.5, 1.6, 4, 1.94],
      ['PDV-01', 'PDV móvel', 'CUBO', 6, 17, 1.3, 1.3, 1.44],
      ['BALCAO-01', 'Balcão recepção', 'VITRINE_L', 14.5, 17.5, 2.4, 2.4, 1.28],
      ['CX-01', 'Móvel de atendimento 1', 'CAIXA', 0, 17, 1.2, 1.8, 1.7],
      ['FILA-01', 'Móvel de fila 1', 'FILA', 3, 17, 1.5, 0.4, 1.46],
      ['OUI-02', 'Totem O.U.i', 'EXPOSITOR_OUI', 6.5, 16, 0.8, 0.8, 1.94],
      ['PAR-01', 'Parede do fundo 1', 'GONDOLA_PAREDE', 0, -0.5, 4, 1.1, 3.2],
      ['PAR-02', 'Parede do fundo 2', 'GONDOLA_PAREDE', 4, -0.5, 4, 1.1, 3.2],
      ['PAR-05', 'Parede esquerda 1', 'GONDOLA_PAREDE', 0, 0.5, 1.1, 4, 3.2],
      ['GON-02', 'Gôndola 2', 'GONDOLA', 7, 2.5, 1.6, 4, 1.94],
      ['GON-03', 'Gôndola 3', 'GONDOLA', 10.5, 2.5, 1.6, 4, 1.94],
      ['GON-04', 'Gôndola 4', 'GONDOLA', 3.5, 8, 1.6, 4, 1.94],
      ['GON-05', 'Gôndola 5', 'GONDOLA', 7, 8, 1.6, 4, 1.94],
      ['GON-06', 'Gôndola 6', 'GONDOLA', 10.5, 8, 1.6, 4, 1.94],
      ['PIR-02', 'Pirâmide 2', 'PIRAMIDE', 14.5, 4.5, 1.02, 1.02, 1.94],
      ['PIR-03', 'Pirâmide 3', 'PIRAMIDE', 14.5, 6.5, 1.02, 1.02, 1.94],
      ['PIR-04', 'Pirâmide 4', 'PIRAMIDE', 14.5, 8.5, 1.02, 1.02, 1.94],
      ['PIR-05', 'Pirâmide 5', 'PIRAMIDE', 14.5, 10.5, 1.02, 1.02, 1.94],
      ['CX-02', 'Móvel de atendimento 2', 'CAIXA', 0, 15, 1.2, 1.8, 1.7],
      ['FILA-02', 'Móvel de fila 2', 'FILA', 1.5, 19, 1.5, 0.4, 1.46],
      ['FILA-03', 'Móvel de fila 3', 'FILA', 1.5, 17, 1.5, 0.4, 1.46],
      ['FILA-04', 'Móvel de fila 4', 'FILA', 3, 13, 1.5, 0.4, 1.46],
      ['FILA-05', 'Móvel de fila 5', 'FILA', 1.5, 15, 1.5, 0.4, 1.46],
      ['FILA-06', 'Móvel de fila 6', 'FILA', 3, 15, 1.5, 0.4, 1.46],
      ['FILA-07', 'Móvel de fila 7', 'FILA', 3, 19, 1.5, 0.4, 1.46],
      ['MESA3-01', 'Mesa destaque 3 frentes', 'MESA_3', 8.5, 14.5, 3.9, 1.4, 2.6],
      ['TOTEM-01', 'Totem', 'TOTEM', 7, 18.5, 0.35, 1.5, 3.4],
      ['PAR-03', 'Parede do fundo 3', 'GONDOLA_PAREDE', 8, -0.5, 4, 1.1, 3.2],
      ['FILA-09', 'Móvel de fila 9', 'FILA', 1.5, 13, 1.5, 0.4, 1.46],
      ['CX-03', 'Móvel de atendimento 3', 'CAIXA', 0, 13, 1.2, 1.8, 1.7],
      ['MAKE-01', 'Móvel make', 'MAKE', 0, 5, 1.4, 6, 3.2],
      ['PAR-04', 'Parede do fundo 4', 'GONDOLA_PAREDE', 12, -0.5, 4, 1.1, 3.2],
      ['ILHAOUI-01', 'Ilha premium O.U.i', 'ILHA_OUI', 13.5, 14, 3, 1.6, 3],
    ],
  },
};

/* --------------------------------------------------------------------------
 *  CICLO DE EXEMPLO (transcrito das telas de referência)
 *  Móvel: ID → [marca do móvel, [[etiqueta, marca da etiqueta], ...], símbolo]
 *  Planta "TODAS" vale para todas as plantas que tiverem aquele ID
 *  (uma linha da planta específica tem prioridade).
 *  Pirâmide e mesa destaque mostram 1 etiqueta; na gôndola inteira, as
 *  etiquetas 1–4 vão para Ponta 1, Meio A, Meio B e Ponta 2 (ETIQUETAS_POR_TIPO).
 * ------------------------------------------------------------------------ */

const EXEMPLO_CICLO = 'Ciclo exemplo';

const EXEMPLO_MOVIMENTOS = {
  TODAS: {
    'TOTEM-01': ['BOT', [['LÇTO UOMINI', 'BOT'], ['BOTIPROMO', 'BOT']]],
    'GON-01': ['MULTI', [['ITENS FIXOS', 'MULTI']], 'FIXO'],
    'GON-02': ['MULTI', [['CURTO PRAZO', 'MULTI']], 'FIXO'],
    'PIR-01': ['BOT', [['PRINCIPAIS OPORTUNIDADES', 'BOT']]],
    'PIR-02': ['EUD', [['MULTI PROMO', 'MULTI']]],
    'PIR-03': ['MULTI', [['CURTO PRAZO +PEC REGIONAL', 'MULTI']], 'FIXO'],
    'EXTRA-CESTINHAS': ['NEUTRO', [['LÇTO EGEO', 'BOT+QDB']]],
    'EXTRA-BELEZA': ['NEUTRO', [['BOTIPROMO MAKE B.', 'BOT'], ['LIQUIDA MAKE', 'QDB']]],
    'EXTRA-CAVALETE': ['NEUTRO', [['SIÀGE ULTIMATE', 'EUD']]],
  },
  '01': {
    'PAR-03': ['NEUTRO', [['CUIDADOS (NSPA)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PAR-04': ['NEUTRO', [['PERF MASC', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PAR-01': ['NEUTRO', [['CUIDADOS (CBEM)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'MAKE-01': ['NEUTRO', [['TESTEIRA MAKE MULTIPROMO', 'MULTI']]],
    'MAKE-01/TESTEIRA-1': ['#1F1F1F'],
    'MAKE-01/TESTEIRA-2': ['BOT'],
    'MAKE-01/TESTEIRA-3': ['QDB'],
    'MAKE-01/TESTEIRA-4': ['EUD'],
    'GON-01': ['BOT', [['BOTI PROMO', 'BOT'], ['BOTIK', 'BOT'], ['UOMINI HERO', 'BOT']], 'FIXO'],
    'GON-01/PONTA-2': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'MESA-01': ['MULTI', [['VM PERMANENTE MULTI PROMO', 'MULTI']]],
    'BALCAO-01': ['BOT', [['LÇTO EGEO', 'BOT+QDB']]],
    'PDV-01': ['EUD', [['SIÀGE ULTIMATE', 'EUD']]],
    'FILA-01': ['BOT', [['BOTIPROMO', 'BOT']]],
    'FILA-02': ['EUD', [['OUTLET EUD', 'EUD']]],
  },
  '02': {
    'PAR-01': ['NEUTRO', [['CUIDADOS (CBEM)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PAR-02': ['NEUTRO', [['PERF MASC', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PAR-03': ['NEUTRO', [['PERF FEM', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'MAKE-01': ['NEUTRO', [['TESTEIRA MAKE MULTIPROMO', 'MULTI']]],
    'MAKE-01/TESTEIRA-1': ['#1F1F1F'],
    'MAKE-01/TESTEIRA-2': ['BOT'],
    'MAKE-01/TESTEIRA-3': ['QDB'],
    'MAKE-01/TESTEIRA-4': ['EUD'],
    'GON-01': ['MULTI', [['ITENS FIXOS', 'MULTI'], ['CURTO PRAZO', 'MULTI'], ['MULTI PROMO', 'MULTI']], 'FIXO'],
    'GON-01/PONTA-2': ['BOT', [['BOTI PROMO', 'BOT']], 'MOVIMENTO'],
    'GON-02': ['EUD', [['OUTLET EUD', 'EUD'], ['PERFUMARIA', 'EUD'], ['CUIDADOS', 'EUD']], 'MOVIMENTO'],
    'GON-02/PONTA-2': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'PIR-03': ['BOT', [['ISCAS EXAUSTÃO', 'BOT']], 'MOVIMENTO'],
    'MESA-01': ['MULTI', [['VM PERMANENTE MULTI PROMO', 'MULTI']]],
    'OUI-01': ['OUI', [['MON AMIE + LOÇÃO', 'OUI']], 'EXPOSICAO'],
    'OUI-02': ['OUI', [['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
    'FILA-01': ['BOT', [['BOTIPROMO', 'BOT']]],
    'FILA-02': ['EUD', [['OUTLET EUD', 'EUD']]],
    'FILA-04': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'PDV-01': ['EUD', [['SIÀGE ULTIMATE', 'EUD']]],
    'BALCAO-01': ['BOT', [['LÇTO EGEO', 'BOT+QDB']]],
  },
  '03': {
    'PAR-01': ['NEUTRO', [['CUIDADOS (CBEM)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PAR-02': ['NEUTRO', [['PERF MASC', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'MAKE-01': ['NEUTRO', [['TESTEIRA MAKE MULTIPROMO', 'MULTI']]],
    'MAKE-01/TESTEIRA-1': ['#1F1F1F'],
    'MAKE-01/TESTEIRA-2': ['BOT'],
    'MAKE-01/TESTEIRA-3': ['QDB'],
    'MAKE-01/TESTEIRA-4': ['EUD'],
    'GON-01': ['BOT', [['BOTI PROMO', 'BOT'], ['BOTIK', 'BOT'], ['UOMINI HERO', 'BOT']], 'FIXO'],
    'GON-01/PONTA-2': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GON-02': ['EUD', [['OUTLET EUD', 'EUD'], ['PERFUMARIA', 'EUD'], ['CUIDADOS', 'EUD']], 'MOVIMENTO'],
    'GON-03': ['MULTI', [['MULTI PROMO', 'MULTI'], ['CURTO PRAZO', 'MULTI'], ['+PEC REGIONAL', 'MULTI']], 'MOVIMENTO'],
    'OUI-01': ['OUI', [['MON AMIE + LOÇÃO', 'OUI']], 'EXPOSICAO'],
    'OUI-02': ['OUI', [['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
    'MESA3-01': ['MULTI', [['VM PERMANENTE MULTI PROMO', 'MULTI'], ['UOMINI GLORIFICADO', 'BOT'], ['SIÀGE GLORIFICADO', 'EUD']]],
    'PDV-01': ['EUD', [['SIÀGE ULTIMATE', 'EUD']]],
    'BALCAO-01': ['BOT', [['LÇTO EGEO', 'BOT+QDB']]],
    'FILA-01': ['BOT', [['BOTIPROMO', 'BOT']]],
    'FILA-04': ['EUD', [['OUTLET EUD', 'EUD']]],
    'FILA-07': ['QDB', [['LIQUIDA QDB', 'QDB']]],
  },
  '04': {
    'PAR-01': ['NEUTRO', [['CUIDADOS (CBEM)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PAR-02': ['NEUTRO', [['PERF MASC', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PAR-03': ['NEUTRO', [['OUTLET EUD', 'EUD']]],
    'PAR-04': ['NEUTRO', [['CUIDADOS (NSPA)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PAR-05': ['NEUTRO', [['PERF FEM', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'MAKE-01': ['NEUTRO', [['TESTEIRA MAKE MULTIPROMO', 'MULTI']]],
    'MAKE-01/TESTEIRA-1': ['#1F1F1F'],
    'MAKE-01/TESTEIRA-2': ['BOT'],
    'MAKE-01/TESTEIRA-3': ['QDB'],
    'MAKE-01/TESTEIRA-4': ['EUD'],
    'GON-01': ['BOT', [['BOTI PROMO', 'BOT'], ['BOTIK', 'BOT'], ['UOMINI HERO', 'BOT']], 'FIXO'],
    'GON-01/PONTA-2': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GON-02': ['EUD', [['OUTLET EUD', 'EUD'], ['PERFUMARIA', 'EUD'], ['CUIDADOS', 'EUD']], 'MOVIMENTO'],
    'GON-03': ['MULTI', [['MULTI PROMO', 'MULTI'], ['CURTO PRAZO', 'MULTI'], ['+PEC REGIONAL', 'MULTI']], 'MOVIMENTO'],
    'GON-04': ['OUI', [['EXAUSTÃO OUI', 'OUI']], 'MOVIMENTO'],
    'GON-05': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GON-06': ['EUD', [['EXAUSTÃO EUD', 'EUD']], 'MOVIMENTO'],
    'PIR-04': ['MULTI', [['ISCAS EXAUSTÃO', 'EUD']], 'MOVIMENTO'],
    'PIR-05': ['BOT', [['ISCAS EXAUSTÃO', 'BOT']], 'MOVIMENTO'],
    'ILHAOUI-01': ['OUI', [['MON AMIE + LOÇÃO', 'OUI'], ['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
    'OUI-02': ['OUI', [['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
    'MESA3-01': ['MULTI', [['VM PERMANENTE MULTI PROMO', 'MULTI'], ['UOMINI GLORIFICADO', 'BOT'], ['SIÀGE GLORIFICADO', 'EUD']]],
    'PDV-01': ['EUD', [['SIÀGE ULTIMATE', 'EUD']]],
    'BALCAO-01': ['BOT', [['LÇTO EGEO', 'BOT+QDB']]],
    'FILA-01': ['BOT', [['BOTIPROMO', 'BOT']]],
    'FILA-04': ['EUD', [['OUTLET EUD', 'EUD']]],
    'FILA-07': ['QDB', [['LIQUIDA QDB', 'QDB']]],
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
  ['TODAS', 'CALLOUT', 'TESTEIRA MAKE MULTIPROMO - BOTI COM BOTIPROMO MAKE.B EUDORA COM OUTLET E QDB COM LIQUIDA', 'MULTI', 'MAKE-01'],
  ['TODAS', 'CALLOUT', TEXTO_CALLOUT_BOTIPROMO, 'BOT', 'PAR-02'],
  ['TODAS', 'CALLOUT', 'VMS COMPLEMENTARES DIRECIONADOS PARA O OUTLET. USAR ESSA LISTA DE PRIORIDADE COMO DIRECIONAL.', 'EUD', 'PAR-01'],
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
