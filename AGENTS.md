# AGENTS.md

## Propósito deste repositório

Especificação e implementação, por Spec-Driven Development, de um gerador de personagens para *Shadow of the Demon Lord* (SotDL). Os documentos em `docs/` são a fonte para o código.

- O código implementa o que está especificado. Mudanças de escopo passam primeiro pelos documentos (SRS, arquitetura ou plano), pelo caminho de emenda do kit.
- O produto é uma aplicação web, usada pelo navegador. Projeto pessoal, não comercial, para portfólio. Público: jogadores e mestres em geral, inclusive quem não domina as regras.

## Insumos

Ficam em `docs/reference/`:

- `principios-gerador-sotdl.md`: princípios (P1–P34) e decisões (D1–D38) do produto. As seções 1 e 2 resumem as regras do jogo; as seções 3 e 4 são as decisões de produto.
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

Construção, também pelo kit:
1. `project-scaffolding`: gera o esqueleto funcional do plano.
2. Ciclo por feature, na ordem do plano: `detailed-design` → `ui-design` → `feature-implementation` → `acceptance-verification`.
3. `initial-deployment` depois que o esqueleto técnico (§2 do plano) estiver aceito.

Uma feature por vez. Não começar a próxima antes da verificação de aceite da anterior.

Por etapa:

- **requirements-engineering:** fechar primeiro o corte do MVP e a demonstrabilidade (ver "Pontos críticos"). Todo o restante dos princípios entra como Should ou Could, sem detalhamento.
- **software-architecture:** o modelo de fontes e componentes (P2–P2f, P14a, P17–P20, P26) e o esqueleto vs. camada editável (P11, P12, P16, P23) são o núcleo do sistema. Tratar ambos explicitamente, com ADRs próprias, e validá-los contra casos reais dos suplementos em `content/`. A arquitetura deve comportar a visão completa dos princípios, mesmo que o MVP use só parte dela.
- **ux-foundations:** não criar um design do zero. Usar o modo de ingerir os insumos existentes (princípios, spec do wireframe e telas).
- Seguir os formatos e IDs do kit. Não criar um esquema de IDs paralelo. Os IDs dos princípios (P*, D*) e das telas (SCR-*) podem ser citados como origem de um requisito.

## Salvaguardas de escopo

A tentativa anterior falhou por escopo inflado e excesso de processo (ver `docs/reference/lessons-learned.md`). Os princípios descrevem um produto amplo; a lição é não construí-lo de uma vez.

- **MVP:** definido na seção 1.2.1 do SRS (`docs/srs.md`): criação no nível 0 pelo fluxo do core com Human, Dwarf e Clockwork, fontes com adição e substituição de entidade, log de criação, ficha final, ajuste manual, impressão e exportar/importar o arquivo do personagem.
- **Fora do MVP por padrão** (Should ou Could, salvo decisão em contrário na etapa de requisitos): a ficha como ferramenta de jogo (D17, P13c, P11c, P34 em jogo, D31, D34), subida de nível e mudanças pós-nível (P13b, D16, D32), pacotes da casa importáveis e sua atualização (P21, P6a, D13), editor e importação de textos (P9a) e cobertura de todos os suplementos.
- Ao enumerar requisitos, não expandir áreas fora do MVP. Registrá-las com sua prioridade e seguir em frente.
- Produzir apenas documentos de decisão, mais os artefatos que o kit exige na construção (design por feature, tasks.md, relatório de aceite e matriz de rastreabilidade). Relatórios de aceite curtos: veredito, o que foi verificado e o que falhou. Nada de relatórios de entrega, status ou fechamento além disso.
- Preferir documentos curtos. Se um documento precisar de um resumo para ser entendido, ele está longo demais.
- O plano deve prever um esqueleto funcional de ponta a ponta antes de qualquer ampliação de conteúdo.

## Pontos críticos do domínio

- **Fontes:** o conteúdo inclui o livro básico e todos os suplementos, que expandem, substituem ou revisam o core em sete padrões (seção 2.2 dos princípios). Os princípios já decidem o mecanismo: livros com componentes, ordem de prioridade, exceção no cartão e por rolagem.
- **Esqueleto vs. camada editável:** derivados sempre calculados (D2), ajuste manual como camada nomeada (P12), concessões do mestre como camada própria (P23), mudança a montante desfaz dependentes com confirmação (P6).
- **Escolha vs. rolagem:** quatro regimes de decisão (seção 1.1). O gerador registra, não fiscaliza (P7). Respeitar a distribuição publicada: 3d6 são três dados, não um número uniforme de 3 a 18.
- **Demonstrabilidade (decidida, D35):** o app traz a mecânica oficial sem texto, nos termos do P22. Um visitante sem os livros percorre o fluxo inteiro; entradas sem texto mostram faixa, página e efeitos. O risco de licença foi aceito: o site é aberto ao público (Q1 do SRS).
- **Aplicação web (decidida):** SPA estática, sem backend nem contas no MVP, com o acesso a personagens atrás de uma interface de repositório para não impedir contas depois (ADR-001). Personagens no IndexedDB do navegador (ADR-002). Hospedagem no GitHub Pages, com deploy por GitHub Actions (ADR-007).

