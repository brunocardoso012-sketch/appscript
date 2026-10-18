# Plano de Varejo · Guia de instalação e atualização no Apps Script

Este guia é para quem **já usa o app no Apps Script e já tem a planilha com os ciclos**. A atualização troca só o código: **a sua planilha e os seus ciclos continuam como estão**. O único acréscimo na planilha é uma aba nova, opcional, chamada **Tipos de movimento**.

## Arquivos desta pasta

| Arquivo | Para quê |
|---|---|
| `Visualizador - Plano de Varejo.gs` | O **visualizador** (só visualização) inteiro num arquivo. |
| `App completo - Plano de Varejo.gs` | O **app completo** (com *Construir loja*, *Baixar planilha base* e *Importar planilha*) inteiro num arquivo. |
| `appsscript.json` | O manifesto do projeto. Normalmente você **não** precisa mexer nele. |

Você vai usar **só um** dos dois arquivos `.gs`: o da versão que já usa (passo 1).

> **Já tem *Comunicações ER* e *Espaço por marca* no topo do app?** Então falta só a atualização do **Analytics**: use o passo a passo curto em [ATUALIZAÇÃO ANALYTICS - PASSO A PASSO.md](ATUALIZA%C3%87%C3%83O%20ANALYTICS%20-%20PASSO%20A%20PASSO.md).

> Para abrir um `.gs` no computador e copiar o conteúdo: abra com o Bloco de Notas (Windows) ou o TextEdit (Mac), ou abra o arquivo no GitHub e clique em **Raw**. Depois use <kbd>Ctrl</kbd>+<kbd>A</kbd> e <kbd>Ctrl</kbd>+<kbd>C</kbd> (no Mac, <kbd>Cmd</kbd>).

---

## O que muda para quem usa o app

- **Analytics** (no lugar do antigo *Espaço por marca*): um dashboard do ciclo que compara as ERs — números principais, insights rápidos, o mapa movimento × ER, as marcas e as classificações em cada ER e o GMV esperado × espaço. Clicar numa célula ou num insight mostra na planta daquela ER só onde o movimento aparece.
- **Aba nova na planilha, "Tipos de movimento":** nela você informa a classificação (lançamento, promoção…) e o GMV esperado de cada movimento.
- **Topo reorganizado:** *Comunicações ER* e *Analytics* ficam em destaque. *Validação*, *Ajustar etiquetas* e *Ver o tutorial* ficam na engrenagem. *Baixar PNG* fica no canto de baixo da planta.
- **Ajustar etiquetas:** cada pilha de etiquetas se move sozinha, e dá para mudar o tamanho das etiquetas.
- **Baixar PNG:** escolha o conteúdo (planta, visão simplificada ou **estratégia**, que é o espaço da ER em gráficos) e o formato (PNG recortado ou slide completo).
- **Tutorial guiado:** quem abre o app pela primeira vez recebe um convite para um tour de cerca de 2 minutos.
- **Montar um ciclo novo no app:** com o login da validação, o construtor da estratégia cria um ciclo (em branco ou copiando outro) e preenche os espaços, as Comunicações ER e os Tipos de movimento direto na planta. O validador aprova (o ciclo entra nas abas *Movimentos*, *Painéis* e *Tipos de movimento*) ou devolve com um comentário. Enquanto não é aprovado, o ciclo fica em quatro abas novas, criadas sozinhas na primeira vez: *Rascunhos*, *Rascunho Movimentos*, *Rascunho Painéis* e *Rascunho Tipos*. Não apague essas abas nem mexa nelas à mão.

---

## Passo 1 · Descubra qual versão você usa

Abra a planilha e vá em **Extensões › Apps Script**. Olhe a lista de arquivos à esquerda.

| Se você vê… | Você usa o… | Siga |
|---|---|---|
| Só **um** arquivo `Código.gs` (no fim dele há `const PAGINA_ = [`) | Visualizador, em arquivo único | **Parte A** |
| `Código.gs` (ou `Codigo.gs`) **e** um `Index.html` | Visualizador, em arquivos separados | **Parte A** |
| Vários arquivos: `Code`, `Config`, `Dados`, `Layouts`, `Validacao`, `Index`, `Styles`, `Render`, `App`… | App completo | **Parte B** |

