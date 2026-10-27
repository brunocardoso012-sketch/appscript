/**
 * ============================================================================
 *  DESENVOLVEDOR (o que o módulo da engrenagem pode mudar no app)
 * ============================================================================
 *  O Desenvolvedor (senha SENHAS_ACESSO.DESENVOLVEDOR) controla as plantas e as regras do app:
 *   - plantas: nome (o antigo continua valendo como apelido nas abas), ordem (é a ordem da cascata),
 *     criar (Construir loja › Salvar planta › Criar nova) e apagar;
 *   - espacosPorEr: espaços fixos de uma marca em algumas ERs e livres nas outras (ESPACOS_POR_ER);
 *   - herancaEntreErs: espaços que mudam de nome de uma ER para a seguinte (HERANCA_ENTRE_ERS);
 *   - senhas: as do Desenvolvedor, da Validação e da Construção;
 *   - calendarioCiclos e feriados: o início e o fim de cada ciclo no calendário do Boticário (que vale para
 *     todas as marcas, menos a Eudora) e no da Eudora, e os feriados (CALENDARIO_CICLOS e FERIADOS).
 *  O que muda fica na aba "Config do app" (uma linha por chave, o valor em JSON); o que não está nela
 *  vale como no código (Config.gs). aplicarConfigApp_ põe a configuração nas constantes de Config.gs.
 *
 *  Este arquivo só tem regras sobre matrizes: quem lê e grava as abas é o Code.gs (ioRascunhos_) e, na
 *  versão web, o web/backend-local.js.
 */

/** Chaves da aba "Config do app" e o que cada uma guarda (a descrição vai na planilha). */
const CHAVES_CONFIG_APP = {
  plantas: 'Nomes, nomes antigos (apelidos), ordem (da cascata) e plantas apagadas.',
  espacosPorEr: 'Espaços fixos de uma marca em algumas ERs e livres nas outras.',
  herancaEntreErs: 'Espaços que mudam de nome de uma ER para a seguinte (cascata).',
  senhas: 'Senhas do Desenvolvedor, da Validação e da Construção.',
  calendarioCiclos: 'Início e fim de cada ciclo: calendário do Boticário (vale para todas as marcas, menos a Eudora) e da Eudora.',
  feriados: 'Feriados (data e nome): entram na conta dos dias úteis de cada ciclo.',
};

function colunasConfigApp_() {
  return [
    { titulo: 'Chave', chave: 'chave', obrigatoria: true, texto: true },
    { titulo: 'Valor (JSON)', chave: 'valor', texto: true },
    { titulo: 'O que é', chave: 'descricao', texto: true },
  ];
}

const clonarJson_ = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };

/** O que vem do código (Config.gs), copiado antes da primeira mudança. */
let padraoConfigApp_ = null;
function configAppPadrao_() {
  if (!padraoConfigApp_) {
    padraoConfigApp_ = clonarJson_({
      plantas: { nomes: NOMES_PLANTAS, apelidos: {}, ordem: [], excluidas: [] },
      espacosPorEr: ESPACOS_POR_ER,
      herancaEntreErs: HERANCA_ENTRE_ERS,
      senhas: SENHAS_ACESSO,
      calendarioCiclos: CALENDARIO_CICLOS,
      feriados: FERIADOS,
    });
  }
  return padraoConfigApp_;
}

/** Troca o conteúdo de um objeto (as constantes de Config.gs continuam sendo o mesmo objeto). */
function reporObjeto_(alvo, novo) {
  Object.keys(alvo).forEach(function (k) { delete alvo[k]; });
  Object.keys(novo || {}).forEach(function (k) { alvo[k] = novo[k]; });
}

function reporLista_(alvo, nova) {
  alvo.length = 0;
  (nova || []).forEach(function (x) { alvo.push(x); });
}

