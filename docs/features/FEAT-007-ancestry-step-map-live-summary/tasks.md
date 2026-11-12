# Tasks: FEAT-007 — Etapa Ancestry, mapa de etapas e resumo vivo

> Executa: `docs/features/FEAT-007-ancestry-step-map-live-summary/technical-design.md`
> Status: pending · Última atualização: 2026-11-12
> Telas (SCR-WEB-003, SCR-WEB-016): do ui-design, pelo `docs/design-manifest.json`. As tarefas de ui aqui são só integração.

- [ ] **T1. Schemas do pacote e do documento v1** (design §3.1, §4; FR-CONT-004, 006; ADR-004 §2; D1–D4)
  - Em `src/content/schemas.ts`: livro com `abbr` e `components`; itens escolhidos pelo prefixo do id; vagas e concessões; fórmula recursiva; índice com `abbr`; documento v1 com `text`, sem `name` no topo nem `level`.
  - Regras de formato da §3.1 como `superRefine` com caminho:
    - `requires` só para trás;
    - nome de vaga raiz único no procedimento;
    - `step` de concessão existente;
    - `ref` resolvido;
    - nenhum ciclo entre fórmulas.
  - Atualizar os tipos exportados e os testes de `schemas.test.ts` e `load.test.ts` (pacotes fictícios).
  - **Pronto quando:** os testes passam para:
    - livro válido;
    - campo de texto num item recusado;
    - prefixo desconhecido recusado;
    - `requires` para frente recusado;
    - nome de vaga raiz repetido recusado;
    - ciclo entre fórmulas (padrão e de ancestralidade) recusado, com o caminho da fórmula no erro;
    - documento do esqueleto recusado.

- [ ] **T2. Pacote do core: Dwarf, Human e regras-base** (design §4; FR-CONT-003 parcial, FR-STEP-003)
  - Reescrever `packs/sotdl.core.json` e `packs/index.json` no formato novo com os dados da tabela da §4, todos conferidos no PDF (impressa = PDF − 1).
  - Registrar no `docs/scaffold-notes.md`: a troca do documento v1 e o passo de apagar o banco de desenvolvimento.
  - **Pronto quando:**
    - `npm run packs:check` passa (schema estrito e nenhum id removido em relação ao `HEAD`);
    - um teste carrega o pacote real e encontra `ancestry:dwarf` e `ancestry:human` com os valores da §4.

- [ ] **T3. Fórmulas** (design §3.1 Fórmula, §3.3 `formatFormula`; FR-CALC-001)
  - `src/engine/formula.ts`: avaliação da árvore com `ref` (atributo, característica, `grant:`, `self`), `null` pendente que propaga, detecção de ciclo como invariante (`EngineError`) e `formatFormula`.
  - **Pronto quando:** os testes com pacote fictício passam para:
    - `add`, `div`, `round` e `min`/`max`;
    - pendente por `grant:` sem decisão;
    - ciclo acusado como `EngineError` (invariante; a carga já recusa, no T1);
    - texto "Strength + 4", "Health / 4, rounded down" e "1/2 or 1".

- [ ] **T4. `resolve` real** (design §3.3 `Rules`; FR-SRC-010, FR-CONT-006)
  - `src/engine/resolve.ts`: itens vigentes dos componentes ligados, na ordem de fontes; procedência com livro, `abbr`, página e tipo `core`/`adds`; procedimento, etapas, atributos e características em ordem.
  - **Pronto quando:** os testes com dois livros fictícios passam para:
    - procedência e tipo;
    - componente `off` ignorado;
    - id definido em dois livros sem `revises`/`replaces` lança `EngineError` com o id e os dois livros.

- [ ] **T5. `evaluate`: árvore de vagas, estados de etapa e decisões abertas** (design §3.3 `CharacterView`; FR-FLOW-001 a 005, 009 (regime e contadores), 010, FR-DEC-011)
  - Vagas raiz e filhas com a gramática de chave; `status` por etapa (`locked`, `optional`, `not-started`, `open`, `done`) com `lockedBy` e contadores; `openDecisions` com etapa, origem e `kind`; decisão sem vaga viva ignorada.
  - **Pronto quando:** os testes com pacote fictício passam para:
    - personagem sem decisões: só a primeira etapa liberada;
    - **Human com Size em aberto: as demais etapas ficam liberadas** (vaga concedida não bloqueia; só vaga raiz de etapa em `requires`);
    - escolha que libera as etapas;
    - concessões filhas com chave `ancestry=<x>/<grant>`;
    - contagem de pendências;
    - ordem das etapas igual à do procedimento.

