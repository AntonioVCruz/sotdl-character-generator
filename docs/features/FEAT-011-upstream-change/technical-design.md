# Technical Design: FEAT-011 — Mudança a montante

> Feature de: `docs/implementation-plan.md` §3 (E3) e §4 (posição 5) · Épico: E3 Construtor de nível 0
> Implementa: FR-CHG-001 a 006, 008 a 012; FR-CHG-018 (parcial: sem ajuste ligado), 019; FR-DEC-015, 017, 018; FR-DEC-016 (parcial: Reroll e troca de modo); FR-STEP-005; FR-LOG-007; FR-CONT-015, 016. FR-CHG-014 sai para a FEAT-019 (D9; emenda 2 do §8)
> Realiza: UC-010 (fluxo principal; 1a, 1b, 2b, 3a, 4a) · Telas: SCR-WEB-007, e os pontos de entrada em SCR-WEB-003 e SCR-WEB-009, desenhados pelo ui-design
> Status: Verified · Data: 2026-11-17 · Decisões do usuário de 2026-11-17: D2, D5 e D9 · Emendas 1 a 3 do §8 aplicadas em 2026-11-17

## 1. Intenção

Trocar uma decisão de que outras dependem passa a ser possível: o jogador vê antes o que fica de lado, o que volta e o que se recalcula, e confirma ou mantém. Nada se apaga: o que deixa de valer fica guardado e volta com o contexto (D40). Entram também o Reroll, a troca de modo e a versão nova do pacote ao abrir. É a quinta fatia para pôr à prova o risco da ADR-004 logo que existem dependentes reais (plano §4).

## 2. Contexto do código

Levantado no `a19a1a3` (FEAT-009 aceita), nos designs e aceites das FEAT-007, 008 e 009:

- **Convenções:** comandos do `app` com resultado discriminado; o `commit` monta documento, `evaluate`, snapshot antes da gravação e gravação em série (D11 da FEAT-007; C2); schemas estritos; nome de teste começa pelo FR; `ui` não importa `content`, `storage` nem `dice`.
- **O que esta feature substitui:**
  - `commit` (`src/app/session.ts:281–307`): recusa `has-dependents` quando uma decisão viva deixa de ser gerada (D8 da FEAT-007). Sai, e o diálogo entra no lugar (§3.2);
  - `diceSlot` (`session.ts:336–343`) e `decide` (`session.ts:398`): `already-decided` em tabela decidida (D5 da FEAT-009). Viram Reroll e troca de modo. O `already-decided` fica só no ajuste de scores (FEAT-008 D3);
  - `clear` (`session.ts:426–432`): apaga a chave sem log (D9 da FEAT-009). Passa a seguir a ADR-004 §3, com o desfeito no log;
  - `open` (`session.ts:356–386`): nunca grava. Passa a gravar só quando a comparação com a marca acha diferença (§3.2).
- **Motor:** cada vaga lê só `decisions[chave]` (`chosenValue`, `tableResult`, `diceResult` em `evaluate.ts:308`, `468`, `483`). A validade de tabela (FEAT-009 D3) já ignora a decisão inválida sem apagá-la. O `preview` (`evaluate.ts:661`) é o `evaluate` de um documento hipotético; o `impact` segue o mesmo caminho.
- **Log:** só `kind: 'decision'` (FEAT-009 §3.3), com `id` em sequência no documento, que a FEAT-009 deixou para esta feature apontar.
- **Documento:** `schema: 1`, sem `earlier` nem marca; a FEAT-009 §8 registrou o limite "decidir de novo a vaga reaberta sobrescreve a suspensa", que esta feature resolve com `earlier` (ADR-004 §3).
- **Divergências:**
  1. **FEAT-001 §8 e D1** esperavam que esta feature versionasse os pacotes (`CONTENT_VERSION`) para detectar mudança ao abrir. A ADR-004 §1 e §4 (2026-11-16), posterior, detecta pela marca de registro, e o `contentVersion` não é necessário. O `CONTENT_VERSION` continua `0.0.0`. O metadado da Home volta a ficar certo em toda gravação, inclusive a da abertura com diferença; sem diferença, continua como na última gravação, como a ADR-004 §1 aceita.
  2. **Plano, blocos e telas.** A linha da FEAT-011 lista `engine.impact` e `app` e só a SCR-WEB-007. Também mudam `content` (schema do documento e do log), `ui` (Reroll e troca de modo na SCR-WEB-009, troca de ancestralidade na SCR-WEB-003, o aviso ao abrir) e `e2e/`. Emenda 2 do §8.
  3. **FR-CHG-014** não pode ser verificada sem a camada `adjustments` (FEAT-019), nem com pacote fictício. Decisão do usuário: vai para a FEAT-019 (D9; emenda 2 do §8).
  4. **Ponteiro do log** (ADR-004 §6, "entradas novas que apontam para a original"): nenhum documento diz como o comando sabe o id da entrada que registrou uma decisão. Decisão do usuário: a decisão guarda esse id (D2), o que é campo novo e escalação (emenda 1 do §8).

## 3. Contratos

### 3.1 `engine`

**Candidatos de uma vaga** (ADR-004 §3): `[decisions[k], ...earlier[k]]`, da mais recente para a mais antiga; o índice 0 é `decisions[k]`, e o índice i ≥ 1 é `earlier[k][i − 1]`. Numa vaga gerada, a **ativa** é o primeiro candidato que passa na validade da vaga. A validade não muda:

