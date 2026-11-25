# Acceptance Report: FEAT-010 — Write e "Roll all undecided"

> Veredito: Accepted · Data: 2026-11-25
> Padrão: technical-design.md §6, §5 e §7 (com as emendas do §8 até `3ef2daf`), ui-design.md (`966ba6c`) · Fontes: srs.md (v1.3), use-cases.md (UC-005, UC-006), ADR-004 (`68dd471`), design.md §4 e §5 (D-ERR, `2312de8`), design-manifest.json (`69d8c7d`)
> Estado auditado: `18773a9`, sem correção de teste

## Veredito

Aceita. Os 14 critérios têm teste fiel, e nenhum teste precisou de correção. Todas as suítes passaram nesta execução, sem retry e sem instáveis. Uma sonda local, já descartada, confirmou nos 5 projetos o que só o jsdom conferia: o erro do Write vazio dentro da região viva (D-ERR), o foco e o anúncio do Roll all, tanto na aplicação direta quanto pelo Apply, e o Keep do `roll-all` sem gravação. Ficam dois achados pré-existentes de outras features, para decisão do usuário, e três menores, nenhum deles bloqueante.

## Tabela de auditoria

| AC | Codifica | Teste(s) | Auditoria | Observado |
| :- | :-- | :-- | :-- | :-- |
| AC-1 | FR-DEC-003, FR-STEP-012 (parcial), FR-DEC-002; UC-006 1 | `evaluate.test` (modos por regime; l.493, item 3 do §7); `Builder.test:773` (segmentos e rótulo, item 2); `story.spec:108` × 5 (3 segmentos e um Write nas cinco `roll-or-choose`, 2 e nenhum Write na Hatred, "Step 3 of 8 · Roll, choose or write your own") | fiel | verde |
| AC-2 | FR-DEC-021; UC-005 2g | `session.test` (`''`, espaços, `\n\n` e `' \t\r\n '` → `empty-text`, snapshot idêntico, log vazio, sem gravação; 2.001 → `invalid-value`; 2.000 com pontas aceito e aparado); `Builder.test` write-refused (região viva vazia antes, mensagem nela, `aria-invalid`, valor e foco em "Use this text" mantidos, um quadro depois também); `story.spec:229` × 5 | fiel | verde |
| AC-3 | FR-DEC-003, FR-LOG-003; UC-005 2b; NFR-REL-001 | `session.test` AC-3 (decisão gravada igual, sem `rolls`; a entrada de log inteira com `mode: 'written'`, `source` CORE p.18, `result: { text }` e sem `roll`; o snapshot muda com a gravação retida; resumo igual; recarga por outra instância, sem sorteio); `Builder.test` written; `story.spec:229` (recarga) | fiel | verde |
| AC-4 | D2; FR-CHG-015, 018 | `evaluate.test` (2 testes: mesma versão com a 18 removida e a 17 passando a 17-18; outro livro → `invalid` e vaga reaberta; volta sem mudar o documento; sem `book` ou de outro livro, a candidata anterior vale) | fiel | verde |
| AC-5 | FR-DEC-018 (parcial), 015; FR-CHG-002; FEAT-009 D13 | `session.test` (3 testes AC-5: rolada, escolhida e informada → `undone` com `replaced`, `ref` e `by`, `earlier` vazio; outro texto substitui; o mesmo texto, também com pontas, sem gravar; do Write para Choose, Roll e Enter result; Background 1 direto, Corruption 1 → 0); `Builder.test` mode-switch-write e write-again | fiel | verde |
| AC-6 | FR-DEC-017, 018 (parcial); FR-CHG-001, 008, 011, 018; UC-005 2e | `session.test` AC-6 (`pending` `write`, Madness em `setAside`, Past 4 em `undone`; Keep sem gravar; Apply numa gravação com `decision`, `undone` e `set-aside`; Choose 4 só restaura, sem sorteio); `Builder.test` by-write e "antes escrito" | fiel | verde |
| AC-7 | FR-DEC-016 | `session.test` AC-7 (1 → 1 → 2 → 2; sem `rolls` numa tabela nunca rolada) | fiel | verde |
| AC-8 | FR-DEC-023 (parcial), 016 (parcial); UC-005 2d | `session.test` (4 testes AC-8: seis tabelas na ordem das vagas, Hatred incluída, uma gravação, seis entradas com o `logged` de cada uma, `rolls: 1`, Story `done` antes da gravação; Hatred escolhida e Age escrita ficam iguais, sem `undone`; `nothing-to-roll` e `change-pending` sem sorteio nem gravação; `roll-effect` aberta não rolada); `Builder.test` roll-all, roll-all-applied, roll-all-none; `story.spec:229` × 5 | fiel | verde |
| AC-9 | FR-DEC-023 (parcial), 016; FR-CHG-019; ADR-004 §3 | `changes.test` (vaga reaberta); `session.test` AC-9 (versão nova do pacote; a nova em `decisions[k]`, a suspensa na frente de `earlier[k]` com a marca, sem entrada sobre ela, `rolls` 2 → 3) | fiel | verde |
| AC-10 | FR-DEC-023 (parcial); FR-CHG-001, 009, 018; D8, D12 | `impact.test` (`key` nulo: sem `change` nem `undone`, restaurada listada, `stays`); `changes.test` (`cause.entry` da vaga ancestral); `session.test` AC-10 (`pending` `roll-all` com `keys`, sem `change`, `setAside` vazio; Keep sem gravar e com o documento idêntico; Apply sem novo sorteio, com a hora do Apply e `restored` com `cause: { entry: 5 }`); `Builder.test` by-roll-all × 2 | fiel | verde |
| AC-11 | FR-DEC-003, 021, 023; D11 da FEAT-007; C2; FR-CHAR-010 | `Builder.test` (written e roll-all com `holdSave`: estado novo e foco antes do fim da gravação, `saved` vazio; `save-failed` do Write e do Roll all com o alerta, o foco e o anúncio mantidos; write-refused sem mover o foco) | fiel | verde |
| AC-12 | UC-005 2b, 2d, 2g; UC-006; ADR-008 fluxo 1; NFR-ACC-001 | `story.spec:229` × 5 (Write só com espaços recusado; texto aparece, sobrevive à recarga com o Write marcado; "Roll all undecided · 5" decide as outras cinco, Appearance igual, motivo com o foco, "6 of 6 decided"; "Complete" na Home); `story.spec:290` × 5 (axe com um cartão escrito) | fiel. O E2E não confere a região viva (D-ERR); conferida pela sonda (ponto 1) | verde |
| AC-13 | NFR-PERF-002 | `changes.perf.test` (candidato, `settle` e `impact` com `key` nulo, Dwarf do core, seis tabelas) | fiel ao §5 | verde |
| AC-14 | ADR-004 §1; ADR-005 | `schemas.test` (5 testes: aceita `written` com `rolls`, `setAside`, `logged`, em `decisions` e `earlier`; 1 a 2.000 caracteres; recusa espaço, tab, quebra e ` ` nas pontas; recusa sem texto, com entrada ou dados; documentos e logs até a FEAT-011 válidos e iguais) | fiel | verde |

