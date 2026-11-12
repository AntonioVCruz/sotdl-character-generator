# Tasks: FEAT-008 — Etapa Attributes: ajuste ±1, características com fórmula e composição

> Executa: `docs/features/FEAT-008-attributes-step/technical-design.md`
> Status: pending · Última atualização: 2026-11-12
> Tela (SCR-WEB-005): do ui-design, pelo `docs/design-manifest.json`. As tarefas de ui aqui são só integração.

- [ ] **T1. Schemas: vaga `attribute-shift`, limites e decisão em par** (design §3.1, §4; FR-STEP-009, FR-CALC-006; ADR-004 §2; D8)
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
  - Os testes existentes continuam verdes.

- [ ] **T2. Pacote do core: vaga do ajuste, regime e limites** (design §4; D7)
  - Acrescentar a `packs/sotdl.core.json` os dados da tabela da §4, já conferidos (impressa = PDF − 1).
  - **Pronto quando:**
    - `npm run packs:check` passa (nenhum id removido);
    - `src/content/core-pack.test.ts` confere a vaga `adjustment` de `step:attributes` e os quatro limites (`FR-CALC-006: the core pack declares the Defense, Perception, Healing Rate and Insanity limits`).

- [ ] **T3. Motor: estágios, limites e composição** (design §3.3 "Ordem de cálculo" e "Composição"; FR-CALC-002, 005, 006, 007, 008, 009; D5, D8)
  - Em `src/engine/formula.ts`: passo de acabamento por id em `evaluateFormulas`, para que a referência leia o total; referências de limite pelo mesmo resolvedor, com detecção de ciclo.
  - Em `src/engine/evaluate.ts`:
    - ordem fixa `base → modifier → define → sum → limit → manual`, alimentada por efeitos com origem; só `base`, `modifier` e `limit` produzem parcelas;
    - `Stage` com as variantes `modifier` e `limit`;
    - `limits` em `CharacteristicSummary`.
  - **Pronto quando:** os testes de `evaluate.test.ts` e `formula.test.ts` (pacotes fictícios, efeito de `modifier` injetado pelo teste) passam para:
    - `FR-CALC-005`: parcelas na ordem; limite depois do modificador; referência lê o valor limitado;
    - `FR-CALC-006`, `FR-CALC-007`: máximo corta com parcela negativa; mínimo sobe; máximo por atributo; sem parcela quando não corta; limite pendente não corta;
    - `FR-CALC-008`: `down`, `up` e `nearest` diferentes; valor sem `round` fracionário;
    - `FR-CALC-002`: total igual à soma das parcelas em todos os atributos e características.
  - Os testes da FEAT-007 continuam verdes sem mudança.

- [ ] **T4. Motor: vaga `attribute-shift` e efeitos do ajuste** (design §3.3 "Vaga `attribute-shift`"; FR-STEP-007, 009, FR-CALC-003, 009; D1, D2, D6)
  - Em `src/engine/evaluate.ts`:
    - a vaga na árvore, com opções e decisão válida;
    - vaga `optional` fora de `decided`, `open`, `total`, `openDecisions` e `locked`;
    - dois efeitos `modifier` com origem `slot`;
    - `preview` com `DecisionValue`.
  - **Pronto quando:** os testes passam para:
    - `evaluate.test.ts`, com pacote fictício:
      - `FR-STEP-009`: o par aplica −1 e +1 com a origem da vaga, e decisão inválida (mesmo atributo, id que não é atributo) é ignorada;
      - a vaga opcional não bloqueia, não é pendência e não conta;
      - outra etapa e outro nome de vaga funcionam igual (AC-10);
      - `preview` com par lista atributos e características que mudam;
    - `core-view.test.ts`, com o pacote real:
      - `FR-STEP-007`: os quatro atributos do Dwarf com modificador e composição;
      - `FR-CALC-003`: fórmula e limites legíveis das dez características;
      - `FR-CALC-009`: os valores da AC-5 (Dwarf e Human).