| Vaga | Passa quando |
| :-- | :-- |
| `choose-entity` | o valor é uma opção viva |
| `choose-value` | o valor está em `options` |
| `attribute-shift` | dois atributos vigentes e diferentes |
| `table` | (a) e (b) da FEAT-009 D3 |
| `roll-effect` | `rolled` ou `entered` |

O `evaluate` nunca lê `setAside` (ADR-004 §1, cuidado 3).

```ts
/** Uma decisão guardada e onde está. `decision` sem `setAside`. */
interface StoredRef { key: SlotKey; index: number; decision: Decision; parent: SlotKey | null }

SlotBase += { candidate?: number }   // na vaga decidida: o índice da ativa

type SetAsideReason = 'not-generated' | 'invalid' | 'superseded'
CharacterView += {
  /** Guardadas e não ativas (D40), na ordem das vagas e, no fim, as de vagas não geradas por chave. */
  setAside: (StoredRef & { reason: SetAsideReason; slot?: SlotView })[]
}

parentKey(key): SlotKey | null   // 'ancestry=dwarf/background=2/insanity' → 'ancestry=dwarf/background'; raiz → null
```

- Motivo: `not-generated` (a vaga não é gerada), `invalid` (não passa na validade), `superseded` (passa, mas outra mais recente da vaga passa antes: desempate da FR-CHG-018, UC-010 2b).
- A suspensa não conta como decisão aberta (FR-CHG-012, 019). A vaga gerada sem ativa fica aberta, com os candidatos guardados (FR-CHG-012).
- `slot` vem quando a vaga é gerada; numa vaga não gerada, não há vaga a mostrar.

**`impact(rules, before, after, key, afterRules = rules): Impact`** (ADR-004 §4). Avalia os dois documentos e compara as ativas. Duas decisões são a mesma quando são iguais sem a marca; com o `logged` (§4), a igualdade é exata.

```ts
interface ImpactItem extends StoredRef { slot: SlotView }   // a vaga da visão em que a decisão é ativa

interface Impact {
  /** FR-CHG-003: a vaga que muda, antes e depois; sem `to`, a vaga ficou limpa ou deixou de ser gerada. */
  change: { key: SlotKey; from?: SlotView; to?: SlotView }
  /** A ativa que sai da própria vaga: vai ao log como desfeita, nunca a `setAside` (D40 (4)). */
  undone?: Decision
  setAside: ImpactItem[]                  // FR-CHG-004, 005: ativas antes, guardadas e não ativas depois
  restored: ImpactItem[]                  // FR-CHG-004, 018: guardadas e não ativas antes, ativas depois
  recalculated: { attributes: ValueChange[]; characteristics: ValueChange[] }   // FR-CHG-006: antigo → novo
  reopened: SlotKey[]                     // FR-CHG-012: obrigatórias, vivas e abertas depois, decididas antes
  stays: ImpactItem[]                     // ativas e iguais antes e depois, fora a vaga da mudança
  needsDialog: boolean                    // FR-CHG-001, 002: setAside ou restored não vazios
  before: CharacterView
  after: CharacterView
}
```

- `setAside`, na ordem das vagas da visão de antes. Os dependentes transitivos entram por construção: a neta de uma vaga que deixa de ser gerada também deixa (FR-CHG-005). `parent` dá o "depends on" (`design.md` §4, `impact-dialog`).
- `restored`, na ordem das vagas da visão de depois, com os valores gravados (UC-010 1b).
- `recalculated`: o mesmo `diff` do `preview` (atributos pelo score, características pelo valor). A FEAT-019 acrescenta os ajustes livres afetados (FR-CHG-014, D9).
- Mudança de fontes (FEAT-004) chama o mesmo `impact` com `afterRules`, e a FEAT-004 agrupa por livro (FR-CHG-007).

**`settle(rules, document, view?)`**: a marca de registro (ADR-004 §1).

```ts
interface Settled {
  document: CharacterDocument          // cada guardada com setAside: true se não é ativa, sem a marca se é; o mesmo objeto se nada muda
  setAside: (StoredRef & { reason: SetAsideReason; slot?: SlotView })[]   // derivada suspensa e marca ausente
  restored: ImpactItem[]               // derivada ativa e marca presente
}
settle(rules, document, view = evaluate(rules, document)): Settled
```

- É a única função que lê a marca, e só para comparar (ADR-004 §1, cuidado 3).
- Depois de toda gravação desta feature, `settle` do documento gravado devolve listas vazias.
- No `commit`, as transições de `settle(rules, candidato)` são as mesmas do `impact`, porque o documento de antes já está assentado ("antes é também o que a marca registra", ADR-004 §4).

### 3.2 `app`: sessão

```ts
Snapshot (ready) += {
  /** Mudança calculada à espera de Apply ou Keep (SCR-WEB-007). O documento e a visão na tela são os de antes. */
  pending?: { kind: 'decide' | 'roll' | 'enter' | 'clear'; key: SlotKey; impact: Impact }
  /** Aviso da abertura com diferença (FR-CONT-016), até `dismissNotice`. */
  notice?: { setAside: Settled['setAside']; restored: Settled['restored'] }
}

DecideResult =
  | { ok: true }
  | { ok: false; reason: 'unknown-slot' | 'invalid-value' | 'not-decided' | 'save-failed' }
  | { ok: false; reason: 'already-decided' }           // só o ajuste de scores (FEAT-008 D3)
  | { ok: false; reason: 'out-of-range'; range: [number, number] }
  | { ok: false; reason: 'needs-confirmation' }        // novo: `pending` posto no snapshot, nada aplicado
  | { ok: false; reason: 'change-pending' }            // novo: outro comando com uma mudança pendente
  | { ok: false; reason: 'no-pending' }                // novo: confirm ou keep sem mudança pendente
// 'has-dependents' sai (D8 da FEAT-007 encerrada).

session.confirm(): Promise<DecideResult>    // novo: aplica a pendente
session.keep(): Promise<DecideResult>       // novo: recusa a pendente
session.dismissNotice(): void               // novo: tira o aviso, sem gravar
```

