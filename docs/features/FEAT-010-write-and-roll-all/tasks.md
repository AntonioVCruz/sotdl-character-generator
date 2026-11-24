# Tasks: FEAT-010 — Write e "Roll all undecided"

> Executa: `docs/features/FEAT-010-write-and-roll-all/technical-design.md` (e o `ui-design.md`, nas tarefas de interface)
> Status: nenhuma feita · Última atualização: 2026-11-24
> Antes da T1: as emendas 1 a 3 do §8 aplicadas, e o `ui-design.md` desta feature pronto antes da T5 (C11). Todo "pronto quando" inclui `npm run typecheck` e `npm run lint` verdes, e as suítes das features anteriores verdes, salvo as expectativas do §7 que a própria tarefa muda (C8). Vitest a partir de `C:` maiúsculo; E2E por `npx playwright test …` (C24).

- [ ] T1 — Schema do documento e do log (design §4; ADR-004 §1; ADR-005)
      Em `src/content/schemas.ts`: o modo `written` na `decisionSchema`, com `text` de 1 a 2.000 caracteres e sem espaço nas pontas, `rolls`, `book`, `setAside` e `logged` opcionais; `'written'` no `mode` da `decisionEntrySchema` e `{ text }` no `result`.
      Os leitores que deixam de compilar com o modo novo recebem o ramo `written` mínimo, sem comportamento novo, porque nenhuma escrita nasce antes da T3: `tableResult` (`src/engine/evaluate.ts:580`, a escrita ainda não vale), `logDraft` e o `roll` interno dele (`src/app/session.ts:227–273`), `partsOf` e `partsOfLogged` (`src/ui/builder/copy.ts:307`, `:334`).
      Pronto quando: os testes do AC-14 passam no `schemas.test.ts`, inclusive com os documentos e logs gravados até a FEAT-011; as suítes passam sem mudança.

- [ ] T2 — Motor: modo `write`, resultado escrito, validade (a) e `rollAllKeys` (design §3.1; D2, D4, D6, D9; FR-DEC-003)
      Em `evaluate.ts`: `'write'` em `TableMode` e em `modes` no regime `roll-or-choose`; `TableResult` escrito; a validade da escrita só pela regra (a); escrita sem `value`, sem efeito (`resultEffects`) e sem `roll-effect` (`tableSlots`); `rollAllKeys(view, stepId)`, exportado pelo `engine`. A expectativa 3 do §7 muda aqui.
      Leitores do `TableResult` que deixam de compilar (C8), com o ramo `written` mínimo: `resultCalc` e `shortValue` em `copy.ts`; em `TablesStep.tsx`, o `ValueBox`, as buscas por `result.entry` e o `value` da grade. **Sem erro de tipo, mas quebra a tela:** o rótulo dos segmentos (`TablesStep.tsx:216–222`) daria "Choose" ao `write`, e o `decisionMode` (`:95`) daria "roll" à escrita. Até a T5, o `TablesStep` filtra o `write` dos segmentos, como já filtra o `enter`, e o `story.spec.ts` e o `Builder.test.tsx` não mudam.
      Pronto quando: os testes do AC-1 (motor) e do AC-4 passam no `evaluate.test.ts`, com pacote fictício; `rollAllKeys` testado com vagas novas, reabertas, decididas, Hatred e `roll-effect`; `core-view.test.ts` e as demais suítes verdes.

- [ ] T3 — Sessão: `write` (design §3.2; D3, D5; FR-DEC-003, 018, 021; FR-LOG-003; FR-DEC-016)
      `session.write(key, text)` pelo pipeline comum: recusas (`change-pending`, `unknown-slot`, `invalid-value` fora da `table` e acima de 2.000 caracteres, `empty-text`); mesmo texto sem gravar (D5); a decisão com `book` e o `rolls` da prévia; `logDraft` com `mode: 'written'` e `result: { text }`; `'write'` em `PendingChange['kind']`, com o `keep()` sem gravar nada.
      Pronto quando: os testes do AC-2 (sessão), AC-3 (sessão, com duas instâncias do app para o recarregar), AC-5, AC-6 (sessão) e AC-7 passam no `session.test.ts`.

