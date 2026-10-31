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
  ink: '161E2B', ink2: '2A3445', texto: '1F2633', suave: '5B6475', linha: 'E3E6EC', fundo: 'F4F5F8', branco: 'FFFFFF',
  bot: '3E9D6B', eud: 'A11FC9', qdb: 'E23FB4', oui: 'E1262F', mm: '2B4DE3', ambar: 'F2A900', verm: 'D64545',
};
const MARCAS = [T.bot, T.eud, T.qdb, T.oui, T.mm];
const FONTE = 'Arial';

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
  const W = 13.333;

  const txt = (s, texto, o) => s.addText(texto, Object.assign({ isTextBox: true, fontFace: FONTE, margin: 0, valign: 'top' }, o));
  /** Motivo do deck: as cinco bolinhas das marcas (como no app). */
  const bolinhas = (s, x, y, d) => MARCAS.forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: x + i * d * 1.55, y, w: d, h: d, fill: { color: c }, line: { color: c } }));
  const secao = (s, n, nome, escuro) => {
    bolinhas(s, 0.6, 0.52, 0.13);
    txt(s, (n ? n + ' · ' : '') + nome.toUpperCase(), { x: 1.75, y: 0.44, w: 8, h: 0.3, fontSize: 12, bold: true, charSpacing: 2, color: escuro ? 'AEB6C4' : T.suave });
  };
  const titulo = (s, texto, escuro, o) => txt(s, texto, Object.assign({ x: 0.6, y: 0.85, w: 12.1, h: 0.9, fontSize: 34, bold: true, color: escuro ? T.branco : T.texto, valign: 'middle' }, o));

  /** Slide com vídeo: título, "repare em" à esquerda, vídeo grande à direita. */
  async function slideVideo(o) {
    const s = pres.addSlide();
    s.background = { color: T.branco };
    secao(s, o.n, o.secao);
    titulo(s, o.titulo);
    // vídeo
    const vx = 4.15, vy = 1.95, vw = 8.6, vh = vw * 9 / 16;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: vx - 0.06, y: vy - 0.06, w: vw + 0.12, h: vh + 0.12, rectRadius: 0.08, fill: { color: T.fundo }, line: { color: T.linha, width: 1 },
      shadow: { type: 'outer', color: '000000', opacity: 0.12, blur: 10, offset: 3, angle: 90 } });
    if (COM_VIDEO) {
      s.addMedia({ type: 'video', path: path.join(MIDIA, o.video + '.mp4'), cover: 'data:image/png;base64,' + fs.readFileSync(path.join(MIDIA, o.video + '-capa.png')).toString('base64'), x: vx, y: vy, w: vw, h: vh });
    } else {
      s.addImage({ path: path.join(MIDIA, o.video + '.gif'), x: vx, y: vy, w: vw, h: vh, altText: o.alt, objectName: 'Vídeo ' + o.num });
    }
    txt(s, 'Vídeo ' + o.num + ' · ' + o.dur + ' · sem som', { x: vx, y: vy + vh + 0.12, w: vw, h: 0.25, fontSize: 11, color: T.suave, align: 'right' });
    // repare em
    txt(s, 'REPARE EM', { x: 0.6, y: 2.0, w: 3.2, h: 0.3, fontSize: 12, bold: true, charSpacing: 2, color: T.suave });
    let y = 2.42;
    o.pontos.forEach((p, i) => {
      s.addShape(pres.shapes.OVAL, { x: 0.6, y: y + 0.02, w: 0.34, h: 0.34, fill: { color: MARCAS[i % 5] }, line: { color: MARCAS[i % 5] } });
      txt(s, String(i + 1), { x: 0.6, y: y + 0.02, w: 0.34, h: 0.34, fontSize: 13, bold: true, color: T.branco, align: 'center', valign: 'middle' });
      txt(s, p, { x: 1.1, y, w: 2.75, h: 0.95, fontSize: 15, color: T.texto });
      y += 1.02;
    });
    if (o.fala) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 6.25, w: 3.25, h: 0.82, rectRadius: 0.08, fill: { color: T.fundo }, line: { color: T.fundo } });
      txt(s, o.fala, { x: 0.78, y: 6.25, w: 2.95, h: 0.82, fontSize: 13, italic: true, color: T.ink2, valign: 'middle' });
    }
    s.addNotes(o.notas);
    return s;
  }

  // 1. Capa ------------------------------------------------------------------
  {
    const s = pres.addSlide();
    s.background = { color: T.ink };
    s.addImage({ altText: 'Planta da ER M no app, com os móveis nas cores das marcas', path: path.join(MIDIA, 'hero.png'), x: 6.2, y: 0.9, w: 7.6, h: 7.6 * 9 / 16, transparency: 0, sizing: { type: 'cover', w: 7.6, h: 7.6 * 9 / 16 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 6.6, h: 7.5, fill: { color: T.ink }, line: { color: T.ink } });
    bolinhas(s, 0.8, 1.3, 0.2);
    txt(s, 'Plano de Varejo', { x: 0.8, y: 1.9, w: 5.6, h: 1.0, fontSize: 48, bold: true, color: T.branco });
    txt(s, 'A estratégia de exposição construída, validada e medida no mesmo lugar', { x: 0.8, y: 3.0, w: 5.4, h: 1.3, fontSize: 22, color: 'C9D0DB' });
    txt(s, 'Trade Marketing · Apresentação à diretoria', { x: 0.8, y: 6.4, w: 5.6, h: 0.4, fontSize: 13, color: '8D97A8' });
    s.addNotes('Abertura (10 s). Apresentar o tema: como a estratégia de exposição passou de um PPT manual para um app que constrói, valida e mede no mesmo lugar.');
  }

  // 2. O problema --------------------------------------------------------------
  {
    const s = pres.addSlide();
    s.background = { color: T.branco };
    secao(s, '1', 'O problema');
    titulo(s, 'Antes, a estratégia vivia num PPT montado à mão');
    const cards = [
      ['LuHand', 'Toda manual', 'Cada móvel, cor e etiqueta desenhados slide a slide. Cada ciclo começava do zero.'],
      ['LuTriangleAlert', 'Sujeita a erros', 'Cópia e colagem entre ERs e ciclos, sem nenhuma conferência no caminho.'],
      ['LuEyeOff', 'Sem tracking', 'Ninguém sabia se o espaço estava bem distribuído entre marcas e movimentos.'],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, t, d] = cards[i];
      const x = 0.6 + i * 4.1;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.3, w: 3.8, h: 3.4, rectRadius: 0.12, fill: { color: T.fundo }, line: { color: T.fundo } });
      s.addShape(pres.shapes.OVAL, { x: x + 0.4, y: 2.7, w: 0.85, h: 0.85, fill: { color: 'FBE3E3' }, line: { color: 'FBE3E3' } });
      s.addImage({ altText: 'Ícone', data: await icone(ic, T.verm), x: x + 0.6, y: 2.9, w: 0.45, h: 0.45 });
      txt(s, t, { x: x + 0.4, y: 3.8, w: 3.0, h: 0.5, fontSize: 22, bold: true, color: T.texto });
      txt(s, d, { x: x + 0.4, y: 4.4, w: 3.05, h: 1.2, fontSize: 15, color: T.suave });
    }
    txt(s, 'Resultado: muito tempo de montagem e nenhuma resposta sobre o que funcionou.', { x: 0.6, y: 6.2, w: 12.1, h: 0.5, fontSize: 18, bold: true, color: T.verm });
    s.addNotes('O problema (2 min, sem vídeo).\n\n- Antes, a estratégia de exposição era montada no PowerPoint: cada móvel, cada cor de marca, cada etiqueta, à mão.\n- Isso era sujeito a erros: copiar e colar entre ERs e ciclos, sem conferência.\n- Não havia nenhum tracking: cada ciclo começava do zero.\n- E ninguém conseguia responder se o espaço estava bem distribuído entre marcas e movimentos.');
  }

  // 3. A solução ---------------------------------------------------------------
  {
    const s = pres.addSlide();
    s.background = { color: T.ink };
    secao(s, '2', 'A solução', true);
    txt(s, '“Um app onde a estratégia de exposição é construída, validada e medida no mesmo lugar.”', { x: 0.6, y: 1.25, w: 6.4, h: 2.9, fontSize: 32, bold: true, color: T.branco, valign: 'middle' });
    const etapas = [['LuPencilRuler', 'Construída', 'na própria planta, com as regras do negócio', T.bot], ['LuShieldCheck', 'Validada', 'no mesmo fluxo, com comentários e aprovação', T.eud], ['LuChartColumn', 'Medida', 'espaço × GMV esperado, por marca, ER e ciclo', T.mm]];
    for (let i = 0; i < 3; i++) {
      const [ic, t, d, c] = etapas[i];
      const y = 4.55 + i * 0.85;
      s.addShape(pres.shapes.OVAL, { x: 0.6, y, w: 0.6, h: 0.6, fill: { color: c }, line: { color: c } });
      s.addImage({ altText: 'Ícone', data: await icone(ic, T.branco), x: 0.74, y: y + 0.14, w: 0.32, h: 0.32 });
      txt(s, [{ text: t + '  ', options: { bold: true, color: T.branco } }, { text: d, options: { color: 'C9D0DB' } }], { x: 1.4, y, w: 5.6, h: 0.6, fontSize: 17, valign: 'middle' });
    }
    s.addImage({ altText: 'Planta da ER M no app, com os móveis nas cores das marcas', path: path.join(MIDIA, 'hero.png'), x: 7.2, y: 1.2, w: 5.6, h: 5.6 * 9 / 16 });
    s.addShape(pres.shapes.RECTANGLE, { x: 8.55, y: 3.95, w: 4.25, h: 4.25 * 826 / 1470, fill: { color: T.branco }, line: { color: T.linha, width: 1 },
      shadow: { type: 'outer', color: '000000', opacity: 0.35, blur: 14, offset: 4, angle: 90 } });
    s.addImage({ altText: 'Gráfico GMV esperado × espaço do Analytics', path: path.join(MIDIA, 'hero-analytics.png'), x: 8.55, y: 3.95, w: 4.25, h: 4.25 * 826 / 1470 });
    s.addNotes('A solução (1 min, sem vídeo).\n\nFrase central: "Um app onde a estratégia de exposição é construída, validada e medida no mesmo lugar."\n\n- Construída: direto na planta da loja, com as regras de cada ER.\n- Validada: o validador comenta e aprova no próprio app.\n- Medida: cada movimento comparado com o GMV esperado.');
  }

  // 4. Como foi construído com IA ----------------------------------------------
  {
    const s = pres.addSlide();
    s.background = { color: T.branco };
    secao(s, '3', 'Como foi construído com IA');
    titulo(s, 'Quem conhece o problema construiu a solução');
    const cols = [
      ['LuUserRound', 'Quem', '1 analista de trade', 'sem time de TI'],
      ['LuBot', 'Como', 'IA como copiloto', 'para programar, testar e corrigir'],
      ['LuTimer', 'Em quanto tempo', '4 semanas', '30/09 a 28/10 · 171 versões salvas'],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, k, v, d] = cols[i];
      const x = 0.6 + i * 4.1;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.2, w: 3.8, h: 2.75, rectRadius: 0.12, fill: { color: i === 2 ? 'E7F4EC' : T.fundo }, line: { color: i === 2 ? 'E7F4EC' : T.fundo } });
      s.addShape(pres.shapes.OVAL, { x: x + 0.4, y: 2.55, w: 0.7, h: 0.7, fill: { color: MARCAS[[0, 1, 4][i]] }, line: { color: MARCAS[[0, 1, 4][i]] } });
      s.addImage({ altText: 'Ícone', data: await icone(ic, T.branco), x: x + 0.56, y: 2.71, w: 0.38, h: 0.38 });
      txt(s, k.toUpperCase(), { x: x + 1.3, y: 2.68, w: 2.3, h: 0.4, fontSize: 13, bold: true, charSpacing: 2, color: T.suave, valign: 'middle' });
      txt(s, v, { x: x + 0.4, y: 3.5, w: 3.2, h: 0.7, fontSize: i === 2 ? 34 : 26, bold: true, color: i === 2 ? T.bot : T.texto, valign: 'middle' });
      txt(s, d, { x: x + 0.4, y: 4.25, w: 3.2, h: 0.55, fontSize: 15, color: T.suave });
    }
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 5.35, w: 12.1, h: 1.35, rectRadius: 0.12, fill: { color: T.ink }, line: { color: T.ink } });
    bolinhas(s, 1.0, 5.95, 0.13);
    txt(s, 'A IA permite que quem conhece o problema construa a solução.', { x: 2.2, y: 5.35, w: 10.2, h: 1.35, fontSize: 24, bold: true, color: T.branco, valign: 'middle' });
    s.addNotes('Como foi construído com IA (2,5 min).\n\n- Quem construiu: um analista de trade, sem time de TI.\n- Como: a IA como copiloto para programar, testar e corrigir. O app tem testes automáticos (mais de 80) que rodam a cada mudança.\n- Em quanto tempo: cerca de 4 semanas, de 30/09 a 28/10/2026, com 171 versões salvas no histórico do código. [Confirme ou ajuste o número; ele saiu do histórico do repositório.]\n- Mensagem: a IA permite que quem conhece o problema construa a solução.');
  }

  // 5–12. Vídeos -----------------------------------------------------------------
  const V = JSON.parse(fs.readFileSync(path.join(MIDIA, 'duracoes.json'), 'utf8'));
  const dur = (v) => '0:' + String(Math.round(V[v])).padStart(2, '0');
  await slideVideo({ n: '4', secao: 'Construir ficou mais fácil', num: 1, video: 'v1', dur: dur('v1'), titulo: 'Montar um móvel já mostra o impacto nos números',
    pontos: ['Clique no móvel e escolha a marca e os movimentos', 'A planta pinta na hora e tudo é salvo sozinho', 'Espaço por marca e GMV × espaço se atualizam a cada mudança'],
    fala: 'Sai o PPT manual, entra um modelo padronizado e validado no próprio fluxo.',
    alt: 'Vídeo: no ciclo em construção, a pirâmide muda de Boticário para Eudora e o espaço por marca da ER P passa de 40% para 50% de Eudora.',
    notas: 'Vídeo 1 (≈1,5 min com o vídeo 2 no próximo slide).\n\nNarração: estou num ciclo em construção. Clico na pirâmide, troco a marca para Eudora e escolho os movimentos OUTLET EUD e SIÀGE ULTIMATE. A planta pinta na hora. Ao tirar a seleção, os números da ER já mudaram: Eudora passou de 40% para 50% do espaço de exposição, e o GMV × espaço de cada movimento foi recalculado.\n\nFala: sai o PPT manual, entra um modelo padronizado e validado no próprio fluxo.' });
  await slideVideo({ n: '4', secao: 'Construir ficou mais fácil', num: 2, video: 'v2', dur: dur('v2'), titulo: 'Do espaço ao produto: o briefing sai pronto em PDF',
    pontos: ['Cada prateleira dividida em quadrados, arrastando', 'Os produtos vêm do catálogo do movimento (ex.: BOTIPROMO)', 'O PDF traz o planograma com códigos e a tabela de SKUs e frentes'],
    fala: 'Um modelo padronizado para quem monta o planograma.',
    alt: 'Vídeo: na gôndola 1, a prateleira é dividida em quadrados com produtos de BOTIPROMO e LÇTO EGEO; depois o briefing em PDF é gerado.',
    notas: 'Vídeo 2.\n\nNarração: abro a gôndola e desenho a prateleira: arrasto para criar um quadrado, escolho o movimento BOTIPROMO e os produtos aparecem filtrados pelo movimento, puxados do catálogo de produtos. Salvo, e o planograma já mostra os produtos para todo mundo. No botão Briefing (PDF), sai um arquivo padronizado: uma página por gôndola e pirâmide, com o código de cada quadrado e a tabela de SKUs e frentes.\n\nFala: sai o PPT manual, entra um modelo padronizado e validado no próprio fluxo.' });
  await slideVideo({ n: '5', secao: 'Decidir com dados', num: 3, video: 'v3', dur: dur('v3'), titulo: 'Cada movimento rende o espaço que ocupa?',
    pontos: ['Cada ponto é um movimento: fatia do espaço × fatia do GMV esperado', 'Acima da diagonal rende mais que o espaço; abaixo, menos', 'Um clique mostra na planta onde o movimento está'],
    alt: 'Vídeo: gráfico de dispersão GMV esperado × espaço por ER; BOTIPROMO acima da diagonal e SIÀGE ULTIMATE abaixo.',
    notas: 'Vídeo 3 (≈1 min).\n\nNarração: no Analytics, o gráfico GMV esperado × espaço. Cada ponto é um movimento. Acima da diagonal, o movimento rende mais do que o espaço que ocupa (ex.: BOTIPROMO); abaixo, rende menos (ex.: SIÀGE ULTIMATE, com mais espaço do que o GMV justifica). Troco a ER e os pontos mudam. Clicando num ponto, a planta ao lado mostra onde aquele movimento está.' });
  await slideVideo({ n: '5', secao: 'Decidir com dados', num: 4, video: 'v4', dur: dur('v4'), titulo: 'O espaço por marca e por tipo de movimento',
    pontos: ['Fatia do espaço de cada ER por marca', 'E por tipo: lançamento, promoção, liquidação, baseline', 'Clique numa fatia e a planta mostra só aquilo'],
    alt: 'Vídeo: barras 100% de marcas e de classificação por ER; o clique em EUD e em Promoção filtra a planta.',
    notas: 'Vídeo 4 (≈1 min).\n\nNarração: aqui a representatividade de cada marca em cada ER, e embaixo por tipo de movimento. Clico em Eudora na ER P e a planta mostra só os espaços da Eudora. Clico em Promoção na ER G e a planta vai para a ER G mostrando só as promoções; o filtro do topo acompanha.' });
  await slideVideo({ n: '6', secao: 'Enxergar o todo', num: 5, video: 'v5', dur: dur('v5'), titulo: 'Cada ciclo empilhado pelo que mais pesa',
    pontos: ['Ciclos do Boticário e da Eudora lado a lado', 'Movimentos empilhados pelo equilíbrio GMV × exposição', 'A construção define a ordem, medalhas e hotspot'],
    alt: 'Vídeo: calendário dos ciclos C13 a C16 com os movimentos empilhados; troca entre equilíbrio, só GMV e só exposição; medalhas de ouro, prata e bronze.',
    notas: 'Vídeo 5 (≈1 min).\n\nNarração: o calendário mostra os ciclos do Boticário e da Eudora, que se sobrepõem. Em cada ciclo, os movimentos estão empilhados do mais importante para o menos importante, pelo equilíbrio entre GMV esperado e exposição. Dá para ver só pelo GMV ou só pela exposição. Na construção, defino a ordem e dou medalhas e o selo de hotspot, que ficam para todo mundo.' });
  await slideVideo({ n: '6', secao: 'Enxergar o todo', num: 6, video: 'v6', dur: dur('v6'), titulo: 'O peso de cada movimento e móvel em cada ER',
    pontos: ['Mapa de calor: movimento × ER, em % ou em espaços', 'Os ícones mostram em que móveis cada movimento está', 'A régua do que conta como espaço em cada móvel'],
    alt: 'Vídeo: mapa de calor movimento × ER no Analytics, ordenado pela ER G; o clique em BOTIPROMO mostra o movimento na planta; legenda do que conta como espaço.',
    notas: 'Vídeo 6 (≈1 min).\n\nNarração: o mapa de calor mostra a fatia de cada movimento em cada ER — quanto mais escuro, maior. Os ícones mostram em que tipos de móvel o movimento está. Alterno entre % da ER e número de espaços, ordeno pela ER G e clico numa célula para ver na planta. Em "Sobre a análise", a régua do que conta como espaço em cada móvel.' });
  await slideVideo({ n: '7', secao: 'Feito para durar', num: 7, video: 'v7', dur: dur('v7'), titulo: 'Um usuário novo aprende sozinho em 1 minuto',
    pontos: ['Boas-vindas na primeira visita, com um tour de 9 passos', 'Pode ser revisto a qualquer hora pela engrenagem', 'Lojas, regras entre ERs e tipos de movimento são editáveis'],
    fala: 'É editável e acompanha as mudanças de estratégia.',
    alt: 'Vídeo: tour guiado do app destacando ciclo, plantas, planta, marcas, Comunicações ER, Analytics, Calendário, Baixar PNG e configurações.',
    notas: 'Vídeo 7 (1,5 min).\n\nNarração: na primeira vez, o app oferece um tour rápido, que destaca cada parte da tela com uma frase. Dá para rever pela engrenagem.\n\nFala: é editável e acompanha as mudanças de estratégia. O layout das lojas, as regras entre as ERs e os tipos de movimento são mudados no próprio app ou na planilha, sem programar.' });
  await slideVideo({ n: '8', secao: 'Facilidades', num: 8, video: 'v8', dur: dur('v8'), titulo: 'Pronto para apresentar e compartilhar',
    pontos: ['Modo apresentação: só a planta, as setas trocam a ER', 'PNG ou slide 16:9 em alta resolução, num clique', 'Modo noturno para a tela inteira'],
    alt: 'Vídeo: modo apresentação com troca de ER pelas setas, download do slide em PNG e modo noturno.',
    notas: 'Vídeo 8 (1 min).\n\nNarração: no modo apresentação, só a planta aparece e as setas trocam a ER. O Baixar PNG gera o slide completo em alta resolução, pronto para a apresentação. E o modo noturno deixa todo o app escuro.' });

  // 13. Resultados e próximos passos ----------------------------------------------
  {
    const s = pres.addSlide();
    s.background = { color: T.branco };
    secao(s, '9', 'Resultados e próximos passos');
    titulo(s, 'Já em uso, e o próximo passo é medir o resultado');
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 2.2, w: 4.6, h: 4.5, rectRadius: 0.12, fill: { color: T.ink }, line: { color: T.ink } });
    txt(s, '3', { x: 1.0, y: 2.55, w: 3.8, h: 1.5, fontSize: 96, bold: true, color: T.branco });
    txt(s, 'ciclos já construídos no app', { x: 1.0, y: 4.05, w: 3.8, h: 0.5, fontSize: 20, bold: true, color: T.branco });
    txt(s, 'E o time inteiro será impactado: construção, validação e quem monta o planograma usam o mesmo modelo.', { x: 1.0, y: 4.75, w: 3.8, h: 1.6, fontSize: 15, color: 'C9D0DB' });
    txt(s, 'O QUE VEM AGORA', { x: 5.7, y: 2.2, w: 6.5, h: 0.3, fontSize: 12, bold: true, charSpacing: 2, color: T.suave });
    const passos = [
      ['LuTarget', 'Mensuração de resultado', 'Ligar o espaço de cada movimento ao que ele vendeu de fato.'],
      ['LuChartScatter', 'Análise de efetividade', 'Comparar o GMV esperado com o realizado, ciclo a ciclo.'],
      ['LuLayoutPanelLeft', 'Conexão com o planejamento de VM', 'A comunicação visual planejada junto com o espaço.'],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, t, d] = passos[i];
      const y = 2.7 + i * 1.35;
      const c = [T.bot, T.eud, T.mm][i];
      s.addShape(pres.shapes.OVAL, { x: 5.7, y, w: 0.75, h: 0.75, fill: { color: c }, line: { color: c } });
      s.addImage({ altText: 'Ícone', data: await icone(ic, T.branco), x: 5.88, y: y + 0.18, w: 0.39, h: 0.39 });
      if (i < 2) s.addShape(pres.shapes.LINE, { x: 6.075, y: y + 0.8, w: 0, h: 0.5, line: { color: T.linha, width: 2 } });
      txt(s, t, { x: 6.7, y: y - 0.02, w: 6.0, h: 0.42, fontSize: 20, bold: true, color: T.texto });
      txt(s, d, { x: 6.7, y: y + 0.42, w: 6.0, h: 0.5, fontSize: 15, color: T.suave });
    }
    s.addNotes('Resultados e próximos passos (2 min).\n\n- Já são 3 ciclos construídos no app, e o time inteiro será impactado.\n- O que vem agora: mensuração de resultado, análise de efetividade e conexão com o planejamento de VM.');
  }

  // 14. Fechamento ---------------------------------------------------------------
  {
    const s = pres.addSlide();
    s.background = { color: T.ink };
    secao(s, '10', 'Fechamento', true);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.5, w: 5.5, h: 2.4, rectRadius: 0.12, fill: { color: T.ink2 }, line: { color: T.ink2 } });
    txt(s, 'DE', { x: 1.0, y: 1.8, w: 4.8, h: 0.3, fontSize: 13, bold: true, charSpacing: 2, color: 'F08A8A' });
    txt(s, 'um PPT manual, sem tracking', { x: 1.0, y: 2.2, w: 4.8, h: 1.4, fontSize: 28, bold: true, color: 'C9D0DB' });
    s.addImage({ altText: 'Ícone', data: await icone('LuArrowRight', 'FFFFFF'), x: 6.32, y: 2.42, w: 0.55, h: 0.55 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.1, y: 1.5, w: 5.6, h: 2.4, rectRadius: 0.12, fill: { color: T.bot }, line: { color: T.bot } });
    txt(s, 'PARA', { x: 7.5, y: 1.8, w: 4.9, h: 0.3, fontSize: 13, bold: true, charSpacing: 2, color: 'D8F0E2' });
    txt(s, 'uma estratégia medida a cada ciclo', { x: 7.5, y: 2.2, w: 4.9, h: 1.4, fontSize: 28, bold: true, color: T.branco });
    txt(s, 'O PEDIDO À DIRETORIA', { x: 0.6, y: 4.5, w: 8, h: 0.3, fontSize: 13, bold: true, charSpacing: 2, color: 'AEB6C4' });
    txt(s, 'Patrocinar o app como o padrão do time a partir do próximo ciclo e liberar os dados de venda por loja para medirmos o resultado de cada movimento.', { x: 0.6, y: 4.95, w: 12.1, h: 1.3, fontSize: 24, bold: true, color: T.branco });
    bolinhas(s, 0.6, 6.75, 0.13);
    s.addNotes('Fechamento (1 min).\n\nRetomar o contraste: "de um PPT manual sem tracking para uma estratégia medida a cada ciclo".\n\nPedido (sugestão — ajuste ao que você precisa da diretoria): patrocinar o app como padrão do time a partir do próximo ciclo e liberar os dados de venda por loja, que são a base da mensuração de resultado e da análise de efetividade.');
  }

  await pres.writeFile({ fileName: SAIDA });
  console.log('ok', SAIDA);
})();
