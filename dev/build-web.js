/**
 * Gera index.html (na raiz do projeto): a versão estática do visualizador (um único arquivo),
 * para publicar no netli.fyi / Netlify ou abrir direto no navegador.
 *
 * Usa os mesmos arquivos de src/ (nada é duplicado):
 *   - Config.gs, Dados.gs, Code.gs e Layouts.gs rodam no navegador;
 *   - web/backend-local.js troca o google.script.run por localStorage.
 *
 * Rodar:  npm run build:web
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SRC = path.join(RAIZ, 'src');
const ler = (...p) => fs.readFileSync(path.join(...p), 'utf8');

const gs = ['Config.gs', 'Dados.gs', 'Code.gs', 'Layouts.gs', 'Validacao.gs']
  .map((f) => '/* ===== src/' + f + ' ===== */\n' + ler(SRC, f))
  .join('\n');
const backend = ler(RAIZ, 'web', 'backend-local.js');
const scriptLocal = '<script>\n' + (gs + '\n' + backend).replace(/<\/script/gi, '<\\/script') + '\n</script>';

let html = ler(SRC, 'Index.html');
html = html.replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, (_, nome) => ler(SRC, nome + '.html'));
if (/<\?/.test(html)) throw new Error('Sobrou alguma tag de template do Apps Script em Index.html.');
html = html.replace('<base target="_top">\n', '');
html = html.replace('</head>', scriptLocal + '\n  </head>');

const destino = path.join(RAIZ, 'index.html');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, html);
console.log('Gerado: ' + path.relative(RAIZ, destino) + ' (' + Math.round(html.length / 1024) + ' KB)');
