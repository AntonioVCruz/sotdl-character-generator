# Technical Design: FEAT-009 — Decidir uma tabela: Roll, Choose, Enter result

> Feature de: `docs/implementation-plan.md` §3 (E3) e §4 (posição 4) · Épico: E3 Construtor de nível 0
> Implementa: FR-DEC-001, 002, 004, 005, 007, 008, 012, 019, 020, 024; FR-DEC-016 (parcial: contador na primeira rolagem); FR-STEP-012 (parcial: Roll e Choose, sem Write), 013, 014; FR-CALC-010, 011; FR-CALC-005 (parcial: estágios `define` e `sum`); FR-CONT-008 (parcial: tabela sem concessões nem ligações); FR-LOG-001, 002, 004, 010
> Realiza: UC-005 (fluxo principal; 2a, 2c, 3a, 2f) · UC-006 (1, 2, 4; 1a) · Telas: SCR-WEB-009 (desenhada pelo ui-design)
> Status: Verified · Data: 2026-11-15 · Emenda: 2026-11-15, com as decisões do usuário (D2, D3 e D4 reescritas, D13, AC-17, ordem das entradas) · Emenda D40: 2026-11-15 (D2, D3, D9, AC-17 (v), §8)

## 1. Intenção

Na etapa Story, o jogador com Dwarf vê um cartão por tabela de história e decide cada uma rolando ou escolhendo a entrada pela faixa, com a Hated Creature em grade. O resultado mostra dados, cálculo, entrada, página e efeitos, entra no cálculo com a origem (Corruption +1) e vai para o log. É a quarta fatia porque cria os primeiros dependentes reais, que a FEAT-011 vai tratar (plano §4).

## 2. Contexto do código

Levantado no `c8b95ab`, nas FEAT-007, 008 e 001 (technical-design, ui-design, acceptance-report) e no `docs/defects.md`; conferido de novo no `01e6638`:

- **Convenções em vigor:** comandos do `app` com resultado discriminado; schemas estritos com `jitless`; tipo do item pelo prefixo do id (FEAT-007 D4); nome de teste começa pelo FR; `ui` não importa `content`, `storage` nem `dice` (lint).
- **Contratos que esta feature estende:**
  - pacote (FEAT-007 §3.1, FEAT-008 §3.1): `GrantedSlot` tem `choose-value`, `attribute-increase` e `language-or-profession`; não há item `table`;
  - documento (FEAT-007 §4, FEAT-008 §4): toda decisão é `{ mode: 'chosen', value }`; `log: unknown[]`, sempre vazio;
  - sessão (FEAT-008 §3.2): `decide`, `clear`, `retrySave`, `visit`; `commit` comum a `decide` e `clear`, com o snapshot antes da gravação (D11 da FEAT-007) e a recusa `has-dependents` (D8 da FEAT-007);
  - motor (FEAT-008 §3.3): estágios `base → modifier → define → sum → limit → manual`, com `define` e `sum` como pontos de extensão desta feature; parcelas aditivas (D5 da FEAT-008).
- **Leitores de `Decision.value`:** `src/engine/evaluate.ts:219`, `228` e `260` leem `character.decisions[key]?.value` sem olhar o modo, e `src/app/session.ts:153` (`isValid`) e `266–271` (`decide`) supõem `chosen`. Com a união nova de `Decision` (§4), esses pontos passam a ler `value` só em `chosen` (C8; tasks T2, T3).
- **Carga da Home:** `src/app/index.ts:1–4` importa `content`, `engine` e `session` de forma estática, e a Home importa o `app`. Os schemas e o motor desta feature entram nesse caminho (NFR-PERF-001, §6).
- **`dice`:** só a fonte `cryptoRandomSource`; o sorteio de faces é desta feature (`scaffold-notes`, "Stubs").
- **Interface:** o `Builder` escolhe o corpo pelo `kind` da vaga raiz; Story não tem vaga raiz e cai no `FallbackStep`. O `DecideNow` da `AncestryStep` lista as concessões da ancestralidade escolhida em outras etapas.
- **Regra de tela em vigor** (D11 da FEAT-007; lição C2; DEF-003 a DEF-012): estado visual entra pela mudança do snapshot, nunca pelo retorno do comando; a continuação depois do `await` só desfaz a marca do clique numa recusa.
- **Divergências do plano** (para a emenda da implementation-planning, C11; §8):
  1. **FRs parciais.** O plano dá à FEAT-009 a FR-STEP-012, a FR-DEC-016 e a FR-CONT-008 inteiras. Aqui:
     - FR-STEP-012: Roll e Choose; o Write é da FEAT-010 (FR-DEC-003, 021);
     - FR-DEC-016: o contador grava 1 na primeira rolagem; contar outras rolagens exige o Reroll, da FEAT-011 (FR-DEC-015);
     - FR-CONT-008: dado, faixas, entradas, efeitos, regime e campo de destino; concessões e ligações entre tabelas entram com a semântica delas (FEAT-010, FEAT-012).
  2. **Telas.** O plano lista só a SCR-WEB-009. A SCR-WEB-003 também muda: com as tabelas concedidas pelo Dwarf, o bloco "Decide now" do Dwarf passa a existir (ui-design da FEAT-007, "Dwarf: sem concessões nesta feature").
  3. **Blocos.** O plano lista `dice`, `engine.evaluate` e `app`. Também mudam `content` (schemas da tabela, do tipo de criatura e do log), `ui` (corpo da etapa) e `packs/`.
  4. **Tabelas do Human.** Nenhuma fatia nomeia as tabelas de história do Human do core (impressas 12 e 13). Decisão do usuário: entram na FEAT-016 ("Human do core completo"), por emenda do plano. Até lá, a Story do Human continua no `FallbackStep`.
- **Adiantamento da FEAT-011:** o AC-17 adianta a parte do motor da FR-CONT-015 e 016 e da FR-CHG-015 revista (escalação 1): a validade de uma decisão de tabela na leitura (D3). Aviso ao abrir, entrada no log e diálogo de impacto continuam na FEAT-011. Vai para a emenda do plano (§8, item 4d).
- **Divergências entre documentos** (registradas; as emendas são das sessões do §8, nesta ordem):
  1. **Registro do `clear`.** A FEAT-008 §8 diz que "o registro do ajuste e do `clear` entra com a FEAT-009". O registro do ajuste entra; o do `clear` não, porque é uma entrada de desfeito (FR-LOG-007, FEAT-011). Ver D9. A FEAT-008 §8 ganha a remissão.
  2. **Enter result (D4).** A D4 informa a soma dos dados de cada expressão, sem modificador. Isso segue o exemplo da FR-DEC-020 ("3–18 para 3d6") e a validação do `design.md` §4 ("Enter a value from 3 to 18"), mas contraria:
     - a FR-DEC-019 ("o valor de cada dado ou etapa da rolagem");
     - o UC-005 2c ("o jogador informa o valor de cada dado");
     - a ADR-009, quarto item da Decisão ("com as faces informadas pelo usuário");
     - o estado "informado" do `roll-card` (`design.md` §4, l.251: "um campo por dado").
     Escalações 1, 2 e 3.
  3. **Troca de fonte de uma tabela (D2, D3).** A decisão gravada com outro livro fica suspensa (D40), e a tabela volta como decisão aberta, de acordo com o P6b revisto; a divergência que sobra é com a FR-CHG-015 ("manter os resultados já obtidos… e usar a nova fonte só nas próximas rolagens") e a ADR-004 §3 ("Se só a fonte da tabela mudar, o resultado fica…"), que as sessões 1 e 2 emendam. Escalações 1 e 2.
  4. **Errata do pacote (D3).** Faces, modificador, total e entrada gravados ficam como obtidos; só página e efeitos seguem a versão nova. Isso precisa de nota na FR-CONT-015 ("recalcular os personagens pela versão atual") e no P6a ("derivados se recalculam sozinhos"), e contraria a ADR-004 §1 ("Nada derivado é gravado"). Escalações 1 e 2.