**Regras de escrita** (ADR-004 §3), funções puras do `app` sobre o documento, com a vaga da visão atual:

| Caso | `decisions[k]` | `earlier[k]` | Sai do documento |
| :-- | :-- | :-- | :-- |
| Vaga aberta, sem candidatos | a nova | — | — |
| Vaga aberta, com candidatos (reaberta) | a nova | a que estava em `decisions[k]` passa à frente | nada (sem log da suspensa) |
| Substituição, ativa no índice 0 | a nova | igual | a ativa (desfeita) |
| Substituição, ativa no índice i ≥ 1 | a nova | a de `decisions[k]` à frente; sai a ativa | a ativa (desfeita) |
| `clear` | o candidato mais recente que sobra | os demais, ou a chave sai | a ativa (desfeita) |

`earlier[k]` vazio sai do documento.

**Pipeline comum** dos comandos que mudam decisões, numa escrita (ADR-004 §5; D11 da FEAT-007):

1. Recusas sem escrita: vaga viva (`unknown-slot`), valor válido (`invalid-value`, `out-of-range`), ajuste de scores decidido (`already-decided`), `clear` de vaga aberta (`not-decided`), mudança pendente (`change-pending`). `decide` com o valor da ativa devolve `ok` sem gravar (D13 da FEAT-009).
2. Documento candidato pelas regras de escrita. Toda decisão nova leva `logged` = o `id` da entrada `decision` dela (D2).
3. Entradas de log, nesta ordem: a `decision` da nova (se houver); a `undone` da ativa que sai (`reason: 'replaced'` com `by` = id da nova, ou `'cleared'`); depois as de `settle(rules, candidato)`, uma `set-aside` por suspensa e uma `restored` por restaurada, com `cause: { entry }` = a entrada da mudança (a nova, ou o desfeito no `clear`). O documento sai com as marcas de `settle` (§3.1).
4. `impact(rules, antes, candidato, key)`. Sem `needsDialog`: o `commit` de sempre, com o snapshot antes da gravação (FR-CHG-002). Com `needsDialog`: `pending` no snapshot e `needs-confirmation`, sem gravar (FR-CHG-001, FR-DEC-017, FR-STEP-005).

**Comandos:**

| Comando | Vaga aberta | Vaga decidida |
| :-- | :-- | :-- |
| `decide(k, v)` | registra (FEAT-007 a 009) | substitui: Choose → Choose, troca de ancestralidade, troca de modo para Choose (FR-DEC-018, FR-STEP-005); ajuste de scores continua `already-decided` |
| `roll(k)` | rola (FEAT-009) | **Reroll**: rola de novo e substitui (FR-DEC-015); na `roll-effect`, também |
| `enter(k, sum)` | informa (FEAT-009) | substitui: troca de modo para Enter result, ou outra soma (FR-DEC-018) |
| `clear(k)` | `not-decided` | tira a ativa (FR-LOG-007) |

- **Contador** (D5): numa vaga `table`, `rolls` é o contador da vaga. A rolada grava `(prévia.rolls ?? 0) + 1`, sendo a prévia a ativa ou, na vaga reaberta, `decisions[k]`. A escolhida e a informada levam o `rolls` da prévia quando ele existe. Roll → Choose → Roll dá `rolls: 2` (FR-DEC-016).
- **`confirm()`** com pendente: tira `pending`, põe no snapshot o documento e a visão do candidato, com `at` das entradas novas e `updatedAt` na hora da confirmação, e grava (FR-CHG-008, 011). O snapshot muda antes da gravação, e a falha mantém o estado com `save: 'failed'` (FR-CHAR-010).
- **`keep()`** com pendente: tira `pending`, e o documento fica como estava (FR-CHG-009). Numa rerrolagem (pendente `roll` com `undone`), grava só o registro da recusa (FR-CHG-010): uma `decision` com o valor recusado, com `rolls` = contador + 1, e uma `undone` com `reason: 'declined'` e `ref` para ela; e a ativa passa a ter esse `rolls`. Valor, ficha e cálculo não mudam (D5).
- `retrySave` e `visit` seguem valendo com mudança pendente. `open` de outro personagem descarta a pendente.

**Abrir** (FR-CONT-015, 016; ADR-004 §4; architecture.md §6.3):

1. Ler, validar, carregar as regras e avaliar (FEAT-007, sem mudança).
2. `settle(rules, documento, visão)`. Sem transição, o snapshot fica pronto sem gravar nada (AC-17 da FEAT-009; ADR-004 §1, cuidado 2).
3. Com transição: documento assentado, entradas `set-aside` e `restored` com `cause: { content: true }`, `revision + 1` e `updatedAt`, numa gravação com o metadado; snapshot `ready` com `notice` e `save: 'saving'`, antes da gravação; falha → `save: 'failed'` e `retrySave`.
4. A visão não muda pela gravação: os derivados já seguem a versão vigente (FR-CONT-015, D2).

Isso vale também para o documento gravado antes desta feature: uma decisão já suspensa e sem marca (órfã antiga) é registrada como suspensa na primeira abertura. A importação (FEAT-002) grava o arquivo como veio, e a comparação acontece aqui (FR-CHAR-019).

