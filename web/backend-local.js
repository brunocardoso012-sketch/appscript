/**
 * ============================================================================
 *  BACKEND LOCAL (versão estática, ex.: netli.fyi / Netlify)
 * ============================================================================
 *  Substitui o google.script.run: usa as MESMAS funções do Code.gs
 *  (montarDados_, prepararImportacao_, mesclarLinhas_…), carregadas antes
 *  deste arquivo, mas guarda as "abas" (matrizes) no localStorage do navegador
 *  em vez do Google Sheets.
 */
(function () {
  const CHAVE = 'planoVarejo.planilhaLocal.v1';

  function exemplo() {
    return {
      layout: valoresLayoutPadrao_(),
      // Sem ciclos de exemplo: o primeiro ciclo entra pelo Importar planilha ou pela Construção.
      movimentos: valoresVazios_(colunasMovimentos_()),
      paineis: valoresVazios_(colunasPaineis_()),
      tipos: valoresVazios_(colunasTipos_()),
      produtos: valoresProdutosExemplo_(),
      versoesModelo: versoesAtuais_(),
    };
  }

  function ler() {
    let salvo = null;
    try {
      salvo = JSON.parse(window.localStorage.getItem(CHAVE));
    } catch (e) { /* sem armazenamento ou dado corrompido */ }
    if (!salvo || !salvo.layout || !salvo.movimentos || !salvo.paineis) return exemplo();
    // Dados salvos antes do catálogo de produtos: começam com os produtos de exemplo.
    if (!salvo.produtos) salvo.produtos = valoresProdutosExemplo_();
    // Plantas cujo modelo base mudou desde que os dados foram salvos são atualizadas.
    const r = atualizarModelosPlantas_(salvo, salvo.versoesModelo || {});
    if (r.plantas.length) {
      salvo.versoesModelo = r.versoes;
      try { gravar(salvo); } catch (e) { /* segue com os dados atualizados só nesta sessão */ }
    }
    return salvo;
  }

  function gravar(abas) {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(abas));
    } catch (e) {
      throw new Error('Não foi possível salvar no navegador (armazenamento bloqueado ou cheio).');
    }
  }

  /** Leitura e gravação das "abas" para executarRascunho_ (Rascunhos.gs): as publicadas e as dos rascunhos. */
  function ioRascunhos() {
    const campo = {};
    campo[CONFIG.ABAS.MOVIMENTOS] = 'movimentos';
    campo[CONFIG.ABAS.PAINEIS] = 'paineis';
    campo[CONFIG.ABAS.TIPOS] = 'tipos';
    campo[CONFIG.ABAS.COMENTARIOS] = 'comentarios';
    campo[CONFIG.ABAS.PRODUTOS] = 'produtos';
    campo[CONFIG.ABAS.LAYOUT] = 'layout';
    const chave = (nome) => campo[nome] || 'aba:' + nome;
    const abas = ler();
    return {
      ler: (nome) => abas[chave(nome)] || null,
      gravar: (nome, colunas, matriz) => {
        abas[chave(nome)] = matriz;
        gravar(abas);
      },
      layout: () => abas.layout,
      travar: (fn) => fn(),
    };
  }

  const api = {
    getDados() {
      const abas = ler();
      const dados = montarDados_(abas.layout, abas.movimentos, abas.paineis, abas.tipos);
      dados.antecipacoes = antecipacoesDeValores_(abas['aba:' + CONFIG.ABAS.ANTECIPACOES]);
      dados.produtos = produtosDeValores_(abas.produtos);
      dados.prateleiras = prateleirasDeValores_(abas['aba:' + CONFIG.ABAS.PRATELEIRAS], dados.produtos);
      // Calendário dos ciclos e feriados: no Apps Script, vêm da planilha do calendário; aqui, do navegador.
      dados.calendario = calendarioDeValores_(abas['aba:' + CONFIG.ABAS.CICLOS], abas['aba:' + CONFIG.ABAS.FERIADOS]);
      dados.ordemCalendario = ordemCalendarioDeValores_(abas['aba:' + CONFIG.ABAS.ORDEM_CALENDARIO]);
      dados.selosCalendario = selosCalendarioDeValores_(abas['aba:' + CONFIG.ABAS.SELOS_CALENDARIO]);
      dados.calendario.avisos.forEach((a) => { if (dados.avisos.length < 60) dados.avisos.push(a); });
      dados.planilhaUrl = '';
      dados.precisaConfigurar = false;
      dados.modoLocal = true;
      return dados;
    },

    configurarPlanilha() {
      try { window.localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ }
      return { mensagem: 'Dados de exemplo restaurados.' };
    },

    importarPlanilha(acesso, payload) {
      conferirDesenvolvedor_(acesso);
      const prep = prepararImportacao_(payload);
      const abas = ler();
      const resultado = { movimentos: 0, paineis: 0, tipos: 0, layout: 0, produtos: 0 };
      prep.preparados.forEach((p) => {
        abas[p.bloco.campo] = mesclarLinhas_(abas[p.bloco.campo] || [], p.linhas, p.bloco.colunas, p.bloco.chave);
        resultado[p.bloco.campo] = p.linhas.length;
      });
      gravar(abas);
      const verificacao = verificarImportacao_(abas.layout, prep);
      resultado.ciclos = verificacao.ciclos;
      resultado.avisos = verificacao.avisos;
      return resultado;
    },

    salvarLayout(acesso, planta, layout, nome) {
      return executarSalvarLayout_(ioRascunhos(), acesso, planta, layout, nome);
    },

    getPlanilhas(acesso) {
      conferirDesenvolvedor_(acesso);
      const abas = ler();
      return { web: true, leituraCalendario: resumoCalendario_(calendarioDeValores_(abas['aba:' + CONFIG.ABAS.CICLOS], abas['aba:' + CONFIG.ABAS.FERIADOS])) };
    },

    mudarPlanilhaLayout() {
      throw new Error('Na versão web, os dados ficam no navegador: a planilha separada do layout só existe no Apps Script.');
    },

    mudarPastaBriefings() {
      throw new Error('Na versão web, os dados ficam no navegador: a pasta dos briefings no Drive só existe no Apps Script.');
    },

    salvarBriefingNoDrive() {
      throw new Error('Na versão web não há Drive: baixe o briefing.');
    },

    mudarPlanilhaCalendario() {
      throw new Error('Na versão web, os dados ficam no navegador: a planilha do calendário dos ciclos só existe no Apps Script.');
    },

    getConfigDev(acesso) {
      return executarConfigDev_(ioRascunhos(), acesso, null);
    },

    salvarConfigDev(acesso, pedido) {
      return executarConfigDev_(ioRascunhos(), acesso, pedido);
    },

    entrarDesenvolvedor(acesso) {
      conferirDesenvolvedor_(acesso);
      return { ok: true };
    },

    entrarValidacao(acesso) {
      const quem = conferirAcesso_(acesso);
      return { papel: quem.papel, autor: quem.autor, nomePapel: PAPEIS_ACESSO[quem.papel] };
    },

    getComentarios(acesso) {
      conferirAcesso_(acesso);
      return comentariosDeValores_(ler().comentarios || valoresComentariosVazios_());
    },

    salvarComentario(acesso, pedido) {
      const quem = conferirAcesso_(acesso);
      const abas = ler();
      const r = aplicarAcaoComentario_(abas.comentarios || valoresComentariosVazios_(), quem, pedido);
      abas.comentarios = r.valores;
      gravar(abas);
      return comentariosDeValores_(r.valores);
    },

    getRascunhos(acesso) {
      return executarRascunho_(ioRascunhos(), acesso, null);
    },

    salvarRascunho(acesso, pedido) {
      return executarRascunho_(ioRascunhos(), acesso, pedido);
    },

    salvarAntecipacao(acesso, pedido) {
      return executarAntecipacao_(ioRascunhos(), acesso, pedido);
    },

    salvarOrdemCalendario(acesso, pedido) {
      return executarOrdemCalendario_(ioRascunhos(), acesso, pedido);
    },

    salvarSelosCalendario(acesso, pedido) {
      return executarSelosCalendario_(ioRascunhos(), acesso, pedido);
    },

    salvarPrateleiras(acesso, pedido) {
      return executarPrateleiras_(ioRascunhos(), acesso, pedido);
    },

    salvarAjustesEtiquetas(planta, ajustes) {
      planta = normPlanta_(planta);
      if (!planta || !ajustes || typeof ajustes !== 'object') throw new Error('Dados inválidos.');
      const abas = ler();
      const cab = abas.layout[0].map(chave_);
      const col = (chave) => acharColuna_(cab, colunasLayout_().filter((c) => c.chave === chave)[0]);
      const [iPlanta, iId, iX, iY] = ['planta', 'movel', 'ajusteX', 'ajusteY'].map(col);
      let iE = col('ajusteEspacos');
      if (iE < 0) {
        iE = abas.layout[0].length;
        abas.layout[0].push('Ajuste Etiquetas por espaço (px)');
      }
      let iT = col('tamanhoEtiquetas');
      const tamanho = ajustes.LOJA && ajustes.LOJA.escala ? normTamanhoEtiquetas_(ajustes.LOJA.escala) : 0;
      if (iT < 0 && tamanho) {
        iT = abas.layout[0].length;
        abas.layout[0].push('Tamanho das etiquetas (%)');
      }
      let iS = col('slide');
      const slide = ajustes.LOJA ? normSlide_(ajustes.LOJA.slide) : 0;
      if (iS < 0 && slide) {
        iS = abas.layout[0].length;
        abas.layout[0].push('Largura do slide (px)');
      }
      let atualizados = 0;
      abas.layout.slice(1).forEach((row) => {
        if (normPlanta_(row[iPlanta]) !== planta) return;
        if (normId_(row[iId]) === 'LOJA') {
          if (tamanho) row[iT] = tamanho;
          if (slide) row[iS] = slide;
          return;
        }
        const atual = { x: row[iX], y: row[iY], espacos: lerAjustesEspacos_(row[iE]) };
        if (!aplicarAjusteEtiquetas_(row[iId], ajustes, atual)) return;
        row[iX] = Math.round(Number(atual.x) || 0);
        row[iY] = Math.round(Number(atual.y) || 0);
        row[iE] = textoAjustesEspacos_(atual.espacos);
        atualizados++;
      });
      gravar(abas);
      return { atualizados };
    },
  };

  /**
   * Configuração do Desenvolvedor (aba "Config do app" guardada no navegador): aplicada antes de cada chamada,
   * como o Code.gs faz a cada execução. As senhas (Validacao.gs) já a encontram aplicada.
   */
  function aplicarConfigLocal() {
    let salvo = null;
    try { salvo = JSON.parse(window.localStorage.getItem(CHAVE)); } catch (e) { /* sem armazenamento */ }
    aplicarConfigApp_(configAppDeValores_(salvo && salvo['aba:' + CONFIG.ABAS.CONFIG_APP]));
  }
  carregarConfigApp_ = function () { /* já aplicada por aplicarConfigLocal */ };

  /** Mesma interface do google.script.run (assíncrona, com handlers). */
  window.google = {
    script: {
      get run() {
        let ok = () => {};
        let falha = () => {};
        const corredor = {
          withSuccessHandler(f) { ok = f; return corredor; },
          withFailureHandler(f) { falha = f; return corredor; },
        };
        Object.keys(api).forEach((nome) => {
          corredor[nome] = (...args) => {
            setTimeout(() => {
              let resposta;
              try {
                aplicarConfigLocal();
                // Cópia via JSON, como o Apps Script faz entre servidor e página.
                resposta = JSON.parse(JSON.stringify(api[nome](...JSON.parse(JSON.stringify(args)))));
              } catch (e) {
                falha(e);
                return;
              }
              ok(resposta);
            }, 0);
          };
        });
        return corredor;
      },
    },
  };
})();
