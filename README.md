# Plano de Varejo · Visualizador de Plantas

App em **Google Apps Script** que desenha as plantas da loja em 3D isométrico, no formato de slide (16:9), com cada móvel pintado pela cor da marca. Tudo vem de uma planilha: é só trocar o **ciclo** no seletor que as cores e os textos mudam.

![Exemplo — ER M (planta 02)](docs/exemplo-planta-02.png)

| Cor | Marca | Código na planilha |
|---|---|---|
| verde | Boticário | `BOT` |
| rosa | Quem disse, berenice? | `QDB` |
| roxo | Eudora | `EUD` |
| vermelho | O.U.i | `OUI` |
| azul | Multimarca | `MULTI` |
| branco | Sem marca / sem movimento | `NEUTRO` (ou vazio) |

## O que ele faz

- **Seletor de ciclo e abas por planta** (ER P, ER M, ER G e ER GG = plantas 01 a 04). As setas ← → do teclado trocam de planta.
- **Móveis coloridos pela marca**, com as etiquetas (caixas de texto) de cada móvel, os símbolos ▶ ◆ Ⓔ e NEW, as caixas de destaque que apontam para um móvel, a lateral TV/rádio, (A), (C), as notas e a faixa Cestinhas / Espaço da Beleza / Cavalete.
- **Botão "Baixar planilha base"**: gera um `.xlsx` com uma linha por móvel de cada planta, listas suspensas e cores por marca. Pode vir em branco ou já preenchido com um ciclo existente, para servir de ponto de partida do próximo.
- **Botão "Importar planilha"**: lê o `.xlsx` preenchido, grava no Google Sheets e já mostra o ciclo importado.
- **Filtro por marca**: clique numa marca da legenda para destacar só os móveis dela.
- **Baixar PNG** em 3840×2160, pronto para colar na apresentação.
- **Ajustar etiquetas**: as etiquetas se afastam sozinhas para não se sobrepor. Se quiser outra posição, arraste e clique em *Salvar posições*. As etiquetas de uma gôndola movem juntas.

## Construir loja (editor do layout)

Clique em **Construir loja** para abrir o editor ao lado da planta. A planta **abre com o modelo atual** (os móveis salvos dela), pronta para editar; trocar de planta no editor também abre o modelo daquela planta. Fechar sem salvar não apaga nada; ao clicar em **Salvar planta**, o layout passa a ser o que está na tela.

| Para… | Faça |
|---|---|
| Adicionar um móvel | Clique no móvel na paleta (Gôndola, Pirâmide, Móvel de fila, Móvel de parede, Totem, PDV móvel, Mesa destaque, Mesa destaque 3 frentes, Balcão recepção, Móvel de atendimento, Parede O.U.i, Totem O.U.i, Ilha premium O.U.i, Móvel make). Ele aparece no centro da loja, já selecionado, com ID automático. |
| Selecionar | Clique no móvel: ele fica com contorno laranja. Clique no piso vazio ou aperte <kbd>Esc</kbd> para desmarcar. |
| Mover | Arraste o móvel (segure <kbd>Alt</kbd> para mover fino) ou use as setas (→ +X, ↓ +Y; <kbd>Shift</kbd> = 5×). No celular/tablet, arrastar um móvel não rola a página; para rolar, deslize no piso vazio ou fora da planta. |
| Girar / duplicar / excluir | Use a barra preta que aparece sobre o móvel, ou <kbd>R</kbd>, <kbd>Ctrl</kbd>+<kbd>D</kbd> e <kbd>Delete</kbd>. Girar troca largura e fundo; no balcão recepção, muda o canto do L (4 posições). |
| Mudar nome, tipo, tamanho | Edite no painel, em **Móvel selecionado**. ID e elevação ficam em *Mais opções*. |
| Voltar atrás | **Desfazer** ou <kbd>Ctrl</kbd>+<kbd>Z</kbd>. Desfaz uma ação por vez, inclusive exclusões. |
| Guardar | **Salvar planta** (aba Layout no Apps Script; navegador na versão web). O rodapé mostra se há alterações não salvas. |

### Os móveis

