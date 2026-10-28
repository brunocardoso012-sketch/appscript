/**
 * ============================================================================
 *  PRATELEIRAS (os quadrados de cada prateleira e os produtos de cada quadrado)
 * ============================================================================
 *  Depois da estratégia dos movimentos (que movimento fica em cada espaço), o
 *  construtor de planogramas desenha o planograma de cada prateleira: quadrados
 *  lado a lado, na altura toda da prateleira (início e largura, em % dela; um
 *  quadrado não fica em cima de outro) e, em cada quadrado, o movimento e
 *  os produtos, escolhidos na aba "Produtos" (o catálogo: SKU, nome, marca,
 *  categoria e movimento). Todo mundo vê na tela do móvel (Prateleira.html);
 *  só o construtor edita, num ciclo publicado ou num ciclo em construção que
 *  ainda não foi enviado.
 *
 *  Ficam na aba "Prateleiras", uma linha por produto de cada quadrado (o
 *  quadrado sem produto tem uma linha sem SKU). Cada ER tem as suas linhas:
 *  "Vale em todas as ERs" grava as mesmas prateleiras em cada ER que tem o
 *  espaço. Este arquivo só tem regras sobre matrizes: quem lê e grava as abas é
 *  o Code.gs e, na versão web, o web/backend-local.js
 *  (executarPrateleiras_, com o leitor / gravador de cada um).
 */

/** Colunas da aba Produtos (o catálogo de onde saem os produtos dos quadrados). */
function colunasProdutos_() {
  return [
    { titulo: 'SKU', chave: 'sku', obrigatoria: true, texto: true, apelidos: ['Código', 'Cód. produto', 'Código do produto'] },
    { titulo: 'Produto', chave: 'nome', obrigatoria: true, texto: true, apelidos: ['Nome', 'Descrição', 'Nome do produto'] },
    { titulo: 'Marca', chave: 'marca', texto: true },
    { titulo: 'Categoria', chave: 'categoria', texto: true, apelidos: ['Linha', 'Família'] },
    { titulo: 'Movimento (etiqueta)', chave: 'movimento', texto: true, apelidos: ['Movimento', 'Etiqueta'] },
  ];
}

