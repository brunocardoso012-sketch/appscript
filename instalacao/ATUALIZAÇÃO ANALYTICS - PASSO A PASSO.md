# Atualização "Analytics" · Passo a passo no Apps Script

Esta atualização troca o painel **Espaço por marca** pelo **Analytics**: um dashboard que compara as ERs e mostra como o espaço de cada uma se divide entre os movimentos, as marcas e as classificações, com insights rápidos.

**O que muda na sua planilha: nada.** Nenhuma aba é criada, apagada ou alterada, e as posições das etiquetas que você salvou continuam no lugar. Só o código muda. O link do app também continua o mesmo.

> Tempo estimado: 10 minutos.

> **O visualizador não existe mais.** Este passo a passo vale só para o app completo. Quem usa o visualizador troca para o app completo pela **Parte A** do [GUIA DE INSTALAÇÃO E ATUALIZAÇÃO.md](GUIA%20DE%20INSTALA%C3%87%C3%83O%20E%20ATUALIZA%C3%87%C3%83O.md); o arquivo `Visualizador - Plano de Varejo.gs` citado abaixo saiu desta pasta.

## Antes de começar: esta é a atualização certa para você?

Abra o app e olhe o topo:

- **Tem os botões _Comunicações ER_ e _Espaço por marca_ lado a lado, em destaque?** Siga este passo a passo.
- **Não tem?** A sua versão é mais antiga. Use o [GUIA DE INSTALAÇÃO E ATUALIZAÇÃO.md](GUIA%20DE%20INSTALA%C3%87%C3%83O%20E%20ATUALIZA%C3%87%C3%83O.md). Ele leva direto para a versão nova (com o Analytics) e explica as outras mudanças que você ainda não tem, como a aba *Tipos de movimento*.

## Arquivos

Estão nesta pasta (`instalacao/`). Você vai usar **só um** deles:

| Arquivo | Para quem |
|---|---|
| `Visualizador - Plano de Varejo.gs` | Quem usa o **visualizador** (o app **sem** o botão *Construir loja*). |
| `App completo - Plano de Varejo.gs` | Quem usa o **app completo** (o app **com** o botão *Construir loja*). |

Para copiar o conteúdo, abra o arquivo no GitHub e clique em **Raw** (ou abra no Bloco de Notas / TextEdit). Depois use <kbd>Ctrl</kbd>+<kbd>A</kbd> e <kbd>Ctrl</kbd>+<kbd>C</kbd> (no Mac, <kbd>Cmd</kbd>).

---

## Passo 1 · Cópia de segurança

1. Na planilha, vá em **Arquivo › Fazer uma cópia**. A cópia leva a planilha **e** o script. Dê um nome como *Plano de Varejo – backup antes do Analytics*.
2. Abra **Extensões › Apps Script**, vá em **Implantar › Gerenciar implantações** e anote qual é a implantação ativa (App da Web). É ela que você vai atualizar no passo 4.

## Passo 2 · Veja como o seu projeto está montado

No Apps Script, olhe a lista de arquivos à esquerda:

| Se você vê… | Siga |
|---|---|
| Só **um** `Código.gs` (no fim dele há `const PAGINA_ = [`) | **2A** (arquivo único) |
| `Código.gs` **e** um `Index.html` (visualizador antigo) | **2A** (arquivo único) |
| Vários arquivos: `Code`, `Config`, `Dados`, `Index`, `Styles`, `Render`, `App`… | **2A** (recomendado) ou **2B** |

### 2A · Arquivo único (recomendado)

1. **Só no visualizador:** abra o `Código.gs` atual e procure, no começo, `PLANILHA: '…'`. Se houver um link ou ID entre as aspas, **copie e guarde** esse texto.
2. Apague todos os outros arquivos `.gs` e `.html` do projeto (⋮ ao lado do nome › **Excluir**). Fica só o **`Código.gs`** (e o `appsscript.json`, se aparecer).
   - No app completo com arquivos separados: apague todos e crie um novo em **+ › Script** com o nome **`Código`**.
3. Abra o `Código.gs`, apague tudo (<kbd>Ctrl</kbd>+<kbd>A</kbd>, <kbd>Delete</kbd>) e cole **o conteúdo inteiro** do arquivo da sua versão:
   - visualizador → `Visualizador - Plano de Varejo.gs`;
   - app completo → `App completo - Plano de Varejo.gs`.
4. **Só no visualizador:** se você guardou um link no item 1, cole-o de volta em `PLANILHA: '…'`.
5. Salve (<kbd>Ctrl</kbd>+<kbd>S</kbd>). Não deve aparecer nenhum erro em vermelho.

