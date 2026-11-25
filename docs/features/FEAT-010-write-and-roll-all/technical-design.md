# Technical Design: FEAT-010 — Write e "Roll all undecided"

> Feature de: `docs/implementation-plan.md` §3 (E3) e §4 (posição 6) · Épico: E3 Construtor de nível 0
> Implementa: FR-DEC-003, 021; FR-DEC-023 (parcial: sem tabelas aguardando); FR-DEC-016 (parcial: Roll all undecided); FR-DEC-018 (parcial: Write); FR-STEP-012 (parcial: Write); FR-LOG-003. Saem da linha do plano, por decisão do usuário (D11; emenda 1 do §8): FR-DEC-014 para a FEAT-024; FR-DEC-010, FR-STEP-015 e FR-CONT-008 (parcial: concessões) para a FEAT-012
> Realiza: UC-005 (2b sem efeito de regra, 2d, 2g, 2e no Write) · UC-006 (1) · Telas: SCR-WEB-009, desenhada pelo ui-design
> Status: Verified · Data: 2026-11-24 · Decisões do usuário de 2026-11-24: D7 e D11 · Emendas 1 a 3 do §8 aplicadas em 2026-11-24 · Emenda 5 do §8 em 2026-11-24

## 1. Intenção

Na Story, o jogador escreve o próprio resultado de uma tabela que o livro deixa rolar ou escolher (Write). O texto vai para o cartão, para o documento e para o log, e substitui o resultado anterior pelo mesmo caminho da FEAT-011. Um comando, "Roll all undecided", rola numa só vez as tabelas da etapa ainda sem decisão. É a sexta fatia porque completa os modos de decisão antes das etapas que os reusam (plano §4).

## 2. Contexto do código

Levantado no `d548c15` (FEAT-011 aceita, CI verde sem instáveis), nos designs e aceites das FEAT-009 e 011:

- **Convenções:** comandos do `app` com resultado discriminado; pipeline comum da FEAT-011 §3.2 (recusas sem escrita → candidato pelas regras de escrita → entradas de log → `impact` → aplica ou `pending`); snapshot antes da gravação (D11 da FEAT-007; C2); schemas estritos; nome de teste começa pelo FR; `ui` não importa `content`, `storage` nem `dice`.
- **Pontos que esta feature estende:**
  - `decisionSchema` (`src/content/schemas.ts:279`): três modos, `chosen`, `rolled` e `entered`. O `decisionEntrySchema` (`:328`) tem `mode` com os mesmos três e `result` sem texto;
  - `tableView` (`src/engine/evaluate.ts:541`): `modes` é `['roll', 'choose']`, ou `['roll', 'choose', 'enter']` no regime `roll`. O comentário da FEAT-009 §3.3 já previa o `write`;
  - `tableResult` (`evaluate.ts:580`): a validade (a) livro e (b) entrada, com a entrada lida antes do `switch`;
  - `session.ts`: `logDraft` (`:227`) supõe que toda decisão de tabela tem entrada; `PendingChange.kind` (`:57`) tem `decide`, `roll`, `enter` e `clear`; `priorRolls` (`:371`) já lê o `rolls` da prévia;
  - `changes.ts`: `place` (`:39`) cobre a vaga aberta, com e sem candidatos; `markEntries` (`:73`) recebe um só `cause`;
  - `impact.ts:111`: `impact(rules, before, after, key)` com uma vaga só;
  - `TablesStep.tsx:216–222`: os segmentos saem de `table.modes`, sem o `enter`, com o rótulo `candidate === 'roll' ? 'Roll' : 'Choose'`. Um modo novo apareceria como um segundo "Choose", sem erro de tipo (C8; T2);
  - `copy.ts:24`: `REGIME_LABEL['roll-or-choose']` é "Roll or choose", provisório até esta feature (ui-design da FEAT-009, "Rótulo de regime").
- **Conteúdo do MVP, conferido no PDF do core em 2026-11-24** (página impressa = PDF − 1):
  - Dwarf Background, entrada 1: só Corruption +1, sem efeito com dado (p.19). Com o pacote real, Write sobre a Background 1 recalcula a Corruption e não tem dependente. O caso com uma `roll-effect` suspensa só existe com pacote fictício: a Gnome Past 4, com Madness 1d6, dos testes da FEAT-011;
  - Clockwork: Purpose (d20) e Form (3d6) na p.16, sem ligação entre si; a criação do Clockwork (p.15) também não as liga. Nenhuma tabela do MVP aguarda outra. O único caso conhecido é o Development do *Only Human* (FEAT-024, Should);
  - nenhuma entrada das tabelas do Dwarf abre subdecisão nem concede entidade nesta feature: as entradas 12 e 13 da Background são da FEAT-012; a `entity` da Hatred é a própria entrada (D38), não uma concessão.
- **Divergências do plano** (emenda 1 do §8):
  1. **Escopo** (D11, decisões do usuário): a FR-DEC-014 vai para a FEAT-024, junto com o filtro "não aguardando" da FR-DEC-023; a FR-DEC-010, a FR-STEP-015 e a FR-CONT-008 (parcial: concessões) vão para a FEAT-012, onde está o primeiro conteúdo que as usa.
  2. **Blocos:** a linha lista `engine.evaluate` e `app`. Também mudam `engine.impact` (vaga nula, D8), `content` (schema do documento e do log), `ui` e `e2e/`.
