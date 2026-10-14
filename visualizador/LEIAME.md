# Plano de Varejo · Visualizador (Apps Script)

Versão **só de visualização** do app: mostra as plantas de cada ciclo a partir de **uma única planilha** no Google Sheets. A estratégia é montada direto na planilha; o app só lê (a única coisa que ele grava são os comentários da validação, na aba **Comentários**).

Comparado ao app completo, esta versão **não tem** *Construir loja*, *Ajustar etiquetas*, *Baixar planilha base* nem *Importar planilha*. Ficam: seletor de ciclo, abas das plantas (setas ← →), filtro por marca, *Baixar PNG*, *Espaço por marca*, *Validação*, *Atualizar* e *Abrir planilha*.

**Download:** [`Plano de Varejo - Visualizador (Apps Script).zip`](Plano%20de%20Varejo%20-%20Visualizador%20(Apps%20Script).zip) traz tudo o que é preciso (planilha base, `Codigo.gs`, `Index.html`, manifesto) e o passo a passo detalhado, que também está em [`PASSO-A-PASSO.md`](PASSO-A-PASSO.md).

## Arquivos

| Arquivo | O que é |
|---|---|
| `Planilha base - Visualizador.xlsx` | A planilha que alimenta o app (abas **Movimentos**, **Painéis** e **Instruções**), já com o *Ciclo exemplo* das quatro plantas. |
| `apps-script/Codigo.gs` | Todo o código do servidor, num arquivo só. |
| `apps-script/Index.html` | A página, num arquivo só. |
| `apps-script/appsscript.json` | Manifesto (fuso horário, V8, App da Web). |
| `PASSO-A-PASSO.md` | Passo a passo detalhado de instalação. |
| `Plano de Varejo - Visualizador (Apps Script).zip` | Pacote para download: os arquivos acima e o passo a passo. Gerado com `npm run pacote:visualizador`. |

Os três arquivos de `apps-script/` são **gerados** a partir de `src/` (`npm run build:visualizador`). Não edite à mão: mude `src/` (ou `visualizador/fonte/Visualizador.gs`) e gere de novo.

## Como instalar

Resumo abaixo. O passo a passo completo, com autorização e problemas comuns, está em [`PASSO-A-PASSO.md`](PASSO-A-PASSO.md).

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

- **Um ciclo = um nome na coluna "Ciclo".** Todos os ciclos ficam na mesma planilha. Para criar um ciclo, copie as linhas de um ciclo existente (em **Movimentos** e em **Painéis**), cole no fim e troque o nome do ciclo.
- Depois de editar, clique em **Atualizar** no app.
- Não renomeie as abas nem os títulos das colunas. As regras de preenchimento (cores, etiquetas por bloco, gôndola, cascata ER P → ER GG…) estão na aba **Instruções** da planilha.
- Se algo estiver errado (marca desconhecida, ID de móvel que não existe…), o app mostra **avisos** com a aba e a linha a corrigir.
- **Validação:** o botão *Validação* pede papel (validador ou construtor da estratégia), nome e senha (provisória: `1234`, em `SENHAS_ACESSO`, na seção `CONFIGURAÇÕES` do `Codigo.gs`). Os comentários ficam na aba **Comentários** desta planilha, criada no primeiro comentário. Não edite os IDs dessa aba.

## O que fica no código

- **Layout das lojas** (posição e tamanho dos móveis de cada planta): seção `LAYOUT PADRÃO` do `Codigo.gs` (vem de `src/Layouts.gs`). Para mudar uma planta, monte o layout no modo *Construir loja* do app completo, use *Baixar código da loja* e atualize `src/Layouts.gs`.
- **Marcas, cores, símbolos e nomes das plantas:** seção `CONFIGURAÇÕES` (vem de `src/Config.gs`).
- **Posições das etiquetas:** as etiquetas se organizam sozinhas. Esta versão não tem *Ajustar etiquetas*; posições salvas antes nas propriedades do script (uma por planta) continuam sendo aplicadas.