| Móvel | Como é desenhado | Na planilha |
|---|---|---|
| **Gôndola** (`GON-…`) | 4 espaços: **Ponta 1**, **Meio A**, **Meio B** e **Ponta 2**, com 4 níveis de prateleira. Cada meio pode ser dividido em dois (*Dividir o meio A/B em dois*). | Uma linha para a gôndola inteira (`GON-01`) e uma por espaço: `GON-01/PONTA-1`, `GON-01/MEIO-A` (ou `MEIO-A-1` e `MEIO-A-2` quando dividido), `GON-01/MEIO-B`, `GON-01/PONTA-2`. O espaço preenchido tem cor e etiqueta próprias; o espaço vazio usa a linha da gôndola inteira. Para deixar um espaço branco, use `NEUTRO`. **Uma etiqueta por bloco:** na linha da gôndola inteira, Etiqueta 1 = Ponta 1, 2 = Meio A, 3 = Meio B e 4 = Ponta 2; a Etiqueta 1 da linha de um espaço substitui a daquele bloco. |
| **Pirâmide** (`PIR-…`) | 4 blocos iguais, um em cima do outro (padrão 1,02 × 1,02 × 1,94). | Uma linha, **1 etiqueta**. |
| **Móvel de fila** (`FILA-…`) | Bloco único retangular com 3 níveis (padrão 1,5 × 0,4 × 1,46). | Uma linha. |
| **Móvel de parede** (`PAR-…`) | Estante encostada na parede, com prateleiras (padrão 4 × 1,1 × 3,2). | Uma linha. |
| **Totem** (`TOTEM-…`) | Estrutura metálica (base, montantes e travessa), tela perfurada embaixo e 3 painéis na cor da marca. | Uma linha. |
| **PDV móvel** (`PDV-…`) | Cubo de vidro sobre rodapé escuro (padrão 1,3 × 1,3 × 1,44). | Uma linha. |
| **Mesa destaque** (`MESA-…`) | Estrutura com pernas, 2 nichos baixos lado a lado em cima, painel de vidro de duas lâminas ao fundo e 2 cartazes na frente, da largura das lâminas do fundo, subindo do chão até o topo dos nichos. | Uma linha, **1 etiqueta**. |
| **Mesa destaque 3 frentes** (`MESA3-…`) | Estrutura com pernas, 3 nichos baixos em cima (mesma altura dos da mesa destaque), painel de 3 lâminas ao fundo e 3 cartazes na frente, iguais aos da mesa destaque (padrão 3,9 × 1,4 × 2,6). | Uma linha. |
| **Balcão recepção** (`BALCAO-…`) | Balcão de vidro em L com os dois lados sempre do mesmo tamanho (mudar um muda o outro); 2 níveis; padrão 2,4 × 2,4 × 1,28. *Girar* muda o canto do L. | Uma linha. |
| **Móvel de atendimento** (`CX-…`) | Balcão com a telinha preta em cima, no lado do fundo (padrão 1,8 × 1,2 × 1,7). | Uma linha. |
| **Parede O.U.i** (`OUI-…`) | Painel alto com moldura, para a parede (padrão 3,6 × 0,9 × 5). | Uma linha. |
| **Totem O.U.i** (`OUI-…`) | Expositor de base quadrada com moldura, na altura da gôndola (padrão 0,8 × 0,8 × 1,94). | Uma linha. |
| **Ilha premium O.U.i** (`ILHAOUI-…`) | Base com prateleiras e, centralizado em cima dela, painel alto com duas faixas verticais mais claras nas laterais (padrão 3 × 1,6 × 3). | Uma linha. |
| **Móvel make** (`MAKE-…`) | Estante de parede com painel de fundo, montantes nas pontas, base com rodapé escuro, 5 prateleiras com a fileira de produtos na borda e **4 testeiras** no alto; o fundo fica do lado da parede (padrão 6 × 1,4 × 3,2). | Uma linha para o móvel e uma por testeira (`MAKE-01/TESTEIRA-1` … `TESTEIRA-4`), como nos espaços da gôndola: a testeira com linha própria usa a cor (e a Etiqueta 1) dela; sem linha, usa a do móvel. |

O Meio A é o lado voltado para quem olha a planta; a Ponta 1 fica no lado do fundo da loja. A gôndola tem por padrão a mesma altura da pirâmide (1,94).

Durante a construção, os móveis aparecem **sem cor e sem etiquetas**, para o foco ficar no layout. Para conferir com o ciclo, marque *Mostrar cores e etiquetas do ciclo* em **Exibição e encaixe**.

Seções recolhidas no painel:

