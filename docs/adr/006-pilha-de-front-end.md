# ADR-006: Pilha de front-end: TypeScript, React e Vite

**Status:** Aceita
**Data:** 2026-11-11
**Requisitos atendidos:** NFR-ACC-001, NFR-COMP-001, NFR-COMP-002, NFR-COMP-003, NFR-PERF-001, NFR-L10N-001, FR-FLOW-018, FR-SHEET-013, FR-SHEET-014, FR-HELP-004, FR-HELP-005.

## Contexto

Um desenvolvedor só. A interface tem três zonas recolhíveis (P32), diálogos, grades de escolha e impressão, precisa cumprir WCAG 2.2 AA por teclado (NFR-ACC-001), funcionar de 360 px a 1920 px (NFR-COMP-002) nos navegadores das 2 últimas versões (NFR-COMP-001) e carregar rápido (NFR-PERF-001). Decidido pelo usuário: React.

## Decisão

- **TypeScript** em todo o código, em modo estrito.
- **React** para a interface, **Vite** para desenvolvimento e build.
- **React Aria Components** como base dos componentes interativos (diálogo, listas, grades, abas, menus), pela cobertura de teclado e leitor de tela.
- **Roteamento por hash** (`#/characters/…`), porque o GitHub Pages não reescreve rotas para a SPA (ADR-007).
- **Estado:** o documento do personagem fica num store simples da camada de aplicação, lido pelo React com `useSyncExternalStore`; a visão do personagem é `evaluate` memoizado sobre o documento. Sem biblioteca de estado global no MVP.
- **Estilo:** CSS com variáveis vindas dos tokens de design (`tokens.json`, etapa de UX), e uma folha `@media print` para a ficha (FR-SHEET-013, NFR-COMP-003). Fontes servidas pelo próprio site, sem CDN de terceiros (NFR-PRIV-001).
- **Erros:** um error boundary na raiz e por zona mostra mensagem compreensível (FR-HELP-005). Falha ao carregar pacote não toca o banco local (FR-HELP-004).
- **Fronteira do motor:** o código do motor (`engine`) não importa React, DOM nem armazenamento; uma regra de lint impede.

## Opções consideradas

- **React (escolhida).** Prós: maior ecossistema; React Aria pronto para WCAG; já usado na tentativa anterior. Contras: pacote maior que o do Svelte.
- **Svelte.** Prós: pacote menor, ajuda no LCP. Contras: menos componentes acessíveis prontos. Perdeu na escolha do usuário.
- **Vue.** Meio-termo; ecossistema de acessibilidade menor que o do React.

## Consequências

- O LCP depende de dividir o código: a tela inicial não carrega o construtor nem os pacotes.
- O motor é TypeScript puro e roda nos testes sem navegador (NFR-MAINT-002).
- Hash na URL: links de personagem funcionam, mas ficam com `#`. Rever se o host mudar.