**Padrão contra as fontes:**
- Todo FR do cabeçalho tem critério, e os caminhos do UC-005 que o design cita (2b, 2d, 2e, 2g) e o UC-006 1 estão representados.
- Nenhum critério estreita o FR. Os parciais seguem a linha do plano:
  - FR-DEC-023 sem o filtro das tabelas aguardando, que é da FEAT-024;
  - FR-DEC-016 só com o Roll all;
  - FR-DEC-018 e FR-STEP-012 só com o Write.
- O FR-DEC-023 diz "rolar só as tabelas da etapa sem decisão". O AC-8 inclui a Hatred, de regime `choice`, por decisão do usuário (D7), e isso segue a letra do FR.

**Diff dos testes** (`git diff d548c15..18773a9`, nos arquivos `*.test.ts*` e em `e2e/`):
- Toda linha removida ou mudada corresponde a um item do §7:
  - item 1: `story.spec.ts:108`, com título, rótulo, contagem de segmentos e a saída do `getByText(/write/i)`;
  - item 2: `Builder.test.tsx:773`;
  - item 3: `evaluate.test.ts:493`;
  - item 5: `impact.test.ts:146–148, 206, 207, 226` e `session.test.ts:1201, 1229`, só `change!`, com os mesmos valores.
- O item 4 não se aplica, porque a frase do regime não mudou.
- As mudanças fora do §7 não enfraquecem nenhum teste:
  - **`roll3d6` → `rolled`:** para 3d6, as asserções continuam as mesmas. São 3 faces de 1 a 6 (o regex `(\d)` não mudou), o modificador +0, o total igual à soma, o total dentro da faixa da entrada e a caixa `"{total}rolled"`, e o retorno `{ calc, entry }` também é o mesmo. A única diferença é a leitura da faixa: o regex ancorado `^(\d+)(?:–(\d+))?` aceita texto depois dela, o que a Hatred precisa ("7–8 Orcs"). Já o `split('–')` antigo dava `NaN` com texto depois da faixa. Nas tabelas 3d6 do Dwarf a entrada é só número, e a Age continua conferida contra `AGE_RANGES`, então o efeito sobre os 3d6 é nulo.
  - **Caso do axe:** "3 of 6" passou a "4 of 6 decided" porque a Appearance agora está escrita. O filtro do `saved(...)` no Firefox ganhou `appearance`, para a página nova abrir com o cartão escrito, e a espera do estado é pelo texto, sem localizador por nome (C23). O título ganhou "written" e AC-12. É o mesmo teste com um cartão a mais.
  - **Duas linhas de `import`:** acrescentam `rollAllKeys` (`evaluate.test.ts`) e `rollAllChange` (`changes.test.ts`).
