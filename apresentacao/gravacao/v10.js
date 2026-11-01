// Vídeo 10: validação — o validador comenta num móvel, o construtor responde e resolve, o validador publica.
const { abrir, Gravador, movel } = require('./lib');
const SENHA = { VALIDADOR: 'validacao_exposicao', CONSTRUTOR: 'construcao_exposicao' };
const BOTAO = { VALIDADOR: '#btnValidacao', CONSTRUTOR: '#btnConstrucao' };

(async () => {
  const { p, fechar } = await abrir();
  // O construtor já montou o C16 (cópia do C15) e enviou para aprovação.
  await p.evaluate(async () => {
    const C = { papel: 'CONSTRUTOR', senha: 'construcao_exposicao', nome: 'Bruno' };
    const run = (pedido) => new Promise((ok, falha) => google.script.run.withSuccessHandler(ok).withFailureHandler(falha).salvarRascunho(C, pedido));
    await run({ acao: 'criar', ciclo: 'C16/2026', origem: 'C15/2026', copiar: 'tudo' });
    await run({ acao: 'enviar', ciclo: 'C16/2026' });
  });
  await p.reload();
  await p.waitForFunction(() => typeof App !== 'undefined' && App.estado.dados);
  await p.click('#btnConfig');
  await p.click(BOTAO.VALIDADOR);
  await p.waitForSelector('#dlgAcesso[open]');
  await p.fill('#acessoNome', 'Ana');
  await p.fill('#acessoSenha', SENHA.VALIDADOR);
  await p.click('#acessoEntrar');
  await p.waitForSelector('#dlgAcesso', { state: 'hidden' });
  await p.waitForFunction(() => App.estado.ciclo === 'C16/2026');
  await p.waitForSelector('#toast', { state: 'hidden', timeout: 12000 }).catch(() => {});
  await p.waitForTimeout(500);

  const g = new Gravador(p, 'v10-validacao');
  g.ritmo = 0.72; // mouse um pouco mais rápido: são três papéis em um vídeo
  const painel = { x: 1180, y: 160, w: 420, h: 740 };
  /** Troca de papel: Sair e entrar pelo menu da engrenagem. */
  const entrar = async (papel, nome) => {
    if (await p.isVisible('#painelConstrucao')) await g.clicar(p.locator('#pcTopo button', { hasText: 'Comentários' }), { depois: 300 });
    await g.clicar(p.locator('#valCorpo .val-quem button', { hasText: 'Sair' }), { depois: 500 });
    await g.clicar('#btnConfig', { depois: 150 });
    await g.clicar(BOTAO[papel], { depois: 250 });
    await p.fill('#acessoNome', '');
    await g.cam('#dlgAcesso', { margem: 40, dur: 0.5, zoomMax: 2 });
    await g.digitar('#acessoNome', nome, { delay: 30 });
    await p.fill('#acessoSenha', SENHA[papel]);
    await g.clicar('#acessoEntrar', { depois: 100 });
    await g.cam('tudo', { dur: 0.6 });
    await p.waitForSelector('#dlgAcesso', { state: 'hidden' });
    if (await p.evaluate(() => App.estado.ciclo !== 'C16/2026')) await p.selectOption('#selCiclo', 'C16/2026');
    await p.waitForFunction(() => App.estado.ciclo === 'C16/2026' && !document.getElementById('barraRascunho').hidden);
    await p.waitForTimeout(400);
    await p.waitForSelector('#toast', { state: 'hidden', timeout: 6000 }).catch(() => {});
  };

  await g.iniciar();
  await g.espera(600);
  // Validador: o ciclo aguarda aprovação.
  const b0 = await p.locator('#barraRascunho').boundingBox();
  await g.cam({ x: b0.x, y: b0.y - 10, w: 900, h: b0.height + 20 }, { dur: 0.9 });
  await g.espera(1300);
  // Comenta na pirâmide 1: escolhe na planta e escreve.
  await g.cam('tudo', { dur: 0.7 });
  await g.clicar(p.locator('#valCorpo .val-novo button', { hasText: 'Escolher na planta' }), { depois: 300 });
  await g.clicarDom(movel('PIRAMIDE 1'), { depois: 500 });
  await g.cam(painel, { dur: 0.8 });
  await g.digitar('#valCorpo .val-novo textarea', 'UOMINI HERO rende abaixo do espaço. Avaliar a troca.', { delay: 16 });
  await g.clicar('#valCorpo .val-novo button[type="submit"]', { depois: 700 });
  await p.waitForSelector('#valCorpo .val-cartao');
  // O balão laranja aparece no móvel.
  const pir = await p.locator(movel('PIRAMIDE 1')).first().boundingBox();
  await g.cam({ x: pir.x - 150, y: pir.y - 140, w: pir.width + 300, h: pir.height + 220 }, { dur: 0.9, zoomMax: 2.3 });
  await g.espera(1300);
  // Construtor: vê o comentário, responde e resolve.
  await g.cam('tudo', { dur: 0.7 });
  await entrar('CONSTRUTOR', 'Bruno');
  await g.cam(painel, { dur: 0.8 });
  const cartao = p.locator('#valCorpo .val-cartao').first();
  await g.clicar(cartao.locator('button', { hasText: 'Responder' }).first(), { depois: 300 });
  await g.digitar(cartao.locator('.val-responder textarea'), 'Combinado: entra no C17.', { delay: 20 });
  await g.clicar(cartao.locator('.val-responder button[type="submit"]'), { depois: 600 });
  await g.clicar(p.locator('#valCorpo .val-cartao button', { hasText: 'Marcar como resolvido' }).first(), { depois: 700 });
  // Validador: publica o ciclo, que passa a valer para todos.
  await g.cam('tudo', { dur: 0.7 });
  await entrar('VALIDADOR', 'Ana');
  const bb = await p.locator('#barraRascunho').boundingBox();
  await g.cam({ x: bb.x + bb.width - 760, y: bb.y - 10, w: 760, h: bb.height + 20 }, { dur: 0.8 });
  await g.clicar(p.locator('#rascunhoAcoes button', { hasText: 'Publicar ciclo' }), { depois: 400 });
  await p.waitForFunction(() => App.estado.dados.ciclos.includes('C16/2026'));
  await g.cam('tudo', { dur: 0.8 });
  await g.espera(600);
  await g.cam({ x: 0, y: 0, w: 900, h: 140 }, { dur: 0.8 });
  await g.espera(1400);
  await g.parar();
  await fechar();
})();
