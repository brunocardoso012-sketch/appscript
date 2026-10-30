# Plano de Varejo · Guia de instalação e atualização no Apps Script

Este guia é para quem **já usa o app no Apps Script e já tem a planilha com os ciclos**. A atualização troca só o código: **a sua planilha e os seus ciclos continuam como estão**. O único acréscimo na planilha é uma aba nova, opcional, chamada **Tipos de movimento**.

## Arquivos desta pasta

| Arquivo | Para quê |
|---|---|
| `App completo - Plano de Varejo.gs` | O **app completo** inteiro num arquivo. |
| `appsscript.json` | O manifesto do projeto. Normalmente você **não** precisa mexer nele. |

> **Não existe mais a versão "visualizador"** (só visualização). Agora há só o app completo. A engrenagem tem todos os itens (*Validação*, *Construção*, *Ajustar etiquetas*, *Modo noturno*, *Ver o tutorial*) e o **Modo desenvolvedor**, que pede uma senha e abre o painel do desenvolvedor, com a construção da loja (*Construir loja*, *Baixar planilha base*, *Importar planilha*), o controle das plantas, as regras da cascata, as senhas e as planilhas. Quem ainda usa o visualizador troca para o app completo na **Parte A**.

> **Já tem *Comunicações ER* e *Espaço por marca* no topo do app?** Então falta só a atualização do **Analytics**: use o passo a passo curto em [ATUALIZAÇÃO ANALYTICS - PASSO A PASSO.md](ATUALIZA%C3%87%C3%83O%20ANALYTICS%20-%20PASSO%20A%20PASSO.md).

> Para abrir um `.gs` no computador e copiar o conteúdo: abra com o Bloco de Notas (Windows) ou o TextEdit (Mac), ou abra o arquivo no GitHub e clique em **Raw**. Depois use <kbd>Ctrl</kbd>+<kbd>A</kbd> e <kbd>Ctrl</kbd>+<kbd>C</kbd> (no Mac, <kbd>Cmd</kbd>).

---

## O que muda para quem usa o app