**Entradas de log novas** (ADR-004 §6), sempre de acréscimo. O motor não as lê, e nenhum comando as lê (§7, D2):

```ts
LogEntry =
  | DecisionEntry                                             // FEAT-009 §3.3, sem mudança
  | { id, at, kind: 'undone', slot: SlotKey, ref?: number,
      reason: 'replaced' | 'cleared' | 'declined', by?: number }  // FR-LOG-007, FR-DEC-015, FR-CHG-010
  | { id, at, kind: 'set-aside' | 'restored', slot: SlotKey, ref?: number,
      cause: { entry: number } | { content: true } }          // FR-CHG-011, FR-LOG-007, FR-CONT-016
```

- `ref`: o `logged` da decisão a que a entrada se refere, a entrada original. Falta só nas decisões gravadas antes desta feature, que não têm `logged`.
- `by` e `cause.entry` apontam para entradas da mesma escrita. O motivo legível ("Rerolled", "Ancestry changed to Human", "Ancestry changed back to Dwarf") sai na leitura dessas entradas, com os nomes congelados (FEAT-020; `design.md` §4, `log-entry`).
- O riscado das desfeitas e a ocultação pelo interruptor são da leitura (FR-LOG-013, 014; FEAT-020).

### 3.3 `ui`: pontos de integração

| Elemento | Fonte |
| :-- | :-- |
| Diálogo de impacto (SCR-WEB-007) | `snapshot.pending.impact`: `change` (atual × novo, FR-CHG-003), `setAside` com `parent`, `restored`, `recalculated`, `stays`, `undone` (a nota da rerrolagem) |
| Apply · Keep current | `session.confirm()` · `session.keep()` |
| Troca de ancestralidade (SCR-WEB-003) | `decide('ancestry', id)` → `needs-confirmation` abre o diálogo; o aviso de `has-dependents` sai |
| Tabela decidida (SCR-WEB-009) | `table.modes` vale também na decidida: Reroll (`roll`), Choose (`decide`), Enter result (`enter`); na `roll-effect`, Reroll e Enter result. Os textos `LOCKED_ROLLED`, `LOCKED_CHOSEN` e o de `dependents-blocked` saem |
| Aviso ao abrir (FR-CONT-016) | `snapshot.notice`; `session.dismissNotice()` |
| Linha "N set aside" do `live-summary` | `view.setAside.length` (`design.md` §4) |

- **D11 e C2:** o diálogo abre pela mudança do snapshot (`pending` presente), nunca pelo retorno do comando. Depois do Apply, o estado novo entra pelo snapshot, antes da gravação. A continuação depois do `await` só desfaz a marca do clique numa recusa, e `needs-confirmation` conta como recusa para a marca: nada foi aplicado.
- **Nomes de uma suspensa sem vaga** (aviso ao abrir, vaga não gerada): `decision.logged` aponta para a entrada original, com os nomes congelados, que a tela pode ler de `snapshot.document.log` só para exibir, como a FEAT-020.
- **Pendências para o ui-design:** textos do diálogo e do aviso; foco ao abrir e ao fechar o diálogo; o rótulo do Reroll; a linha "N set aside" com o link "See Review", cuja seção (SCR-WEB-018) é da FEAT-015; o Write como modo da tabela decidida, que é da FEAT-010; a conferência C1 dos nomes novos contra `e2e/` (§7).

## 4. Mudanças de esquema

**IndexedDB:** nenhuma.

**Documento do personagem, `schema: 1`, sem migração** (ADR-004 §1; ADR-005: campos opcionais alargam o formato):

```ts
Decision (cada um dos três modos) += {
  setAside?: true            // marca de registro (ADR-004 §1)
  logged?: int >= 1          // id da entrada `decision` que a registrou (D2; emenda 1 do §8)
}
chosen  += { rolls?: int >= 1 }   // contador da vaga `table` (D5)
entered += { rolls?: int >= 1 }
document += { earlier?: Record<SlotKey, Decision[] (min 1)> }   // ADR-004 §1, §3
log: LogEntry[]                    // união com `undone`, `set-aside` e `restored` (§3.2)
```

- Regra do documento: toda chave de `earlier` tem `decisions[k]`.
- Todo documento gravado até a FEAT-009 continua válido. O arquivo exportado é o documento (FEAT-002), então leva `earlier`, as marcas e os ponteiros (FR-CHG-019, FR-CHAR-018).

**Pacote:** nenhuma mudança. `CONTENT_VERSION` continua `0.0.0` (§2, divergência 1).

## 5. Desenho dos componentes

```mermaid
sequenceDiagram
    actor J as "Jogador"
    participant UI as "ui"
    participant S as "app.session"
    participant E as "engine"
    participant R as "storage"
    J->>UI: "Choose Human (Dwarf com tabelas decididas)"
    UI->>S: "decide(ancestry, human)"
    Note over S: "candidato: Human em decisions; log: decision, undone (replaced)"
    S->>E: "settle(candidato): marcas, set-aside x n"
    S->>E: "impact(antes, candidato)"
    E-->>S: "setAside (tabelas do Dwarf), recalculated (Corruption 1 → 0)"
    S-->>UI: "snapshot com pending (needs-confirmation)"
    J->>UI: "Apply"
    UI->>S: "confirm()"
    S-->>UI: "snapshot novo (saving)"
    S->>R: "save(documento com marcas e entradas, uma escrita)"
    R-->>S: "ok (ou save failed)"
```