- [ ] **T5. Sessão: `decide` com par, `already-decided` e `clear`** (design §3.2; FR-STEP-009, 010, 011; D3, D4)
  - Em `src/app/session.ts`: validação do par; recusa em vaga `attribute-shift` decidida; `clear(key)`; cálculo de dependentes num ajudante comum a `decide` e `clear`.
  - **Pronto quando:** os testes de `session.test.ts` (repositório em memória, pacote fictício) passam para:
    - `FR-STEP-009`: aplicar grava só o par, e a tela muda antes da gravação;
    - `FR-STEP-010`: segunda tentativa devolve `already-decided`, sem mudar nem gravar; par inválido devolve `invalid-value`;
    - `FR-STEP-011`: `clear` restaura os dois atributos, grava o documento sem a chave e permite um ajuste novo; `clear` de vaga sem decisão devolve `not-decided`;
    - `clear` com filhas decididas devolve `has-dependents`; `clear` do Size seguido da troca de ancestralidade aplica direto (AC-11);
    - falha de gravação no `clear` mantém o estado e o `retrySave` grava.

- [ ] **T6. Guarda de tempo do `evaluate`** (design §5, NFR-PERF-002; ADR-008)
  - Teste em `src/engine/core-view.test.ts` ou num arquivo `*.perf.test.ts` ao lado: pacote real, Human com Size e ajuste decididos, 200 execuções.
  - **Pronto quando:** o teste `NFR-PERF-002: evaluate of the most complete level 0 character stays under 20 ms at p95` passa local e no CI.

- [ ] **T7. ui: integração da etapa Attributes** (design §3.4; SCR-WEB-005 do ui-design; FR-STEP-007 a 011, FR-STEP-008 só exibição, FR-CALC-002, 003, 007)
  - Integração apenas; o desenho da tela, os estados e os textos são do ui-design:
    - `Builder` despacha `attribute-shift` para a nova `AttributesStep`;
    - a `AttributesStep` consome os dados da tabela da §3.4: `preview`, `decide`, `clear`, e `already-decided` para oferecer desfazer;
    - o +1 do Human aparece como pendência sem controle, com o id da vaga para o atalho;
    - o `FallbackStep` deixa de servir a Attributes;
    - `LiveSummary` e `copy.ts` rotulam as parcelas `modifier` e `limit` e o `kind` `attribute-shift`.
  - **Pronto quando:**
    - a tela renderiza conforme o ui-design no desktop, no intermediário e no celular, conferida por screenshot;
    - os testes de componente passam: `Builder.test.tsx` `FR-STEP-010: a second adjustment is refused and the step offers to undo the current one`; composição com parcelas de ajuste e de limite (`FR-CALC-002`, `FR-CALC-007`);
    - `npm run lint` passa (fronteiras da §5.2).

- [ ] **T8. E2E de desempenho** (design §5, método da NFR-PERF-002; AC-13)
  - `e2e/perf.spec.ts`, só nos projetos `chromium` e `mobile-chrome` (com 4× de CPU no segundo), com a medida, as amostras e o anexo JSON da §5.
  - **Pronto quando:** `NFR-PERF-002: after a decision the step and the live summary update within 100 ms (desktop) and 200 ms (mobile) at p95` passa contra o build local, e o JSON aparece no relatório do Playwright.

- [ ] **T9. E2E do fluxo crítico 1 até o UC-004** (ADR-008 fluxo 1; UC-004; AC-14)
  - `e2e/attributes.spec.ts`, nos 5 projetos, contra o build:
    - Dwarf: ver os quatro atributos e as características, aplicar Strength −1 / Intellect +1, conferir etapa e resumo (Strength 9, Intellect 11, Perception 12, Health 13), tentar de novo e ver a oferta de desfazer, desfazer, aplicar outra vez e recarregar;
    - Human: o +1 como pendência na etapa e o atalho de Open decisions focando nela;
    - axe sem violação grave na etapa com ajuste aplicado, num teste separado.
  - `e2e/ancestry.spec.ts`: o título da etapa Attributes passa do fallback para a pergunta do ui-design (design §7).
  - **Pronto quando:** `npm run e2e` passa nos 5 projetos, sem violação de CSP.

- [ ] **T10. Verificação** (design §6)
  - Rodar `npm run typecheck`, `npm run lint`, `npm test`, `npm run packs:check`, `npm run build` e `npm run e2e`.
  - Conferir cada AC-1 a AC-14 contra o teste que a cobre. Todo teste novo começa pelo FR ou NFR que verifica (NFR-MAINT-002).
  - Confirmar que nenhum arquivo de `src/engine` cita id de livro, de etapa ou de ancestralidade.
  - **Pronto quando:** tudo verde local e no CI, e cada critério tem teste apontado.
