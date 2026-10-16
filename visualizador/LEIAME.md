# Plano de Varejo · Visualizador (Apps Script)

Versão **só de visualização** do app: mostra as plantas de cada ciclo a partir de **uma única planilha** no Google Sheets. A estratégia é montada direto na planilha; o app só lê (a única coisa que ele grava são os comentários da validação, na aba **Comentários**).

Comparado ao app completo, esta versão **não tem** *Construir loja*, *Baixar planilha base* nem *Importar planilha*. Ficam: seletor de ciclo, abas das plantas (setas ← →), as visões *Na planta* e *Visão simplificada*, *Comunicações ER* (menu da esquerda), *Espaço por marca*, *Validação*, filtro por marca, zoom, *Baixar PNG*, *Ajustar etiquetas*, *Atualizar* e *Abrir planilha*.

## Arquivos

| Arquivo | O que é |
|---|---|
| **`Plano de Varejo - Apps Script.gs`** | **O app inteiro num arquivo só** (código + página): é só colar no `Código.gs`. |
| `Planilha base - Visualizador.xlsx` | A planilha que alimenta o app (abas **Movimentos**, **Painéis**, **Tipos de movimento** e **Instruções**), já com o *Ciclo exemplo* das quatro plantas. |
| `apps-script/Codigo.gs` | Todo o código do servidor, num arquivo só. |
| `apps-script/Index.html` | A página, num arquivo só. |
| `apps-script/appsscript.json` | Manifesto (fuso horário, V8, App da Web). |

O arquivo único e os três arquivos de `apps-script/` são **gerados** a partir de `src/` (`npm run build:visualizador`). Não edite à mão: mude `src/` (ou `visualizador/fonte/Visualizador.gs`) e gere de novo.

## Instalação rápida (um arquivo só)

1. **Planilha:** envie `Planilha base - Visualizador.xlsx` para o Google Drive e abra com o Google Sheets (*Arquivo > Salvar como Planilhas Google*). Se já tem a planilha com os ciclos, use a sua.
2. Na planilha, abra *Extensões > Apps Script*.
3. Apague todo o conteúdo do `Código.gs`, cole **o conteúdo inteiro** de `Plano de Varejo - Apps Script.gs` e salve (ícone de disquete ou <kbd>Ctrl</kbd>+<kbd>S</kbd>). Não precisa criar nenhum outro arquivo.
4. *Implantar > Nova implantação* > engrenagem > *App da Web*. *Executar como:* **Eu**; *Quem pode acessar:* quem for usar. Clique em *Implantar* e autorize o acesso à planilha na primeira vez.
5. Pronto: abra o link do App da Web. Recarregando a planilha, aparece também o menu **Plano de Varejo > Abrir visualizador**.

**Para atualizar depois:** cole de novo o arquivo inteiro no `Código.gs`, salve e, em *Implantar > Gerenciar implantações*, edite a implantação (lápis) e escolha *Versão: Nova versão*. O link continua o mesmo.

Se preferir os arquivos separados (o código e a página), siga o passo a passo abaixo — o app é o mesmo.

## Como instalar (arquivos separados)

1. **Planilha:** envie `Planilha base - Visualizador.xlsx` para o Google Drive e abra com o Google Sheets (*Arquivo > Salvar como Planilhas Google*). Esta é a planilha onde todos os ciclos vão ficar.
2. **Script vinculado à planilha:** na planilha, abra *Extensões > Apps Script*.
   - Apague o conteúdo do `Código.gs` e cole o de `apps-script/Codigo.gs`.
   - Crie um arquivo HTML (*+ > HTML*) chamado **`Index`** e cole o de `apps-script/Index.html`.
   - Salve.
3. **Publicar:** *Implantar > Nova implantação > App da Web*.
   - *Executar como:* **Eu**. Assim quem abre o app não precisa ter acesso à planilha.
   - *Quem pode acessar:* quem for usar (ex.: qualquer pessoa da organização).
   - Na primeira vez o Google pede autorização para ler a planilha.
4. Pronto: use o link do App da Web. Na planilha também aparece o menu **Plano de Varejo > Abrir visualizador** (recarregue a planilha depois de salvar o script).

**Script fora da planilha (opcional):** se preferir um projeto do Apps Script separado, cole o link da planilha em `VISUALIZADOR.PLANILHA`, no início do `Codigo.gs`:

```js
const VISUALIZADOR = {
  PLANILHA: 'https://docs.google.com/spreadsheets/d/…/edit',
  …
};
```

**Com clasp:** crie um `.clasp.json` com `"rootDir": "visualizador/apps-script"` e o `scriptId` do projeto, e rode `clasp push`.

**Atualizar o código depois:** cole de novo os dois arquivos e, em *Implantar > Gerenciar implantações*, edite a implantação e escolha *Nova versão*. O link do app continua o mesmo.

## Como usar a planilha

- **Um ciclo = um nome na coluna "Ciclo".** Todos os ciclos ficam na mesma planilha. Para criar um ciclo, copie as linhas de um ciclo existente (em **Movimentos**, **Painéis** e **Tipos de movimento**), cole no fim e troque o nome do ciclo.
- **Tipos de movimento:** uma linha por movimento do ciclo (o texto da etiqueta), com a *Classificação* (lançamento, promoção, liquidação / outlet, institucional / portfólio ou outro) e o *GMV esperado (R$)*. Aparecem no painel *Espaço por marca*. A aba é opcional: sem ela, as etiquetas ficam como *Sem classificação*.
- Depois de editar, clique em **Atualizar** no app.
- Não renomeie as abas nem os títulos das colunas. As regras de preenchimento (cores, etiquetas por bloco, gôndola, cascata ER P → ER GG…) estão na aba **Instruções** da planilha.
- Se algo estiver errado (marca desconhecida, ID de móvel que não existe…), o app mostra **avisos** com a aba e a linha a corrigir.
- **Validação:** o botão *Validação* pede papel (validador ou construtor da estratégia), nome e senha (provisória: `1234`, em `SENHAS_ACESSO`, na seção `CONFIGURAÇÕES` do `Codigo.gs`). Os comentários ficam na aba **Comentários** desta planilha, criada no primeiro comentário. Não edite os IDs dessa aba.

## O que fica no código

- **Layout das lojas** (posição e tamanho dos móveis de cada planta): seção `LAYOUT PADRÃO` do `Codigo.gs` (vem de `src/Layouts.gs`). Para mudar uma planta, monte o layout no modo *Construir loja* do app completo, use *Baixar código da loja* e atualize `src/Layouts.gs`.
- **Marcas, cores, símbolos e nomes das plantas:** seção `CONFIGURAÇÕES` (vem de `src/Config.gs`).
- **Posições das etiquetas** salvas em *Ajustar etiquetas*: ficam nas propriedades do script, uma por planta (a planilha não é alterada); cada pilha de etiquetas (cada espaço da gôndola, frente da mesa…) guarda a sua. Quem acessa o app pode ajustá-las.