| Onde | Arquivo | Muda |
| :-- | :-- | :-- |
| `content` | `schemas.ts` | §4: `setAside`, `logged`, `rolls` em `chosen` e `entered`, `earlier` com a regra do documento, união do `LogEntry` |
| `engine` | `evaluate.ts` | candidatos por vaga, ativa e `candidate`; `setAside` na visão com o motivo; `parentKey` |
| `engine` | `impact.ts` (novo) | `impact` e `settle` (§3.1) |
| `app` | `changes.ts` (novo) | regras de escrita e montagem das entradas `undone`, `set-aside` e `restored` (§3.2), funções puras |
| `app` | `session.ts` | pipeline comum no lugar do `commit` com `has-dependents`; Reroll, troca de modo e `clear` novo; `pending`, `confirm`, `keep`; contador; `open` com `settle` e `notice`; `dismissNotice` |
| `ui` | `builder/AncestryStep.tsx`, `builder/TablesStep.tsx`, `screens/Builder.tsx`, `builder/copy.ts`, diálogo novo | §3.3; a tela é do ui-design |
| `e2e/` | `impact.spec.ts` (novo), `perf.spec.ts`, `ancestry.spec.ts` | §6, AC-15, AC-16; §7 |

**Guardas de desempenho** (ADR-004, Consequências; architecture.md §10). Casos novos em `src/engine/evaluate.perf.test.ts`, 200 execuções, p95:

- NFR-PERF-002, `evaluate` ≤ 20 ms: fixture de tabelas com suspensas acumuladas. São 10 ancestralidades, cada uma com 6 tabelas decididas, e só uma escolhida: 54 suspensas de vagas não geradas. As 6 tabelas da escolhida têm 5 candidatos em `earlier`, uns de outro livro (`invalid`) e outros válidos e mais antigos (`superseded`): 30 suspensas com conferência de validade.
- NFR-PERF-003, `impact` ≤ 60 ms (um quinto de 300 ms, como a guarda da NFR-PERF-002): (a) core, Dwarf com as seis tabelas decididas e o ajuste → Human; (b) a fixture acima, trocando a ancestralidade escolhida.
- E2E, `perf.spec.ts`: do clique que pede a troca de Dwarf completo para Human até o diálogo visível, 40 amostras com Keep entre elas, p95 ≤ 300 ms em `chromium` e em `mobile-chrome` com 4× de CPU. A NFR-PERF-003 não distingue aparelho, então o limite é o mesmo.

## 6. Critérios de aceitação