- **Divergência de documentos** (emendas 2 e 3 do §8): a ADR-004 §1 e a nota da FR-CHG-018 dizem que a validade de uma decisão de tabela é (a) livro e (b) entrada. A decisão escrita não tem entrada; pela letra, nunca passaria em (b). Ver D2.

## 3. Contratos

### 3.1 `engine`

```ts
TableMode = 'roll' | 'choose' | 'enter' | 'write'
TableView.modes                       // + 'write' no regime 'roll-or-choose' (FR-DEC-003; D4)
TableResult += { mode: 'written'; text: string }
```

- **Modos** (FEAT-009 D6): `roll` e `choose` em toda tabela; `enter` no regime `roll`; `write` no regime `roll-or-choose`. A Hatred (`choice`) e a `roll-effect` não têm Write.
- **Vaga `table` com a ativa escrita:** `decided: true`, `result: { mode: 'written', text }`, sem `value` (não há entrada). Nenhum efeito de entrada vai ao cálculo e nenhuma `roll-effect` é gerada (D6).
- **Validade da decisão escrita** (D2): só a regra (a), `book` igual ao livro da versão vigente da tabela. A regra (b) não se aplica. Uma versão que tira entradas não muda a escrita; outro livro para a tabela a suspende (FR-CHG-015), e ela volta com o livro.
- **`rollAllKeys(view, stepId): SlotKey[]`** (D9), função pura, na ordem de `view.slots`: as vagas `table` vivas da etapa sem ativa, novas ou reabertas, de qualquer regime (D7). A `roll-effect` não entra. A FEAT-024 acrescenta o filtro das tabelas aguardando (FR-DEC-014, 023).
- **`impact(rules, before, after, key: SlotKey | null, afterRules = rules)`** (D8): com `key` nulo, o `Impact` vem sem `change` e sem `undone`, e `stays` traz todas as ativas iguais. O resto não muda. O tipo passa a `change?: { key; from?; to? }`.

### 3.2 `app`: sessão

```ts
session.write(key, text: string): Promise<DecideResult>          // novo (FR-DEC-003, 021; FR-LOG-003)
session.rollAll(stepId: string): Promise<DecideResult>           // novo (FR-DEC-023)

DecideResult += { ok: false; reason: 'empty-text' }              // FR-DEC-021
             | { ok: false; reason: 'nothing-to-roll' }          // rollAll sem vaga elegível

PendingChange =
  | { kind: 'decide' | 'roll' | 'enter' | 'clear' | 'write'; key: SlotKey; impact: Impact }
  | { kind: 'roll-all'; step: StepId; keys: SlotKey[]; impact: Impact }   // impact sem `change` (D8)
```

**`write(key, text)`**, pelo pipeline comum da FEAT-011 §3.2:
1. Recusas sem escrita: `change-pending`; vaga viva (`unknown-slot`); vaga que não é `table` → `invalid-value` (a `roll-effect` só tem Roll e Enter result, FR-STEP-014).
2. `text.trim()` vazio → `empty-text`, e nada muda (FR-DEC-021; UC-005 2g; D3). Mais de 2.000 caracteres depois do `trim` → `invalid-value`.
3. Ativa escrita com o mesmo texto (depois do `trim`) → `{ ok: true }` sem gravar nem escrever entrada (D5; FEAT-009 D13).
4. Decisão `{ mode: 'written', text: trim(text), book, rolls? }`: `book` é o livro da versão vigente da tabela; `rolls` é o da prévia, quando existe (FEAT-011 D5: a escrita leva o contador como está, como a escolhida e a informada).
5. Daí em diante, o pipeline: regras de escrita (vaga aberta, reaberta ou substituição), `logged`, entrada `decision` com o texto, `undone` da ativa que sai (`replaced`), marcas e `impact`. Com suspensas ou restauradas, `pending` com `kind: 'write'` e `needs-confirmation`.

O comando não confere se `write` está em `table.modes` (FEAT-009 D6): a tela só o oferece onde está.

**Substituição** (FR-DEC-018, parcial: Write; FR-DEC-015, 017): Write sobre uma tabela rolada, escolhida ou informada é troca de modo; Write com outro texto, substituição. As duas passam pela tabela "Regras de escrita" da FEAT-011 §3.2, sem caminho novo. Do Write para Roll, Choose ou Enter result, os comandos existentes. `roll` sobre a escrita grava `rolls` = prévia + 1. Keep e Apply como na FEAT-011: o `keep()` de um `write` não grava nada.