/** Põe a configuração do Desenvolvedor nas constantes de Config.gs (sempre a partir do padrão do código). */
function aplicarConfigApp_(cfg) {
  const p = configAppPadrao_();
  const c = cfg || {};
  const pl = c.plantas || {};
  reporObjeto_(NOMES_PLANTAS, Object.assign({}, p.plantas.nomes, pl.nomes || {}));
  reporObjeto_(APELIDOS_PLANTAS, clonarJson_(pl.apelidos || {}));
  reporLista_(ORDEM_PLANTAS, pl.ordem);
  reporLista_(PLANTAS_EXCLUIDAS, pl.excluidas);
  reporObjeto_(ESPACOS_POR_ER, clonarJson_(c.espacosPorEr || p.espacosPorEr));
  reporLista_(HERANCA_ENTRE_ERS, clonarJson_(c.herancaEntreErs || p.herancaEntreErs));
  reporObjeto_(SENHAS_ACESSO, Object.assign({}, p.senhas, c.senhas || {}));
  reporObjeto_(CALENDARIO_CICLOS, Object.assign(clonarJson_(p.calendarioCiclos), clonarJson_(c.calendarioCiclos || {})));
  reporLista_(FERIADOS, clonarJson_(c.feriados || p.feriados));
}

/** Configuração gravada na aba (só as chaves que o Desenvolvedor mudou). */
function configAppDeValores_(valores) {
  const cfg = {};
  if (!valores || !valores.length) return cfg;
  objetosDeValores_(valores, colunasConfigApp_()).linhas.forEach(function (l) {
    const k = texto_(l.chave);
    if (!CHAVES_CONFIG_APP[k] || !texto_(l.valor)) return;
    try { cfg[k] = JSON.parse(texto_(l.valor)); } catch (e) { /* valor estragado: vale o padrão */ }
  });
  return cfg;
}

function valoresConfigApp_(cfg) {
  const linhas = [colunasConfigApp_().map(function (c) { return c.titulo; })];
  Object.keys(CHAVES_CONFIG_APP).forEach(function (k) {
    if (cfg[k] !== undefined) linhas.push([k, JSON.stringify(cfg[k]), CHAVES_CONFIG_APP[k]]);
  });
  return linhas;
}

/* ------------------------------ validação ---------------------------------- */

/** Plantas que existem na aba Layout (na ordem das linhas). */
function idsPlantasDoLayout_(valoresLayout) {
  const ids = [];
  if (!valoresLayout || !valoresLayout.length) return ids;
  objetosDeValores_(valoresLayout, colunasLayout_()).linhas.forEach(function (l) {
    const id = normPlanta_(l.planta);
    if (id && id !== CONFIG.PLANTA_TODAS && ids.indexOf(id) < 0) ids.push(id);
  });
  return ids;
}

/** Próximo número de planta livre (nunca reaproveita o de uma planta apagada nem o de um modelo do código). */
function proximoIdPlanta_(valoresLayout) {
  const usados = idsPlantasDoLayout_(valoresLayout).concat(PLANTAS_EXCLUIDAS, Object.keys(VERSAO_MODELO_PLANTAS));
  const n = usados.reduce(function (m, id) { return Math.max(m, parseInt(id, 10) || 0); }, 0) + 1;
  return (n < 10 ? '0' : '') + n;
}

/** Nome novo de uma planta: sem repetir o de outra (nem o nome antigo de outra). */
function conferirNomePlanta_(id, nome, ids) {
  const n = texto_(nome).replace(/\s+/g, ' ').trim().slice(0, 30);
  if (!n) throw new Error('Dê um nome para a planta.');
  const k = chave_(n);
  if (k === 'TODAS' || k === 'TODOS' || /^\d+$/.test(n)) throw new Error('"' + n + '" não pode ser nome de planta.');
  (ids || []).forEach(function (outro) {
    if (outro === id) return;
    const nomes = [nomePlanta_(outro)].concat(APELIDOS_PLANTAS[outro] || []);
    if (nomes.some(function (x) { return chave_(x) === k; })) throw new Error('Já existe uma planta chamada "' + n + '".');
  });
  return n;
}

/** Espaço de uma regra: "gôndola 1 / ponta-b" → "GONDOLA 1/PONTA-B". */
function espacoDeRegra_(v, onde) {
  const id = normIdEspaco_(v);
  if (!id) throw new Error(onde + ': escolha o espaço.');
  return id;
}