- [ ] **T6. `evaluate`: resumo vivo, `preview`, `ancestryDetail` e linha de mecânica** (design §3.3; FR-FLOW-012, 013, 014, FR-STEP-001, 002, FR-CONT-009, FR-CALC-001)
  - `summary` com atributos, modificadores, características, `pendingOn`, ganhos e `composition` com o termo base e a origem; `preview` com `changes`; `ancestryDetail`; `mechanics` só com o que difere do padrão.
  - **Pronto quando:**
    - com o pacote real: Dwarf dá Health 14, Perception 11, Healing Rate 3, Speed 8, Size 1/2 e modificadores 0/−1/0/0;
    - Human sem Size dá Size pendente em `ancestry=human/size`;
    - `composition`: Strength do Dwarf com origem `ancestry` (Dwarf, 10); Health com origem `ancestry` e fórmula "Strength + 4"; Healing Rate com origem `default` (`characteristic:healing-rate`);
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
    - **`resolve` ou `evaluate` que lança `EngineError` dá `pack-load-failed`, sem gravar e sem ficar em `loading`**;
    - `decide` válido grava documento e metadados;
    - vaga desconhecida ou valor fora das opções recusados;
    - troca com dependente dá `has-dependents` com as chaves, sem mudança;
    - **decisão que já era órfã antes da mudança não bloqueia**: só contam as vagas vivas antes e mortas depois;
    - falha de gravação mantém o estado novo com `save: 'failed'`, e `retrySave` grava.

- [ ] **T8. Integração na ui: rotas, sessão e estados do Builder** (comportamental; design §3.4; FR-FLOW-006, 007, 008, 009, 011; FR-CHAR-010, FR-HELP-005)
  - `src/ui/router.ts`: `#/characters/:id/:step` e `?slot=`, redirecionamento para a primeira etapa e de etapa bloqueada para a primeira liberada.
  - `src/ui/useCharacterSession.ts` sobre `useSyncExternalStore`.
  - `Builder`: estados `loading`, `error` (as quatro razões de `open`), `ready`; aviso de `save: failed` com "Try again"; aviso de `has-dependents` que nomeia a escolha que impede; textos de fallback e rótulos de regime da §3.4.
  - **Pronto quando:**
    - os testes de rota passam (`:step`, `?slot=`, redirecionamentos);
    - **testes de componente (jsdom)** passam para:
      - sessão cujo repositório rejeita mostra a mensagem de `storage-unavailable` e nenhum "Loading…";
      - `save: failed` mostra o aviso, e "Try again" chama `retrySave`;
      - `has-dependents` mostra o aviso com o nome da escolha (ex.: Size do Human).

- [ ] **T9. Telas do SCR-WEB-003 e do SCR-WEB-016** (realização; design §3.4; FR-STEP-001, 002, 003, FR-FLOW-001, 009, 010, 012, 014, 018)
  - Componentes e layout pelo manifesto do ui-design (`docs/design-manifest.json`), consumindo o snapshot do T8 e o `preview`/`ancestryDetail` do engine.
  - **Pronto quando:** as duas telas renderizam e seguem a spec do ui-design, no desktop e abaixo de 768px.

- [ ] **T10. E2E do caminho de criação até a ancestralidade** (UC-001 → UC-003 do fluxo crítico 1, ADR-008)
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

- [ ] **T11. Verificação** (design §6)
  - AC-1 a AC-13 demonstrados por testes ou pelo E2E.
  - `npm run typecheck`, `lint` (fronteiras), `test`, `packs:check`, `e2e` e `lighthouse` verdes.
  - Nenhum texto do livro em `packs/` nem em `src/`.
  - **Pronto quando:** todos os comandos passam e cada AC aponta para o teste que o cobre.