- Nenhum `skip`, `only`, `todo` nem tolerância alargada. O `playwright.config.ts`, a configuração do Vitest e a de cobertura, o `package.json` e o CI não mudaram no intervalo.

## Pontos pedidos

**1. D-ERR no navegador real (NFR-ACC-001, WCAG 4.1.3).** Constatado no DOM renderizado nos 5 projetos (C4), não com leitor de tela (C14). Usei uma sonda local, já descartada: o pacote fictício do `Builder.test.tsx` servido por `page.route`, localizadores CSS e o build de `18773a9` na porta 4174.
- Ao abrir o segmento Write, a `.write-form [aria-live="polite"]` já existe e está vazia.
- Depois do clique em "Use this text" com `"  \n  "`:
  - a mensagem fica dentro dessa região, e o ancestral `[aria-live]` mais próximo dela é a própria `.write-form__error`;
  - o campo fica com `aria-invalid="true"` e com a ajuda e a mensagem no `aria-describedby`;
  - o foco fica em "Use this text".
- No E2E, o AC-12 confere a recusa (mensagem, `aria-invalid`, valor e foco), que é o que o critério diz. Não o corrigi: a região viva já é conferida pelo `Builder.test` (write-refused) e agora também por esta sonda. Ver o achado menor 3.

**2. Texto aparado.**
- **Valor gravado:** provado exatamente na sessão (AC-3: a decisão, a entrada de log e o `slot.result.text` iguais a `'Raised by a caravan of tinkers.'`, a partir do texto com espaços nas pontas) e no `Builder.test` written (`saved[0]` igual ao texto aparado).
- **Valor mostrado:**
  - no diálogo, provado por `textContent` exato (`New${TEXT}Written`, `Builder.test.tsx:1922`);
  - no cartão, o `getByText` do `Builder.test` e o do E2E normalizam espaços e não o provam. A sonda leu o `textContent` do `.written-text` depois de um Write com `"  … tinkers.  "` e achou o texto exato nos 5 projetos.
- **Leitura de código:** o cartão mostra `result.text` da visão (`TablesStep.tsx:322`), que é a decisão gravada.

**3. Verificação direta além dos testes.** Todos os casos foram constatados pela mesma sonda descartável, nos 5 projetos, com o sorteio fixo (`crypto.getRandomValues` substituído por `addInitScript`) e o personagem gravado direto no IndexedDB. A sonda registra o elemento focado e o documento gravado, em vez de só passar ou falhar.