| # | Critério | Origem |
| :-- | :-- | :-- |
| AC-1 | O schema aceita `earlier`, `setAside`, `logged`, `rolls` em `chosen` e `entered` e as entradas `undone`, `set-aside` e `restored`, e recusa `earlier[k]` sem `decisions[k]`. Documentos e logs gravados até a FEAT-009 continuam válidos. | FR-CHG-019; ADR-004 §1; ADR-005 |
| AC-2 | Motor, pacote fictício: a ativa é o primeiro candidato válido; os outros ficam em `setAside` com o motivo `invalid` ou `superseded`, e os de vaga não gerada com `not-generated`. Com dois candidatos válidos, vale o mais recente (`decisions[k]` antes de `earlier`). Vaga gerada sem ativa fica aberta; nenhuma suspensa conta em `openDecisions` nem nos contadores da etapa. A mesma decisão com e sem `setAside` dá a mesma visão. | FR-CHG-012, 018, 019; UC-010 2b; ADR-004 §1 |
| AC-3 | `impact`: trocar a ancestralidade com uma tabela e a `roll-effect` dela decididas põe as duas em `setAside`, com `parent`, inclusive a neta; o valor que sai da própria vaga vai para `undone`, nunca para `setAside`; `restored` traz os valores gravados; `recalculated` traz antigo e novo (Corruption 1 → 0); `reopened` traz a vaga exigida que perdeu a ativa; `stays` traz o resto. `needsDialog` só com `setAside` ou `restored`. | FR-CHG-001 a 006, 012; UC-010 2 |
| AC-4 | `settle` marca cada guardada pelo estado derivado e devolve as transições; num documento assentado, nada muda, e é o mesmo objeto. No `commit`, as transições de `settle` e as listas do `impact` coincidem. | ADR-004 §1, §4 |
| AC-5 | Dwarf com Background 1 e Age rolada → Human: `needs-confirmation`, `pending` no snapshot, documento e visão iguais e nenhuma gravação. Apply: o snapshot muda antes da gravação; o documento tem `ancestry` Human com `logged`, as tabelas do Dwarf guardadas com `setAside: true` e Corruption 0; o log ganha, numa escrita, `decision` (Human), `undone` (`replaced`, `ref` da escolha do Dwarf, `by` da nova) e um `set-aside` por tabela, com `ref` e `cause`. | FR-STEP-005, FR-CHG-001, 008, 011, 019; FR-LOG-007; UC-010 1–4 |
| AC-6 | Em seguida, Human → Dwarf: diálogo só de restauração, com as tabelas e os valores originais (`restored`). Apply não chama o sorteio; Age volta com as mesmas faces e Corruption 1; o log ganha um `restored` por tabela. Com o Size do Human decidido, ele entra em `setAside` no mesmo diálogo. | FR-CHG-018 (parcial), FR-CHG-001; UC-010 1b |
| AC-7 | Sem suspensa nem restaurada, a mudança aplica direto, mesmo recalculando: troca de ancestralidade sem filhas decididas; Choose → Choose sem filha; Reroll que cai na mesma entrada com a `roll-effect` decidida (a filha fica). | FR-CHG-002; UC-010 1a |
| AC-8 | Reroll numa tabela rolada: faces novas, `rolls` = anterior + 1, a anterior sai do documento e vai ao log como `undone` (`replaced`), nunca guardada. Com a `roll-effect` da entrada anterior decidida e outra entrada sorteada: diálogo, com a filha em `setAside` e o valor anterior em `undone`. Keep: decisões e visão como estavam; o log ganha a `decision` do valor recusado (`rolls` + 1) e a `undone` `declined` com `ref` para ela; a ativa passa a ter esse `rolls`. A próxima rolagem conta a recusada. | FR-DEC-015, 016 (parcial), 017; FR-CHG-009, 010; UC-010 3a, 4a |
| AC-9 | Troca de modo: Choose numa rolada, Enter result numa rolada ou escolhida, Roll numa escolhida substituem pelas mesmas regras do AC-8, com o diálogo quando há dependentes. Choose → Choose com a `roll-effect` da entrada atual decidida abre o diálogo, com ela em `setAside`; voltar à entrada a restaura. Roll → Choose → Roll dá `rolls: 2`. A `roll-effect` aceita Reroll e Enter result. | FR-DEC-018, 017, 016 (parcial); UC-010 4a |
| AC-10 | Vaga reaberta (pacote fictício: entrada removida): decidir de novo põe a nova em `decisions[k]` e a suspensa à frente de `earlier[k]`, com a marca e sem entrada de log sobre ela. Substituir com a ativa em `earlier` segue a tabela da §3.2. `clear` tira só a ativa (`undone` `cleared`); o candidato mais recente que sobra ocupa `decisions[k]`, e, se ele passa a ser a ativa, o `impact` o traz em `restored`. | FR-CHG-018, 019; FR-LOG-007; ADR-004 §3 |
| AC-11 | `clear` com filhas decididas: diálogo, com as filhas em `setAside`. `clear` sem dependentes aplica direto e escreve a `undone`. Recusas, `decide` com o mesmo valor e `retrySave` não escrevem entrada. | FR-CHG-001, 002; FR-LOG-007; FEAT-009 D13 |
| AC-12 | Com mudança pendente, `decide`, `roll`, `enter` e `clear` devolvem `change-pending`, e nada muda; `confirm` e `keep` sem pendente devolvem `no-pending`. | FR-CHG-009 |
| AC-13 | Abrir com versão nova do pacote (fetch falso, duas instâncias do app): (i) entrada gravada removida → decisão em `setAside`, vaga reaberta, `notice` e uma gravação com a marca, o `set-aside` (`cause: { content: true }`) e o metadado; (ii) a entrada volta numa versão seguinte → `restored`, `notice` e log; (iii) só o efeito da entrada muda → o valor segue a versão nova, e nada é gravado; (iv) sem diferença → nenhuma gravação (revisão, log e `updatedAt` iguais); (v) documento antigo com órfã sem marca → registrada como suspensa na primeira abertura, e nada na segunda. A falha da gravação mostra `save-failed`, com `retrySave`. | FR-CONT-015, 016; FR-CHG-011, 012; ADR-004 §1 |
| AC-14 | As suspensas sobrevivem a gravar e reabrir, com valores, livro, `logged` e marca, e voltam com o contexto sem nova decisão. | FR-CHG-019, 018; NFR-REL-001 |
| AC-15 | E2E do fluxo crítico 2, nos 5 projetos: Dwarf com Background 1 escolhido e Age rolada → Human (diálogo, Corruption 1 → 0, Apply) → recarregar → Dwarf (diálogo de restauração, Apply), com as mesmas faces na Age e Corruption 1. Pedir Human de novo e Keep current não muda nada. axe sem violação grave com o diálogo aberto. | UC-010; ADR-008 fluxo 2; NFR-ACC-001 |
| AC-16 | Guardas da §5: `evaluate` com suspensas acumuladas ≤ 20 ms; `impact` ≤ 60 ms, no core e na fixture; E2E do diálogo ≤ 300 ms p95 em `chromium` e `mobile-chrome` 4×. | NFR-PERF-002, 003 |
| AC-17 | D11: com a gravação retida, o Apply mostra o estado novo antes do fim da gravação; o diálogo abre por `pending`, sem esperar gravação nenhuma; `save-failed` depois do Apply mantém o estado novo, com o alerta da moldura. | D11 da FEAT-007; C2; FR-CHAR-010 |

**NFRs:** NFR-PERF-002 e 003 (AC-16); NFR-REL-001 (AC-14, AC-17); NFR-ACC-001 (AC-15); NFR-USE-001 e NFR-L10N-001 (textos do ui-design); NFR-MAINT-002 (cada FR-CHG e FR-DEC desta feature com teste que o cita).

**Parciais e como se testam:**
- FR-CHG-018: sem ajuste ligado (FEAT-019). A restauração com dependentes é testada no motor e na sessão (AC-6, AC-10, AC-13 ii).
- FR-DEC-016: com a FEAT-009, cobre as tabelas; Roll all undecided (FEAT-010) e a rolagem encadeada (FEAT-012) seguem a mesma regra.
- FR-DEC-018: sem Write, que entra na FEAT-010 pelo mesmo caminho de substituição.
- FR-CHG-019: o salvamento aqui (AC-14); o arquivo é o documento, e a FEAT-002 confere a exportação de ponta a ponta.
- FR-CONT-015 e 016: com o pacote do MVP, só o core e sem segunda versão, os testes usam pacotes fictícios servidos pelo fetch falso (AC-13).

## 7. Decisões