- [ ] T4 — Roll all undecided: `impact` de vaga nula, candidato e comando (design §3.1, §3.2; D7, D8, D12; FR-DEC-023, 016; FR-CHG-001)
      `impact` com `key` nulo e `change` opcional (`impact.ts`); em `changes.ts`, o candidato do Roll all (uma decisão por vaga pela regra "vaga aberta", entradas `decision` na ordem, `restored` com `cause.entry` da vaga ancestral); `session.rollAll(stepId)` com `nothing-to-roll`; `PendingChange` com a variante `roll-all`; `confirm()` e `keep()` por variante.
      Leitores que deixam de compilar (C8), com o mínimo e sem texto novo: `impact.change` em `session.ts` (`keep()`, l.568), `ImpactDialog.tsx` (l.57, 66) e `Builder.tsx` (`appliedTarget`, l.260–266); `pending.key` e `pending.kind` no `ImpactDialog` e no `impactWording` (`copy.ts:260`). A tela ainda não chama o `rollAll`, e o diálogo `roll-all` só chega com a T5.
      Guarda `src/app/changes.perf.test.ts` (design §5).
      Pronto quando: os testes do AC-8, AC-9 e AC-10 (sessão) passam no `session.test.ts` e no `changes.test.ts`, e os de `impact` com `key` nulo no `impact.test.ts`; os testes existentes do `impact` passam sem mudança; a guarda do AC-13 passa.

- [ ] T5 — Interface: Write, Roll all undecided e diálogos (design §3.3; ui-design da FEAT-010; SCR-WEB-009)
      Pelo `ui-design.md`: o segmento Write (sai o filtro da T2) e o estado escrito, com o limite do campo e o erro do `empty-text`; "Roll all undecided" pelo `rollAllKeys`; as variantes `write` e `roll-all` do diálogo e do `appliedTarget`; o `REGIME_LABEL['roll-or-choose']` e os demais textos. Entrada nos estados pela mudança do snapshot (D11 da FEAT-007; C2).
      As expectativas 1 e 2 do §7 mudam aqui, e a 4 se o ui-design mudar a frase do regime, para as suítes não ficarem vermelhas entre a T5 e a T6.
      Pronto quando: os testes do AC-11 e do AC-2 (tela) passam no `Builder.test.tsx`, com a gravação retida e com `save-failed`; `npx playwright test e2e/story.spec.ts e2e/builder-dock.spec.ts --retries=0 --workers=1` verde nos 5 projetos.

- [ ] T6 — E2E do fluxo crítico 1 com Write e Roll all undecided (design §6, AC-12; ADR-008 fluxo 1; UC-005 2b, 2d, 2g)
      Em `e2e/story.spec.ts`, um teste novo: Dwarf; Write vazio recusado na Dwarf Appearance; Write com texto; recarregar; "Roll all undecided" decide as outras cinco sem mudar a Appearance; "Complete" na Home. O caso do axe ganha um cartão escrito, com o contorno do Firefox do `docs/scaffold-notes.md` (C23). Seletores pela tabela C1 do ui-design.
      Pronto quando: `npx playwright test e2e/story.spec.ts --retries=0 --workers=1 --repeat-each=3` verde nos 5 projetos (C13).

- [ ] T7 — Verificação (design §6)
      Todos os critérios do §6 demonstrados; `npm run typecheck`, `npm run lint`, `npm test`, `npm run packs:check`, `npm run build` e `npx playwright test --retries=0 --workers=1` verdes; nenhuma asserção mudada fora do §7; o CI do push verde, sem linha de flaky.
      Pronto quando: tudo acima passa, e o tasks.md tem as caixas marcadas.