- **Analytics** (no lugar do antigo *Espaço por marca*): um dashboard do ciclo que compara as ERs — o mapa movimento × ER, as marcas e as classificações em cada ER e o GMV esperado × espaço (gráfico de dispersão). Clicar numa célula ou num ponto mostra na planta daquela ER só onde o movimento aparece.
- **Aba nova na planilha, "Tipos de movimento":** nela você informa a classificação (lançamento, promoção…) e o GMV esperado de cada movimento.
- **Só o app completo:** a versão *visualizador* deixou de existir. Quem usava o visualizador passa a usar o app completo (Parte A); a planilha e os ciclos continuam os mesmos.
- **Modo desenvolvedor (com senha):** é um item da engrenagem, como a *Validação* e a *Construção*. Ele pede a senha `desenvolvedor_exposicao` e abre o **painel do desenvolvedor** (escuro, com âmbar; enquanto ele está aberto, uma faixa *Modo desenvolvedor* fica no alto da tela). Nele fica a **construção da loja** (que saiu do topo): *Construir loja*, *Baixar planilha base* e *Importar planilha*. Os outros itens continuam direto na engrenagem.
- **Sem ciclos de exemplo:** o *Ciclo exemplo* e o *Ciclo exemplo cheio* saíram da base. Na primeira abertura depois da atualização, as linhas deles saem das abas *Movimentos*, *Painéis* e *Tipos de movimento* (os outros ciclos não mudam). O seletor de ciclo também não tem mais a opção *Sem ciclo (planta limpa)*.
- **Controle das plantas (Desenvolvedor › Plantas):** renomear (o nome antigo continua valendo na planilha), mudar a ordem da cascata, mudar o tamanho da loja e das etiquetas, duplicar e apagar plantas. No *Construir loja*, **Salvar planta** pergunta se substitui uma planta existente ou cria uma nova.
- **Regras da cascata (Desenvolvedor › Cascata entre ERs):** a ponta B da gôndola 1 (fixa de O.U.i numa ER e livre nas outras) e a gôndola 2 → gôndola 3 entre a ER M e a ER G passam a ser editáveis, e dá para criar outras regras desse tipo.
- **Construir loja salva sozinho:** cada mudança vai para a aba *Layout* um instante depois (o rodapé mostra *✓ Salvo na planilha*). O botão *Salvar planta* virou **Salvar como…** (planta nova ou substituir outra), e *Baixar código da loja* e *Carregar código…* saíram.
- **Layout numa planilha separada (opcional, Desenvolvedor › Planilhas):** o layout de todas as plantas pode ir para uma planilha só dele (*Criar uma planilha só para o layout* ou *Usar uma planilha que já existe*). Na principal, a aba antiga fica como *Layout (antigo)*. Na primeira vez, o Google pode pedir autorização de novo (o app passa a abrir outra planilha). Com o login da *Construção*, o botão **Ordem e selos** do calendário muda a ordem dos movimentos de um ciclo (arrastando) e dá selos especiais (**hotspot** e medalha de **ouro, prata ou bronze**); salva nas abas novas **Ordem do calendário** e **Selos dos movimentos**, criadas sozinhas na primeira gravação. No **Baixar PNG**, o conteúdo **Calendário do ciclo** baixa a linha do tempo de um ciclo, com as datas do Boticário e da Eudora e os movimentos empilhados.
- **Senhas (Desenvolvedor › Senhas):** as três senhas podem ser trocadas no app. O que o Desenvolvedor muda fica numa aba nova, **Config do app**, criada sozinha na primeira mudança (não apague nem edite à mão).
- **Topo reorganizado:** *Comunicações ER* e *Analytics* ficam em destaque; o resto fica na engrenagem. *Baixar PNG* fica no canto de baixo da planta.
- **Ajustar etiquetas:** cada pilha de etiquetas se move sozinha, e dá para mudar o tamanho das etiquetas.
- **Baixar PNG:** escolha o conteúdo (planta, visão simplificada ou **estratégia**, que é o espaço da ER em gráficos) e o formato (PNG recortado ou slide completo).
- **Tutorial guiado:** quem abre o app pela primeira vez recebe um convite para um tour curto (só o essencial).
- **Abre no último ciclo aprovado:** o app abre direto no último ciclo da planilha. Quem está logado na validação vai para o ciclo em construção (construtor) ou aguardando aprovação (validador), com uma faixa em destaque no topo.
- **Tipos de movimento na aprovação:** todos os movimentos cadastrados em *Tipos de movimento* na construção do ciclo entram na aba *Tipos de movimento* quando o validador aprova, inclusive os que ainda não estão em nenhum espaço.
- **Analytics e tela do móvel:** sem o aviso *Página em construção*.
- **Editar um ciclo publicado:** com o login da *Construção*, o botão *Editar ciclo* (no painel, com um ciclo publicado na tela) abre o painel de construção no próprio ciclo; o que mudar vai direto para as abas *Movimentos*, *Painéis* e *Tipos de movimento* e vale na hora para todos.
- **Prateleiras e briefing:** o desenho das prateleiras vale sempre para todas as ERs que têm o espaço. O briefing (PDF) passa a levar todos os móveis desenhados, numera os blocos 1, 2, 3… em cada espaço e traz uma tabelinha por espaço e movimento (bloco, SKU, frentes e observação); o meio dividido da gôndola aparece com as metades juntas, só com um pontilhado.
- **Ajustar etiquetas só com login:** o item aparece na engrenagem só para quem entrou na *Validação*, na *Construção* ou no *Modo desenvolvedor*. O que for salvo vai para a aba *Layout* e aparece para todos que abrirem o app depois; o *Construir loja* não apaga esses ajustes.
- **Briefing só na construção:** o botão do briefing saiu do topo; agora é *Baixar briefing (PDF)*, na seção *Construção das prateleiras* da tela do móvel, só para quem entrou na *Construção*.
- **Topo:** *Copiar link* fica no topo. *Abrir planilha* saiu da engrenagem: a planilha se abre pelo painel do desenvolvedor.
- **Símbolo por etiqueta:** cada etiqueta pode ter o seu símbolo (🔒, Ⓔ, NEW ou ⏩ antecipação). Com a antecipação, entra também a data, que aparece ao lado do ⏩ na planta. Na planilha, são as colunas novas *Símbolo Etiqueta 1…4* e *Data Etiqueta 1…4* da aba *Movimentos*, criadas sozinhas na primeira aprovação (ou acrescente à mão, com esses títulos).
- **Validação e Construção separadas:** a engrenagem tem um item para cada módulo, cada um com a sua senha: *Validação* (`validacao_exposicao`) e *Construção* (`construcao_exposicao`). As senhas antigas (`1234`) deixam de funcionar: avise o validador e o construtor.
- **Montar um ciclo novo no app:** com o login da *Construção* (engrenagem), o construtor da estratégia cria um ciclo (em branco, copiando outro ou só os espaços fixos 🔒 de outro) e monta em três passos, num painel na lateral: os Tipos de movimento com o GMV, depois os móveis (clicando na planta; ela pinta e mostra as etiquetas na hora, tudo é salvo sozinho e o painel mostra os números da ER), depois o envio para aprovação. O validador aprova (o ciclo entra nas abas *Movimentos*, *Painéis* e *Tipos de movimento*) ou devolve com um comentário. Um ciclo já publicado pode voltar a ser editado: *Converter ciclo em rascunho* (construtor ou validador) leva tudo dele de volta para as abas de rascunho. Enquanto não é aprovado, o ciclo fica em quatro abas novas, criadas sozinhas na primeira vez: *Rascunhos*, *Rascunho Movimentos*, *Rascunho Painéis* e *Rascunho Tipos*. Não apague essas abas nem mexa nelas à mão.
- **Construção do ciclo, novidades:** cada espaço começa com **uma etiqueta** e o botão **+ Adicionar etiqueta** põe outra (até 4); o **×** tira uma. Nos selects de marca, cada marca aparece com a **cor dela no fundo**. Na gôndola, cada meio tem **Dividir em 2** (e **Juntar metades**). Os espaços fixos (🔒) copiados de outro ciclo aparecem na planta mesmo com o *Comparar com* ligado: ao montar um ciclo, a comparação sai.
- **Ordem das marcas:** em todas as listas do app (legenda, filtros, selects, Analytics, PNG), as marcas seguem a ordem **BOT | EUD | QDB | OUI | MM**.
- **Antecipações:** quando um item do próximo ciclo precisa entrar antes, quem entrou na validação cria uma *antecipação* (seção *Antecipações* do painel da validação): escolhe o espaço (na lista ou clicando na planta), o movimento, a marca, se ele substitui o espaço ou soma às etiquetas, e a data em que entra. A planta mostra o item no espaço com o símbolo ⏩ para todo mundo, e a data aparece na tela do móvel e em *Comunicações ER*. As antecipações ficam numa aba nova, *Antecipações*, criada sozinha na primeira vez; as abas *Movimentos* e *Painéis* não mudam.
- **Prateleiras (o desenho de cada prateleira):** na tela do móvel, o *Planograma · como as prateleiras estão divididas* mostra cada prateleira com os quadrados desenhados e os produtos de cada um. Só com o login da *Construção* aparece a seção *Construção das prateleiras*: o construtor clica em *Desenhar* no espaço, arrasta na prateleira para criar os quadrados (na altura toda da prateleira, lado a lado; move e muda a largura arrastando) e, em cada quadrado, escolhe o movimento e os produtos. Os produtos vêm de uma aba nova, **Produtos** (SKU, Produto, Marca, Categoria e Movimento): crie a aba com essas colunas e cole a lista de produtos (ou use *Configurar planilha*, que cria a aba com exemplos). O desenho fica em outra aba nova, *Prateleiras*, criada sozinha na primeira vez (uma linha por produto de cada quadrado).
- **Briefing das gôndolas e pirâmides (PDF):** o botão *Briefing (PDF)*, ao lado do *Baixar PNG*, baixa um PDF com uma página por gôndola e por pirâmide (da ER da tela ou de todas; a pirâmide com os 4 lados, do mesmo tamanho, cada um com as 4 prateleiras): o planograma desenhado, com um código em cada quadrado, e a tabela com a posição e o tamanho de cada quadrado (em % e em cm) e os produtos na ordem (SKU, nome e frentes), para reproduzir no programa de planograma.
- **Calendário dos ciclos:** o botão *Calendário* (ao lado do *Analytics*) mostra uma linha do tempo horizontal, com as datas da esquerda para a direita, os ciclos do **Boticário** (que valem para todas as marcas, menos a Eudora) e da **Eudora** sobrepostos e, embaixo, todos os movimentos juntos, cada um do início ao fim do ciclo da sua marca, empilhados pelo equilíbrio entre o GMV esperado e a exposição (ou só por um dos dois). As datas vêm de uma **planilha do calendário** que você vincula em **Desenvolvedor › Planilhas** (abas *Calendário de ciclos*: Marca, Ciclo, Início, Fim; e *Feriados*: Data, Feriado). Sem ela, o app procura essas abas na planilha principal. Na primeira vez, o Google pode pedir autorização de novo (o app passa a abrir outra planilha).
- **Briefing na pasta do Drive:** o PDF do briefing passa a se chamar `Briefing - <ciclo> - <ER>.pdf`. Em **Desenvolvedor › Planilhas › Pasta dos briefings (Drive)**, vincule (ou crie) uma pasta do Drive: quem entrou na *Construção* ganha, no *Briefing (PDF)*, a opção **Salvar na pasta do Drive**, que grava o arquivo na subpasta do ciclo (ex.: `C15-2026`), substituindo o anterior com o mesmo nome. Na primeira vez, o Google pede autorização de novo (o app passa a gravar no Drive).