- **Lista de móveis:** para achar um móvel escondido atrás de outro, ou os itens "Extra", que ficam fora da planta.
- **Tamanho da loja e plantas:** largura, fundo e altura das paredes; **+ Criar nova planta**.
- **Imagem de referência:** coloque a tela original da planta por cima, semitransparente, para "decalcar". Ajuste transparência, zoom e posição até alinhar.
- **Exibição e encaixe:** grade numerada no piso, mostrar ou não as cores do ciclo, e o passo do arraste.

**Baixar código da loja** gera `layout-plantas-AAAA-MM-DD.json` com o layout de todas as plantas, no mesmo formato de [`src/Layouts.gs`](src/Layouts.gs). Mande esse arquivo para virar o layout padrão do projeto. **Carregar código…** aplica um arquivo desses de volta.

## Versão web para testes (netli.fyi / Netlify)

Para ver e ajustar o visualizador **sem o Apps Script**, use [`index.html`](index.html) (na raiz do projeto): é um arquivo único, com o mesmo código, que guarda os dados no próprio navegador.

1. Baixe o `index.html` da raiz (ou o projeto inteiro). O nome precisa continuar `index.html`.
2. Arraste a pasta (ou o projeto inteiro) para o [netli.fyi](https://netli.fyi) (ou para o Netlify Drop). Também abre com duplo clique, direto no navegador.
3. Use normalmente: trocar ciclo, baixar a planilha base, importar, PNG e ajustar etiquetas.

Para **ajustar a planta** (posição e tamanho dos móveis):

1. Em *Baixar planilha base*, marque **Incluir aba Layout**.
2. Mude X, Y, Largura, Profundidade e Altura no Excel e importe. As plantas presentes na aba são substituídas por inteiro.
3. Quando estiver tudo certo, baixe a planilha com a aba Layout e importe na versão Apps Script. O Apps Script aceita o mesmo arquivo.

Quando o modelo base de uma planta muda no código (`VERSAO_MODELO_PLANTAS` em [`src/Layouts.gs`](src/Layouts.gs)), essa planta e as linhas dela no *Ciclo exemplo* são atualizadas sozinhas na próxima abertura, na versão web e no Apps Script. As outras plantas e os outros ciclos não mudam.

Na versão web os dados ficam só naquele navegador. Para levar a outro computador, baixe a planilha (com Layout) e importe lá. O botão **Restaurar exemplo** volta ao ciclo de exemplo.

Depois de alterar algo em `src/`, gere o arquivo de novo com `npm run build:web`.


### Opção A — copiar e colar (não precisa instalar nada)

1. Crie uma planilha no Google Sheets (ex.: *Plano de Varejo – Plantas*).
2. Menu **Extensões › Apps Script**.
3. Em **Configurações do projeto** (ícone de engrenagem), marque *Mostrar arquivo de manifesto "appsscript.json" no editor*. Volte ao **Editor** e cole o conteúdo de [`src/appsscript.json`](src/appsscript.json).
4. Crie os arquivos abaixo (botão **+**) **com estes nomes exatos** e cole o conteúdo de cada um. O arquivo `Código.gs` que já vem no projeto pode ser renomeado para `Code` ou apagado.

   | Tipo no editor | Nome | Conteúdo |
   |---|---|---|
   | Script | `Code` | [`src/Code.gs`](src/Code.gs) |
   | Script | `Config` | [`src/Config.gs`](src/Config.gs) |
   | Script | `Layouts` | [`src/Layouts.gs`](src/Layouts.gs) |
   | HTML | `Index` | [`src/Index.html`](src/Index.html) |
   | HTML | `Styles` | [`src/Styles.html`](src/Styles.html) |
   | HTML | `Render` | [`src/Render.html`](src/Render.html) |
   | HTML | `Planilha` | [`src/Planilha.html`](src/Planilha.html) |
   | HTML | `Construtor` | [`src/Construtor.html`](src/Construtor.html) |
   | HTML | `App` | [`src/App.html`](src/App.html) |

5. Salve, volte para a planilha e recarregue a página. Vai aparecer o menu **Plano de Varejo**. Clique em **Configurar planilha (criar abas que faltam)** e autorize o script. Ele cria as abas `Layout`, `Movimentos` e `Painéis` com o layout das 4 plantas e um *Ciclo exemplo*.
6. Para abrir: menu **Plano de Varejo › Abrir visualizador**, ou publique como site (próximo passo).
7. **Publicar para a diretoria:** no Apps Script, **Implantar › Nova implantação › App da Web**
   - *Executar como:* **Eu**
   - *Quem pode acessar:* **Qualquer pessoa em \<sua empresa\>** (ou só as pessoas certas)
   - Copie a URL gerada e compartilhe.

   Quando mudar o código: **Implantar › Gerenciar implantações › ✏️ › Versão: Nova versão**. A URL continua a mesma.

> Quem acessa a URL pode importar planilhas e salvar posições de etiquetas (o app grava na planilha em nome de quem publicou). Libere o acesso só para quem pode editar o plano.

### Opção B — `clasp` (linha de comando)

```bash
npm install -g @google/clasp
clasp login
cp .clasp.json.example .clasp.json   # cole o "ID do script" (Configurações do projeto)
clasp push                           # envia a pasta src/
```

Depois siga os passos 5 a 7 acima.

## Como usar a cada ciclo

1. No visualizador, selecione o ciclo atual e clique em **Baixar planilha base**.
   - *Nome do ciclo na planilha:* por exemplo `C15/2026`.
   - *Conteúdo:* **Copiar o ciclo selecionado**, para partir do ciclo anterior, ou **Em branco**.
2. Abra o `.xlsx` (Excel ou Google Sheets) e altere as marcas e etiquetas dos móveis que mudam.
3. Clique em **Importar planilha** e escolha o arquivo. O ciclo novo aparece no seletor.

Também dá para editar direto nas abas do Google Sheets e clicar em **Atualizar** no visualizador.

**Regra da importação:** para cada par *Ciclo + Planta* presente no arquivo, as linhas antigas desse par são substituídas. Os outros ciclos e as outras plantas não são alterados.

## Formato da planilha

### Aba `Movimentos` — o que muda a cada ciclo

| Coluna | O que é |
|---|---|
| **Ciclo** | Nome do ciclo (ex.: `C15/2026`). Aparece no seletor. |
| **Planta** | Nome da planta (`ER P`, `ER M`, `ER G`, `ER GG`), o número dela (`01`…`04`) ou `TODAS` (vale para todas as plantas que têm o móvel; a linha da planta específica tem prioridade). A planilha base vem com o nome. |
| **ID Móvel** | Liga a linha ao desenho. **Não altere**, deve existir na aba Layout. |
| Móvel (referência) | Só para orientação (ex.: *Ilha central – Botik*). |
| **Marca do Móvel** | Cor do móvel: `BOT`, `QDB`, `EUD`, `OUI`, `MULTI`, `NEUTRO`. Aceita combinação (`BOT+QDB` gera degradê) ou cor livre (`#FF8800`). |
| Etiqueta 1…4 | Texto de cada caixinha. Quebra de linha na célula (Alt+Enter) vira quebra na etiqueta. Pirâmide e mesa destaque mostram só a primeira; na gôndola, cada etiqueta vai para um bloco (ver *Os móveis*). Na planilha base, as colunas que não aparecem na planta ficam cinza. |
| Marca Etiqueta 1…4 | Cor de cada etiqueta. Se vazio, usa a cor do móvel. |
| Símbolo | `MOVIMENTO` (▶), `FIXO` (◆), `EXPOSICAO` (Ⓔ), `NOVO` (selo NEW). |
| Observação | Aparece ao passar o mouse sobre o móvel. |

Um móvel sem linha no ciclo, ou sem marca, aparece **branco (neutro)**.

### Aba `Painéis` — textos fora dos móveis

| Coluna | O que é |
|---|---|
| Ciclo, Planta | Igual à aba Movimentos (`TODAS` vale para todas). Para cada seção, as linhas da planta específica substituem as de `TODAS`. |
| **Seção** | `TV` (lista ao lado dos ícones de TV/rádio), `A`, `C`, `CALLOUT` (caixa de destaque sobre a planta) ou `NOTA` (caixa no canto inferior esquerdo; o trecho antes de `:` fica em negrito). |
| Texto | O conteúdo. Pode ter várias linhas. |
| Marca | Cor da caixa. |
| Aponta para (ID Móvel) | Só para `CALLOUT`: desenha uma linha-guia até esse móvel. |

### Aba `Layout` — a planta em si (muda raramente)

Cada linha é um móvel de uma planta. **Para criar uma planta nova, basta acrescentar linhas aqui** (uma linha `LOJA` com o tamanho da loja + os móveis). Não precisa mexer em código.

```
                (0,0)  ← canto do fundo (topo do desenho)
               /     \
   parede     /       \   parede do fundo
   esquerda  /         \  (direita)
   (eixo Y) ↙           ↘ (eixo X)
            \           /
             \  frente /
              \       /
```

| Coluna | O que é |
|---|---|
| Planta, ID Móvel, Móvel (descrição) | Identificação. |
| **Tipo** | `LOJA` (piso + paredes: Largura × Profundidade × altura da parede), `GONDOLA`, `PIRAMIDE`, `FILA`, `TOTEM`, `CUBO` (PDV móvel), `MESA` (mesa destaque), `MESA_3` (mesa destaque 3 frentes), `GONDOLA_PAREDE` (móvel de parede), `VITRINE_L` (balcão recepção), `CAIXA` (móvel de atendimento), `PAINEL` (parede O.U.i), `EXPOSITOR_OUI` (totem O.U.i), `ILHA_OUI` (ilha premium O.U.i), `MAKE` (móvel make), `EXTRA` (item da faixa inferior direita, sem posição). |
| Meios divididos | Só para gôndola: vazio, `A`, `B` ou `AB`. |
| Giro (graus) | Só para o balcão recepção: `0`, `90`, `180` ou `270` (canto do L). Preenchido pelo *Girar* do Construir loja. |
| X, Y, Elevação (Z) | Posição do canto do móvel mais próximo do fundo da loja (1 unidade ≈ 0,5 m). |
| Largura (eixo X), Profundidade (eixo Y), Altura | Tamanho. |
| Ajuste Etiqueta X / Y (px) | Preenchidos pelo botão *Salvar posições*. Zere para voltar ao posicionamento automático. |

As quatro plantas (**ER P, ER M, ER G e ER GG**) vêm com os layouts montados no modo Construir loja. Ajuste as coordenadas na aba Layout e clique em **Atualizar** para ver o resultado.

## Personalização

- **Cores e marcas:** `MARCAS` em [`src/Config.gs`](src/Config.gs). Cada marca tem a cor da etiqueta, a cor do móvel e apelidos aceitos na planilha. Uma marca nova aparece sozinha na legenda, nas listas suspensas e na planilha base.
- **Quantidade de etiquetas por móvel:** `CONFIG.MAX_ETIQUETAS` (padrão 4); por tipo de móvel, `ETIQUETAS_POR_TIPO` (pirâmide 1, mesa destaque 1, gôndola 1 por bloco).
- **Nomes das plantas:** `NOMES_PLANTAS` (01 = ER P, 02 = ER M, 03 = ER G, 04 = ER GG). Planta sem nome aparece como *PLANTA 05*.
- **Nomes das abas:** `CONFIG.ABAS`.
- **Menu Plano de Varejo › Restaurar layout padrão** recria a aba Layout a partir de [`src/Layouts.gs`](src/Layouts.gs).

## Estrutura do código

```
src/
  appsscript.json   manifesto (fuso, V8, App da Web)
  Config.gs         marcas/cores, símbolos, seções, tipos, colunas das abas
  Code.gs           doGet, menu, getDados, importarPlanilha, salvarLayout, salvarAjustesEtiquetas…
  Layouts.gs        layout padrão das 4 plantas + ciclo de exemplo
  Index.html        página (inclui os arquivos abaixo)
  Styles.html       estilos
  Render.html       desenho isométrico em SVG (slide 1920×1080)
  Planilha.html     gerar/ler .xlsx no navegador (ExcelJS via cdnjs, com SRI)
  Construtor.html   modo "Construir loja" (editor visual do layout)
  App.html          estado da tela, botões e chamadas ao servidor
index.html          versão web gerada (netli.fyi / Netlify)
netlify.toml        publicação estática a partir da raiz
web/
  backend-local.js  troca o google.script.run por localStorage (versão web)
dev/
  gas.js            carrega os .gs no Node + planilha em memória (SpreadsheetApp simulado)
  testes.test.js    testes do backend
  build-web.js      gera index.html (raiz) a partir de src/ + web/
```

Para desenvolver (Node 18+):

```bash
npm test            # testes do backend (sem Apps Script)
npm run build:web   # gera index.html na raiz (versão web)
```

## Observações

- A planilha base é gerada e lida **no navegador** (biblioteca ExcelJS, carregada do cdnjs na primeira vez que for usada). É preciso ter acesso à internet.
- Se o download não iniciar dentro da planilha (janela do menu), abra pela URL do App da Web.
- O PNG usa a fonte Arial, para ficar igual em qualquer computador.
