# Tasks: FEAT-009 — Decidir uma tabela: Roll, Choose, Enter result

> Executa: `docs/features/FEAT-009-decide-a-table/technical-design.md`
> Status: pending · Última atualização: 2026-11-16 (pré-requisitos cumpridos)
> Tela (SCR-WEB-009, e o "Decide now" da SCR-WEB-003): do ui-design, pelo `docs/design-manifest.json`. As tarefas de ui aqui são só integração.
> Pré-requisitos (design §8), cumpridos: emenda 1, requirements-engineering (`8c77325`, `8bed161`, `531ff84`; P6a, `f3eb350`); emenda 2, software-architecture (`c955ae9`, `4023657`); emenda 3, ux-foundations, E8 `size.roll-value` e E9 (`a008fba`, `755be9c`); emenda 4, implementation-planning (`21c6b87`, `4eaa019`).

Todo "pronto quando" inclui `npm run typecheck`, `npm run lint` e os testes existentes verdes, salvo as expectativas que o design §7 lista como mudadas (C8).

- [x] **T1. Dados: sorteio de faces por rejeição** (design §5, "Sorteio por rejeição"; FR-DEC-005; ADR-009)
  - Em `src/dice/index.ts`: tipo `Dice` próprio (`count`, `sides`, `modifier?`), `rollDie(sides, random)` e `rollDice(dice, random)` com uma face por dado. Sem importar `content`.
  - **Pronto quando:** `src/dice/index.test.ts` passa para `FR-DEC-005`:
    - 3d6 faz três sorteios e devolve três faces de 1 a 6; d20 faz um;
    - um valor da fonte igual ou acima do limite de rejeição é descartado, e o seguinte vale;
    - uma volta completa de resíduos abaixo do limite dá cada face o mesmo número de vezes (d6 e d20).
    - Nenhum teste estatístico com o `crypto` real (C13).

- [x] **T2. Schemas: tabela, tipo de criatura, concessão `table`, decisões e log** (design §3.1, §4; FR-CONT-008 parcial; D1, D2, D3, D10)
  - Em `src/content/schemas.ts`:
    - itens `table` e `creature-type`; `Dice`, `EntryKey`, `Entry`, `Effect`, `SheetField`;
    - `GrantedSlot` com `kind: 'table'`;
    - `Decision` com os modos `chosen` (agora com `EntryKey` e `book?`), `rolled` e `entered`;
    - `Decision` como na D3: `rolled` com `dice`, `modifier`, `total` e, na tabela, `entry`, `rolls` e `book`; `entered` com `sum`, `modifier`, `total` e, na tabela, `entry` e `book`;
    - `regime?` em `step`;
    - `log: LogEntry[]`, estrito, com `roll` de faces ou soma, modificador e total;
    - tipos exportados.
  - Regras de formato da §3.1, com caminho: chave de entrada, cobertura exata do dado com as faixas ordenadas pelo início (nunca pela ordem das chaves do objeto), `entity`, `target`, `add.dice`, `table` da concessão.
  - Em `src/engine/evaluate.ts` (`:219`, `:228`, `:260`) e `src/app/session.ts` (`isValid`, `decide`): só o necessário para o typecheck com a união nova de `Decision`, lendo `value` só em `chosen`. O comportamento não muda (C8).
  - **Pronto quando:** `schemas.test.ts` (pacotes fictícios) passa para:
    - `FR-CONT-008`: tabela válida aceita; faixa com buraco, sobreposição, fora do dado ou chave inválida recusada com caminho; `entity` e `target` inexistentes recusados; concessão para tabela inexistente recusada; a tabela com chaves `"3"`, `"4"`, `"5-6"`, `"7-16"`, `"17"`, `"18"` aceita, e sem `"5-6"` recusada pelo buraco (AC-15);
    - `FR-DEC-024`, `FR-DEC-005`, `FR-DEC-019`: documento com decisão `chosen` com entrada, `rolled` e `entered` nos formatos da D3 (tabela e `roll-effect`) aceito; com campo a mais recusado;
    - `FR-LOG-001`: documento com uma `LogEntry` de cada modo aceito; com campo a mais recusado; `log: []` continua válido.

