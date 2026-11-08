# CLAUDE.md

## Propósito deste repositório

Planejamento e estruturação, por Spec-Driven Development, de um gerador de personagens para *Shadow of the Demon Lord* (SotDL). O produto deste repositório são **documentos de especificação**, não código.

- Não escrever código de implementação. Exceção: trechos ilustrativos dentro de uma spec (ex.: um esquema de dados), quando ajudarem a decisão.
- O produto é uma aplicação web, usada pelo navegador. Projeto pessoal, não comercial, para portfólio. Público: jogadores e mestres em geral, inclusive quem não domina as regras.

## Insumos

Ficam em `docs/reference/`:

- `principios-gerador-sotdl.md`: princípios (P1–P34) e decisões (D1–D34) do produto. As seções 1 e 2 resumem as regras do jogo; as seções 3 e 4 são as decisões de produto.
- `wireframe/wireframe-spec-sotdl.md` e `screens/`: telas, componentes, interações e dados implícitos.
- `wireframe/project/`: fonte do canvas do wireframe. Não é código da aplicação.
- `character-sheet.html`: a ficha da Liliana. Referência de **conteúdo e organização** da ficha, não de comportamento (P13).
- `lessons-learned.md`: erros da tentativa anterior a evitar.

Regras do jogo ficam em `content/` (somente local, fora do Git):

- `content/pdfs/`: os livros.
- `content/extracted/`: extrações em Markdown da tentativa anterior, ainda não verificadas. Servem para localizar regras rapidamente; qualquer dado que entre numa spec deve ser conferido no PDF.

## Fonte da verdade

Depende do tipo de pergunta:

| Pergunta | Fonte da verdade |
| --- | --- |
| O que a regra do jogo diz? | Os PDFs em `content/pdfs/`. As seções 1 e 2 dos princípios são um resumo; o que estiver marcado como [Não verificado] precisa ser conferido. |
| Como o gerador trata a regra? | Os princípios. Decisões que se afastam do texto do livro de propósito (ex.: D1, D22, D23, D24, D30) prevalecem sobre ele. |
| Como o produto funciona e se apresenta? | Os princípios, que prevalecem sobre o wireframe e a ficha da Liliana. |
| O que entra em cada entrega? | A especificação de requisitos (SRS), conforme as salvaguardas de escopo abaixo. |

**Os princípios definem o produto; o SRS define a ordem.** Nenhuma decisão dos princípios é revogada por estar fora do MVP: ela entra no SRS com prioridade Should ou Could.

O que vier da memória, ou só de `content/extracted/` sem conferência, deve ser marcado como **não verificado**. Se uma spec contradisser os princípios ou o wireframe, aponte o conflito e pergunte. Não resolva sozinho.

## Metodologia

Usar o Agentic SDLC Kit, na ordem do pipeline, uma etapa por vez e só avançando com aprovação:

1. `requirements-engineering`
2. `software-architecture`
3. `ux-foundations`
4. `implementation-planning`

Esta fase termina em `implementation-planning`. Scaffolding, implementação e o ciclo por feature ficam fora deste momento.

Por etapa:

- **requirements-engineering:** fechar primeiro o corte do MVP e a demonstrabilidade (ver "Pontos críticos"). Todo o restante dos princípios entra como Should ou Could, sem detalhamento.
- **software-architecture:** o modelo de fontes e componentes (P2–P2f, P14a, P17–P20, P26) e o esqueleto vs. camada editável (P11, P12, P16, P23) são o núcleo do sistema. Tratar ambos explicitamente, com ADRs próprias, e validá-los contra casos reais dos suplementos em `content/`. A arquitetura deve comportar a visão completa dos princípios, mesmo que o MVP use só parte dela.
- **ux-foundations:** não criar um design do zero. Usar o modo de ingerir os insumos existentes (princípios, spec do wireframe e telas).
- Seguir os formatos e IDs do kit. Não criar um esquema de IDs paralelo. Os IDs dos princípios (P*, D*) e das telas (SCR-*) podem ser citados como origem de um requisito.

