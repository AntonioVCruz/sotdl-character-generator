# Tasks: FEAT-007 — Etapa Ancestry, mapa de etapas e resumo vivo

> Executa: `docs/features/FEAT-007-ancestry-step-map-live-summary/technical-design.md`
> Status: pending · Última atualização: 2026-11-12
> Telas (SCR-WEB-003, SCR-WEB-016): do ui-design, pelo `docs/design-manifest.json`. As tarefas de ui aqui são só integração.

- [ ] **T1. Schemas do pacote e do documento v1** (design §3.1, §4; FR-CONT-004, 006; D1–D4)
  - Em `src/content/schemas.ts`: livro com `abbr` e `components`; itens escolhidos pelo prefixo do id; vagas e concessões; fórmula recursiva; índice com `abbr`; documento v1 com `text`, sem `name` no topo nem `level`.
  - Regras de formato da §3.1 (`requires` só para trás, `step` de concessão existente, `ref` resolvido) como `superRefine` com caminho.
  - Atualizar os tipos exportados e os testes de `schemas.test.ts` e `load.test.ts` (pacotes fictícios).
  - **Pronto quando:** os testes passam para:
    - livro válido;
    - campo de texto num item recusado;
    - prefixo desconhecido recusado;
    - `requires` para frente recusado;
    - documento do esqueleto recusado.

- [ ] **T2. Pacote do core: Dwarf, Human e regras-base** (design §4; FR-CONT-003 parcial, FR-STEP-003)
  - Reescrever `packs/sotdl.core.json` e `packs/index.json` no formato novo com os dados da tabela da §4, todos conferidos no PDF (impressa = PDF − 1).
  - Registrar no `docs/scaffold-notes.md`: a troca do documento v1 e o passo de apagar o banco de desenvolvimento.
  - **Pronto quando:**
    - `npm run packs:check` passa (schema estrito e nenhum id removido em relação ao `HEAD`);
    - um teste carrega o pacote real e encontra `ancestry:dwarf` e `ancestry:human` com os valores da §4.

- [ ] **T3. Fórmulas** (design §3.1 Fórmula, §3.3 `formatFormula`; FR-CALC-001)
  - `src/engine/formula.ts`: avaliação da árvore com `ref` (atributo, característica, `grant:`, `self`), `null` pendente que propaga, detecção de ciclo (`EngineError`) e `formatFormula`.
  - **Pronto quando:** os testes com pacote fictício passam para:
    - `add`, `div`, `round` e `min`/`max`;
    - pendente por `grant:` sem decisão;
    - ciclo acusado;
    - texto "Strength + 4", "Health / 4, rounded down" e "1/2 or 1".

- [ ] **T4. `resolve` real** (design §3.3 `Rules`; FR-SRC-010, FR-CONT-006)
  - `src/engine/resolve.ts`: itens vigentes dos componentes ligados, na ordem de fontes; procedência com livro, `abbr`, página e tipo `core`/`adds`; procedimento, etapas, atributos e características em ordem.
  - **Pronto quando:** os testes com dois livros fictícios passam para:
    - procedência e tipo;
    - componente `off` ignorado;
    - id repetido resolvido pelo primeiro da ordem.

- [ ] **T5. `evaluate`: árvore de vagas, estados de etapa e decisões abertas** (design §3.3 `CharacterView`; FR-FLOW-001 a 005, 009 (regime e contadores), 010, FR-DEC-011)
  - Vagas raiz e filhas com a gramática de chave; `status` por etapa (`locked`, `optional`, `not-started`, `open`, `done`) com `lockedBy` e contadores; `openDecisions` com etapa, origem e `kind`; decisão sem vaga viva ignorada.
  - **Pronto quando:** os testes com pacote fictício passam para:
    - personagem sem decisões: só a primeira etapa liberada;
    - escolha que libera as etapas;
    - concessões filhas com chave `ancestry=<x>/<grant>`;
    - contagem de pendências;
    - ordem das etapas igual à do procedimento.