**`rollAll(stepId)`** (FR-DEC-023; D7, D8), um comando, um documento candidato e uma escrita (D11 da FEAT-007; C2):
1. Recusas sem escrita: `change-pending`; nenhuma vaga em `rollAllKeys(view, stepId)` → `nothing-to-roll` (também com etapa desconhecida).
2. Para cada chave, na ordem: `rollDice` da tabela (ADR-009), a decisão rolada como na FEAT-009 §3.2, com `rolls` = `(decisions[k]?.rolls ?? 0) + 1` (FEAT-011 D5; FR-DEC-016), e a regra de escrita "vaga aberta" (sem candidatos, ou reaberta: a que estava em `decisions[k]` passa à frente de `earlier[k]`). Uma entrada `decision` por tabela, nessa ordem, cada decisão com o `logged` da sua.
3. `settle` do candidato. Como nenhuma ativa sai (FR-DEC-023: nunca sobrescreve), não há `undone` nem `set-aside`. Só pode haver restauradas: uma filha guardada cuja vaga volta a ser gerada pela entrada sorteada. Cada `restored` leva `cause: { entry }` = a entrada `decision` da vaga rolada que é ancestral dela (D12).
4. `impact(rules, antes, candidato, null)`. Sem `needsDialog`, aplica direto, com o snapshot antes da gravação (FR-CHG-002). Com restauradas, `pending` com `kind: 'roll-all'`, `step`, `keys` e o `impact`, e `needs-confirmation` (FR-CHG-001).
5. `confirm()` grava o candidato sem rolar de novo (FEAT-011 D1), com a hora do Apply (D8 da FEAT-011). `keep()` não grava nada: os dados sorteados são descartados e os contadores não sobem, como no Keep de uma rolagem numa vaga aberta da FEAT-011 (a FR-CHG-010 é da rerrolagem, que substitui uma ativa).

**Entrada de log da decisão escrita** (FR-LOG-003; FEAT-009 §3.3): `mode: 'written'`, `subject` = a tabela, `source` = a procedência da tabela (sem entrada, a página é a da tabela), `result: { text }`, sem `roll`. O texto é do jogador (P22 não se aplica a ele) e fica no documento e no log.

### 3.3 `ui`: pontos de integração

| Elemento | Fonte |
| :-- | :-- |
| Segmento Write | `'write'` em `table.modes` |
| Estado escrito | `slot.result` com `mode: 'written'` (`text`) |
| Escrever, confirmar | `session.write(key, text)`; recusa `empty-text` |
| Roll all undecided | `rollAllKeys(view, step.id)` (presença e quantidade); `session.rollAll(step.id)` |
| Diálogo do Write | `pending.kind === 'write'`, como o by-decision da FEAT-011 |
| Diálogo do Roll all | `pending.kind === 'roll-all'`: `keys`, `impact.restored`, `impact.recalculated`, `impact.after`; sem `change` |
| Rótulo do regime da etapa | `REGIME_LABEL['roll-or-choose']` volta a "Roll, choose or write your own" (ui-design da FEAT-009) |

- **D11 e C2:** o estado escrito e o resultado do Roll all entram pela mudança do snapshot, antes da gravação. A continuação depois do `await` só trata a recusa (`empty-text` no campo, sem ação depois do clique, DEF-006) e desfaz a marca do clique. `needs-confirmation` conta como recusa para a marca, como na FEAT-011.
- **Onde o texto aparece** (P28): no cartão (estado escrito) e no log. O campo da ficha que recebe o resultado (`table.field`: Appearance, Background, Personality) é lido pela ficha, na FEAT-018, de `slot.table.field` e `slot.result`. A Dwarf Age e a Dwarf Build não têm `field` até a FEAT-018 (FEAT-009 §4); o texto delas fica no cartão e no log.
- **Campo de texto:** limite de 2.000 caracteres no próprio campo (D3), para a recusa `invalid-value` não ter mensagem própria.
- **Pendências para o ui-design:**
  - o segmento "Write" e o estado escrito: campo, rótulo, ação de confirmar, a mensagem do `empty-text`, a exibição do texto e como escrever de novo; o checkbox "This result has a rules effect" do `roll-card` escrito (`design.md` §4) é da FR-DEC-022 e entra com a FEAT-019;
  - a frase do regime no cartão (`REGIME_PHRASE['roll-or-choose']`, hoje "The book says to roll or choose."): se muda com o Write;
  - "Roll all undecided": lugar na etapa, o estado sem nada a rolar, foco depois da aplicação;
  - as variantes do diálogo de impacto para `write` (título e linha de uma decisão escrita, com texto longo) e para `roll-all` (sem Current × New);
  - o destino do foco depois do Apply (`appliedTarget` do `Builder.tsx`) para `write` e `roll-all`;
  - os `gaps` do manifesto da SCR-WEB-009: "waiting" passa à FEAT-024 e "with-subdecision de resultado" à FEAT-012 (D11);
  - a conferência C1 com os nomes finais (§7).

## 4. Mudanças de esquema

**IndexedDB:** nenhuma.

**Documento do personagem, `schema: 1`, sem migração** (ADR-005: campo opcional alarga o formato; como a FEAT-011 §4):

```ts
Decision += { mode: 'written', text: string (1 a 2.000, sem espaço nas pontas),
              rolls?: int >= 1, book?: BookId, setAside?: true, logged?: int >= 1 }
DecisionEntry.mode += 'written'
DecisionEntry.result += { text: string (1 a 2.000) }
```

- Todo documento e todo log gravados até a FEAT-011 continuam válidos.
- O arquivo exportado é o documento (FEAT-002), então leva os textos escritos e o texto das entradas de log.

