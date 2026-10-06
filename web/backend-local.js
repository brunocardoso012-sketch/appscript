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
      movimentos: valoresMovimentosExemplo_(),
      paineis: valoresPaineisExemplo_(),
    };
  }

  function ler() {
    try {
      const salvo = JSON.parse(window.localStorage.getItem(CHAVE));
      if (salvo && salvo.layout && salvo.movimentos && salvo.paineis) return salvo;
    } catch (e) { /* sem armazenamento ou dado corrompido */ }
    return exemplo();
  }

  function gravar(abas) {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(abas));
    } catch (e) {
      throw new Error('Não foi possível salvar no navegador (armazenamento bloqueado ou cheio).');
    }
  }

  const api = {
    getDados() {
      const abas = ler();
      const dados = montarDados_(abas.layout, abas.movimentos, abas.paineis);
      dados.planilhaUrl = '';
      dados.precisaConfigurar = false;
      dados.modoLocal = true;
      return dados;
    },

    configurarPlanilha() {
      try { window.localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ }
      return { mensagem: 'Dados de exemplo restaurados.' };
    },

    importarPlanilha(payload) {
      const prep = prepararImportacao_(payload);
      const abas = ler();
      const resultado = { movimentos: 0, paineis: 0, layout: 0 };
      prep.preparados.forEach((p) => {
        abas[p.bloco.campo] = mesclarLinhas_(abas[p.bloco.campo], p.linhas, p.bloco.colunas);
        resultado[p.bloco.campo] = p.linhas.length;
      });
      gravar(abas);
      const verificacao = verificarImportacao_(abas.layout, prep);
      resultado.ciclos = verificacao.ciclos;
      resultado.avisos = verificacao.avisos;
      return resultado;
    },

    salvarLayout(planta, layout) {
      const objetos = objetosLayoutDaPlanta_(planta, layout);
      const abas = ler();
      abas.layout = mesclarLinhas_(abas.layout, objetos, colunasLayout_());
      gravar(abas);
      return { planta: normPlanta_(planta), moveis: objetos.length - 1 };
    },

    salvarAjustesEtiquetas(planta, ajustes) {
      planta = normPlanta_(planta);
      if (!planta || !ajustes || typeof ajustes !== 'object') throw new Error('Dados inválidos.');
      const abas = ler();
      const cab = abas.layout[0].map(chave_);
      const col = (chave) => acharColuna_(cab, colunasLayout_().filter((c) => c.chave === chave)[0]);
      const [iPlanta, iId, iX, iY] = ['planta', 'movel', 'ajusteX', 'ajusteY'].map(col);
      let atualizados = 0;
      abas.layout.slice(1).forEach((row) => {
        if (normPlanta_(row[iPlanta]) !== planta) return;
        const a = ajustes[normId_(row[iId])];
        if (!a) return;
        row[iX] = Math.round(Number(a.x) || 0);
        row[iY] = Math.round(Number(a.y) || 0);
        atualizados++;
      });
      gravar(abas);
      return { atualizados };
    },
  };

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