- [ ] **T6. `evaluate`: resumo vivo, `preview`, `ancestryDetail` e linha de mecânica** (design §3.3; FR-FLOW-012, 013, 014, FR-STEP-001, 002, FR-CONT-009, FR-CALC-001)
  - `summary` com atributos, modificadores, características, `pendingOn` e ganhos; `preview` com `changes`; `ancestryDetail`; `mechanics` só com o que difere do padrão.
  - **Pronto quando:**
    - com o pacote real: Dwarf dá Health 14, Perception 11, Healing Rate 3, Speed 8, Size 1/2 e modificadores 0/−1/0/0;
    - Human sem Size dá Size pendente em `ancestry=human/size`;
    - o `preview` de Dwarf → Human lista as mudanças sem alterar o documento;
    - a linha do Dwarf contém "Health = Strength + 4";
    - renomear a entidade num pacote fictício mantém a decisão (FR-CONT-006).

- [ ] **T7. Sessão do personagem e comando `decide`** (design §3.2; FR-CHAR-010, FR-HELP-004, 005, NFR-REL-001; D8, D11)
  - `src/app/session.ts`: `createCharacterSession` com `open`, `subscribe`, `getSnapshot`, `decide` e `retrySave`; `createCharacter` grava o documento v1; `summarize` com nome da ancestralidade; gravações em série; `resolve` memoizado.
  - Remover o `openCharacter` do esqueleto.
  - **Pronto quando:** os testes do `app` (repositório em memória, fetch fictício) passam para:
    - abrir com sucesso;
    - **repositório que rejeita em `get` dá `storage-unavailable`, sem ficar em `loading`**;
    - documento inválido dá `unreadable`;
    - pacote ausente dá `pack-load-failed` sem gravar;
    - `decide` válido grava documento e metadados;
    - vaga desconhecida ou valor fora das opções recusados;
    - troca com dependente dá `has-dependents` sem mudança;
    - falha de gravação mantém o estado novo com `save: 'failed'`, e `retrySave` grava.

- [ ] **T8. Integração na ui: rotas, hook e Builder** (design §3.4; FR-FLOW-006, 007, 008, 009, 011, 018; FR-HELP-005)
  - `src/ui/router.ts`: `#/characters/:id/:step` e `?slot=`, redirecionamentos.
  - `src/ui/useCharacterSession.ts` sobre `useSyncExternalStore`.
  - `Builder` consome o snapshot e mostra as mensagens de erro de `open` (incluindo `storage-unavailable`), o aviso de `save: 'failed'` com "Try again" e o de `has-dependents`.
  - Componentes das telas pelo manifesto do ui-design.
  - **Pronto quando:**
    - os testes de rota passam;
    - **um teste de componente (jsdom) com sessão cujo repositório rejeita mostra a mensagem de `storage-unavailable` e nenhum "Loading…"**;
    - as telas renderizam conforme o manifesto do ui-design.

- [ ] **T9. E2E do caminho de criação até a ancestralidade** (UC-001 → UC-003 do fluxo crítico 1, ADR-008)
  - Atualizar o `e2e/skeleton.spec.ts` (mapa novo) e acrescentar um `e2e/ancestry.spec.ts`:
    - criar;
    - ver as etapas bloqueadas;
    - escolher Dwarf;
    - conferir o resumo (Health 14) e as etapas liberadas;
    - Next com pendência;
    - Human com Size adiado em Open decisions e atalho;
    - recarregar e manter;
    - axe sem violação grave no construtor com escolha feita;
    - viewport de celular.
  - **Pronto quando:** `npm run e2e` passa nos 5 projetos contra o build local.

- [ ] **T10. Verificação** (design §6)
  - AC-1 a AC-13 demonstrados por testes ou pelo E2E.
  - `npm run typecheck`, `lint` (fronteiras), `test`, `packs:check`, `e2e` e `lighthouse` verdes.
  - Nenhum texto do livro em `packs/` nem em `src/`.
  - **Pronto quando:** todos os comandos passam e cada AC aponta para o teste que o cobre.