- **D1. A mudança é um documento candidato, e o `impact` compara.** O comando monta o candidato (rolando os dados dentro dele, ADR-009), e o motor só avalia. Motivo: ADR-004 §4 e §5; o `preview` já é assim (FEAT-007 D7). Alternativa: passar ao motor uma descrição da mudança, o que obrigaria o motor a conhecer as regras de escrita. Consequência: Apply grava o candidato sem rolar de novo.
- **D2. A decisão guarda o id da sua entrada de log (`logged`).** Decisão do usuário. Motivo: a ADR-004 §6 pede que as entradas novas apontem para a original, e só uma identidade gravada evita ler o log num comando (SRS §2.5). Alternativas rejeitadas: buscar a original no log pelo conteúdo, o que faz do log entrada de um comando; ou entradas sem ponteiro, contra a ADR-004 §6 e a FR-LOG-013. Consequências: campo novo, escalação (emenda 1 do §8); decisões anteriores ficam sem ponteiro; toda asserção de igualdade sobre uma decisão gravada ganha `logged` (abaixo).
- **D3. A mudança pendente fica no snapshot, com `confirm` e `keep`.** Motivo: C2 (o diálogo nasce do snapshot) e FR-CHG-009 (nada aplicado até o Apply). Alternativa: o comando devolve o impacto e a tela guarda, o que repete o padrão dos DEF-003 a 012. Consequência: com uma pendente, os outros comandos devolvem `change-pending`.
- **D4. O mesmo `settle` assenta a marca no comando e na abertura.** Motivo: ADR-004 §1 (depois de cada gravação, a marca coincide) e §4 (abrir compara com a marca). Consequência: o documento antigo com órfã é registrado na primeira abertura (AC-13 v), e é a única gravação nova ao abrir.
- **D5. `rolls` é o contador da vaga e conta a recusada.** Decisão do usuário. Ele atravessa a troca de modo e, no Keep de uma rerrolagem, sobe na ativa, sem mudar valor, ficha nem cálculo. Motivo: FR-DEC-016 ("quantas vezes ela já foi rolada") e FR-LOG-002, sem número repetido no log. Alternativa: contador só na rolada, com a recusada fora da conta. Consequência: o Keep da rerrolagem é uma escrita, como a FR-CHG-010 já exige para o log.
- **D6. Motivo de suspensão e de restauração aponta para a entrada da mudança.** `cause: { entry }` na mudança do jogador; `{ content: true }` na abertura. Motivo: a entrada da mudança já tem os nomes congelados, e a FEAT-004 reaproveita com a entrada `sources`. Alternativa: um texto de motivo gravado, que repetiria a descrição.
- **D7. `impact` e `settle` no motor; regras de escrita no `app`.** Motivo: ADR-004 §5 (só comandos escrevem). As duas funções do motor são puras e nunca gravam.
- **D8. Apply carimba a hora da confirmação.** `at` das entradas novas e `updatedAt` são os do Apply, não os do pedido. Motivo: a FR-LOG-010 registra quando a mudança aconteceu.
- **D9. FR-CHG-014 vai para a FEAT-019.** Decisão do usuário. Sem a camada `adjustments`, não há teste possível. O contrato deixa o ponto: `recalculated` ganha os ajustes livres afetados na FEAT-019 (emenda 2 do §8).

**Contratos e testes existentes que mudam** (C7), neste commit de documentação, antes da mudança nos testes:

`src/app/session.test.ts`:
1. `FR-CALC-001: the saved document holds only inputs…` (l.221) e `FR-STEP-009: applying saves only the pair…` (l.365): a decisão nova ganha `logged: 1`.
2. `FR-FLOW-003: a switch whose dependents it would orphan gives has-dependents…` (l.296): devolve `needs-confirmation`; o snapshot mantém documento e visão e ganha `pending` com a Stature em `setAside`; nenhuma gravação. Título passa a FR-STEP-005, FR-CHG-001, FR-CHG-009.
3. `FR-STEP-011: clear of a slot with decided children gives has-dependents…` (l.445): `clear('ancestry')` devolve `needs-confirmation`, com a Stature em `setAside`, sem gravar; `keep()`, e o resto do teste como está.
4. Decisões gravadas comparadas por igualdade (l.566, 572, 580, 598, 604, 610, 616, 618): ganham `logged` com o id da entrada delas.
5. `FR-DEC-024: Choose → Choose with the roll-effect … decided gives has-dependents` (l.622): devolve `needs-confirmation`, com a Madness em `setAside`, sem gravar. Título passa a FR-DEC-017.
6. `FEAT-009 D5: roll and enter on a decided table, and Choose on a rolled or entered one, give already-decided…` (l.630): as três asserções de `already-decided` saem, porque viram Reroll e troca de modo (AC-8, AC-9). Ficam as de `invalid-value`, com o título "roll on a slot without dice and decide on a roll-effect give invalid-value".
7. `FEAT-009 D8 (FEAT-007): switching the ancestry with a decided table gives has-dependents` (l.658): devolve `needs-confirmation`, com a Age em `setAside`. Título passa a FR-STEP-005.
8. `FR-LOG-001: refusals, clear and retrySave write no entry (AC-10)` (l.779):
   - `decide(PAST, '5-6')` devolve `needs-confirmation`, seguido de `keep()`, sem entrada;
   - o `roll(AGE)` sai, porque agora é Reroll (AC-8), e entra uma recusa, `roll('ancestry=gnome/stature')` com `invalid-value`;
   - `clear(AGE)` escreve `undone` (`cleared`);
   - no fim, o log é `[1 decision AGE, 2 undone AGE, 3 decision FOE]`.
   O título passa a "refusals and retrySave write no entry; clear writes an undone entry" (FR-LOG-001, FR-LOG-007).