function normalizarEspacosPorEr_(valor, ids) {
  const saida = {};
  const lista = Array.isArray(valor) ? valor : Object.keys(valor || {}).map(function (k) { return Object.assign({ espaco: k }, valor[k]); });
  lista.forEach(function (r, i) {
    const onde = 'Espaço fixo ' + (i + 1);
    const id = espacoDeRegra_(r.espaco, onde);
    if (saida[id]) throw new Error(onde + ': o espaço ' + id + ' já tem uma regra.');
    const fixo = r.fixo || {};
    const plantas = (fixo.plantas || []).map(normPlanta_).filter(function (p, j, l) { return ids.indexOf(p) >= 0 && l.indexOf(p) === j; });
    if (!plantas.length) throw new Error(onde + ' (' + id + '): marque ao menos uma ER em que o espaço é fixo.');
    if (plantas.length === ids.length) throw new Error(onde + ' (' + id + '): deixe ao menos uma ER com o espaço livre.');
    const marca = normMarca_(fixo.marca);
    if (!MARCAS[marca]) throw new Error(onde + ' (' + id + '): escolha a marca do espaço fixo.');
    saida[id] = {
      fixo: { plantas: plantas, marca: marca, nome: texto_(fixo.nome).slice(0, 30) || 'Fixo ' + MARCAS[marca].nome },
      livre: { nome: texto_((r.livre || {}).nome).slice(0, 30) || 'Livre' },
    };
  });
  return saida;
}

function normalizarHeranca_(valor, ids) {
  const vistos = {};
  return (Array.isArray(valor) ? valor : []).map(function (r, i) {
    const onde = 'Mudança de espaço ' + (i + 1);
    const para = normPlanta_(r.para);
    const k = ids.indexOf(para);
    if (k < 1) throw new Error(onde + ': escolha uma ER que tenha outra antes dela na cascata.');
    if (vistos[para]) throw new Error(onde + ': a ' + nomePlanta_(para) + ' já tem uma regra (junte as duas).');
    vistos[para] = true;
    const espacos = {};
    (Array.isArray(r.espacos) ? r.espacos : Object.keys(r.espacos || {}).map(function (n) { return { novo: n, antigo: r.espacos[n] }; }))
      .forEach(function (t, j) {
        if (!texto_(t.novo) && !texto_(t.antigo)) return;
        const o = onde + ', troca ' + (j + 1);
        espacos[espacoDeRegra_(t.novo, o)] = espacoDeRegra_(t.antigo, o);
      });
    const semHeranca = (r.semHeranca || []).map(function (e) { return normIdEspaco_(e); })
      .filter(function (e, j, l) { return e && l.indexOf(e) === j; });
    if (!Object.keys(espacos).length && !semHeranca.length) throw new Error(onde + ': preencha uma troca de espaço ou um espaço que não herda.');
    return { de: ids[k - 1], para: para, espacos: espacos, semHeranca: semHeranca };
  });
}

function normalizarSenhas_(valor) {
  const s = {};
  ['DESENVOLVEDOR', 'VALIDADOR', 'CONSTRUTOR'].forEach(function (papel) {
    const v = String((valor || {})[papel] || '').trim();
    if (v.length < 4) throw new Error('A senha ' + ({ DESENVOLVEDOR: 'do Desenvolvedor', VALIDADOR: 'da Validação', CONSTRUTOR: 'da Construção' })[papel] + ' precisa de ao menos 4 caracteres.');
    s[papel] = v;
  });
  if (s.DESENVOLVEDOR === s.VALIDADOR || s.DESENVOLVEDOR === s.CONSTRUTOR || s.VALIDADOR === s.CONSTRUTOR) {
    throw new Error('Use uma senha diferente para cada módulo.');
  }
  return s;
}

/* ------------------------- calendário dos ciclos --------------------------- */

/** Calendário dos ciclos que a marca segue: só a Eudora tem o dela; todas as outras seguem o do Boticário. */
function calendarioDaMarca_(marca) {
  return normMarca_(marca) === 'EUD' ? 'EUD' : 'BOT';
}

/** "2026-10-25" → dia corrido (para contar dias sem fuso nem horário de verão). */
function diaDaData_(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN;
}

function dataDoDia_(dia) {
  return new Date(dia * 86400000).toISOString().slice(0, 10);
}

