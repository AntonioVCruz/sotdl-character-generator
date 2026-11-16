# ADR-009: Aleatoriedade com gerador criptográfico, sem semente

**Status:** Aceita
**Data:** 2026-11-11
**Revisão:** 2026-11-16, emenda 2 da FEAT-009 (quarto item da Decisão; SRS v1.2, FR-DEC-019).
**Requisitos atendidos:** FR-DEC-005, FR-DEC-006, FR-DEC-019, FR-DEC-020, FR-LOG-002.

## Contexto

Rolar deve sortear cada dado da expressão de forma independente e uniforme e combiná-los como a tabela publica: 3d6 são três dados (FR-DEC-005). Rolagens encadeadas rolam cada etapa na tabela indicada pela anterior (FR-DEC-006). A tentativa anterior construiu aleatoriedade auditável (semente, versão de PRNG, substreams, travas), e isso foi apontado como escopo de gerenciador, não de gerador (lição 1).

## Decisão

- Expressão de dado como dado (`{ "count": 3, "sides": 6, "modifier": 0 }`), validada no pacote.
- Cada face sorteada com `crypto.getRandomValues`, por rejeição para não enviesar (uniforme em 1..lados).
- A rolagem acontece só dentro de um comando (ADR-004). O resultado grava as faces, o total, os modificadores e a entrada; o log guarda o mesmo (FR-LOG-002).
- "Enter result" passa pelo mesmo caminho, com um valor por expressão de dado: a soma que os dados mostram, sem modificador, validada contra `count` a `count × sides` (3d6: 3 a 18). O sistema soma os modificadores, e grava-se a soma informada, os modificadores, o total e a entrada, sem faces (FR-DEC-019, 020; FEAT-009 D4).
- O gerador é injetado no comando; nos testes, uma sequência fixa substitui o sorteio.

## Opções consideradas

- **`crypto.getRandomValues`, sem semente (escolhida).** Prós: simples, sem viés, nada a guardar. Contras: rolagem não reproduzível, o que não é requisito.
- **PRNG com semente gravada (como na tentativa anterior).** Prós: reproduzível. Contras: versão de algoritmo, substreams e travas para um ganho que nenhum requisito pede. Perdeu pela lição 1.
- **`Math.random`.** Prós: trivial. Contras: qualidade sem garantia entre navegadores. Sem vantagem sobre o `crypto`.

## Consequências

- Não há "rolar de novo igual"; o log é o registro do que saiu.
- Testes de distribuição ficam no nível do sorteio de uma face; tabelas são testadas com sequências fixas.