### 2B · Manter os arquivos separados (só app completo)

Use o conteúdo da pasta `src/` do projeto:

1. **Crie um arquivo novo:** **+ › HTML**, com o nome exato **`Analytics`**, e cole o conteúdo de `src/Analytics.html`. Sem ele, a página não abre.
2. **Troque o conteúdo** destes arquivos pelo de mesmo nome em `src/`:

   | Tipo | Nome | Conteúdo |
   |---|---|---|
   | HTML | `Index` | `src/Index.html` |
   | HTML | `App` | `src/App.html` |
   | HTML | `Styles` | `src/Styles.html` |
   | HTML | `Tutorial` | `src/Tutorial.html` |
   | HTML | `Validacao` | `src/Validacao.html` |
   | HTML | `Estrategia` | `src/Estrategia.html` |
   | HTML | `Planilha` | `src/Planilha.html` |
   | HTML | `Render` | `src/Render.html` |
   | Script | `Config` | `src/Config.gs` |
   | Script | `Dados` | `src/Dados.gs` |

   `Code`, `Layouts`, `Validacao` (script) e `Construtor` não mudaram nesta atualização.
3. Salve cada arquivo.

## Passo 3 · Teste antes de publicar (recomendado)

1. Vá em **Implantar › Testar implantações** e abra o link **App da Web** que termina em `/dev`. Ele mostra o código salvo, antes de publicar.
2. Escolha um ciclo e clique em **Analytics**, no topo. Confira o que está na **Conferência** no fim deste guia.

## Passo 4 · Publique a nova versão (o link continua o mesmo)

1. Vá em **Implantar › Gerenciar implantações**.
2. Clique no **lápis** (Editar) da implantação ativa.
3. Em **Versão**, escolha **Nova versão** e clique em **Implantar**.

> ⚠️ **Não** use *Nova implantação*: ela cria um link novo, e quem usa o link antigo continuaria vendo a versão anterior.

Se o Google pedir autorização, autorize com a mesma conta de sempre.

## Passo 5 · Conferência

Abra o link do app (recarregue com <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>) e confira:

- [ ] O topo mostra **Comunicações ER** e **Analytics** em destaque (o botão *Espaço por marca* não existe mais).
- [ ] Com um ciclo escolhido, **Analytics** abre o dashboard no lugar da planta, com:
  - os números principais (espaços nas ERs, % com movimento, movimentos, GMV esperado, top 3);
  - os **insights rápidos**;
  - o mapa **Espaço de cada movimento em cada ER** (dá para alternar *% da ER* / *Espaços* e ordenar clicando no nome de uma ER);
  - **Marcas em cada ER** e **Classificação em cada ER**;
  - **GMV esperado × espaço** (só aparece se a aba *Tipos de movimento* tiver GMV).
- [ ] Clicar numa célula do mapa abre a planta daquela ER mostrando só onde o movimento aparece. A legenda mostra *Só a etiqueta: …*; clicar nela volta a mostrar tudo.
- [ ] **Voltar à planta** (ou a tecla Esc) fecha o Analytics.
- [ ] A planta, *Comunicações ER*, *Baixar PNG* e a *Validação* continuam funcionando como antes.

Se tudo estiver certo, avise os usuários: o link é o mesmo. Vale contar que o *Espaço por marca* agora se chama **Analytics** e abre no lugar da planta.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Erro *"Identifier '…' has already been declared"* | Sobrou um arquivo antigo no projeto. No arquivo único, deixe só o `Código.gs` (e o `appsscript.json`). |
| Página em branco (arquivos separados) | Falta o arquivo HTML **`Analytics`** (passo 2B, item 1), ou o nome não está exatamente assim. |
| Página em branco (arquivo único) | O arquivo não foi colado inteiro. Copie pelo **Raw** e cole de novo. O erro aparece em **Execuções**, no menu da esquerda do Apps Script. |
| O app continua com *Espaço por marca* | A implantação não foi atualizada (passo 4), ou o navegador guardou a versão antiga: recarregue com <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>. |
| *"Não consegui abrir a planilha…"* (visualizador) | Cole de novo em `PLANILHA: '…'` o link guardado no passo 2A, item 1. |
| No Analytics, os movimentos aparecem como *Sem classificação* e sem GMV | A aba *Tipos de movimento* não tem esse ciclo ou o texto do movimento está diferente do da etiqueta. Veja o passo A6 do guia completo. |
| Quero voltar para a versão anterior | Em **Gerenciar implantações › lápis**, escolha a versão anterior em *Versão* e clique em **Implantar**. Ou use a cópia de segurança do passo 1. |