/** Dias úteis entre duas datas (inclusive): de segunda a sexta, menos os feriados. */
function diasUteis_(inicio, fim, feriados) {
  const fer = {};
  (feriados || []).forEach(function (f) { fer[f.data] = true; });
  let n = 0;
  for (let d = diaDaData_(inicio); d <= diaDaData_(fim); d++) {
    const semana = new Date(d * 86400000).getUTCDay();
    if (semana !== 0 && semana !== 6 && !fer[dataDoDia_(d)]) n++;
  }
  return n;
}

/** O JSON de cada chave fica numa célula da aba "Config do app" (até 50 mil caracteres no Sheets). */
function conferirTamanhoConfig_(valor, oQue) {
  if (JSON.stringify(valor).length > 45000) throw new Error(oQue + ' ficou grande demais para a aba "' + CONFIG.ABAS.CONFIG_APP + '": apague os anos que já passaram.');
  return valor;
}

/**
 * Calendário dos ciclos: { BOT: [{ ciclo, inicio, fim }], EUD: [...] }. Cada ciclo precisa de nome e das
 * duas datas (fim no mesmo dia do início ou depois, até um ano); num mesmo calendário, um nome aparece uma
 * vez e os ciclos não se sobrepõem. Sai na ordem do início.
 */
function normalizarCalendarioCiclos_(valor) {
  const saida = {};
  Object.keys(CALENDARIOS).forEach(function (cal) {
    const nomeCal = CALENDARIOS[cal].nome;
    const vistos = {};
    const lista = (Array.isArray((valor || {})[cal]) ? valor[cal] : []).map(function (c, i) {
      const onde = 'Calendário ' + nomeCal + ', linha ' + (i + 1);
      const ciclo = texto_(c && c.ciclo).replace(/\s+/g, ' ').slice(0, 40);
      const inicio = dataAntecipacao_(c && c.inicio);
      const fim = dataAntecipacao_(c && c.fim);
      if (!ciclo && !inicio && !fim) return null;
      if (!ciclo) throw new Error(onde + ': dê o nome do ciclo (o mesmo do app, ex.: C15/2026).');
      if (!inicio || !fim) throw new Error(onde + ' (' + ciclo + '): preencha o início e o fim com datas válidas.');
      const dias = diaDaData_(fim) - diaDaData_(inicio) + 1;
      if (dias < 1) throw new Error(onde + ' (' + ciclo + '): o fim (' + dataAntecipacaoTexto_(fim) + ') vem antes do início (' + dataAntecipacaoTexto_(inicio) + ').');
      if (dias > 366) throw new Error(onde + ' (' + ciclo + '): o ciclo passa de um ano. Confira as datas.');
      const k = chave_(ciclo);
      if (vistos[k]) throw new Error('Calendário ' + nomeCal + ': o ciclo ' + ciclo + ' aparece duas vezes.');
      vistos[k] = true;
      return { ciclo: ciclo, inicio: inicio, fim: fim };
    }).filter(Boolean).sort(function (a, b) { return a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0; });
    lista.forEach(function (c, i) {
      const ant = lista[i - 1];
      if (ant && c.inicio <= ant.fim) {
        throw new Error('Calendário ' + nomeCal + ': o ' + c.ciclo + ' (começa em ' + dataAntecipacaoTexto_(c.inicio) + ') se sobrepõe ao ' +
          ant.ciclo + ' (termina em ' + dataAntecipacaoTexto_(ant.fim) + ').');
      }
    });
    saida[cal] = lista;
  });
  return conferirTamanhoConfig_(saida, 'O calendário dos ciclos');
}

/** Feriados: [{ data, nome }] na ordem da data, uma vez cada data. */
function normalizarFeriados_(valor) {
  const vistos = {};
  const lista = (Array.isArray(valor) ? valor : []).map(function (f, i) {
    const onde = 'Feriado ' + (i + 1);
    const data = dataAntecipacao_(f && f.data);
    const nome = texto_(f && f.nome).replace(/\s+/g, ' ').slice(0, 60);
    if (!data && !nome) return null;
    if (!data) throw new Error(onde + (nome ? ' (' + nome + ')' : '') + ': a data não é válida (use dd/mm/aaaa).');
    if (vistos[data]) throw new Error('O feriado de ' + dataAntecipacaoTexto_(data) + ' aparece duas vezes.');
    vistos[data] = true;
    return { data: data, nome: nome || 'Feriado' };
  }).filter(Boolean).sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
  return conferirTamanhoConfig_(lista, 'A lista de feriados');
}