## Propriedade intelectual

- Este repositório é **público**. A linha entre o que pode e o que não pode sair de `content/` é a do P22 (D35, D36, D38):
  - **Pode entrar no repositório (mecânica oficial):** identificadores e nomes de entidades (ancestralidade, path, magia, talento, tradição, item, tipo de criatura), números, faixas de dado, efeitos, concessões, ligações entre tabelas, condições (P26) e página. Nomes curtos que são o conteúdo inteiro de uma entrada e não são entidades (ex.: profissões) só entram quando outra regra os referencia (D36, D38).
  - **Nunca sai de `content/`:** texto descritivo dos livros, inclusive o texto de resultado das tabelas narrativas; nomes de entrada que nenhuma regra referencia; arte.
- Nos documentos, referenciar livro e página em vez de transcrever regras (P22). Nomes de elementos (ancestralidades, caminhos, magias) podem ser citados.
- PDFs nunca são versionados (`*.pdf` está no `.gitignore`).

## Repositório anterior

`AntonioVCruz/sotdl-character-forge` é a tentativa anterior. Não usá-lo como base para requisitos nem UX. Ele só entra na etapa de `software-architecture`, analisado contra as specs aprovadas, para decidir peça por peça o que portar. Portar, não herdar: cada peça aproveitada entra por decisão explícita, registrada numa ADR.

## Convenções

- Documentos de especificação em português. Termos mecânicos oficiais do jogo em inglês (Strength, Agility, Health, Defense, novice path etc.), como nos livros.
- Interface, conteúdo e ficha gerada do produto em inglês (P25, D12).
- Todo trabalho de interface (telas, componentes, estilos) segue `docs/design.md`, com os valores de `docs/tokens.json`: usar os tokens e componentes definidos ali, nunca valores soltos. Telas e fluxos estão em `docs/ux-foundations.md`, pelos IDs `SCR-WEB-*`.
- Decisões em aberto: apresentar as alternativas com prós e contras e deixar a decisão comigo.
- Commits pequenos, um por documento ou decisão relevante.
## Documentos do projeto

- Requisitos: [`docs/srs.md`](docs/srs.md), [`docs/use-cases.md`](docs/use-cases.md), [`docs/rtm.md`](docs/rtm.md).
- Arquitetura: [`docs/architecture.md`](docs/architecture.md) e [`docs/adr/`](docs/adr/).
- Plano: [`docs/implementation-plan.md`](docs/implementation-plan.md).
- UX e design system: [`docs/ux-foundations.md`](docs/ux-foundations.md), [`docs/design.md`](docs/design.md), [`docs/tokens.json`](docs/tokens.json).
- Scaffolding (geradores, decisões, stubs): [`docs/scaffold-notes.md`](docs/scaffold-notes.md).

## Estrutura do código

Uma SPA na raiz (ADR-006). Módulos em `src/`, com as dependências da [arquitetura §5.2](docs/architecture.md#52-módulos-da-spa), impostas pelo lint (`eslint.config.js`):

| Módulo | Pode importar |
| :-- | :-- |
| `engine` | só tipos de `content` (`import type`); sem React, DOM nem armazenamento |
| `content` | nada interno; sem React nem DOM |
| `dice` | nada interno; sorteio por `globalThis.crypto` (ADR-009) |
| `storage` | nada interno; único que usa `idb` |
| `app` | `engine`, `content`, `storage`, `dice`; sem React |
| `ui` | `app`, `engine`; nunca `content`, `storage` nem `dice` |

- `packs/`: pacote oficial (só mecânica, P22), publicado no build e validado por `npm run packs:check`.
- `src/ui/styles/*.generated.*`: gerados de `docs/tokens.json` por `npm run tokens`; nunca editar à mão nem versionar.
- `e2e/`: Playwright. Testes unitários ficam ao lado do código (`*.test.ts`).
- Nome de teste cita o FR que verifica (NFR-MAINT-002), ex.: `FR-CHAR-001: creates a level 0 character with core only`.

## Comandos

Funcionam no PowerShell. Os scripts `pre*` geram os tokens antes de cada um.

| Comando | O que faz |
| :-- | :-- |
| `npm ci` | instala as dependências |
| `npm run dev` | servidor de desenvolvimento |
| `npm run typecheck` · `npm run lint` | tipos · lint com fronteiras |
| `npm test` · `npm run test:coverage` | Vitest · com relatório de cobertura (só consulta, ADR-008) |
| `npm run packs:check` | schema estrito e ids removidos em `packs/` |
| `npm run build` · `npm run preview` | build · serve o build |
| `npm run e2e` | Playwright contra o build (instale os navegadores uma vez com `npx playwright install`) |
| `npm run lighthouse` | build e Lighthouse CI na Home |
