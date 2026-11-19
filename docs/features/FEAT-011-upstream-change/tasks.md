# Tasks: FEAT-011 — Mudança a montante

> Executa: `docs/features/FEAT-011-upstream-change/technical-design.md` (e o `ui-design.md`, nas tarefas de interface)
> Status: T1 a T4 feitas · Última atualização: 2026-11-19 (emenda 4 do §8: ordem de execução e escopo da T5, T9, T10 e T11)
> Antes da T1: as emendas 1 a 3 do §8 aplicadas (C11). Todo "pronto quando" inclui `npm run typecheck` e `npm run lint` verdes, e as suítes das features anteriores verdes, salvo as expectativas do §7 que a própria tarefa muda (C8).
>
> **Ordem de execução (emenda 4 do §8):** T1 → T2 → T3 → T4 → **T5 → T7 → T9 → T6 → T10 → T8 → T11 → T12**. Os ids não mudam. Motivo (C8): a T5 tira o `has-dependents` do `DecideResult`, e os testes que dependem da recusa (§7, itens 11, 13 e 14) só mudam com o diálogo; o CI roda testes e E2E em todo push no `main`. A T9 vem logo depois da T5 para encurtar o intervalo vermelho, e a T7 antes da T9 porque o open-notice precisa do `notice` da sessão. **Sem push entre a T5 e a T9.**

- [x] T1 — Schema do documento e do log (design §4; FR-CHG-019)
      `setAside`, `logged`, `rolls` em `chosen` e `entered`, `earlier` com a regra "toda chave de `earlier` tem `decisions[k]`", e a união do `LogEntry` com `undone`, `set-aside` e `restored`, em `src/content/schemas.ts`.
      Pronto quando: os testes do AC-1 passam no `schemas.test.ts`, inclusive com os documentos e logs gravados até a FEAT-009.

- [x] T2 — Motor: candidatos, ativa e suspensas na visão (design §3.1; FR-CHG-012, 018, 019)
      Em `evaluate.ts`: candidatos por vaga, a ativa pela validade de cada `kind`, `candidate` na vaga decidida, `CharacterView.setAside` com o motivo e a vaga, e `parentKey`. Nenhuma leitura de `setAside`.
      Pronto quando: os testes do AC-2 passam no `evaluate.test.ts` com pacote fictício, e o `evaluate.test.ts` e o `core-view.test.ts` existentes passam sem mudança.

- [x] T3 — Motor: `impact` e `settle` (design §3.1; FR-CHG-001 a 006, 012, 018)
      `src/engine/impact.ts` (novo), exportado pelo `engine`.
      Pronto quando: os testes do AC-3 e do AC-4 passam (novo `impact.test.ts`), com troca de ancestralidade, neta `roll-effect`, só restauração, recalculados antigo → novo, reabertas, igualdade de `settle` e `impact` no candidato, e documento assentado sem mudança.

- [x] T4 — `app`: regras de escrita e entradas de log (design §3.2, tabela "Regras de escrita" e "Entradas de log novas"; FR-LOG-007, FR-CHG-011)
      `src/app/changes.ts` (novo), funções puras: substituição com a ativa no índice 0 e em `earlier`, vaga reaberta, `clear`, `logged` na nova, e entradas `undone`, `set-aside` e `restored` com `ref`, `by` e `cause`.
      Pronto quando: os testes unitários das cinco linhas da tabela e da ordem das entradas passam (parte de escrita do AC-10).

- [x] T5 — Sessão: pipeline comum, mudança pendente, troca de ancestralidade, Choose → Choose e `clear` (design §3.2; FR-STEP-005, FR-CHG-001, 002, 008, 009, 011, 019; FR-DEC-017; FR-LOG-007)
      O pipeline substitui o `commit` com `has-dependents`; `pending`, `confirm`, `keep` e `change-pending`; `clear` novo; hora do Apply (D8). As expectativas 1 a 5 e 7 a 9 do §7 mudam aqui, e a 10 inteira (o `logged` nas comparações exatas do `Builder.test.tsx`, que a sessão desta tarefa passa a gravar). Reroll, troca de modo e contador ficam para a T6: `roll` e `enter` numa vaga decidida, e `decide` numa tabela rolada ou informada, continuam como hoje.
      Na interface, só o mínimo para compilar: o `AncestryStep` e o `TablesStep` deixam de tratar `has-dependents`, sem estado nem texto novo (a interface nova é da T9 e da T10).
      Pronto quando: os testes do AC-5, AC-6, AC-7 (ancestralidade e Choose → Choose), AC-10 (sessão), AC-11, AC-12, AC-14 e AC-17 (sessão, gravação retida e falha) passam no `session.test.ts`; typecheck e lint verdes; as suítes verdes, salvo os testes das expectativas 11 e 13 (o caso do dependents-blocked) e 14 do §7, que ficam vermelhos até a T9.

