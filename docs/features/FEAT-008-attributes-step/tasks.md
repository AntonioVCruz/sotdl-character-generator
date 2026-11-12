# Tasks: FEAT-008 — Etapa Attributes: ajuste ±1, características com fórmula e composição

> Executa: `docs/features/FEAT-008-attributes-step/technical-design.md`
> Status: pending · Última atualização: 2026-11-12
> Tela (SCR-WEB-005): do ui-design, pelo `docs/design-manifest.json`. As tarefas de ui aqui são só integração.

- [x] **T1. Schemas: vaga `attribute-shift`, limites e decisão em par** (design §3.1, §4; FR-STEP-009, FR-CALC-006; ADR-004 §2; D8)
  - Em `src/content/schemas.ts`:
    - `SlotDef` como união discriminada (`choose-entity`, `attribute-shift`), com `optional?: true`;
    - `limits` em `characteristic`, com pelo menos um limite;
    - `AttributeShift` na união de `decisions[key].value`;
    - tipos exportados.
  - Regras de formato:
    - referências dos limites resolvidas, sem `self` nem `grant:`;
    - limites como arestas no grafo de ciclos de cada ancestralidade.
  - **Pronto quando:** os testes de `schemas.test.ts` (pacotes fictícios) passam para:
    - `FR-CALC-006`: limite válido aceito; limite com id inexistente, `self` ou `grant:` recusado com caminho; ciclo que passa por um limite recusado com caminho;
    - `FR-STEP-009`: `attribute-shift` com `amount` 1 aceito e com `amount` 0 recusado; documento com `{ decrease, increase }` aceito e com campo a mais recusado.
  - Os testes existentes continuam verdes, e `npm run typecheck` e `npm run lint` passam.

- [x] **T2. Motor: vaga `attribute-shift`, vaga opcional, estado da etapa e estágio `modifier`; vaga do ajuste no pacote** (design §3.3 "Vaga `attribute-shift`", "Estado da etapa" e "Composição", §4; FR-STEP-007, 009, FR-CALC-002; D1, D2, D5, D6)
  - Em `src/engine/evaluate.ts`:
    - a vaga na árvore, com opções e decisão válida;
    - vaga `optional` fora de `decided`, `open`, `total`, `openDecisions` e `locked`;
    - a regra nova de `status` da etapa;
    - dois efeitos `modifier` com origem `slot`, e a variante `modifier` de `Stage`;
    - `preview` com `DecisionValue`.
  - Em `packs/sotdl.core.json`: `slots.adjustment` de `step:attributes` (tabela da §4).
  - Em `src/ui`, só o que a variante nova exige; a tela vem na T6:
    - `builder/copy.ts`: o rótulo do `kind` `attribute-shift` em `decisionTitle` (rascunho da §3.4), para o `switch` continuar exaustivo;
    - `builder/LiveSummary.tsx`: `stageLabel` trata a parcela `modifier`, cuja origem `slot` não tem `name`, com o rótulo "Score adjustment" do ui-design;
    - `builder/FallbackStep.tsx`: ignora vagas `optional`, para o ajuste do Dwarf não aparecer como pendência até a T6.
  - **Pronto quando:** os testes passam para:
    - `evaluate.test.ts`, com pacote fictício:
      - `FR-STEP-009`: o par aplica −1 e +1 com a origem da vaga, e decisão inválida (mesmo atributo, id que não é atributo) é ignorada;
      - `FR-STEP-009`: a vaga opcional não bloqueia, não é pendência e não conta;
      - `FR-STEP-009`: outra etapa e outro nome de vaga funcionam igual (AC-10);
      - `FR-FLOW-014`: `preview` com par lista atributos e características que mudam;
      - `FR-CALC-002`: total do atributo igual à soma das parcelas `base` e `modifier`;
      - `FR-FLOW-001`: etapa só com vaga opcional fica `done`; com obrigatória concedida aberta, `open`; sem vagas, `not-started`;
    - `core-view.test.ts`, com o pacote real:
      - `FR-STEP-007`: os quatro atributos do Dwarf com modificador e composição;
      - `FR-FLOW-001`: Attributes `done` com Dwarf; Attributes e Professions & languages `open` com Human (AC-15);
      - as duas expectativas da FEAT-007 que mudam (design §7): `FR-FLOW-014: preview of Dwarf → Human…` com Attributes `done → open` e Professions & languages `not-started → open`, e `FR-FLOW-014: preview from no ancestry…` com Attributes `locked → done`;
    - `session.test.ts`: a terceira expectativa da FEAT-007 que muda (design §7), `FR-CONT-006: renaming the entity in the pack…`, com os estados `['done', 'open']`;
    - `core-pack.test.ts`: a vaga `adjustment` de `step:attributes`;
    - `Builder.test.tsx`: `FR-STEP-009: the optional adjustment slot is not shown as pending in the step` (Dwarf na etapa Attributes, sem "It stays in Open decisions");
    - `npm run typecheck`, `npm run lint`, `npm run packs:check` (nenhum id removido), `npm test` e `npm run e2e` verdes.