## 3. Contratos

### 3.1 Formato do pacote (acréscimos ao `format: 1`)

Tudo estrito; nenhum campo de texto novo além de `name` de entidade.

**Itens novos:**

```ts
table: {
  id: TableId, name, page,
  dice: Dice,                                  // ADR-009
  regime: 'choice' | 'roll-or-choose' | 'roll',   // princípios §1.1; FR-DEC-002
  field?: SheetField,                          // P28: campo da ficha que recebe o resultado
  entries: Record<EntryKey, Entry>             // ADR-003: objeto com chave
}
Dice     = { count: int >= 1, sides: int >= 2, modifier?: int }
EntryKey = "n" | "n-m"                         // a faixa é a chave (D2): "3", "4-7"
Entry    = { page?: page, entity?: EntityId, effects?: Record<localName, Effect> }
Effect   = { target: AttributeId | CharacteristicId, add: number }          // estágio sum
         | { target: AttributeId | CharacteristicId, add: { dice: Dice } }  // sum, com rolagem no cartão (D7)
         | { target: AttributeId | CharacteristicId, set: number }          // estágio define
SheetField = 'appearance' | 'background' | 'personality' | 'religion' | 'languages' | 'professions'
           | 'interesting-things' | 'companions' | 'other-possessions' | 'marks-of-darkness' | 'quirks' | 'objective'
                                               // FR-SHEET-006

'creature-type': { id, name, page }            // D38; D10
```

- `Entry.page` ausente herda a página da tabela.
- **Campo novo em `step`:** `regime?`, o rótulo do cabeçalho da etapa. Cada tabela declara o seu, sem herdar o da etapa.
- **Concessão nova:** `GrantedSlot` ganha `{ kind: 'table', step: StepId, table: TableId }`. As tabelas de história são concedidas pela ancestralidade numa etapa (ADR-003 §6).

**Regras de formato verificadas na carga**, com caminho:
- cada chave de entrada é `n` ou `n-m`, com `n ≤ m`;
- as faixas, **ordenadas pelo início**, cobrem exatamente o intervalo do total, de `count + modifier` a `count × sides + modifier`, sem buraco nem sobreposição. A ordem das chaves do objeto não conta: em JS, chaves inteiras vêm antes das outras ("3", "4", "17", "18", "5-6"…, como na Dwarf Personality);
- `entity` existe no livro;
- `target` de efeito é um atributo ou característica do livro; `add.dice` segue o `Dice`;
- `table` de uma concessão existe e é item `table:`.

A conferência entre livros continua da FEAT-003.

### 3.2 `app`: sessão

```ts
SessionDeps = { …FEAT-001, random?: RandomSource }      // padrão: cryptoRandomSource (ADR-009)

session.roll(key): Promise<DecideResult>                 // novo
session.enter(key, sum: number): Promise<DecideResult>   // novo: a soma que os dados mostram (D4)
session.decide(key, value)                               // aceita EntryKey em vaga `table`

DecideResult = …FEAT-008
  | { ok: false, reason: 'out-of-range', range: [min: number, max: number] }   // FR-DEC-020; [count, count × sides]
```

`createApp` repassa `random` às sessões. Os testes injetam uma sequência fixa (ADR-009).

Nos três comandos, `modifier` é o `dice.modifier` da versão vigente da tabela (0 se ausente), e `book` é o livro da procedência que o `resolve` dá a essa versão (ADR-003 §5; FR-SRC-009).

**`roll(key)`**, numa vaga `table` ou `roll-effect`:
1. Vaga viva (`unknown-slot`); de outro `kind` → `invalid-value`.
2. Vaga decidida → `already-decided`, e nada muda (D5).
3. `dice.rollDice(slot.dice, random)` dá as faces (FR-DEC-005). É o único passo impuro, dentro do comando (ADR-004 §5).
4. `total` = soma das faces + `modifier`; na vaga `table`, `entry` = a entrada que contém o total (FR-DEC-007).
5. Decisão (D3): na `table`, `{ mode: 'rolled', dice: faces, modifier, total, entry, rolls: 1, book }`; na `roll-effect`, `{ mode: 'rolled', dice: faces, modifier, total }`. Uma entrada de log (§3.3). Daí em diante, o `commit` da FEAT-008: documento novo, `evaluate`, dependentes, snapshot antes da gravação, gravação em série.

**`enter(key, sum)`**, nas mesmas vagas:
1–2. Como no `roll`.
3. `sum` inteiro dentro de `slot.enterRange` = `[count, count × sides]`: a soma que os dados mostram, sem modificador nenhum (3d6: 3 a 18; d6+1: 1 a 6). Senão `out-of-range` com essa faixa, e nada muda (FR-DEC-019, 020; D4).
4. `total` = `sum` + `modifier`; `entry` como no `roll`.
5. Decisão: na `table`, `{ mode: 'entered', sum, modifier, total, entry, book }`; na `roll-effect`, `{ mode: 'entered', sum, modifier, total }`. Entrada de log com `mode: 'entered'` (FR-LOG-004); `commit`.

**`decide(key, entry)` numa vaga `table`** (Choose, FR-DEC-024):
1. Vaga viva; `entry` é chave de uma entrada da tabela (`invalid-value`).
2. Vaga decidida por `rolled` ou `entered` → `already-decided`: trocar de modo é da FEAT-011 (FR-DEC-018; D5).
3. Vaga decidida por `chosen` com a mesma entrada → `{ ok: true }` sem `commit` (D13).
4. Vaga decidida por `chosen` com outra entrada: substitui, como o Size (FEAT-007). Se a entrada antiga tem vaga filha decidida, o `commit` devolve `has-dependents` (D8 da FEAT-007).
5. Decisão `{ mode: 'chosen', value: entry, book }`, sem valor de dado; entrada de log; `commit`.

`decide` numa vaga `roll-effect` → `invalid-value` (o efeito com dado só tem Roll e Enter result, FR-STEP-014).

**Mesmo valor** (D13): `decide` com o valor já decidido, na ancestralidade, no Size ou no Choose, devolve `{ ok: true }` sem `commit`. Nada é gravado, e nenhuma entrada vai ao log. O ajuste continua `already-decided` (FEAT-008 D3).

**Log em todo comando que registra decisão** (FR-LOG-001): `decide` (ancestralidade, Size, ajuste, Choose), `roll` e `enter` acrescentam uma entrada a `log`, no mesmo documento e na mesma gravação (ADR-002). Não escrevem nada: as recusas, o `decide` com o mesmo valor e o `retrySave`, que grava o documento que já está na tela. `clear` e a substituição não escrevem entrada de desfeito nesta feature (D9).

**Pontos de entrada da FEAT-011** (não antecipados aqui):
- `already-decided` de `roll`, `enter` e `decide` em tabela decidida → Reroll (FR-DEC-015), troca de modo (FR-DEC-018) e contador `rolls` acima de 1 (FR-DEC-016);
- `has-dependents` em Choose → Choose e na troca de ancestralidade com tabelas decididas → diálogo de impacto (FR-DEC-017, FR-CHG-001 a 014, FR-STEP-005);
- entradas de desfeito no log, com o motivo (FR-LOG-007, FR-CHG-010, 011), inclusive para `clear` e substituição;
- decisão de tabela que deixa de valer na leitura (D3; AC-17): aviso ao abrir, log e impacto (FR-CONT-015, 016; FR-CHG-015 revista).

### 3.3 `engine`

**Vaga `table`** (filha da ancestralidade, chave `ancestry=dwarf/age`; gramática da FEAT-007 sem mudança):