| O que | Como | Resultado |
| :-- | :-- | :-- |
| Foco depois do Roll all aplicado direto (P1 = A) | E2E `story.spec:229` (`toBeFocused` no motivo, Dwarf real); sonda (Gnome sem decisões) | `p#roll-all-reason` "Every table in this step has a result." nos 5 |
| Foco pelo Apply do diálogo `roll-all`, com uma e com cinco tabelas | sonda (Madness guardada; a Past sorteia 4 e a restaura) | `p#roll-all-reason` nos 5, nas duas variantes |
| Anúncio do `role="status"` só na aplicação direta | sonda | direta: "Rolled 5 tables. Gnome Age: 8–12. … Gnome Foe: 1–10 Wolves." nos 5; depois do Apply, região vazia nas duas variantes, nos 5 |
| Keep do `roll-all` não grava nada | sonda: o documento lido do IndexedDB antes e 300 ms depois do Keep, com uma e com cinco tabelas | revisão, decisões e log iguais nos 5; foco em "Roll all undecided · {n}", habilitado. Depois, o Apply grava uma vez (revisão 1 → 2) |
| Write a 320 px com uma palavra de 2.000 caracteres | sonda com o Dwarf real (Story antes e depois do Write na Appearance) e com o pacote fictício (diálogo by-write com a coluna New escrita) | Dwarf real: `scrollWidth` 320 e o texto termina em 287 px nos 5. Diálogo: `scrollWidth` igual a `clientWidth` (288), texto até 288 px, nos 5. Com o pacote fictício, a página tem 4 px a mais por causa de um estado anterior a esta feature (achado pré-existente 2) |

**4. Achado pré-existente pedido: a cor da coluna Current ou New.** Confirmado em `ImpactDialog.tsx:245`, que vem do `1e40cb6` (FEAT-011 T9). No caso `table` do `ColumnValue`, o cálculo e o "Chosen" saem em `<p className="typography-meta">`, sem `--color-text-secondary`, contra o ui-design da FEAT-011 (SCR-WEB-007, item 2: "abaixo, em `.typography-meta` `--color-text-secondary`, o cálculo … ou 'Chosen'"). Nenhuma regra de CSS dá cor a `.typography-meta` dentro do diálogo. O caso `roll-effect` (l.256) tem a mesma forma. O "Written" desta feature usa `.impact-dialog__mode`, com `--color-text-secondary`, e está conforme. Não corrigi nem registrei.

## Testes corrigidos

Nenhum.

## Execução independente

A execução partiu do zero no Windows 11, com PowerShell e Git Bash, Node 22.15.0, Vitest 5.1.0 e Playwright 1.65.0. Usei o diretório com `C:` maiúsculo (C24). A porta 4173 estava livre, e o Playwright fez o build e subiu o `vite preview`.

- `npm run typecheck`, `npm run lint` (com as fronteiras) e `npm run packs:check` ("packs: 2 file(s) valid; no ids removed since HEAD"): verdes.
- `npm test`: 21 arquivos e 380 testes, verdes.
- `npx vitest run src/app/changes.perf.test.ts --reporter=verbose`, 3 vezes: verde, com os p95 na verificação direta. As duas guardas de tempo (`changes.perf` e `evaluate.perf`, 8 testes) passaram 3 vezes.
- `npx playwright test --retries=0 --workers=1 --reporter=list`: 204 passaram, 51 foram pulados, 0 falhas e 0 instáveis, em 9,2 min.

| Projeto | Passaram | Pulados | Falhas | Instáveis |
| :-- | --: | --: | --: | --: |
| chromium | 36 | 15 | 0 | 0 |
| firefox | 34 | 17 | 0 | 0 |
| webkit | 34 | 17 | 0 | 0 |
| mobile-chrome | 51 | 0 | 0 | 0 |
| mobile-safari | 49 | 2 | 0 | 0 |

- `story.spec.ts`: os 4 testes passaram nos 5 projetos, inclusive o novo do AC-12 e o caso do axe com o contorno do Firefox.
- CI do `18773a9`, run 45645564932: os jobs de verificação, E2E e Lighthouse verdes; o deploy saiu como pulado no `gh run view`. No E2E, "204 passed, 51 skipped", sem linha de flaky.
- Migrações: não se aplicam. O IndexedDB continua na v1, e o documento só alarga o `schema: 1` (§4).

## Verificação direta

**NFRs.** Medidas locais, indicativas, no Windows.