---

## Passo 1 · Descubra qual versão você usa

Abra a planilha e vá em **Extensões › Apps Script**. Olhe a lista de arquivos à esquerda.

| Se você vê… | Você usa o… | Siga |
|---|---|---|
| Só **um** arquivo `Código.gs`, que começa com `PLANO DE VAREJO · VISUALIZADOR` (ou tem `const VISUALIZADOR = {` no começo) | Visualizador, em arquivo único | **Parte A** |
| `Código.gs` (ou `Codigo.gs`) **e** um `Index.html` | Visualizador, em arquivos separados | **Parte A** |
| Só **um** arquivo `Código.gs`, que começa com `PLANO DE VAREJO · APP COMPLETO` | App completo, em arquivo único | **Parte B** |
| Vários arquivos: `Code`, `Config`, `Dados`, `Layouts`, `Validacao`, `Index`, `Styles`, `Render`, `App`… | App completo | **Parte B** |

Outra pista é a tela do app: se ela tem o botão **Construir loja** (no topo, na engrenagem ou em *engrenagem › Modo desenvolvedor*), é o app completo. Se não tem, é o visualizador.

## Passo 2 · Faça uma cópia de segurança (2 minutos)

1. Na planilha, vá em **Arquivo › Fazer uma cópia**. A cópia leva junto a planilha **e** o script. Dê um nome como *Plano de Varejo – backup AAAA-MM-DD*.
2. No Apps Script, vá em **Implantar › Gerenciar implantações** e **anote o link** da implantação ativa (App da Web). É esse link que as pessoas usam, e ele vai continuar o mesmo.