Outra pista é a tela do app: se ela tem o botão **Construir loja**, é o app completo. Se não tem, é o visualizador.

## Passo 2 · Faça uma cópia de segurança (2 minutos)

1. Na planilha, vá em **Arquivo › Fazer uma cópia**. A cópia leva junto a planilha **e** o script. Dê um nome como *Plano de Varejo – backup AAAA-MM-DD*.
2. No Apps Script, vá em **Implantar › Gerenciar implantações** e **anote o link** da implantação ativa (App da Web). É esse link que as pessoas usam, e ele vai continuar o mesmo.

Se algo der errado, a cópia tem tudo como estava antes.

---

## Parte A · Atualizar o **visualizador**

O visualizador lê a planilha e grava só os comentários da validação (aba *Comentários*) e os ciclos montados no app (abas *Rascunho…*; quando o validador aprova, o ciclo entra nas abas *Movimentos*, *Painéis* e *Tipos de movimento*). Ao atualizar, nada da planilha muda, e as posições das etiquetas que você já salvou também ficam.

### A1. Guarde o link da planilha, se ele estiver no código

Abra o `Código.gs` atual e procure, logo no começo:

```js
const VISUALIZADOR = {
  PLANILHA: '',
```

- Se estiver vazio (`''`), o script está ligado à própria planilha. Não precisa fazer nada.
- Se tiver um link ou ID entre as aspas, **copie e guarde** esse texto. Você vai colar de novo no passo A3.

### A2. Apague o `Index.html`, se ele existir

Se o projeto tem um arquivo `Index.html`, passe o mouse sobre ele, clique nos **⋮** e escolha **Excluir**. O arquivo novo já traz a página dentro dele.

Apague também qualquer outro `.gs` que não seja o `Código.gs`, se houver. Mantenha só o **`Código.gs`** e o **`appsscript.json`** (se este aparecer).

### A3. Cole o código novo

1. Abra o `Código.gs`, use <kbd>Ctrl</kbd>+<kbd>A</kbd> e apague tudo.
2. Cole **o conteúdo inteiro** de `Visualizador - Plano de Varejo.gs`.
3. Se você guardou um link no passo A1, cole-o de volta em `PLANILHA: '…'`.
4. Salve com <kbd>Ctrl</kbd>+<kbd>S</kbd> ou no ícone de disquete. Não deve aparecer nenhuma mensagem de erro em vermelho.

### A4. Teste antes de publicar (opcional, recomendado)

Vá em **Implantar › Testar implantações**, copie o link **App da Web** (termina em `/dev`) e abra-o. Esse link mostra o código salvo agora, antes de publicar. Confira se a planta abre e se os ciclos aparecem.

### A5. Publique a nova versão (o link continua o mesmo)

1. Vá em **Implantar › Gerenciar implantações**.
2. Clique no **lápis** (Editar) da implantação ativa.
3. Em **Versão**, escolha **Nova versão** e clique em **Implantar**.

> ⚠️ **Não** use *Nova implantação*: ela cria um link novo, e quem usa o link antigo continuaria vendo a versão anterior.

Se o Google pedir autorização, autorize com a mesma conta de sempre.

### A6. Crie a aba "Tipos de movimento" (opcional)

Sem esta aba o app funciona normalmente, e os movimentos aparecem como *Sem classificação*. Para mostrar a classificação e o GMV:

1. Na planilha, clique no **+** (no canto de baixo à esquerda) e dê à aba o nome exato **`Tipos de movimento`**.
2. Clique na célula **A1** e cole a linha abaixo. Ela já se divide nas 5 colunas.

   ```
   Ciclo	Movimento (etiqueta)	Classificação	GMV esperado (R$)	Observação
   ```

3. Preencha uma linha por movimento do ciclo:
   - **Ciclo:** o mesmo nome usado na aba *Movimentos* (ex.: `C15/2026`).
   - **Movimento (etiqueta):** o texto da etiqueta, igual ao da aba *Movimentos* (ex.: `LÇTO EGEO`). Maiúsculas e espaços a mais não importam.
   - **Classificação:** `Lançamento`, `Promoção`, `Liquidação / outlet`, `Institucional / portfólio` ou `Outro`. Também aceita outro texto, que vira uma classificação própria.
   - **GMV esperado (R$):** um número, como `1500000`, `R$ 1.500.000,00`, `1,5 mi` ou `250 mil`.
   - **Observação:** opcional. Aparece ao passar o mouse no painel.
