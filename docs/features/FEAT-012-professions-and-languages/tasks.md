# Tasks: FEAT-012 — Idiomas e concessões por resultado

> Executa: `docs/features/FEAT-012-professions-and-languages/technical-design.md` (e o `ui-design.md`, nas tarefas de interface)
> Status: nenhuma feita · Última atualização: 2026-11-25
> Antes da T1: as emendas 1 a 3 do §8 aplicadas, e o `ui-design.md` desta feature pronto antes da T6 (C11). Todo "pronto quando" inclui `npm run typecheck` e `npm run lint` verdes, e as suítes das features anteriores verdes, salvo as expectativas do §7 que a própria tarefa muda (C8). Vitest a partir de `C:` maiúsculo; E2E por `npx playwright test …` (C24). Nomes de idioma secreto e de qualquer texto do jogador nos testes são inventados (P22).

- [ ] T1 — Schema do pacote e do log (design §3.1, §4; D3, D10, D12; FR-CONT-008)
      Em `src/content/schemas.ts`: `typed` no item `language`; `name` e `grants` (`language`, `profession`) na entrada; `fields` na etapa; `'name'` no `slotKind`; as três regras de formato da §3.1 no `checkTable` (ou ao lado), com caminho; o tipo `EntryGrant` exportado.
      Pronto quando: os testes do AC-2 e do AC-17 passam no `schemas.test.ts`, com pacote fictício, inclusive os documentos e logs gravados até a FEAT-010; `npm run packs:check` verde com o pacote de hoje; as suítes passam sem mudança.

- [ ] T2 — Pacote do core (design §4; D3, D10, D11; FR-CONT-008, FR-STEP-015)
      Em `packs/sotdl.core.json`, pela tabela da §4: os cinco idiomas novos na ordem da p.10; a `table:common-professions`; as concessões da Background 12 e 13; os `fields` da Professions & languages. A expectativa 1 do §7 muda aqui.
      Até a T3, o motor ignora as concessões (nenhuma vaga nova, nenhuma tela muda), e o `evaluate` só ganha opções de idioma que ninguém lê.
      Pronto quando: os testes do AC-1 passam no `core-pack.test.ts`; `npm run packs:check` verde, sem id removido; as demais suítes verdes.

- [ ] T3 — Motor: vagas de concessão, vaga do nome, "already yours", ganhos e pendências (design §3.2; D5 a D9, D14, D17; FR-STEP-015, 020; FR-DEC-009, 010, 011, 013)
      Em `evaluate.ts`: `EntryView.name` e `grants`; a vaga `choose-entity` de idioma por concessão `language` (filha da entrada vigente, mesma etapa, `source` a tabela), com a validade da opção viva; a vaga `name` sob o idioma `typed`, válida com `written`; `owned` e `typed` nas opções (segunda passada depois da árvore, sem a própria vaga); `gained.languages` com `origins` e a junção da D14; `gained.professions`; `OpenDecision` com `of` (toda `choose-entity`), `entity` e `from`; `StepView.fields`. Os tipos exportados pelo `engine`.
      A expectativa 3 do §7 muda aqui. **A expectativa 2 do §7 (`e2e/story.spec.ts`) muda também aqui**, porque a partir desta tarefa a Background sorteada em 13 abre a vaga de idioma, e o AC-12 da FEAT-010 ficaria instável no CI entre as tarefas (C13).
      Leitores que deixam de compilar (C8), com o mínimo e sem texto novo: `isValid` (`src/app/session.ts:197`, a `name` devolve `false`: nomeia-se pelo `write`, T4); `decisionTitle` (`src/ui/builder/copy.ts:205`, a `name` com o nome da entidade). **Sem erro de tipo, mas errado com a vaga nova:** o ramo `choose-entity` do `decisionTitle` dá "Ancestry" (passa a olhar o `of`; idioma com o rótulo provisório "Language"); o `impactWording` (`copy.ts:311`) dá as ações da troca de ancestralidade à vaga de idioma (passa às de escolha, `CHOICE_ACTIONS`, até a T6); o `appliedTarget` (`src/ui/screens/Builder.tsx:266`) dá o `h2` da ancestralidade (passa a `null` na `choose-entity` de idioma, e a moldura usa o `opener`); os ramos `default` de `shortValue` (`copy.ts:287`), da linha do impacto (`copy.ts:389`) e da `ColumnValue` (`src/ui/builder/ImpactDialog.tsx:265`) leem a `name` como `chosen` (ganham o ramo `name`, que mostra o texto); o `logDraft` (`session.ts:282`) idem, e fica para a T4. Até a T6, a vaga de idioma aparece na Story pela lista de pendências não-tabela do `TablesStep` (texto provisório da FEAT-009), e a Professions & languages continua no `FallbackStep`.
      Pronto quando: os testes do AC-3 a AC-6 passam no `evaluate.test.ts` e no `core-view.test.ts` (pacote real e fictício); `npx playwright test e2e/story.spec.ts --retries=0 --workers=1` verde nos 5 projetos com a expectativa 2; as demais suítes verdes.

