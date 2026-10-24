/**
 * ============================================================================
 *  PRATELEIRAS (o que vai em cada prateleira de cada espaço, produto a produto)
 * ============================================================================
 *  Depois da estratégia dos movimentos (que movimento fica em cada espaço), o
 *  construtor da estratégia detalha cada prateleira: o movimento dela e os
 *  produtos, na ordem da esquerda para a direita, com as frentes de cada um.
 *  Todo mundo vê na tela do móvel (Prateleira.html); só o construtor edita,
 *  num ciclo publicado ou num ciclo em construção que ainda não foi enviado.
 *
 *  Ficam na aba "Prateleiras", uma linha por produto (a prateleira com movimento
 *  e sem produto tem uma linha sem produto). Cada ER tem as suas linhas: "Vale
 *  em todas as ERs" grava a mesma prateleira em cada ER que tem o espaço. Este
 *  arquivo só tem regras sobre matrizes: quem lê e grava a aba é o Code.gs, o
 *  Visualizador.gs e, na versão web, o web/backend-local.js
 *  (executarPrateleiras_, com o leitor / gravador de cada um).
 */

/** Colunas da aba Prateleiras. */
function colunasPrateleiras_() {
  return [
    { titulo: 'Ciclo', chave: 'ciclo', obrigatoria: true, texto: true },
    { titulo: 'Planta', chave: 'planta', obrigatoria: true, texto: true },
    { titulo: 'ID Móvel', chave: 'espaco', obrigatoria: true, texto: true, apelidos: ['Espaço', 'Móvel'] },
    { titulo: 'Prateleira', chave: 'prateleira', obrigatoria: true, texto: true, apelidos: ['Nível'] },
    { titulo: 'Movimento (etiqueta)', chave: 'movimento', texto: true, apelidos: ['Movimento', 'Etiqueta'] },
    { titulo: 'Produto', chave: 'produto', texto: true },
    { titulo: 'SKU', chave: 'sku', texto: true, apelidos: ['Código', 'Cód. produto'] },
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
  return { ids: [m.id], n: n };
}

/** Frentes de um produto: inteiro de 1 a LIMITES_PRATELEIRA.frentes (vazio ou inválido = 1). */
function normFrentes_(v) {
  const n = Math.round(numero_(v, 1));
  return Math.max(1, Math.min(LIMITES_PRATELEIRA.frentes, isFinite(n) ? n : 1));
}

/**
 * Prateleiras da aba, agrupadas por espaço (ciclo, ER e espaço), com as prateleiras em ordem (1 = a de cima)
 * e os produtos na ordem das linhas (da esquerda para a direita).
 * @return {Array<{ciclo, planta, espaco, prateleiras: Array<{numero, movimento, observacao, produtos: Array<{nome, sku, frentes}>}>, autor, data}>}
 */
function prateleirasDeValores_(valores) {
  if (!valores || !valores.length) return [];
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
    const p = g.porNumero[numero] || (g.porNumero[numero] = { numero: numero, movimento: '', observacao: '', produtos: [] });
    if (!p.movimento && texto_(l.movimento)) p.movimento = texto_(l.movimento);
    if (!p.observacao && texto_(l.observacao)) p.observacao = texto_(l.observacao);
    if (texto_(l.produto)) p.produtos.push({ nome: texto_(l.produto), sku: texto_(l.sku), frentes: normFrentes_(l.frentes) });
  });
  return ordem.map(function (k) {
    const g = grupos[k];
    const prateleiras = Object.keys(g.porNumero).map(function (n) { return g.porNumero[n]; })
      .sort(function (a, b) { return a.numero - b.numero; });
    return { ciclo: g.ciclo, planta: g.planta, espaco: g.espaco, prateleiras: prateleiras, autor: g.autor, data: g.data };
  });
}

/**
 * Linhas da aba para as prateleiras de um espaço numa ER (a prateleira sem movimento, produto nem
 * observação não tem linha). Lança erro com o motivo quando algo não cabe.
 */