4. (Opcional) Crie uma lista suspensa na coluna C: selecione a coluna, vá em **Dados › Validação de dados › Adicionar regra › Menu suspenso** e cadastre as 5 classificações acima.
5. (Opcional) Formate a coluna D como moeda: selecione a coluna e vá em **Formatar › Número › Moeda**.
6. No app, clique em **Atualizar**.

Para um ciclo novo, copie as linhas do ciclo anterior (nesta aba e em *Movimentos* e *Painéis*), cole no fim e troque o nome do ciclo.

Se o app mostrar o aviso *"X" não aparece em nenhuma etiqueta do ciclo*, o texto da etiqueta nesta aba está diferente do texto da aba *Movimentos*.

### A7. Gôndola 3 da ER G nos seus ciclos

No *Ciclo exemplo*, o Lado A e o Meio A da Gôndola 3 (ER G) passaram a repetir o Lado B e o Meio B da Gôndola 2 da ER M. Como o visualizador lê os ciclos direto da sua planilha, faça isso nos **seus** ciclos, na aba *Movimentos*:

- linha **ER G · `GONDOLA 3/LADO-A`**: copie a marca, as etiquetas e o símbolo da linha **ER M · `GONDOLA 2/LADO-B`**;
- linha **ER G · `GONDOLA 3/MEIO-A`**: copie da linha **ER M · `GONDOLA 2/MEIO-B`**.

Depois clique em **Atualizar** no app.

Siga para a **Conferência final**.

---

## Parte B · Atualizar o **app completo**

### B1. Leia antes de começar

Na primeira abertura depois da atualização, o app faz três coisas sozinho:

- **Cria a aba "Tipos de movimento"**, já com as linhas do *Ciclo exemplo*. Os valores de GMV dessas linhas são só ilustrativos.
- **Troca as linhas do "Ciclo exemplo"** nas abas *Movimentos* e *Painéis* pelas da versão nova. Os outros ciclos **não mudam**.
  👉 **Se você usa o nome "Ciclo exemplo" num ciclo de verdade, renomeie esse ciclo antes** (ex.: para `C14/2026`) nas abas *Movimentos* e *Painéis*.
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

Os demais (`Code`, `Config`, `Dados`, `Layouts`, `Validacao`, `Index`, `Styles`, `Render`, `Planilha`, `Construtor`, `Validacao` html, `App`) recebem o conteúdo novo do arquivo de mesmo nome em `src/`. Sem os arquivos novos, a página não abre.
</details>

### B3. Teste antes de publicar (opcional, recomendado)

Vá em **Implantar › Testar implantações** e abra o link que termina em `/dev`. Na primeira abertura, o app cria a aba *Tipos de movimento*. Confira se a planta, os ciclos e o *Analytics* aparecem.

### B4. Publique a nova versão (o link continua o mesmo)

Vá em **Implantar › Gerenciar implantações**, clique no **lápis** da implantação ativa, escolha **Versão: Nova versão** e clique em **Implantar**.

> ⚠️ **Não** use *Nova implantação*: ela cria um link novo.

### B5. Preencha "Tipos de movimento" nos seus ciclos

A aba é criada já com as colunas, as listas suspensas e o GMV em reais. Acrescente as linhas dos **seus** ciclos (o preenchimento de cada coluna está no passo A6, item 3).

Atalho: no app, escolha o seu ciclo e clique em **Baixar planilha base › Copiar o ciclo selecionado**. A aba *Tipos de movimento* do arquivo já vem com todas as etiquetas do ciclo. Preencha a classificação e o GMV e use **Importar planilha**.

Se a aba não aparecer, recarregue a planilha e use o menu **Plano de Varejo › Configurar planilha (criar abas que faltam)**. Ele só cria o que falta e não mexe no resto.

### B6. Gôndola 3 da ER G nos seus ciclos

Faça o mesmo do passo **A7** na aba *Movimentos*. O *Ciclo exemplo* já vem atualizado.

### B7. Se você mudou o layout das plantas