**Pacote:** nenhuma mudança. `CONTENT_VERSION` continua `0.0.0`. Nenhum dado novo do livro entra neste design.

## 5. Desenho dos componentes

```mermaid
sequenceDiagram
    actor J as "Jogador"
    participant UI as "ui (TablesStep)"
    participant S as "app.session"
    participant D as "dice"
    participant E as "engine"
    participant R as "storage"
    J->>UI: "Roll all undecided (Story)"
    UI->>S: "rollAll(step:story)"
    S->>E: "rollAllKeys(view, step:story)"
    E-->>S: "as vagas table sem ativa, na ordem"
    loop "uma por vaga"
        S->>D: "rollDice(dado da tabela, random)"
        D-->>S: "faces"
    end
    Note over S: "candidato: uma decisão e uma entrada por tabela"
    S->>E: "settle(candidato); impact(antes, candidato, null)"
    E-->>S: "restored vazio: aplica; com restauradas: pending roll-all"
    S-->>UI: "snapshot novo (saving)"
    S->>R: "save(documento, uma escrita)"
    R-->>S: "ok (ou save failed)"
```

| Onde | Arquivo | Muda |
| :-- | :-- | :-- |
| `content` | `schemas.ts` | §4: modo `written`; `mode` e `result` da entrada de log |
| `engine` | `evaluate.ts` | `write` em `modes`; `TableResult` escrito; validade (a) da escrita; sem efeito nem `roll-effect` na escrita; `rollAllKeys` |
| `engine` | `impact.ts` | `key` nulo, `change` opcional (D8) |
| `app` | `changes.ts` | o candidato do Roll all: uma decisão por vaga pela regra "vaga aberta", entradas na ordem e `cause` por ancestral (D12) |
| `app` | `session.ts` | `write`, `rollAll`, `empty-text`, `nothing-to-roll`, `PendingChange` com `write` e `roll-all`; `logDraft` da escrita; `keep()` pelas variantes |
| `ui` | `builder/TablesStep.tsx`, `builder/copy.ts`, `builder/ImpactDialog.tsx`, `screens/Builder.tsx` | §3.3; a tela é do ui-design |
| `e2e/` | `story.spec.ts` | §6 (AC-12), §7 |

**NFR-PERF-002, guarda unitária** (D10). Um caso novo, `src/app/changes.perf.test.ts`, 200 execuções, p95 ≤ 20 ms (um quinto de 100 ms, como as guardas da FEAT-008 e 011): pacote real, Dwarf com as seis tabelas sem decisão, o candidato do Roll all com faces fixas, mais `settle` e `impact` com `key` nulo. O comando avalia o personagem o mesmo número de vezes que uma decisão (o `settle` e as duas visões do `impact`). O que cresce com o número de tabelas é só o sorteio e a regra de escrita de cada uma. Sem E2E de tempo novo (D10). Se um dia houver, o ponto de chegada é o da NFR-PERF-002 (FEAT-008 §5): o primeiro quadro depois que o último cartão rolado mostra o seu resultado, sem animação.

## 6. Critérios de aceitação