```ts
SlotView (acréscimos) =
  | SlotBase & { kind: 'table', grant, table: TableView, value?: EntryKey, result?: TableResult }
  | SlotBase & { kind: 'roll-effect', dice: Dice, enterRange: [number, number], target: { id, name },
                 result?: DiceResult }                                    // D7

TableView  = { id, name, provenance, dice: Dice,
               range: [number, number],                                  // do total: count + modifier a count × sides + modifier
               enterRange: [number, number],                             // do Enter result: count a count × sides (D4)
               regime, field?,
               modes: ('roll' | 'choose' | 'enter')[],                   // D6
               entries: EntryView[] }                                    // em ordem do início da faixa
EntryView  = { key: EntryKey, range: [number, number], provenance,       // FR-DEC-008, 012
               entity?: { id, name }, effects: EffectView[] }
EffectView = { id, target: { id, name }, op: 'add' | 'set', amount: number }
           | { id, target: { id, name }, op: 'add', dice: Dice, slot: SlotKey }
TableResult = { mode: 'rolled', entry, faces: number[], modifier: number, total: number, rolls: number }
            | { mode: 'entered', entry, sum: number, modifier: number, total: number }
            | { mode: 'chosen', entry }
DiceResult  = { mode: 'rolled', faces, modifier, total } | { mode: 'entered', sum, modifier, total }
```

- **Modos:** `roll` e `choose` em toda tabela (FR-DEC-001); `enter` também na de regime `roll` (FR-DEC-004). Na `roll-effect`: `roll` e `enter`. A FEAT-010 acrescenta `write` (FR-DEC-003).
- **Ordem das entradas:** `entries` segue o início da faixa, nunca a ordem das chaves do objeto (§3.1).
- **Validade na leitura** (D3). Uma decisão de tabela vale se:
  - (a) `book` é o livro da versão vigente da tabela (FR-SRC-009). A exceção por rolagem (P2f, Should) muda essa versão só naquela vaga, e (a) compara com ela;
  - (b) a entrada gravada (`entry`, ou `value` no `chosen`) existe nessa versão.

  Se não, o cálculo ignora a decisão, mas ela continua no documento (suspensa, D40), e a vaga reabre, como a ancestralidade que sumiu (FEAT-007); se (a) e (b) voltarem a valer, ela volta sem nova gravação. Isso vale também para uma decisão de tabela sem `book` ou sem `entry`.
- **Resultado exibido:** faces (ou soma), modificador, total e entrada são os gravados, nunca recalculados pelo dado atual da tabela. Página e efeitos vêm da `EntryView` da versão vigente: os efeitos são regra, e uma errata que os muda vale para o personagem; o total e a entrada, não (D2). As conferências "faces válidas para o dado" e "a entrada contém o total" só existem no comando (§3.2).
- **Vaga `roll-effect`:** cada efeito `add.dice` da entrada vigente abre uma vaga filha da tabela, com chave `<vaga da tabela>=<entrada>/<id do efeito>` (ex.: `ancestry=clockwork/background=2/insanity`), na mesma etapa, com `source` = a tabela. É obrigatória: conta em `open`, `total` e `openDecisions` (FR-DEC-011). Trocar a entrada a faz sumir; decidida, ela é dependente. A decisão dela vale enquanto a vaga existir, com os valores gravados.
- **`OpenDecision`** ganha `table?: { id, name }`, para o rótulo da pendência ("Dwarf Age"); a `roll-effect` usa `target` e `dice`.
- **Estado da etapa:** a regra da FEAT-008 não muda. As tabelas concedidas são obrigatórias: com Dwarf, Story fica `open` com 6 em aberto, e `done` quando as seis estão decididas.

**Efeitos de resultado** (FR-CALC-010, 011; FR-CALC-005, parcial). O motor coleta os efeitos das entradas vigentes das vagas `table` decididas, em ordem de vagas, e os aplica nos estágios do P11b, para atributos e características:

| Estágio | Atributo | Característica |
| :-- | :-- | :-- |
| `base` | score da ancestralidade | fórmula (FEAT-007) |
| `modifier` | ajuste (FEAT-008) | — |
| `define` | `set` | `set` |
| `sum` | `add` | `add` |
| `limit` | — (FEAT-008 §8) | `limits` (FEAT-008) |

```ts
Stage (acréscimos) =
  | { stage: 'define', value: Value, set: number, origin: ResultOrigin }   // value = set − total anterior
  | { stage: 'sum', value: Value, origin: ResultOrigin }
ResultOrigin = { kind: 'table', key: SlotKey, stepId, table: { id, name }, entry: EntryKey }
```

- Toda parcela continua aditiva, e o total é a soma (D5 da FEAT-008). Dois `define` no mesmo alvo: aplicados em ordem de vagas, e o último vale (D8).
- Os `add` se acumulam, uma parcela por efeito (FR-CALC-011).
- Efeito `add.dice` com a vaga filha aberta: parcela `sum` com `value: null`, total `null` e `pendingOn` = chave da filha, como o Size pendente. `AttributeSummary` ganha `pendingOn?`. Decidida, a parcela vale o total gravado da filha.
- Referências leem o total (FEAT-008): Health acompanha um `sum` em Strength; o limite corta depois do `sum` (Insanity ≤ Will).
- `preview` já aceita a entrada como valor (`{ mode: 'chosen', value: entry }`), para o "o que muda" de uma escolha (FR-FLOW-014).

**Entrada de log** (montada pelo `app` a partir do `view` e das `rules` de antes do comando e da decisão gravada; o `engine` não escreve nem lê o log, ADR-004 §6):

```ts
LogEntry = {
  id: int >= 1,                 // sequência no documento; a FEAT-011 aponta para ela
  at: ISO datetime,             // FR-LOG-010
  kind: 'decision',             // FEAT-004 'sources', FEAT-011 'undone', FEAT-019 'adjustment'
  slot: SlotKey, slotKind: SlotKind, step: { id, name },
  origin: { id, name } | null,  // quem concedeu a vaga (Dwarf, a tabela); null na vaga raiz
  mode: 'chosen' | 'rolled' | 'entered',                  // FR-LOG-001; 'written' na FEAT-010
  subject: { id, name } | null, // a tabela, ou o alvo da vaga (Size)
  source: { book, abbr, page? },                          // de onde vem a regra (abaixo)
  result: { entity: { id, name } }
        | { value: number }
        | { shift: { decrease: { id, name }, increase: { id, name } } }
        | { entry: EntryKey, entity?: { id, name } },
  roll?: { count, sides, modifier, total, rolls? }
       & ({ faces: number[] } | { sum: number })          // FR-LOG-002, 004
}
```

- **`source`:** tabela → a procedência da entrada; `choose-entity` → a da entidade escolhida; demais → a do item que declara a vaga (a etapa, ou a entidade que a concedeu).
- **Nomes congelados** no momento da decisão, para a FEAT-020 mostrar a descrição sem o pacote e mesmo se um id sumir (FR-CONT-016). O tipo do filtro (Choices, Rolls) sai de `mode` na leitura (FR-LOG-012).
- `roll` repete o que a decisão grava. Em `rolled`: faces, modificador, total e, na tabela, `rolls`. Em `entered`: a soma informada, o modificador e o total, sem faces.

### 3.4 `ui`: pontos de integração

- **Despacho:** etapa sem vaga raiz e com vagas `table` → `TablesStep` (novo). O motor não sabe que a etapa se chama Story (ADR-003 §6). Sem vaga `table` (Story com Human), continua o `FallbackStep`. O `TablesStep` mostra também as pendências não-tabela da etapa como no `FallbackStep`, para nada ficar escondido.
- **Dados da SCR-WEB-009:**

