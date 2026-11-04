/**
 * Deck "Apresentação Projeto": a versão editada no Google Apresentações, refeita a partir do PDF dela.
 * - O problema e a solução viram slides "problema vs solução": um de abertura (o resumo dos dois) e um por par
 *   de ganho (cada problema com a solução dele), com os textos do original, sem mudança.
 * - Do "Processo simplificado end-to-end" em diante, os slides seguem o original; só os ganhos foram reescritos,
 *   misturando ganhos de número e ganhos de qualidade (eficiência, aderência à estratégia, base para evoluir).
 * Os visuais que só existem no original saem do PDF com o recortes.py (media-projeto/).
 *
 * Uso: node build-projeto.js "saida.pptx" [mp4]
 */
const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const Lu = require('react-icons/lu');

const AQUI = __dirname;
const MIDIA = path.join(AQUI, 'media');
const RECORTES = path.join(AQUI, 'media-projeto');
const SAIDA = process.argv[2] || path.join(AQUI, 'Apresentacao Projeto.pptx');
const COM_VIDEO = process.argv[3] === 'mp4';

const T = {
  ink: '161E2B', ink2: '222C3D', ink3: '2C384D', texto: 'FFFFFF', suave: 'AEB6C4', claro: 'C9D0DB', linha: '3A475E', branco: 'FFFFFF',
  bot: '3E9D6B', eud: 'A11FC9', qdb: 'E23FB4', oui: 'E1262F', mm: '2B4DE3',
  problema: 'F08A8A', problemaFundo: '4A2A31', solucao: '5CC08A', solucaoFundo: '1F3A2E',
};
const DESTAQUE = ['5CC08A', 'F5B83D', '8FA3FF'];
const MARCAS = [T.bot, T.eud, T.qdb, T.oui, T.mm];
const FONTE = 'Arial';

async function icone(nome, cor) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Lu[nome], { color: '#' + cor, size: 256, strokeWidth: 2 }));
  const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return 'image/png;base64,' + png.toString('base64');
}

/** Tamanho de uma imagem (px), para encaixar sem distorcer. */
async function tamanho(arq) {
  const m = await sharp(arq).metadata();
  return { w: m.width, h: m.height };
}

