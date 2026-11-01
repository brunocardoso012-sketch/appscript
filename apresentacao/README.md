# Apresentação à diretoria · vídeos e deck

Os 11 vídeos das funções do app (20 a 40 s, sem som, para narrar ao vivo) e o deck do roteiro. Os vídeos são gravados na versão web (`index.html`), com dados de demonstração. O resultado:

| # no deck | Seção | Script | O que mostra |
|---|---|---|---|
| 1 | Construir ficou mais fácil | `v1` | Num ciclo em construção em branco (só a ponta B fixa da O.U.i colorida), a gôndola 1 é preenchida: ponta A BOT, meio A EUD e meio B QDB; cada espaço ganha cor na hora e os números da ER passam a mostrar as três marcas |
| 2 | Construir ficou mais fácil | `v2` | A prateleira da gôndola 1 é dividida em quadrados, com os produtos do catálogo de BOTIPROMO e LÇTO EGEO; depois o *Briefing (PDF)* (com zoom na página da gôndola) |
| 3 | Construir ficou mais fácil | `v10` | Validação: o C16 aguarda aprovação; a validadora comenta na pirâmide 1 (balão laranja no móvel), o construtor responde e marca como resolvido, e a validadora publica o ciclo |
| 4 | Decidir com dados | `v3` | GMV esperado × espaço: pontos acima e abaixo da diagonal, troca de ER e clique em SIÀGE ULTIMATE, que aparece na planta |
| 5 | Decidir com dados | `v4` | *Marcas em cada ER* e *Classificação em cada ER*; o clique em EUD (ER P) e em Promoção (ER G) filtra a planta |
| 6 | Enxergar o todo | `v5` | Calendário: C13 a C16 lado a lado, empilhamento por equilíbrio, só GMV e só exposição; medalhas e hotspot na *Ordem e selos* |
| 7 | Enxergar o todo | `v6` | Mapa de calor movimento × ER, ícones dos móveis, *% da ER* / *Espaços*, ordenado pela ER G, clique na célula e *O que conta como espaço* |
| 8 | Enxergar o todo | `v11` | Inventário da rede (aba de exemplo): o balão mostra em quantas lojas cada móvel está (1.000, 860, 540; na ER GG, 100) e o Analytics ganha a coluna *Na rede* |
| 9 | Feito para durar | `v7` | O tutorial completo (boas-vindas e os 9 passos) e onde revê-lo |
| 10 | Feito para durar | `v9` | *Construir loja* (modo desenvolvedor): a ER P passa de 12 × 10 m para 16 × 13 m; gôndola, pirâmide e mesa destaque entram pela paleta e são arrastadas para a área nova; o PDV móvel e a pirâmide 2 mudam de lugar; salvo sozinho, a ER P aparece com a loja nova |
| 11 | Facilidades | `v8` | Modo apresentação (setas trocam a ER), *Baixar PNG* em slide completo e modo noturno |

Os dados são de demonstração (`gravacao/semente.js`): os exemplos do app renomeados como C13/2026, C14/2026 e C15/2026, o C16/2026 (em branco, com os tipos de movimento do C15) criado no vídeo 1, o calendário do Boticário e da Eudora e, no vídeo do inventário, uma aba *Inventario* de exemplo (rede de 1.000 lojas: ER P 380, ER M 320, ER G 200, ER GG 100, com alguns móveis em só parte das lojas). A versão web não lê a aba *Inventario* (só o Apps Script lê); o `v11.js` monta a aba, passa pelo mesmo leitor do app (`inventarioDeValores_`) e grava uma cópia em `out/Inventario (exemplo).csv`, pronta para colar na planilha. Para gravar com os dados reais, troque a semente pelas abas da planilha (mesmo formato do `localStorage` da versão web: `layout`, `movimentos`, `paineis`, `tipos`, `produtos` e as abas `aba:…`).

## Deck

`deck/build.js` gera dois arquivos com os mesmos 17 slides e as notas do apresentador (a fala e o tempo de cada parte do roteiro):

- **`Plano de Varejo - Google Apresentacoes.pptx`**: os vídeos entram como **GIF animado** (960 px, 8 qps, para o arquivo ficar abaixo dos 100 MB que o Google aceita converter), que tocam sozinhos e em loop. O Google Apresentações descarta vídeo embutido num `.pptx`, mas mantém o GIF animado.
- **`Plano de Varejo - PowerPoint (MP4).pptx`**: os vídeos em MP4 (1080p) embutidos, para o PowerPoint ou o Keynote.

### Como abrir no Google Apresentações

1. No Google Drive: *Novo › Upload de arquivo* e escolha `Plano de Varejo - Google Apresentacoes.pptx`.
2. Abra com o Google Apresentações (ou, nas configurações do Drive, ligue *Converter uploads*). Os GIFs já tocam no modo de apresentação.
3. Para os vídeos em 1080p no lugar dos GIFs: suba os MP4 para o Drive e, em cada slide, *Inserir › Vídeo › Google Drive*; em *Opções de formato › Reprodução*, escolha *Reproduzir (automaticamente)* e apague o GIF.

## Regravar

Requer o Chromium e o Playwright do ambiente (como em `dev/e2e.js`), o `ffmpeg` e o Python com o Pillow.

```bash
npm run build:web                       # gera o index.html que é gravado
cd apresentacao/gravacao
./gravar-todos.sh 1 2 3 4 5 6 7 8 9 10 11   # grava (out/) e monta os MP4 (videos/)
./folha.sh videos/v1.mp4 v1-folha.jpg   # 12 quadros do vídeo, para conferir
node hero.js                            # imagens da capa (deck/media/hero*.png)
cd ../deck
npm install
./midia.sh                              # GIF, MP4 e capa de cada vídeo em media/
npm run deck                            # os dois .pptx
```

Como a gravação funciona: o Chromium grava a tela em 2× (3200 × 1800) pelo *screencast* do DevTools; cada script `vN.js` usa o app como uma pessoa usaria e registra, com o horário, o mouse, os cliques e a **câmera** (`g.cam(...)`: o recorte da tela a destacar). O `render.py` monta o MP4 em 1920 × 1080, 30 qps: zoom suave entre os recortes, o cursor desenhado por cima (com o anel do clique) e o selo da tecla nos atalhos (F, →, Esc). O número de cada vídeo no deck segue a ordem dos slides (`slideVideo` numera sozinho), não o nome do script.
