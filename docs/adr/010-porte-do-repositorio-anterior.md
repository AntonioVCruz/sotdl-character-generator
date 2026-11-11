# ADR-010: O que portar do repositório anterior

**Status:** Aceita
**Data:** 2026-11-11
**Requisitos atendidos:** sem requisito próprio. Motivo: o CLAUDE.md manda analisar `AntonioVCruz/sotdl-character-forge` contra as specs aprovadas e decidir peça por peça, em ADR, o que portar ("portar, não herdar"). Lições 1 a 4 e a tabela "O que vale reaproveitar" de `lessons-learned.md`.

## Contexto

A tentativa anterior (React 19, Vite, TypeScript, Zod, Vitest, Playwright, IndexedDB, sem backend) chegou a uma ancestralidade no nível 0. Analisados em 2026-11-11: `docs/arquitetura.md`, `packages/random-tables`, `packages/curation/registries.ts`, `curation/sources.json` e os pacotes em `content-packs/`. A pilha coincide com a escolhida aqui, mas cada escolha desta etapa saiu dos requisitos atuais (ADR-001, 002, 005, 006, 008), não da tentativa anterior.

## Decisão

| Peça | Decisão | Como entra |
|---|---|---|
| Motor puro que devolve a visão do personagem com a explicação de cada valor (`calculateCharacter` → `CharacterView` com `breakdown`) | **Portar o conceito** | É a função `evaluate` da ADR-004. Código novo. |
| Separação entre estado permanente, estado de sessão e contexto de uma ação | **Portar o conceito** | Camadas da ADR-004 (`session` fora do log) e, no futuro, ataques (D34) como contexto, sem efeito global na ficha. |
| Expressão de dado (`count`, `sides`, `modifier`), um sorteio por dado, sorteio uniforme por rejeição | **Portar o algoritmo** | ADR-009, reescrito sobre `crypto.getRandomValues`, com testes próprios. |
| Regra "tabela oficial nunca vira sorteio filtrado entre opções válidas" | **Portar a regra** | Roll sempre usa a tabela publicada; escolher é o modo Choose (P7). |
| Inventário de publicações (`curation/sources.json`: 95 fontes com id e título) | **Portar os dados, conferidos** | Semente da lista de livros: títulos e slugs, conferidos contra os PDFs. Datas de publicação (D37) não existem lá e serão levantadas. Nenhum texto dos livros. |
| PRNG com semente, versão de algoritmo, substreams, travas, rascunho de geração automática (`GenerationDraft`) | **Não portar** | Lição 1; ADR-009. |
| Pipeline de curadoria (`tools/curation`, ledgers, freezes, matrizes) | **Não portar** | Lição 3. O pacote oficial é escrito à mão, conferido no PDF e validado no CI (ADR-005, 008). |
| Pacotes em `content-packs/` | **Não portar** | Feitos de extrações não verificadas e marcados `needs-review`; o formato difere da ADR-003. |
| Grafo de procedimento (`procedure-graph.ts`) e ledger de eventos por nível | **Não portar** | ADR-003 (procedimento como dado) e ADR-004 (sem event sourcing). |
| HTML autônomo (`apps/standalone`) | **Não portar** | Fora do escopo; a ficha impressa cobre a saída. |
| Interface (`apps/web`) | **Não portar** | A UX vem dos princípios, do wireframe e da etapa de UX (CLAUDE.md). |

## Opções consideradas

- **Portar conceitos e peças pequenas, reescritas (escolhida).** Prós: aproveita o que estava certo sem trazer a complexidade. Contras: reescrever o que já existia.
- **Partir do código anterior e podar.** Prós: começo mais rápido. Contras: herda escopo, termos internos e acoplamentos que a lição 4 manda remover; contraria o CLAUDE.md. Perdeu.
- **Ignorar o repositório anterior.** Prós: nenhuma contaminação. Contras: perde o inventário de publicações e o algoritmo de dado já pensados. Perdeu.

## Consequências

- Nenhum arquivo é copiado sem passar por esta tabela. Peças novas a portar exigem emenda desta ADR.
- O inventário de publicações passa por conferência antes de entrar em `packs/`.