| Elemento | Fonte |
| :-- | :-- |
| Cartões, na ordem | `view.slots` com `kind: 'table'` desta etapa |
| Cabeçalho do cartão | `table.name`, `table.dice`, `table.regime`, `table.provenance` |
| Modos oferecidos | `table.modes` |
| Grade do Choose | `table.entries`, na ordem do início da faixa (faixa, página, nome da entidade quando houver) |
| Resultado | `slot.result` (gravado: faces ou soma, modificador, total, entrada) + a `EntryView` vigente da entrada (faixa, página, entidade, efeitos) |
| Sem texto | toda entrada no MVP: faixa e página da `EntryView` (FR-DEC-008) |
| Efeito com dado | vaga `roll-effect` com `source.id` da tabela: `dice`, `enterRange`, `result` |
| Ações | `session.roll(key)`, `session.decide(key, entry)`, `session.enter(key, sum)` |
| Faixa válida do Enter result | `slot.enterRange` (ou `table.enterRange`); recusa `out-of-range` com `range` |

- **Entrada nos estados visuais** (D11 da FEAT-007; lição C2), para Roll, Choose e Enter result, na tabela e no efeito com dado:
  - rolado, escolhido e informado começam quando o snapshot mostra a vaga decidida (`slot.result`), o que acontece antes da gravação. Foco e anúncio ("Rolled 10 on 3d6…", `design.md` §5), se o ui-design os pedir, vêm uma vez, nessa entrada, só no cartão em que a pessoa agiu: uma marca posta no clique e consumida no efeito sobre o snapshot, como a `AttributesStep` (DEF-008).
  - A continuação depois do `await` não mexe em foco nem em estado de tela. Ela só desfaz a marca numa recusa e, no `out-of-range`, mostra o erro do campo, conferindo antes por um contador de ações (DEF-006) que a pessoa não agiu depois do clique.
  - O `decide` com o mesmo valor (D13) volta `ok` sem mudar o snapshot: a marca do clique não tem entrada a consumir e precisa ser desfeita na continuação, como numa recusa, para não disparar num snapshot posterior.
  - `save-failed` não muda nada no cartão: o resultado já está na tela, e o alerta é o da moldura (FEAT-007).
- **Escolha local:** o modo aberto no cartão (Roll ou Choose) e o valor digitado no Enter result são estado da tela; só o comando grava (D7 da FEAT-007).
- **Atalho `?slot=`:** os elementos das vagas `table` e `roll-effect` têm id da chave (`slotElementId`), para o atalho de Open decisions focar neles (FR-FLOW-011).
- **Anel de foco num contêiner:** se a grade e o seletor de modo forem radiogroups com input oculto, levam `data-focus-ring`, e a Story entra no `e2e/builder-dock.spec.ts` (C18).
- **Textos novos** (rascunho; o ui-design fecha, NFR-USE-001):
  - rótulo de pendência: `table` → nome da tabela ("Dwarf Age"); `roll-effect` → "{alvo} {dado}" ("Insanity 1d6");
  - dado: "3d6", "d20" (contagem 1 sem número);
  - efeito: "Corruption +1", "Size 1" (`set`), "Insanity +1d6";
  - sem texto: "No text added for this entry" + faixa + `source-badge` (FR-DEC-008);
  - `out-of-range`: "Enter a value from 3 to 18." (`design.md` §4, Validação);
  - tabela decidida (D5): "Rerolling or changing this result comes in a later version.";
  - `has-dependents` com tabelas: `decisionTitle` do `kind` `table` dá o nome da tabela na mensagem da FEAT-007.
- **Pendências para o ui-design:**
  - a mensagem de `has-dependents` no Choose → Choose (entrada com `roll-effect` decidida); a da FEAT-007 fala de troca de ancestralidade;
  - a mensagem da troca de ancestralidade com tabelas decididas: a `hasDependentsMessage` (`copy.ts`) diz "your Dwarf Age choice" também para um resultado rolado ou informado;
  - o texto da tabela decidida (D5) alinhado com o "isn't available yet" que já existe (`copy.ts:139`);
  - o rótulo do regime `roll-or-choose` sem citar Write, que só chega na FEAT-010;
  - o `range-grid` sem o campo "Name" (D36) nas tabelas de história: o `design.md` §4 abre o campo em toda entrada sem nome no pacote, e as entradas de Age, Build, Appearance, Background e Personality não têm nome a digitar;
  - o Enter result com um campo por expressão de dado (E9, §8), com ajuda que diga que se informa o que os dados mostram, sem modificador.
- **`DecideNow` do Dwarf** (SCR-WEB-003): passa a ter as 6 tabelas como pendências em Story. O ui-design decide como agrupá-las.
- Telas, estados (a decidir, rolado, escolhido, informado, sem texto, efeito com dado aberto e decidido, decidida sem troca), celular e o token da caixa de valor (E8, §8) são do ui-design.

## 4. Mudanças de esquema

**IndexedDB:** nenhuma.

**Documento do personagem, `schema: 1`, sem migração** (só alarga; todo documento gravado continua válido):

```ts
Decision =
  | { mode: 'chosen', value: EntityId | number | AttributeShift | EntryKey, book?: BookId }   // EntryKey e book: novos
  | { mode: 'rolled', dice: int[] (min 1), modifier: int, total: int,
      entry?: EntryKey, rolls?: int >= 1, book?: BookId }                                   // novo
  | { mode: 'entered', sum: int, modifier: int, total: int,
      entry?: EntryKey, book?: BookId }                                                     // novo
log: LogEntry[]                                                                             // era unknown[]
```

- Na vaga `table`, a decisão grava `entry` e `book`, e a rolada também `rolls` (D3). A `roll-effect` grava só dados (ou soma), modificador e total.
- O schema aceita os dois formatos. A forma certa por vaga é do comando, e uma decisão de tabela sem `book` ou sem `entry` não vale na leitura (§3.3).
- `LogEntry` como na §3.3, estrito. Os documentos de hoje têm `log: []`.

**Pacote `packs/sotdl.core.json`:** só acréscimos; nenhum id muda ou sai. Conferido no PDF do core em 2026-11-15, página impressa = PDF − 1. Faixas lidas pela posição do texto na página, porque a extração em colunas desalinha números e linhas.

| Item | Dados | Página impressa | Conferido |
| :-- | :-- | :-- | :-- |
| `step:story` | `regime: 'roll-or-choose'` ("Ancestry Tables": rolar, escolher ou inventar), rótulo do cabeçalho da etapa | 11 | sim |
| `ancestry:dwarf` | `grants`, na ordem: `hated-creature`, `age`, `build`, `appearance`, `background`, `personality`, todas `table` em `step:story` | — | — |
| `table:dwarf-hatred` | "Dwarf Hatred", d20, `regime: 'choice'` (talento Hated Creature: escolher uma criatura da tabela, p.17); 1-2 a 19-20 → Ogres, Troglodytes, Beastmen, Orcs, Goblins, Elves, Trolls, Giants, Dragons, Demons | 18 | sim |
| `table:dwarf-age` | "Dwarf Age", 3d6, `regime: 'roll-or-choose'`; 3, 4-7, 8-12, 13-15, 16-17, 18; sem efeitos | 18 | sim |
| `table:dwarf-build` | "Dwarf Build", 3d6, `regime: 'roll-or-choose'`; 3, 4-6, 7-8, 9-12, 13-15, 16-17, 18; sem efeitos | 18 | sim |
| `table:dwarf-appearance` | "Dwarf Appearance", 3d6, `regime: 'roll-or-choose'`, `field: 'appearance'`; 3-4, 5-6, 7-8, 9-11, 12-15, 16-18; sem efeitos | 18 | sim |
| `table:dwarf-background` | "Dwarf Background", d20, `regime: 'roll-or-choose'`, `field: 'background'`; 1 a 20; a entrada 1 com `{ corruption: { target: 'characteristic:corruption', add: 1 } }` | 19 | sim |
| `table:dwarf-personality` | "Dwarf Personality", 3d6, `regime: 'roll-or-choose'`, `field: 'personality'`; 3, 4, 5-6, 7-8, 9-12, 13-14, 15-16, 17, 18; sem efeitos | 19 | sim |
| `creature-type:ogre`, `troglodyte`, `beastman`, `orc`, `goblin`, `elf`, `troll`, `giant`, `dragon`, `demon` | nomes como na tabela (plural) | 18 (D10) | sim |

