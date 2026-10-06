/**
 * Gera visualizador/Planilha base - Visualizador.xlsx: a planilha que alimenta a versão só de
 * visualização, em branco (uma linha por móvel de cada planta, sem ciclo de exemplo). Usa o mesmo gerador do botão
 * "Baixar planilha base" (src/Planilha.html), rodando o index.html num Chromium (Playwright),
 * com as instruções da versão de visualização (lê a planilha direto, sem importar).
 *
 * Rodar (depois de npm run build:web):  node dev/gerar-planilha-visualizador.js
 * Precisa do Playwright. Se a ExcelJS estiver instalada (npm i exceljs@4.4.0), ela é usada
 * no lugar da cópia do cdnjs.
 */
const path = require('path');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const DESTINO = path.join(RAIZ, 'visualizador', 'Planilha base - Visualizador.xlsx');

function exigir(nome) {
  try { return require(nome); } catch (e) { /* tenta a instalação global */ }
  return require(path.join(execSync('npm root -g').toString().trim(), nome));
}

function excelLocal() {
  const caminhos = [process.env.EXCELJS_DIR, RAIZ].filter(Boolean);
  for (const base of caminhos) {
    try { return require.resolve('exceljs/dist/exceljs.min.js', { paths: [base] }); } catch (e) { /* próximo */ }
  }
  return null;
}

(async () => {
  const { chromium } = exigir('playwright');
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ acceptDownloads: true });
  const local = excelLocal();
  if (local) await pagina.route('**/exceljs.min.js', (r) => r.fulfill({ path: local, contentType: 'text/javascript' }));
  await pagina.goto('file://' + path.join(RAIZ, 'index.html'));
  await pagina.waitForFunction(() => App.estado.dados && App.estado.dados.ciclos.length);
  const [download] = await Promise.all([
    pagina.waitForEvent('download'),
    pagina.evaluate(() => {
      const dados = App.estado.dados;
      // Em branco (sem o ciclo de exemplo): uma linha por móvel de cada planta, com o "Ciclo" vazio.
      return Planilha.baixarModelo(dados, {
        ciclo: '', origem: '', plantas: dados.plantas.map((p) => p.id), incluirLayout: false, visualizador: true,
      }, App.resolver);
    }),
  ]);
  await download.saveAs(DESTINO);
  await navegador.close();
  console.log('Gerado: ' + path.relative(RAIZ, DESTINO));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