- [x] **T3. Motor: vagas `table` e `roll-effect`, resultado, modos e pendências** (design §3.3, "Vaga `table`"; FR-DEC-001, 002, 004, 007, 008, 012, 016 parcial, FR-STEP-014, FR-CONT-016 e FR-SRC-009 (AC-17, iii, iv e v); D2, D3, D5, D6, D7; D40)
  - Em `src/engine/evaluate.ts`:
    - a concessão `table` na árvore, com `TableView`, `EntryView`, `modes` e `range`;
    - `range` e `enterRange` (D4); `entries` na ordem do início da faixa;
    - `result` de `rolled`, `entered` e `chosen` com os valores gravados (D3);
    - a validade na leitura: (a) `book` igual ao livro da versão vigente e (b) entrada gravada existente nela; senão a decisão é ignorada e a vaga reabre;
    - vagas `roll-effect` das entradas com `add.dice`, filhas da tabela, obrigatórias;
    - `OpenDecision.table`.
  - Em `src/ui/builder/copy.ts`: os `kind` `table` e `roll-effect` em `decisionTitle` (rascunho da §3.4), para o `switch` continuar exaustivo.
  - Em `src/app/session.ts`: `isValid` com os `kind` novos, `false` até a T5 (C8).
  - **Pronto quando:** `evaluate.test.ts` (pacote fictício) passa para:
    - `FR-DEC-001`, `FR-DEC-002`, `FR-DEC-004`: `modes` com `roll` e `choose` em todo regime e `enter` só no `roll`; o `regime` na vista (AC-2);
    - `FR-DEC-007`, `FR-DEC-016`: rolado com faces, modificador, total, entrada e `rolls` gravados (AC-4, sem o pacote real);
    - `FR-DEC-008`, `FR-DEC-012`: toda entrada com faixa e página, e a entidade quando houver, na ordem do início da faixa (AC-5, AC-6);
    - `FR-DEC-024`: escolhido com a entrada e sem faces; decisão sem `book` ou sem `entry`, ou com chave inexistente, ignorada;
    - `FR-CONT-016`, `FR-SRC-009`: (iii) uma versão sem a entrada gravada reabre a vaga; (iv) um segundo livro, acima, com `replaces` da tabela faz a decisão deixar de valer e reabre a vaga; (v) voltando à versão ou ao livro anterior, a mesma decisão gravada volta a valer, sem nova gravação nem entrada de log (AC-17);
    - `FR-STEP-014`, `FR-DEC-011`: a `roll-effect` aparece com a entrada, conta em `open` e `openDecisions`, e some ao trocar a entrada (AC-8, parte do motor);
    - `FR-FLOW-001`: etapa com tabelas concedidas fica `open` e, com todas decididas, `done`.

- [x] **T4. Motor: efeitos de resultado nos estágios `define` e `sum`** (design §3.3, "Efeitos de resultado"; FR-CALC-005 parcial, FR-CALC-010, 011, FR-CONT-015 (AC-17, i e ii); D3, D8)
  - Em `src/engine/evaluate.ts` e `src/engine/formula.ts`: coleta dos efeitos das entradas vigentes; `define` e `sum` em atributos e características, antes do `limit`; `ResultOrigin`; `pendingOn` dos efeitos com dado, também em `AttributeSummary`.
  - Em `src/ui/builder/LiveSummary.tsx`: o rótulo das parcelas `define` e `sum` pela origem `table` (rascunho; o ui-design fecha).
  - **Pronto quando:** `evaluate.test.ts` (pacote fictício) passa para:
    - `FR-CALC-010`: um `add` de entrada vira parcela `sum` com a origem da tabela e da entrada;
    - `FR-CALC-011`: dois `add` no mesmo alvo somam, uma parcela cada;
    - `FR-CALC-005`: ordem base → modifier → define → sum → limit; `set` como parcela de diferença, e o último `set` vale; o limite corta depois do `sum`; um `add` num atributo muda a característica que o referencia (AC-9);
    - `FR-STEP-014`: com a `roll-effect` aberta, o alvo fica `null` com `pendingOn`; decidida, soma o total gravado (AC-8, valor);
    - `FR-CONT-015`: (i) decisão rolada com modificador +2 e uma versão do mesmo livro com +4: faces, modificador, total e entrada exibidos são os gravados; (ii) uma versão em que o efeito da entrada gravada muda: o valor afetado segue a versão nova (AC-17).

