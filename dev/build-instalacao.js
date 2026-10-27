/**
 * Gera a pasta instalacao/: os arquivos para colar no Google Apps Script.
 *
 *   - App completo - Plano de Varejo.gs  = o app inteiro num ARQUIVO SÓ: src/*.gs com a página
 *                                           (src/Index.html e os HTML incluídos) embutida como texto,
 *                                           servida sem o Index.html;
 *   - appsscript.json                    = o manifesto.
 *
 * O passo a passo está em instalacao/GUIA DE INSTALAÇÃO E ATUALIZAÇÃO.md (escrito à mão).
 * Usa os mesmos arquivos de src/ (nada é duplicado). Rodar:  npm run build:instalacao
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SRC = path.join(RAIZ, 'src');
const DESTINO = path.join(RAIZ, 'instalacao');
const ARQUIVOS = {
  completo: path.join(DESTINO, 'App completo - Plano de Varejo.gs'),
  manifesto: path.join(DESTINO, 'appsscript.json'),
};
const ler = (...p) => fs.readFileSync(path.join(...p), 'utf8');

/** Página do app completo: src/Index.html com os HTML incluídos (como o Apps Script faria). */
function gerarPaginaCompleta() {
  let html = ler(SRC, 'Index.html');
  html = html.replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, (_, nome) => ler(SRC, nome + '.html'));
  if (/<\?/.test(html)) throw new Error('Sobrou alguma tag de template do Apps Script em Index.html.');
  return html;
}

/** Código do servidor do app completo, servindo a página a partir do texto PAGINA_ (no fim do arquivo). */
function gerarCompleto() {
  let codigo = ['Config.gs', 'Dados.gs', 'Code.gs', 'Layouts.gs', 'Validacao.gs', 'Rascunhos.gs', 'Antecipacoes.gs', 'Prateleiras.gs']
    .map((f) => '/* ===== src/' + f + ' ===== */\n' + ler(SRC, f).trim() + '\n')
    .join('\n');
  const molde = "HtmlService.createTemplateFromFile('Index')\n    .evaluate()";
  const molde2 = "HtmlService.createTemplateFromFile('Index').evaluate()";
  const n = codigo.split(molde).length - 1 + codigo.split(molde2).length - 1;
  if (n !== 2) throw new Error('Esperava 2 chamadas a createTemplateFromFile no Code.gs (achei ' + n + ').');
  codigo = codigo.split(molde).join('HtmlService.createHtmlOutput(PAGINA_)').split(molde2).join('HtmlService.createHtmlOutput(PAGINA_)');
  const linhas = gerarPaginaCompleta().split('\n').map((l) => '  ' + JSON.stringify(l)).join(',\n');
  return [
    '/**',
    ' * PLANO DE VAREJO · APP COMPLETO — ARQUIVO ÚNICO PARA O APPS SCRIPT',
    ' *',
    ' * Cole este arquivo inteiro no Código.gs do projeto (Extensões > Apps Script, na planilha) e apague',
    ' * os outros arquivos .gs e .html do projeto (fica só ele e o appsscript.json). A página está no fim',
    ' * deste arquivo (PAGINA_). Passo a passo em instalacao/GUIA DE INSTALAÇÃO E ATUALIZAÇÃO.md.',
    ' *',
    ' * Gerado por dev/build-instalacao.js (npm run build:instalacao). Não edite à mão.',
    ' */',
    '',
    codigo.trim(),
    '',
    '/* ===== Página do app (gerada a partir de src/Index.html e dos HTML incluídos nela) ===== */',
    'const PAGINA_ = [',
    linhas,
    "].join('\\n');",
    '',
  ].join('\n');
}

function gerar() {
  fs.mkdirSync(DESTINO, { recursive: true });
  const arquivos = {
    [ARQUIVOS.completo]: gerarCompleto(),
    [ARQUIVOS.manifesto]: ler(SRC, 'appsscript.json'),
  };
  Object.keys(arquivos).forEach((f) => fs.writeFileSync(f, arquivos[f]));
  return arquivos;
}

if (require.main === module) {
  const arquivos = gerar();
  Object.keys(arquivos).forEach((f) => {
    console.log('Gerado: ' + path.relative(RAIZ, f) + ' (' + Math.round(arquivos[f].length / 1024) + ' KB)');
  });
}

module.exports = { gerar, gerarCompleto, gerarPaginaCompleta, ARQUIVOS };
