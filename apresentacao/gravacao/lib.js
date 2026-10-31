/**
 * Base da gravação: serve o index.html, abre o Chromium com os dados de demonstração, grava a tela pelo
 * screencast do DevTools (quadros JPEG com o horário) e registra o mouse e a "câmera" (recortes) com o horário,
 * para o render.py montar o vídeo com zoom e cursor.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const { semente } = require('./semente');

const RAIZ = path.join(__dirname, '..', '..');
const VW = 1600;
const VH = 900;
const DPR = 2;

async function servidor() {
  const s = http.createServer((req, res) => {
    if (req.url !== '/' && !req.url.startsWith('/index.html')) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(RAIZ, 'index.html')));
  });
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
  return s;
}

const CSS_DEMO = `
  #avisoLocal { display: none !important; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,.25); border-radius: 8px; }
`;

async function abrir(opcoes) {
  const op = Object.assign({ tutorial: false, hash: '', escuro: false, extra: null }, opcoes);
  const srv = await servidor();
  const nav = await chromium.launch({ args: ['--font-render-hinting=none', '--force-device-scale-factor=2', '--window-size=1600,900'] });
  const ctx = await nav.newContext({
    viewport: { width: VW, height: VH }, screen: { width: VW, height: VH }, deviceScaleFactor: DPR, acceptDownloads: true,
    colorScheme: op.escuro ? 'dark' : 'light', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
  });
  const dados = semente();
  if (op.extra) op.extra(dados);
  await ctx.addInitScript(([s, tutorial]) => {
    if (!localStorage.getItem('planoVarejo.planilhaLocal.v1')) localStorage.setItem('planoVarejo.planilhaLocal.v1', s);
    if (!tutorial) localStorage.setItem('planoVarejo.tutorialVisto', '1');
    if (!localStorage.getItem('planoVarejo.painelLoja')) localStorage.setItem('planoVarejo.painelLoja', '0');
  }, [JSON.stringify(dados), op.tutorial]);
  await ctx.addInitScript((css) => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    });
  }, CSS_DEMO);
  if (op.antes) await op.antes(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('pageerror:', e.message));
  p.on('dialog', (d) => d.accept());
  await p.goto('http://127.0.0.1:' + srv.address().port + '/' + op.hash);
  await p.waitForFunction(() => typeof App !== 'undefined' && App.estado.dados && App.estado.dados.ciclos.length);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  const fechar = async () => { await ctx.close(); await nav.close(); srv.close(); };
  return { p, ctx, nav, fechar };
}

/** Gravador: screencast + log do mouse e da câmera. */
class Gravador {
  constructor(p, nome) {
    this.p = p;
    this.nome = nome;
    this.dir = path.join(__dirname, 'out', nome);
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(this.dir, 'q'), { recursive: true });
    this.quadros = [];
    this.mouse = [];
    this.cliques = [];
    this.camera = [];
    this.legendas = [];
    this.pos = { x: VW * 0.86, y: VH * 0.9 };
  }
  agora() { return Date.now() / 1000; }

  async iniciar() {
    await this.p.mouse.move(this.pos.x, this.pos.y);
    await this.p.waitForTimeout(300);
    this.cdp = await this.p.context().newCDPSession(this.p);
    let n = 0;
    this.cdp.on('Page.screencastFrame', async (f) => {
      const arq = String(n++).padStart(6, '0') + '.jpg';
      fs.writeFileSync(path.join(this.dir, 'q', arq), Buffer.from(f.data, 'base64'));
      this.quadros.push({ t: f.metadata.timestamp, arq });
      try { await this.cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) { /* fim */ }
    });
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VW * DPR, maxHeight: VH * DPR, everyNthFrame: 1 });
    this.inicio = this.agora();
    this.camera.push({ t: this.inicio, x: 0, y: 0, w: VW, h: VH, dur: 0 });
    this.mouse.push({ t: this.inicio, x: this.pos.x, y: this.pos.y });
    // Um "toque" na página para o primeiro quadro sair.
    await this.p.evaluate(() => { document.body.style.outline = '0px solid transparent'; });
    await this.p.waitForTimeout(400);
  }

  async parar() {
    await this.p.waitForTimeout(300);
    this.fim = this.agora();
    await this.cdp.send('Page.stopScreencast');
    await this.p.waitForTimeout(300);
    fs.writeFileSync(path.join(this.dir, 'roteiro.json'), JSON.stringify({
      inicio: this.inicio, fim: this.fim, vw: VW, vh: VH, dpr: DPR,
      quadros: this.quadros, mouse: this.mouse, cliques: this.cliques, camera: this.camera, legendas: this.legendas,
    }));
    console.log(this.nome + ': ' + this.quadros.length + ' quadros, ' + (this.fim - this.inicio).toFixed(1) + ' s');
  }

  /** Rola suavemente até o elemento (dentro do painel que rola). */
  async rolar(seletor, bloco) {
    await this.p.locator(seletor).first().evaluate((e, b) => e.scrollIntoView({ behavior: 'smooth', block: b || 'start' }), bloco);
    await this.p.waitForTimeout(900);
  }

  async espera(ms) { await this.p.waitForTimeout(ms); }

  /** Câmera: recorte (em px CSS) com transição de `dur` segundos. `alvo` = {x,y,w,h} ou seletor/locator. */
  async cam(alvo, opcoes) {
    const op = Object.assign({ dur: 0.9, margem: 40, zoomMax: 2.2 }, opcoes);
    let r = alvo;
    if (alvo === 'tudo') r = { x: 0, y: 0, w: VW, h: VH };
    else if (typeof alvo === 'string' || (alvo && alvo.boundingBox)) {
      const loc = typeof alvo === 'string' ? this.p.locator(alvo).first() : alvo;
      const b = await loc.boundingBox();
      r = { x: b.x - op.margem, y: b.y - op.margem, w: b.width + 2 * op.margem, h: b.height + 2 * op.margem };
    }
    // Ajusta para 16:9, sem passar do zoom máximo e sem sair da tela.
    let w = Math.max(r.w, r.h * 16 / 9, VW / op.zoomMax);
    w = Math.min(w, VW);
    const h = w * 9 / 16;
    let x = r.x + r.w / 2 - w / 2;
    let y = r.y + r.h / 2 - h / 2;
    x = Math.max(0, Math.min(VW - w, x));
    y = Math.max(0, Math.min(VH - h, y));
    this.camera.push({ t: this.agora(), x, y, w, h, dur: op.dur });
  }

  /** Câmera na planta desenhada (móveis e etiquetas visíveis). */
  async camPlanta(opcoes) {
    const r = await this.p.evaluate(() => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      document.querySelectorAll('#slide .movel, #slide .grupo-etiquetas').forEach((e) => {
        const b = e.getBoundingClientRect();
        if (!b.width || b.right < 0 || b.left > innerWidth) return;
        x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
      });
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    });
    await this.cam(r, Object.assign({ dur: 1 }, opcoes));
  }

  legenda(texto) { this.legendas.push({ t: this.agora(), texto }); }

  /** Aperta uma tecla mostrando o selo dela no vídeo. */
  async tecla(tecla, rotulo, depois) {
    this.legenda(rotulo || tecla);
    await this.p.keyboard.press(tecla);
    await this.espera(depois || 900);
  }

  /** Move o mouse em curva suave até (x, y), registrando cada passo. */
  async mover(x, y, dur) {
    const d = dur || Math.min(0.9, 0.35 + Math.hypot(x - this.pos.x, y - this.pos.y) / 1600);
    const passos = Math.max(8, Math.round(d * 40));
    const x0 = this.pos.x;
    const y0 = this.pos.y;
    for (let i = 1; i <= passos; i++) {
      const k = i / passos;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const px = x0 + (x - x0) * e;
      const py = y0 + (y - y0) * e;
      await this.p.mouse.move(px, py);
      this.mouse.push({ t: this.agora(), x: px, y: py });
      await this.p.waitForTimeout((d * 1000) / passos);
    }
    this.pos = { x, y };
  }

  async centro(alvo, dx, dy) {
    const loc = typeof alvo === 'string' ? this.p.locator(alvo).first() : alvo;
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const b = await loc.boundingBox();
    if (!b) throw new Error('sem caixa: ' + alvo);
    return { x: b.x + (dx == null ? b.width / 2 : dx), y: b.y + (dy == null ? b.height / 2 : dy) };
  }

  async ir(alvo, dx, dy) { const c = await this.centro(alvo, dx, dy); await this.mover(c.x, c.y); return c; }

  async clicar(alvo, opcoes) {
    const op = Object.assign({ antes: 180, depois: 450 }, opcoes);
    const c = await this.ir(alvo, op.dx, op.dy);
    await this.espera(op.antes);
    this.cliques.push({ t: this.agora(), x: c.x, y: c.y });
    if (!op.semClique) {
      await this.p.mouse.down();
      await this.p.waitForTimeout(70);
      await this.p.mouse.up();
    }
    await this.espera(op.depois);
  }

  /** Clica pelo DOM (para elementos SVG que o Playwright acha cobertos), mostrando o cursor indo até lá. */
  async clicarDom(seletor, opcoes) {
    const op = Object.assign({ depois: 500 }, opcoes);
    const c = await this.ir(seletor, op.dx, op.dy);
    await this.espera(150);
    this.cliques.push({ t: this.agora(), x: c.x, y: c.y });
    await this.p.evaluate((s) => document.querySelector(s).dispatchEvent(new MouseEvent('click', { bubbles: true })), seletor);
    await this.espera(op.depois);
  }

  async selecionar(alvo, valor, opcoes) {
    const loc = typeof alvo === 'string' ? this.p.locator(alvo).first() : alvo;
    await this.clicar(loc, Object.assign({ depois: 120 }, opcoes, { semClique: true }));
    await loc.selectOption(valor);
    await this.espera((opcoes && opcoes.depois) || 450);
  }

  async digitar(alvo, texto, opcoes) {
    const loc = typeof alvo === 'string' ? this.p.locator(alvo).first() : alvo;
    await this.clicar(loc, { depois: 150 });
    await loc.fill('');
    await loc.pressSequentially(texto, { delay: (opcoes && opcoes.delay) || 55 });
    await this.espera(250);
  }
}

