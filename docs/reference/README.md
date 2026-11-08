# docs/reference/

Insumos definidos antes do planejamento. Os artefatos de especificação partem deles.

| Arquivo | Papel |
| --- | --- |
| `principios-gerador-sotdl.md` | Princípios (P1–P34) e decisões (D1–D34) do produto. As seções 1 e 2 resumem as regras do jogo; as seções 3 e 4 são as decisões de produto. |
| `wireframe/wireframe-spec-sotdl.md` | Descrição das telas, componentes, interações e dados implícitos. |
| `screens/SCR-xx-*.png` | Imagem de cada tela, em largura de desktop (1440px) ou celular (390px). |
| `wireframe/project/` | Fonte do canvas (arquivos `.dc.html` + `canvas.json`). Serve para reabrir o wireframe no editor de design; não é código da aplicação. |
| `character-sheet.html` | Ficha da Liliana. Referência de conteúdo e organização da ficha, não de comportamento (P13). |
| `lessons-learned.md` | Lições da tentativa anterior (`sotdl-character-forge`). Informam a especificação, mas o código antigo não é base para ela. |

## Fonte da verdade

| Pergunta | Fonte da verdade |
| --- | --- |
| O que a regra do jogo diz? | Os livros (`content/pdfs/`, somente local). As seções 1 e 2 dos princípios são um resumo; o que estiver marcado como [Não verificado] precisa ser conferido. |
| Como o gerador trata a regra? | Os princípios. Decisões que se afastam do texto do livro de propósito prevalecem sobre ele. |
| Como o produto funciona e se apresenta? | Os princípios, que prevalecem sobre o wireframe e a ficha da Liliana. |
| O que entra em cada entrega? | A especificação de requisitos (SRS). |

Os princípios definem o produto; o SRS define a ordem. Uma decisão fora do MVP não é revogada: entra no SRS com prioridade menor.