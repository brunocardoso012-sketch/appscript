# Plano de Varejo · Visualizador de Plantas

App em **Google Apps Script** que desenha as plantas da loja em 3D isométrico, no formato de slide (16:9), com cada móvel pintado pela cor da marca. Tudo vem de uma planilha: é só trocar o **ciclo** no seletor que as cores e os textos mudam.

![Exemplo — Planta 02](docs/exemplo-planta-02.png)

| Cor | Marca | Código na planilha |
|---|---|---|
| verde | Boticário | `BOT` |
| rosa | Quem disse, berenice? | `QDB` |
| roxo | Eudora | `EUD` |
| vermelho | O.U.i | `OUI` |
| azul | Multimarca | `MULTI` |
| branco | Sem marca / sem movimento | `NEUTRO` (ou vazio) |

## O que ele faz

- **Seletor de ciclo e abas por planta** (PLANTA 01…04). As setas ← → do teclado trocam de planta.
- **Móveis coloridos pela marca**, com as etiquetas (caixas de texto) de cada móvel, os símbolos ▶ ◆ Ⓔ e NEW, as caixas de destaque que apontam para um móvel, a lateral TV/rádio, (A), (C), as notas e a faixa Cestinhas / Espaço da Beleza / Cavalete.
- **Botão "Baixar planilha base"**: gera um `.xlsx` com uma linha por móvel de cada planta, listas suspensas e cores por marca. Pode vir em branco ou já preenchido com um ciclo existente, para servir de ponto de partida do próximo.
- **Botão "Importar planilha"**: lê o `.xlsx` preenchido, grava no Google Sheets e já mostra o ciclo importado.
- **Filtro por marca**: clique numa marca da legenda para destacar só os móveis dela.
- **Baixar PNG** em 3840×2160, pronto para colar na apresentação.
- **Ajustar etiquetas**: as etiquetas se afastam sozinhas para não se sobrepor. Se quiser outra posição, arraste e clique em *Salvar posições*.

## Versão web para testes (netli.fyi / Netlify)

Para ver e ajustar o visualizador **sem o Apps Script**, use [`site/index.html`](site/index.html): é um arquivo único, com o mesmo código, que guarda os dados no próprio navegador.

1. Baixe `site/index.html` e coloque numa pasta. O nome precisa continuar `index.html`.
2. Arraste a pasta para o [netli.fyi](https://netli.fyi) (ou para o Netlify Drop). Também abre com duplo clique, direto no navegador.
3. Use normalmente: trocar ciclo, baixar a planilha base, importar, PNG e ajustar etiquetas.

Para **ajustar a planta** (posição e tamanho dos móveis):

1. Em *Baixar planilha base*, marque **Incluir aba Layout**.
2. Mude X, Y, Largura, Profundidade e Altura no Excel e importe. As plantas presentes na aba são substituídas por inteiro.
3. Quando estiver tudo certo, baixe a planilha com a aba Layout e importe na versão Apps Script. O Apps Script aceita o mesmo arquivo.

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
| **Planta** | `01`, `02`… ou `TODAS` (vale para todas as plantas que têm o móvel; a linha da planta específica tem prioridade). |
| **ID Móvel** | Liga a linha ao desenho. **Não altere**, deve existir na aba Layout. |
| Móvel (referência) | Só para orientação (ex.: *Ilha central – Botik*). |
| **Marca do Móvel** | Cor do móvel: `BOT`, `QDB`, `EUD`, `OUI`, `MULTI`, `NEUTRO`. Aceita combinação (`BOT+QDB` gera degradê) ou cor livre (`#FF8800`). |
| Etiqueta 1…4 | Texto de cada caixinha. Quebra de linha na célula (Alt+Enter) vira quebra na etiqueta. |
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
| **Tipo** | `LOJA` (piso + paredes: Largura × Profundidade × altura da parede), `GONDOLA_PAREDE`, `GONDOLA`, `PIRAMIDE`, `CUBO`, `MESA`, `TOTEM`, `PAINEL`, `VITRINE_L`, `CAIXA`, `EXTRA` (item da faixa inferior direita, sem posição). |
| X, Y, Elevação (Z) | Posição do canto do móvel mais próximo do fundo da loja (1 unidade ≈ 0,5 m). |
| Largura (eixo X), Profundidade (eixo Y), Altura | Tamanho. |
| Ajuste Etiqueta X / Y (px) | Preenchidos pelo botão *Salvar posições*. Zere para voltar ao posicionamento automático. |

O layout que vem pronto é uma **aproximação** das 4 plantas de referência. Ajuste as coordenadas na aba Layout e clique em **Atualizar** para ver o resultado.

## Personalização

- **Cores e marcas:** `MARCAS` em [`src/Config.gs`](src/Config.gs). Cada marca tem a cor da etiqueta, a cor do móvel e apelidos aceitos na planilha. Uma marca nova aparece sozinha na legenda, nas listas suspensas e na planilha base.
- **Quantidade de etiquetas por móvel:** `CONFIG.MAX_ETIQUETAS` (padrão 4).
- **Nomes das abas:** `CONFIG.ABAS`.
- **Menu Plano de Varejo › Restaurar layout padrão** recria a aba Layout a partir de [`src/Layouts.gs`](src/Layouts.gs).

## Estrutura do código

```
src/
  appsscript.json   manifesto (fuso, V8, App da Web)
  Config.gs         marcas/cores, símbolos, seções, tipos, colunas das abas
  Code.gs           doGet, menu, getDados, importarPlanilha, salvarAjustesEtiquetas…
  Layouts.gs        layout padrão das 4 plantas + ciclo de exemplo
  Index.html        página (inclui os arquivos abaixo)
  Styles.html       estilos
  Render.html       desenho isométrico em SVG (slide 1920×1080)
  Planilha.html     gerar/ler .xlsx no navegador (ExcelJS via cdnjs, com SRI)
  App.html          estado da tela, botões e chamadas ao servidor
web/
  backend-local.js  troca o google.script.run por localStorage (versão web)
site/
  index.html        versão web gerada (arquivo único, para netli.fyi / Netlify)
dev/
  gas.js            carrega os .gs no Node + planilha em memória (SpreadsheetApp simulado)
  testes.test.js    testes do backend
  build-web.js      gera site/index.html a partir de src/ + web/
```

Para desenvolver (Node 18+):

```bash
npm test            # testes do backend (sem Apps Script)
npm run build:web   # gera site/index.html (versão web)
```

## Observações

- A planilha base é gerada e lida **no navegador** (biblioteca ExcelJS, carregada do cdnjs na primeira vez que for usada). É preciso ter acesso à internet.
- Se o download não iniciar dentro da planilha (janela do menu), abra pela URL do App da Web.
- O PNG usa a fonte Arial, para ficar igual em qualquer computador.
