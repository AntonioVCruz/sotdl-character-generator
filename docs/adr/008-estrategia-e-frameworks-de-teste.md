# ADR-008: Estratégia e frameworks de teste

**Status:** Aceita
**Data:** 2026-11-11
**Requisitos atendidos:** NFR-MAINT-002, NFR-ACC-001, NFR-PERF-001, NFR-PERF-002, NFR-PERF-003, NFR-COMP-001, NFR-COMP-003, FR-CONT-004; UC-001, UC-005, UC-010, UC-012, UC-013.

## Contexto

Cada Must de FR-CALC, FR-CHG e FR-DEC precisa de teste automatizado (NFR-MAINT-002). Acessibilidade, desempenho, compatibilidade e impressão têm metas medíveis. O motor é puro (ADR-004), o que põe a maior parte do valor nos testes unitários. A tentativa anterior mostrou o custo de processo pesado (lição 3).

## Decisão

**Pirâmide:**
- **Unitário (base):** motor e conteúdo com **Vitest**: `resolve`, `evaluate`, `impact`, fórmulas, limites, dados, migrações, validação de pacote. Pacotes sintéticos só nos testes (lição 4), mais o pacote oficial real.
- **Componentes:** **Vitest + Testing Library** em DOM simulado, só para componentes com lógica (diálogo de impacto, cartão de rolagem, composição).
- **E2E (topo, fino):** **Playwright** em Chromium, Firefox e WebKit, com viewport de celular. Fluxos críticos:
  1. Criar um personagem de nível 0 com Human, Dwarf e Clockwork até a ficha impressa (UC-001 → UC-012; métrica M1).
  2. Mudar a ancestralidade com dependentes e confirmar o diálogo de impacto (UC-010).
  3. Ajustar a ficha e conferir composição e log (UC-013).

**Verificações automáticas no CI:**
- **Acessibilidade:** `@axe-core/playwright` nas telas do MVP, sem violação grave (NFR-ACC-001). A revisão manual continua exigida.
- **Desempenho:** Lighthouse CI no site construído (NFR-PERF-001); teste de tempo do `evaluate` e do `impact` com personagem completo (NFR-PERF-002/003).
- **Impressão:** PDF gerado pelo Playwright no Chromium com no máximo 2 páginas A4 e Letter (NFR-COMP-003).
- **Pacote oficial:** schema, integridade, ausência de campos de texto (FR-CONT-004, M3) e comparação com a versão publicada anterior, para acusar id removido (ADR-004).

**Cobertura:** sem limite percentual. Vale a cobertura por requisito da NFR-MAINT-002: cada Must de FR-CALC, FR-CHG e FR-DEC aponta para pelo menos um teste. O Vitest gera relatório de cobertura (provedor v8) só para consulta. Um percentual mede o que foi executado, não o que foi verificado.

## Opções consideradas

- **Vitest (escolhido) vs. Jest.** Vitest é o padrão atual para projetos Vite, com TypeScript e ESM sem configuração; Jest exigiria transformação à parte.
- **Playwright (escolhido) vs. Cypress.** Playwright cobre WebKit (Safari), gera PDF para testar a impressão e integra o axe; no Cypress, o WebKit é suporte experimental. *[Não verificado na versão atual do Cypress.]*

## Consequências

- O CI fica mais lento com três navegadores no E2E; por isso o E2E se limita aos três fluxos acima.
- A revisão manual de textos (NFR-USE-001) e de acessibilidade continua sendo passo de publicação, não do CI.