function linhasDePrateleiras_(ciclo, planta, espaco, n, prateleiras, quem, quando) {
  const linhas = [];
  const vistas = {};
  (Array.isArray(prateleiras) ? prateleiras : []).forEach(function (p) {
    const numero = Math.round(numero_(p && p.numero, 0));
    if (!(numero >= 1 && numero <= n)) throw new Error('Prateleira ' + texto_(p && p.numero) + ' não existe neste espaço (vai de 1 a ' + n + ').');
    if (vistas[numero]) throw new Error('A prateleira ' + numero + ' veio duas vezes.');
    vistas[numero] = true;
    const movimento = texto_(p.movimento).slice(0, 200);
    const observacao = texto_(p.observacao).slice(0, 500);
    const produtos = (Array.isArray(p.produtos) ? p.produtos : []).filter(function (x) { return x && texto_(x.nome); });
    if (produtos.length > LIMITES_PRATELEIRA.produtos) {
      throw new Error('A prateleira ' + numero + ' tem mais de ' + LIMITES_PRATELEIRA.produtos + ' produtos.');
    }
    const base = { ciclo: ciclo, planta: nomePlanta_(planta), espaco: espaco, prateleira: numero, movimento: movimento, autor: quem.autor, data: quando };
    if (!produtos.length) {
      if (movimento || observacao) linhas.push(Object.assign({}, base, { produto: '', sku: '', frentes: '', observacao: observacao }));
      return;
    }
    produtos.forEach(function (x, i) {
      linhas.push(Object.assign({}, base, {
        produto: texto_(x.nome).slice(0, 200), sku: texto_(x.sku).slice(0, 60), frentes: normFrentes_(x.frentes),
        // A observação é da prateleira: vai na primeira linha dela.
        observacao: i ? '' : observacao,
      }));
    });
  });
  return linhas.sort(function (a, b) { return a.prateleira - b.prateleira; });
}

/**
 * Aplica uma ação às prateleiras e devolve a matriz nova da aba (sem gravar nada).
 *  - salvar: { acao, ciclo, planta, espaco, prateleiras: [{numero, movimento, observacao, produtos: [{nome, sku, frentes}]}] }
 *            troca as prateleiras do espaço nessa ER (lista vazia apaga); planta = a ER ou "TODAS" (cada ER que
 *            tem o espaço recebe as mesmas prateleiras).
 * Só o construtor da estratégia, num ciclo publicado ou num ciclo em construção ainda não enviado.
 * @param {Array<Array>} valores  matriz atual da aba (com cabeçalho), ou vazia
 * @param {{plantas: Array, ciclos: Object, rascunhos: Object}} contexto  plantas do layout (montarPlantas_), ciclos
 *   publicados e o status de cada ciclo em construção
 * @param {{papel, autor}} quem  resultado de conferirAcesso_
 * @return {{valores: Array<Array>, plantas: string[]}} plantas: as ERs gravadas
 */
function aplicarAcaoPrateleiras_(valores, contexto, quem, pedido, agora) {
  const p = pedido || {};
  if (p.acao !== 'salvar') throw new Error('Ação inválida.');
  if (quem.papel !== 'CONSTRUTOR') throw new Error('Só o construtor da estratégia detalha as prateleiras.');
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
  const cols = colunasPrateleiras_();
  const daEr = {};
  destinos.forEach(function (d) { daEr[d.planta] = true; });
  // Sai o que o espaço tinha nessas ERs; entram as prateleiras novas.
  const outras = (valores && valores.length ? objetosDaMatriz_(valores, cols) : []).filter(function (o) {
    return !(texto_(o.ciclo) === ciclo && daEr[normPlanta_(o.planta)] && normIdEspaco_(o.espaco) === espaco);
  });
  const novas = [];
  destinos.forEach(function (d) { novas.push.apply(novas, linhasDePrateleiras_(ciclo, d.planta, espaco, d.n, p.prateleiras, quem, quando)); });
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
      // O meio inteiro fixo vale também para as metades dele.
      const mesmo = mf === espaco || (/\/MEIO-[AB]$/.test(mf) && espaco.indexOf(mf + '-') === 0);
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
    const contexto = { plantas: montarPlantas_(linhasLayout, function () {}), ciclos: ciclosPublicados_(abas), rascunhos: rascunhos };
    const r = aplicarAcaoPrateleiras_(valores, contexto, quem, pedido);
    io.gravar(CONFIG.ABAS.PRATELEIRAS, colunasPrateleiras_(), r.valores);
    return prateleirasDeValores_(r.valores);
  });
}