- [x] **T3. Motor: estágio `limit` e acabamento; limites e regime no pacote** (design §3.3 "Ordem de cálculo", "Composição" e "Linha legível", §4; FR-CALC-003, 005, 006, 007, 008, 009; D5, D7, D8)
  - Em `src/engine/formula.ts`: passo de acabamento por id em `evaluateFormulas`, para que a referência leia o total; referências de limite pelo mesmo resolvedor, com detecção de ciclo.
  - Em `src/engine/evaluate.ts`:
    - ordem fixa `base → modifier → define → sum → limit → manual`; só `base`, `modifier` e `limit` produzem parcelas;
    - a variante `limit` de `Stage`;
    - `limits` em `CharacteristicSummary`.
  - Em `packs/sotdl.core.json`: `regime: 'choice'` de `step:attributes` e os quatro limites (tabela da §4, já conferidos; impressa = PDF − 1).
  - Em `src/ui/builder/LiveSummary.tsx`: `stageLabel` trata a parcela `limit` com os rótulos do ui-design, "Capped at {limite}" e "Raised to minimum {limite}".
  - **Pronto quando:** os testes passam para:
    - `evaluate.test.ts` e `formula.test.ts`, com pacote fictício. O efeito de `modifier` vem de uma vaga `attribute-shift` decidida no documento, pela T2, sem injeção pelo teste:
      - `FR-CALC-005`: parcelas na ordem; limite depois do modificador; referência lê o valor limitado;
      - `FR-CALC-006`, `FR-CALC-007`: máximo corta com parcela negativa; mínimo sobe; máximo por atributo; sem parcela quando não corta; limite pendente não corta;
      - `FR-CALC-008`: `down`, `up` e `nearest` diferentes; valor sem `round` fracionário;
      - `FR-CALC-002`: total igual à soma das parcelas em todos os atributos e características;
    - `core-view.test.ts`, com o pacote real:
      - `FR-CALC-003`: fórmula e limites legíveis das dez características;
      - `FR-CALC-009`: os valores da AC-5 (Dwarf e Human);
    - `core-pack.test.ts`: `FR-CALC-006: the core pack declares the Defense, Perception, Healing Rate and Insanity limits`;
    - `npm run typecheck`, `npm run lint`, `npm run packs:check`, `npm test` e `npm run e2e` verdes.

- [x] **T4. Sessão: `decide` com par, `already-decided` e `clear`** (design §3.2; FR-STEP-009, 010, 011; D3, D4)
  - Em `src/app/session.ts`: validação do par; recusa em vaga `attribute-shift` decidida; `clear(key)`; cálculo de dependentes num ajudante comum a `decide` e `clear`.
  - **Pronto quando:** os testes de `session.test.ts` (repositório em memória, pacote fictício) passam para:
    - `FR-STEP-009`: aplicar grava só o par, e a tela muda antes da gravação;
    - `FR-STEP-010`: segunda tentativa devolve `already-decided`, sem mudar nem gravar; par inválido devolve `invalid-value`;
    - `FR-STEP-011`: `clear` restaura os dois atributos, grava o documento sem a chave e permite um ajuste novo; `clear` de vaga sem decisão devolve `not-decided`;
    - `FR-STEP-011`: `clear` com filhas decididas devolve `has-dependents`; `clear` do Size seguido da troca de ancestralidade aplica direto (AC-11);
    - `FR-STEP-011`: falha de gravação no `clear` mantém o estado, e o `retrySave` grava.
  - `npm run typecheck` e `npm run lint` passam.

- [x] **T5. Guarda de tempo do `evaluate`** (design §5, "Guarda unitária"; NFR-PERF-002; ADR-008)
  - `src/engine/evaluate.perf.test.ts`, 200 execuções por caso:
    - o pacote real, com Human, Size e ajuste decididos;
    - o pacote fictício do porte da §5: 36 vagas decididas, 20 efeitos, 4 modificadores e 10 características com fórmula numa cadeia de profundidade 3, e 4 limites.
  - **Pronto quando:** passam local e no CI:
    - `NFR-PERF-002: evaluate of the most complete core character stays under 20 ms at p95`;
    - `NFR-PERF-002: evaluate of a complete level 0 sized fixture (36 decisions, 20 effects, 14 formulas and 4 limits) stays under 20 ms at p95`.
  - `npm run typecheck` e `npm run lint` passam.