| # | Critério | Origem |
| :-- | :-- | :-- |
| AC-1 | Motor: `modes` é `['roll', 'choose', 'write']` no regime `roll-or-choose`, `['roll', 'choose']` no `choice` e `['roll', 'choose', 'enter']` no `roll`. Com Dwarf, a Story mostra Roll, Choose e Write nas cinco tabelas `roll-or-choose` e só Roll e Choose na Hatred; o cabeçalho da etapa mostra o rótulo do regime com o Write. | FR-DEC-003, FR-STEP-012 (parcial), FR-DEC-002; UC-006 1 |
| AC-2 | `write` com texto vazio, só espaços ou só quebras de linha devolve `empty-text`; o documento, a visão e o log ficam como estavam, e nada é gravado. A tela mostra o erro no campo e mantém o que foi digitado e o foco. Com mais de 2.000 caracteres depois do `trim`, `invalid-value`. | FR-DEC-021; UC-005 2g |
| AC-3 | Write na Dwarf Appearance aberta, com "  Raised by a caravan of tinkers.  " (texto do jogador): a decisão gravada é `{ mode: 'written', text: 'Raised by a caravan of tinkers.', book: 'sotdl.core', logged }`, sem `rolls`. O log ganha uma `decision` com `mode: 'written'`, `subject` Dwarf Appearance, `source` `CORE p.18` e `result: { text }`, sem `roll`. O cartão mostra o texto; nenhum efeito; a decisão sobrevive a recarregar. O snapshot muda antes da gravação. | FR-DEC-003, FR-LOG-003; UC-005 2b; NFR-REL-001 |
| AC-4 | Motor, pacote fictício: a decisão escrita vale com o `book` da versão vigente; numa versão do mesmo livro com outras entradas (uma sai, outra muda de faixa), continua valendo; com a tabela de outro livro (regras com outra procedência), fica suspensa (`invalid`) e a vaga reabre; com o livro de volta, volta a valer, sem gravação. | D2; FR-CHG-015, 018 |
| AC-5 | Substituição pelo Write (sessão): sobre uma tabela rolada, uma escolhida e (pacote fictício, Gnome Fate, D4) uma informada, a escrita entra em `decisions[k]` e a anterior vai ao log como `undone` (`replaced`, `ref`, `by`), nunca guardada. Write com outro texto substitui do mesmo modo. Write com o mesmo texto, também com espaços nas pontas, devolve `ok` sem gravar nem escrever entrada. Da escrita para Choose, Roll e Enter result, os comandos existentes substituem. Com o pacote real, Write sobre a Background 1 aplica direto, sem diálogo, e a Corruption vai de 1 a 0. | FR-DEC-018 (parcial), 015; FR-CHG-002; FEAT-009 D13 |
| AC-6 | Pacote fictício: Gnome Past 4 com a Madness 1d6 rolada; Write na Past → `needs-confirmation`, `pending` com `kind: 'write'`, a Madness em `setAside` e a Past 4 em `undone`; nada é gravado. Keep: nada muda nem é gravado. Apply: a Madness fica guardada com a marca, e o log ganha `decision` (escrita), `undone` e `set-aside`, numa escrita. Em seguida, Choose 4: diálogo só de restauração, com a Madness e os valores gravados; Apply sem sorteio. | FR-DEC-017, FR-DEC-018 (parcial); FR-CHG-001, 008, 011, 018; UC-005 2e |
| AC-7 | Contador (FEAT-011 D5): Roll (`rolls: 1`) → Write (`rolls: 1`) → Roll (`rolls: 2`) → Write (`rolls: 2`). Write numa tabela nunca rolada grava sem `rolls`. | FR-DEC-016 |
| AC-8 | Roll all undecided com o Dwarf sem decisão na Story: com sorteio fixo, as seis tabelas são roladas na ordem das vagas (Hatred incluída), numa gravação, com seis entradas `decision` em sequência, cada decisão com `rolls: 1` e o `logged` da sua; o snapshot muda antes da gravação, e a Story fica "Done". Com a Hatred escolhida e a Age escrita, só as outras quatro são roladas, e as duas decididas ficam como estavam (sem `undone`). Sem vaga elegível, `nothing-to-roll`, sem gravação; com mudança pendente, `change-pending`. A `roll-effect` aberta não é rolada. | FR-DEC-023 (parcial), FR-DEC-016 (parcial); UC-005 2d |
| AC-9 | Pacote fictício, vaga reaberta (entrada removida numa versão nova): o Roll all a rola; a nova ocupa `decisions[k]`, a suspensa passa à frente de `earlier[k]` com a marca e sem entrada de log sobre ela, e `rolls` = o dela + 1. | FR-DEC-023 (parcial), FR-DEC-016; FR-CHG-019; ADR-004 §3 |
| AC-10 | Pacote fictício: Gnome Past 4 e Madness decididas, `clear` da Past (a Madness fica guardada); Roll all com sorteio que dá 4 → `needs-confirmation`, `pending` com `kind: 'roll-all'`, `keys` na ordem e `impact` sem `change`, com a Madness em `restored`, `setAside` vazio e sem `undone`. Keep: nada é gravado e nenhum contador muda. Apply: uma gravação, com as decisões, as entradas `decision` e a `restored` com `cause.entry` = a entrada da Past. | FR-DEC-023 (parcial); FR-CHG-001, 009, 018; D8, D12 |
| AC-11 | Tela (SCR-WEB-009), pelos estados do ui-design: o Write com o estado escrito e a recusa; o Roll all undecided e o estado sem nada a rolar; os diálogos `write` e `roll-all`. D11: com a gravação retida, o estado escrito e os resultados do Roll all aparecem antes do fim da gravação; `save-failed` mantém o estado novo com o alerta da moldura; a continuação não move o foco. | FR-DEC-003, 021, 023; D11 da FEAT-007; C2; FR-CHAR-010 |
| AC-12 | E2E do fluxo crítico 1 (`story.spec.ts`), nos 5 projetos: com Dwarf, Write vazio na Dwarf Appearance é recusado; Write com texto aparece no cartão e sobrevive a recarregar; "Roll all undecided" decide as outras cinco, sem mudar a Appearance, e a Home mostra "Complete". axe sem violação grave com um cartão escrito. | UC-005 2b, 2d, 2g; UC-006; ADR-008 fluxo 1; NFR-ACC-001 |
| AC-13 | Guarda da §5: candidato do Roll all, `settle` e `impact` com o Dwarf das seis tabelas sem decisão, p95 ≤ 20 ms. | NFR-PERF-002 |
| AC-14 | O schema aceita a decisão `written` e a entrada de log com `mode: 'written'` e `result: { text }`; recusa texto vazio, com espaço nas pontas ou com mais de 2.000 caracteres. Documentos e logs gravados até a FEAT-011 continuam válidos. | ADR-004 §1; ADR-005 |

**NFRs:** NFR-PERF-002 (AC-13); NFR-REL-001 (AC-3, AC-11); NFR-ACC-001 (AC-12); NFR-USE-001 e NFR-L10N-001 (textos do ui-design); NFR-MAINT-002 (cada FR desta feature com teste que o cita).