/** SKU como chave: sem espaços nas pontas e em maiúsculas ("ab-12 " → "AB-12"). */
function normSku_(v) {
  return texto_(v).replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Catálogo da aba Produtos (as linhas sem SKU ou sem nome ficam de fora; SKU repetido vale a primeira linha),
 * em ordem de nome. @return {Array<{sku, nome, marca, categoria, movimento}>}
 */
function produtosDeValores_(valores) {
  if (!valores || !valores.length) return [];
  const vistos = {};
  const lista = [];
  objetosDeValores_(valores, colunasProdutos_()).linhas.forEach(function (l) {
    const sku = normSku_(l.sku);
    const nome = texto_(l.nome);
    if (!sku || !nome || vistos[sku]) return;
    vistos[sku] = true;
    lista.push({ sku: sku, nome: nome, marca: normMarca_(l.marca), categoria: texto_(l.categoria), movimento: texto_(l.movimento) });
  });
  return lista.sort(function (a, b) { return a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0; });
}

/** Matriz [cabeçalho, ...linhas] da aba Produtos de exemplo (os produtos dos ciclos de exemplo). */
function valoresProdutosExemplo_() {
  const cols = colunasProdutos_();
  const linhas = [cols.map(function (c) { return c.titulo; })];
  EXEMPLO_PRODUTOS.forEach(function (p) {
    const o = { sku: p[0], nome: p[1], marca: p[2], categoria: p[3], movimento: p[4] };
    linhas.push(cols.map(function (c) { return o[c.chave] || ''; }));
  });
  return linhas;
}

/** Produtos de exemplo: [SKU, nome, marca, categoria, movimento]. */
const EXEMPLO_PRODUTOS = [
  ['48211', 'Egeo Dolce Desodorante Colônia 90ml', 'BOT', 'Perfumaria', 'LÇTO EGEO'],
  ['48212', 'Egeo Bomb Black Desodorante Colônia 90ml', 'BOT', 'Perfumaria', 'LÇTO EGEO'],
  ['48213', 'Egeo Choc Desodorante Colônia 90ml', 'BOT', 'Perfumaria', 'LÇTO EGEO'],
  ['48214', 'Egeo Vanilla Vibe Desodorante Colônia 90ml', 'BOT', 'Perfumaria', 'LÇTO EGEO'],
  ['50110', 'Malbec Desodorante Colônia 100ml', 'BOT', 'Perfumaria', 'BOTIPROMO'],
  ['50111', 'Malbec Gold Desodorante Colônia 100ml', 'BOT', 'Perfumaria', 'BOTIPROMO'],
  ['50112', 'Lily Eau de Parfum 75ml', 'BOT', 'Perfumaria', 'BOTIPROMO'],
  ['50113', 'Floratta Rose Desodorante Colônia 75ml', 'BOT', 'Perfumaria', 'BOTIPROMO'],
  ['50114', 'Nativa SPA Hidratante Ameixa 400ml', 'BOT', 'Corpo e banho', 'BOTIPROMO'],
  ['61020', 'Siàge Nutri Rosé Shampoo 250ml', 'EUD', 'Cabelos', 'SIÀGE ULTIMATE'],
  ['61021', 'Siàge Nutri Rosé Condicionador 200ml', 'EUD', 'Cabelos', 'SIÀGE ULTIMATE'],
  ['61022', 'Siàge Nutri Rosé Máscara 250g', 'EUD', 'Cabelos', 'SIÀGE ULTIMATE'],
  ['61030', 'Eudora Glam Batom Matte', 'EUD', 'Maquiagem', 'OUTLET EUD'],
  ['61031', 'Eudora Soul Desodorante Colônia 95ml', 'EUD', 'Perfumaria', 'OUTLET EUD'],
  ['72001', 'QDB Juicy Mood Gloss Labial', 'QDB', 'Maquiagem', 'JUICY MOOD'],
  ['72002', 'QDB Juicy Mood Body Splash 200ml', 'QDB', 'Perfumaria', 'JUICY MOOD'],
  ['72010', 'QDB Máscara de Cílios Volume', 'QDB', 'Maquiagem', 'LIQUIDA QDB'],
  ['72011', 'QDB Base Líquida Matte', 'QDB', 'Maquiagem', 'LIQUIDA QDB'],
  ['80100', 'O.U.i Eau de Parfum L\'Âme 75ml', 'OUI', 'Perfumaria', ''],
  ['90001', 'Kit Presente Dia das Mães', 'MULTI', 'Presentes', 'MULTI PROMO'],
];

/** Colunas da aba Prateleiras: uma linha por produto de cada quadrado. */
function colunasPrateleiras_() {
  return [
    { titulo: 'Ciclo', chave: 'ciclo', obrigatoria: true, texto: true },
    { titulo: 'Planta', chave: 'planta', obrigatoria: true, texto: true },
    { titulo: 'ID Móvel', chave: 'espaco', obrigatoria: true, texto: true, apelidos: ['Espaço', 'Móvel'] },
    { titulo: 'Prateleira', chave: 'prateleira', obrigatoria: true, texto: true, apelidos: ['Nível'] },
    { titulo: 'Quadrado', chave: 'quadrado', texto: true },
    { titulo: 'X (%)', chave: 'x', texto: true, apelidos: ['X'] },
    { titulo: 'Largura (%)', chave: 'w', texto: true, apelidos: ['Largura'] },
    { titulo: 'Movimento (etiqueta)', chave: 'movimento', texto: true, apelidos: ['Movimento', 'Etiqueta'] },
    { titulo: 'SKU', chave: 'sku', texto: true, apelidos: ['Código', 'Cód. produto'] },
    { titulo: 'Produto', chave: 'produto', texto: true },
    { titulo: 'Frentes', chave: 'frentes', texto: true, apelidos: ['Facings'] },
    { titulo: 'Observação', chave: 'observacao', texto: true, apelidos: ['Obs'] },
    { titulo: 'Atualizado por', chave: 'autor', texto: true },
    { titulo: 'Atualizado em', chave: 'data', texto: true },
  ];
}

/** Matriz vazia da aba (só o cabeçalho). */
function valoresPrateleirasVazios_() {
  return [colunasPrateleiras_().map(function (c) { return c.titulo; })];
}

/**
 * Onde um móvel leva produtos: os espaços (IDs aceitos na aba) e quantas prateleiras cada um tem.
 *  - gôndola: cada ponta e cada meio (ou metade do meio), com as prateleiras da gôndola;
 *  - mesas destaque: o nicho de cada frente (1 prateleira; o verso é comunicação);
 *  - móvel make: as prateleiras do corpo (o ID do móvel; as testeiras são comunicação);
 *  - pirâmide: os 4 lados, do mesmo tamanho (PIRAMIDE 1/LADO-1 a LADO-4), cada um com as 4 prateleiras dela;
 *  - totem, móvel de atendimento e itens fora da planta: não levam produtos;
 *  - os demais: o móvel inteiro.
 * @return {{ids: string[], n: number}} ids: IDs completos ("GONDOLA 1/PONTA-A" ou "PIRAMIDE 1")
 */
function espacosDePrateleira_(m) {
  if (!m || m.tipo === 'EXTRA' || m.tipo === 'TOTEM' || TIPOS_SEM_ETIQUETA.indexOf(m.tipo) >= 0) return { ids: [], n: 0 };
  const n = PRATELEIRAS_POR_TIPO[m.tipo] || 1;
  if (m.tipo === 'GONDOLA') return { ids: espacosAceitos_(m).map(function (e) { return m.id + '/' + e; }), n: n };
  if (m.tipo === 'MESA' || m.tipo === 'MESA_3') {
    return { ids: espacosDoMovel_(m).filter(function (e) { return !e.vm; }).map(function (e) { return m.id + '/' + e.id; }), n: 1 };
  }
  if (m.tipo === 'PIRAMIDE') return { ids: LADOS_PIRAMIDE.map(function (e) { return m.id + '/' + e; }), n: n };
  return { ids: [m.id], n: n };
}

/** Os 4 lados da pirâmide nas prateleiras, do mesmo tamanho, cada um com as prateleiras dela. */
const LADOS_PIRAMIDE = ['LADO-1', 'LADO-2', 'LADO-3', 'LADO-4'];

/** Frentes de um produto: inteiro de 1 a LIMITES_PRATELEIRA.frentes (vazio ou inválido = 1). */
function normFrentes_(v) {
  const n = Math.round(numero_(v, 1));
  return Math.max(1, Math.min(LIMITES_PRATELEIRA.frentes, isFinite(n) ? n : 1));
}

/** Medida de um quadrado em % da prateleira (0 a 100, com uma casa); vazio ou inválido = padrao. */
function normPct_(v, padrao) {
  const n = numero_(String(texto_(v)).replace('%', ''), padrao);
  return Math.round(Math.max(0, Math.min(100, isFinite(n) ? n : padrao)) * 10) / 10;
}

/** Os dois quadrados se sobrepõem na largura (encostar não conta)? Todos ocupam a altura toda da prateleira. */
function quadradosSobrepostos_(a, b) {
  const folga = 0.05;
  return a.x + a.w > b.x + folga && b.x + b.w > a.x + folga;
}

/**
 * Prateleiras da aba, agrupadas por espaço (ciclo, ER e espaço), com as prateleiras em ordem (1 = a de cima),
 * os quadrados de cada uma, da esquerda para a direita (início x e largura w em % da prateleira; y = 0 e h = 100:
 * todos ocupam a altura toda) e os produtos de cada
 * quadrado na ordem das linhas. O movimento da prateleira é o do maior quadrado (para o planograma).
 * Linha sem as medidas do quadrado vale como a prateleira inteira.
 * @return {Array<{ciclo, planta, espaco, prateleiras: Array<{numero, movimento, quadrados: Array<{x, y, w, h, movimento,
 *   observacao, produtos: Array<{sku, nome, frentes}>}>}>, autor, data}>}
 */
function prateleirasDeValores_(valores, produtos) {
  if (!valores || !valores.length) return [];
  const catalogo = {};
  (produtos || []).forEach(function (p) { catalogo[p.sku] = p; });
  const grupos = {};
  const ordem = [];
  objetosDeValores_(valores, colunasPrateleiras_()).linhas.forEach(function (l) {
    const ciclo = texto_(l.ciclo);
    const planta = normPlanta_(l.planta);
    const espaco = normIdEspaco_(l.espaco);
    const numero = Math.round(numero_(l.prateleira, 0));
    if (!ciclo || !planta || planta === CONFIG.PLANTA_TODAS || !espaco || !(numero >= 1)) return;
    const k = ciclo + '\u0001' + planta + '\u0001' + espaco;
    if (!grupos[k]) {
      grupos[k] = { ciclo: ciclo, planta: planta, espaco: espaco, porNumero: {}, autor: '', data: '' };
      ordem.push(k);
    }
    const g = grupos[k];
    if (texto_(l.autor)) g.autor = texto_(l.autor);
    if (texto_(l.data)) g.data = texto_(l.data);
    const p = g.porNumero[numero] || (g.porNumero[numero] = { numero: numero, porQuadrado: {}, ordem: [] });
    const nq = Math.max(1, Math.round(numero_(l.quadrado, 1)));
    let q = p.porQuadrado[nq];
    if (!q) {
      const temMedidas = texto_(l.w) !== '';
      q = p.porQuadrado[nq] = {
        x: temMedidas ? normPct_(l.x, 0) : 0, y: 0, w: temMedidas ? normPct_(l.w, 100) : 100, h: 100,
        movimento: '', observacao: '', produtos: [],
      };
      p.ordem.push(nq);
    }
    if (!q.movimento && texto_(l.movimento)) q.movimento = texto_(l.movimento);
    if (!q.observacao && texto_(l.observacao)) q.observacao = texto_(l.observacao);
    const sku = normSku_(l.sku);
    if (sku || texto_(l.produto)) {
      // O nome vem do catálogo (a aba Produtos); o da linha fica para o produto que saiu dele.
      const c = catalogo[sku];
      q.produtos.push({ sku: sku, nome: c ? c.nome : texto_(l.produto) || sku, frentes: normFrentes_(l.frentes), foraDoCatalogo: !c });
    }
  });
  return ordem.map(function (k) {
    const g = grupos[k];
    const prateleiras = Object.keys(g.porNumero).map(function (n) {
      const p = g.porNumero[n];
      const quadrados = p.ordem.map(function (nq) { return p.porQuadrado[nq]; });
      const maior = quadrados.filter(function (q) { return q.movimento; })
        .sort(function (a, b) { return b.w * b.h - a.w * a.h; })[0];
      return { numero: p.numero, movimento: maior ? maior.movimento : '', quadrados: quadrados };
    }).sort(function (a, b) { return a.numero - b.numero; });
    return { ciclo: g.ciclo, planta: g.planta, espaco: g.espaco, prateleiras: prateleiras, autor: g.autor, data: g.data };
  });
}

/**
 * Linhas da aba para as prateleiras de um espaço numa ER (o quadrado sem produto tem uma linha sem SKU).
 * Os produtos têm de estar no catálogo (aba Produtos). Lança erro com o motivo quando algo não cabe.
 * @param {Object<string, {nome}>} catalogo  SKU → produto
 */
function linhasDePrateleiras_(ciclo, planta, espaco, n, prateleiras, catalogo, quem, quando) {
  const linhas = [];
  const vistas = {};
  const fora = [];
  const lim = LIMITES_PRATELEIRA;
  (Array.isArray(prateleiras) ? prateleiras : []).forEach(function (p) {
    const numero = Math.round(numero_(p && p.numero, 0));
    if (!(numero >= 1 && numero <= n)) throw new Error('Prateleira ' + texto_(p && p.numero) + ' não existe neste espaço (vai de 1 a ' + n + ').');
    if (vistas[numero]) throw new Error('A prateleira ' + numero + ' veio duas vezes.');
    vistas[numero] = true;
    const quadrados = (Array.isArray(p.quadrados) ? p.quadrados : []).map(function (q) {
      // Todo quadrado ocupa a altura toda da prateleira: só o início e a largura contam.
      const x = normPct_(q && q.x, 0);
      return {
        x: x, y: 0, w: Math.min(normPct_(q && q.w, 0), Math.round((100 - x) * 10) / 10), h: 100,
        movimento: texto_(q && q.movimento).slice(0, 200), observacao: texto_(q && q.observacao).slice(0, 500),
        produtos: (q && Array.isArray(q.produtos) ? q.produtos : []).filter(function (x) { return x && normSku_(x.sku); }),
      };
    });
    if (quadrados.length > lim.quadrados) throw new Error('A prateleira ' + numero + ' tem mais de ' + lim.quadrados + ' quadrados.');
    quadrados.forEach(function (q, i) {
      if (q.w < lim.minimo) throw new Error('Na prateleira ' + numero + ', um quadrado ficou pequeno demais (mínimo ' + lim.minimo + '% da prateleira).');
      if (q.produtos.length > lim.produtos) throw new Error('Na prateleira ' + numero + ', um quadrado tem mais de ' + lim.produtos + ' produtos.');
      quadrados.slice(0, i).forEach(function (o) {
        if (quadradosSobrepostos_(o, q)) throw new Error('Na prateleira ' + numero + ', há quadrados sobrepostos: ajuste para ficarem lado a lado.');
      });
    });
    // Numerados da esquerda para a direita.
    quadrados.sort(function (a, b) { return a.x - b.x; }).forEach(function (q, i) {
      const base = {
        ciclo: ciclo, planta: nomePlanta_(planta), espaco: espaco, prateleira: numero, quadrado: i + 1,
        x: q.x, w: q.w, movimento: q.movimento, autor: quem.autor, data: quando,
      };
      if (!q.produtos.length) {
        linhas.push(Object.assign({}, base, { sku: '', produto: '', frentes: '', observacao: q.observacao }));
        return;
      }
      q.produtos.forEach(function (x, j) {
        const sku = normSku_(x.sku);
        const c = catalogo[sku];
        if (!c && fora.indexOf(sku) < 0) fora.push(sku);
        linhas.push(Object.assign({}, base, {
          sku: sku, produto: c ? c.nome : '', frentes: normFrentes_(x.frentes),
          // A observação é do quadrado: vai na primeira linha dele.
          observacao: j ? '' : q.observacao,
        }));
      });
    });
  });
  if (fora.length) throw new Error('Produto fora da aba Produtos: SKU ' + listaCurta_(fora) + '. Cadastre na aba Produtos da planilha ou escolha outro.');
  return linhas.sort(function (a, b) { return a.prateleira - b.prateleira || a.quadrado - b.quadrado; });
}

/**
 * Aplica uma ação às prateleiras e devolve a matriz nova da aba (sem gravar nada).
 *  - salvar: { acao, ciclo, planta, espaco, prateleiras: [{numero, quadrados: [{x, w, movimento, observacao,
 *            produtos: [{sku, frentes}]}]}] }  troca as prateleiras do espaço nessa ER (lista vazia apaga); planta = a
 *            ER ou "TODAS" (cada ER que tem o espaço recebe as mesmas prateleiras); x e w em % da prateleira (os
 *            quadrados ficam lado a lado, na altura toda).
 * Só a Construção de planogramas (papel PLANOGRAMA), num ciclo publicado ou num ciclo em construção ainda não enviado.
 * @param {Array<Array>} valores  matriz atual da aba (com cabeçalho), ou vazia
 * @param {{plantas: Array, ciclos: Object, rascunhos: Object, produtos: Array}} contexto  plantas do layout
 *   (montarPlantas_), ciclos publicados, o status de cada ciclo em construção e o catálogo (produtosDeValores_)
 * @param {{papel, autor}} quem  resultado de conferirAcesso_
 * @return {{valores: Array<Array>, plantas: string[]}} plantas: as ERs gravadas
 */
function aplicarAcaoPrateleiras_(valores, contexto, quem, pedido, agora) {
  const p = pedido || {};
  if (p.acao !== 'salvar') throw new Error('Ação inválida.');
  if (quem.papel !== 'PLANOGRAMA') throw new Error('Só a Construção de planogramas detalha as prateleiras.');
  const ciclo = texto_(p.ciclo).slice(0, 60);
  if (!ciclo) throw new Error('Escolha o ciclo.');
  const status = contexto.rascunhos[ciclo];
  if (status === 'ENVIADO') throw new Error('O ciclo "' + ciclo + '" foi enviado para aprovação: só volta a ser editado se o validador devolver.');
  if (!contexto.ciclos[ciclo] && status !== 'EM_CONSTRUCAO') throw new Error('O ciclo "' + ciclo + '" não foi encontrado (nem publicado, nem em construção).');

  const planta = normPlanta_(p.planta);
  if (!planta) throw new Error('Escolha a ER.');
  const espaco = normIdEspaco_(p.espaco);
  if (!espaco) throw new Error('Escolha o espaço do móvel.');
  const base = espaco.split('/')[0];
  // ERs que recebem: a escolhida ou, com "TODAS", cada uma que tem o espaço.
  const onde = planta === CONFIG.PLANTA_TODAS ? contexto.plantas : contexto.plantas.filter(function (x) { return x.id === planta; });
  if (!onde.length) throw new Error('A ER escolhida não existe no layout.');
  const destinos = [];
  let motivo = '';
  onde.forEach(function (pl) {
    const m = pl.moveis.filter(function (x) { return x.id === base; })[0];
    if (!m) { motivo = motivo || 'O móvel "' + base + '" não existe na ' + nomePlanta_(pl.id) + '.'; return; }
    const e = espacosDePrateleira_(m);
    if (!e.ids.length) { motivo = '"' + base + '" não leva produtos nas prateleiras.'; return; }
    if (e.ids.indexOf(espaco) < 0) {
      motivo = espaco === base ? 'Escolha o espaço do móvel "' + base + '" (ex.: ' + e.ids[0] + ').' : 'O móvel "' + base + '" não tem prateleiras em "' + espaco + '".';
      return;
    }
    destinos.push({ planta: pl.id, n: e.n });
  });
  if (!destinos.length) throw new Error(motivo || 'Nenhuma ER tem o espaço "' + espaco + '".');

  const quando = formatarDataComentario_(agora || new Date());
  const catalogo = {};
  (contexto.produtos || []).forEach(function (x) { catalogo[x.sku] = x; });
  const cols = colunasPrateleiras_();
  const daEr = {};
  destinos.forEach(function (d) { daEr[d.planta] = true; });
  // Sai o que o espaço tinha nessas ERs; entram as prateleiras novas.
  const outras = (valores && valores.length ? objetosDaMatriz_(valores, cols) : []).filter(function (o) {
    return !(texto_(o.ciclo) === ciclo && daEr[normPlanta_(o.planta)] && normIdEspaco_(o.espaco) === espaco);
  });
  const novas = [];
  destinos.forEach(function (d) { novas.push.apply(novas, linhasDePrateleiras_(ciclo, d.planta, espaco, d.n, p.prateleiras, catalogo, quem, quando)); });
  return { valores: matrizDeObjetos_(outras.concat(novas), cols), plantas: destinos.map(function (d) { return d.planta; }) };
}

/**
 * Linhas da aba para um ciclo novo copiado de outro (Rascunhos.gs, ação "criar"): todas as do ciclo de origem
 * ou, com fixos, só as dos espaços fixos (🔒) do ciclo de origem (a linha fixa de uma ER vale também para as
 * ERs maiores, como na planta).
 * @param {Array<Object>} prateleiras  objetos da aba (todas as linhas)
 * @param {Array<Object>|null} fixos  linhas da aba Movimentos com o 🔒 (null = copiar tudo)
 */
function prateleirasParaCopia_(prateleiras, origem, ciclo, fixos) {
  return prateleiras.filter(function (o) {
    if (texto_(o.ciclo) !== origem) return false;
    if (!fixos) return true;
    const planta = normPlanta_(o.planta);
    const espaco = normIdEspaco_(o.espaco);
    return fixos.some(function (f) {
      const pf = normPlanta_(f.planta);
      const mf = normIdEspaco_(f.movel);
      // O meio inteiro fixo vale também para as metades dele; o móvel inteiro fixo (a pirâmide), para os lados dele.
      const mesmo = mf === espaco || (/\/MEIO-[AB]$/.test(mf) && espaco.indexOf(mf + '-') === 0)
        || (mf.indexOf('/') < 0 && espaco.indexOf(mf + '/') === 0);
      return mesmo && (pf === CONFIG.PLANTA_TODAS || pf <= planta);
    });
  }).map(function (o) { return Object.assign({}, o, { ciclo: ciclo }); });
}

/**
 * Executa um pedido da página: confere o acesso, lê a aba, aplica a ação e grava. io = o mesmo dos rascunhos
 * ({ ler(nomeDaAba), gravar(nomeDaAba, colunas, matriz), layout(), travar(fn) }).
 * @return {Array} prateleiras atualizadas (como em prateleirasDeValores_)
 */
function executarPrateleiras_(io, acesso, pedido) {
  const quem = conferirAcesso_(acesso);
  return io.travar(function () {
    const valores = io.ler(CONFIG.ABAS.PRATELEIRAS);
    const abas = {
      movimentos: io.ler(CONFIG.ABAS.MOVIMENTOS) || [],
      paineis: io.ler(CONFIG.ABAS.PAINEIS) || [],
      tipos: io.ler(CONFIG.ABAS.TIPOS) || [],
    };
    const rascunhos = {};
    objetosDaMatriz_(io.ler(CONFIG.ABAS.RASCUNHOS) || [], colunasRascunhos_()).forEach(function (r) {
      const status = texto_(r.status);
      if (texto_(r.ciclo) && status !== 'APROVADO') rascunhos[texto_(r.ciclo)] = STATUS_RASCUNHO[status] ? status : 'EM_CONSTRUCAO';
    });
    const layout = io.layout();
    const linhasLayout = objetosDeValores_(layout && layout.length ? layout : valoresLayoutPadrao_(), colunasLayout_()).linhas;
    const produtos = produtosDeValores_(io.ler(CONFIG.ABAS.PRODUTOS));
    const contexto = { plantas: montarPlantas_(linhasLayout, function () {}), ciclos: ciclosPublicados_(abas), rascunhos: rascunhos, produtos: produtos };
    const r = aplicarAcaoPrateleiras_(valores, contexto, quem, pedido);
    io.gravar(CONFIG.ABAS.PRATELEIRAS, colunasPrateleiras_(), r.valores);
    return prateleirasDeValores_(r.valores, produtos);
  });
}