- O `regime` de cada tabela é declarado nela; o de `step:story` só rotula o cabeçalho da etapa.
- Nenhum texto de entrada entra no pacote (P22). As entradas de Age, Build, Appearance, Background e Personality só têm faixa e página (D36).
- **Efeitos do Background que ficam de fora** (D12), conferidos na p.19:
  - 12 (profissão Artisan) e 13 (um idioma a mais): o plano dá o mecanismo da concessão à FEAT-010 (FR-STEP-015, FR-DEC-010) e os dados de profissão e idioma à FEAT-012, que vem depois. A emenda do plano diz em qual entram (§8, item 4b);
  - 14 (battleaxe ou warhammer) e 20 (2d6 cp): FEAT-013;
  - a 7 ("2d6 years") é duração narrativa, sem alvo na ficha.
- **Sem campo de destino:** Dwarf Age e Dwarf Build não têm campo na lista da FR-SHEET-006 e ficam sem `field` até a FEAT-018 (decisão do usuário; P28). Dwarf Hatred é a escolha do talento.

Não verificado: nenhum dado desta feature.

## 5. Desenho dos componentes

```mermaid
sequenceDiagram
    actor J as "Jogador"
    participant UI as "ui (TablesStep)"
    participant S as "app.session"
    participant D as "dice"
    participant E as "engine"
    participant R as "storage"
    J->>UI: "Roll 3d6 (Dwarf Age)"
    UI->>S: "roll(ancestry=dwarf/age)"
    S->>D: "rollDice(3d6, random)"
    D-->>S: "[3, 5, 2]"
    Note over S: "total 10 = 3 + 5 + 2 + 0; entrada 8-12"
    S->>E: "evaluate(documento novo)"
    S-->>UI: "snapshot novo (saving): resultado 10 → 8-12"
    S->>R: "save(documento com a decisão e a entrada de log)"
    R-->>S: "ok (ou falha: save failed)"
```

| Onde | Arquivo | Muda |
| :-- | :-- | :-- |
| `dice` | `index.ts` | `rollDie(sides, random)` por rejeição; `rollDice({ count, sides }, random)` com uma face por dado (ADR-009). Tipo `Dice` próprio, sem importar `content` |
| `content` | `schemas.ts` | itens `table` e `creature-type`; `regime?` em `step`; concessão `table`; `Decision` com os três modos (D3); `LogEntry`; regras de formato da §3.1, com a cobertura pelo início da faixa; tipos exportados |
| `engine` | `evaluate.ts` | vagas `table` e `roll-effect`; `TableView`, `range` e `enterRange`, entradas em ordem, resultado gravado e modos; validade na leitura (a) e (b); coleta de efeitos; estágios `define` e `sum` em atributos e características; `pendingOn` dos efeitos com dado; `OpenDecision.table`; `value` lido só em `chosen` |
| `engine` | `formula.ts` | o acabamento por id (`Finish`) aplica `define` e `sum` antes do `limit` |
| `app` | `session.ts`, `index.ts` | `random` nas dependências; `roll`, `enter`, Choose em tabela; gravação da D3; `out-of-range` com `enterRange`; mesmo valor sem `commit` (D13); `isValid` dos `kind` novos; montagem da `LogEntry` no `commit` |
| `ui` | `builder/copy.ts`, `builder/LiveSummary.tsx` | rótulos dos `kind` `table` e `roll-effect`; rótulo das parcelas `define` e `sum` pela origem `table` |
| `ui` | `builder/TablesStep.tsx` (novo), `screens/Builder.tsx`, `builder/AncestryStep.tsx` | despacho; integração da §3.4; `DecideNow` com as tabelas. A tela é do ui-design |
| `packs/` | `sotdl.core.json` | §4 |
| `e2e/` | `story.spec.ts` (novo), `builder-dock.spec.ts`, `home.spec.ts` | §6 e §7 |

**Sorteio por rejeição** (ADR-009): com `limit = floor(2³² / sides) × sides`, sorteia-se até `x < limit` e devolve-se `x % sides + 1`. Cada face tem a mesma chance, e cada dado da expressão é um sorteio próprio: 3d6 são três faces somadas, nunca um número de 3 a 18 (FR-DEC-005).

**NFR-PERF-002, guarda unitária** (FEAT-008 §5): dois casos novos em `evaluate.perf.test.ts`, com o mesmo limite (200 execuções, p95 ≤ 20 ms); os dois da FEAT-008 continuam:
- pacote real: Dwarf com as seis tabelas decididas, Background 1 e o ajuste;
- pacote fictício: 6 tabelas de 20 entradas, decididas por rolagem, com 10 efeitos `add`, 4 `set` e 2 `add.dice` decididos.

## 6. Critérios de aceitação