/**
 * Avisos do calendário (não impedem de salvar): dias sem ciclo entre um ciclo e o seguinte e ciclos que
 * começam num feriado ou num fim de semana.
 */
function avisosCalendario_(calendario, feriados) {
  const fer = {};
  (feriados || []).forEach(function (f) { fer[f.data] = f.nome; });
  const avisos = [];
  Object.keys(CALENDARIOS).forEach(function (cal) {
    const nomeCal = CALENDARIOS[cal].nome;
    const lista = (calendario || {})[cal] || [];
    lista.forEach(function (c, i) {
      const ant = lista[i - 1];
      const buraco = ant ? diaDaData_(c.inicio) - diaDaData_(ant.fim) - 1 : 0;
      if (buraco > 0) {
        avisos.push(nomeCal + ': ' + buraco + (buraco === 1 ? ' dia' : ' dias') + ' sem ciclo entre o ' + ant.ciclo + ' e o ' + c.ciclo + '.');
      }
      if (fer[c.inicio]) avisos.push(nomeCal + ': o ' + c.ciclo + ' começa num feriado (' + fer[c.inicio] + ', ' + dataAntecipacaoTexto_(c.inicio) + ').');
      else if ([0, 6].indexOf(new Date(diaDaData_(c.inicio) * 86400000).getUTCDay()) >= 0) {
        avisos.push(nomeCal + ': o ' + c.ciclo + ' começa num fim de semana (' + dataAntecipacaoTexto_(c.inicio) + ').');
      }
    });
  });
  return avisos;
}

/** Tira as linhas de uma planta de uma aba (as de "TODAS" ficam). */
function semLinhasDaPlanta_(valores, colunas, planta) {
  if (!valores || valores.length < 2) return valores;
  const i = acharColuna_(valores[0].map(chave_), colunas.filter(function (c) { return c.chave === 'planta'; })[0]);
  if (i < 0) return valores;
  return [valores[0]].concat(valores.slice(1).filter(function (l) { return normPlanta_(l[i]) !== planta; }));
}

/* ------------------------------- ações ------------------------------------- */

/**
 * Aplica um pedido do Desenvolvedor. A configuração (cfg) muda no lugar; as abas que mudam são gravadas pelo io.
 *  - config:          { chave, valor }   troca uma chave inteira (espacosPorEr, herancaEntreErs, senhas,
 *                                        calendarioCiclos, feriados);
 *  - calendario:      { calendarioCiclos, feriados } troca os dois (seção Calendário do painel);
 *  - padrao:          { chave }          volta a chave ao que está no código;
 *  - renomearPlanta:  { planta, nome }   o nome antigo continua valendo como apelido;
 *  - ordemPlantas:    { ordem: [ids] }   ordem das plantas (é a ordem da cascata);
 *  - excluirPlanta:   { planta, apagarDados } apaga as linhas da planta no Layout (e, com apagarDados, nas
 *                                        abas Movimentos, Painéis e dos ciclos em construção).
 */