Se algo der errado, a cópia tem tudo como estava antes.

---

## Parte A · Trocar o **visualizador** pelo app completo

O visualizador deixou de existir: ele vira o app completo, na mesma planilha e com o mesmo link. Os seus ciclos (abas *Movimentos*, *Painéis* e *Tipos de movimento*), os comentários, as antecipações, as prateleiras e os ciclos em construção continuam como estão.

### A1. Veja onde está a planilha

Abra o `Código.gs` atual e procure, logo no começo:

```js
const VISUALIZADOR = {
  PLANILHA: '',
```

- Se estiver vazio (`''`), o script está ligado à própria planilha (o caso normal). Siga para o A2.
- Se tiver um link ou ID entre as aspas, o script abre outra planilha. **Copie e guarde** o ID (o trecho do link entre `/d/` e `/edit`). No app completo, ele vai numa propriedade do script: em **Configurações do projeto** (engrenagem à esquerda) › **Propriedades do script** › **Adicionar propriedade**, com o nome `SPREADSHEET_ID` e o ID como valor. Faça isso depois do A2.

### A2. Troque o código

Siga os passos **B1 a B4** da Parte B (eles servem também para quem vem do visualizador): apague o `Código.gs` e o `Index.html` antigos, cole `App completo - Plano de Varejo.gs` e publique como **Nova versão** da mesma implantação.

### A3. Crie a aba Layout

O visualizador guardava o layout das lojas no código; o app completo guarda na aba **Layout** da planilha (é nela que o *Construir loja* grava). Recarregue a planilha e use o menu **Plano de Varejo › Configurar planilha (criar abas que faltam)**: ele cria a aba *Layout* com as plantas padrão (as mesmas do visualizador) e as outras abas que faltarem, sem mexer nas que já existem.