| # | Critério | Origem |
| :-- | :-- | :-- |
| AC-1 | Com Dwarf, a etapa Story mostra um cartão por tabela, na ordem do pacote (Hatred, Age, Build, Appearance, Background, Personality), cada um com nome, dado, regime e selo `CORE p.18` ou `p.19`, e Roll e Choose. A Hatred aparece em grade com as faixas do d20 e os nomes das criaturas. Write não aparece (FEAT-010). Com Human, a Story continua no `FallbackStep`. | FR-STEP-012 (parcial), FR-STEP-013; UC-006 1, 1a |
| AC-2 | Toda tabela oferece Roll e Choose, qualquer que seja o regime: a Hatred mostra o rótulo do regime `choice` e rola; as outras mostram o rótulo do `roll-or-choose` (texto do ui-design, sem Write) e se escolhem. Com pacote fictício, uma tabela de regime `roll` oferece também Enter result, e uma `choice` não. | FR-DEC-001, 002, 004 |
| AC-3 | `rollDice` de 3d6 faz três sorteios e devolve três faces de 1 a 6; d20 faz um. Com uma fonte fixa, um valor acima do limite de rejeição é descartado e o seguinte vale; uma volta completa de resíduos dá cada face o mesmo número de vezes. | FR-DEC-005; ADR-009 |
| AC-4 | Com sorteio fixo `[3, 5, 2]`, Roll em Dwarf Age grava a decisão `{ mode: 'rolled', dice: [3, 5, 2], modifier: 0, total: 10, entry: '8-12', rolls: 1, book: 'sotdl.core' }`. A vaga mostra faces, modificador 0, total 10, entrada 8-12, página 18 e efeitos (nenhum), e o snapshot muda antes da gravação. A decisão não grava efeitos nem valores da ficha. O que a vaga mostra sai da decisão e da versão vigente da tabela; o motor nunca lê o log (ADR-004 §6). | FR-DEC-005, 007, 016 (parcial), FR-CALC-001; UC-005 1–4 |
| AC-5 | Toda entrada do MVP aparece sem texto, com faixa e página ("No text added for this entry", 8-12, `CORE p.18`). | FR-DEC-008; UC-005 3a |
| AC-6 | Choose lista todas as entradas com a faixa, na ordem do início da faixa (e o nome da criatura na Hatred). Escolher grava `{ mode: 'chosen', value: '3-4', book }`, sem valor de dado. Escolher outra entrada numa tabela escolhida substitui. | FR-DEC-012, 024; UC-005 2a |
| AC-7 | Com pacote fictício de regime `roll` em 3d6: Enter result 11 grava `{ mode: 'entered', sum: 11, modifier: 0, total: 11, entry, book }` e mostra a entrada; 2 e 19 devolvem `out-of-range` com `[3, 18]`, e nada muda nem é gravado. Em 3d6+1, a faixa continua `[3, 18]`, e 11 dá total 12 com o modificador à vista (D4). | FR-DEC-019, 020; UC-005 2c, 2f |
| AC-8 | Com pacote fictício, uma entrada com "1d6 Insanity" abre, ao ser rolada ou escolhida, a vaga `roll-effect` no mesmo cartão, com Roll e Enter result (1 a 6). Aberta, ela conta como decisão aberta, e a Insanity fica pendente (`null`, `pendingOn`). Decidida, grava `{ mode: 'rolled', dice, modifier, total }` ou `{ mode: 'entered', sum, modifier, total }`, sem `entry` nem `book`, e a Insanity soma o total. Escolher outra entrada com o efeito decidido devolve `has-dependents`. | FR-STEP-014, FR-DEC-011; UC-006 4 |
| AC-9 | Dwarf com Background 1: Corruption 1, com a composição "Standard rule: 0" e a parcela `sum` +1 de origem Dwarf Background, 1; sobrevive a recarregar. Com pacote fictício: dois `add` no mesmo alvo somam; um `set` vira parcela de diferença e o último `set` vale; a ordem é base → modifier → define → sum → limit, e o limite corta depois do `sum`; um `add` num atributo muda a característica que o referencia. | FR-CALC-010, 011, 005 (parcial); UC-005 4 |
| AC-10 | Cada `decide` (ancestralidade, Size, ajuste, Choose), `roll` e `enter` acrescenta ao log uma entrada com `id` em sequência, `at`, vaga, etapa, origem, modo, assunto, fonte com livro e página e resultado com nomes. A rolagem guarda faces, modificador, total e `rolls`; o Enter result guarda a soma informada, o modificador e o total, com `mode: 'entered'`. Recusas, `clear` e `retrySave` não escrevem entrada. `decide` com o valor já decidido (ancestralidade, Size, Choose) devolve `ok` sem gravar nem escrever entrada (D13). | FR-LOG-001, 002, 004, 010 |
| AC-11 | `roll` e `enter` numa tabela decidida, e Choose numa tabela rolada ou informada, devolvem `already-decided`, e nada muda. Trocar Dwarf por Human com uma tabela da Story decidida devolve `has-dependents`. | FEAT-011 (§3.2); D8 da FEAT-007 |
| AC-12 | Com Dwarf, Story fica "6 open" no mapa, as seis entram em Open decisions com o nome da tabela e atalho que foca o cartão, e o metadado fica `creating` com 6. Com as seis decididas, Story fica "Done" e o metadado `complete`. | FR-FLOW-001, 010, 011; FR-CHAR-005, 006 |
| AC-13 | Um resultado rolado sobrevive a recarregar com as mesmas faces, o mesmo modificador, o mesmo total e a mesma entrada, sem chamar o sorteio: abrir e avaliar nunca rolam. | NFR-REL-001; ADR-004 §5 |
| AC-14 | Com a gravação retida, Roll, Choose e Enter result mostram o resultado antes de a gravação terminar. Se a pessoa leva o foco a outro cartão durante a gravação, o fim dela não move o foco nem muda o outro cartão. Uma recusa deixa foco e campo como estavam. Com `save-failed`, o resultado fica e o alerta da moldura aparece. | D11 da FEAT-007; C2; FR-CHAR-010 |
| AC-15 | A carga recusa, com o caminho: faixa com buraco, sobreposição ou fora do dado; chave de entrada inválida; `entity` ou `target` inexistentes; concessão `table` para tabela inexistente. Com pacote fictício, uma tabela de 3d6 com as chaves `"3"`, `"4"`, `"5-6"`, `"7-16"`, `"17"`, `"18"` (o objeto põe as chaves inteiras primeiro) é aceita, e `entries` sai na ordem 3, 4, 5-6, 7-16, 17, 18; a mesma tabela sem `"5-6"` é recusada pelo buraco. O pacote do core passa no `packs:check`. | FR-CONT-008 (parcial); ADR-003 §7 |
| AC-16 | O E2E do fluxo crítico 1 percorre a Story do Dwarf a partir de "New character", nos 5 projetos: escolhe a Hatred, rola uma tabela (faces e entrada coerentes), escolhe o Background 1 e vê Corruption 1, recarrega, decide as seis e vê "Complete" na Home. axe sem violação grave na Story; a Story entra no `builder-dock.spec.ts`. | UC-005, UC-006; ADR-008 fluxo 1; NFR-ACC-001 |
| AC-17 | Só motor, com pacotes fictícios: (i) decisão rolada com modificador +2; uma versão do mesmo livro com +4 → faces, modificador, total e entrada exibidos são os gravados; (ii) uma versão em que o efeito da entrada gravada muda → o valor afetado segue a versão nova; (iii) uma versão sem a entrada gravada → a decisão é ignorada e a vaga reabre; (iv) um segundo livro, acima, com `replaces` da tabela → a decisão deixa de valer e a vaga reabre; (v) voltando à versão ou ao livro anterior (sem a versão de (iii) ou sem o livro de (iv)), a decisão gravada volta a valer, sem nova gravação nem entrada de log nesta feature. | FR-CONT-015, 016 (parte do motor); FR-CHG-015 revista; FR-SRC-009; D2, D3; D40 |

**NFRs:**
- NFR-PERF-001: a Home importa `app` → `session` → `engine` e `content` de forma estática (`src/app/index.ts:1–4`), e esta feature aumenta os dois. A verificação mede a mediana do Lighthouse CI da Home vazia no celular, com o elemento LCP (C6). Base: 2,62 s, com o parágrafo "This generator guides you…" como elemento (DEF-007); meta: 4 s.
- NFR-PERF-002 (guarda unitária da §5); NFR-REL-001 (AC-13); NFR-ACC-001 (AC-14, AC-16); NFR-L10N-001; NFR-MAINT-002 (cada FR-DEC e FR-CALC desta feature com teste que o cita).

## 7. Decisões

- **D1. Tabela é item `table:`, concedida pela ancestralidade numa etapa.** Motivo: ADR-003 §6. Consequência: um `kind` de vaga novo (`table`), com código no motor e na interface, como a ADR-003 prevê.
- **D2. A faixa é a chave da entrada** ("4-7"). Motivo: é o dado mecânico da entrada, estável e sem texto (P22). Alternativa rejeitada: slug por entrada, que exigiria um nome inventado para entradas sem nome. Consequência (decisão do usuário):
  - versão de outro livro (`replaces`, ou a troca de fonte): a decisão deixa de valer pela regra (a) da D3 e fica suspensa (D40); quando a FEAT-011 existir, entra no impacto como suspensa. Volta a valer se o livro voltar;
  - errata do mesmo livro: o resultado fica enquanto a entrada existir, mesmo que as faces hoje caíssem noutra entrada;
  - entrada removida: a vaga reabre (FR-CONT-016).