function aplicarAcaoConfigDev_(cfg, pedido, io) {
  const p = pedido || {};
  const layout = io.layout();
  const ids = idsPlantasDoLayout_(layout);
  const ordenar = function (lista) {
    const pos = function (id) { const i = ORDEM_PLANTAS.indexOf(id); return i < 0 ? ORDEM_PLANTAS.length : i; };
    return lista.slice().sort(function (a, b) { return pos(a) - pos(b) || a.localeCompare(b, 'pt-BR', { numeric: true }); });
  };
  const plantas = function () {
    cfg.plantas = cfg.plantas || {};
    ['nomes', 'apelidos'].forEach(function (k) { cfg.plantas[k] = cfg.plantas[k] || {}; });
    ['ordem', 'excluidas'].forEach(function (k) { cfg.plantas[k] = cfg.plantas[k] || []; });
    return cfg.plantas;
  };
  const planta = function () {
    const id = normPlanta_(p.planta);
    if (ids.indexOf(id) < 0) throw new Error('A planta "' + texto_(p.planta) + '" não existe.');
    return id;
  };

  if (p.acao === 'config') {
    if (p.chave === 'espacosPorEr') cfg.espacosPorEr = normalizarEspacosPorEr_(p.valor, ordenar(ids));
    else if (p.chave === 'herancaEntreErs') cfg.herancaEntreErs = normalizarHeranca_(p.valor, ordenar(ids));
    else if (p.chave === 'senhas') cfg.senhas = normalizarSenhas_(p.valor);
    else if (p.chave === 'calendarioCiclos') cfg.calendarioCiclos = normalizarCalendarioCiclos_(p.valor);
    else if (p.chave === 'feriados') cfg.feriados = normalizarFeriados_(p.valor);
    else throw new Error('Configuração desconhecida: ' + p.chave + '.');
  } else if (p.acao === 'calendario') {
    // O calendário dos ciclos e os feriados juntos (a seção Calendário do painel salva os dois de uma vez).
    cfg.calendarioCiclos = normalizarCalendarioCiclos_(p.calendarioCiclos);
    cfg.feriados = normalizarFeriados_(p.feriados);
  } else if (p.acao === 'padrao') {
    if (!CHAVES_CONFIG_APP[p.chave] || p.chave === 'plantas') throw new Error('Configuração desconhecida: ' + p.chave + '.');
    delete cfg[p.chave];
  } else if (p.acao === 'renomearPlanta') {
    const id = planta();
    const nome = conferirNomePlanta_(id, p.nome, ids);
    const antigo = nomePlanta_(id);
    const pl = plantas();
    if (chave_(antigo) !== chave_(nome)) {
      const apelidos = (pl.apelidos[id] || []).filter(function (a) { return chave_(a) !== chave_(nome); });
      if (apelidos.every(function (a) { return chave_(a) !== chave_(antigo); })) apelidos.push(antigo);
      pl.apelidos[id] = apelidos;
    }
    pl.nomes[id] = nome;
  } else if (p.acao === 'ordemPlantas') {
    const ordem = (p.ordem || []).map(normPlanta_).filter(function (id, i, l) { return ids.indexOf(id) >= 0 && l.indexOf(id) === i; });
    if (ordem.length !== ids.length) throw new Error('A ordem precisa ter todas as plantas, uma vez cada.');
    plantas().ordem = ordem;
  } else if (p.acao === 'excluirPlanta') {
    const id = planta();
    if (ids.length < 2) throw new Error('O app precisa de ao menos uma planta.');
    const usada = []
      .concat(Object.keys(ESPACOS_POR_ER).filter(function (e) { return ESPACOS_POR_ER[e].fixo.plantas.indexOf(id) >= 0; }))
      .concat(HERANCA_ENTRE_ERS.filter(function (h) { return h.para === id || h.de === id; }).map(function (h) { return 'cascata da ' + nomePlanta_(h.para); }));
    if (usada.length) throw new Error('A ' + nomePlanta_(id) + ' está nas regras da cascata (' + usada.join(', ') + '). Tire-a das regras antes de apagar.');
    io.gravar(CONFIG.ABAS.LAYOUT, colunasLayout_(), semLinhasDaPlanta_(layout, colunasLayout_(), id));
    if (p.apagarDados) {
      abasRascunho_().forEach(function (d) {
        if ([CONFIG.ABAS.MOVIMENTOS, CONFIG.ABAS.PAINEIS, CONFIG.ABAS.R_MOVIMENTOS, CONFIG.ABAS.R_PAINEIS].indexOf(d.aba) < 0) return;
        const m = io.ler(d.aba);
        if (m && m.length > 1) io.gravar(d.aba, d.colunas, semLinhasDaPlanta_(m, d.colunas, id));
      });
    }
    const pl = plantas();
    delete pl.nomes[id];
    delete pl.apelidos[id];
    pl.ordem = pl.ordem.filter(function (x) { return x !== id; });
    if (pl.excluidas.indexOf(id) < 0) pl.excluidas.push(id);
  } else {
    throw new Error('Ação desconhecida.');
  }
}