| NFR | Medida | Limite | Observado |
| :-- | :-- | --: | :-- |
| NFR-PERF-002 | `changes.perf.test`: candidato do Roll all, `settle` e `impact(null)`, p95 de 200 execuções, Dwarf do core com as seis tabelas, método do §5 | 20 ms | 0,674 · 0,704 · 0,727 ms (3 rodadas) |
| NFR-REL-001 | Recarga do AC-12 (E2E × 5) e do AC-3 (sessão, outra instância sobre o mesmo repositório); estado novo mantido com `save-failed` (AC-11) | — | texto escrito e decisões sobrevivem a gravar e reabrir; o estado novo fica na tela com a falha |
| NFR-ACC-001 | axe com um cartão escrito (`story.spec:290`), 5 projetos; região viva do erro (ponto 1) | sem grave | 0 violações graves; mensagem dentro da região viva nos 5 |

Pendente de ambiente: nenhuma. Pela D10, esta feature não tem E2E de tempo. O caminho comum de uma decisão segue medido pelo `perf.spec.ts` da FEAT-008, que passou nesta execução.

**Telas, contra o manifesto.**
- Os estados da SCR-WEB-009 têm teste no `Builder.test` com os textos do ui-design: write-mode, write-refused, written, write-again, mode-switch-write, roll-all, roll-all-none e roll-all-applied.
- Os da SCR-WEB-007 também: by-write, "antes escrito", by-roll-all com uma e com várias tabelas, written-line e applied-write-roll-all.
- O CSS novo da feature (`builder.css`) não tem valor solto (px, hex, ms ou rem fora dos tokens).

**Contratos.** Conferem com a §3:
- `session.write` e `session.rollAll`, com `empty-text` e `nothing-to-roll`;
- `PendingChange`, com `write` e `roll-all` (`step`, `keys`);
- `impact` com `key` nulo e `change` opcional;
- `rollAllKeys`;
- a entrada de log escrita, sem `roll`.

As divergências achadas antes da implementação têm a emenda 5 do §8.

## Achados

**Rework:** nenhum.

**Defeito de design:** nenhum.

**Pré-existentes, de outras features** (sem correção nem registro; a entrada no `defects.md` é decisão do usuário, C12):

1. **Cor do cálculo e do "Chosen" nas colunas do diálogo.**
   - Onde: `ImpactDialog.tsx:245`, caso `table`, e `:256`, caso `roll-effect`.
   - Desde: `1e40cb6` (FEAT-011).
   - Contra: o ui-design da FEAT-011 (ponto 4).
   - **Para:** o usuário (defects.md); depois, a rota de manutenção da FEAT-011.
2. **4 px de rolagem horizontal a 320 px na Story, com uma tabela rolada cuja `roll-effect` está decidida.**
   - Onde: no estado semeado Past 4 rolada com a Madness decidida, antes de qualquer ação desta feature, a página fica com `scrollWidth` 324.
   - Causa: a sonda escondeu os elementos um a um, e só esconder a caixa de valor da Past (`.roll-value`, dentro do `.roll-result`) devolve os 320 px. Ou seja, a caixa de valor e a coluna com a caixa da `roll-effect` não cabem lado a lado em 274 px.
   - Alcance: o estado é do decided-roll e do effect-reroll (FEAT-009 e FEAT-011) e só existe com pacote fictício, porque o core não tem `roll-effect`.
   - Conferido: com o Dwarf real, a Story não tem rolagem horizontal nos 5 projetos.
   - **Para:** o usuário (defects.md), contra o ui-design da FEAT-011 (decided-roll, notas responsivas) e o `design.md` §5. Sem bloqueio no MVP.

**Menores:**