- **D3. O resultado de uma tabela é um fato registrado** (ADR-009, terceiro item da Decisão). Decisão do usuário.
  - Formatos:
    - rolada: `{ mode: 'rolled', dice: faces, modifier, total, entry, rolls: 1, book }`;
    - informada: `{ mode: 'entered', sum, modifier, total, entry, book }`, com `sum` = a soma informada;
    - escolhida: `{ mode: 'chosen', value: entry, book }`;
    - vaga `roll-effect`: `{ mode: 'rolled', dice, modifier, total }` ou `{ mode: 'entered', sum, modifier, total }`, sem `entry` nem `book`.
  - No comando (gravação): faces válidas para o dado, ou `sum` na faixa; `total` = soma das faces (ou `sum`) + modificador da versão vigente; `entry` = a entrada que contém o total.
  - Na leitura: a decisão vale se (a) `book` é o livro da versão vigente da tabela (FR-SRC-009) e (b) a entrada gravada existe nessa versão. Se não, o cálculo a ignora, mas ela continua no documento (suspensa, D40), e a vaga reabre; se (a) e (b) voltarem a valer, ela volta sem nova gravação.
    - Nenhuma gravação desta feature apaga uma decisão que não vale: o `commit` mantém as decisões de vagas que não estão vivas (`session.ts:207–212`), o `clear` recusa a vaga reaberta com `not-decided`, e abrir e avaliar não gravam.
    - Limite conhecido (decisão do usuário): decidir de novo a vaga reaberta (Roll, Enter result, Choose) grava na mesma chave e substitui a decisão suspensa. Onde a suspensa fica nesse caso é decisão da sessão 2 (ADR-004) e entra com a FEAT-011 (§8). No MVP não dá para chegar a esse caso, porque só existe o core.
    - Faces, modificador e total exibidos são os gravados, nunca recalculados pelo dado atual. Página e efeitos vêm da versão vigente: os efeitos são regra, e uma errata que os muda vale para o personagem (o total e a entrada, não). A conferência "a entrada contém o total" só existe no comando.
  - Motivo: o cartão e o log mostram o cálculo original mesmo depois de uma errata do dado (FR-DEC-007, FR-LOG-002).
  - Alternativas rejeitadas: só faces (total e entrada mudariam com uma errata do dado); faces e entrada sem modificador e total (o cartão não poderia mostrar o cálculo original depois de uma errata).
  - Consequência: a troca de fonte de uma tabela suspende o resultado obtido com a fonte anterior (D40), e a regra (a) é a definitiva, não provisória. Isso revê o P6b e a FR-CHG-015 e emenda a ADR-004 §1 e §3 (§2, divergências 3 e 4; §8, escalações 1 e 2).
- **D4. Enter result é um valor por expressão de dado: a soma que os dados mostram, sem modificador nenhum.** Decisão do usuário.
  - Faixa: `count` a `count × sides` (3d6: 3 a 18; d6+1: 1 a 6). Fora dela: `out-of-range` com `range: [count, count × sides]`.
  - Todo modificador, o da própria expressão e o de outro efeito (nenhum no MVP), é somado pelo sistema, e o cartão mostra o cálculo (FR-DEC-007).
  - Numa rolagem encadeada (FEAT-012), um valor por etapa.
  - Motivo: o exemplo da FR-DEC-020 ("3–18 para 3d6") e a validação do `design.md` §4 ("Enter a value from 3 to 18"). Contraria a FR-DEC-019 ("cada dado"), o UC-005 2c, a ADR-009 (quarto item da Decisão, "faces informadas") e o estado "informado" do `roll-card` (`design.md` l.251, "um campo por dado"): §2, divergência 2; §8, escalações 1 a 3.
  - Alternativa rejeitada: um campo por face (três campos no 3d6; quem já somou tem de lembrar cada dado).
  - Consequência: o log do Enter result tem a soma, sem faces.
- **D5. Tabela decidida não muda por Roll, Enter result ou troca de modo até a FEAT-011** (confirmada pelo usuário). O comando devolve `already-decided`. Choose → Choose substitui, como o Size, com a recusa de dependentes da D8 da FEAT-007. Motivo: Reroll, troca de modo e o desfeito no log são da FEAT-011 (FR-DEC-015, 018, FR-LOG-007). Alternativas: (a) travar também o Choose → Choose; (b) Reroll já aqui, sem desfeito no log.
- **D6. Os modos oferecidos vêm do motor (`table.modes`), e os comandos não os fiscalizam** (P7). Motivo: o regime é regra do pacote; a tela só lê.
- **D7. Efeito com dado é uma vaga filha `roll-effect`**, obrigatória, com o valor pendente até decidir. Motivo: o resultado do dado é decisão do jogador (rolada ou informada) e vai ao log (FR-STEP-014), e a chave filha dá a dependência sem grafo (ADR-004 §3). Consequência: a FEAT-010 reaproveita o mecanismo para as subdecisões (FR-DEC-010).
- **D8. Estágios `define` e `sum` valem para atributos e características**; dois `define` no mesmo alvo: o último em ordem de vagas vale. Motivo: FR-CALC-005 vale para "cada valor"; a Purpose da Clockwork (FEAT-017) soma em atributo. Sem regra de empilhamento por grupo (ADR-004 §2): nenhum dado a pede.
- **D9. Só entradas `decision` no log nesta feature** (confirmada pelo usuário). `clear` e a substituição não escrevem entrada de desfeito; a FEAT-011 traz o `kind: 'undone'` com o `id` da original e o motivo (FR-LOG-007). Motivo: plano (FR-LOG-007 na FEAT-011) e o cuidado de não antecipar a suspensão e a restauração por mudança a montante (D40), entregues pela FEAT-011 com as entradas delas no log. Alternativa: escrever já o desfeito do `clear` e da substituição, como sugere a FEAT-008 §8, e deixar o log sempre coerente. Consequência: até a FEAT-011, o log de um ajuste desfeito ou de um Size trocado tem a entrada antiga sem marca (o log só aparece na FEAT-020).
- **D10. Tipos de criatura são itens `creature-type:`, com a página da tabela Hatred** (confirmada pelo usuário). Motivo: D38. Alternativa: a página de cada criatura no bestiário, a conferir criatura por criatura. Consequência: a página pode ser corrigida depois sem mudar o id.
- **D11. Etapa sem vaga raiz escolhe o corpo pelos `kind` das vagas concedidas** (`table` → `TablesStep`). Motivo: ADR-003 §6, "a interface renderiza por tipo de vaga".
- **D12. Efeitos sem modelo ainda ficam fora dos dados**, sem marca (confirmada pelo usuário): profissão e idioma nas entradas 12 e 13 do Background (FEAT-010 ou FEAT-012, pela emenda do plano, §8 item 4b); item e dinheiro nas entradas 14 e 20 (FEAT-013). Motivo: cada um precisa do alvo da feature dele. Alternativa: um alvo `money` já aqui para o "2d6 cp", único caso de efeito com dado no Dwarf. Consequência: a FR-STEP-014 é verificada com pacote fictício, e até lá essas entradas aparecem só com faixa e página.
- **D13. `decide` com o valor já decidido não grava** (decisão do usuário). Ancestralidade, Size e Choose devolvem `{ ok: true }` sem `commit`, sem gravação e sem entrada de log. Motivo: uma entrada de log sem mudança registraria uma decisão que não houve (FR-LOG-001), e a gravação não mudaria nada. O ajuste continua `already-decided` (FEAT-008 D3).

**Contratos e testes existentes que mudam** (C7), num commit de documentação anterior à mudança no teste:
- `src/content/core-pack.test.ts`, `FR-CONT-003: has Dwarf and Human with the verified level 0 data`: `ancestry('ancestry:dwarf').grants` deixa de ser `undefined` e passa a ser as seis concessões `table` da §4.
- `src/engine/core-view.test.ts`:
  - `FR-FLOW-014: preview of Dwarf → Human…`: `changes.steps` ganha `['Story', 'open', 'not-started']`, entre Attributes e Professions & languages;
  - `FR-FLOW-014: preview from no ancestry opens the locked steps`: `['Story', 'locked', 'not-started']` passa a `['Story', 'locked', 'open']`;
  - `FR-FLOW-001: Attributes is done with Dwarf…`: nos documentos com Dwarf, Story passa de `not-started` a `open`; com Human, não muda.
