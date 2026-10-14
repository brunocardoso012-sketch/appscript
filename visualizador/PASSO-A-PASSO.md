# Plano de Varejo · Visualizador — passo a passo de instalação (Google Apps Script)

Esta é a versão **só de visualização** do app. Ela mostra as plantas de cada ciclo a partir de uma planilha do Google Sheets.
Não tem *Construir loja*, *Ajustar etiquetas*, *Baixar planilha base* nem *Importar planilha*.
Ficam: seletor de ciclo, abas das plantas (setas ← →), filtro por marca, *Baixar PNG*, *Espaço por marca*, *Validação*, *Atualizar* e *Abrir planilha*.

## O que vem no pacote

| Arquivo | Para que serve |
|---|---|
| `Planilha base - Visualizador.xlsx` | A planilha que alimenta o app, já com o *Ciclo exemplo*. |
| `Codigo.gs` | Código do servidor. Vai para o arquivo `Código.gs` do Apps Script. |
| `Index.html` | A página do app. Vai para um arquivo HTML chamado `Index`. |
| `appsscript.json` | Manifesto (fuso de São Paulo, V8). Opcional: veja o passo 3. |

Você precisa de uma conta Google com acesso ao Google Drive. Não precisa instalar nada no computador.

---

## Passo 1 · Colocar a planilha no Google Sheets

1. Descompacte o `.zip` no computador.
2. Abra o [Google Drive](https://drive.google.com) e clique em **+ Novo › Upload de arquivo**.
3. Escolha `Planilha base - Visualizador.xlsx`.
4. Dê dois cliques no arquivo enviado. Ele abre no Google Sheets.
5. Clique em **Arquivo › Salvar como Planilhas Google**. Uma cópia nova abre em outra aba.
6. Use **essa cópia** daqui para frente. Se quiser, apague o `.xlsx` do Drive.
7. Confira se as abas **Movimentos**, **Painéis** e **Instruções** estão lá.

> Todos os ciclos ficam nessa mesma planilha. Não renomeie as abas nem os títulos das colunas.

## Passo 2 · Abrir o Apps Script pela planilha

1. Com a planilha (versão Google Sheets) aberta, clique em **Extensões › Apps Script**.
2. Abre o editor, com um arquivo `Código.gs`.
3. Clique no nome do projeto ("Projeto sem título"), no alto, e dê um nome. Exemplo: **Plano de Varejo - Visualizador**.

> Abrir o Apps Script **pela planilha** já conecta o script a ela. Não precisa configurar link nem ID.

## Passo 3 · Colar o código

**Código do servidor**

1. No editor, clique em `Código.gs`.
2. Apague tudo o que estiver lá (Ctrl+A e Delete).
3. Abra `Codigo.gs` do pacote num editor de texto (Bloco de Notas, TextEdit…), copie tudo e cole no editor.

**Página do app**

4. Ao lado de **Arquivos**, clique em **+ › HTML**.
5. Dê o nome **`Index`** (exatamente assim, com *I* maiúsculo e sem `.html`; o editor completa sozinho).
6. Apague o conteúdo que vem pronto e cole tudo de `Index.html` do pacote.

**Manifesto (opcional, recomendado)**

7. Clique em **Configurações do projeto** (ícone de engrenagem, à esquerda).
8. Marque **Mostrar arquivo de manifesto "appsscript.json" no editor**.
9. Volte ao **Editor** (ícone `< >`), abra `appsscript.json`, apague tudo e cole o de `appsscript.json` do pacote.

**Salvar**

10. Clique em **Salvar projeto** (ícone de disquete) ou Ctrl+S.

## Passo 4 · Autorizar o script

1. No alto do editor, na lista de funções, escolha **`getDados`** e clique em **Executar**.
2. O Google pede autorização: **Revisar permissões** e escolha sua conta.
3. Se aparecer *"O Google não verificou este app"*, clique em **Avançado › Acessar Plano de Varejo - Visualizador (não seguro)**. O script é seu; o aviso aparece porque ele não foi publicado na loja do Google.
4. Clique em **Permitir**.
5. O registro de execução deve terminar sem erro.

## Passo 5 · Publicar como App da Web

1. No editor, clique em **Implantar › Nova implantação**.
2. Clique na engrenagem ao lado de *Selecionar tipo* e escolha **App da Web**.
3. Preencha:
   - **Descrição:** por exemplo, `Versão 1`.
   - **Executar como:** **Eu** (seu e-mail). Assim, quem abre o app não precisa ter acesso à planilha.
   - **Quem pode acessar:** escolha quem vai usar. Exemplos: *Qualquer pessoa na sua organização*, *Qualquer pessoa com uma Conta do Google* ou *Somente eu*.
4. Clique em **Implantar**.
5. Copie o **URL do app da Web** (termina em `/exec`). Esse é o link do visualizador. Mande para quem for usar.

## Passo 6 · Testar

1. Abra o link `/exec` no navegador.
2. Escolha o ciclo **Ciclo exemplo** e troque de planta pelas abas ou pelas setas ← →.
3. Também dá para abrir pela planilha: recarregue a planilha e use o menu **Plano de Varejo › Abrir visualizador**.

---

## Usar no dia a dia

- **Editar a estratégia:** mude as abas **Movimentos** e **Painéis** da planilha e clique em **Atualizar** no app.
- **Criar um ciclo:** copie as linhas de um ciclo existente (em **Movimentos** e em **Painéis**), cole no fim e troque o nome na coluna **Ciclo**.
- **Regras de preenchimento** (cores, etiquetas por bloco, gôndola…): estão na aba **Instruções** da planilha.
- **Avisos:** se algo estiver errado (marca desconhecida, ID de móvel que não existe…), o app mostra a aba e a linha a corrigir.
- **Validação:** o botão *Validação* pede papel, nome e senha. A senha provisória é `1234`. Para trocar, mude `SENHAS_ACESSO`, na seção `CONFIGURAÇÕES` do `Código.gs`, e publique uma nova versão (abaixo). Os comentários ficam na aba **Comentários** da planilha, criada no primeiro comentário. Não edite os IDs dessa aba.

## Atualizar o código depois

1. Cole de novo `Codigo.gs` e `Index.html` no editor e salve.
2. Clique em **Implantar › Gerenciar implantações**.
3. Clique no lápis (**Editar**), em *Versão* escolha **Nova versão** e clique em **Implantar**.
4. O link do app continua o mesmo.

> Só salvar não muda o app publicado. Sempre faça o passo 3 acima.

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| *"Nenhuma planilha conectada"* | O script foi criado fora da planilha. Refaça o passo 2 pela planilha, ou cole o link da planilha em `PLANILHA: ''`, no início do `Código.gs` (ex.: `PLANILHA: 'https://docs.google.com/spreadsheets/d/…/edit'`). |
| *"A planilha não tem a aba Movimentos"* | A planilha conectada não é a planilha base, ou a aba foi renomeada. Use a cópia do passo 1. |
| *"Não consegui abrir a planilha"* | Confira o link em `PLANILHA` e se a conta que publicou o app tem acesso à planilha. |
| Página em branco ou *"Script function not found: doGet"* | O código não foi salvo, ou o arquivo HTML não se chama exatamente `Index`. |
| A mudança no código não aparece | Publique uma **Nova versão** (veja *Atualizar o código depois*). |
| Outra pessoa não consegue abrir o link | Em *Gerenciar implantações*, confira **Quem pode acessar**. |