**Parciais e como se testam:**
- FR-DEC-023: sem o filtro das tabelas aguardando, que entra com a FR-DEC-014 na FEAT-024. Com o conteúdo do MVP, nenhuma tabela aguarda, e o filtro não muda nada.
- FR-DEC-016: com as FEAT-009 e 011, cobre as tabelas e o Roll all; a rolagem encadeada é da FEAT-012.
- FR-DEC-018: com a FEAT-011, fecha (Roll, Choose, Enter result e Write).
- FR-STEP-012: com a FEAT-009, fecha para o Dwarf. As tabelas do Human (FEAT-016) usam os mesmos cartões.
- O AC-4, o caso informado do AC-5, o AC-6, o AC-9 e o AC-10 só existem com pacote fictício: o pacote do MVP não tem `roll-effect`, segunda versão, outro livro para uma tabela nem tabela de regime `roll` na Story.

## 7. Decisões

- **D1. A decisão escrita é um quarto modo, `written`, com `text` e sem entrada.** Motivo: ADR-004 §1 já lista "escrito" entre os modos e o texto entre os campos. Alternativa rejeitada: `chosen` com um campo `text`, que misturaria o valor da entrada com o texto livre e quebraria todo leitor de `chosen.value`. Consequência: a união nova quebra os leitores de modo (tasks.md, C8).
- **D2. A escrita vale pela regra (a) só.** Motivo: a FR-CHG-015 suspende "os resultados obtidos com a fonte anterior", e a escrita foi feita na tabela daquele livro; a regra (b) fala de uma entrada que a escrita não tem. Alternativas rejeitadas: escrita sempre válida (a escrita de uma tabela substituída seguiria valendo como se fosse da outra); a letra da ADR-004 §1, que daria a escrita como nunca válida. Consequência: emendas 2 e 3 do §8.
- **D3. Texto sem espaço nas pontas, de 1 a 2.000 caracteres.** O comando apara as pontas e guarda o resto como foi digitado, com as quebras de linha. Vazio depois disso é "sem texto" (FR-DEC-021). O limite protege o documento, que leva o texto na decisão e de novo em cada entrada de log (FR-LOG-003). O campo da tela impõe o mesmo limite, e a recusa do comando é só defesa. Alternativa: sem limite.
- **D4. Write é modo do regime `roll-or-choose`; o comando não fiscaliza o modo.** Motivo: FR-DEC-003 e FEAT-009 D6 (P7). O `write` recusa só a vaga que não é `table`. Consequência: com pacote fictício, a sessão aceita Write numa tabela informada (AC-5), embora a tela nunca o ofereça ali.
- **D5. Write com o mesmo texto não grava** (FEAT-009 D13), comparando os textos aparados.
- **D6. A escrita não aplica efeito de entrada nem abre vaga filha.** O efeito de regra de um resultado escrito e o ajuste ligado são da FEAT-019 (FR-DEC-022).
- **D7. Vagas do Roll all undecided** (decisão do usuário): as vagas `table` da etapa sem ativa, novas ou reabertas com candidatos guardados, de qualquer regime, inclusive a Hatred (`choice`). A `roll-effect` não entra. O filtro das tabelas aguardando é da FEAT-024. Motivo: a letra da FR-DEC-023 ("as tabelas da etapa sem decisão") e o P7.
- **D8. Uma pendente para o Roll all inteiro, com `impact` de vaga nula.** O Roll all nunca substitui uma ativa, então `setAside` fica vazio e não há `undone`; só pode haver restauradas, e com elas o diálogo (FR-CHG-001). O `impact` com `key` nulo não tem `change`. A mudança de fontes da FEAT-004 também não tem uma vaga só e pode usar a mesma forma. Alternativas rejeitadas: um diálogo por vaga (várias escritas, contra a D11 da FEAT-007 e a C2); aplicar sem diálogo (contra a FR-CHG-001); passar a primeira vaga como `key` (um `change` que não descreve a mudança).
- **D9. `rollAllKeys` no motor, usado pela sessão e pela tela.** Motivo: o botão e o comando usam a mesma regra, e a FEAT-024 acrescenta o filtro num lugar só.
- **D10. Sem E2E de tempo para o Roll all.** O comando passa pelo mesmo pipeline de uma decisão, que o `perf.spec.ts` da FEAT-008 já mede de ponta a ponta. O custo a mais é linear no número de tabelas e coberto pela guarda unitária (AC-13). Alternativa: um E2E de tempo, caro no CI porque cada amostra precisa de um Dwarf sem decisão.
- **D11. Escopo** (decisões do usuário): a FR-DEC-014 e o filtro "não aguardando" vão para a FEAT-024; a FR-DEC-010, a FR-STEP-015 e a FR-CONT-008 (parcial: concessões) vão para a FEAT-012. Motivo: nenhum conteúdo do MVP as exercita nesta feature (§2); desenhá-las aqui seria desenhar no vazio.
- **D12. A restauração no Roll all aponta para a rolagem que a causou:** `cause.entry` é a entrada `decision` da vaga rolada cuja chave é prefixo da restaurada. Motivo: FEAT-011 D6; toda restaurada do Roll all é descendente de uma vaga rolada no mesmo comando.

