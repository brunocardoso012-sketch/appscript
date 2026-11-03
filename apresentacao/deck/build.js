/**
 * Deck "Plano de Varejo" para o Google Apresentações (importa o .pptx).
 * Os vídeos entram como GIF animado (o Google Apresentações descarta vídeo embutido no .pptx, mas mantém GIF):
 * tocam sozinhos, em loop e sem som, para a narração ao vivo.
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
const SAIDA = process.argv[2] || path.join(AQUI, 'Plano de Varejo - Apresentacao.pptx');
const COM_VIDEO = process.argv[3] === 'mp4'; // variante PowerPoint: MP4 embutido no lugar do GIF

const T = {
  ink: '161E2B', ink2: '222C3D', ink3: '2C384D', texto: 'FFFFFF', suave: 'AEB6C4', claro: 'C9D0DB', linha: '3A475E', branco: 'FFFFFF',
  bot: '3E9D6B', eud: 'A11FC9', qdb: 'E23FB4', oui: 'E1262F', mm: '2B4DE3', ambar: 'F2A900', verm: 'D64545',
};
// Cores das métricas, mais claras para ler no fundo escuro: ganho (verde), tempo (âmbar), medição (azul).
const DESTAQUE = ['5CC08A', 'F5B83D', '8FA3FF'];
const MARCAS = [T.bot, T.eud, T.qdb, T.oui, T.mm];
const FONTE = 'Arial';
const NOTA_METRICAS = 'Métricas sugeridas: substituir pelos números reais.';

async function icone(nome, cor, tam) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Lu[nome], { color: '#' + cor, size: tam || 256, strokeWidth: 2 }));
  const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return 'image/png;base64,' + png.toString('base64');
}

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
  pres.title = 'Plano de Varejo — estratégia de exposição';
  pres.author = 'Trade Marketing';
  pres.theme = { headFontFace: FONTE, bodyFontFace: FONTE };

  const txt = (s, texto, o) => s.addText(texto, Object.assign({ isTextBox: true, fontFace: FONTE, margin: 0, valign: 'top' }, o));
  /** Motivo do deck: as cinco bolinhas das marcas (como no app). */
  const bolinhas = (s, x, y, d) => MARCAS.forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: x + i * d * 1.55, y, w: d, h: d, fill: { color: c }, line: { color: c } }));
  /** Todo slide tem o fundo escuro da capa. */
  const novoSlide = () => { const s = pres.addSlide(); s.background = { color: T.ink }; return s; };
  const secao = (s, n, nome) => {
    bolinhas(s, 0.6, 0.47, 0.13);
    txt(s, (n ? n + ' · ' : '') + nome.toUpperCase(), { x: 1.75, y: 0.39, w: 9, h: 0.3, fontSize: 12, bold: true, charSpacing: 2, color: T.suave });
  };
  /** Título: o resumo dos ganhos do slide, em até duas linhas. */
  const titulo = (s, texto, o) => txt(s, texto, Object.assign({ x: 0.6, y: 0.78, w: 12.1, h: 1.1, fontSize: 26, bold: true, color: T.texto, valign: 'middle' }, o));
  const notaMetricas = (s) => txt(s, NOTA_METRICAS, { x: 0.6, y: 7.08, w: 6, h: 0.25, fontSize: 10, italic: true, color: '7D879A' });
  const cartao = (s, x, y, w, h, cor) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: cor || T.ink2 }, line: { color: cor || T.ink2 } });

  /** Slide com vídeo: título com os ganhos, as três métricas à esquerda e o vídeo grande à direita. */
  let videos = 0;
  async function slideVideo(o) {
    o.num = ++videos;
    o.notas = o.notas.replace(/^Vídeo \d+/, 'Vídeo ' + o.num);
    const s = novoSlide();
    secao(s, o.n, o.secao);
    titulo(s, o.titulo);
    // vídeo
    const vx = 4.15, vy = 2.1, vw = 8.6, vh = vw * 9 / 16;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: vx - 0.06, y: vy - 0.06, w: vw + 0.12, h: vh + 0.12, rectRadius: 0.08, fill: { color: T.ink2 }, line: { color: T.linha, width: 1 },
      shadow: { type: 'outer', color: '000000', opacity: 0.4, blur: 12, offset: 3, angle: 90 } });
    if (COM_VIDEO) {
      s.addMedia({ type: 'video', path: path.join(MIDIA, o.video + '.mp4'), cover: 'data:image/png;base64,' + fs.readFileSync(path.join(MIDIA, o.video + '-capa.png')).toString('base64'), x: vx, y: vy, w: vw, h: vh });
    } else {
      s.addImage({ path: path.join(MIDIA, o.video + '.gif'), x: vx, y: vy, w: vw, h: vh, altText: o.alt, objectName: 'Vídeo ' + o.num });
    }
    txt(s, 'Vídeo ' + o.num + ' · ' + o.dur + ' · sem som', { x: vx, y: vy + vh + 0.1, w: vw, h: 0.25, fontSize: 11, color: T.suave, align: 'right' });
    // ganhos: o número grande e o que ele mede
    txt(s, 'GANHOS', { x: 0.6, y: 2.1, w: 3.2, h: 0.3, fontSize: 12, bold: true, charSpacing: 2, color: T.suave });
    let y = 2.48;
    o.ganhos.forEach(([valor, texto], i) => {
      txt(s, valor, { x: 0.6, y, w: 3.3, h: 0.5, fontSize: 26, bold: true, color: DESTAQUE[i % 3], valign: 'middle' });
      txt(s, texto, { x: 0.6, y: y + 0.5, w: 3.3, h: 0.6, fontSize: 13, color: T.claro });
      y += 1.2;
    });
    if (o.fala) {
      cartao(s, 0.6, 6.12, 3.3, 0.86, T.ink3);
      txt(s, o.fala, { x: 0.78, y: 6.12, w: 3.0, h: 0.86, fontSize: 12, italic: true, color: T.claro, valign: 'middle' });
    }
    notaMetricas(s);
    s.addNotes(o.notas + '\n\n' + NOTA_METRICAS + ' Sugeridas: ' + o.ganhos.map((g) => g[0] + ' (' + g[1] + ')').join('; ') + '.');
    return s;
  }

  // 1. Capa ------------------------------------------------------------------
  {
    const s = novoSlide();
    s.addImage({ altText: 'Planta da ER M no app, com os móveis nas cores das marcas', path: path.join(MIDIA, 'hero.png'), x: 6.2, y: 0.9, w: 7.6, h: 7.6 * 9 / 16, sizing: { type: 'cover', w: 7.6, h: 7.6 * 9 / 16 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 6.6, h: 7.5, fill: { color: T.ink }, line: { color: T.ink } });
    bolinhas(s, 0.8, 1.3, 0.2);
    txt(s, 'Plano de Varejo', { x: 0.8, y: 1.9, w: 5.6, h: 1.0, fontSize: 48, bold: true, color: T.branco });
    txt(s, 'Mais venda por espaço, menos horas de montagem e reação no mesmo dia: a estratégia de exposição construída, validada e medida num só lugar', { x: 0.8, y: 3.0, w: 5.4, h: 2.0, fontSize: 20, color: T.claro });
    txt(s, 'Trade Marketing · Apresentação à diretoria', { x: 0.8, y: 6.4, w: 5.6, h: 0.4, fontSize: 13, color: '8D97A8' });
    s.addNotes('Abertura (10 s). A mensagem do deck em uma frase: o app aumenta a venda por espaço de exposição, reduz as horas de montagem e validação e permite reagir no mesmo dia às mudanças de estratégia.');
  }

  // 2. O problema --------------------------------------------------------------
  {
    const s = novoSlide();
    secao(s, '1', 'O problema');
    titulo(s, 'O PPT manual custava horas a cada ciclo, gerava retrabalho e não dizia se o espaço estava vendendo');
    const cards = [
      ['LuHand', '~16 h', 'por ciclo montando a estratégia', 'Cada móvel, cor e etiqueta desenhados slide a slide, nas 4 ERs. Cada ciclo começava do zero.'],
      ['LuTriangleAlert', '~3 rodadas', 'de correção por ciclo', 'Cópia e colagem entre ERs e versões, sem conferência: o erro só aparecia na loja.'],
      ['LuEyeOff', '0%', 'do espaço medido contra o GMV', 'Ninguém sabia se o espaço estava com as marcas e os movimentos que mais vendem.'],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, valor, rotulo, d] = cards[i];
      const x = 0.6 + i * 4.1;
      cartao(s, x, 2.2, 3.8, 3.7);
      s.addShape(pres.shapes.OVAL, { x: x + 0.4, y: 2.55, w: 0.75, h: 0.75, fill: { color: '4A2A31' }, line: { color: '4A2A31' } });
      s.addImage({ altText: 'Ícone', data: await icone(ic, 'F08A8A'), x: x + 0.58, y: 2.73, w: 0.39, h: 0.39 });
      txt(s, valor, { x: x + 0.4, y: 3.42, w: 3.1, h: 0.65, fontSize: 34, bold: true, color: 'F08A8A', valign: 'middle' });
      txt(s, rotulo, { x: x + 0.4, y: 4.1, w: 3.1, h: 0.6, fontSize: 14, bold: true, color: T.texto });
      txt(s, d, { x: x + 0.4, y: 4.8, w: 3.05, h: 1.0, fontSize: 13, color: T.claro });
    }
    txt(s, 'Resultado: espaço decidido por intuição, horas gastas em formatação e reação lenta quando a estratégia mudava.', { x: 0.6, y: 6.2, w: 12.1, h: 0.6, fontSize: 17, bold: true, color: 'F08A8A' });
    notaMetricas(s);
    s.addNotes('O problema (2 min, sem vídeo).\n\n- Montagem manual: cerca de 16 h por ciclo para desenhar a estratégia das 4 ERs no PowerPoint, começando do zero a cada ciclo.\n- Retrabalho: cerca de 3 rodadas de correção por ciclo, porque o erro de cópia entre ERs e versões só aparecia na execução.\n- Sem mensuração: 0% do espaço era comparado com o GMV esperado; não havia como saber se o espaço estava com quem mais vende.\n- Consequência: espaço decidido por intuição e reação lenta às mudanças.\n\n' + NOTA_METRICAS + ' Sugeridas: ~16 h por ciclo de montagem; ~3 rodadas de correção; 0% do espaço medido.');
  }

  // 3. A solução ---------------------------------------------------------------
  {
    const s = novoSlide();
    secao(s, '2', 'A solução');
    txt(s, '“Um app onde a estratégia de exposição é construída, validada e medida no mesmo lugar.”', { x: 0.6, y: 1.05, w: 6.4, h: 2.6, fontSize: 30, bold: true, color: T.branco, valign: 'middle' });
    const etapas = [
      ['LuPencilRuler', 'Construída', 'em minutos, não em horas: −70% de horas de montagem', T.bot],
      ['LuShieldCheck', 'Validada', 'no mesmo fluxo: aprovação em horas, sem retrabalho de versão', T.eud],
      ['LuChartColumn', 'Medida', '100% do espaço comparado ao GMV esperado, por marca, ER e ciclo', T.mm],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, t, d, c] = etapas[i];
      const y = 4.0 + i * 0.92;
      s.addShape(pres.shapes.OVAL, { x: 0.6, y, w: 0.6, h: 0.6, fill: { color: c }, line: { color: c } });
      s.addImage({ altText: 'Ícone', data: await icone(ic, T.branco), x: 0.74, y: y + 0.14, w: 0.32, h: 0.32 });
      txt(s, [{ text: t + '  ', options: { bold: true, color: T.branco } }, { text: d, options: { color: T.claro } }], { x: 1.4, y: y - 0.08, w: 5.6, h: 0.76, fontSize: 16, valign: 'middle' });
    }
    s.addImage({ altText: 'Planta da ER M no app, com os móveis nas cores das marcas', path: path.join(MIDIA, 'hero.png'), x: 7.2, y: 1.2, w: 5.6, h: 5.6 * 9 / 16 });
    s.addShape(pres.shapes.RECTANGLE, { x: 8.55, y: 3.95, w: 4.25, h: 4.25 * 826 / 1470, fill: { color: T.branco }, line: { color: T.linha, width: 1 },
      shadow: { type: 'outer', color: '000000', opacity: 0.45, blur: 14, offset: 4, angle: 90 } });
    s.addImage({ altText: 'Gráfico GMV esperado × espaço do Analytics', path: path.join(MIDIA, 'hero-analytics.png'), x: 8.55, y: 3.95, w: 4.25, h: 4.25 * 826 / 1470 });
    notaMetricas(s);
    s.addNotes('A solução (1 min, sem vídeo).\n\nFrase central: "Um app onde a estratégia de exposição é construída, validada e medida no mesmo lugar."\n\n- Construída: direto na planta, em minutos; a montagem cai cerca de 70%.\n- Validada: comentários e aprovação no próprio app; a aprovação sai em horas, sem versões paralelas.\n- Medida: todo o espaço comparado ao GMV esperado, por marca, ER e ciclo.\n\n' + NOTA_METRICAS);
  }

  // 4. Como foi construído com IA ----------------------------------------------
  {
    const s = novoSlide();
    secao(s, '3', 'Como foi construído com IA');
    titulo(s, 'Um analista de trade construiu a solução em 4 semanas com IA, sem fornecedor e sem fila de TI');
    const cols = [
      ['LuUserRound', 'Quem', '1 analista de trade', 'sem time de TI e R$ 0 de fornecedor'],
      ['LuBot', 'Como', 'IA como copiloto', 'para programar, testar e corrigir, com 80+ testes automáticos'],
      ['LuTimer', 'Em quanto tempo', '4 semanas', '30/09 a 28/10 · 171 versões salvas'],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, k, v, d] = cols[i];
      const x = 0.6 + i * 4.1;
      cartao(s, x, 2.2, 3.8, 2.85, i === 2 ? '1F3A2E' : T.ink2);
      s.addShape(pres.shapes.OVAL, { x: x + 0.4, y: 2.55, w: 0.7, h: 0.7, fill: { color: MARCAS[[0, 1, 4][i]] }, line: { color: MARCAS[[0, 1, 4][i]] } });
      s.addImage({ altText: 'Ícone', data: await icone(ic, T.branco), x: x + 0.56, y: 2.71, w: 0.38, h: 0.38 });
      txt(s, k.toUpperCase(), { x: x + 1.3, y: 2.68, w: 2.3, h: 0.4, fontSize: 13, bold: true, charSpacing: 2, color: T.suave, valign: 'middle' });
      txt(s, v, { x: x + 0.4, y: 3.5, w: 3.2, h: 0.7, fontSize: i === 2 ? 34 : 26, bold: true, color: i === 2 ? DESTAQUE[0] : T.texto, valign: 'middle' });
      txt(s, d, { x: x + 0.4, y: 4.25, w: 3.2, h: 0.7, fontSize: 14, color: T.claro });
    }
    cartao(s, 0.6, 5.4, 12.1, 1.3, T.ink3);
    bolinhas(s, 1.0, 5.98, 0.13);
    txt(s, 'A IA permite que quem conhece o problema construa a solução, no ritmo do negócio.', { x: 2.2, y: 5.4, w: 10.2, h: 1.3, fontSize: 22, bold: true, color: T.branco, valign: 'middle' });
    s.addNotes('Como foi construído com IA (2,5 min).\n\n- Quem construiu: um analista de trade, sem time de TI e sem custo de fornecedor.\n- Como: a IA como copiloto para programar, testar e corrigir. O app tem mais de 80 testes automáticos que rodam a cada mudança.\n- Em quanto tempo: cerca de 4 semanas, de 30/09 a 28/10/2026, com 171 versões salvas no histórico do código. [Confirme ou ajuste; os números saíram do histórico do repositório.]\n- Mensagem: a IA permite que quem conhece o problema construa a solução, no ritmo do negócio e sem fila de TI.');
  }

  // 5–16. Vídeos -----------------------------------------------------------------
  const V = JSON.parse(fs.readFileSync(path.join(MIDIA, 'duracoes.json'), 'utf8'));
  const dur = (v) => '0:' + String(Math.round(V[v])).padStart(2, '0');
  await slideVideo({ n: '4', secao: 'Construir ficou mais fácil', video: 'v1', dur: dur('v1'), titulo: 'Montar a estratégia de um móvel leva segundos e já mostra o impacto no espaço e no GMV: −70% de horas de montagem por ciclo',
    ganhos: [['−70%', 'horas de montagem por ciclo (de ~16 h para ~5 h)'], ['0 slides', 'desenhados à mão: a planta pinta e salva sozinha'], ['100%', 'dos espaços com marca, classificação e GMV × espaço na hora']],
    fala: 'Cada hora poupada na montagem vai para a análise do que vende.',
    alt: 'Vídeo: num ciclo em construção com a planta em branco, a gôndola 1 é preenchida (ponta A Boticário, meio A Eudora, meio B QDB) e os números da ER P passam a mostrar as três marcas.',
    notas: 'Vídeo 1 (≈2 min para a seção, com os dois próximos slides).\n\nNarração: estou num ciclo novo, com a planta em branco. Clico na gôndola e preencho espaço por espaço: na ponta A, Boticário com BOTIPROMO e LÇTO EGEO; no meio A, Eudora com SIÀGE ULTIMATE; no meio B, QDB com LIQUIDA QDB. Cada espaço ganha a cor da marca na hora, e tudo é salvo sozinho. Ao tirar a seleção, os números da ER já mostram o espaço de cada marca, a classificação e o GMV × espaço de cada movimento.\n\nGanho: o que levava horas de desenho no PowerPoint vira minutos, e o impacto de cada escolha no espaço e no GMV aparece no momento da decisão.' });
  await slideVideo({ n: '4', secao: 'Construir ficou mais fácil', video: 'v2', dur: dur('v2'), titulo: 'Do espaço ao SKU num só fluxo: o briefing padronizado sai em 1 clique e reduz erros de execução na loja',
    ganhos: [['1 clique', 'para o briefing em PDF de todas as ERs (antes ~4 h)'], ['−50%', 'erros de execução do planograma na loja'], ['100%', 'dos SKUs puxados do catálogo do movimento certo']],
    fala: 'O que é decidido no app é exatamente o que chega na loja.',
    alt: 'Vídeo: na gôndola 1, a prateleira é dividida em quadrados com produtos de BOTIPROMO e LÇTO EGEO; depois o briefing em PDF é gerado.',
    notas: 'Vídeo 2.\n\nNarração: abro a gôndola e desenho a prateleira: arrasto para criar um quadrado, escolho o movimento BOTIPROMO e os produtos aparecem filtrados pelo movimento, puxados do catálogo. Salvo, e o planograma já mostra os produtos para todo mundo. No Briefing (PDF), sai um arquivo padronizado: uma página por gôndola e pirâmide, com o código de cada quadrado e a tabela de SKUs e frentes.\n\nGanho: o briefing que levava horas sai em um clique, e a execução na loja segue exatamente o que foi decidido, com menos erro de produto e de frente.' });
  await slideVideo({ n: '4', secao: 'Construir ficou mais fácil', video: 'v10', dur: dur('v10'), titulo: 'Validação dentro do app: o ciclo é aprovado em horas, não em dias, e cada pedido fica rastreado até a publicação',
    ganhos: [['−60%', 'tempo de aprovação do ciclo (de ~5 dias para ~2)'], ['1 versão', 'única da estratégia, sem arquivos paralelos'], ['100%', 'dos comentários com responsável, resposta e data']],
    fala: 'Menos idas e vindas: o ajuste é pedido e resolvido no próprio móvel.',
    alt: 'Vídeo: no C16 aguardando aprovação, a validadora comenta na pirâmide 1 (aparece um balão laranja no móvel); o construtor responde e marca como resolvido; a validadora publica o ciclo.',
    notas: 'Vídeo 3 (≈45 s).\n\nNarração: o construtor enviou o C16 para aprovação. A validadora escolhe a pirâmide na planta e comenta: UOMINI HERO rende abaixo do espaço. O comentário vira um balão laranja no próprio móvel. O construtor responde e marca como resolvido. A validadora publica, e só então o ciclo passa a valer para todos.\n\nGanho: a aprovação sai em horas, sem rodadas de e-mail e versões de arquivo, e todo pedido fica registrado com quem pediu, quem respondeu e quando.' });
  await slideVideo({ n: '5', secao: 'Decidir com dados', video: 'v3', dur: dur('v3'), titulo: 'O espaço vai para quem vende: o GMV × espaço mostra quem rende acima ou abaixo do que ocupa e orienta a realocação',
    ganhos: [['+5%', 'de GMV esperado por espaço ao realocar quem rende abaixo de 0,7×'], ['100%', 'dos movimentos com índice de rendimento por ER'], ['1 clique', 'do gráfico até o móvel na planta']],
    fala: 'Cada espaço realocado de um movimento fraco para um forte é venda a mais.',
    alt: 'Vídeo: gráfico de dispersão GMV esperado × espaço por ER; BOTIPROMO acima da diagonal e SIÀGE ULTIMATE abaixo.',
    notas: 'Vídeo 4 (≈1 min).\n\nNarração: no Analytics, o gráfico GMV esperado × espaço. Cada ponto é um movimento. Acima da diagonal, ele rende mais do que o espaço que ocupa (ex.: BOTIPROMO, 3,6×); abaixo, rende menos (ex.: SIÀGE ULTIMATE, 0,4×). Troco a ER e os pontos mudam. Clicando num ponto, a planta mostra onde aquele movimento está.\n\nGanho: o espaço passa a ser distribuído pelo que vende. Realocar os espaços de quem rende abaixo de 0,7× para quem rende acima de 1,3× aumenta o GMV esperado por espaço.' });
  await slideVideo({ n: '5', secao: 'Decidir com dados', video: 'v4', dur: dur('v4'), titulo: 'Equilíbrio entre marcas e tipos de movimento visível em cada ER, para corrigir distorções antes de chegar à loja',
    ganhos: [['−80%', 'tempo de análise da distribuição do espaço'], ['4 ERs', 'comparadas lado a lado em segundos'], ['±5 p.p.', 'de desvio máximo do share de cada marca contra a meta']],
    alt: 'Vídeo: barras 100% de marcas e de classificação por ER; o clique em EUD e em Promoção filtra a planta.',
    notas: 'Vídeo 5 (≈1 min).\n\nNarração: aqui a fatia do espaço de cada marca em cada ER, e embaixo por tipo de movimento. Clico em Eudora na ER P e a planta mostra só os espaços da Eudora. Clico em Promoção na ER G e a planta vai para a ER G mostrando só as promoções.\n\nGanho: a distorção entre marcas ou tipos de movimento aparece antes da execução, e a análise que levava horas em planilha sai em segundos.' });
  await slideVideo({ n: '6', secao: 'Enxergar o todo', video: 'v5', dur: dur('v5'), titulo: 'A prioridade de cada ciclo fica clara para todos: o que mais pesa em GMV e exposição sobe ao topo, Boticário e Eudora juntos',
    ganhos: [['−50%', 'tempo de alinhamento de prioridades entre as marcas'], ['3 ciclos', 'de histórico comparados numa só tela'], ['Top 5', 'movimentos por ciclo priorizados com medalha e hotspot']],
    alt: 'Vídeo: calendário dos ciclos C13 a C16 com os movimentos empilhados; troca entre equilíbrio, só GMV e só exposição; medalhas de ouro, prata e bronze.',
    notas: 'Vídeo 6 (≈1 min).\n\nNarração: o calendário mostra os ciclos do Boticário e da Eudora, que se sobrepõem. Em cada ciclo, os movimentos estão empilhados do mais importante para o menos importante, pelo equilíbrio entre GMV esperado e exposição. Dá para ver só pelo GMV ou só pela exposição. Na construção, defino a ordem e dou medalhas e o selo de hotspot.\n\nGanho: todos olham para a mesma prioridade, ciclo a ciclo, e o espaço acompanha o que pesa mais em venda.' });
  await slideVideo({ n: '6', secao: 'Enxergar o todo', video: 'v6', dur: dur('v6'), titulo: 'Uma régua única mede o peso de cada movimento e de cada móvel em cada ER: a pergunta "quanto espaço tem X?" sai em segundos',
    ganhos: [['100%', 'dos espaços medidos com a mesma régua'], ['Segundos', 'para responder quanto espaço tem um movimento (antes: dias)'], ['4 ERs', '× todos os movimentos num mapa só']],
    alt: 'Vídeo: mapa de calor movimento × ER no Analytics, ordenado pela ER G; o clique em BOTIPROMO mostra o movimento na planta; legenda do que conta como espaço.',
    notas: 'Vídeo 7 (≈1 min).\n\nNarração: o mapa de calor mostra a fatia de cada movimento em cada ER; quanto mais escuro, maior. Os ícones mostram em que tipos de móvel o movimento está. Alterno entre % da ER e número de espaços, ordeno pela ER G e clico numa célula para ver na planta. Em "Sobre a análise", a régua do que conta como espaço em cada móvel.\n\nGanho: mensuração padronizada, que antes não existia, e respostas em segundos para as perguntas do negócio.' });
  await slideVideo({ n: '6', secao: 'Enxergar o todo', video: 'v11', dur: dur('v11'), titulo: 'Da planta à rede: o alcance de cada movimento em lojas reais, a base para ligar exposição a venda',
    ganhos: [['1.000 lojas', 'da rede ligadas à estratégia de cada ciclo'], ['% da rede', 'alcançada por cada movimento, por ER'], ['1 aba', 'na planilha basta: móvel e número de lojas']],
    alt: 'Vídeo: com a aba Inventario, o balão mostra em quantas lojas cada móvel está (1.000, 860, 540 e, na ER GG, 100 lojas); no Analytics, a coluna Na rede mostra o alcance de cada movimento.',
    notas: 'Vídeo 8 (≈45 s).\n\nNarração: com a aba Inventario na planilha (em quantas lojas cada móvel existe), o app mostra o alcance real da estratégia. Passo o mouse na gôndola: presente em 1.000 lojas, 100% da rede. O totem está em 860; a pirâmide 2, em 540. Na ER GG, a gôndola 4 só existe em 100 lojas. No Analytics, a coluna Na rede mostra quantas lojas cada movimento alcança.\n\nGanho: a exposição passa a ser medida em lojas e espaços reais da rede, o que permite ligar cada movimento à venda dessas lojas.\n\n[Os números do vídeo são de uma aba de exemplo: rede de 1.000 lojas.]' });
  await slideVideo({ n: '7', secao: 'Feito para durar', video: 'v7', dur: dur('v7'), titulo: 'Onboarding em 1 minuto: um analista novo opera o app no primeiro dia, sem treinamento formal',
    ganhos: [['< 1 min', 'de tour guiado na primeira visita'], ['−90%', 'tempo de treinamento de um analista novo (de ~1 dia para ~1 h)'], ['0', 'dependência de quem construiu o app']],
    alt: 'Vídeo: tour guiado do app destacando ciclo, plantas, planta, marcas, Comunicações ER, Analytics, Calendário, Baixar PNG e configurações.',
    notas: 'Vídeo 9 (≈45 s; a seção "Feito para durar" continua nos próximos slides).\n\nNarração: na primeira vez, o app oferece um tour rápido, que destaca cada parte da tela com uma frase. Dá para rever pela engrenagem.\n\nGanho: quem chega no time fica produtivo no primeiro dia, e o processo não depende de uma pessoa.' });
  await slideVideo({ n: '7', secao: 'Feito para durar', video: 'v9', dur: dur('v9'), titulo: 'Mudou a loja, muda a planta em minutos: layout novo sem fornecedor e já valendo no próximo ciclo',
    ganhos: [['~5 min', 'para atualizar o layout de uma ER (antes ~1 dia)'], ['R$ 0', 'de fornecedor para mudar plantas e móveis'], ['100%', 'dos próximos ciclos já com o layout novo']],
    fala: 'A estratégia acompanha a loja real, não uma foto antiga dela.',
    alt: 'Vídeo: no Construir loja, a ER P passa de 12 × 10 m para 16 × 13 m; uma gôndola, uma pirâmide e uma mesa destaque são adicionadas e levadas para a área nova; o PDV móvel e a pirâmide 2 mudam de lugar; o layout é salvo e a ER P aparece com a loja nova.',
    notas: 'Vídeo 10 (≈45 s).\n\nNarração: este é o Construir loja, o editor da planta, no modo desenvolvedor. Aumento a ER P de 12 por 10 metros para 16 por 13, e a loja cresce na hora. Pela paleta, adiciono uma gôndola, uma pirâmide e uma mesa destaque e arrasto cada uma para a área nova. Também mudo de lugar o PDV móvel e uma pirâmide. Tudo é salvo sozinho; ao fechar, a ER P já aparece com a loja nova.\n\nGanho: a mudança de layout é feita pelo próprio time em minutos, sem fornecedor, e já vale para o próximo ciclo.' });
  await slideVideo({ n: '7', secao: 'Feito para durar', video: 'v12', dur: dur('v12'), titulo: 'Mudança de regra estratégica aplicada no mesmo dia em todas as ERs, sem programar e sem esperar o próximo ciclo',
    ganhos: [['Mesmo dia', 'para aplicar uma regra nova (antes: 1 ciclo de atraso)'], ['4 ERs', 'atualizadas de uma vez, pela cascata'], ['1 clique', 'para voltar à regra padrão']],
    fala: 'Quando a regra do negócio muda, o app muda junto.',
    alt: 'Vídeo: na ER M, a ponta B da gôndola 1 é livre (MULTI PROMO); no painel do desenvolvedor, em Cascata entre ERs, a regra de espaço fixo passa a valer também na ER M e é salva; a ponta B da ER M fica fixa de O.U.i, com hachura e cadeado.',
    notas: 'Vídeo 11 (≈45 s).\n\nNarração: na ER M, a ponta B da gôndola 1 hoje é livre. A estratégia mudou: ela passa a ser fixa de O.U.i também nas lojas M. Entro no modo desenvolvedor, com senha, e abro Cascata entre ERs. Marco a ER M na regra da ponta B; o resumo já diz "fixo na ER P e ER M; livre na ER G e ER GG". Salvo, e a regra fica personalizada, com o botão para voltar ao padrão. Ao fechar, a ponta B da ER M já aparece fixa de O.U.i.\n\nGanho: a reação a uma mudança de estratégia acontece no mesmo dia, em todas as ERs, sem depender de TI.' });
  await slideVideo({ n: '8', secao: 'Facilidades', video: 'v8', dur: dur('v8'), titulo: 'Material de reunião e de loja pronto em 1 clique: menos horas montando slides e nenhuma versão desatualizada circulando',
    ganhos: [['−2 h', 'por ciclo preparando material de apresentação'], ['1 clique', 'para o PNG ou o slide 16:9 de todas as ERs'], ['0', 'versões desatualizadas: o link abre sempre o ciclo atual']],
    alt: 'Vídeo: modo apresentação com troca de ER pelas setas, download do slide em PNG e modo noturno.',
    notas: 'Vídeo 12 (1 min).\n\nNarração: no modo apresentação, só a planta aparece e as setas trocam a ER. O Baixar PNG gera o slide completo em alta resolução, pronto para a reunião. E o modo noturno deixa todo o app escuro.\n\nGanho: o material sai do próprio app, sempre atualizado, sem horas montando slides.' });

  // 17. Resultados e próximos passos ----------------------------------------------
  {
    const s = novoSlide();
    secao(s, '9', 'Resultados e próximos passos');
    titulo(s, 'Os ganhos já capturados em 3 ciclos e o próximo salto: medir a venda real por espaço e reagir dentro do ciclo');
    txt(s, 'JÁ CAPTURADO', { x: 0.6, y: 2.1, w: 5.3, h: 0.3, fontSize: 12, bold: true, charSpacing: 2, color: T.suave });
    const kpis = [['3 ciclos', 'construídos no app, com o time inteiro no mesmo modelo'], ['−70%', 'horas de montagem por ciclo'], ['−60%', 'tempo de aprovação do ciclo'], ['100%', 'do espaço medido contra o GMV esperado']];
    kpis.forEach(([v, d], i) => {
      const x = 0.6 + (i % 2) * 2.75, y = 2.5 + Math.floor(i / 2) * 2.15;
      cartao(s, x, y, 2.6, 1.95);
      txt(s, v, { x: x + 0.25, y: y + 0.22, w: 2.2, h: 0.65, fontSize: 30, bold: true, color: DESTAQUE[i % 3], valign: 'middle' });
      txt(s, d, { x: x + 0.25, y: y + 0.92, w: 2.15, h: 0.9, fontSize: 13, color: T.claro });
    });
    txt(s, 'O QUE VEM AGORA', { x: 6.45, y: 2.1, w: 6.2, h: 0.3, fontSize: 12, bold: true, charSpacing: 2, color: T.suave });
    const passos = [
      ['LuTarget', 'Mensuração de resultado', 'Venda real por espaço, ciclo a ciclo: meta de +5% de GMV por espaço exposto.'],
      ['LuChartScatter', 'Análise de efetividade', 'GMV esperado × realizado para realocar espaço dentro do ciclo, em até 1 semana.'],
      ['LuLayoutPanelLeft', 'Conexão com o planejamento de VM', 'Comunicação visual planejada junto com o espaço: −30% de horas de planejamento.'],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, t, d] = passos[i];
      const y = 2.55 + i * 1.4;
      const c = [T.bot, T.eud, T.mm][i];
      s.addShape(pres.shapes.OVAL, { x: 6.45, y, w: 0.75, h: 0.75, fill: { color: c }, line: { color: c } });
      s.addImage({ altText: 'Ícone', data: await icone(ic, T.branco), x: 6.63, y: y + 0.18, w: 0.39, h: 0.39 });
      if (i < 2) s.addShape(pres.shapes.LINE, { x: 6.825, y: y + 0.8, w: 0, h: 0.55, line: { color: T.linha, width: 2 } });
      txt(s, t, { x: 7.45, y: y - 0.02, w: 5.25, h: 0.42, fontSize: 19, bold: true, color: T.texto });
      txt(s, d, { x: 7.45, y: y + 0.42, w: 5.25, h: 0.75, fontSize: 14, color: T.claro });
    }
    notaMetricas(s);
    s.addNotes('Resultados e próximos passos (2 min).\n\n- Já capturado: 3 ciclos construídos no app, com o time inteiro no mesmo modelo; montagem cerca de 70% mais rápida; aprovação cerca de 60% mais rápida; todo o espaço medido contra o GMV esperado.\n- O que vem agora:\n  · Mensuração de resultado: venda real por espaço, ciclo a ciclo (meta sugerida: +5% de GMV por espaço exposto).\n  · Análise de efetividade: GMV esperado × realizado, para realocar espaço ainda dentro do ciclo.\n  · Conexão com o planejamento de VM: comunicação visual planejada junto com o espaço.\n\n' + NOTA_METRICAS);
  }

  // 18. Fechamento ---------------------------------------------------------------
  {
    const s = novoSlide();
    secao(s, '10', 'Fechamento');
    cartao(s, 0.6, 1.3, 5.5, 2.75);
    txt(s, 'DE', { x: 1.0, y: 1.6, w: 4.8, h: 0.3, fontSize: 13, bold: true, charSpacing: 2, color: 'F08A8A' });
    txt(s, 'um PPT manual, sem tracking', { x: 1.0, y: 1.95, w: 4.8, h: 0.9, fontSize: 26, bold: true, color: T.claro });
    txt(s, '~16 h por ciclo · ~5 dias para aprovar · 0% do espaço medido', { x: 1.0, y: 3.05, w: 4.8, h: 0.75, fontSize: 14, color: 'F08A8A' });
    s.addImage({ altText: 'Ícone', data: await icone('LuArrowRight', 'FFFFFF'), x: 6.32, y: 2.38, w: 0.55, h: 0.55 });
    cartao(s, 7.1, 1.3, 5.6, 2.75, T.bot);
    txt(s, 'PARA', { x: 7.5, y: 1.6, w: 4.9, h: 0.3, fontSize: 13, bold: true, charSpacing: 2, color: 'D8F0E2' });
    txt(s, 'uma estratégia medida a cada ciclo', { x: 7.5, y: 1.95, w: 4.9, h: 0.9, fontSize: 26, bold: true, color: T.branco });
    txt(s, '~5 h por ciclo · aprovação em horas · 100% do espaço medido · reação no mesmo dia', { x: 7.5, y: 3.05, w: 4.9, h: 0.75, fontSize: 14, color: 'E7F6EC' });
    txt(s, 'O PEDIDO À DIRETORIA', { x: 0.6, y: 4.55, w: 8, h: 0.3, fontSize: 13, bold: true, charSpacing: 2, color: T.suave });
    txt(s, 'Patrocinar o app como o padrão do time a partir do próximo ciclo e liberar os dados de venda por loja, para transformar o ganho de tempo em ganho de venda medido.', { x: 0.6, y: 4.95, w: 12.1, h: 1.35, fontSize: 22, bold: true, color: T.branco });
    bolinhas(s, 0.6, 6.7, 0.13);
    notaMetricas(s);
    s.addNotes('Fechamento (1 min).\n\nRetomar o contraste: de um PPT manual sem tracking (cerca de 16 h por ciclo, 5 dias para aprovar, nada medido) para uma estratégia medida a cada ciclo (cerca de 5 h, aprovação em horas, todo o espaço medido e reação no mesmo dia).\n\nPedido (sugestão; ajuste ao que você precisa da diretoria): patrocinar o app como padrão do time a partir do próximo ciclo e liberar os dados de venda por loja, que são a base para medir o ganho de venda.\n\n' + NOTA_METRICAS);
  }

  await pres.writeFile({ fileName: SAIDA });
  console.log('ok', SAIDA);
})();