- [ ] T6 — Sessão: Reroll, troca de modo e contador (design §3.2, "Comandos" e "Contador"; D5; FR-DEC-015, 016, 018; FR-CHG-010)
      `roll` e `enter` em vaga decidida, `decide` numa tabela rolada ou informada, `rolls` da vaga, e o `keep` da rerrolagem com a `decision` recusada, a `undone` `declined` e o `rolls` da ativa. A expectativa 6 do §7 muda aqui.
      Pronto quando: os testes do AC-7 (Reroll na mesma entrada), AC-8 e AC-9 passam, com sorteio fixo.

- [ ] T7 — Sessão: abrir com versão nova do pacote (design §3.2, "Abrir"; D4; FR-CONT-015, 016)
      `settle` no `open`, `notice`, `dismissNotice`, uma gravação com a marca, as entradas e o metadado, e falha com `retrySave`.
      Pronto quando: os testes do AC-13 (i) a (v) passam, com duas instâncias do app e o fetch falso servindo duas versões do pacote fictício, e a abertura sem diferença continua sem gravar.

- [ ] T8 — Guardas de desempenho (design §5; NFR-PERF-002, 003)
      Fixture com suspensas acumuladas (vagas não geradas e vagas com vários candidatos) e os casos de `evaluate` e `impact` em `evaluate.perf.test.ts`.
      Pronto quando: os casos da parte unitária do AC-16 passam, com os p95 no console.

- [ ] T9 — UI: diálogo de impacto, troca de ancestralidade e aviso ao abrir (design §3.3; ui-design; SCR-WEB-007, SCR-WEB-003)
      Só a integração: o diálogo pelo `snapshot.pending`, Apply e Keep current, o `AncestryStep` sem o aviso de `has-dependents`, o `notice` com `dismissNotice` e a linha "N set aside". As telas são do `design-manifest.json`. Mudam aqui, como o §7 as emendou: a expectativa 11 (emenda M1: depois do Keep, a prévia continua aberta, e "Choose {New}" recebe o foco); a 14, no `e2e/ancestry.spec.ts`; e a parte da 13 em que o Choose → Choose com dependentes abre o diálogo da moldura e o Keep deixa a grade na entrada 4 (l.973–988, com a saída do "aviso sai na próxima ação"), porque o diálogo é genérico, pelo `pending`. O `LOCKED_*` e o Reroll ficam para a T10.
      Pronto quando: os testes de componente do diálogo e da Ancestry passam no `Builder.test.tsx`, incluindo os estados do ui-design e a gravação retida do AC-17, e as telas conferem com o manifesto; todas as suítes verdes, unitárias e E2E nos 5 projetos.

- [ ] T10 — UI: tabela decidida com Reroll, troca de modo e dependentes (design §3.3; ui-design; SCR-WEB-009)
      Só a integração: os modos da tabela e da `roll-effect` decididas no lugar de `LOCKED_*` (o diálogo no lugar do `dependents-blocked` já vem da T9). Mudam aqui, como o §7 as emendou: a expectativa 12 (emenda M1: decided-roll e decided-choose do ui-design) e o resto da 13 (effect-reroll no lugar do `LOCKED_ROLLED` da `roll-effect`, l.966).
      Pronto quando: os testes de componente da Story passam no `Builder.test.tsx`, com sorteio fixo, e a tela confere com o manifesto.

- [ ] T11 — E2E do fluxo crítico 2 e tempo do diálogo (design §6, AC-15 e AC-16; ADR-008 fluxo 2; UC-010)
      `e2e/impact.spec.ts` (novo): Dwarf → Human → recarregar → Dwarf, Keep current e axe com o diálogo. Caso NFR-PERF-003 no `perf.spec.ts`. (A expectativa 14 do §7 passou à T9, emenda 4.) Localizadores pelos seletores do §7 (C1). No `firefox`, o caso do axe com o diálogo aberto segue o contorno do `docs/scaffold-notes.md` (regra do Firefox 1572 com o axe e `aria-labelledby`, FEAT-009 T9): página nova no mesmo contexto, o diálogo reaberto sem localizador por nome sobre elementos com `aria-labelledby`, e o axe nela.
      Pronto quando: `npm run e2e` passa nos 5 projetos com `--retries=0 --workers=1`, e o p95 do diálogo fica ≤ 300 ms em `chromium` e `mobile-chrome` 4×.

- [ ] T12 — Verificação (design §6)
      Os AC-1 a AC-17 demonstrados. `npm run typecheck`, `lint`, `test`, `packs:check`, `build` e `e2e` verdes. Cada FR-CHG e FR-DEC do cabeçalho tem teste com o FR no nome (NFR-MAINT-002), e as mudanças de teste batem com o §7.
      Pronto quando: todas as suítes estão verdes, sem retry, e cada critério tem um teste que o demonstra.