Se o script não está ligado à planilha (caso do `SPREADSHEET_ID`, no A1), esse menu não aparece nela. Sem problema: sem a aba *Layout*, o app usa as plantas padrão, e a primeira mudança no *Construir loja* (que salva sozinho) cria a aba.

> Lembre do aviso do passo B1: o app completo **apaga as linhas do "Ciclo exemplo" e do "Ciclo exemplo cheio"**. Se um ciclo de verdade tem um desses nomes, renomeie antes.

Depois siga para a **Conferência final**.

---

## Parte B · Atualizar o **app completo**

### B1. Leia antes de começar

Na primeira abertura depois da atualização, o app faz três coisas sozinho:

- **Cria a aba "Tipos de movimento"** (só com o cabeçalho), se ela ainda não existir.
- **Apaga as linhas do "Ciclo exemplo" e do "Ciclo exemplo cheio"** nas abas *Movimentos*, *Painéis* e *Tipos de movimento*: eles não fazem mais parte da base. Os outros ciclos **não mudam**.
  👉 **Se você usa o nome "Ciclo exemplo" (ou "Ciclo exemplo cheio") num ciclo de verdade, renomeie esse ciclo antes** (ex.: para `C14/2026`) nas abas *Movimentos*, *Painéis* e *Tipos de movimento*.
- **Acrescenta colunas na aba *Layout*** quando você salvar posições de etiquetas: *Ajuste Etiquetas por espaço (px)* e *Tamanho das etiquetas (%)*. Não apague essas colunas.

### B2. Troque os arquivos do projeto

O jeito mais simples é usar **um arquivo só**:

1. No Apps Script, apague **todos os arquivos `.gs` e `.html`**: `Code`, `Config`, `Dados`, `Layouts`, `Validacao`, `Index`, `Styles`, `Render`, `Planilha`, `Construtor`, `Validacao` (html), `App`… Para cada um, clique nos **⋮** e escolha **Excluir**.
   - Mantenha o **`appsscript.json`**, se ele aparecer.
   - Se sobrar algum arquivo antigo, o app dá o erro *"Identifier '…' has already been declared"*.
2. Clique em **+ › Script**, dê o nome **`Código`** e apague o conteúdo de exemplo.
3. Cole **o conteúdo inteiro** de `App completo - Plano de Varejo.gs` e salve (<kbd>Ctrl</kbd>+<kbd>S</kbd>).

<details>
<summary>Prefere manter os arquivos separados?</summary>

Também funciona. Substitua o conteúdo de cada arquivo pelo da pasta `src/` do projeto e **crie os arquivos HTML novos**:

| Tipo | Nome | Conteúdo |
|---|---|---|
| HTML | `Estrategia` | `src/Estrategia.html` (novo) |
| HTML | `Tutorial` | `src/Tutorial.html` (novo) |
| HTML | `Analytics` | `src/Analytics.html` (novo) |
| HTML | `Calendario` | `src/Calendario.html` (novo) |
| HTML | `Desenvolvedor` | `src/Desenvolvedor.html` (novo) |
| Script | `Desenvolvedor` | `src/Desenvolvedor.gs` (novo) |

Os demais (`Code`, `Config`, `Dados`, `Layouts`, `Validacao`, `Index`, `Styles`, `Render`, `Planilha`, `Construtor`, `Validacao` html, `App`) recebem o conteúdo novo do arquivo de mesmo nome em `src/`. Sem os arquivos novos, a página não abre.
</details>

### B3. Teste antes de publicar (opcional, recomendado)

Vá em **Implantar › Testar implantações** e abra o link que termina em `/dev`. Na primeira abertura, o app cria a aba *Tipos de movimento*. Confira se a planta, os ciclos e o *Analytics* aparecem.

### B4. Publique a nova versão (o link continua o mesmo)

Vá em **Implantar › Gerenciar implantações**, clique no **lápis** da implantação ativa, escolha **Versão: Nova versão** e clique em **Implantar**.

> ⚠️ **Não** use *Nova implantação*: ela cria um link novo.

### B5. Preencha "Tipos de movimento" nos seus ciclos

