// Vídeo 8: facilidades — modo apresentação, PNG e modo noturno.
const fs = require('fs');
const { abrir, Gravador } = require('./lib');
(async () => {
  // Sem a tela cheia de verdade (no Chromium sem janela, o screencast em tela cheia sai cortado): o app usa a
  // alternativa dele, a planta ocupando a janela, que fica igual na gravação.
  const { p, fechar } = await abrir({ antes: (ctx) => ctx.addInitScript(() => { Element.prototype.requestFullscreen = function () { return Promise.reject(new Error('sem tela cheia')); }; }) });
  const g = new Gravador(p, 'v8-facilidades');
  await g.iniciar();
  await g.espera(900);
  // Modo apresentação: só a planta; as setas trocam a ER.
  await g.clicar('#btnApresentar', { depois: 1400 });
  await g.tecla('ArrowRight', '→', 1500);
  await g.tecla('ArrowRight', '→', 1500);
  await g.tecla('f', 'F', 1000);
  // Baixar PNG: slide completo.
  await g.clicar('#btnPng', { depois: 700 });
  await g.cam('#dlgPng', { margem: 30, dur: 0.9, zoomMax: 1.8 });
  await g.clicar('#dlgPng input[name="pngConteudo"][value="planta"]', { depois: 400 });
  await g.clicar('#dlgPng input[name="pngFormato"][value="slide"]', { depois: 700 });
  const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), g.clicar('#dlgPng button[value="baixar"]', { depois: 200 })]);
  const arq = __dirname + '/out/' + d.suggestedFilename();
  await d.saveAs(arq);
  await g.cam('tudo', { dur: 0.8 });
  // Mostra o arquivo gerado.
  const b64 = fs.readFileSync(arq).toString('base64');
  await p.evaluate(([src, nome]) => {
    const f = document.createElement('div');
    f.id = 'demoPreview';
    f.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(20,22,28,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;opacity:0;transition:opacity .4s;font:600 15px Inter,system-ui,sans-serif;color:#fff';
    f.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><span style="background:#22a06b;border-radius:99px;padding:3px 10px;font-size:13px">PNG gerado</span><span>' + nome + '</span></div>';
    const img = new Image();
    img.src = src;
    img.style.cssText = 'max-width:86vw;max-height:78vh;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.5);background:#fff';
    f.appendChild(img);
    document.body.appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = '1'; }));
  }, ['data:image/png;base64,' + b64, d.suggestedFilename()]);
  await g.espera(3200);
  await p.evaluate(() => { const f = document.getElementById('demoPreview'); f.style.opacity = '0'; setTimeout(() => f.remove(), 450); });
  await g.espera(600);
  // Modo noturno.
  await g.clicar('#btnConfig', { depois: 500 });
  await g.clicar('#btnTema', { depois: 1500 });
  await g.camPlanta({ margem: 10 });
  await g.espera(2200);
  await g.cam('tudo', { dur: 0.8 });
  await g.clicar('#btnAnalytics', { depois: 2200 });
  await g.espera(800);
  await g.parar();
  await fechar();
})();