- [x] **T5. Sessão: Roll, Enter result, Choose em tabela e log** (design §3.2, §3.3 "Entrada de log"; FR-DEC-005, 016, 019, 020, 024, FR-LOG-001, 002, 004, 010, FR-STEP-014; D3, D4, D5, D9, D13)
  - Em `src/app/session.ts`: `random` nas dependências (padrão `cryptoRandomSource`); `roll`, `enter(key, sum)`, `decide` com entrada; a gravação da D3 (faces ou soma, modificador da versão vigente, total, entrada, e `rolls` e `book` na tabela); a D4 (`sum` em `[count, count × sides]`, `out-of-range` com essa faixa); `already-decided`; `isValid` dos `kind` novos; `decide` com o mesmo valor sem `commit` (D13); a `LogEntry` montada e acrescentada no `commit` de todo comando que registra decisão, nunca numa recusa, no `clear`, no `retrySave` nem no `decide` com o mesmo valor.
  - Em `src/app/index.ts`: `createApp` repassa `random`.
  - **Pronto quando:** `session.test.ts` (pacote fictício, sorteio fixo) passa para:
    - `FR-DEC-005`, `FR-DEC-016`: `roll` grava `{ mode: 'rolled', dice, modifier, total, entry, rolls: 1, book }`, com o snapshot antes da gravação (AC-4);
    - `FR-DEC-019`, `FR-DEC-020`: em 3d6, `enter` 11 grava `{ mode: 'entered', sum: 11, modifier: 0, total: 11, entry, book }`; 2 e 19 devolvem `out-of-range` com `[3, 18]`, sem mudar nem gravar nada; em 3d6+1, a faixa continua `[3, 18]` e 11 dá total 12 (AC-7);
    - `FR-STEP-014`: a `roll-effect` rolada ou informada grava dados (ou soma), modificador e total, sem `entry` nem `book` (AC-8);
    - `FR-DEC-024`: Choose grava a entrada; Choose → Choose substitui; com a `roll-effect` decidida, `has-dependents` (AC-6, AC-8);
    - `already-decided` de `roll` e `enter` em tabela decidida e de Choose em tabela rolada ou informada; `invalid-value` de `roll` numa vaga sem dado e de `decide` numa `roll-effect` (AC-11);
    - `FR-LOG-001`, `FR-LOG-002`, `FR-LOG-004`, `FR-LOG-010`: uma entrada por `decide`, `roll` e `enter`, com os campos da §3.3 (faces ou soma, modificador e total); nenhuma em recusa, no `clear` nem no `retrySave`; `decide` com o valor já decidido (ancestralidade, Size, Choose) devolve `ok` sem gravar nem escrever entrada (AC-10);
    - `NFR-REL-001`: reabrir um personagem rolado dá as mesmas faces, o mesmo modificador, o mesmo total e a mesma entrada, sem chamar o sorteio (AC-13);
    - as duas expectativas de documento inteiro que mudam (design §7): `FR-CALC-001: the saved document holds only inputs…` e `FR-STEP-009: applying saves only the pair…`, agora com a entrada de log.

- [ ] **T6. Pacote: tabelas do Dwarf e tipos de criatura** (design §4; FR-STEP-012 parcial, 013, FR-CALC-010; D10, D12)
  - Em `packs/sotdl.core.json`: `regime` de `step:story`; as seis tabelas, cada uma com o seu `regime`, os dez `creature-type` e as concessões do Dwarf, como na tabela da §4. Antes do commit, cada faixa e a página conferidas de novo no PDF (plano §6, "Conteúdo oficial").
  - Em `e2e/home.spec.ts`: a expectativa que muda (design §7), com o Dwarf em "Creating · 6 open". O "Complete" com dados reais continua no `story.spec.ts` da T9.
  - **Pronto quando:**
    - `npm run packs:check` passa;
    - `core-pack.test.ts` passa para `FR-STEP-013` (Hatred com as dez criaturas e as faixas do d20, regime `choice`) e `FR-CALC-010` (Background 1 com Corruption +1), e com a expectativa que muda (design §7): `FR-CONT-003: has Dwarf and Human…` com as seis concessões `table` do Dwarf;
    - `core-view.test.ts` (pacote real) passa para:
      - `FR-STEP-012`: Dwarf com as seis vagas `table` na Story, na ordem, e Human sem nenhuma;
      - `FR-CALC-010`: Background 1 dá Corruption 1 com a parcela de origem da tabela (AC-9);
      - `FR-CHAR-005`, `FR-CHAR-006`: Story `open` com 6 e `done` com as seis decididas (AC-12, motor);
      - as três expectativas da FEAT-007 e da FEAT-008 que mudam (design §7): as duas `FR-FLOW-014: preview…` e `FR-FLOW-001: Attributes is done with Dwarf…`;
    - `npm run e2e` passa nos 5 projetos, com o `home.spec.ts` emendado.