module.exports = { abrir, Gravador, VW, VH, DPR };

/** Entra na Construção (sem gravar). */
async function entrarConstrucao(p, nome) {
  await p.click('#btnConfig'); await p.click('#btnConstrucao');
  await p.waitForSelector('#dlgAcesso[open]');
  await p.fill('#acessoNome', nome || 'Bruno');
  await p.fill('#acessoSenha', 'construcao_exposicao');
  await p.click('#acessoEntrar');
  await p.waitForSelector('#dlgAcesso', { state: 'hidden' });
  await p.waitForTimeout(400);
  await p.waitForSelector('#toast', { state: 'hidden', timeout: 12000 }).catch(() => {});
}

/** Cria o ciclo em construção copiando outro (sem gravar). */
async function novoCiclo(p, nome, de) {
  await p.locator('.rs-secao button', { hasText: 'Novo ciclo' }).click();
  await p.fill('#rascunhoCorpo input', nome);
  await p.selectOption('#rascunhoCorpo select', de);
  await p.click('#rascunhoOk');
  await p.waitForSelector('#dlgRascunho', { state: 'hidden' });
  await p.waitForTimeout(600);
}

/** Seletor CSS de um móvel na planta. */
const movel = (id) => '#slide .movel[data-movel="' + id + '"]';

module.exports.entrarConstrucao = entrarConstrucao;
module.exports.novoCiclo = novoCiclo;
module.exports.movel = movel;