- [ ] **T6. ui: integração da etapa Attributes** (design §3.4; SCR-WEB-005 do ui-design; FR-STEP-007 a 011, FR-STEP-008 só exibição, FR-CALC-002, 003, 007)
  - Integração apenas; o desenho da tela, os estados e os textos são do ui-design:
    - `Builder` despacha `attribute-shift` para a nova `AttributesStep`;
    - a `AttributesStep` consome os dados da tabela da §3.4: `preview`, `decide` e `clear`;
    - com o ajuste aplicado, os dois grupos ficam só leitura (`isReadOnly`), com o motivo e "Undo adjustment" visíveis (ui-design, estado `applied`);
    - o +1 do Human aparece como pendência sem controle, com o id da vaga para o atalho;
    - o `FallbackStep` deixa de servir a Attributes;
    - a composição da etapa usa os rótulos das parcelas `modifier` e `limit` que o `LiveSummary` já tem (T2, T3);
    - o contador do cabeçalho na etapa `done` só com a vaga opcional, como o ui-design definir;
    - `e2e/ancestry.spec.ts`: o título da etapa Attributes passa do fallback para a pergunta do ui-design (design §7).
  - **Pronto quando:**
    - a tela renderiza conforme o ui-design no desktop, no intermediário e no celular, conferida por screenshot;
    - os testes de componente passam:
      - `Builder.test.tsx` `FR-STEP-010: a second adjustment is refused and the step offers to undo the current one`: clicar num segmento com o ajuste aplicado não chama `decide`, o par aplicado continua selecionado, e o motivo e "Undo adjustment" estão visíveis;
      - composição com parcelas de ajuste e de limite (`FR-CALC-002`, `FR-CALC-007`);
    - `npm run typecheck` e `npm run lint` passam (fronteiras da §5.2);
    - `npm run e2e` passa nos 5 projetos.

- [ ] **T7. E2E de desempenho** (design §5, método da NFR-PERF-002; AC-13)
  - `e2e/perf.spec.ts`, só nos projetos `chromium` e `mobile-chrome` (com 4× de CPU no segundo), com a medida, os elementos observados por layout, as amostras e o anexo JSON da §5.
  - **Pronto quando:** `NFR-PERF-002: after a decision the step and the live summary update within 100 ms (desktop) and 200 ms (mobile) at p95` passa contra o build local, o JSON aparece no relatório do Playwright, e `npm run typecheck` e `npm run lint` passam.

- [ ] **T8. E2E do fluxo crítico 1 até o UC-004** (ADR-008 fluxo 1; UC-004; AC-14)
  - `e2e/attributes.spec.ts`, nos 5 projetos, contra o build. Cada teste começa em "New character" pela interface e escolhe a ancestralidade como o `ancestry.spec.ts`, sem semear o IndexedDB. Os ajudantes `createCharacter` e `watchCsp` passam para um módulo comum de `e2e/`, usado pelos dois specs.
  - Testes:
    - `FR-STEP-007, FR-CALC-003: from New character, a Dwarf sees the four attributes and the ten characteristics with formula, limits and value`;
    - `FR-STEP-009, FR-CALC-002, FR-CALC-009: applying Strength −1 / Intellect +1 updates the step and the live summary (Strength 9, Intellect 11, Perception 12, Health 13)`;
    - `FR-STEP-010: a second adjustment is refused and the step offers to undo`;
    - `FR-STEP-011, FR-CALC-009: undoing restores the scores, a new adjustment applies, and it survives reload`;
    - `FR-STEP-008: a Human sees the +1 as pending in Attributes, and the Open decisions shortcut focuses it` (só a exibição);
    - `NFR-ACC-001: the Attributes step with an adjustment applied has no serious axe violations`.
  - **Pronto quando:** `npm run e2e` passa nos 5 projetos, sem violação de CSP, e `npm run typecheck` e `npm run lint` passam.

- [ ] **T9. Verificação** (design §6)
  - Rodar `npm run typecheck`, `npm run lint`, `npm test`, `npm run packs:check`, `npm run build` e `npm run e2e`.
  - Conferir cada AC-1 a AC-15 contra o teste que a cobre. Todo teste novo começa pelo FR ou NFR que verifica (NFR-MAINT-002).
  - Confirmar que nenhum arquivo de produção de `src/engine` (fora `*.test.ts`) cita id de livro, de etapa ou de ancestralidade. Os testes com o pacote real podem citar Dwarf, Human e nomes de etapa (ADR-003).
  - **Pronto quando:** tudo verde local e no CI, e cada critério tem teste apontado.
