# UI Design: FEAT-009 — Decidir uma tabela: Roll, Choose, Enter result

> Feature de: `docs/implementation-plan.md` · Par com: `technical-design.md`
> Telas: SCR-WEB-009, SCR-WEB-003 ("Decide now" do Dwarf) · Modo: por feature, re-verificado depois da emenda E10, E11 e caixa de valor (`9c5db16`, `095362b`) · Status: Verified · Data: 2026-11-16

Autoridade: `docs/design.md` (com E8 a E10 e a caixa de valor) e `docs/tokens.json`. Todo valor visual abaixo é token (`--…`) ou classe `.typography-*`; breakpoints pelos `@custom-media` da FEAT-007. Ícones Lucide, decorativos com `aria-hidden`. A moldura (mapa, resumo vivo, Open decisions, Back e Next, celular, `save-failed`, carga e erro) é a da FEAT-007 ([Builder frame](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#builder-frame) e SCR-WEB-016), sem mudança, salvo os textos de [Textos](#textos). Texto da interface em inglês. Nenhum texto dos livros (P22). Fora desta tela: Write, aguardando, subdecisões e "Roll all undecided" (FEAT-010); Reroll, troca de modo e troca de resultado com impacto (FEAT-011).

## SCR-WEB-009 — Story step

- **Estratégia e fonte:** code-native; esta seção é o design.
- **Composição:** a moldura do construtor com o corpo `TablesStep` (technical-design D11), nesta ordem:
  1. `step-header`;
  2. alertas da etapa (`inline-alert`, os da moldura);
  3. um `roll-card` por vaga `table` da etapa, na ordem de `view.slots`, empilhados com `--space-3` entre eles;
  4. as pendências não-tabela da etapa, se houver, como no `FallbackStep` (technical-design §3.4);
  5. Back e Next.
- **Dados:** a tabela do technical-design §3.4, sem acréscimo. Os modos vêm de `table.modes` (D6): a tela nunca decide quais modos existem.
- **Conformidade:** usa `step-header`, `pill-counter`, `card`, `segmented-control`, `button-primary`, `button-secondary`, `text-input`, `range-grid`, `effect-chip`, `source-badge`, `subdecision` e `inline-alert` como o `design.md` §4 os define, e a caixa de valor com `--size-roll-value` (E8) e altura de linha `--font-size-4xl` no valor ([Caixa de valor](#caixa-de-valor)). A grade das tabelas de história segue o `range-grid` com a E10: só faixa e página, sem campo "Name". Sem escalação.

### Cabeçalho da etapa

`step-header` da moldura, com os textos próprios da Story **só quando a etapa tem vagas `table`** (`TablesStep`). Sem tabela (Story do Human), continuam a pergunta e a linha de regra de fallback da FEAT-007, e o `FallbackStep`.

- eyebrow `STEP 3 OF 8 · ROLL OR CHOOSE` (rótulo do regime de `step:story`, ver [Textos](#textos));
- `h1`: "What is your character's story?";
- linha de regra: "Roll on each of your ancestry's tables, or choose the result you want. Some results change your scores: you'll see them under the result." + `source-badge` `CORE p.11`;
- contadores (`pill-counter`): "{d} of {t} decided", pendente enquanto `open` > 0 e preenchida com tudo decidido, e "{n} open", pendente, só com `open` > 0. O "Chosen {d} of {t}" das outras etapas não serve aqui: rolar não é escolher.

### Roll-card: estrutura

`section` com `aria-labelledby` no título (papel `region`, nome = nome da tabela), `card` padrão, `id` = `slotElementId(key)` e `tabindex="-1"` (alvo do atalho `?slot=`, FR-FLOW-011).

```
┌ card ─────────────────────────────────────────────────────────────┐
│ Dwarf Age  3d6                                   [ Roll | Choose ] │  ← h2 .typography-title + .typography-badge · segmented-control
│ The book says to roll or choose.  CORE p.18                        │  ← .typography-meta secondary + source-badge
│                                                                    │
│ (corpo pelo estado)                                                │
└────────────────────────────────────────────────────────────────────┘
```

1. **Linha do título:** `h2` com o nome da tabela em `.typography-title` e, na mesma linha, o dado em `.typography-badge` `--color-text-secondary` ("3d6", "d20"). À direita, o `segmented-control` dos modos de `table.modes` que têm segmento: Roll e Choose (`enter` não é segmento: é botão dentro do Roll, `design.md` §4). Semântica de radiogroup, nome por `aria-labelledby` no `h2` ("Dwarf Age"), `data-focus-ring` no segmento (convenção do DEF-002).
2. **Linha do regime** (FR-DEC-002): frase do regime em `.typography-meta` `--color-text-secondary` + `source-badge` da tabela (`table.provenance`), `--space-1` abaixo do título.
3. **Corpo**, `--space-4` abaixo, pelo estado (abaixo).

Modo inicial, estado local (technical-design §3.4): Choose quando o regime é `choice` (Dwarf Hatred), Roll nos demais. Decidida a tabela, o modo mostrado é o da decisão: Roll para `rolled` e `entered`, Choose para `chosen`.

### to-decide

Vaga sem decisão. O corpo depende do modo aberto:

- **Roll:** linha com `button-primary` "Roll {dado}" ("Roll 3d6", "Roll d20") e, só com `enter` em `table.modes`, `button-secondary` "Enter result"; ao lado, em `.typography-meta`, "Not decided yet. Nothing else waits for it." (`design.md` §4).
- **Choose:** "Choose a result." em `.typography-meta` (rótulo visível do `range-grid`, parte do nome do grupo; [Grade](#grade)), a grade ([Grade](#grade)) e, abaixo, "Not decided yet. Nothing else waits for it."
- Trocar de segmento só troca o corpo; nada é gravado.

### entering

"Enter result" (só em tabela de regime `roll`; no MVP, só com pacote fictício e na vaga `roll-effect`) troca a linha de botões por um formulário no lugar (D34), estado local:

- um `text-input` por expressão de dado (E9; no MVP, uma), `inputmode="numeric"`, largura de `--size-roll-value` + padding, rótulo em `.typography-label` "Your {dado} roll" ("Your 3d6 roll") e ajuda em `.typography-meta`: "Add up what the dice show, without any modifier. From {min} to {max}." (`enterRange`);
- ações à direita do campo (abaixo dele no celular): `button-primary` "Use this result" e `button-secondary` "Cancel"; "Cancel" volta ao [to-decide](#to-decide) sem gravar, com o foco em "Enter result";
- foco no campo ao abrir;
- **validação ao confirmar** (`design.md` §4): vazio ou não inteiro → erro local, sem comando; inteiro → `session.enter(key, sum)`. Recusa `out-of-range` → erro com a faixa devolvida (`range`). Erro: borda `--color-state-danger`, mensagem em `.typography-meta` `--color-state-danger` com ícone `circle-alert` (`--size-icon-sm`), ligada por `aria-describedby`, `aria-invalid="true"`; texto "Enter a value from {min} to {max}." O campo mantém o valor digitado e o foco (AC-14). A mensagem some na próxima edição do campo.
- **Anúncio do erro** (`design.md` §4, convenção de estados, "error", emenda D-ERR de 2026-11-25): pelo clique em "Use this result", o foco fica no botão e não vai até a mensagem; ela é anunciada por uma região `aria-live="polite"` que já está no formulário antes de a mensagem aparecer (o erro local e o da recusa `out-of-range`). Pela tecla Enter no campo, o foco já está nele e a mensagem é lida pelo `aria-describedby`. O código ainda não tem a região: [DEF-013](../../defects.md).

### rolled

Começa quando o snapshot mostra a vaga decidida com `result.mode: 'rolled'` (D11 da FEAT-007; C2), antes da gravação, e vale também com `save-failed`.

```
┌──────┐  Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10
│  10  │  8–12
│rolled│  No text added for this entry · CORE p.18
└──────┘  [Corruption +1]
          Rerolling or changing this result isn't available yet.
```

- [Caixa de valor](#caixa-de-valor) com o `total` e "rolled", à esquerda, alinhada ao topo; à direita, coluna de resultado com `--space-1` entre linhas:
  1. cálculo (FR-DEC-007) em `.typography-meta` `--color-text-secondary`, tabular: "Rolled {dado}: {faces unidas por ' + '} · Modifier {±m} · Total {total}", sempre com o modificador, mesmo +0 (AC-4);
  2. entrada: faixa em `.typography-badge` ("8–12") e, quando a entrada tem entidade, o nome em `.typography-title-sm` ("3–4 Troglodytes");
  3. [sem texto](#no-text);
  4. efeitos da `EntryView` vigente como `effect-chip`, em linha com quebra, gap `--space-1-5` (sem linha quando não há efeito);
  5. `roll-effect` aberta ou decidida, se houver ([effect-open](#effect-open));
  6. [decided-locked](#decided-locked).
- Os valores vêm do resultado gravado (faces, modificador, total, entrada); página e efeitos, da `EntryView` vigente (D2, D3).
- **Foco e anúncio:** uma vez, na entrada do estado, só no cartão em que a pessoa acionou Roll: o foco vai para a coluna de resultado (`tabindex="-1"`), que o leitor de tela lê a partir do cálculo ("Rolled 3d6: 3 + 5 + 2 · Modifier +0 · Total 10, 8–12, …"; `design.md` §5). A marca é posta no clique e consumida no efeito sobre o snapshot (DEF-008); a continuação depois do `await` só a desfaz numa recusa (contador de ações, DEF-006). O fim da gravação não move o foco.

### entered

Como [rolled](#rolled), quando o snapshot mostra `result.mode: 'entered'`:

- caixa com o `total` e "entered";
- cálculo: "Entered for {dado}: {sum} · Modifier {±m} · Total {total}" (soma informada, sem faces; D4);
- foco e anúncio como no rolled, só no cartão em que a pessoa acionou "Use this result".

### chosen

Começa quando o snapshot mostra `result.mode: 'chosen'`. Segmento Choose; a grade continua no corpo, com a entrada da decisão marcada, e abaixo dela (`--space-3`) a coluna de resultado sem caixa de valor e sem cálculo: entrada, [sem texto](#no-text), efeitos, `roll-effect` e o motivo do [decided-locked](#decided-locked).

- **Choose → Choose** (D5): escolher outra entrada chama `session.decide(key, entry)` e substitui; a grade mostra a nova quando o snapshot mudar.
- **Foco:** fica no `radio` acionado (o React Aria o põe lá no clique); nenhum foco programático, nenhuma marca. O leitor de tela anuncia o `radio` marcado. Clicar na entrada já marcada não chama comando (o `RadioGroup` não dispara mudança; D13).

### Grade

`range-grid` do `design.md` §4, como `RadioGroup` do React Aria (`radio` com input oculto e `data-focus-ring` no rótulo), valor controlado pelo snapshot (`result.entry` ou nada):

- entradas na ordem de `table.entries` (início da faixa, FR-DEC-012);
- cada entrada: faixa em `.typography-badge` e, com entidade, o nome em `.typography-body` ("3–4 Troglodytes"); sem entidade (D36), faixa e `source-badge` da página da entrada ("4–7" + `CORE p.18`). Conteúdo em linha com quebra (`flex-wrap`, gap `--space-1-5`): em coluna estreita, o selo ou o nome descem para a segunda linha;
- botão: fundo `--color-background-surface`, borda `--border-width-default` `--color-border-control`, `--radius-md`, padding `--space-2` `--space-3`, altura mínima `--size-control` (`--size-touch-target` em ponteiro grosso); hover fundo `--color-background-subtle`;
- marcada (a decisão): borda `--border-width-selected` `--color-border-strong` e ícone `check` (`--size-icon-sm`) antes da faixa. Aqui não há prévia: marcar é decidir, então o tratamento do `option-card` `current` não se aplica;
- colunas: 2 abaixo de `--bp-md`, 3 de `--bp-md` a `--bp-below-xl`, 4 de `--bp-xl` em diante; no máximo 3 em ponteiro grosso (`design.md` §4); gap `--space-2`;
- nome acessível do `radiogroup` composto por referência ao conteúdo visível (C9): `aria-labelledby` com o `id` do `h2` e o do rótulo "Choose a result.", o que dá "Dwarf Age Choose a result.". Assim os seis cartões não têm grades de mesmo nome, e a grade não tem o nome do `segmented-control` ("Dwarf Age");
- nome acessível de cada `radio` pelo conteúdo: "3–4 Troglodytes", "4–7 CORE p.18";
- **sem campo "Name"** (`design.md` §4, `range-grid`, E10): as entradas das tabelas de história são descrições fora do pacote (P22), não nomes a digitar; a grade mostra só faixa e página, e o resultado segue o [sem texto](#no-text).

### no-text

Toda entrada do MVP (FR-DEC-008, AC-5): linha em `.typography-meta` `--color-text-secondary`: "No text added for this entry · " + `source-badge` da página da entrada. Sem "Add text" (P9a, fora do MVP). Aparece em rolled, entered e chosen, também nas entradas com entidade.

### effect-open

Efeito `add.dice` da entrada vigente (D7; FR-STEP-014): a vaga `roll-effect` aparece na coluna de resultado do próprio cartão, `--space-3` abaixo dos efeitos, como `subdecision` (borda tracejada `--color-border-control`, `--radius-md`, padding `--space-3` `--space-4`), com `id` = `slotElementId(key)` e `tabindex="-1"`:

- pergunta em `.typography-label`: "{Alvo} {dado do efeito}" ("Insanity 1d6"), o rótulo da pendência;
- `button-primary` "Roll {dado do efeito}" e `button-secondary` "Enter result" (`roll` e `enter`; FR-STEP-014); "Enter result" abre o formulário do [entering](#entering) dentro da caixa, com o mesmo erro e o mesmo anúncio;
- rodapé em `.typography-meta`: "Or decide later: it stays in Open decisions." (texto do Size, FEAT-007);
- o `effect-chip` da entrada mostra "Insanity +1d6", e o resumo vivo mostra o alvo pendente ("—" e "Open"; [Composição](#composição)).

### effect-decided

Quando o snapshot mostra a `roll-effect` com `result`:

- a caixa passa de tracejada a sólida (`--color-border-divider`), como o Size decidido;
- dentro, a [Caixa de valor](#caixa-de-valor) com o total e "rolled" ou "entered", e ao lado o cálculo ("Rolled 1d6: 4 · Modifier +0 · Total 4" ou "Entered for 1d6: 4 · …") e o `effect-chip` com o valor somado ("Insanity +4");
- o rodapé dá lugar ao motivo do [decided-locked](#decided-locked);
- foco e anúncio como no [rolled](#rolled), na coluna de resultado da caixa, só na caixa em que a pessoa agiu.

### decided-locked

Tabela decidida, sem troca nesta feature (D5):

- o `segmented-control` fica com `isReadOnly` (React Aria): o segmento da decisão marcado, focável e legível, sem `--opacity-disabled` e sem hover (padrão da FEAT-008);
- Roll e Enter result saem; nenhum "Reroll" (FEAT-011);
- motivo visível em `.typography-meta`, ligado ao `segmented-control` por `aria-describedby` (P31):
  - rolled ou entered (tabela e `roll-effect`): "Rerolling or changing this result isn't available yet.";
  - chosen: "You can choose another result. Rolling instead isn't available yet."

### dependents-blocked

`session.decide` em Choose → Choose devolveu `has-dependents` (a entrada atual tem uma `roll-effect` decidida; D8 da FEAT-007). No MVP, só com pacote fictício.

- `inline-alert` warning (ícone `triangle-alert`, `role="status"`) dentro do cartão, entre a linha do regime e a grade. Texto em [Mensagens](#mensagens).
- A grade continua com a entrada atual marcada (o snapshot não mudou); o foco fica no `radio` acionado.
- O alerta aparece na continuação depois do `await`, só na recusa e só se a pessoa não agiu depois do clique (contador de ações, DEF-006), como o erro do campo do Enter result: não é estado de snapshot, porque a recusa não muda o snapshot. Some na próxima ação da pessoa neste cartão.

### save-failed · loading · error

Os da moldura da FEAT-007, sem mudança. Com `save-failed`, o cartão mantém o resultado (ele entrou pelo snapshot), e o alerta é o da moldura (AC-14).

### Caixa de valor

Caixa de `--size-roll-value` × `--size-roll-value` (E8), `box-sizing: border-box`: fundo `--color-background-subtle`, borda `--border-width-default` `--color-border-control`, `--radius-md`, padding `--space-1-5`, coluna centrada (`justify-content` e `align-items: center`), algarismos tabulares. Valor em `.typography-stat-lg` com altura de linha `--font-size-4xl` (40 px, no lugar dos 48 px do estilo), como o `design.md` §4; rótulo em `.typography-caption` ("rolled", "entered"). `aria-hidden`: o total já está no cálculo, e o leitor de tela não precisa ouvir o número duas vezes.

Encaixe medido em 2026-11-16 (base da regra do `design.md` §4), renderizado no Chromium com Inter e os tokens gerados: área interna de 58 px (72 − 2 de borda − 12 de padding). Com a altura de linha do estilo, valor 48 + rótulo 17,4 = 65,4 px, 7,4 px a mais que a área, que comem o padding. Com a altura de linha `--font-size-4xl`, 40 + 17,4 = 57,4 px, dentro da área. Na largura, "18" ocupa 51,8 px e "entered" 43,6 px, dentro dos 58 px. Um total de três algarismos (cerca de 78 px) não cabe; nenhuma tabela do MVP chega a 100.

### Composição

`value-composition` (etapa Attributes e resumo vivo, mesmos rótulos), acréscimos aos da FEAT-007 e da FEAT-008:

| Parcela (technical-design §3.3) | Origem (`.typography-meta`) | Valor (`.typography-badge`) |
| :-- | :-- | :-- |
| `sum` de origem `table` | "{Tabela}: {faixa}" ("Dwarf Background: 1") | "+1" |
| `define` de origem `table` | "{Tabela}: {faixa}" | a diferença ("+2", "−1") |
| `sum` com `roll-effect` aberta | "{Tabela}: {faixa}, open" | "—" |

O total segue a regra da FEAT-008. Com um alvo pendente (`pendingOn`), o resumo vivo mostra "—" e a pílula "Open" como a característica pendente da FEAT-007; no mini-cartão de atributo, "—" no valor e "Open" no lugar do modificador.

- **Teclado:** ordem de foco: cabeçalho → por cartão: `segmented-control` → botões ou grade → campo e ações do Enter result → caixa da `roll-effect` → Back → Next. Segmentos e grade com setas (radiogroup); no grupo só leitura, as setas movem o foco sem mudar a seleção. A coluna de resultado e o cartão só recebem foco pelo programa (`tabindex="-1"`).
- **Notas responsivas:**
  - **desktop (≥ `--bp-xl`):** a moldura de três zonas; cartões na largura da coluna; grade de 4 colunas;
  - **intermediário:** seletor no topo, etapa e resumo em duas colunas; grade de 3;
  - **celular (< `--bp-md`, SCR-WEB-016):** padding de card `--space-4`; na linha do título, o `segmented-control` desce para baixo do nome quando não cabe (quebra pelo conteúdo, alinhado à esquerda); grade de 2 colunas; caixa de valor e coluna de resultado lado a lado (72 px + `--space-3` + o resto); no Enter result, campo e ações em largura total, empilhados; alvos de `--size-touch-target`.
  - Reflow a 320 CSS px sem rolagem horizontal (`design.md` §5).
  - **Anel de foco num contêiner** (C18): segmentos e entradas da grade usam `data-focus-ring`, então a Story do Dwarf entra no `e2e/builder-dock.spec.ts` (T9).
- **Decisões:**
  - **Grade em Choose decide no clique, sem prévia nem "Choose …".** Motivo: Choose → Choose substitui sem custo (D5), como o Size, e os efeitos da entrada aparecem logo abaixo, com o resumo vivo anunciando a mudança. Alternativa rejeitada: selecionar, ver a prévia e confirmar, como a Ancestry, que dobraria os passos em seis tabelas quase sem efeitos.
  - **O modo decidido fica só leitura, com o motivo visível.** Motivo: P31 e o padrão da FEAT-008. Alternativa rejeitada: segmento livre e recusa `already-decided` depois do clique.
  - **Foco na coluna de resultado depois de Roll e Enter result, nenhum foco no Choose.** Motivo: Roll e "Use this result" somem quando o resultado entra, e o foco cairia no `body`; no Choose, o `radio` acionado continua na tela. Alternativa rejeitada: região `role="status"` à parte, que repetiria o que o foco já lê.
  - **Regime em frase no cartão** ("The book says to roll or choose."), não no rótulo curto do mapa. Motivo: FR-DEC-002 pede indicar o que a regra prevê sem restringir; a frase diz isso para quem não conhece as regras. O rótulo curto continua no eyebrow da etapa.

## SCR-WEB-003 — Ancestry step

- **Estratégia e fonte:** code-native. A tela é a da FEAT-007 ([SCR-WEB-003](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#scr-web-003--ancestry-step)); esta seção só acrescenta o bloco "Decide now" com tabelas e a mensagem de `has-dependents` com resultados de tabela.
- **Dados:** `view.slots` com `source.id` = a ancestralidade e `kind: 'table'`, de outra etapa (`stepId`, `decided`); `view.steps` para nome, `slug` e `status` da etapa.
- **Conformidade:** sem componente nem token novo; a linha agrupada usa a forma das linhas "pendência em outra etapa" da FEAT-007.

### decide-now-tables

Dwarf escolhido: o bloco "Decide now" passa a existir (antes, "Dwarf: sem concessões nesta feature").

- **Agrupamento:** as vagas `table` concedidas numa mesma etapa viram **uma linha só** por etapa; as de outro `kind` continuam uma linha cada (o Human não muda).
- Linha agrupada:
  - título em `.typography-label`: "{n} tables in {Step}" ("6 tables in Story"; "1 table in Story" com uma);
  - em `.typography-meta`, os nomes na ordem das vagas, unidos por vírgula: "Dwarf Hatred, Dwarf Age, Dwarf Build, Dwarf Appearance, Dwarf Background, Dwarf Personality";
  - em `.typography-meta`: "{d} of {n} decided. " + `link` "Go to {Step}", para a etapa com `?slot=` da primeira tabela sem decisão (sem `?slot=` com todas decididas). Etapa bloqueada: o motivo no lugar do link, como hoje.
- Ordem no bloco: as linhas desta etapa (Size) e, depois, as de outras etapas, na ordem das etapas.
- **Decisão: uma linha por etapa, não uma por tabela.** Motivo: seis linhas iguais ("Chosen in Story. Go to Story") repetiriam o mesmo link seis vezes, com o mesmo nome acessível, e encheriam o detalhe da ancestralidade; quem quer o atalho de uma tabela tem o Open decisions. Alternativas rejeitadas: uma linha por tabela (a de hoje); um link por tabela na linha agrupada, com nomes iguais aos de Open decisions.

### dependents-blocked-tables

Trocar Dwarf por outra ancestralidade com tabelas decididas devolve `has-dependents` (AC-11). Alerta e comportamento da FEAT-007 ([dependents-blocked](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#dependents-blocked)), com a mensagem da regra de [Mensagens](#mensagens): resultado de tabela é "result", não "choice", qualquer que seja o modo.

## Decisões entre telas

- **Faixa com travessão** ("4–7"), da chave "4-7" (`design.md` §4, "3–4 Troglodytes"). Vale na grade, no resultado, na composição e nas mensagens.
- **Dado em duas notações, pelo papel:** o dado de uma tabela, que se rola, sem o "1" ("d20", "3d6": cabeçalho, "Roll d20", "Your d20 roll"); o dado de um efeito, que é uma quantia somada, sempre com a contagem, como os livros escrevem ("+1d6", "Insanity 1d6", "Roll 1d6"). Modificador como "d6+1", com o menos tipográfico.
- **Resultado de tabela é "result", nunca "choice"**, nas mensagens e nos rótulos: rolar não é escolher.

## Textos

Fechados para a FEAT-009, revisados contra a NFR-USE-001 e o `design.md` §6. Os rascunhos do technical-design §3.4 ficam lá; vale esta tabela. Moldura e gravação: os da FEAT-007.

**Etapa Story** (só com vagas `table`)

| Onde | Texto |
| :-- | :-- |
| Eyebrow | "STEP 3 OF 8 · ROLL OR CHOOSE" |
| Pergunta (`h1`) | "What is your character's story?" |
| Linha de regra | "Roll on each of your ancestry's tables, or choose the result you want. Some results change your scores: you'll see them under the result." + `CORE p.11` |
| Contadores | "{d} of {t} decided" · "{n} open" |

**Roll-card**

| Onde | Texto |
| :-- | :-- |
| Título · dado | "{Tabela}" · "3d6", "d20" |
| Regime (FR-DEC-002) | `choice`: "The book says to choose." · `roll-or-choose`: "The book says to roll or choose." · `roll`: "The book says to roll." |
| Segmentos | "Roll" · "Choose" |
| A decidir | "Roll {dado}" · "Enter result" · "Not decided yet. Nothing else waits for it." |
| Grade | "Choose a result." · nome do grupo: "{Tabela} Choose a result." · "{faixa} {Nome}" · "{faixa}" + selo |
| Enter result | "Your {dado} roll" · "Add up what the dice show, without any modifier. From {min} to {max}." · "Use this result" · "Cancel" |
| Fora da faixa | "Enter a value from {min} to {max}." |
| Caixa de valor | "rolled" · "entered" |
| Cálculo | "Rolled {dado}: {f1} + {f2} + {f3} · Modifier {±m} · Total {t}" · "Entered for {dado}: {soma} · Modifier {±m} · Total {t}" |
| Sem texto | "No text added for this entry · " + selo |
| Efeito | `add`: "{Alvo} +{n}" ("Corruption +1") · `set`: "{Alvo} {n}" ("Size 1/2") · `add.dice`: "{Alvo} +{dado}" ("Insanity +1d6") · decidido: "{Alvo} +{total}" ("Insanity +4") |
| Efeito com dado | "{Alvo} {dado}" ("Insanity 1d6") · "Roll {dado}" · "Enter result" · "Or decide later: it stays in Open decisions." |
| Decidida (D5) | "Rerolling or changing this result isn't available yet." · Choose: "You can choose another result. Rolling instead isn't available yet." |

**Decide now** (SCR-WEB-003): "{n} tables in {Step}" / "1 table in {Step}" · "{nomes}" · "{d} of {n} decided." · "Go to {Step}".

**Rótulo de regime** (acerto da tabela da FEAT-007; eyebrow das etapas): `roll-or-choose` → "Roll or choose". A FEAT-010 volta a "Roll, choose or write your own" quando o Write existir. Os outros não mudam.

**Rótulos de pendência** (acréscimo à tabela da FEAT-007)

| `kind` | Título | Onde |
| :-- | :-- | :-- |
| `table` | "{Tabela}" ("Dwarf Age") | "{Step} · {origem}" ("Story · Dwarf") |
| `roll-effect` | "{Alvo} {dado}" ("Insanity 1d6") | "{Step} · {Tabela}" ("Story · Dwarf Background") |

**Composição:** "{Tabela}: {faixa}" · "{Tabela}: {faixa}, open".

#### Mensagens

Regra do `{decisões}` (substitui a da FEAT-007): cada dependente tem um substantivo, "result" para `table` e `roll-effect` e "choice" para os demais `kind`. Agrupa-se por substantivo, "choice" antes de "result"; cada grupo é "your {a} {substantivo}", "your {a} and {b} {substantivo}s" ou "your {a}, {b} and {c} {substantivo}s"; dois grupos se unem por " and ". O verbo concorda com o total ("depends" com um, "depend" com mais). Com uma escolha, o texto da FEAT-007 não muda.

| Caso | Texto |
| :-- | :-- |
| `has-dependents`, troca de ancestralidade | "You can't switch to {New} yet: {decisões} for {Current} {depends/depend} on your current ancestry. Changing a choice that others depend on isn't available yet." |
| Exemplo com as seis tabelas | "You can't switch to Human yet: your Dwarf Hatred, Dwarf Age, Dwarf Build, Dwarf Appearance, Dwarf Background and Dwarf Personality results for Dwarf depend on your current ancestry. Changing a choice that others depend on isn't available yet." |
| Exemplo misto (pacote fictício) | "You can't switch to Dwarf yet: your Size choice and your Dwarf Age result for Human depend on your current ancestry. Changing a choice that others depend on isn't available yet." |
| `has-dependents`, Choose → Choose | "You can't change {Tabela} to {nova faixa} yet: {decisões} {depends/depend} on the current result, {faixa atual}. Changing a choice that others depend on isn't available yet." |
| Exemplo | "You can't change Dwarf Background to 2 yet: your Insanity 1d6 result depends on the current result, 1. Changing a choice that others depend on isn't available yet." |

A frase final é a do `copy.ts:139`, e o "isn't available yet" da tabela decidida segue a mesma forma.

### Nomes novos contra os localizadores do e2e/ (C1)

Conferidos todos os `getByRole`, `getByText`, `getByLabel`, `getByTitle` e `getByPlaceholder` de `e2e/` contra os nomes e textos acima. Lembrete: sem `exact`, o Playwright casa por substring e sem caixa.

| Localizador existente | Risco | Situação |
| :-- | :-- | :-- |
| `getByText('Decided.')` (`ancestry.spec.ts:193`, Size do Human) | casaria com um texto que contivesse "decided.", como "0 of 6 decided." do Decide now | Sem colisão: o teste roda com Human escolhido, e o Human não concede vaga `table` (`packs/sotdl.core.json`), então a linha agrupada não está na tela; a pílula da Story, "… decided", não tem ponto e fica em outra etapa. Com Dwarf, a linha casaria: localizador novo do Decide now escopa pela linha. |
| `getByRole('radiogroup', { name: 'Size' })` (`ancestry.spec.ts:109`, `152`, `204`) | os `radiogroup` novos: "Dwarf Age" (segmentos) e "Dwarf Age Choose a result." (grade) | Sem colisão: nenhum nome de tabela contém "size", e o localizador fica na Ancestry. |
| `getByRole('button', { name: 'Back' })` (`ancestry.spec.ts:130`, `builder-dock.spec.ts:70`) | casaria com um botão cujo nome contivesse "back" | Sem colisão: os botões novos são "Roll …", "Enter result", "Use this result" e "Cancel"; "Dwarf Background" é nome de `region`, `h2` e link, nunca de botão. |
| `has-dependents` exato (`ancestry.spec.ts:198`, `Builder.test.tsx:323`) | a regra nova da mensagem | Sem colisão: com uma escolha, o texto é o mesmo. |
| `getByText('Or decide later: it stays in Open decisions.')` (`ancestry.spec.ts:110`) | o texto volta na `roll-effect` | Sem colisão: só na Story, e nenhuma tabela do pacote real tem efeito com dado. |
| `getByRole('radio', { name: '1', exact: true })` (`ancestry.spec.ts:204`) | as entradas do Background se chamam "1 CORE p.19", "10 CORE p.19"… | Sem colisão: o localizador é `exact` e fica no radiogroup "Size". |
| `getByRole('button', { name: 'Cancel' })` (`home.spec.ts`, `capacity.spec.ts`) | o "Cancel" do Enter result | Sem colisão: são da Home. |
| "Chosen 0 of 1" exato (`ancestry.spec.ts:51`, `attributes.spec.ts:213`) | a pílula "decided" da Story | Sem colisão: o rótulo "Chosen" não muda nas outras etapas. |
| "There's nothing to decide in this step yet." (`attributes.spec.ts:224`, Story do Human) | os textos próprios da Story | Sem colisão: a Story sem tabela continua com o fallback. |

**Como escrever os localizadores novos** (T8, T9):
- escopar pelo cartão: `page.getByRole('region', { name: 'Dwarf Age' })`; "Roll", "Choose", "Roll 3d6" e "Choose a result." se repetem em vários cartões;
- os dois grupos do cartão: `getByRole('radiogroup', { name: 'Dwarf Age', exact: true })` para os segmentos (sem `exact`, casaria também com a grade) e `getByRole('radiogroup', { name: 'Dwarf Age Choose a result.' })` para a grade;
- entradas da grade com `exact: true` ou regex ancorada: `getByRole('radio', { name: /^1 CORE/ })`. Sem isso, "1" casa com "1–2 Ogres", "10 CORE p.19" e os demais de 10 a 19;
- "Dwarf Age" sem escopo casa com o `h2`, com os dois `radiogroup` do cartão, com o link de Open decisions ("Dwarf Age Story · Dwarf", no `aside`) e, na Ancestry, com a linha do Decide now. Para o atalho, usar `aside` + regex ancorada (`/^Dwarf Age\s*Story · Dwarf$/`), como o do Size;
- o campo do Enter result por `getByLabel('Your 3d6 roll')`.

## Escalações e pendências

Duas escalações para a ux-foundations, decididas pelo usuário em 2026-11-16 ("emendar e seguir"), aplicadas no mesmo dia (`9c5db16` no `design.md`, `095362b` na `ux-foundations.md`), com a re-verificação desta tela:

- **E10. `range-grid` sem o campo "Name" nas tabelas de história** (`design.md` §4, `range-grid`; `ux-foundations.md` F2):
  - **O que falta:** os dois documentos dizem, sem condição, que uma entrada sem nome no pacote (D36) abre um `text-input` "Name" ao ser selecionada. Nas tabelas de história (Age, Build, Appearance, Background, Personality), a entrada é uma descrição, não um nome a digitar; o campo pediria algo que não existe e se confundiria com o Write (FEAT-010).
  - **Proposta:** `range-grid`: "Sem nome no pacote (D36): só faixa e página. O `text-input` "Name" abre ao selecionar só quando a entrada é um nome que a pessoa digita (ex.: profissões); nas tabelas cujas entradas são descrições (as de história), não abre." F2: o ramo "Nome no pacote? não (D36) → Digita o nome" passa a valer só para entrada que é nome. Como o app sabe que a entrada é um nome fica com a FEAT-012 (profissões), a primeira que o usa.
  - **Telas:** SCR-WEB-009 (e, adiante, SCR-WEB-010).
  - **Situação:** aplicada (`design.md` §4 e F2). A [Grade](#grade) segue a regra, sem tratamento provisório. Fica para o detailed-design da FEAT-012: como o pacote marca uma tabela de nomes.
- **E11. `ux-foundations.md` A5.1 alinhado ao SRS:**
  - **O que diverge:** a A5.1 diz "toda tabela aceita rolar, escolher, escrever ou informar"; o technical-design (D6, AC-2) e a FR-DEC-004 dão Enter result só à tabela de rolagem prescrita.
  - **Proposta:** rolar e escolher em toda tabela (FR-DEC-001); Write nas tabelas de rolagem com escolha permitida (FR-DEC-003); Enter result nas de rolagem prescrita (FR-DEC-004, D30); o regime como indicação, sem restringir (FR-DEC-002).
  - **Telas:** nenhuma muda: a tela mostra os modos de `table.modes` (D6).
  - **Situação:** aplicada (A5.1 e F2).

Notas, sem emenda:
- O exemplo do `step-header` no `design.md` §4 ("STEP 3 OF 8 · ROLL, CHOOSE OR WRITE YOUR OWN") é só exemplo; até a FEAT-010, o rótulo é "ROLL OR CHOOSE".
- A caixa de valor, medida aqui ([Caixa de valor](#caixa-de-valor)), entrou no `design.md` §4 na mesma emenda, e a lacuna saiu do §9.
- **Fora desta feature:** Write, tabelas aguardando, subdecisões de resultado e "Roll all undecided" (FEAT-010); Reroll, troca de modo e troca de resultado com o diálogo de impacto (FEAT-011); o +1 do Human e as tabelas de história do Human (FEAT-016).
- **RTM:** recebe este `ui-design.md` na Design ref das FRs que as duas telas realizam.
