/**
 * Gera visualizador/apps-script/: a versão só de visualização para o Google Apps Script.
 * São só dois arquivos (mais o manifesto), fáceis de colar no editor do Apps Script:
 *
 *   - Codigo.gs  = visualizador/fonte/Visualizador.gs + src/Config.gs, Layouts.gs (sem o ciclo de
 *                  exemplo) e Dados.gs;
 *   - Index.html = src/Index.html com Styles, Render e App embutidos, sem os trechos marcados
 *                  com <!-- so-app-completo --> (Construir loja, Baixar / Importar planilha).
 *
 * Usa os mesmos arquivos de src/ (nada é duplicado). Rodar:  npm run build:visualizador
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SRC = path.join(RAIZ, 'src');
const FONTE = path.join(RAIZ, 'visualizador', 'fonte');
const DESTINO = path.join(RAIZ, 'visualizador', 'apps-script');
const ler = (...p) => fs.readFileSync(path.join(...p), 'utf8');

/** Tira os trechos entre "// <so-app-completo>" e "// </so-app-completo>" (o ciclo de exemplo). */
function semCicloExemplo(codigo) {
  const limpo = codigo.replace(/^\/\/ <so-app-completo>[^\n]*\n[\s\S]*?^\/\/ <\/so-app-completo>\n\n?/gm, '');
  if (/so-app-completo|EXEMPLO_|Ciclo exemplo/.test(limpo)) throw new Error('Sobrou ciclo de exemplo em Layouts.gs.');
  return limpo;
}

function gerarCodigo() {
  const partes = [
    ['visualizador/fonte/Visualizador.gs', ler(FONTE, 'Visualizador.gs')],
    ['src/Config.gs', ler(SRC, 'Config.gs')],
    ['src/Layouts.gs', semCicloExemplo(ler(SRC, 'Layouts.gs'))],
    ['src/Dados.gs', ler(SRC, 'Dados.gs')],
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

function gerar() {
  fs.mkdirSync(DESTINO, { recursive: true });
  const arquivos = {
    'Codigo.gs': gerarCodigo(),
    'Index.html': gerarIndex(),
    'appsscript.json': ler(SRC, 'appsscript.json'),
  };
  Object.keys(arquivos).forEach((nome) => fs.writeFileSync(path.join(DESTINO, nome), arquivos[nome]));
  return arquivos;
}

if (require.main === module) {
  const arquivos = gerar();
  Object.keys(arquivos).forEach((nome) => {
    console.log('Gerado: visualizador/apps-script/' + nome + ' (' + Math.round(arquivos[nome].length / 1024) + ' KB)');
  });
}

module.exports = { gerar, gerarCodigo, gerarIndex, DESTINO };