A aba é criada já com as colunas, as listas suspensas e o GMV em reais. Acrescente as linhas dos **seus** ciclos, uma por movimento:

- **Ciclo:** o mesmo nome usado na aba *Movimentos* (ex.: `C15/2026`).
- **Movimento (etiqueta):** o texto da etiqueta, igual ao da aba *Movimentos* (ex.: `LÇTO EGEO`). Maiúsculas e espaços a mais não importam.
- **Classificação:** `Lançamento`, `Promoção`, `Liquidação / outlet`, `Baseline` (o antigo *Institucional / portfólio*) ou `Outro`. Também aceita outro texto, que vira uma classificação própria.
- **GMV esperado (R$):** um número, como `1500000`, `R$ 1.500.000,00`, `1,5 mi` ou `250 mil`.
- **Observação:** opcional. Aparece ao passar o mouse no painel.

Atalho: no app, abra engrenagem › Modo desenvolvedor (senha `desenvolvedor_exposicao`), escolha o seu ciclo e clique em **Baixar planilha base › Copiar o ciclo selecionado**. A aba *Tipos de movimento* do arquivo já vem com todas as etiquetas do ciclo. Preencha a classificação e o GMV e use **Importar planilha**.

Se a aba não aparecer, recarregue a planilha e use o menu **Plano de Varejo › Configurar planilha (criar abas que faltam)**. Ele só cria o que falta e não mexe no resto.

### B6. Gôndola 3 da ER G nos seus ciclos

A Gôndola 3 da ER G pode repetir o Lado B e o Meio B da Gôndola 2 da ER M (é a regra de *Desenvolvedor › Cascata entre ERs*). Se quiser fazer isso direto nos **seus** ciclos, na aba *Movimentos*:

- linha **ER G · `GONDOLA 3/LADO-A`**: copie a marca, as etiquetas e o símbolo da linha **ER M · `GONDOLA 2/LADO-B`**;
- linha **ER G · `GONDOLA 3/MEIO-A`**: copie da linha **ER M · `GONDOLA 2/MEIO-B`**.

Depois clique em **Atualizar** no app.

### B7. Se você mudou o layout das plantas

Ao abrir, o app só troca o layout de uma planta quando o **modelo padrão** dela muda no código. Esta atualização **não muda** nenhum modelo de planta: o último ajuste dos modelos é de **06/10/2026**.

- Se o seu app foi instalado ou atualizado **depois de 06/10/2026**, o layout das plantas não é tocado.
- Se ele é **anterior**, as plantas cujo modelo mudou desde então voltam ao modelo novo na primeira abertura. Nesse caso, se você criou ou alterou plantas pelo *Construir loja*, confira cada uma. Se alguma tiver voltado ao padrão, copie as linhas dela da aba *Layout* da cópia de segurança (passo 2) e cole de volta.

---

## Conferência final

Abra o link do app e confira:

