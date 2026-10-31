// Imagens da capa e do slide da solução (deck/media/hero.png e hero-analytics.png).
const fs = require('fs');
const { abrir } = require('./lib');
(async () => {
  fs.mkdirSync(__dirname + '/../deck/media', { recursive: true });
  const { p, fechar } = await abrir({ antes: (ctx) => ctx.addInitScript(() => { Element.prototype.requestFullscreen = function () { return Promise.reject(new Error('x')); }; }) });
  await p.click('#abasPlanta .aba:has-text("ER M")');
  await p.waitForTimeout(500);
  await p.keyboard.press('f'); await p.waitForTimeout(2500);
  await p.screenshot({ path: __dirname + '/../deck/media/hero.png' });
  await p.keyboard.press('f'); await p.waitForTimeout(800);
  await p.click('#btnAnalytics'); await p.waitForTimeout(1000);
  await p.locator('#anCorpo .an-gmv-cartao').evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(600);
  const b = await p.locator('#anCorpo .an-gmv-cartao').boundingBox();
  await p.screenshot({ path: __dirname + '/../deck/media/hero-analytics.png', clip: { x: b.x, y: b.y, width: b.width, height: Math.min(b.height, b.width * 9 / 16) } });
  await fechar();
})();