Ao abrir, o app só troca o layout de uma planta quando o **modelo padrão** dela muda no código. Esta atualização **não muda** nenhum modelo de planta: o último ajuste dos modelos é de **06/10/2026**.

- Se o seu app foi instalado ou atualizado **depois de 06/10/2026**, o layout das plantas não é tocado.
- Se ele é **anterior**, as plantas cujo modelo mudou desde então voltam ao modelo novo na primeira abertura. Nesse caso, se você criou ou alterou plantas pelo *Construir loja*, confira cada uma. Se alguma tiver voltado ao padrão, copie as linhas dela da aba *Layout* da cópia de segurança (passo 2) e cole de volta.

---

## Conferência final (as duas versões)

Abra o link do app e confira:

- [ ] Aparece o convite **"Bem-vindo ao Plano de Varejo"**. Ele aparece uma vez por navegador. Faça o tour ou clique em *Agora não*.
- [ ] O seletor de ciclo mostra os **seus** ciclos e a planta abre com as cores e as etiquetas.
- [ ] O topo tem **Comunicações ER** e **Analytics** em destaque e a **engrenagem** com *Validação*, *Ajustar etiquetas* e *Ver o tutorial*.
- [ ] O **Analytics** mostra os números, os insights, o mapa movimento × ER e as marcas e classificações em cada ER. A classificação e o GMV só aparecem para os movimentos que estão na aba *Tipos de movimento*.
- [ ] **Baixar PNG** (canto de baixo da planta) baixa a planta, a visão simplificada e a estratégia.
- [ ] As posições de etiquetas que você já tinha salvado continuam no lugar.
- [ ] Entre na *Validação* como construtor: o painel mostra **Ciclos em construção** com o botão *Novo ciclo*. Se quiser testar, crie um ciclo de teste, mude um espaço e depois clique em *Excluir* na faixa do ciclo.

Se tudo estiver certo, avise os usuários: o link é o mesmo.

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Erro *"Identifier 'CONFIG' (ou outro nome) has already been declared"* ao salvar ou abrir | Sobrou um arquivo antigo no projeto. Deixe só o `Código.gs` (e o `appsscript.json`). |
| A página continua igual à versão antiga | A implantação não foi atualizada (passo A5 / B4). Depois de atualizar, recarregue com <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>. |
| *"Não consegui abrir a planilha…"* (visualizador) | Cole de novo em `VISUALIZADOR.PLANILHA` o link guardado no passo A1. |
| A página fica em branco | Veja o erro em **Execuções** (menu da esquerda do Apps Script). Normalmente o arquivo não foi colado inteiro: copie e cole de novo. |
| Os movimentos aparecem como *Sem classificação* | Confira o nome exato da aba (`Tipos de movimento`), o nome do ciclo e se o texto é igual ao da etiqueta. Depois clique em **Atualizar**. |
| O convite do tutorial não aparece | Ele aparece só uma vez por navegador. Abra pela **engrenagem › Ver o tutorial**. |
| Quero voltar para a versão anterior | Em **Gerenciar implantações › lápis**, escolha a versão anterior em *Versão*. Ou use a cópia de segurança do passo 2. |

---

## Instalação do zero (para outra pessoa ou outra planilha)

1. **Planilha:**
   - Visualizador: envie `visualizador/Planilha base - Visualizador.xlsx` para o Google Drive e abra como Planilhas Google.
   - App completo: use uma planilha em branco. O app cria as abas.
2. Na planilha, vá em **Extensões › Apps Script**. Apague o conteúdo do `Código.gs`, cole o arquivo da versão escolhida e salve.
3. Vá em **Implantar › Nova implantação**, clique na engrenagem e escolha **App da Web**. Em *Executar como*, escolha **Eu**. Em *Quem pode acessar*, escolha quem vai usar. Clique em **Implantar** e autorize.
4. **Só no app completo:** recarregue a planilha e use **Plano de Varejo › Configurar planilha**. Isso cria as abas *Layout*, *Movimentos*, *Painéis* e *Tipos de movimento* com o *Ciclo exemplo*.
5. Abra o link do App da Web.

Estes arquivos são gerados a partir da pasta `src/` com `npm run build:instalacao`. Não edite os `.gs` desta pasta à mão: mude `src/` e gere de novo.