- [ ] **T7. Desempenho: guarda unitária com tabelas** (design §5, "NFR-PERF-002, guarda unitária"; NFR-PERF-002)
  - Em `src/engine/evaluate.perf.test.ts`: os dois casos novos da §5; os da FEAT-008 continuam sem mudança.
  - **Pronto quando:** os dois casos passam com p95 ≤ 20 ms em 200 execuções, e o caso fictício confere o próprio porte (6 tabelas decididas, 10 `add`, 4 `set`, 2 `add.dice`).

- [ ] **T8. Interface: corpo da etapa e integração** (design §3.4; ui-design da FEAT-009; FR-STEP-012 parcial, 013, 014, FR-DEC-001, 002, 004, 007, 008, 012, 019, 020; D4, D11; E9)
  - Em `src/ui/screens/Builder.tsx`: o despacho da §3.4.
  - Em `src/ui/builder/TablesStep.tsx` (novo): os cartões e estados da SCR-WEB-009 como o ui-design define, com os dados da tabela da §3.4.
  - Em `src/ui/builder/AncestryStep.tsx`: o "Decide now" do Dwarf com as tabelas, como o ui-design define.
  - A regra de entrada nos estados da §3.4: marca no clique, efeito sobre o snapshot e, na continuação, só a recusa, com o contador de ações. O token `--size-roll-value` vem da E8.
  - **Pronto quando:** `Builder.test.tsx` (pacote fictício, sorteio fixo, gravação retida por uma promessa controlada) passa para:
    - `FR-DEC-001`, `FR-DEC-002`, `FR-DEC-004`: Roll e Choose em todo cartão, Enter result só na tabela de regime `roll`, e o regime visível (AC-2);
    - `FR-DEC-007`, `FR-DEC-008`: o cartão rolado mostra faces, modificador, total, faixa, página, efeitos e o texto de entrada sem texto (AC-4, AC-5);
    - `FR-DEC-012`, `FR-STEP-013`: a grade do Choose com faixas, e com os nomes na tabela de entidades (AC-6);
    - `FR-DEC-019`, `FR-DEC-020`: o Enter result tem um campo por expressão de dado, com a faixa `[count, count × sides]` na ajuda (E9); o informado mostra a soma, o modificador e o total; fora da faixa mostra a faixa válida e não grava (AC-7);
    - `FR-STEP-014`: a `roll-effect` no mesmo cartão, com Roll e Enter result (AC-8);
    - AC-14: Roll, Choose e Enter result mostram o resultado antes do fim da gravação; foco levado a outro cartão durante a gravação continua lá depois dela; uma recusa não move o foco nem limpa o campo; `save-failed` mantém o resultado com o alerta da moldura;
    - `FR-FLOW-011`: o atalho `?slot=` de uma tabela foca o cartão (AC-12);
    - a etapa sem tabela continua no `FallbackStep`, e a tela confere com o `design-manifest.json` (SCR-WEB-009).

- [ ] **T9. E2E: fluxo crítico 1 até o UC-006** (design §6, AC-1, AC-16, §7; UC-005, UC-006; ADR-008 fluxo 1)
  - `e2e/story.spec.ts` (novo), nos 5 projetos, a partir de "New character" com Dwarf:
    - confere o AC-1 com dados reais: seis cartões na ordem (Hatred, Age, Build, Appearance, Background, Personality), selos `CORE p.18` e `p.19`, sem Write;
    - escolhe a Hatred na grade; rola uma tabela e confere faces, modificador, total e entrada coerentes com as faixas; escolhe o Background 1 e vê Corruption 1 no resumo; recarrega e vê o mesmo resultado; decide as seis e vê "Complete" na Home; axe sem violação grave na Story.
  - `e2e/builder-dock.spec.ts`: a Story do Dwarf, se o ui-design usar `data-focus-ring` (C18).
  - **Pronto quando:** `npm run e2e` passa nos 5 projetos, sem violação de CSP, e os localizadores novos conferem com a lista de nomes do ui-design (C1).

- [ ] **T10. Verificação** (design §6, com a NFR-PERF-001)
  - Todos os critérios AC-1 a AC-17 passam, cada um pelo teste que o cita; os FR-DEC e FR-CALC desta feature têm teste com o FR no nome (NFR-MAINT-002).
  - NFR-PERF-001: a mediana do Lighthouse CI da Home vazia no celular, com o elemento LCP (C6), contra a base de 2,62 s e a meta de 4 s (design §6).
  - `npm run typecheck`, `npm run lint`, `npm test`, `npm run packs:check`, `npm run build` e `npm run e2e` verdes; o CI do push verde.