- [ ] T4 — Sessão: nome digitado e `causeOf` (design §3.3; D7, D13; FR-DEC-009, FR-LOG-001, 003, 007)
      Em `session.ts`: `write` aceita a vaga `name` (limite de 100 depois do `trim`, `invalid-value`; `empty-text`; mesmo texto sem gravar; decisão `written` sem `book` nem `rolls`); `logDraft` com o ramo `name` (`subject` o idioma, `source` a procedência dele, `result: { text }`). Em `changes.ts`: o `causeOf` sem o fallback, com o erro da D13.
      Pronto quando: os testes do AC-7, AC-8 e AC-9 passam no `session.test.ts` (pacote real; AC-9 com sequência fixa), e os do AC-10 no `changes.test.ts`; os testes existentes do `rollAllChange` passam sem mudança de asserção.

- [ ] T5 — Guardas de tempo (design §5; NFR-PERF-002)
      Um caso novo em `src/engine/evaluate.perf.test.ts` e um em `src/app/changes.perf.test.ts`, com as asserções do que a medida cobre (a vaga de idioma e a do nome decididas; a restaurada e o `needsDialog`).
      Pronto quando: os dois passam com p95 ≤ 20 ms (AC-16), com o tempo no `console.info`, como as guardas anteriores.

- [ ] T6 — Interface: subdecisão na Story e corpo da Professions & languages (design §3.4; ui-design da FEAT-012; SCR-WEB-009, SCR-WEB-010)
      Pelo `ui-design.md`: a subdecisão de idioma e o campo do nome no cartão da tabela, com "already yours" desabilitado; os chips de concessão; as listas de idiomas e de profissões pela `step.fields`, com a linha pendente e o atalho; os rótulos de Open decisions e do diálogo; o destino de foco do `appliedTarget`. Sai o texto provisório da T3. Entrada nos estados pela mudança do snapshot (D11 da FEAT-007; C2). Seletores e nomes pela tabela C1 do ui-design; se ela mudar ajudantes de `e2e/` (ex.: `card()` com `exact: true`), a mudança vai aqui, conforme o §7 do ui-design.
      Pronto quando: os testes do AC-11 e do AC-12 passam no `Builder.test.tsx`, com a gravação retida e com `save-failed`; `npx playwright test e2e/story.spec.ts e2e/impact.spec.ts e2e/builder-dock.spec.ts --retries=0 --workers=1` verde nos 5 projetos.

- [ ] T7 — E2E do fluxo crítico 1 com idiomas e o foco do Choose → Choose (design §6, AC-13, AC-14, AC-15; ADR-008 fluxo 1; UC-006 3, UC-007 4, 4a)
      Um spec novo (`e2e/languages.spec.ts`), só com Choose (sem sorteio): o caminho do AC-13 e o caso do axe na Story com a subdecisão e na Professions & languages, com o contorno do Firefox do `docs/scaffold-notes.md` onde o localizador por nome e o axe se cruzam (C23); o AC-14, Apply e Keep. Seletores pela tabela C1 do ui-design.
      Pronto quando: `npx playwright test e2e/languages.spec.ts --retries=0 --workers=1 --repeat-each=3` e `npx playwright test e2e/story.spec.ts --retries=0 --workers=1 --repeat-each=10` verdes nos 5 projetos (C13).

- [ ] T8 — Verificação (design §6)
      Todos os critérios do §6 demonstrados; `npm run typecheck`, `npm run lint`, `npm test`, `npm run packs:check`, `npm run build` e `npx playwright test --retries=0 --workers=1` verdes; nenhuma asserção mudada fora do §7 (do design e do ui-design); o CI do push verde, sem linha de flaky.
      Pronto quando: tudo acima passa, e o tasks.md tem as caixas marcadas.
