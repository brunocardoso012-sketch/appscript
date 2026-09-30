/**
 * Gera dev/preview.html: a página do visualizador com os dados do ciclo de
 * exemplo, para abrir direto no navegador (sem publicar no Apps Script).
 * O google.script.run é simulado; importar/salvar não gravam nada.
 *
 * Rodar:  node dev/preview.js   → abrir dev/preview.html
 */
const fs = require('fs');
const path = require('path');
const { carregarGas, SRC } = require('./gas');

const { run } = carregarGas();
const dados = run('montarDados_(valoresLayoutPadrao_(), valoresMovimentosExemplo_(), valoresPaineisExemplo_())');

let html = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
html = html.replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, (_, nome) => fs.readFileSync(path.join(SRC, nome + '.html'), 'utf8'));

const simulacao = `<script>
  // Simulação do google.script.run (apenas para a pré-visualização local)
  window.google = { script: { get run() {
    let ok = () => {}, falha = () => {};
    const responder = (v) => setTimeout(() => ok(JSON.parse(JSON.stringify(v))), 50);
    const api = {
      withSuccessHandler(f) { ok = f; return api; },
      withFailureHandler(f) { falha = f; return api; },
      getDados() { responder(${JSON.stringify(dados).replace(/</g, '\\u003c')}); },
      configurarPlanilha() { responder({ mensagem: 'Pré-visualização: nada foi gravado.' }); },
      importarPlanilha() { responder({ movimentos: 0, paineis: 0, ciclos: [], avisos: ['Pré-visualização: nada foi gravado.'] }); },
      salvarAjustesEtiquetas(p, a) { responder({ atualizados: Object.keys(a).length }); },
    };
    return api;
  } } };
</script>`;
html = html.replace('<head>', '<head>' + simulacao);
const destino = path.join(__dirname, 'preview.html');
fs.writeFileSync(destino, html);
console.log('Gerado: ' + destino);