## Salvaguardas de escopo

A tentativa anterior falhou por escopo inflado e excesso de processo (ver `docs/reference/lessons-learned.md`). Os princípios descrevem um produto amplo; a lição é não construí-lo de uma vez.

- **MVP:** [A DEFINIR na etapa de requisitos. Ponto de partida sugerido: criação no nível 0 com um pequeno conjunto de ancestralidades, rolagens e escolhas, ficha final e ajuste manual.]
- **Fora do MVP por padrão** (Should ou Could, salvo decisão em contrário na etapa de requisitos): a ficha como ferramenta de jogo (D17, P13c, P11c, P34 em jogo, D31, D34), subida de nível e mudanças pós-nível (P13b, D16, D32), pacotes da casa importáveis e sua atualização (P21, P6a, D13), editor e importação de textos (P9a) e cobertura de todos os suplementos.
- Ao enumerar requisitos, não expandir áreas fora do MVP. Registrá-las com sua prioridade e seguir em frente.
- Produzir **apenas documentos de decisão**: requisitos, arquitetura, ADRs, UX e plano. Nada de relatórios de entrega, status, fechamento, matrizes de aceite ou registros do trabalho realizado.
- Preferir documentos curtos. Se um documento precisar de um resumo para ser entendido, ele está longo demais.
- O plano deve prever um esqueleto funcional de ponta a ponta antes de qualquer ampliação de conteúdo.

## Pontos críticos do domínio

- **Fontes:** o conteúdo inclui o livro básico e todos os suplementos, que expandem, substituem ou revisam o core em sete padrões (seção 2.2 dos princípios). Os princípios já decidem o mecanismo: livros com componentes, ordem de prioridade, exceção no cartão e por rolagem.
- **Esqueleto vs. camada editável:** derivados sempre calculados (D2), ajuste manual como camada nomeada (P12), concessões do mestre como camada própria (P23), mudança a montante desfaz dependentes com confirmação (P6).
- **Escolha vs. rolagem:** quatro regimes de decisão (seção 1.1). O gerador registra, não fiscaliza (P7). Respeitar a distribuição publicada: 3d6 são três dados, não um número uniforme de 3 a 18.
- **Demonstrabilidade (em aberto):** o repositório é público e não pode conter conteúdo dos livros, e o conteúdo oficial vive em pacotes (P21a). Se esses pacotes ficarem só em `content/`, um visitante público não consegue usar o app. A etapa de requisitos deve decidir cedo o que um visitante sem os livros consegue fazer.
- **Aplicação web (em aberto, para a arquitetura):** decidir onde ficam os personagens (navegador ou servidor), se há contas de usuário (P2 e P9 falam em escopo "por usuário"; P21 em compartilhar pacotes) e onde hospedar, considerando o custo de um projeto pessoal. O MVP pode adotar a opção mais simples, desde que não impeça as demais depois.

## Propriedade intelectual

- Este repositório é **público**. Nunca copiar texto, tabelas ou arte dos livros para fora de `content/`.
- Nos documentos, referenciar livro e página em vez de transcrever regras (P22). Nomes de elementos (ancestralidades, caminhos, magias) podem ser citados.
- PDFs nunca são versionados (`*.pdf` está no `.gitignore`).

## Repositório anterior

`AntonioVCruz/sotdl-character-forge` é a tentativa anterior. Não usá-lo como base para requisitos nem UX. Ele só entra na etapa de `software-architecture`, analisado contra as specs aprovadas, para decidir peça por peça o que portar. Portar, não herdar: cada peça aproveitada entra por decisão explícita, registrada numa ADR.

## Convenções

- Documentos de especificação em português. Termos mecânicos oficiais do jogo em inglês (Strength, Agility, Health, Defense, novice path etc.), como nos livros.
- Interface, conteúdo e ficha gerada do produto em inglês (P25, D12).
- Decisões em aberto: apresentar as alternativas com prós e contras e deixar a decisão comigo.
- Commits pequenos, um por documento ou decisão relevante.