**Contratos e testes existentes que mudam** (C7), neste commit de documentação, antes da mudança nos testes:

1. `e2e/story.spec.ts`, teste da l.95 (`FR-STEP-012, FR-STEP-013, … no Write …`):
   - título: sai "no Write"; entra "Write on the roll-or-choose ones", com FR-DEC-003 no prefixo;
   - l.101: `'Step 3 of 8 · Roll or choose'` passa ao rótulo com o Write ("Step 3 of 8 · Roll, choose or write your own", texto final do ui-design);
   - l.108 a 112: nas cinco tabelas `roll-or-choose`, 3 segmentos, com `{ name: 'Write', exact: true }` contado 1; na Dwarf Hatred, 2 segmentos e nenhum Write;
   - l.114: `main.getByText(/write/i)` com contagem 0 sai, porque o rótulo da etapa e o segmento passam a conter "write". Os segmentos da l.108 a 112 cobrem o que ela cobria.
2. `src/ui/screens/Builder.test.tsx`, teste da l.773 (`FR-STEP-012, FR-DEC-001, FR-DEC-002, FR-DEC-004: one card per table…`):
   - l.778: `'Step 2 of 2 · Roll or choose'` passa ao rótulo com o Write;
   - l.799: os segmentos de Gnome Age e Gnome Past passam a `['Roll', 'Choose', 'Write']`; Gnome Fate, Omen e Foe continuam `['Roll', 'Choose']`;
   - o título ganha FR-DEC-003.
3. `src/engine/evaluate.test.ts:493`: `modes` da Gnome Past (`roll-or-choose`) passa a `['roll', 'choose', 'write']`. As l.492 (`choice`) e 494 (`roll`) não mudam.
4. **Condicional, do ui-design:** se a frase do regime `roll-or-choose` no cartão mudar, mudam `e2e/story.spec.ts:118` e `src/ui/screens/Builder.test.tsx:793`. O ui-design registra o texto, e a mudança vai num commit de documentação antes do teste.
5. **Só tipo, na T4** (emenda 5 do §8): com `change` opcional no `Impact` (D8), oito linhas deixam de compilar ("possibly undefined"): `src/engine/impact.test.ts:146, 147, 148, 206, 207, 226` e `src/app/session.test.ts:1201, 1229`. Passam a `change!` no lugar de `change`, com as mesmas asserções e os mesmos valores esperados.

Também conferidos:
- **Sem mudança:** `changes.test.ts` e os testes do `ImpactDialog` no `Builder.test.tsx`; o `impact.test.ts` e o `session.test.ts`, salvo o tipo do item 5. O `impact` continua aceitando uma chave, e as pendentes das variantes atuais continuam com `key`. Os `toMatchObject` sobre `pending` (`{ kind, key, impact }`) seguem casando. O `core-view.test.ts` não confere `modes`.
- **Fixtures:** nenhum documento de teste usa `written`. Os pacotes fictícios não mudam.
- **Nomes novos contra os localizadores de `e2e/` (C1),** com os rascunhos; o ui-design confere de novo com os nomes finais:
  - "Write" (segmento): os localizadores de segmento são `exact` (`story.spec.ts:37`, `:111`, `:112`; `builder-dock.spec.ts:363`) e os de texto, `getByText('Choose', { exact: true })` (`story.spec.ts:36`, `impact.spec.ts:96`). Sem colisão. O único que casa é o da l.114 (item 1);
  - "Roll all undecided" (botão): todo `getByRole('button', { name: 'Roll 3d6' })` está no escopo de um cartão (`card(page, name)`: `story.spec.ts:42`, `:122`; `impact.spec.ts:99`; `perf.spec.ts:168`), e o botão fica fora dos cartões. O `getByText('Decided.')` do `ancestry.spec.ts:193` exige o ponto, que "Roll all undecided" não tem. Se o ui-design puser uma frase com "decided." perto do botão, a conferência é dele;
  - o rótulo da etapa: só a l.101 do `story.spec.ts` o lê (item 1);
  - o campo do Write: o `getByLabel('Your 3d6 roll')` do Enter result não casa com um rótulo que não contenha "your 3d6 roll".
- **`switch` e leitores que a união nova quebra** (C8): listados no tasks.md, T2 e T3.

## 8. Escalações e pendências