/** O que o painel do Desenvolvedor mostra: a configuração que vale (com as senhas) e o padrão do código. */
function respostaConfigDev_(cfg, layout) {
  const ids = idsPlantasDoLayout_(layout);
  const pos = function (id) { const i = ORDEM_PLANTAS.indexOf(id); return i < 0 ? ORDEM_PLANTAS.length : i; };
  ids.sort(function (a, b) { return pos(a) - pos(b) || a.localeCompare(b, 'pt-BR', { numeric: true }); });
  const padrao = configAppPadrao_();
  return {
    plantas: ids.map(function (id) { return { id: id, nome: nomePlanta_(id), apelidos: APELIDOS_PLANTAS[id] || [] }; }),
    espacosPorEr: clonarJson_(ESPACOS_POR_ER),
    herancaEntreErs: clonarJson_(HERANCA_ENTRE_ERS),
    senhas: clonarJson_(SENHAS_ACESSO),
    calendarios: clonarJson_(CALENDARIOS),
    calendarioCiclos: clonarJson_(CALENDARIO_CICLOS),
    feriados: clonarJson_(FERIADOS),
    calendarioAvisos: avisosCalendario_(CALENDARIO_CICLOS, FERIADOS),
    mudou: Object.keys(CHAVES_CONFIG_APP).filter(function (k) { return cfg[k] !== undefined; }),
    padrao: { espacosPorEr: padrao.espacosPorEr, herancaEntreErs: padrao.herancaEntreErs },
  };
}

/**
 * Lê (pedido vazio) ou muda a configuração do Desenvolvedor, com a trava do script.
 * io: { ler(aba), gravar(aba, colunas, matriz), layout(), travar(fn) } (ioRascunhos_ no Code.gs).
 */
function executarConfigDev_(io, acesso, pedido) {
  conferirDesenvolvedor_(acesso);
  return io.travar(function () {
    const cfg = configAppDeValores_(io.ler(CONFIG.ABAS.CONFIG_APP));
    aplicarConfigApp_(cfg);
    if (pedido && pedido.acao) {
      aplicarAcaoConfigDev_(cfg, pedido, io);
      io.gravar(CONFIG.ABAS.CONFIG_APP, colunasConfigApp_(), valoresConfigApp_(cfg));
      aplicarConfigApp_(cfg);
    }
    return respostaConfigDev_(cfg, io.layout());
  });
}

/**
 * Grava uma planta inteira na aba Layout (Construir loja › Salvar planta). planta = 'NOVA' cria uma planta
 * com o próximo número livre; nome (opcional) dá o nome dela.
 * @return {{planta: string, nome: string, moveis: number}}
 */
function executarSalvarLayout_(io, acesso, planta, layout, nome) {
  conferirDesenvolvedor_(acesso);
  return io.travar(function () {
    const existentes = io.layout() || valoresLayoutPadrao_();
    const cfg = configAppDeValores_(io.ler(CONFIG.ABAS.CONFIG_APP));
    aplicarConfigApp_(cfg);
    const nova = String(planta || '').toUpperCase() === 'NOVA';
    const id = nova ? proximoIdPlanta_(existentes) : normPlanta_(planta);
    const ids = idsPlantasDoLayout_(existentes);
    const nomeNovo = texto_(nome) ? conferirNomePlanta_(id, nome, ids) : '';
    const objetos = objetosLayoutDaPlanta_(id, layout);
    io.gravar(CONFIG.ABAS.LAYOUT, colunasLayout_(), mesclarLinhas_(existentes, objetos, colunasLayout_()));
    const pl = cfg.plantas || {};
    if (nomeNovo || (pl.excluidas || []).indexOf(id) >= 0) {
      cfg.plantas = pl;
      pl.nomes = pl.nomes || {};
      if (nomeNovo) pl.nomes[id] = nomeNovo;
      pl.excluidas = (pl.excluidas || []).filter(function (x) { return x !== id; });
      io.gravar(CONFIG.ABAS.CONFIG_APP, colunasConfigApp_(), valoresConfigApp_(cfg));
      aplicarConfigApp_(cfg);
    }
    return { planta: id, nome: nomePlanta_(id), moveis: objetos.length - 1 };
  });
}