- `src/app/session.test.ts`: os dois testes com documento inteiro, `FR-CALC-001: the saved document holds only inputs…` e `FR-STEP-009: applying saves only the pair…`, passam a esperar `log` com a entrada da decisão (§3.3).
- `e2e/home.spec.ts`, `FR-CHAR-004, FR-CHAR-005, FR-CHAR-006: Dwarf is "Complete"…`: o Dwarf recém-escolhido passa a "Creating · 6 open", e o título do teste muda. A mudança entra com o pacote (T6). O "Complete" com dados reais passa ao `story.spec.ts`, depois das seis tabelas (AC-16, T9), para a FR-CHAR-006 não perder o E2E.
- Sem mudança, conferidos:
  - os testes da Human na Story (`attributes.spec.ts:215–226`, `ancestry.spec.ts:128`): o Human não tem tabelas;
  - `evaluate.test.ts`, `session.test.ts` (fora dos dois acima), `Builder.test.tsx` e `Home.test.tsx`: usam pacotes fictícios ou metadados próprios, sem tabela;
  - os fixtures com `log: []`: continuam válidos;
  - o `decide` com o mesmo valor (D13): nenhum teste em `src/` nem em `e2e/` espera gravação ao repetir um valor; o `NFR-REL-001: saves run in order and the last decision wins` decide valores diferentes.
- **Nomes novos contra os localizadores de `e2e/`** (C1):
  - nenhum teste existente abre a Story com Dwarf;
  - nas telas em que os nomes novos aparecem com Dwarf (os links de Open decisions no `aside`, o "Decide now" na Ancestry), os localizadores existentes estão no escopo de `main` ou do mapa, ou procuram `button` por regex de característica (`/Health\s*14/`), e não casam com "Dwarf Age", "Go to Story" nem "Story · Dwarf";
  - o ui-design repete a conferência com os nomes finais.

## 8. Escalações e pendências

- **Escalações de arquitetura:** nenhuma entidade nem fronteira nova. `table` e tipo de criatura são itens da ADR-003 §1; vaga, efeito com origem e estágios estão na ADR-004 §2 e §3; a entrada de log é a forma física da camada `log` (ADR-004 §1, §6); o `kind` novo de vaga é a consequência prevista na ADR-003. As emendas de texto da ADR-004 e da ADR-009 estão no item 2 abaixo.
- **Emendas escaladas**, cada uma numa sessão própria, nesta ordem, depois deste design. Este design não edita esses documentos.
  1. **requirements-engineering**, uma sessão:
     - FR-DEC-019: "o valor de cada expressão de dado ou etapa da rolagem", com nota: a soma que os dados mostram, sem modificador (3d6: 3 a 18); o UC-005 2c no mesmo sentido; o texto curto da FR-DEC-019 no RTM;
     - FR-CHG-015 reescrita: quando a fonte de uma tabela mudar, os resultados obtidos com a fonte anterior ficam suspensos, a tabela volta como decisão aberta e, se a fonte anterior voltar, os resultados são restaurados (FR-SRC-014, FR-CHG-012). Prioridade com a requirements-engineering. O P6b já foi revisto pela D40;
     - FR-CONT-015, nota: recalculam-se os derivados (efeitos, fórmulas, itens); resultados de tabela ficam como obtidos e só reabrem se a entrada deixar de existir ou o livro da tabela mudar (FR-CONT-016). Nota no P6a.
  2. **software-architecture**, uma sessão:
     - ADR-009, quarto item: o Enter result informa a soma dos dados de cada expressão, validada contra `count` a `count × sides`; o sistema soma os modificadores; grava-se a soma, os modificadores, o total e a entrada. O terceiro item fica como está;
     - ADR-004 §1: a linha `decisions` com "valor de cada dado ou soma informada, modificadores e total da rolagem", e a frase: o que se grava de uma rolagem é o fato da rolagem, não um derivado das regras; os derivados seguem a versão atual;
     - ADR-004 §3: "é lida nessa versão. Se só a fonte da tabela mudar, o resultado fica…" passa a dizer que a decisão gravada com outro livro deixa de valer e fica suspensa, e que, numa errata do mesmo livro, o resultado fica enquanto a entrada existir;
     - ADR-004 (D40): onde fica a decisão suspensa quando a vaga reaberta é decidida de novo (limite da D3).
  3. **ux-foundations**, uma sessão:
     - **E8**: token `size.roll-value` = `72px` (`$type: dimension`), "roll-card value box, width and height", para a caixa de valor do `roll-card`, no `tokens.json` e no `design.md`; a lacuna do `design.md` §9 (l.345) é reescrita sem a caixa 72×72;
     - **E9**: o estado "informado" do `roll-card` (`design.md` §4, l.251) passa a "um campo por expressão de dado, com a faixa válida na ajuda".
  4. **implementation-planning**, a emenda do plano:
     - as quatro divergências do §2 (FRs parciais, SCR-WEB-003, blocos, tabelas do Human);
     - (a) a linha da FEAT-009 no plano §3: "O detailed-design cria os tokens da caixa 72×72 do `roll-card`" passa à E8, pela ux-foundations;
     - (b) em que feature entram os efeitos 12, 13, 14 e 20 do Background do Dwarf. Conferido no plano §3: 14 e 20 (item e dinheiro) cabem na FEAT-013. Para 12 (profissão Artisan) e 13 (um idioma a mais), o plano não decide sozinho: o mecanismo de conceder uma entidade com a origem é da FEAT-010 (FR-STEP-015, FR-DEC-010), mas os dados de profissão e idioma são da FEAT-012 ("Tabelas de profissão, idiomas"), posterior (posição 7, depois da FEAT-010 na 6). Os dois dependem da FEAT-012;
     - (c) as tabelas de história do Human na FEAT-016;
     - (d) a FEAT-009 adianta a validade de decisão de tabela no motor (AC-17), e a FEAT-011 fica com aviso, log e impacto (FR-CONT-015, 016; FR-CHG-015 revista).
- **D40 nas sessões 1 a 4:** além dos itens acima, cada sessão aplica a D40 nos próprios documentos: na mudança a montante, suspender e restaurar em vez de desfazer, e o log fica só como registro.
- **Ordem com as tarefas:** as emendas 1, 2 e 3 vêm antes da T1; a 4, antes do aceite (tasks.md, "Pré-requisitos").
- **Decisões do usuário (2026-11-15)**, que substituem as alternativas da versão anterior deste §8:
  - D2, D3 e D4: como no §7;
  - D5, D9, D10 e D12: como propostas;
  - D13: `decide` com o mesmo valor não grava;
  - Dwarf Age e Dwarf Build: sem `field` até a FEAT-018;
  - tabelas de história do Human: FEAT-016, por emenda do plano;
  - identidade: o Human do *Only Human* continua `revises` do mesmo `ancestry:human` (ADR-003 §2); nada muda no modelo;
  - troca de fonte de uma tabela: desfaz o resultado obtido com a fonte anterior, e a regra (a) é a definitiva. *Revista pela D40 (2026-11-15): o resultado fica suspenso e volta se a fonte voltar; a regra (a) continua definitiva;*
  - decidir de novo uma vaga reaberta substitui a decisão suspensa, como limite conhecido até a sessão 2 e a FEAT-011 (D3; 2026-11-15).
- **Pendências do ui-design:** a lista da §3.4.
- **RTM:** Design ref acrescentado nesta emenda nas FRs do cabeçalho e nas que a feature estende (FR-DEC-011, FR-CALC-001, FR-FLOW-001, 010, 011, FR-CHAR-005, 006).
- **Texto do app:** rascunhos da §3.4; o ui-design fecha (NFR-USE-001).
- **`CONTENT_VERSION`:** continua `0.0.0`.