- **Escalações e emendas** (rodam logo depois deste design, num prompt à parte, cada uma na skill dona; C11). As três foram aplicadas em 2026-11-24, com a do `design.md` abaixo:
  1. **implementation-planning, plano e RTM** (D11; §2, divergências 1 e 2). Aplicada (`b75cf6a`), com as duas pendências da FEAT-012 deste §8 na linha dela e o nó do grafo do §4 renomeado:
     - linha da FEAT-010: nome "Write e Roll all undecided"; FRs: FR-DEC-003, 021; FR-DEC-023 (parcial: sem tabelas aguardando); FR-DEC-016 (parcial: Roll all undecided); FR-DEC-018 (parcial: Write); FR-STEP-012 (parcial: Write); FR-LOG-003; blocos `engine.evaluate`, `engine.impact`, `content`, `app`, `ui`, `e2e/`; dados: decisões. Saem FR-DEC-010, FR-DEC-014, FR-STEP-015 e FR-CONT-008 (parcial: concessões);
     - linha da FEAT-012: entram FR-DEC-010, FR-STEP-015 e FR-CONT-008 (parcial: concessões); o texto "com o mecanismo de concessão da FEAT-010" passa a dizer que o mecanismo de concessão por resultado e a subdecisão de entrada nascem nesta fatia;
     - linha da FEAT-024: entram FR-DEC-014 e FR-DEC-023 (parcial: tabelas aguardando);
     - §4, posição 6: "FEAT-010 Write e Roll all undecided";
     - RTM, Plan ref: FR-DEC-010 e FR-STEP-015 → FEAT-012; FR-DEC-014 → FEAT-024; FR-DEC-023 → FEAT-010, FEAT-024; FR-CONT-008 sem a FEAT-010.
  2. **requirements-engineering, SRS** (D11, D2). Aplicada (SRS v1.3, `e31a7d7`). Decisão do usuário na emenda: o rastreio do UC-005 sai da FR-DEC-014, e no RTM a coluna de casos de uso dela passa a "—", como nas outras Should:
     - FR-DEC-014: nota "Não ocorre com o conteúdo do MVP", e prioridade revista para Should, como a FR-CHG-015;
     - FR-CHG-018, nota: a validade de uma decisão escrita é só a regra (a), porque ela não tem entrada (D2).
  3. **software-architecture, ADR-004 §1** (D2): na frase da validade, "para a decisão escrita, que não tem entrada, só a regra (a)". A ADR não cita a feature (C19). Aplicada (`68dd471`), em §1 ("Suspensa é derivada") e em §3 ("Mais de uma decisão por vaga").
  4. **ux-foundations, `design.md` §4** (`roll-card`, estado aguardando), por decisão do usuário: o exemplo "Waits for Purpose", que contradiz o core (§2), passou ao modelo "Waits for {table}", sem mudar estado, leiaute nem tokens. Aplicada (`a74fb04`); nenhum ui-design usa o estado, então não há re-verificação.
  5. **detailed-design, divergências achadas antes da implementação** (2026-11-24), por sondas de tipos (`tsc -b` só com as mudanças de tipo das T1 a T4, descartadas). Nenhum contrato muda; mudam a lista de testes do §7 e as listas de leitores do tasks.md:
     - `change` opcional no `Impact` (D8) quebra oito linhas de teste que o §7 dava como "Sem mudança". Mudam só no tipo, na T4 (§7, item 5);
     - `'write'` em `PendingChange['kind']` quebra o `ImpactDialog.tsx:63` (parâmetro `kind` do `impactWording`, `copy.ts`), que o tasks.md listava só na T4. Entra na T3, com o mínimo: o parâmetro aceita `'write'`, sem texto novo (a variante `write` do diálogo é da T5);
     - o `TableResult` escrito quebra o `ColumnValue` do `ImpactDialog.tsx:194, 198` (caso `table`, `result.entry`), que o tasks.md não listava. Decisão do usuário: entra na T2, com o ramo `written` mínimo, sem texto novo.
- **Sem escalação:**
  - o `design.md` §4 (`roll-card`) mantém o estado "aguardando", porque o estado continua no componente para a FEAT-024 (decisão do usuário); só o exemplo mudou (emenda 4 acima). O checkbox do estado "escrito" é da FEAT-019 (FR-DEC-022), e o ui-design desta feature desenha o estado sem ele;
  - a `ux-foundations.md` (linha da SCR-WEB-009, "aguardando" e "com subdecisão") descreve a tela inteira e continua certa. Os `gaps` do manifesto mudam de dono no ui-design desta feature (§3.3).
- **Correção do pedido, sem emenda:** a Background 1 do Dwarf não tem `roll-effect` (p.19, só Corruption +1). O caso "Write com a `roll-effect` decidida, em `setAside`, e a volta que a restaura" é o AC-6, com a Gnome Past 4 do pacote fictício.
- **Pendência do foco depois do Apply no Choose → Choose** (FEAT-011 §8, nota 1, sem caso no E2E): **não cai aqui.** O Write só chega ao diálogo com pacote fictício, e o E2E usa só o pacote real. Qualquer que seja o destino do foco que o ui-design der ao Write (o `opener` da moldura ou a coluna de resultado), o caso fica no `Builder.test.tsx`, como o Choose → Choose. Proposta: a FEAT-012, com a primeira filha real de uma entrada (o idioma da Background 13), pode ter o E2E de um Choose → Choose com dependente.
- **Para a FEAT-012** (D11), sem decidir aqui: se uma tabela que o Roll all rola abrir vagas `table` filhas (concessão de entrada), o Roll all as rola no mesmo comando ou as deixa para um segundo. Hoje o `rollAllKeys` vê só as vagas da visão de antes.
- **Pendências do ui-design:** as da §3.3.
- **Dados não verificados:** nenhum. Esta feature não muda o pacote. As conferências do §2 foram feitas no PDF do core.
- **RTM:** Design ref acrescentado nas FRs do cabeçalho: FR-DEC-003, 016, 018, 021, 023; FR-STEP-012; FR-LOG-003.
