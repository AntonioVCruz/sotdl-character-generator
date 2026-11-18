# UI Design: FEAT-011 — Mudança a montante

> Feature de: `docs/implementation-plan.md` · Par com: `technical-design.md`
> Telas: SCR-WEB-007, SCR-WEB-003, SCR-WEB-009 (e a conferência da SCR-WEB-005) · Modo: por feature · Status: Draft · Data: 2026-11-17
> Pendente: escalação E12 (aviso ao abrir, para a ux-foundations) e pergunta P1 (linha "N set aside" do `live-summary`), em [Escalações e pendências](#escalações-e-pendências)

Autoridade: `docs/design.md` (com a D40 no `impact-dialog`, §4, e os termos do §6) e `docs/tokens.json`. Todo valor visual abaixo é token (`--…`) ou classe `.typography-*`; breakpoints pelos `@custom-media` da FEAT-007. Ícones Lucide, decorativos com `aria-hidden`. A moldura é a da FEAT-007 ([Builder frame](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#builder-frame)), salvo o que se acrescenta em [Moldura](#moldura-do-construtor). Texto da interface em inglês, sem texto dos livros (P22). Fora desta feature: a variante por fontes (FEAT-004), o ajuste ligado e o ajuste livre no diálogo (FEAT-019), o Write (FEAT-010), o log (SCR-WEB-015, FEAT-020), a Review e o descarte (SCR-WEB-018; FEAT-015 e FEAT-029).

**Regra de entrada dos estados (C2; D11 da FEAT-007; technical-design §3.3):** todo estado desta feature começa por uma mudança do snapshot. O diálogo abre quando o snapshot ganha `pending` e fecha quando o perde. O retorno de um comando só decide o que depende de uma recusa: `needs-confirmation` conta como recusa para a marca do clique (nada foi aplicado), e a continuação depois do `await` nunca abre nem fecha o diálogo, nem move o foco.

## SCR-WEB-007 — Impact dialog

- **Estratégia e fonte:** code-native; esta seção é o design.
- **Composição:** `dialog` do `design.md` §4 (`ModalOverlay`, `Modal` e `Dialog` do React Aria, com as classes `.dialog-overlay`, `.dialog`, `.dialog__content` e `.dialog__actions` que a Home já usa), com o conteúdo do `impact-dialog`. Renderizado pela moldura do construtor (`BuilderReady`), não pela etapa, para valer em qualquer etapa e sobreviver a uma troca de rota com a mudança pendente.
- **Dados:** `snapshot.pending` (`kind`, `key`, `impact`); Apply → `session.confirm()`, Keep → `session.keep()` (technical-design §3.2, §3.3).
- **Conformidade:** `dialog`, `impact-dialog`, `button-primary`, `button-secondary`, `eyebrow`, `effect-chip`, `source-badge` e a Disclosure do `value-composition` (FEAT-007), como o `design.md` §4 os define. Nenhum `button-danger`, nenhuma cor de perigo. Termos só os da D40 (§6). Sem token nem componente novo.

### Estrutura

```
┌ dialog ───────────────────────────────────────────────────────────┐
│ Switch from Dwarf to Human?                                        │  h2 .typography-heading (nome do diálogo)
│                                                                    │
│ CURRENT                          NEW                               │  h3 eyebrow --color-text-secondary
│ Dwarf  CORE p.17                 Human  CORE p.16                  │  .typography-title-sm + source-badge
│                                                                    │
│ (nota da rerrolagem, só nela)                                      │
│ ─────────────────────────────────────────────────────────────────  │  divisor --color-border-divider
│ Will be set aside                                                  │  h3 .typography-label
│ [archive] Dwarf Age: 8–12 · rolled                                 │
│ [archive] Dwarf Background: 1 · chosen                             │
│ [archive] Insanity 1d6: 4 · rolled                                 │
│           depends on Dwarf Background                              │  .typography-caption --color-text-secondary
│ Set-aside decisions stay with this character, off the sheet, …     │  nota da D40, .typography-meta
│ Will be restored                                                   │
│ [archive-restore] …                                                │
│ Will be recalculated                                               │
│ Corruption                                            1 → 0        │  .typography-meta + .typography-badge tabular
│ [▾] Stays as it is · 1                                             │  Disclosure recolhida
│                                                                    │
│                          [ Keep current ancestry ] [ Apply new ancestry ] │  .dialog__actions
└────────────────────────────────────────────────────────────────────┘
```

1. **Título:** `Heading slot="title"` (h2) em `.typography-heading`, com `tabindex="-1"` (destino do foco ao abrir). O React Aria liga o diálogo a ele por `aria-labelledby`: o nome do diálogo é o título (C9). Texto por variante em [Textos](#textos).
2. **Current × New** (FR-CHG-003): grade de duas colunas de largura igual, gap `--space-4`, empilhadas abaixo de `--bp-md` (Current em cima). Cada coluna: `h3` em `eyebrow` `--color-text-secondary` ("Current", "New") e o valor, `--space-1` abaixo. `change.from` vai em Current, `change.to` em New. O valor pelo `kind` da vaga:
   - `choose-entity` (ancestralidade): o nome em `.typography-title-sm` + `source-badge` da opção (`options` da vaga);
   - `table`: faixa em `.typography-badge` e, com entidade, o nome em `.typography-title-sm` ("3–4 Troglodytes"); abaixo, em `.typography-meta` `--color-text-secondary`, o cálculo da FEAT-009 (`resultCalc`: "Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10" ou "Entered for 3d6: …") ou "Chosen"; abaixo, os `effect-chip` da entrada, como no cartão. Na rerrolagem, New é o valor já rolado (o candidato);
   - `roll-effect`: o total em `.typography-title-sm`, o cálculo e o `effect-chip` ("Insanity +4");
   - `attribute-shift` (só no `clear`): "{Atributo} +1, {Atributo} −1" em `.typography-body`;
   - sem resultado (vaga aberta antes, ou limpa depois): "Not decided yet." em `.typography-meta`.
   Sem caixa de valor: ela é `aria-hidden` e repete o total do cálculo.
3. **Listas** (FR-CHG-004), depois de um divisor `--border-width-default` `--color-border-divider`, nesta ordem e cada uma só quando tem itens, `--space-4` entre elas. Cada lista: `h3` visível em `.typography-label` e `ul` com `aria-labelledby` no `h3` (C9). Itens em `.typography-body`, gap `--space-1-5`:
   - **"Will be set aside"** ← `impact.setAside`: ícone `archive` (`--size-icon-sm`) + [linha de decisão](#linha-de-decisão). Texto `--color-text-default`, nunca `danger` (`design.md` §4);
   - **"Will be restored"** ← `impact.restored`: ícone `archive-restore` + linha de decisão, com os valores gravados (UC-010 1b);
   - **"Will be recalculated"** ← `impact.recalculated.attributes` e `.characteristics`, atributos antes: nome em `.typography-meta` à esquerda e "{antigo} → {novo}" em `.typography-badge` tabular à direita, "—" para valor ausente, como a prévia da FEAT-007 (FR-CHG-006). Só valor antigo e novo: os ajustes livres (FR-CHG-014) entram com a FEAT-019;
   - **"Stays as it is"** ← `impact.stays`: Disclosure do React Aria recolhida por padrão (`h3` com o botão gatilho, `aria-expanded`, ícone `chevron-down`/`chevron-up` como na composição da FEAT-007). Gatilho "Stays as it is · {n}"; aberta, as linhas de decisão sem ícone.
4. **Nota da D40** (`design.md` §4), em `.typography-meta` `--color-text-secondary`, logo abaixo de "Will be set aside", só quando ela tem itens: "Set-aside decisions stay with this character, off the sheet, and come back on their own if what they depend on returns."
5. **Nota da rerrolagem** (D40 (4); FR-CHG-010), em `.typography-meta` `--color-text-secondary`, logo abaixo das colunas, só com `pending.kind === 'roll'` e `impact.undone`: "Whichever result you don't use goes to the log as undone. It isn't set aside." O valor que sai nunca entra em "Will be set aside" (o motor já o põe em `undone`).
6. **Ações** em `.dialog__actions`, nesta ordem: `button-secondary` "Keep current …" e `button-primary` "Apply …" (rótulos em [Textos](#textos)). Sem botão de fechar à parte.

**Corpo longo:** a `.dialog` rola por inteiro (`max-height: 100%` do overlay, `overflow: auto`, como hoje); o rodapé de ações rola junto, sem região fixa. Com seis tabelas suspensas e a Disclosure fechada, o diálogo cabe numa tela de 568 px de altura no celular; com a Disclosure aberta, rola.

#### Linha de decisão

Uma linha por `ImpactItem`, com o `slot` dele (a vaga da visão em que a decisão é ativa: a de antes em "set aside" e "stays", a de depois em "restored"):

- **título** em `.typography-body`: o rótulo de pendência da vaga (`decisionTitle`: "Dwarf Age", "Insanity 1d6", "Size", "Score adjustment"), seguido de ": ";
- **valor** em `.typography-badge`: `table`, a faixa e o nome da entidade ("8–12", "3–4 Troglodytes"); `roll-effect`, o total ("4"); `choose-value`, o valor ("1/2"); `attribute-shift`, "{Atributo} +1, {Atributo} −1"; os demais `kind` entram com as features que os decidem;
- **modo**, só em resultado (`table`, `roll-effect`), em `.typography-meta`: " · rolled", " · entered" ou " · chosen". Escolhas (Size, ajuste) não levam modo;
- **"depends on {decisão}"** (FR-CHG-005), em `.typography-caption` `--color-text-secondary`, numa linha abaixo, só quando o `parent` do item não é a vaga da mudança (`change.key`): o dependente transitivo. `{decisão}` é o mesmo rótulo de pendência da vaga mãe (`decisionTitle` da vaga `parent`, na mesma visão do item), o mesmo texto que aparece no item da mãe, logo acima na lista (a ordem das vagas põe a mãe antes). O dependente direto não leva a linha: ele depende da mudança, que está no título e nas colunas.

O leitor de tela lê a linha pelo conteúdo, na ordem visual ("Insanity 1d6: 4 · rolled depends on Dwarf Background"), sem `aria-label`.

### by-decision

`pending.kind` `decide`, `enter` ou `clear`, com `needsDialog`. Entradas (technical-design §3.2, tabela de comandos):

| Variante | Origem na tela | Current (`change.from`) | New (`change.to`) |
| :-- | :-- | :-- | :-- |
| Troca de ancestralidade | "Choose {New}" na SCR-WEB-003 | a ancestralidade atual | a pedida |
| Choose → Choose | uma entrada da grade na SCR-WEB-009 | a entrada atual, com o modo dela | a entrada escolhida, "Chosen" |
| Troca de modo para Choose | uma entrada da grade com a tabela rolada ou informada | o resultado rolado ou informado | a entrada escolhida |
| Troca de modo para Enter result, ou outra soma | "Use this result" numa tabela decidida | o resultado atual | a soma informada, com o cálculo "Entered for …" |
| `clear` | nenhuma no MVP (abaixo) | o valor atual | "Not decided yet." |

- Sem a nota da rerrolagem. Keep não grava nada (FR-CHG-009).
- **`clear` com diálogo:** o único `clear` da interface do MVP é "Undo adjustment" (SCR-WEB-005), e o ajuste de scores não tem dependentes nem candidatos guardados no conteúdo do MVP, então ele aplica direto. Os textos ficam definidos para o caso, que só ocorre com pacote fictício.

### by-reroll

`pending.kind` `roll`, com `impact.undone` (FR-DEC-015, 017):

| Variante | Origem na tela | Current | New |
| :-- | :-- | :-- | :-- |
| Reroll numa tabela rolada ou informada | "Reroll {dado}" | o resultado atual | o valor novo, já rolado |
| Troca de modo para Roll numa escolhida | "Roll {dado}" com a tabela escolhida | a entrada escolhida, "Chosen" | o valor rolado |
| Reroll na `roll-effect` | "Reroll {dado}" na caixa do efeito | o total atual | o total novo |

- Com a nota da rerrolagem.
- **Keep grava** (FR-CHG-010; D5): o valor recusado vai ao log como desfeito, e o contador da tabela sobe. A tela não muda por isso: valor, ficha e cálculo ficam como estavam, e o diálogo fecha quando o snapshot perde `pending`, sem esperar a gravação. Uma falha dessa gravação aparece no alerta `save-failed` da moldura.
- **Esc também é Keep**, então também registra o valor recusado. Fechar o diálogo de uma rerrolagem nunca descarta a rolagem sem registro.
- Na `roll-effect` do MVP não há dependentes, então o Reroll dela aplica direto ([effect-reroll](#effect-reroll)); a linha da tabela fica para pacote fictício.
- O contador de rolagens (FR-DEC-016) não aparece na tela: nem a ux-foundations nem o `design.md` o mostram. Ele fica no documento e no log.

### restore-only

O diálogo só com "Will be restored" (e "Will be recalculated" e "Stays as it is", se houver), sem "Will be set aside" e sem a nota da D40 (FR-CHG-001). Casos:

- Human → Dwarf de volta, sem nada decidido para o Human: as tabelas do Dwarf em "Will be restored", com os valores originais ("Dwarf Age: 8–12 · rolled"), e Corruption 0 → 1 em "Will be recalculated" (AC-6);
- Choose → Choose de volta à entrada cuja `roll-effect` estava decidida (AC-9).

Com o Size do Human decidido, a volta ao Dwarf tem as duas listas: o Size em "Will be set aside" e as tabelas do Dwarf em "Will be restored", com a nota da D40. Título e ações são os da [by-decision](#by-decision).

### dialog-open

Começa quando o snapshot ganha `pending` (C2). A tela por trás mostra o documento e a visão de antes, sem mudança.

- **Foco ao abrir:** no título (`h2`, `tabindex="-1"`), nunca em "Apply …". O leitor de tela lê o papel e o nome do diálogo e começa a leitura pelo título, antes das colunas e das listas. O anel de foco do título segue o dos títulos que já recebem foco (FEAT-001, `:focus-visible`).
- **Foco preso** no diálogo (`Modal`); o resto da página fica inerte. Tab: gatilho de "Stays as it is" (se houver) → "Keep current …" → "Apply …", e volta.
- **Esc** equivale a "Keep current …" (`design.md` §4, `dialog`). Clique no backdrop não fecha (`isDismissable={false}`, como o diálogo de exclusão da Home), para um toque fora não registrar uma rerrolagem recusada.
- Enquanto houver `pending`, nenhum outro comando muda o personagem (`change-pending`); como a página está inerte, a tela não oferece nenhum. Uma troca de rota (voltar do navegador) mantém o diálogo aberto, porque ele é da moldura.
- **Anúncio:** nenhuma região viva própria; o foco no título basta. O resumo vivo não anuncia nada, porque a visão não mudou.

### kept

"Keep current …" ou Esc chama `session.keep()`. O estado começa quando o snapshot perde `pending` com o documento de antes (FR-CHG-009):

- o diálogo fecha;
- o foco volta ao controle que abriu o diálogo (a restauração de foco do `Modal`): "Choose {New}" na Ancestry, a entrada da grade acionada, "Reroll {dado}", "Roll {dado}" ou "Use this result" na Story. Esses controles continuam na tela depois do Keep ([switch-kept](#switch-kept), [replace-kept](#replace-kept)). Se uma troca de rota tirou o controle da tela, o foco vai para o `h1` da etapa;
- nenhum anúncio além do controle focado; nada muda no resumo.

### applied

"Apply …" chama `session.confirm()` e põe a marca do Apply (`{ key, kind }` da pendente). O estado começa quando o snapshot perde `pending` e mostra o candidato aplicado, antes da gravação (FR-CHG-008; D11):

- o diálogo fecha;
- a marca é consumida no efeito sobre o snapshot, e o foco vai para o destino da variante, no quadro seguinte ao fechamento, depois da restauração de foco do `Modal` (que tentaria voltar ao controle que abriu, como o seletor de etapas já faz com o `h1`; `Builder.tsx`):

| Variante | Destino do foco | Coerente com |
| :-- | :-- | :-- |
| Troca de ancestralidade | o `h2` do detalhe da ancestralidade, agora a escolhida | "Ao confirmar" da FEAT-007 |
| Choose → Choose e troca de modo para Choose | a entrada da grade acionada, agora marcada (a própria restauração do `Modal`; sem foco programático) | chosen da FEAT-009 |
| Reroll, Roll numa escolhida, Enter result | a coluna de resultado do cartão (`tabindex="-1"`), lida a partir do cálculo | rolled e entered da FEAT-009 |
| Reroll e Enter result na `roll-effect` | a coluna de resultado da caixa do efeito | effect-decided da FEAT-009 |
| `clear` | o `h2` do card da vaga ("Score adjustment") | undone da FEAT-008 |

- o resumo vivo anuncia os valores novos (`aria-live="polite"`, FEAT-007);
- o fim da gravação não move o foco; uma falha aparece no `save-failed` da moldura, com o estado novo na tela (FR-CHAR-010; AC-17).

- **Notas responsivas:**
  - **desktop e intermediário:** largura até `--size-dialog-max` (760 px), colunas lado a lado, padding `--space-5`;
  - **celular (< `--bp-md`, SCR-WEB-016):** overlay com padding `--space-4`, padding do conteúdo `--space-4`; colunas empilhadas; as ações quebram em linhas pelo `flex-wrap` do `.dialog__actions`, "Keep current …" antes; alvos de `--size-touch-target` em ponteiro grosso. O overlay cobre a região fixa do celular;
  - reflow a 320 CSS px sem rolagem horizontal; os rótulos dos botões quebram em duas linhas se precisarem.
- **Anel de foco** (C18): os controles novos do diálogo são botões, que desenham o anel no próprio elemento; nenhum contêiner novo leva `data-focus-ring`, e o `e2e/builder-dock.spec.ts` não ganha caso (o overlay fica acima da região fixa).
- **Decisões:**
  - **Foco ao abrir no título, não em "Keep current …".** Motivo: o diálogo é para ler antes de decidir (FR-CHG-003, 004); com o foco no botão, o leitor de tela pularia colunas e listas. Alternativa rejeitada: a ação segura com `autoFocus`, como a exclusão da Home, cujo conteúdo é uma frase.
  - **"depends on" só no dependente transitivo.** Motivo: na troca de ancestralidade, seis "depends on Ancestry" repetiriam o título; o transitivo é o que a pessoa não deduz (FR-CHG-005). Alternativa rejeitada: a linha em todo item.
  - **O diálogo é da moldura, não da etapa.** Motivo: a pendente é do snapshot, não do cartão (D3 do technical-design); uma troca de rota não pode deixá-la sem diálogo.

## SCR-WEB-003 — Ancestry step

- **Estratégia e fonte:** code-native. A tela é a da FEAT-007 ([SCR-WEB-003](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#scr-web-003--ancestry-step)), com o Decide now da FEAT-009; esta seção troca o [dependents-blocked](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#dependents-blocked) da FEAT-007 e o [dependents-blocked-tables](../FEAT-009-decide-a-table/ui-design.md#dependents-blocked-tables) da FEAT-009 pelos estados abaixo.
- **Dados:** `session.decide('ancestry', id)`; o diálogo pelo `snapshot.pending` ([SCR-WEB-007](#scr-web-007--impact-dialog)).
- **Conformidade:** sem componente nem token novo. Saem o aviso `has-dependents` (`inline-alert` warning) e os textos `hasDependentsMessage`, com o "Changing a choice that others depend on isn't available yet." (`copy.ts`).

### switch-with-dependents

Ancestralidade escolhida, outra em prévia ([selected](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#selected)), "Choose {New}". Com decisões dependentes decididas (Size do Human, tabelas do Dwarf), o snapshot ganha `pending` e o diálogo abre ([by-decision](#by-decision)): título "Switch from {Current} to {New}?", as decisões da atual em "Will be set aside" (as tabelas e, com a neta, a `roll-effect` com "depends on {Tabela}"), Corruption e o que mais mudar em "Will be recalculated", o resto em "Stays as it is".

- A prévia "If you choose {New}" e o botão continuam na tela por trás.
- **Sem nada suspenso nem restaurado** (FR-CHG-002): troca de ancestralidade sem filhas decididas, mesmo que recalcule tudo. Aplica direto, como a FEAT-007 [chosen](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#chosen) ("Ao confirmar": snapshot antes da gravação, foco no `h2` do detalhe, anúncio do resumo). Nada muda nesse caminho.

### switch-kept

[kept](#kept) na Ancestry: o personagem fica como estava, e **a prévia continua aberta**: o cartão pedido continua marcado em prévia (borda de seleção), o atual continua com "Your choice", e o detalhe mostra a prévia e "Choose {New}", que recebe o foco de volta. A continuação depois do `await` não limpa a prévia numa `needs-confirmation` (é a pessoa quem desiste da comparação, selecionando o cartão atual).

- **Decisão:** manter a prévia no Keep. Motivo: o foco volta a um controle que existe, e "Keep current ancestry" mantém a ancestralidade, não desfaz a comparação. Alternativa rejeitada: a seleção voltar para a escolha atual, como no `has-dependents` de hoje; o "Choose {New}" sumiria, e o foco não teria para onde voltar. Muda a expectativa do §7, itens 11 e 14 do technical-design ([Escalações](#escalações-e-pendências), emenda M1).

### switch-applied

[applied](#applied) na Ancestry: o cartão novo passa a "Your choice" (sem a borda de prévia: ele é também o marcado, e vale só o `current`), o detalhe passa ao Decide now dele, os contadores, o mapa e o resumo seguem a visão nova, e o foco vai para o `h2` do detalhe. As tabelas suspensas saem da Story e de Open decisions; o "Decide now" da ancestralidade nova mostra as concessões dela.

### switch-back-restores

Voltar à ancestralidade anterior (Human → Dwarf): o diálogo mostra as decisões dela em "Will be restored", com os valores gravados ([restore-only](#restore-only)); o que a outra tinha decidido (o Size do Human) entra em "Will be set aside" no mesmo diálogo, com a nota da D40. Apply não rola de novo: a Story volta com as mesmas faces na Age e o resumo com Corruption 1 (AC-6).

## SCR-WEB-009 — Story step

- **Estratégia e fonte:** code-native. A tela é a da FEAT-009 ([SCR-WEB-009](../FEAT-009-decide-a-table/ui-design.md#scr-web-009--story-step)); esta seção troca o [decided-locked](../FEAT-009-decide-a-table/ui-design.md#decided-locked) e o [dependents-blocked](../FEAT-009-decide-a-table/ui-design.md#dependents-blocked) dela pelos estados abaixo. To-decide, entering, rolled, entered, chosen, no-text, effect-open e effect-decided continuam, com os acréscimos daqui.
- **Dados:** `table.modes` vale também na tabela decidida (technical-design §3.3): Reroll e Roll (`session.roll`), Choose (`session.decide`), Enter result (`session.enter`); na `roll-effect`, Reroll e Enter result. Write é da FEAT-010.
- **Conformidade:** "Reroll" é `button-secondary` (`design.md` §4, `button-secondary` e `roll-card` rolado). Saem `LOCKED_ROLLED`, `LOCKED_CHOSEN`, o `aria-describedby` do `segmented-control` para o motivo e o aviso `tableDependentsMessage`. Sem componente nem token novo.

### decided-roll

Tabela decidida com o segmento Roll (rolada ou informada; o segmento inicial é o da decisão, como na FEAT-009):

```
┌──────┐  Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10
│  10  │  8–12
│rolled│  No text added for this entry · CORE p.18
└──────┘  [Corruption +1]
          [ Reroll 3d6 ]  [ Enter result ]
```

- o `segmented-control` deixa de ser só leitura: os segmentos ficam livres, com hover, e trocar de segmento só troca o corpo, sem gravar (como no to-decide);
- no fim da coluna de resultado, `--space-3` abaixo do que vier antes (efeitos ou caixa da `roll-effect`), a linha de ações no lugar do motivo de hoje: `button-secondary` "Reroll {dado}" e, só com `enter` em `table.modes`, `button-secondary` "Enter result". "Enter result" troca a linha pelo formulário do [entering](../FEAT-009-decide-a-table/ui-design.md#entering), com o mesmo comportamento, e "Use this result" chama `session.enter` sobre a decidida;
- "Reroll {dado}" é secundário porque a decisão já existe: nenhuma ação desta área é a principal (`design.md` §4, `button-primary`: "uma por área de decisão").

### decided-choose

Tabela decidida, segmento Choose (escolhida, ou rolada e informada com o segmento trocado pela pessoa):

- a grade com a entrada da decisão marcada (valor do `RadioGroup` = `result.entry`, qualquer que seja o modo), e abaixo a coluna de resultado: entrada, sem texto, efeitos, `roll-effect` e, com a decisão rolada ou informada, o cálculo dela; sem caixa de valor;
- sem a linha "You can choose another result. Rolling instead isn't available yet.";
- escolher outra entrada chama `session.decide(key, entry)` (Choose → Choose ou troca de modo para Choose); a entrada marcada não chama comando (D13 da FEAT-009).

**Segmento Roll com a decisão escolhida:** a coluna de resultado sem caixa nem cálculo e, no fim, a linha de ações com `button-secondary` "Roll {dado}" (não "Reroll": o resultado na tela não foi rolado) e, com `enter`, "Enter result". "Roll {dado}" chama `session.roll`, que substitui pela rolagem ([by-reroll](#by-reroll)).

**Segmento mostrado:** o da decisão, até a pessoa trocá-lo; volta ao da decisão quando o snapshot muda o modo da decisão (uma escolha vira Choose; uma rolagem ou um Enter result vira Roll). O Keep não muda o modo, então o segmento escolhido pela pessoa fica.

### mode-switch

Resumo dos caminhos de substituição (FR-DEC-018), todos pelo mesmo pipeline:

| Decisão atual | Ação | Comando | Diálogo com dependentes |
| :-- | :-- | :-- | :-- |
| rolada ou informada | "Reroll {dado}" | `roll` | [by-reroll](#by-reroll) |
| rolada ou informada | segmento Choose e uma entrada | `decide` | [by-decision](#by-decision) |
| rolada, informada ou escolhida | "Enter result" e "Use this result" (só regime `roll`) | `enter` | by-decision |
| escolhida | segmento Roll e "Roll {dado}" | `roll` | by-reroll |
| escolhida | outra entrada | `decide` | by-decision |

Sem suspensa nem restaurada, aplica direto (FR-CHG-002; AC-7): a tela entra no estado da decisão nova (rolled, entered ou chosen da FEAT-009) pelo snapshot, com o foco da FEAT-009 (coluna de resultado depois de Roll, Reroll e "Use this result", com a marca do clique; nenhum foco no Choose). Com a decisão já existente, a marca do Roll é consumida quando o snapshot mostra uma decisão nova na vaga (outro `logged` em `decisions[key]`), não quando a vaga passa a decidida: um Reroll pode repetir as faces, e o Keep só muda o contador.

### replace-with-dependents

A substituição tem `needsDialog` (a entrada atual tem uma `roll-effect` decidida, e a nova é outra entrada; no MVP, só com pacote fictício): o diálogo abre pelo snapshot, com a `roll-effect` em "Will be set aside" e o valor anterior da tabela fora das listas (em Current, e em `undone`). O cartão por trás fica como estava.

- **No lugar do "o aviso sai na próxima ação" (§7, item 13 do technical-design):** não há mais aviso no cartão. O diálogo fica aberto enquanto o snapshot tiver `pending` e só fecha por "Keep current result", Esc ou "Apply new result". Com a página inerte por trás, não existe "próxima ação" no cartão até ele fechar; depois, o cartão está em [replace-kept](#replace-kept) ou [replace-applied](#replace-applied), sem nada a limpar. A continuação do `decide` não põe nem tira texto no cartão.

### replace-kept

[kept](#kept) no cartão: a grade continua na entrada atual (controlada pelo snapshot), a entrada acionada fica sem marca e recebe o foco de volta; na rerrolagem, "Reroll {dado}" ou "Roll {dado}" recebe o foco, com o resultado de antes; no Enter result, o formulário continua aberto, com a soma digitada, e "Use this result" recebe o foco. Nada é gravado, salvo na rerrolagem ([by-reroll](#by-reroll)).

### replace-applied

[applied](#applied) no cartão: o estado da decisão nova (rolled, entered ou chosen da FEAT-009); a `roll-effect` da entrada anterior some do cartão (suspensa), e a da entrada nova, se houver, aparece aberta ou restaurada. O formulário do Enter result fecha quando o snapshot mostra a decisão nova. Foco pela tabela do [applied](#applied).

### effect-reroll

`roll-effect` decidida ([effect-decided](../FEAT-009-decide-a-table/ui-design.md#effect-decided)): no lugar do motivo `LOCKED_ROLLED`, a linha de ações com `button-secondary` "Reroll {dado do efeito}" ("Reroll 1d6") e "Enter result" (FR-STEP-014). Sem dependentes no MVP, aplica direto: o snapshot mostra o valor novo, e o foco vai para a coluna de resultado da caixa (marca do clique, consumida com outro `logged`). O "Enter result" abre o formulário dentro da caixa, como na effect-open.

- **Teclado:** a ordem da FEAT-009, com a linha de ações depois dos efeitos e da caixa da `roll-effect`: cabeçalho → por cartão: `segmented-control` → grade ou linha de ações → caixa da `roll-effect` (e a linha de ações dela) → Back → Next.
- **Notas responsivas:** as da FEAT-009. No celular, a linha de ações quebra com `flex-wrap`, gap `--space-2`, botões com o rótulo inteiro.
- **Anel de foco** (C18): "Reroll" e "Roll" são botões (anel no próprio elemento); os segmentos e a grade já têm `data-focus-ring` (FEAT-009), e o caso da Story no `builder-dock.spec.ts` (FEAT-009 T9) continua cobrindo.

## SCR-WEB-005 — Attributes step

Conferida, sem estado novo. "Undo adjustment" chama `session.clear(key)`, que agora grava uma entrada `undone` (`cleared`) no log (FR-LOG-007); a tela não muda: o [undone](../FEAT-008-attributes-step/ui-design.md#undone) da FEAT-008 continua entrando pelo snapshot, com o foco no `h2` e "Adjustment undone." ("undone" é o termo da D40 para o valor tirado da própria vaga, `design.md` §6). O ajuste não tem dependentes no MVP, então o `clear` nunca abre o diálogo; se abrisse (pacote fictício), seria a variante `clear` da [by-decision](#by-decision), com o destino de foco do [applied](#applied). O "From {origem}. Choosing it here isn't available yet. …" do `AttributesStep` é da FEAT-016 e fica. O `already-decided` do ajuste continua (FEAT-008 D3).

## Moldura do construtor

Acréscimos à [Builder frame](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#builder-frame), com dois pontos que dependem de decisão: o aviso ao abrir (escalação E12) e a linha do resumo vivo (pergunta P1).

### open-notice

**Proposta, pendente da escalação E12** (a ux-foundations só define o aviso na importação, F4 e SCR-WEB-001, da FEAT-002; para abrir um personagem salvo no construtor não há lugar definido). Não entra como estado desenhado antes da emenda.

`snapshot.notice` presente (FR-CONT-016; abertura com diferença, technical-design §3.2 "Abrir"):

- `inline-alert` warning, estático (`live={false}`: ele já está na tela quando a página carrega, e a leitura do `main` começa por ele), no topo do `main`, depois do alerta `save-failed` (se houver) e antes do `step-header`, em qualquer etapa;
- primeira linha em `.typography-label`: "The rules changed since this character was last saved.";
- com `notice.setAside`: "Set aside, because the current rules no longer have them:" em `.typography-body` e a lista com as [linhas de decisão](#linha-de-decisão); se alguma reabre uma vaga que a regra ainda exige (item com `slot` gerado e sem decisão ativa): "Where the rules still ask for a decision, it's open again in Open decisions."; e a nota da D40 em `.typography-meta`;
- com `notice.restored`: "Restored, because the current rules have them again:" e a lista;
- `button-secondary` "Dismiss" → `session.dismissNotice()`. Ao sair, o foco vai para o `h1` da etapa, se estava em "Dismiss" (regra do `save-failed` da FEAT-007).
- **Nomes de uma suspensa sem vaga** (vaga não gerada, sem `slot`): da entrada `decision` original, `snapshot.document.log` pelo `decision.logged`, só para exibir (technical-design §3.3): título = `subject.name` (ou o nome da etapa, na vaga raiz); valor = a faixa e a entidade, o valor, o par do ajuste ou a entidade de `result`; modo = o `mode` da entrada, em resultado. Decisão sem `logged` (gravada antes desta feature): uma linha só, "{n} earlier {decision|decisions}".
- Na abertura sem diferença, nada aparece, e nenhum foco se move (FEAT-001, carregamento completo).

### set-aside-line

**Pendente da pergunta P1.** O `live-summary` do `design.md` §4 tem a linha "N set aside · " + `link` "See Review", e o link leva à seção "Set aside" da Review (SCR-WEB-018), que é da FEAT-015, construída depois. Nenhum link vai para uma tela que não existe. Proposta (alternativa A da P1): a linha sem o link até a FEAT-015, "{n} set aside" em `.typography-meta` `--color-text-secondary`, separada por divisor `--color-border-divider`, como última linha do card, só com `view.setAside.length` > 0; fora da contagem de Open decisions, sem caixa tracejada nem `pill-counter`; no celular, dentro do resumo aberto. A FEAT-015 acrescenta " · See Review".

## Decisões entre telas

- **A mudança pendente é um estado do snapshot, com um diálogo só.** Um comando nunca guarda impacto em estado local; a tela que pediu só guarda a marca do clique, e o Apply põe a sua (D3 do technical-design; C2).
- **Rótulos de ação pelo objeto da vaga**, no padrão "Keep current …" / "Apply …" do `design.md` §4: "ancestry" na ancestralidade, "result" na tabela e na `roll-effect`. O valor novo aparece no título e em New, não no botão.
- **"Reroll" só sobre resultado rolado ou informado**; sobre resultado escolhido, "Roll". O "Re-" diz que o que está na tela foi rolado.
- **Nenhum texto "isn't available yet" desta feature fica:** os três (`LOCKED_ROLLED`, `LOCKED_CHOSEN` e o `CHANGING_LATER` das mensagens de `has-dependents`) saem do `copy.ts`.

## Textos

Fechados para a FEAT-011, revisados contra a NFR-USE-001 e o `design.md` §6 (só "set aside", "restored" e "undone"; nada de "removed", "deleted", "suspended" ou "invalidated"). `{Tabela}` é o nome da tabela ("Dwarf Background"); `{faixa}` com travessão (FEAT-009).

**Diálogo de impacto (SCR-WEB-007)**

| Variante | Título | Keep | Apply |
| :-- | :-- | :-- | :-- |
| Troca de ancestralidade (e a volta) | "Switch from {Current} to {New}?" | "Keep current ancestry" | "Apply new ancestry" |
| Choose → Choose, troca de modo para Choose ou Enter result, outra soma | "Change {Tabela} from {faixa atual} to {faixa nova}?" | "Keep current result" | "Apply new result" |
| Reroll, Roll numa escolhida | "Use the new roll for {Tabela}?" | "Keep current result" | "Apply new result" |
| `roll-effect`: Reroll · Enter result | "Use the new roll for {Alvo} {dado}?" · "Change {Alvo} {dado} from {total} to {total novo}?" | "Keep current result" | "Apply new result" |
| `clear` | "Undo your {título} {choice\|result}?" | "Keep current {choice\|result}" | "Apply undo" |

Vaga sem resultado antes (só a vaga reaberta, pacote fictício): título "Change {Tabela} to {faixa nova}?" ou "Use this roll for {Tabela}?", e "Not decided yet." em Current.

| Onde | Texto |
| :-- | :-- |
| Colunas | "Current" · "New" |
| Listas | "Will be set aside" · "Will be restored" · "Will be recalculated" · "Stays as it is · {n}" |
| Linha de decisão | "{título}: {valor}" · " · rolled" / " · entered" / " · chosen" · "depends on {decisão}" |
| Recalculado | "{nome}" · "{antigo} → {novo}" |
| Coluna sem resultado | "Not decided yet." · escolhida: "Chosen" |
| Nota da D40 | "Set-aside decisions stay with this character, off the sheet, and come back on their own if what they depend on returns." |
| Nota da rerrolagem | "Whichever result you don't use goes to the log as undone. It isn't set aside." |

Exemplos: "Switch from Dwarf to Human?" · "Change Dwarf Background from 1 to 2?" · "Use the new roll for Dwarf Age?" · "Insanity 1d6: 4 · rolled" + "depends on Dwarf Background" · "Corruption 1 → 0".

**Roll-card (SCR-WEB-009)**: "Reroll {dado}" ("Reroll 3d6", "Reroll d20"; na `roll-effect`, "Reroll 1d6") · "Roll {dado}" com a decisão escolhida · "Enter result". Saem "Rerolling or changing this result isn't available yet." e "You can choose another result. Rolling instead isn't available yet."

**Ancestry (SCR-WEB-003)**: sai "You can't switch to {New} yet: … Changing a choice that others depend on isn't available yet." e a variante da tabela ("You can't change {Tabela} to …"). Nada entra na tela: o diálogo traz os textos.

**Moldura (propostas, pendentes de E12 e P1)**: "The rules changed since this character was last saved." · "Set aside, because the current rules no longer have them:" · "Where the rules still ask for a decision, it's open again in Open decisions." · "Restored, because the current rules have them again:" · "{n} earlier {decision|decisions}" · "Dismiss" · "{n} set aside".

### Nomes novos contra os localizadores do e2e/ (C1)

Conferidos todos os `getByRole`, `getByText`, `getByLabel`, `getByTitle` e `getByPlaceholder` de `e2e/` contra os nomes e textos acima, em todas as telas onde aparecem. Lembrete: sem `exact`, o Playwright casa por substring e sem caixa. Com o diálogo aberto, o `Modal` deixa o resto da página com `aria-hidden`, e o `getByRole` não acha o que está fora dele.

| Localizador existente | Nome novo | Situação e seletor |
| :-- | :-- | :-- |
| `card(page, name).getByRole('button', { name: 'Roll 3d6' })` (`story.spec.ts:42`, no `roll3d6`; `:122`) | "Reroll 3d6" contém "Roll 3d6" | Sem colisão hoje: o `roll3d6` só roda em cartão a decidir (Age, Build, Appearance, Personality, uma vez cada), e o `:122` confere a Age antes de decidir. Num cartão decidido, o seletor casaria com "Reroll 3d6". Seletor proposto, para os testes novos e para o `roll3d6` se um dia rodar num cartão decidido: `{ name: 'Roll 3d6', exact: true }` e `{ name: 'Reroll 3d6', exact: true }`. |
| `card(page, 'Dwarf Age').getByRole('button', { name: 'Enter result' })` com `toHaveCount(0)` (`story.spec.ts:123`) | "Enter result" no cartão decidido | Sem colisão: as tabelas do Dwarf não têm `enter` em `table.modes`, decididas ou não. |
| `getByRole('heading', { level: 2, name: 'Human' })` (`builder-dock.spec.ts:229`, sem escopo) | título "Switch from Dwarf to Human?" (h2) | Sem colisão: o teste cria o personagem e escolhe Human sem ancestralidade anterior, então o diálogo não abre. Com o diálogo aberto, o título seria o único `h2` acessível com "Human" (o resto fica `aria-hidden`). Seletor proposto nos testes novos: `page.locator('section.ancestry-detail').getByRole('heading', { level: 2, name: 'Human', exact: true })` para o foco depois do Apply, e o título pelo diálogo (`page.getByRole('dialog').getByRole('heading', { level: 2 })`). |
| `detail.getByRole('heading', { level: 2, name: 'Dwarf' })` (`ancestry.spec.ts:162`) | título do diálogo com "Dwarf" | Sem colisão: escopado em `section.ancestry-detail`, e o diálogo fica fora dele (portal). |
| `page.getByRole('status').filter({ hasText: "You can't switch" })` (`ancestry.spec.ts:197`) | o aviso sai | Muda pelo §7, item 14 (o diálogo no lugar), e pela emenda M1. |
| `getByRole('radio', { name: 'Human, your choice' })` com `toBeChecked()` (`ancestry.spec.ts:203`, no `unchanged()` antes do reload) | — | Muda pela [switch-kept](#switch-kept): depois do Keep, o Dwarf continua em prévia, e o cartão do Human tem "Your choice" sem estar marcado. Emenda M1. |
| `getByRole('dialog', { name: 'Creation steps' })` (`ancestry.spec.ts:15`) | os títulos do diálogo de impacto | Sem colisão: nenhum título contém "creation steps". |
| `getByRole('button', { name: 'Choose Human' })`, `` `Choose ${name}` `` (`builder-dock.spec.ts:58`, `ancestry.spec.ts:38`, `attributes.spec.ts:15`) | "Apply new ancestry", "Keep current ancestry" | Sem colisão: nenhum contém "choose". |
| `getByRole('button', { name: 'Back' })`, `'Summary'`, `'Cancel'`, `'More'`, `'Apply adjustment'`, `'Undo adjustment'`, `'Next: …'` | "Keep current …", "Apply new …", "Apply undo", "Dismiss", "Stays as it is · {n}", "Reroll …" | Sem colisão: nenhum nome novo contém esses textos ("Apply undo" não contém "Undo adjustment"; "Apply new result" não contém "Apply adjustment"). |
| `getByRole('button', { name: /Health\s*10/ })` e as demais regex do resumo (`ancestry.spec.ts`, `attributes.spec.ts`, `story.spec.ts`) | "Corruption 1 → 0" no diálogo | Sem colisão: o recalculado é item de lista, não botão; e o resumo só é lido com o diálogo fechado. |
| `getByText('If you choose Dwarf')`, `'Decided.'`, `'Opens the other 7 steps'` e os demais `getByText` sem `exact` | listas, notas e títulos do diálogo; textos do aviso | Sem colisão: nenhum texto novo contém esses. |
| `getByText(/^\d+ open$/)` (`story.spec.ts:179`, no `main`) | "{n} set aside" | Sem colisão: a linha fica no `aside`, e não termina em "open". |
| `getByRole('radio', { name: 'Roll' \| 'Choose', exact: true })` e `getByRole('radiogroup', { name: 'Dwarf Age', exact: true })` (`story.spec.ts`, `builder-dock.spec.ts`) | — | Sem colisão: os segmentos não mudam de nome; só deixam de ser só leitura. |

**Como escrever os localizadores novos** (`impact.spec.ts`, `ancestry.spec.ts`, `perf.spec.ts`; T do technical-design §6):
- o diálogo por `page.getByRole('dialog')`, sem nome, e dentro dele as ações com `exact: true` ("Keep current ancestry", "Apply new ancestry", "Keep current result", "Apply new result");
- as listas pelo `h3` dentro do diálogo e pelo texto dos itens; "Will be set aside" e "Will be restored" com `exact: true`;
- Reroll e Roll com `exact: true` dentro do cartão (`card(page, name)`).
- **Firefox 1572 e o axe (AC-15):** o nome do diálogo vem do título por `aria-labelledby`, e as listas também se nomeiam por `aria-labelledby`; o nome não muda por causa do navegador. O caso do axe com o diálogo aberto segue o contorno do `docs/scaffold-notes.md` (regra da FEAT-009 T9), só no projeto `firefox`: página nova no mesmo contexto (`context.newPage()`), o mesmo personagem (Dwarf com as tabelas gravadas), a prévia do Human por `page.locator('label.option-card').filter({ hasText: 'Human' })`, "Choose Human" por `getByRole('button', { name: 'Choose Human' })` (o botão não tem `aria-labelledby`), a espera do diálogo por `page.getByRole('dialog')` sem `name`, e o axe nessa página. A pendente não é gravada, então a página nova abre o diálogo de novo.

## Escalações e pendências

- **E12. Aviso ao abrir com diferença no construtor** (para a ux-foundations; FR-CONT-016):
  - **O que falta:** a ux-foundations só define o aviso na importação (F4; SCR-WEB-001, "importação com decisões deixadas de lado", FEAT-002). Abrir no construtor um personagem salvo cujo pacote mudou (a abertura com diferença do technical-design §3.2) não tem tela nem estado.
  - **Proposta:** na ux-foundations, um estado global do construtor ao lado dos "Estados globais (sem tela própria)": "abertura com decisões deixadas de lado ou restauradas pela versão nova do pacote (FR-CONT-016, FR-CHG-018): `inline-alert` warning no topo da etapa aberta, com as suspensas, as restauradas e 'Dismiss'"; e no F4, o mesmo aviso ao abrir o personagem importado. O `design.md` não muda: o `inline-alert` já existe, e o conteúdo é o de [open-notice](#open-notice). Sem token novo.
  - **Telas:** SCR-WEB-003, 005 e 009 (a moldura), e SCR-WEB-001 na FEAT-002.
  - **Situação:** pendente. A SCR-WEB-003, dona da moldura no manifesto, fica `escalation-pending` até a emenda.
- **P1. Linha "N set aside" do `live-summary`** (pergunta ao usuário): o link "See Review" do `design.md` §4 vai para a SCR-WEB-018, da FEAT-015.
  - **A. A linha sem o link até a FEAT-015** ([set-aside-line](#set-aside-line)): "{n} set aside" agora, " · See Review" na FEAT-015. Prós: a D40 fica visível desde já (FR-CHG-019: o personagem tem decisões guardadas, e o resumo diz quantas), e a §3.3 do technical-design já prevê a linha nesta feature. Contras: um número sem caminho para ver quais são; a pessoa só os viu no diálogo. Pede uma nota provisória no `design.md` §4 (como o "Roll or choose" da FEAT-009 até a FEAT-010), ou a aceitação do texto parcial aqui.
  - **B. A linha inteira com a FEAT-015.** Prós: a linha nasce como o `design.md` a define, sem estado provisório. Contras: até lá, nada na tela diz que há decisões guardadas depois de fechar o diálogo; a linha da §3.3 sai desta feature por emenda do technical-design e do tasks.md.
  - **Recomendação:** A.
- **M1. Emenda do §7 do technical-design** (detailed-design; não editado aqui): pela [switch-kept](#switch-kept), depois de "Keep current ancestry" a prévia continua aberta.
  - item 11 (`Builder.test.tsx`, `FR-FLOW-003: has-dependents shows a warning…`, l.322): no lugar de "a seleção volta para a escolha atual" (Troll desmarcado, Gnome marcado), o Troll continua marcado em prévia, o Gnome continua "Gnome, your choice", e "Choose Troll" está na tela; a Stature decidida e nenhuma gravação, como hoje;
  - item 14 (`e2e/ancestry.spec.ts`, l.189): o `unchanged()` antes do reload confere "Human, your choice" presente sem `toBeChecked`, o Dwarf em prévia e o foco em "Choose Dwarf"; depois do reload, como hoje (a prévia não é gravada).
  - itens 12 e 13: os estados que substituem `LOCKED_ROLLED`, `LOCKED_CHOSEN` e `dependents-blocked` são os desta seção ([decided-roll](#decided-roll), [decided-choose](#decided-choose), [replace-with-dependents](#replace-with-dependents), [replace-kept](#replace-kept)); no item 13, o "aviso sai na próxima ação" (l.985–988) sai, sem substituto: o diálogo fecha por Keep, Esc ou Apply.
  - nas recomendações de localizador do §7 (C1): as da tabela acima, inclusive o contorno do Firefox no AC-15.
- **Notas, sem emenda:**
  - O exemplo de linha do `impact-dialog` no `design.md` §4 ("Age 42 · rolled") vira "Dwarf Age: 8–12 · rolled": o rótulo da vaga é o de pendência (FEAT-009), e o valor de uma tabela de história é a faixa, sem texto (P22). Os dois-pontos separam título e valor, que de outro modo se juntariam ("Insanity 1d6 4").
  - O contador de rolagens (FR-DEC-016) não tem lugar na tela; não se cria um.
  - O `roll-card` "rolado" do `design.md` §4 já lista "Reroll"; esta feature só o põe em uso.
- **RTM:** recebe este `ui-design.md` na Design ref das FRs que as telas daqui realizam: FR-CHG-001 a 006, 008, 009, 010, 018; FR-DEC-015, 017, 018; FR-STEP-005. A FR-CONT-016 e a FR-CHG-019 esperam a E12 e a P1.