- [ ] Aparece o convite **"Bem-vindo ao Plano de Varejo"**. Ele aparece uma vez por navegador. Faça o tour ou clique em *Agora não*.
- [ ] O seletor de ciclo mostra os **seus** ciclos e a planta abre com as cores e as etiquetas.
- [ ] O topo tem **Comunicações ER**, **Analytics** e **Calendário** em destaque. A **engrenagem** mostra *Validação*, *Construção*, *Modo noturno*, *Ver o tutorial* e *Modo desenvolvedor* (e *Ajustar etiquetas* depois de entrar em um deles). O *Modo desenvolvedor* pede a senha `desenvolvedor_exposicao` (outra senha não entra) e abre o painel, com a faixa *Modo desenvolvedor* no alto da tela.
- [ ] O seletor de ciclo não tem mais *Ciclo exemplo*, *Ciclo exemplo cheio* nem *Sem ciclo (planta limpa)*.
- [ ] No painel, *Construção da loja* tem *Construir loja*, *Baixar planilha base* e *Importar planilha*; *Plantas* mostra as suas plantas na ordem da cascata; *Cascata entre ERs* mostra as regras da ponta B da gôndola 1 e da gôndola 2 → gôndola 3.
- [ ] O **Analytics** mostra o mapa movimento × ER e as marcas e classificações em cada ER. A classificação e o GMV só aparecem para os movimentos que estão na aba *Tipos de movimento*.
- [ ] Em *Desenvolvedor › Planilhas*, o bloco **Calendário dos ciclos e feriados** vincula a planilha com as datas (ou cria uma). Preencha as abas *Calendário de ciclos* (o nome do ciclo igual ao do seletor) e *Feriados*, clique em *Atualizar* e abra o botão **Calendário** no topo: os ciclos do Boticário e da Eudora aparecem na linha do tempo, com os movimentos empilhados embaixo.
- [ ] **Baixar PNG** (canto de baixo da planta) baixa a planta, a visão simplificada e a estratégia.
- [ ] As posições de etiquetas que você já tinha salvado continuam no lugar.
- [ ] Na engrenagem, entre na *Construção* (senha `construcao_exposicao`): o painel mostra **Ciclos em construção** com o botão *Novo ciclo*. Se quiser testar, crie um ciclo de teste, mude um espaço e depois clique em *Excluir* na faixa do ciclo.
- [ ] Com um ciclo publicado na tela, a seção **Antecipações** aparece no mesmo painel. Se quiser testar, crie uma antecipação num espaço (o espaço ganha o ⏩) e depois clique em *Excluir*.
- [ ] Com a aba **Produtos** preenchida, ainda na *Construção*, clique numa gôndola: a tela do móvel tem a seção **Construção das prateleiras**, com o botão *Desenhar* em cada espaço. Se quiser testar, arraste numa prateleira, escolha um produto e salve (o desenho aparece no planograma, no alto); depois use *Apagar o desenho*.
- [ ] Com um ciclo na tela, o botão **Briefing (PDF)** (ao lado do *Baixar PNG*) baixa o PDF das gôndolas e pirâmides da ER.

Se tudo estiver certo, avise os usuários: o link é o mesmo.

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Erro *"Identifier 'CONFIG' (ou outro nome) has already been declared"* ao salvar ou abrir | Sobrou um arquivo antigo no projeto. Deixe só o `Código.gs` (e o `appsscript.json`). |
| A página continua igual à versão antiga | A implantação não foi atualizada (passo B4). Depois de atualizar, recarregue com <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>. |
| *"Nenhuma planilha vinculada ao script"* (quem veio do visualizador com outra planilha) | Crie a propriedade do script `SPREADSHEET_ID` com o ID guardado no passo A1. |
| *Senha incorreta* ao importar ou salvar a planta | A senha do *Desenvolvedor* mudou desde que você entrou: use *Sair do desenvolvedor* e entre de novo. |
| Ninguém lembra a senha do Desenvolvedor trocada no app | Na planilha, apague a linha `senhas` da aba *Config do app*: voltam as senhas do código. |
| A página fica em branco | Veja o erro em **Execuções** (menu da esquerda do Apps Script). Normalmente o arquivo não foi colado inteiro: copie e cole de novo. |
| Os movimentos aparecem como *Sem classificação* | Confira o nome exato da aba (`Tipos de movimento`), o nome do ciclo e se o texto é igual ao da etiqueta. Depois clique em **Atualizar**. |
| O convite do tutorial não aparece | Ele aparece só uma vez por navegador. Abra pela **engrenagem › Ver o tutorial**. |
| Quero voltar para a versão anterior | Em **Gerenciar implantações › lápis**, escolha a versão anterior em *Versão*. Ou use a cópia de segurança do passo 2. |

---

## Instalação do zero (para outra pessoa ou outra planilha)

1. **Planilha:** use uma planilha em branco. O app cria as abas.
2. Na planilha, vá em **Extensões › Apps Script**. Apague o conteúdo do `Código.gs`, cole `App completo - Plano de Varejo.gs` e salve.
3. Vá em **Implantar › Nova implantação**, clique na engrenagem e escolha **App da Web**. Em *Executar como*, escolha **Eu**. Em *Quem pode acessar*, escolha quem vai usar. Clique em **Implantar** e autorize.
4. Recarregue a planilha e use **Plano de Varejo › Configurar planilha**. Isso cria as abas *Layout*, *Movimentos*, *Painéis* e *Tipos de movimento* (sem ciclos: o primeiro entra pelo *Importar planilha* ou pela *Construção*).
5. Abra o link do App da Web.

Estes arquivos são gerados a partir da pasta `src/` com `npm run build:instalacao`. Não edite os `.gs` desta pasta à mão: mude `src/` e gere de novo.
