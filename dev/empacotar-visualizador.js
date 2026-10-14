/**
 * Gera visualizador/Plano de Varejo - Visualizador (Apps Script).zip: o pacote para download, com
 * a planilha base, os arquivos de visualizador/apps-script/ e o passo a passo de instalação.
 *
 * Rodar (depois de npm run build:visualizador):  npm run pacote:visualizador
 * Precisa do comando "zip" no sistema.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const PASTA = path.join(RAIZ, 'visualizador');
const NOME = 'Plano de Varejo - Visualizador (Apps Script)';
const DESTINO = path.join(PASTA, NOME + '.zip');

const arquivos = [
  ['PASSO-A-PASSO.md', 'LEIA PRIMEIRO - Passo a passo.txt'],
  ['Planilha base - Visualizador.xlsx', 'Planilha base - Visualizador.xlsx'],
  ['apps-script/Codigo.gs', 'Codigo.gs'],
  ['apps-script/Index.html', 'Index.html'],
  ['apps-script/appsscript.json', 'appsscript.json'],
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pacote-'));
const dir = path.join(tmp, NOME);
fs.mkdirSync(dir);
arquivos.forEach(([de, para]) => fs.copyFileSync(path.join(PASTA, de), path.join(dir, para)));
fs.rmSync(DESTINO, { force: true });
execFileSync('zip', ['-X', '-r', '-q', DESTINO, NOME], { cwd: tmp });
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Gerado: ' + path.relative(RAIZ, DESTINO));