/** "texto com **negrito**" → runs do pptxgenjs. */
function runs(texto, base) {
  return texto.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => {
    const negrito = /^\*\*.*\*\*$/.test(p);
    return { text: negrito ? p.slice(2, -2) : p, options: Object.assign({}, base, negrito ? { bold: true } : {}) };
  });
}

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
  pres.title = 'Apresentação Projeto — Plano de Varejo ER';
  pres.author = 'Trade Marketing';
  pres.theme = { headFontFace: FONTE, bodyFontFace: FONTE };

  const txt = (s, texto, o) => s.addText(texto, Object.assign({ isTextBox: true, fontFace: FONTE, margin: 0, valign: 'top' }, o));
  const bolinhas = (s, x, y, d, cores) => (cores || MARCAS).forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: x + i * d * 1.55, y, w: d, h: d, fill: { color: c }, line: { color: c } }));
  const novoSlide = (fundo) => { const s = pres.addSlide(); s.background = { color: fundo || T.ink }; return s; };
  const secao = (s, nome, cores) => {
    bolinhas(s, 0.6, 0.47, 0.13, cores);
    txt(s, nome.toUpperCase(), { x: 0.6 + (cores || MARCAS).length * 0.2 + 0.2, y: 0.39, w: 11, h: 0.3, fontSize: 12, bold: true, charSpacing: 3, color: T.suave });
  };
  const cartao = (s, x, y, w, h, cor, borda) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: cor || T.ink2 }, line: { color: borda || cor || T.ink2, width: borda ? 1.5 : 0.75 } });
  const circuloIcone = async (s, nome, x, y, d, fundo, cor) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fundo }, line: { color: fundo } });
    s.addImage({ altText: 'Ícone', data: await icone(nome, cor), x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52 });
  };
  /** Imagem encaixada (sem distorcer) na caixa x, y, w, h, centralizada. */
  const encaixar = async (s, arq, caixa, alt) => {
    const t = await tamanho(arq);
    const k = Math.min(caixa.w / t.w, caixa.h / t.h);
    const w = t.w * k, h = t.h * k;
    s.addImage({ path: arq, x: caixa.x + (caixa.w - w) / 2, y: caixa.y + (caixa.h - h) / 2, w, h, altText: alt });
  };

  // 1. Capa (como no original) -------------------------------------------------
  {
    const s = novoSlide();
    s.addImage({ path: path.join(RECORTES, 'capa-planta.png'), x: 0, y: 0, w: 7.5 * 1560 / 1689, h: 7.5, altText: 'Planta de uma ER no app, com a estratégia do C05/2027' });
    const icones = [['LuPencilRuler', T.bot], ['LuShieldCheck', T.eud], ['LuChartColumn', T.mm]];
    for (let i = 0; i < 3; i++) await circuloIcone(s, icones[i][0], 7.45 + i * 0.68, 1.85, 0.56, icones[i][1], T.branco);
    txt(s, 'A SOLUÇÃO', { x: 9.6, y: 1.85, w: 3.4, h: 0.56, fontSize: 20, charSpacing: 4, color: T.branco, valign: 'middle' });
    txt(s, 'Plano de Varejo ER', { x: 7.45, y: 2.6, w: 5.6, h: 0.85, fontSize: 40, bold: true, color: T.branco, valign: 'middle' });
    s.addShape(pres.shapes.RECTANGLE, { x: 7.5, y: 3.55, w: 5.4, h: 0.6, fill: { color: T.bot }, line: { color: T.bot } });
    txt(s, 'AUTOMATIZADO', { x: 7.5, y: 3.55, w: 5.4, h: 0.6, fontSize: 22, bold: true, color: T.branco, align: 'center', valign: 'middle' });
    txt(s, runs('Estratégia de exposição\n**construída, validada e medida**\nno mesmo lugar', { color: T.claro }), { x: 7.5, y: 4.35, w: 5.5, h: 1.4, fontSize: 21 });
    s.addNotes('Abertura (10 s). Plano de Varejo ER automatizado: a estratégia de exposição construída, validada e medida no mesmo lugar.');
  }

  // 2. Problema vs solução: o resumo ---------------------------------------------
  {
    const s = novoSlide();
    secao(s, 'O problema  vs  a solução');
    // problema
    cartao(s, 0.6, 1.1, 5.75, 5.85, T.ink2, T.problemaFundo);
    txt(s, 'O PROBLEMA', { x: 0.95, y: 1.4, w: 5, h: 0.3, fontSize: 13, bold: true, charSpacing: 3, color: T.problema });
    txt(s, '~31h', { x: 0.95, y: 1.8, w: 5, h: 0.95, fontSize: 60, bold: true, color: T.problema, valign: 'middle' });
    txt(s, runs('**Construção de estratégia de exposição e análises simples custava ~31h horas por ciclo**, gerando vários arquivos descentralizados de **difícil atualização** no ritmo da estratégia e **sem mensuração de resultados**', { color: T.texto }),
      { x: 0.95, y: 2.95, w: 5.1, h: 2.3, fontSize: 17 });
    txt(s, runs('**Resultado:** espaço decidido com poucos dados, horas gastas em formatação e reação lenta quando a estratégia mudava.', { color: T.claro }),
      { x: 0.95, y: 5.45, w: 5.1, h: 1.2, fontSize: 14 });
    // seta
    await circuloIcone(s, 'LuArrowRight', 6.42, 3.78, 0.5, T.ink3, T.branco);
    // solução
    cartao(s, 6.98, 1.1, 5.75, 5.85, T.ink2, T.solucaoFundo);
    txt(s, 'A SOLUÇÃO', { x: 7.33, y: 1.4, w: 5, h: 0.3, fontSize: 13, bold: true, charSpacing: 3, color: T.solucao });
    txt(s, [{ text: '~4h', options: { fontSize: 60, bold: true, color: T.solucao } }, { text: '   -87%', options: { fontSize: 28, bold: true, color: T.solucao } }],
      { x: 7.33, y: 1.8, w: 5, h: 0.95, valign: 'middle' });
    txt(s, runs('Com **automatização do plano de varejo**, **construção de estratégia leva ~4h** (-87% vs modelo anterior) e habilita análises aprofundadas de espaço e', { color: T.texto }),
      { x: 7.33, y: 2.95, w: 5.1, h: 2.3, fontSize: 17 });
    txt(s, runs('Estratégia de exposição **construída, validada e mensurada** no mesmo lugar.', { color: T.claro }),
      { x: 7.33, y: 5.45, w: 5.1, h: 1.2, fontSize: 14 });
    s.addNotes('O problema vs a solução (1 min).\n\nAntes: a construção da estratégia de exposição e das análises simples custava cerca de 31 horas por ciclo, em vários arquivos descentralizados, difíceis de atualizar no ritmo da estratégia e sem mensuração de resultados. O resultado era espaço decidido com poucos dados, horas em formatação e reação lenta.\n\nAgora: com o plano de varejo automatizado, a construção da estratégia leva cerca de 4 horas, 87% menos, e habilita análises aprofundadas de espaço.\n\nOs próximos slides mostram cada problema ao lado da solução dele.');
  }

  // 3–8. Problema vs solução, um par por slide -------------------------------------
  const pares = [
    { p: ['LuHand', 'Toda manual', '**~5h de dedicação** para construção de estratégia macro  **por ciclo**', 'antes-ppt.png', 'Print de um plano de varejo antigo, montado à mão no PPT'],
      s: ['LuZap', 'Maior velocidade', '**Trabalho de formatação eliminado** tornado construção de estratégia mais eficaz', 'depois-app.png', 'O app com a planta da ER e o painel de construção'],
      notas: 'Antes, a estratégia macro de cada ciclo levava cerca de 5 horas de dedicação, montada à mão no PPT. Agora, o trabalho de formatação foi eliminado: a estratégia é montada direto na planta do app.' },
    { p: ['LuTriangleAlert', 'Sujeita a erros', 'Retrabalho em diversas etapas para ajustes de erros do processo'],
      s: ['LuShieldCheck', 'Redução de erros', 'Automação reduz erros do processo e permite análise de checagem em tempo real'],
      notas: 'Antes, o processo manual gerava retrabalho em várias etapas para corrigir erros. Agora, a automação reduz os erros e a checagem acontece em tempo real, enquanto a estratégia é montada.' },
    { p: ['LuEyeOff', 'Sem tracking\nde dados', '**~10h por ciclo** traduzindo **PPT para sheets** para construção de **análises simples**'],
      s: ['LuEye', 'Geração de dados', 'Construção de estratégia **acontece no app e gera planilha que viabiliza  análises** de espaço'],
      notas: 'Antes, eram cerca de 10 horas por ciclo traduzindo o PPT para planilhas, só para fazer análises simples. Agora, a estratégia é construída no app e já gera a planilha que viabiliza as análises de espaço.' },
    { p: ['LuCircleHelp', 'xx', 'xx'],
      s: ['LuCircleHelp', 'xx', 'xx'],
      notas: '[Par ainda sem texto no original (xx). Sugestão: problema "Reação lenta": uma mudança de estratégia levava até um ciclo para chegar a todas as ERs, refazendo os arquivos à mão; solução "Reação no mesmo dia": regras, plantas e espaços ajustados no app valem na hora para todas as ERs.]' },
    { p: ['LuFiles', 'Estratégia\ndescentralizada', 'Um arquivo por ciclo, com **difícil rastreabilidade** dos movimentos', 'antes-arquivos.png', 'Um arquivo de plano de varejo por ciclo: C01, C02 e C03/2026'],
      s: ['LuFileSpreadsheet', 'Estratégia e\nvisualização unificada', 'Um único arquivo para analisar, um único link para visualizar.', 'depois-arquivo.png', 'Plano de varejo em arquivo único'],
      notas: 'Antes, cada ciclo era um arquivo, e rastrear os movimentos de um ciclo para o outro era difícil. Agora, um único arquivo guarda todos os ciclos para análise, e um único link mostra a estratégia para todo mundo.' },
    { p: ['LuUnlink', 'Desconectada', '**~12h à 16h dedicadas à construção** de briefing dos móveis por ciclo', 'antes-conexao.png', 'Estratégia GB, briefing de categorias, grade VD e estratégia de combos ligados à mão ao briefing de exposição'],
      s: ['LuWorkflow', 'Conexão e automação', '**Redução de 80% do tempo de busca por dados** para construção de estratégia', 'depois-conexao.png', 'As mesmas fontes ligadas automaticamente ao briefing de exposição'],
      notas: 'Antes, o briefing dos móveis levava de 12 a 16 horas por ciclo, juntando à mão a estratégia GB, o briefing de categorias, a grade VD e a estratégia de combos. Agora, essas fontes estão conectadas ao briefing de exposição, e o tempo de busca por dados cai 80%.' },
  ];
  for (let i = 0; i < pares.length; i++) {
    const par = pares[i];
    const s = novoSlide();
    secao(s, 'O problema  vs  a solução  ·  ' + (i + 1) + '/' + pares.length);
    const comImagem = !!par.p[3];
    const y0 = comImagem ? 1.1 : 2.3, h = comImagem ? 5.85 : 3.3;
    const lados = [
      { d: par.p, x: 0.6, rotulo: 'O PROBLEMA', cor: T.problema, fundo: T.problemaFundo },
      { d: par.s, x: 6.98, rotulo: 'A SOLUÇÃO', cor: T.solucao, fundo: T.solucaoFundo },
    ];
    for (const l of lados) {
      const [ic, titulo, texto, img, alt] = l.d;
      cartao(s, l.x, y0, 5.75, h, T.ink2, l.fundo);
      txt(s, l.rotulo, { x: l.x + 0.35, y: y0 + 0.3, w: 5, h: 0.3, fontSize: 13, bold: true, charSpacing: 3, color: l.cor });
      await circuloIcone(s, ic, l.x + 0.35, y0 + 0.8, 0.8, l.fundo, l.cor);
      txt(s, titulo, { x: l.x + 1.35, y: y0 + 0.75, w: 4.1, h: 0.9, fontSize: 24, bold: true, color: T.texto, valign: 'middle' });
      txt(s, runs(texto, { color: T.claro }), { x: l.x + 0.35, y: y0 + 1.85, w: 5.05, h: 1.0, fontSize: 17 });
      if (img) await encaixar(s, path.join(RECORTES, img), { x: l.x + 0.35, y: y0 + 2.95, w: 5.05, h: h - 3.25 }, alt);
    }
    await circuloIcone(s, 'LuArrowRight', 6.42, y0 + h / 2 - 0.25, 0.5, T.ink3, T.branco);
    s.addNotes('Problema vs solução ' + (i + 1) + ' de ' + pares.length + ' (≈30 s).\n\n' + par.notas);
  }

  // 9–13. Slides com vídeo (como no original; os ganhos foram reescritos) -------------
  const V = JSON.parse(fs.readFileSync(path.join(MIDIA, 'duracoes.json'), 'utf8'));
  const dur = (v) => '0:' + String(Math.round(V[v])).padStart(2, '0');
  async function slideVideo(o) {
    const s = novoSlide();
    secao(s, o.secao);
    txt(s, runs(o.titulo, { color: T.texto, bold: !o.tituloRegular }), { x: 0.6, y: 0.78, w: 12.1, h: 1.1, fontSize: o.tamTitulo || 22, valign: 'middle' });
    const vx = 4.1, vy = 1.9, vw = 8.7, vh = vw * 9 / 16;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: vx - 0.06, y: vy - 0.06, w: vw + 0.12, h: vh + 0.12, rectRadius: 0.08, fill: { color: T.ink2 }, line: { color: T.linha, width: 1 } });
    if (COM_VIDEO) {
      s.addMedia({ type: 'video', path: path.join(MIDIA, o.video + '.mp4'), cover: 'data:image/png;base64,' + fs.readFileSync(path.join(MIDIA, o.video + '-capa.png')).toString('base64'), x: vx, y: vy, w: vw, h: vh });
    } else {
      s.addImage({ path: path.join(MIDIA, o.video + '.gif'), x: vx, y: vy, w: vw, h: vh, altText: o.alt });
    }
    if (o.legenda) txt(s, o.legenda + ' · ' + dur(o.video) + ' · sem som', { x: vx, y: vy + vh + 0.1, w: vw, h: 0.25, fontSize: 11, color: '7D879A', align: 'right' });
    txt(s, 'GANHOS', { x: 0.6, y: 2.0, w: 3.3, h: 0.3, fontSize: 12, bold: true, charSpacing: 3, color: T.suave });
    let y = 2.42;
    o.ganhos.forEach(([valor, texto], i) => {
      txt(s, valor, { x: 0.6, y, w: 3.35, h: 0.48, fontSize: 22, bold: true, color: DESTAQUE[i % 3], valign: 'middle' });
      txt(s, texto, { x: 0.6, y: y + 0.5, w: 3.35, h: 0.9, fontSize: 13, color: T.claro });
      y += 1.5;
    });
    s.addNotes(o.notas);
  }

  await slideVideo({ secao: 'Processo simplificado end-to-end', video: 'v2', legenda: 'Vídeo 2', tituloRegular: true,
    titulo: 'Da **estratégia macro** da rede **à definição de cada SKU exposto nas prateleiras** num só fluxo: briefing conectado às promoções do ciclo pronto com alguns cliques',
    ganhos: [
      ['Poucos cliques', 'para o briefing de todas as ERs, conectado às promoções do ciclo (antes ~12h a 16h)'],
      ['−80%', 'do tempo dedicado à construção da estratégia dos planogramas'],
      ['Execução fiel', 'o SKU da prateleira é o do movimento definido, com código por quadrado: menos ruído até a loja'],
    ],
    alt: 'Vídeo: na gôndola 1, a prateleira é dividida em quadrados com produtos de BOTIPROMO e LÇTO EGEO; depois o briefing em PDF é gerado.',
    notas: 'Processo simplificado end-to-end (≈1 min).\n\nNarração: abro a gôndola e desenho a prateleira: arrasto para criar um quadrado, escolho o movimento e os produtos aparecem filtrados pelo movimento, puxados do catálogo. Salvo, e o planograma já mostra os produtos. No Briefing (PDF), sai o arquivo padronizado, com o código de cada quadrado e a tabela de SKUs e frentes.\n\nGanhos:\n- Quantitativo: o briefing de exposição, que levava de 12 a 16 horas por ciclo, sai em poucos cliques; −80% de tempo na estratégia dos planogramas.\n- Qualitativo: execução fiel à estratégia, porque o SKU da prateleira é o do movimento definido.' });
  await slideVideo({ secao: 'Decisão com dados', video: 'v3', legenda: 'Vídeo 3',
    titulo: 'O espaço vai para quem vende: o GMV × espaço mostra quem rende acima ou abaixo do que ocupa e orienta a realocação',
    ganhos: [
      ['Decisão por dados', 'o rendimento de cada movimento em cada ER substitui a percepção na hora de distribuir o espaço'],
      ['+5% potencial', 'de GMV esperado por espaço ao realocar quem rende abaixo de 0,7×'],
      ['Base para medir', 'com a venda realizada, o mesmo gráfico vira esperado × realizado, ciclo a ciclo'],
    ],
    alt: 'Vídeo: gráfico de dispersão GMV esperado × espaço por ER; BOTIPROMO acima da diagonal e SIÀGE ULTIMATE abaixo.',
    notas: 'Decisão com dados: GMV × espaço (≈1 min).\n\nNarração: cada ponto é um movimento. Acima da diagonal, ele rende mais do que o espaço que ocupa; abaixo, rende menos. Troco a ER e os pontos mudam. Clicando num ponto, a planta mostra onde aquele movimento está.\n\nGanhos:\n- Qualitativo: decisão de espaço por dados, não por percepção.\n- Quantitativo (potencial, a validar): +5% de GMV esperado por espaço ao realocar quem rende abaixo de 0,7×.\n- Habilitador: com a venda realizada, o mesmo gráfico mede esperado × realizado (próximo passo).' });
  await slideVideo({ secao: 'Decisão com dados', video: 'v4', legenda: 'Vídeo 4',
    titulo: 'Equilíbrio entre marcas e tipos de movimento visível em cada ER, para corrigir distorções antes de chegar à loja',
    ganhos: [
      ['Aderência', 'à estratégia da companhia: share de marcas e tipos de movimento conferido antes de ir para a loja'],
      ['−80%', 'do tempo de análise da distribuição do espaço'],
      ['Visão de rede', '4 ERs lado a lado: distorções corrigidas no planejamento, não na execução'],
    ],
    alt: 'Vídeo: barras 100% de marcas e de classificação por ER; o clique em EUD e em Promoção filtra a planta.',
    notas: 'Decisão com dados: marcas e tipos de movimento (≈1 min).\n\nNarração: a fatia do espaço de cada marca em cada ER e, embaixo, por tipo de movimento. Clico em Eudora na ER P e a planta mostra só os espaços da Eudora; clico em Promoção na ER G e a planta mostra só as promoções.\n\nGanhos:\n- Qualitativo: aderência à estratégia da companhia (share de marcas e de tipos de movimento conferido antes da execução).\n- Quantitativo: −80% no tempo de análise da distribuição do espaço.\n- Qualitativo: visão de rede, com as 4 ERs lado a lado.' });
  await slideVideo({ secao: 'Visualizador de toda a estratégia', video: 'v5', legenda: 'Vídeo 5',
    titulo: 'A prioridade de cada ciclo clara para todos: empilhamento dos movimentos considerando GMV, exposição, hotspots e tipo de movimento.',
    ganhos: [
      ['Uma referência', 'todos os ciclos, Boticário e Eudora, numa linha do tempo compartilhada por todo o time'],
      ['Alinhamento ágil', 'prioridades explícitas (GMV, exposição e hotspots) reduzem as rodadas de alinhamento entre as marcas'],
      ['Aprendizado', 'o histórico comparável mostra o que se repete e o que mudou de um ciclo para o outro'],
    ],
    alt: 'Vídeo: calendário dos ciclos com os movimentos empilhados; troca entre equilíbrio, só GMV e só exposição; medalhas de ouro, prata e bronze.',
    notas: 'Visualizador de toda a estratégia (≈1 min).\n\nNarração: o calendário mostra os ciclos do Boticário e da Eudora, que se sobrepõem. Em cada ciclo, os movimentos estão empilhados do mais importante para o menos importante, pelo equilíbrio entre GMV esperado e exposição, e a construção marca os hotspots e as medalhas.\n\nGanhos (qualitativos):\n- Uma referência única para todo o time.\n- Alinhamento mais ágil entre as marcas, com as prioridades explícitas.\n- Aprendizado entre ciclos, com o histórico comparável.\n[Se quiser um número aqui: horas de reunião de alinhamento por ciclo, antes e depois.]' });
  await slideVideo({ secao: 'XXXX', video: 'v12', titulo: 'As regras da estratégia mudam sem programar', tamTitulo: 30,
    ganhos: [
      ['Flexibilidade', 'nas mudanças de estratégia: regras de negócio ajustadas no painel e válidas no mesmo dia em todas as ERs'],
      ['Autonomia', 'regras, plantas e móveis mudam pelo próprio time, sem fornecedor e sem fila de TI (R$ 0)'],
      ['Pronto para evoluir', 'dados estruturados e regras editáveis habilitam novas análises e automações'],
    ],
    alt: 'Vídeo: na ER M, a ponta B da gôndola 1 é livre; no painel do desenvolvedor, em Cascata entre ERs, a regra de espaço fixo passa a valer também na ER M e é salva; a ponta B da ER M fica fixa de O.U.i, com hachura e cadeado.',
    notas: 'As regras da estratégia mudam sem programar (≈45 s).\n\nNarração: na ER M, a ponta B da gôndola 1 hoje é livre. A estratégia mudou: ela passa a ser fixa de O.U.i também nas lojas M. No modo desenvolvedor, em Cascata entre ERs, marco a ER M na regra e salvo; ao fechar, a ponta B da ER M já aparece fixa.\n\nGanhos (qualitativos):\n- Flexibilidade: a regra nova vale no mesmo dia para todas as ERs.\n- Autonomia: o próprio time muda regras, plantas e móveis, sem fornecedor e sem TI.\n- Pronto para evoluir: a base de dados e as regras editáveis habilitam as próximas melhorias (mensuração de resultado, efetividade, VM).\n[O rótulo da seção ainda está como XXXX no original. Sugestão: "FEITO PARA DURAR" ou "FLEXIBILIDADE".]' });

  // 14. Já em uso (como no original) ---------------------------------------------------
  {
    const s = novoSlide(T.mm);
    secao(s, '', [T.bot, T.eud, T.qdb, T.oui]);
    txt(s, 'Já em uso, e o próximo passo é medir o resultado', { x: 0.6, y: 0.85, w: 12.1, h: 0.9, fontSize: 32, bold: true, color: T.branco, valign: 'middle' });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 2.2, w: 4.6, h: 4.5, rectRadius: 0.1, fill: { color: 'F2F2F2' }, line: { color: '161E2B', width: 1 } });
    txt(s, '3', { x: 1.0, y: 2.55, w: 3.8, h: 1.5, fontSize: 96, bold: true, color: '000000' });
    txt(s, 'ciclos já construídos no app', { x: 1.0, y: 4.05, w: 3.8, h: 0.5, fontSize: 20, bold: true, color: '000000' });
    txt(s, 'E o time inteiro será impactado: construção, validação e quem monta o planograma usam o mesmo modelo.', { x: 1.0, y: 4.75, w: 3.8, h: 1.6, fontSize: 15, color: '1F2633' });
    txt(s, 'O QUE VEM AGORA', { x: 5.7, y: 2.2, w: 6.5, h: 0.3, fontSize: 12, bold: true, charSpacing: 3, color: 'DCE3FF' });
    const passos = [
      ['LuTarget', 'Mensuração de resultado', 'Ligar o espaço de cada movimento ao que ele vendeu de fato.', T.bot, T.branco],
      ['LuChartScatter', 'Análise de efetividade', 'Comparar o GMV esperado com o realizado, ciclo a ciclo.', T.eud, T.branco],
      ['LuLayoutPanelLeft', 'Conexão com o planejamento de VM', 'A comunicação visual planejada junto com o espaço.', T.branco, T.mm],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, t, d, fundo, cor] = passos[i];
      const y = 2.7 + i * 1.35;
      await circuloIcone(s, ic, 5.7, y, 0.75, fundo, cor);
      if (i < 2) s.addShape(pres.shapes.LINE, { x: 6.075, y: y + 0.8, w: 0, h: 0.5, line: { color: 'DCE3FF', width: 2 } });
      txt(s, t, { x: 6.7, y: y - 0.02, w: 6.0, h: 0.42, fontSize: 20, bold: true, color: T.branco });
      txt(s, d, { x: 6.7, y: y + 0.42, w: 6.0, h: 0.5, fontSize: 15, color: 'DCE3FF' });
    }
    s.addNotes('Já em uso (2 min).\n\n- 3 ciclos já construídos no app, e o time inteiro será impactado: construção, validação e quem monta o planograma usam o mesmo modelo.\n- O que vem agora: mensuração de resultado, análise de efetividade e conexão com o planejamento de VM.');
  }

  await pres.writeFile({ fileName: SAIDA });
  console.log('ok', SAIDA);
})();