1. **FR-STEP-012 fica completa pelo cálculo, mas o Human não está no Plan ref.**
   - O que acontece: o Plan ref da FR é FEAT-009 e FEAT-010, e as duas têm aceite, então a FR passa a contar como totalmente verificada. O §6 do design diz que as tabelas do Human (FEAT-016) usam os mesmos cartões, e a linha da FEAT-016 no plano não lista a FR-STEP-012. O enunciado ("um cartão para cada tabela de história da ancestralidade") vale para toda ancestralidade com tabelas.
   - Alternativas:
     - **(A)** Emenda do plano (implementation-planning): pôr "FR-STEP-012 (parcial: tabelas do Human)" na linha da FEAT-016 e a FEAT-016 no Plan ref. Prós: o RTM volta a mostrar a parte que falta. Contras: uma emenda a mais por uma FR cujo mecanismo já está pronto.
     - **(B)** Manter. Prós: o mecanismo é o mesmo, e a FEAT-016 vai ter o E2E da Story do Human pelo fluxo dela. Contras: o RTM dá a FR como completa antes de haver um Human com tabelas.
   - Recomendação: (A), pelo mesmo motivo do achado 2 do aceite da FEAT-011.
   - **Para:** o usuário; com (A), a implementation-planning.
2. **A guarda do cartão escrito no `Builder.test` não prova o texto aparado na tela,** porque o `getByText` normaliza espaços. A prova existe na sessão, no diálogo (`textContent` exato) e na sonda (ponto 2). Registro sem ação.
3. **O E2E do AC-12 não confere a região viva do erro no navegador.** O critério é cumprido pelo teste atual, e a D-ERR é conferida no jsdom e pela sonda (ponto 1).
   - Alternativas:
     - **(A)** Manter. A regra fica com o `Builder.test`, que já a prova.
     - **(B)** Acrescentar ao `story.spec.ts:229` uma asserção no mundo isolado, sem `evaluate` nem `toHaveJSProperty` (C23): `appearance.locator('.write-form [aria-live="polite"]')` com `toHaveCount(1)` antes do clique e `toContainText(EMPTY_TEXT)` depois. Prós: a regra passa a ser guardada nos 5 motores. Contras: um teste a mais para manter, para um risco que a sonda não mostrou.
   - **Para:** o usuário; com (B), a feature-implementation ou um aceite seguinte, como fortalecimento, não como correção.

Registro, sem ação: o "Status" no topo do tasks.md ainda diz "nenhuma feita". O estágio vem das caixas (C10).

## RTM

Test ref acrescentado (`features/FEAT-010-write-and-roll-all/acceptance-report.md`):
- **sem `(partial)`:** FR-DEC-003, FR-DEC-021 e FR-LOG-003. A FEAT-010 é a única feature do Plan ref delas, então ficam completas;
- **com `(partial)`, pela linha do plano:**
  - **FR-DEC-023:** continua parcial, porque o filtro das tabelas aguardando fica para a FEAT-024, que também está no Plan ref;
  - **FR-DEC-016:** continua parcial, porque a rolagem encadeada da FEAT-012 está no Plan ref e ainda não tem aceite;
  - **FR-DEC-018:** fica completa pelo cálculo. O Plan ref é FEAT-011 e FEAT-010, e as duas têm aceite: a FEAT-011 cobre Roll, Choose e Enter result, e esta cobre o Write, que fecha os quatro modos do §6;
  - **FR-STEP-012:** fica completa pelo cálculo. O Plan ref é FEAT-009 e FEAT-010, com Roll e Choose na FEAT-009 e o Write aqui, mas veja o achado menor 1 sobre o Human;
- **com `(partial)`, FRs que a feature toca pela Design ref do ui-design e que têm cobertura própria nesta feature:**
  - FR-DEC-002: o rótulo do regime com o Write (AC-1);
  - FR-CHG-001: os diálogos `write` e `roll-all` antes de aplicar (AC-6, AC-10);
  - FR-CHG-003: Current × New com a coluna escrita e uma linha por tabela no Roll all;
  - FR-CHG-004: as listas com a linha escrita e "Will be restored" sem "Will be set aside".

  O status delas não muda, porque o Plan ref é de outras features já aceitas;
- **NFRs:** NFR-PERF-002 (`(partial)`: a guarda cobre só o Roll all); NFR-REL-001, NFR-ACC-001, NFR-USE-001, NFR-L10N-001 e NFR-MAINT-002, com `(partial)`, como NFRs das fundações (plano §6).

As outras FRs citadas nas origens dos critérios (FR-DEC-015, 017; FR-CHG-002, 008, 009, 011, 015, 018, 019) não têm Design ref desta feature e ficam sem registro.
