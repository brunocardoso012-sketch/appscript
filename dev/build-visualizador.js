/**
 * Gera visualizador/apps-script/: a versão só de visualização para o Google Apps Script.
 * São só dois arquivos (mais o manifesto), fáceis de colar no editor do Apps Script:
 *
 *   - Codigo.gs  = visualizador/fonte/Visualizador.gs + src/Config.gs, Layouts.gs, Dados.gs e Validacao.gs;
 *   - Index.html = src/Index.html com Styles, Render e App embutidos, sem os trechos marcados
 *                  com <!-- so-app-completo --> (Construir loja, Baixar / Importar planilha).
 *
 * E também visualizador/Plano de Varejo - Apps Script.gs: o mesmo app num ARQUIVO SÓ (o Codigo.gs
 * com a página embutida como texto), para colar no editor do Apps Script sem criar o Index.html.
 *
 * Usa os mesmos arquivos de src/ (nada é duplicado). Rodar:  npm run build:visualizador
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SRC = path.join(RAIZ, 'src');
const FONTE = path.join(RAIZ, 'visualizador', 'fonte');
const DESTINO = path.join(RAIZ, 'visualizador', 'apps-script');
const ARQUIVO_UNICO = path.join(RAIZ, 'visualizador', 'Plano de Varejo - Apps Script.gs');
const ler = (...p) => fs.readFileSync(path.join(...p), 'utf8');

function gerarCodigo() {
  const partes = [
    ['visualizador/fonte/Visualizador.gs', ler(FONTE, 'Visualizador.gs')],
    ['src/Config.gs', ler(SRC, 'Config.gs')],
    ['src/Layouts.gs', ler(SRC, 'Layouts.gs')],
    ['src/Dados.gs', ler(SRC, 'Dados.gs')],
    ['src/Validacao.gs', ler(SRC, 'Validacao.gs')],
  ];
  return partes.map(([nome, codigo]) => '/* ===== ' + nome + ' ===== */\n' + codigo.trim() + '\n').join('\n');
}

function gerarIndex() {
  let html = ler(SRC, 'Index.html');
  html = html.replace(/[ \t]*<!-- so-app-completo -->[\s\S]*?<!-- \/so-app-completo -->[ \t]*\n/g, '');
  html = html.replace(/[ \t]*<!-- Trechos entre "so-app-completo"[^\n]*\n/, '');
  html = html.replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, (_, nome) => ler(SRC, nome + '.html'));
  if (/<\?/.test(html)) throw new Error('Sobrou alguma tag de template do Apps Script em Index.html.');
  if (/so-app-completo/.test(html)) throw new Error('Marcador so-app-completo sem fechamento em Index.html.');
  return html;
}

/**
 * Arquivo único: o Codigo.gs servindo a página a partir do texto PAGINA_ (no fim do arquivo), em vez
 * do arquivo Index.html. A página vai linha a linha numa lista (JSON), para o editor abrir sem travar.
 */
function gerarArquivoUnico() {
  let codigo = gerarCodigo();
  const chamadas = codigo.split("HtmlService.createHtmlOutputFromFile('Index')").length - 1;
  if (chamadas !== 2) throw new Error('Esperava 2 chamadas a createHtmlOutputFromFile no Codigo.gs (achei ' + chamadas + ').');
  codigo = codigo.split("HtmlService.createHtmlOutputFromFile('Index')").join('HtmlService.createHtmlOutput(PAGINA_)');
  const linhas = gerarIndex().split('\n').map((l) => '  ' + JSON.stringify(l)).join(',\n');
  return [
    '/**',
    ' * PLANO DE VAREJO · VISUALIZADOR — ARQUIVO ÚNICO PARA O APPS SCRIPT',
    ' *',
    ' * Cole este arquivo inteiro no Código.gs do projeto (Extensões > Apps Script, na planilha com os',
    ' * ciclos) e publique como App da Web. Não precisa criar o Index.html: a página está no fim deste',
    ' * arquivo (PAGINA_). Passo a passo em visualizador/LEIAME.md.',
    ' *',
    ' * Gerado por dev/build-visualizador.js (npm run build:visualizador). Não edite à mão.',
    ' */',
    '',
    codigo.trim(),
    '',
    '/* ===== Página do app (gerada a partir de src/Index.html) ===== */',
    'const PAGINA_ = [',
    linhas,
    "].join('\\n');",
    '',
  ].join('\n');
}

function gerar() {
  fs.mkdirSync(DESTINO, { recursive: true });
  const arquivos = {
    'Codigo.gs': gerarCodigo(),
    'Index.html': gerarIndex(),
    'appsscript.json': ler(SRC, 'appsscript.json'),
  };
  Object.keys(arquivos).forEach((nome) => fs.writeFileSync(path.join(DESTINO, nome), arquivos[nome]));
  const unico = gerarArquivoUnico();
  fs.writeFileSync(ARQUIVO_UNICO, unico);
  arquivos[path.relative(DESTINO, ARQUIVO_UNICO)] = unico;
  return arquivos;
}

if (require.main === module) {
  const arquivos = gerar();
  Object.keys(arquivos).forEach((nome) => {
    console.log('Gerado: ' + path.relative(RAIZ, path.join(DESTINO, nome)) + ' (' + Math.round(arquivos[nome].length / 1024) + ' KB)');
  });
}

module.exports = { gerar, gerarCodigo, gerarIndex, gerarArquivoUnico, DESTINO, ARQUIVO_UNICO };