9. Sem mudança, conferidos: `a decision that was already an orphan…` (l.314), em que a abertura agora grava a marca, mas `opened()` zera o `save` depois de abrir e o teste só confere o `ok`; o D13 (l.802); o `already-decided` do ajuste (l.398).

`src/ui/screens/Builder.test.tsx` (os textos e estados novos são do ui-design da FEAT-011):

10. l.202: `saved[0].decisions` ganha `logged: 1`. O mesmo vale para l.825, 854, 862, 907 e 971.
11. `FR-FLOW-003: has-dependents shows a warning…` (l.322) e `FR-FLOW-003 (AC-11): has-dependents with a table result…` (l.1106): no lugar do aviso, o diálogo de impacto, com a Stature (e a Gnome Age) em "set aside". Keep current deixa tudo como as asserções de hoje, e nada é gravado.
12. `FR-DEC-007, FR-DEC-008: Roll shows…` (l.800) e `FR-DEC-012…: Choose lists every entry…` (l.829): os textos `LOCKED_ROLLED` e `LOCKED_CHOSEN` e "Roll e Enter result saem" dão lugar à tabela decidida com Reroll e troca de modo, como o ui-design definir.
13. `FR-STEP-014, FR-DEC-011: an entry with a dice effect…` (l.935): o `LOCKED_ROLLED` da `roll-effect` (l.966) sai. O `dependents-blocked` (l.973–988) passa a diálogo com a Madness em "set aside"; Keep deixa a grade na entrada 4 e nada gravado. O "aviso sai na próxima ação" é redefinido pelo ui-design.

`e2e/ancestry.spec.ts`:

14. `FR-FLOW-003, D8: switching Human with Size decided to Dwarf is refused…` (l.188): "Choose Dwarf" abre o diálogo, com o Size em "set aside"; "Keep current" e o `unchanged()` como hoje, também depois de recarregar. Título passa a FR-STEP-005, FR-CHG-009.

Também conferidos:
- **Sem mudança:** `evaluate.test.ts` e `core-view.test.ts`. As asserções são por `toMatchObject` ou por vaga, e a visão só ganha campos. O AC-17 da FEAT-009 continua: o motor não grava.
- **E2E sem mudança:** `story.spec.ts`, `attributes.spec.ts` e `builder-dock.spec.ts`. Nenhum troca a ancestralidade com filha decidida, e o `saved()` do `story.spec.ts` só confere chaves.
- **Nomes novos (C1):** "Reroll 3d6" contém "Roll 3d6", e o Playwright compara por substring, sem maiúsculas. Os localizadores atuais de "Roll 3d6" (`story.spec.ts:42` e `122`) estão no escopo de um cartão ainda não decidido. O ui-design repete a conferência com os nomes finais do diálogo e do Reroll.

## 8. Escalações e pendências

- **Escalações e emendas** (rodam logo depois deste design, C11; cada uma na skill dona do documento). As três foram aplicadas em 2026-11-17:
  1. **software-architecture, ADR-004** (D2, escalação de campo novo). Aplicada (`ff9e2f9`):
     - §1, linha `decisions`: incluir "id da entrada de log que a registrou";
     - §6: "a entrada nova aponta para a original pelo id gravado na decisão; as decisões gravadas antes não têm ponteiro";
     - §1, a mesma linha: "o número de rolagens é o contador da vaga, que atravessa a troca de modo e conta a rerrolagem recusada" (D5);
     - §4, a frase "Na recusa, nada muda, exceto o valor de rerrolagem recusado, que vai ao log como desfeito" passa a incluir o contador: a recusa de uma rerrolagem também sobe o contador da decisão ativa, na mesma escrita (D5).

     A premissa deste design, a emenda aceita (decisão do usuário), se confirmou.
  2. **implementation-planning, plano e RTM** (§2, divergências 2 e 3; D9). Aplicada (`7a48842`):
     - FR-CHG-014 sai da linha da FEAT-011 e entra na da FEAT-019; Plan ref da FR-CHG-014 no RTM;
     - na linha da FEAT-011, Blocos com `content`, `ui` e `e2e/`, e Telas com SCR-WEB-003 e SCR-WEB-009 além da SCR-WEB-007.
  3. **requirements-engineering, SRS** (D5). Aplicada (SRS v1.2.1, `48b0c71`). Só notas, sem mudar o texto de nenhum requisito: na FR-CHG-009 ("manter o personagem exatamente como estava") e na FR-DEC-016, para o Keep da rerrolagem, que sobe o `rolls` da ativa, não ser lido como violação no aceite.
- **Pergunta para a FEAT-019:** o vínculo do ajuste ligado (FR-CHG-013, FR-DEC-022) aponta para a decisão, não só para a vaga (ADR-004 §3). O `logged` é uma identidade estável da decisão, que acompanha a decisão em `earlier` e nunca muda. Ele pode servir de vínculo? Fica para o design da FEAT-019 decidir; aqui não se decide.
- **Pendências do ui-design:** as da §3.3. Se o aviso ao abrir ou o Reroll pedirem um componente que o `design.md` não tem, a escalação é do ui-design.
- **Sem emenda:** a expectativa da FEAT-001 §8 de versionar os pacotes (§2, divergência 1), superada pela ADR-004 §1 e §4.
- **Dados não verificados:** nenhum. Esta feature não muda o pacote.
- **RTM:** Design ref acrescentado nas FRs do cabeçalho, exceto a FR-CHG-014, e na NFR-PERF-002 e 003.
