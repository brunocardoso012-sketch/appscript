/**
 * Dados de demonstração para a gravação: 3 ciclos publicados (C13, C14, C15/2026), calendário do Boticário
 * e da Eudora, feriados e um catálogo maior de produtos. Usa os exemplos do próprio app (Layouts.gs).
 */
const path = require('path');
const { carregarGas } = require(path.join(__dirname, '..', '..', 'dev', 'gas'));

function semente() {
  const { run } = carregarGas();
  const mov = run('valoresMovimentosExemplo_()');
  const tip = run('valoresTiposExemplo_()');
  const pai = run('valoresPaineisExemplo_()');
  const prod = run('valoresProdutosExemplo_()');

  const NOMES = { 'Ciclo exemplo': 'C13/2026', 'Ciclo exemplo cheio': 'C15/2026' };
  const renomear = (linhas) => [linhas[0]].concat(linhas.slice(1).map((l) => [NOMES[l[0]] || l[0]].concat(l.slice(1))));
  // C14 = cópia do cheio, com o GMV variando por movimento (determinístico).
  const fator = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997; return 0.65 + (h % 70) / 100; };
  const copiaC14 = (linhas, gmv) => linhas.slice(1).filter((l) => l[0] === 'Ciclo exemplo cheio')
    .map((l) => { const n = ['C14/2026'].concat(l.slice(1)); if (gmv && typeof n[3] === 'number') n[3] = Math.round(n[3] * fator(n[1] + 'x') / 10000) * 10000; return n; });

  const ordenar = (linhas, extra) => {
    const r = renomear(linhas);
    const c13 = r.slice(1).filter((l) => l[0] === 'C13/2026');
    const c15 = r.slice(1).filter((l) => l[0] === 'C15/2026');
    return [r[0]].concat(c13, extra, c15);
  };

  const produtos = prod.concat([
    ['50115', 'Malbec Club Desodorante Colônia 100ml', 'BOT', 'Perfumaria', 'BOTIPROMO'],
    ['50116', 'Floratta Blue Desodorante Colônia 75ml', 'BOT', 'Perfumaria', 'BOTIPROMO'],
    ['50117', 'Coffee Woman Desodorante Colônia 100ml', 'BOT', 'Perfumaria', 'BOTIPROMO'],
    ['50118', 'Nativa SPA Óleo Desodorante Corporal 200ml', 'BOT', 'Corpo e banho', 'BOTIPROMO'],
    ['50119', 'Cuide-se Bem Hidratante Deleite 400ml', 'BOT', 'Corpo e banho', 'BOTIPROMO'],
    ['50120', 'Kit Malbec Presente', 'BOT', 'Presentes', 'BOTIPROMO'],
    ['51001', 'Make B. Base Hyaluronic', 'BOT', 'Maquiagem', 'BOTIPROMO MAKE B.'],
    ['51002', 'Make B. Máscara de Cílios 5 em 1', 'BOT', 'Maquiagem', 'BOTIPROMO MAKE B.'],
    ['51003', 'Make B. Batom Líquido Matte', 'BOT', 'Maquiagem', 'BOTIPROMO MAKE B.'],
    ['52001', 'Kit Floratta Presente', 'BOT', 'Presentes', 'PRINCIPAIS OPORTUNIDADES'],
    ['52002', 'Arbo Desodorante Colônia 100ml', 'BOT', 'Perfumaria', 'PRINCIPAIS OPORTUNIDADES'],
    ['53001', 'Uomini Desodorante Colônia 100ml', 'BOT', 'Perfumaria', 'LÇTO UOMINI'],
    ['53002', 'Uomini Black Desodorante Colônia 100ml', 'BOT', 'Perfumaria', 'LÇTO UOMINI'],
  ]);

  const calendario = [['Marca', 'Ciclo', 'Início', 'Fim'],
    ['Boticário', 'C13/2026', '15/09/2026', '05/10/2026'], ['Boticário', 'C14/2026', '06/10/2026', '26/10/2026'],
    ['Boticário', 'C15/2026', '27/10/2026', '16/11/2026'], ['Boticário', 'C16/2026', '17/11/2026', '07/12/2026'],
    ['Eudora', 'C13/2026', '19/09/2026', '09/10/2026'], ['Eudora', 'C14/2026', '10/10/2026', '30/10/2026'],
    ['Eudora', 'C15/2026', '31/10/2026', '20/11/2026'], ['Eudora', 'C16/2026', '21/11/2026', '11/12/2026']];
  const feriados = [['Data', 'Feriado'], ['07/09/2026', 'Independência'], ['12/10/2026', 'Nossa Senhora Aparecida'],
    ['02/11/2026', 'Finados'], ['15/11/2026', 'Proclamação da República'], ['20/11/2026', 'Consciência Negra']];

  return {
    layout: run('valoresLayoutPadrao_()'),
    movimentos: ordenar(mov, copiaC14(mov, false)),
    paineis: ordenar(pai, copiaC14(pai, false)),
    tipos: ordenar(tip, copiaC14(tip, true)),
    produtos,
    versoesModelo: run('versoesAtuais_()'),
    'aba:Calendário de ciclos': calendario,
    'aba:Feriados': feriados,
  };
}

module.exports = { semente };
if (require.main === module) {
  const s = semente();
  console.log(Object.keys(s), s.movimentos.length, s.tipos.length);
}
