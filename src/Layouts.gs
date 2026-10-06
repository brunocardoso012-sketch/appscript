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
 *          (meios divididos da gôndola: '', 'A', 'B' ou 'AB')]
 *  O botão "Baixar código da loja" (modo Construir loja) gera este mesmo formato.
 */

const LAYOUT_PADRAO = {
  '01': {
    loja: [16, 14, 4.4], // largura (X), profundidade (Y), altura das paredes
    moveis: [
      ['PE-01', 'Parede esquerda – Cuidados (NSPA)', 'GONDOLA_PAREDE', 0, 0.2, 1.1, 3.3, 3.8],
      ['PE-02', 'Parede esquerda – Perfumaria masculina', 'GONDOLA_PAREDE', 0, 3.5, 1.1, 3.3, 3.8],
      ['PE-03', 'Parede esquerda – Perfumaria feminina', 'GONDOLA_PAREDE', 0, 6.8, 1.1, 3.3, 3.8],
      ['PE-04', 'Parede esquerda – Maquiagem (testeira Make)', 'GONDOLA_PAREDE', 0, 10.1, 1.1, 3.7, 3.8],
      ['PF-01', 'Parede fundo – Cuidados (CBEM)', 'GONDOLA_PAREDE', 1.2, 0, 3.6, 1.1, 3.8],
      ['PF-02', 'Parede fundo – Outlet', 'GONDOLA_PAREDE', 4.8, 0, 3.8, 1.1, 3.8],
      ['PF-03', 'Parede fundo – módulo 3', 'GONDOLA_PAREDE', 8.6, 0, 3.8, 1.1, 3.8],
      ['PF-05', 'Parede fundo – módulo 4', 'GONDOLA_PAREDE', 12.4, 0, 3.5, 1.1, 3.8],
      ['ILHA-06', 'Ilha central – cabeceira do fundo', 'GONDOLA', 5.2, 5, 0.6, 3, 3.2],
      ['ILHA-01', 'Ilha central – Botik', 'GONDOLA', 5.8, 6.5, 2.4, 1.5, 3.2],
      ['ILHA-02', 'Ilha central – Uomini', 'GONDOLA', 8.2, 6.5, 2.2, 1.5, 3.2],
      ['ILHA-03', 'Ilha central – lado do fundo (QDB)', 'GONDOLA', 5.8, 5, 4.6, 1.5, 3.2],
      ['ILHA-05', 'Ilha central – cabeceira frente (O.U.i)', 'GONDOLA', 10.4, 5, 0.7, 3, 3.2],
      ['ILHA-04', 'Ilha central – topo multimarca', 'GONDOLA', 5.8, 5, 4.6, 3, 0.4, 3.2],
      ['GON-01', 'Gôndola esquerda – lado A (Itens fixos)', 'GONDOLA', 2.6, 7.6, 3, 1, 2.6],
      ['GON-02', 'Gôndola esquerda – lado B (Curto prazo)', 'GONDOLA', 2.6, 8.6, 3, 1, 2.6],
      ['CX-01', 'Caixa 1', 'CAIXA', 2.4, 12.2, 1.8, 1.2, 1.7],
      ['CX-02', 'Caixa 2', 'CAIXA', 4.5, 12.2, 1.8, 1.2, 1.7],
      ['TOTEM-01', 'Totem próximo aos caixas', 'TOTEM', 7.2, 12.4, 1.5, 0.35, 3.4],
      ['CUBO-SIAGE', 'Cubo expositor Siàge', 'CUBO', 8.4, 10.2, 1.3, 1.3, 1.9],
      ['MESA-VM', 'Mesa VM permanente', 'MESA', 10.6, 8.6, 2.4, 2.2, 1.5],
      ['VITRINE', 'Vitrine em L (entrada)', 'VITRINE_L', 10.8, 11.2, 3.4, 2.6, 2.4],
      ['PIR-01', 'Pirâmide 1 (principais oportunidades)', 'PIRAMIDE', 13.12, 3.72, 0.96, 0.96, 2.16],
      ['PIR-02', 'Pirâmide 2', 'PIRAMIDE', 13.92, 7.12, 0.96, 0.96, 2.16],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
    ],
  },

  '02': {
    loja: [22, 19, 4.6],
    moveis: [
      ['PE-01', 'Parede esquerda – Cuidados (NSPA)', 'GONDOLA_PAREDE', 0, 0.2, 1.1, 3.8, 3.8],
      ['PE-02', 'Parede esquerda – Perfumaria masculina', 'GONDOLA_PAREDE', 0, 4, 1.1, 3.8, 3.8],
      ['PE-03', 'Parede esquerda – Perfumaria feminina', 'GONDOLA_PAREDE', 0, 7.8, 1.1, 3.8, 3.8],
      ['PE-04', 'Parede esquerda – Maquiagem (testeira Make)', 'GONDOLA_PAREDE', 0, 11.6, 1.1, 7, 3.8],
      ['PF-01', 'Parede fundo – Cuidados (CBEM)', 'GONDOLA_PAREDE', 1.2, 0, 4.2, 1.1, 3.8],
      ['PF-02', 'Parede fundo – Outlet', 'GONDOLA_PAREDE', 5.4, 0, 4.4, 1.1, 3.8],
      ['PF-03', 'Parede fundo – módulo 3', 'GONDOLA_PAREDE', 9.8, 0, 4.4, 1.1, 3.8],
      ['PF-05', 'Parede fundo – módulo 4', 'GONDOLA_PAREDE', 14.2, 0, 4, 1.1, 3.8],
      ['PF-04', 'Painel O.U.i (parede do fundo)', 'PAINEL', 18.4, 0, 3.4, 0.6, 5],
      ['ILHA-06', 'Ilha central – cabeceira do fundo', 'GONDOLA', 5.4, 4.6, 0.6, 3, 3.2],
      ['ILHA-01', 'Ilha central – Botik', 'GONDOLA', 6, 6.1, 2.4, 1.5, 3.2],
      ['ILHA-02', 'Ilha central – Uomini', 'GONDOLA', 8.4, 6.1, 2.4, 1.5, 3.2],
      ['ILHA-03', 'Ilha central – lado do fundo (QDB)', 'GONDOLA', 6, 4.6, 4.8, 1.5, 3.2],
      ['ILHA-04', 'Ilha central – topo multimarca', 'GONDOLA', 6, 4.6, 4.8, 3, 0.4, 3.2],
      ['ILHA-07', 'Ilha central – lado do fundo (Eudora)', 'GONDOLA', 10.8, 4.6, 2.6, 1.5, 3.2],
      ['ILHA-09', 'Ilha central – frente (perfumaria)', 'GONDOLA', 10.8, 6.1, 2.6, 1.5, 3.2],
      ['ILHA-08', 'Ilha central – cabeceira frente', 'GONDOLA', 13.4, 4.6, 0.7, 3, 3.2],
      ['ILHA-10', 'Ilha frontal – Make', 'GONDOLA', 8.2, 9.2, 3.2, 1.4, 3],
      ['GON-01', 'Gôndola esquerda – lado A (Itens fixos)', 'GONDOLA', 2.8, 9.4, 3, 1, 2.8],
      ['GON-02', 'Gôndola esquerda – lado B (Curto prazo)', 'GONDOLA', 2.8, 10.4, 3, 1, 2.8],
      ['PONTA-01', 'Ponta da gôndola esquerda', 'GONDOLA', 5.8, 9.4, 0.7, 2, 2.8],
      ['PONTA-02', 'Gôndola baixa esquerda', 'GONDOLA', 4.6, 12.6, 2.2, 1.2, 2.4],
      ['CX-01', 'Caixa 1', 'CAIXA', 2.4, 17, 1.8, 1.2, 1.7],
      ['CX-02', 'Caixa 2', 'CAIXA', 4.5, 17, 1.8, 1.2, 1.7],
      ['CX-03', 'Caixa 3', 'CAIXA', 6.6, 17, 1.8, 1.2, 1.7],
      ['TOTEM-01', 'Totem próximo aos caixas', 'TOTEM', 9.4, 16.2, 1.5, 0.35, 3.4],
      ['CUBO-SIAGE', 'Cubo expositor Siàge', 'CUBO', 10.6, 14.2, 1.3, 1.3, 1.9],
      ['OUI-01', 'Expositor O.U.i (frente)', 'PAINEL', 12, 12.6, 0.8, 1.6, 3.8],
      ['MESA-VM', 'Mesa VM permanente', 'MESA', 14, 9.8, 2.6, 2.4, 1.5],
      ['VITRINE', 'Vitrine em L (entrada)', 'VITRINE_L', 14.6, 14.6, 3.6, 3, 2.4],
      ['PIR-01', 'Pirâmide 1 (principais oportunidades)', 'PIRAMIDE', 16.74, 4.34, 1.02, 1.02, 2.16],
      ['PIR-02', 'Pirâmide 2', 'PIRAMIDE', 19.54, 6.94, 1.02, 1.02, 2.16],
      ['PIR-03', 'Pirâmide 3 (PEC regional)', 'PIRAMIDE', 17.94, 10.74, 1.02, 1.02, 2.16],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
    ],
  },

  '03': {
    loja: [24, 20, 4.6],
    moveis: [
      ['PE-01', 'Parede esquerda – Cuidados (NSPA)', 'GONDOLA_PAREDE', 0, 0.2, 1.1, 4, 3.8],
      ['PE-02', 'Parede esquerda – Perfumaria masculina', 'GONDOLA_PAREDE', 0, 4.2, 1.1, 4, 3.8],
      ['PE-03', 'Parede esquerda – Perfumaria feminina', 'GONDOLA_PAREDE', 0, 8.2, 1.1, 4, 3.8],
      ['PE-04', 'Parede esquerda – Maquiagem (testeira Make)', 'GONDOLA_PAREDE', 0, 12.2, 1.1, 7.4, 3.8],
      ['PF-01', 'Parede fundo – Cuidados (CBEM)', 'GONDOLA_PAREDE', 1.2, 0, 4.6, 1.1, 3.8],
      ['PF-02', 'Parede fundo – Outlet', 'GONDOLA_PAREDE', 5.8, 0, 4.8, 1.1, 3.8],
      ['PF-03', 'Parede fundo – módulo 3', 'GONDOLA_PAREDE', 10.6, 0, 4.8, 1.1, 3.8],
      ['PF-05', 'Parede fundo – módulo 4', 'GONDOLA_PAREDE', 15.4, 0, 4.6, 1.1, 3.8],
      ['PF-04', 'Painel O.U.i (parede do fundo)', 'PAINEL', 20.2, 0, 3.6, 0.6, 5],
      ['ILHA-06', 'Ilha central – cabeceira do fundo', 'GONDOLA', 5.4, 4.6, 0.6, 3, 3.2],
      ['ILHA-01', 'Ilha central – Botik', 'GONDOLA', 6, 6.1, 2.4, 1.5, 3.2],
      ['ILHA-02', 'Ilha central – Uomini', 'GONDOLA', 8.4, 6.1, 2.4, 1.5, 3.2],
      ['ILHA-03', 'Ilha central – lado do fundo (QDB)', 'GONDOLA', 6, 4.6, 4.8, 1.5, 3.2],
      ['ILHA-04', 'Ilha central – topo multimarca', 'GONDOLA', 6, 4.6, 4.8, 3, 0.4, 3.2],
      ['ILHA-11', 'Ilha central – lado do fundo (NSPA)', 'GONDOLA', 10.8, 4.6, 3, 1.5, 3.2],
      ['ILHA-09', 'Ilha central – frente (perfumaria)', 'GONDOLA', 10.8, 6.1, 3, 1.5, 3.2],
      ['ILHA-10', 'Ilha frontal – Make', 'GONDOLA', 8.2, 9.2, 3.4, 1.4, 3],
      ['ILHA-15', 'Ilha Eudora – cabeceira', 'GONDOLA', 15.2, 6.4, 0.7, 3, 3.2],
      ['ILHA-12', 'Ilha Eudora – cuidados', 'GONDOLA', 15.9, 6.4, 2.6, 1.5, 3.2],
      ['ILHA-13', 'Ilha Eudora – make', 'GONDOLA', 18.5, 6.4, 2.6, 1.5, 3.2],
      ['ILHA-14', 'Ilha Eudora – perfumaria', 'GONDOLA', 15.9, 7.9, 5.2, 1.5, 3.2],
      ['GON-01', 'Gôndola esquerda – lado A (Itens fixos)', 'GONDOLA', 2.8, 9.6, 3, 1, 2.8],
      ['GON-02', 'Gôndola esquerda – lado B (Curto prazo)', 'GONDOLA', 2.8, 10.6, 3, 1, 2.8],
      ['PONTA-01', 'Ponta da gôndola esquerda', 'GONDOLA', 5.8, 9.6, 0.7, 2, 2.8],
      ['PONTA-02', 'Gôndola baixa esquerda', 'GONDOLA', 4.6, 12.8, 2.2, 1.2, 2.4],
      ['CX-01', 'Caixa 1', 'CAIXA', 2.4, 18, 1.8, 1.2, 1.7],
      ['CX-02', 'Caixa 2', 'CAIXA', 4.5, 18, 1.8, 1.2, 1.7],
      ['CX-03', 'Caixa 3', 'CAIXA', 6.6, 18, 1.8, 1.2, 1.7],
      ['TOTEM-01', 'Totem próximo aos caixas', 'TOTEM', 9.6, 17.2, 1.5, 0.35, 3.4],
      ['CUBO-SIAGE', 'Cubo expositor Siàge', 'CUBO', 10.8, 15.2, 1.3, 1.3, 1.9],
      ['OUI-01', 'Expositor O.U.i (frente)', 'PAINEL', 12.2, 13.4, 0.8, 1.6, 3.8],
      ['MESA-VM', 'Mesa VM permanente', 'MESA', 14.4, 12.6, 2.6, 2.4, 1.5],
      ['VITRINE', 'Vitrine em L (entrada)', 'VITRINE_L', 15.6, 15.8, 3.6, 3, 2.4],
      ['PIR-01', 'Pirâmide 1 (principais oportunidades)', 'PIRAMIDE', 21.74, 8.74, 1.02, 1.02, 2.16],
      ['PIR-02', 'Pirâmide 2', 'PIRAMIDE', 19.74, 13.54, 1.02, 1.02, 2.16],
      ['PIR-03', 'Pirâmide 3 (PEC regional)', 'PIRAMIDE', 20.14, 10.94, 1.02, 1.02, 2.16],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
    ],
  },

  '04': {
    loja: [28, 22, 4.6],
    moveis: [
      ['PE-01', 'Parede esquerda – Cuidados (NSPA)', 'GONDOLA_PAREDE', 0, 0.2, 1.1, 4.2, 3.8],
      ['PE-02', 'Parede esquerda – Perfumaria masculina', 'GONDOLA_PAREDE', 0, 4.4, 1.1, 4.2, 3.8],
      ['PE-03', 'Parede esquerda – Perfumaria feminina', 'GONDOLA_PAREDE', 0, 8.6, 1.1, 4.2, 3.8],
      ['PE-04', 'Parede esquerda – Maquiagem (testeira Make)', 'GONDOLA_PAREDE', 0, 12.8, 1.1, 8.8, 3.8],
      ['PF-01', 'Parede fundo – Cuidados (CBEM)', 'GONDOLA_PAREDE', 1.2, 0, 5.2, 1.1, 3.8],
      ['PF-02', 'Parede fundo – Outlet', 'GONDOLA_PAREDE', 6.4, 0, 5.4, 1.1, 3.8],
      ['PF-03', 'Parede fundo – módulo 3', 'GONDOLA_PAREDE', 11.8, 0, 5.4, 1.1, 3.8],
      ['PF-05', 'Parede fundo – módulo 4', 'GONDOLA_PAREDE', 17.2, 0, 5.4, 1.1, 3.8],
      ['PF-06', 'Parede fundo – módulo 5', 'GONDOLA_PAREDE', 22.6, 0, 5.2, 1.1, 3.8],
      ['ILHA-06', 'Ilha central – cabeceira do fundo', 'GONDOLA', 5.4, 4.4, 0.6, 3, 3.2],
      ['ILHA-03', 'Ilha central – lado do fundo (QDB)', 'GONDOLA', 6, 4.4, 2.4, 1.5, 3.2],
      ['ILHA-16', 'Ilha central – lado do fundo (recompra)', 'GONDOLA', 8.4, 4.4, 2.4, 1.5, 3.2],
      ['ILHA-01', 'Ilha central – Botik', 'GONDOLA', 6, 5.9, 2.4, 1.5, 3.2],
      ['ILHA-02', 'Ilha central – Uomini', 'GONDOLA', 8.4, 5.9, 2.4, 1.5, 3.2],
      ['ILHA-04', 'Ilha central – topo multimarca', 'GONDOLA', 6, 4.4, 4.8, 3, 0.4, 3.2],
      ['ILHA-17', 'Ilha central – multimarca (fundo)', 'GONDOLA', 10.8, 4.4, 2.4, 1.5, 3.2],
      ['ILHA-18', 'Ilha central – multimarca (frente)', 'GONDOLA', 10.8, 5.9, 2.4, 1.5, 3.2],
      ['ILHA-11', 'Ilha central – lado do fundo (NSPA)', 'GONDOLA', 13.2, 4.4, 2.8, 1.5, 3.2],
      ['ILHA-20', 'Ilha central – Uomini hero', 'GONDOLA', 13.2, 5.9, 2.8, 1.5, 3.2],
      ['ILHA-19', 'Ilha frontal – multimarca', 'GONDOLA', 6.4, 8.8, 2.2, 1.4, 3],
      ['ILHA-10', 'Ilha frontal – Make', 'GONDOLA', 8.6, 8.8, 2.6, 1.4, 3],
      ['ILHA-09', 'Ilha frontal – perfumaria', 'GONDOLA', 11.2, 8.8, 2.6, 1.4, 3],
      ['ILHA-21', 'Ilha frontal – Boti promo', 'GONDOLA', 13.8, 8.8, 2.4, 1.4, 3],
      ['HEROS', 'Espaço Heros', 'GONDOLA', 11.6, 11.2, 2.4, 1.4, 3],
      ['PRESENTEAR', 'Espaço Presentear', 'GONDOLA', 14, 11.2, 2.4, 1.4, 3],
      ['ILHA-15', 'Ilha Eudora – cabeceira', 'GONDOLA', 17.4, 5.6, 0.7, 3, 3.2],
      ['ILHA-12', 'Ilha Eudora – cuidados', 'GONDOLA', 18.1, 5.6, 2.8, 1.5, 3.2],
      ['ILHA-13', 'Ilha Eudora – make', 'GONDOLA', 20.9, 5.6, 2.8, 1.5, 3.2],
      ['ILHA-14', 'Ilha Eudora – perfumaria', 'GONDOLA', 18.1, 7.1, 2.8, 1.5, 3.2],
      ['ILHA-23', 'Ilha Eudora – outlet', 'GONDOLA', 20.9, 7.1, 2.8, 1.5, 3.2],
      ['ILHA-22', 'Ilha Eudora – cabeceira Siàge', 'GONDOLA', 23.7, 5.6, 0.7, 3, 3.2],
      ['ILHA-24', 'Gôndola curto prazo (direita)', 'GONDOLA', 18.6, 10.2, 3.4, 1.4, 3],
      ['GON-01', 'Gôndola esquerda – Itens fixos', 'GONDOLA', 3, 10.2, 3, 1.1, 2.8],
      ['GON-02', 'Gôndola esquerda – Curto prazo', 'GONDOLA', 6, 10.2, 3, 1.1, 2.8],
      ['PONTA-01', 'Ponta da gôndola esquerda', 'GONDOLA', 9, 10.2, 0.7, 1.1, 2.8],
      ['PONTA-02', 'Gôndola baixa esquerda', 'GONDOLA', 7, 12.4, 2.4, 1.2, 2.4],
      ['GON-03', 'Gôndola frente – multimarca', 'GONDOLA', 2.8, 14, 2, 1.3, 2.6],
      ['GON-04', 'Gôndola frente – exaustão O.U.i', 'GONDOLA', 4.8, 14, 2, 1.3, 2.6],
      ['GON-05', 'Gôndola frente – QDB', 'GONDOLA', 6.8, 14, 2, 1.3, 2.6],
      ['GON-06', 'Gôndola frente – exaustão Eudora', 'GONDOLA', 8.8, 14, 2, 1.3, 2.6],
      ['OUI-01', 'Módulo O.U.i central', 'GONDOLA', 12, 13.6, 3.4, 2.4, 4],
      ['OUI-02', 'Módulo O.U.i central – lateral', 'PAINEL', 11.2, 13.6, 0.8, 2.4, 4],
      ['CX-01', 'Caixa 1', 'CAIXA', 2.4, 19.8, 1.8, 1.2, 1.7],
      ['CX-02', 'Caixa 2', 'CAIXA', 4.5, 19.8, 1.8, 1.2, 1.7],
      ['CX-03', 'Caixa 3', 'CAIXA', 6.6, 19.8, 1.8, 1.2, 1.7],
      ['TOTEM-01', 'Totem próximo aos caixas', 'TOTEM', 9.6, 19, 1.5, 0.35, 3.4],
      ['CUBO-SIAGE', 'Cubo expositor Siàge', 'CUBO', 10.6, 17.4, 1.3, 1.3, 1.9],
      ['MESA-VM', 'Mesa VM permanente', 'MESA', 14.4, 17.4, 2.8, 2.4, 1.5],
      ['VITRINE', 'Vitrine em L (entrada)', 'VITRINE_L', 18, 18.2, 3.8, 3, 2.4],
      ['PIR-04', 'Pirâmide 4 (iscas exaustão)', 'PIRAMIDE', 18.14, 13.94, 1.02, 1.02, 2.16],
      ['PIR-03', 'Pirâmide 3 (PEC regional)', 'PIRAMIDE', 21.34, 15.74, 1.02, 1.02, 2.16],
      ['PIR-02', 'Pirâmide 2', 'PIRAMIDE', 23.54, 12.74, 1.02, 1.02, 2.16],
      ['PIR-05', 'Pirâmide 5 (iscas exaustão)', 'PIRAMIDE', 24.74, 9.54, 1.02, 1.02, 2.16],
      ['PIR-01', 'Pirâmide 1 (principais oportunidades)', 'PIRAMIDE', 26.14, 5.74, 1.02, 1.02, 2.16],
      ['EXTRA-CESTINHAS', 'Cestinhas', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-BELEZA', 'Espaço da Beleza', 'EXTRA', 0, 0, 1, 1, 1],
      ['EXTRA-CAVALETE', 'Cavalete', 'EXTRA', 0, 0, 1, 1, 1],
    ],
  },
};

/* --------------------------------------------------------------------------
 *  CICLO DE EXEMPLO (transcrito das telas de referência)
 *  Móvel: ID → [marca do móvel, [[etiqueta, marca da etiqueta], ...], símbolo]
 *  Planta "TODAS" vale para todas as plantas que tiverem aquele ID
 *  (uma linha da planta específica tem prioridade).
 * ------------------------------------------------------------------------ */

const EXEMPLO_CICLO = 'Ciclo exemplo';

const EXEMPLO_MOVIMENTOS = {
  TODAS: {
    'PE-01': ['NEUTRO', [['CUIDADOS (NSPA)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PE-02': ['NEUTRO', [['PERF MASC', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PE-03': ['NEUTRO', [['PERF FEM', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'PF-01': ['NEUTRO', [['CUIDADOS (CBEM)', 'BOT'], ['MULTI PROMO', 'MULTI']]],
    'TOTEM-01': ['BOT', [['LÇTO UOMINI', 'BOT'], ['BOTIPROMO', 'BOT']]],
    'CUBO-SIAGE': ['EUD', [['SIÀGE ULTIMATE', 'EUD']]],
    'MESA-VM': ['MULTI', [
      ['VM PERMANENTE MULTI PROMO', 'MULTI'], ['UOMINI GLORIFICADO', 'BOT'],
      ['SIÀGE GLORIFICADO', 'EUD'], ['VERSO: LÇTO EGEO', 'BOT+QDB'],
    ]],
    'VITRINE': ['BOT', [['LÇTO EGEO', 'BOT+QDB']]],
    'ILHA-06': ['BOT', [['EGEO + QDB JUICY MOOD', 'BOT+QDB']]],
    'ILHA-01': ['BOT', [['BOTIK', 'BOT']], 'FIXO'],
    'ILHA-04': ['MULTI', [['MULTI PROMO', 'MULTI'], ['BOT + EUD + OUI', 'MULTI']]],
    'ILHA-03': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GON-01': ['MULTI', [['ITENS FIXOS', 'MULTI']], 'FIXO'],
    'GON-02': ['MULTI', [['CURTO PRAZO', 'MULTI']], 'FIXO'],
    'PIR-01': ['BOT', [['BOTI PROMO', 'BOT'], ['OUTLET EUD', 'EUD'], ['PRINCIPAIS OPORTUNIDADES', 'EUD']]],
    'PIR-02': ['EUD', [['MULTI PROMO', 'MULTI'], ['BOT + EUD + OUI', 'MULTI']]],
    'PIR-03': ['MULTI', [['CURTO PRAZO', 'MULTI'], ['+PEC REGIONAL', 'MULTI']], 'FIXO'],
    'PF-04': ['OUI', [['MON AMIE + LOÇÃO', 'OUI'], ['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
    'EXTRA-CESTINHAS': ['NEUTRO', [['LÇTO EGEO', 'BOT+QDB']]],
    'EXTRA-BELEZA': ['NEUTRO', [['BOTIPROMO MAKE B.', 'BOT'], ['LIQUIDA MAKE', 'QDB']]],
    'EXTRA-CAVALETE': ['NEUTRO', [['SIÀGE ULTIMATE', 'EUD']]],
  },
  '01': {
    'ILHA-02': ['BOT', [['UOMINI', 'BOT']]],
    'ILHA-05': ['OUI', [['MON AMIE + LOÇÃO', 'OUI'], ['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
    'CX-01': ['NEUTRO', []],
    'CX-02': ['NEUTRO', []],
  },
  '02': {
    'ILHA-02': ['BOT', [['UOMINI HERO', 'BOT']]],
    'ILHA-07': ['EUD', [['OUTLET EUD', 'EUD'], ['PERFUMARIA', 'EUD']], 'MOVIMENTO'],
    'ILHA-08': ['EUD', [['SIÀGE ULTIMATE', 'EUD'], ['+OUTLET CABELO', 'EUD']], 'MOVIMENTO'],
    'ILHA-09': ['BOT', [['BOTI PROMO', 'BOT'], ['PERFUMARIA', 'BOT']], 'MOVIMENTO'],
    'ILHA-10': ['BOT', [['BOTI PROMO', 'BOT'], ['MAKE', 'BOT']], 'MOVIMENTO'],
    'PONTA-01': ['EUD', [['OUTLET EUD', 'EUD']], 'MOVIMENTO'],
    'PONTA-02': ['BOT', [['BOTI PROMO', 'BOT']], 'MOVIMENTO'],
    'OUI-01': ['OUI', [['Hôtel de Ville 193', 'OUI'], ['MON AMIE + LOÇÃO', 'OUI']], 'EXPOSICAO'],
  },
  '03': {
    'ILHA-02': ['BOT', [['UOMINI HERO', 'BOT']]],
    'ILHA-11': ['BOT', [['BOTI PROMO', 'BOT'], ['NSPA LOÇÕES E REFIS', 'BOT'], ['UOMINI', 'BOT']], 'MOVIMENTO'],
    'ILHA-09': ['BOT', [['BOTI PROMO', 'BOT'], ['PERFUMARIA', 'BOT']]],
    'ILHA-10': ['BOT', [['BOTI PROMO', 'BOT'], ['MAKE', 'BOT']]],
    'ILHA-15': ['EUD', [['SIÀGE ULTIMATE', 'EUD'], ['+OUTLET CABELO', 'EUD']]],
    'ILHA-12': ['EUD', [['OUTLET EUD', 'EUD'], ['CUIDADOS', 'EUD']], 'MOVIMENTO'],
    'ILHA-13': ['EUD', [['OUTLET EUD', 'EUD'], ['MAKE', 'EUD']], 'MOVIMENTO'],
    'ILHA-14': ['EUD', [['OUTLET EUD', 'EUD'], ['PERFUMARIA', 'EUD']]],
    'PONTA-01': ['EUD', [['OUTLET EUD', 'EUD']]],
    'PONTA-02': ['BOT', [['BOTI PROMO', 'BOT']]],
    'OUI-01': ['OUI', [['Hôtel de Ville 193', 'OUI'], ['MON AMIE + LOÇÃO', 'OUI']], 'EXPOSICAO'],
  },
  '04': {
    'ILHA-02': ['BOT', [['UOMINI HERO', 'BOT']]],
    'ILHA-16': ['MULTI', [['QUEM COMPRA, RECOMPRA', 'MULTI']], 'FIXO'],
    'ILHA-17': ['MULTI', [['MULTI PROMO', 'MULTI'], ['+PEC REGIONAL', 'MULTI']], 'MOVIMENTO'],
    'ILHA-18': ['MULTI', [['MULTI PROMO', 'MULTI']], 'MOVIMENTO'],
    'ILHA-11': ['BOT', [['BOTI PROMO', 'BOT'], ['NSPA LOÇÕES E REFIS', 'BOT']]],
    'ILHA-20': ['BOT', [['UOMINI HERO', 'BOT']]],
    'ILHA-19': ['MULTI', [['MULTI PROMO', 'MULTI']], 'MOVIMENTO'],
    'ILHA-10': ['BOT', [['BOTI PROMO', 'BOT'], ['MAKE', 'BOT']]],
    'ILHA-09': ['BOT', [['BOTI PROMO', 'BOT'], ['PERFUMARIA', 'BOT']]],
    'ILHA-21': ['BOT', [['BOTI PROMO', 'BOT']], 'MOVIMENTO'],
    'HEROS': ['MULTI', [['HEROS', 'MULTI']], 'NOVO'],
    'PRESENTEAR': ['MULTI', [['PRESENTEAR', 'MULTI']], 'FIXO'],
    'ILHA-15': ['EUD', [['SIÀGE ULTIMATE', 'EUD'], ['+OUTLET CABELO', 'EUD']]],
    'ILHA-12': ['EUD', [['OUTLET EUD | CUIDADOS', 'EUD']]],
    'ILHA-13': ['EUD', [['OUTLET EUD | MAKE', 'EUD']]],
    'ILHA-14': ['EUD', [['OUTLET EUD', 'EUD'], ['PERFUMARIA', 'EUD']]],
    'ILHA-23': ['EUD', [['OUTLET EUD', 'EUD']], 'MOVIMENTO'],
    'ILHA-22': ['EUD', [['SIÀGE BASELINE', 'EUD']], 'FIXO'],
    'ILHA-24': ['MULTI', [['CURTO PRAZO', 'MULTI']], 'FIXO'],
    'GON-01': ['MULTI', [['ITENS FIXOS', 'MULTI']], 'FIXO'],
    'GON-02': ['MULTI', [['CURTO PRAZO', 'MULTI']], 'FIXO'],
    'PONTA-01': ['EUD', [['OUTLET EUD', 'EUD']]],
    'PONTA-02': ['BOT', [['BOTI PROMO', 'BOT']]],
    'GON-03': ['MULTI', [['MULTI PROMO', 'MULTI']], 'MOVIMENTO'],
    'GON-04': ['OUI', [['EXAUSTÃO OUI', 'OUI']], 'MOVIMENTO'],
    'GON-05': ['QDB', [['LIQUIDA QDB', 'QDB']]],
    'GON-06': ['EUD', [['EXAUSTÃO EUD', 'EUD']], 'MOVIMENTO'],
    'OUI-01': ['OUI', [['MON AMIE + LOÇÃO', 'OUI'], ['Hôtel de Ville 193', 'OUI']], 'EXPOSICAO'],
    'OUI-02': ['OUI', [['Hôtel de Ville 193', 'OUI'], ['MON AMIE + LOÇÃO', 'OUI']], 'EXPOSICAO'],
    'PIR-04': ['MULTI', [['OUTLET EUD', 'EUD'], ['ISCAS EXAUSTÃO', 'EUD']], 'MOVIMENTO'],
    'PIR-05': ['BOT', [['BOTI PROMO', 'BOT'], ['ISCAS EXAUSTÃO', 'BOT']], 'MOVIMENTO'],
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
  ['TODAS', 'CALLOUT', 'TESTEIRA MAKE MULTIPROMO - BOTI COM BOTIPROMO MAKE.B EUDORA COM OUTLET E QDB COM LIQUIDA', 'MULTI', 'PE-04'],
  ['TODAS', 'CALLOUT', TEXTO_CALLOUT_BOTIPROMO, 'BOT', 'PE-02'],
  ['TODAS', 'CALLOUT', 'VMS COMPLEMENTARES DIRECIONADOS PARA O OUTLET. USAR ESSA LISTA DE PRIORIDADE COMO DIRECIONAL.', 'EUD', 'PF-02'],
  ['01', 'NOTA', 'Destaque PN: Comunicar promo como movimento MM nos espaços destaque', '', ''],
  ['01', 'NOTA', 'Pirâmide principais oportunidades: Itens de alta frequência na promo', '', ''],
  ['02', 'NOTA', 'PEC REGIONAL: Regionalização de exposição SP e NE.', '', ''],
  ['02', 'NOTA', 'Pirâmide: NE exposição de masculino e SP Masculino + Lily', '', ''],
  ['03', 'NOTA', 'PEC REGIONAL: Regionalização de exposição SP e NE.', '', ''],
  ['03', 'NOTA', 'Pirâmide: NE exposição de masculino e SP Masculino + Lily', '', ''],
  ['04', 'NOTA', 'PEC REGIONAL: Regionalização de exposição SP e NE.', '', ''],
  ['04', 'NOTA', 'Meio de gôndola: exclusivo NE, exposição de Lily.', '', ''],
  ['04', 'NOTA', 'Pirâmide: NE exposição de masculino e SP Masculino + Lily', '', ''],
  ['04', 'NOTA', 'Heros: Espaço para trabalhar exposição de itens hero considerando as categorias/marcas que precisem de reação no período. Trabalhar combos cross marca', '', ''],
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
        largura: m[5], profundidade: m[6], altura: m[7], ajusteX: m[9] || 0, ajusteY: m[10] || 0, dividido: m[11] || '',
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
