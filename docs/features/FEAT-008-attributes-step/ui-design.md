# UI Design: FEAT-008 — Etapa Attributes: ajuste ±1, características com fórmula e composição

> Feature de: `docs/implementation-plan.md` · Par com: `technical-design.md`
> Telas: SCR-WEB-005 · Modo: por feature · Status: Draft (escalação E5 pendente) · Data: 2026-11-12

Autoridade: `docs/design.md` e `docs/tokens.json`. Todo valor visual abaixo é token (`--…`) ou classe `.typography-*`; breakpoints pelos `@custom-media` da FEAT-007. Ícones Lucide, decorativos com `aria-hidden`. A moldura (mapa, resumo vivo, Open decisions, Back e Next, celular) é a da FEAT-007 ([Builder frame](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#builder-frame) e SCR-WEB-016), sem mudança. Texto da interface em inglês, fechado em [Textos](#textos). Nenhum texto dos livros (P22).

## SCR-WEB-005 — Attributes step

- **Estratégia e fonte:** code-native; esta seção é o design.
- **Composição:** a moldura do construtor com o corpo da etapa, nesta ordem (P30: base, aumento, ajuste):
  1. `step-header`;
  2. alertas da etapa (`inline-alert`);
  3. card **Attributes**: quatro linhas de atributo e, com Human, a pendência do +1;
  4. card **Score adjustment**: duas `subdecision` em sequência, a prévia e as ações;
  5. card **Characteristics**: dez `characteristic-row`;
  6. Back e Next.
- **Dados** (technical-design §3.2–§3.4):

| Elemento | Fonte |
| :-- | :-- |
| Eyebrow, regime, contadores | `view.steps[i]` (`index`, `regime`, `status`, `decided`, `open`, `total`) + `steps.length` |
| Linha de regra | texto do app por id de etapa; selo pela `page` do `step:attributes` |
| Linhas de atributo | `view.summary.attributes[]`: `name`, `score`, `modifier`, `composition` |
| +1 do Human | `view.slots` com `kind: 'attribute-increase'` e `stepId` desta etapa, sem decisão; origem por `openDecisions[].source` |
| Ajuste: opções, estado, par atual | `view.slots` da vaga `attribute-shift` desta etapa: `options`, `decided`, `value` |
| Prévia | `engine.preview(rules, document, key, { decrease, increase }).changes` |
| Aplicar · desfazer | `session.decide(key, { decrease, increase })` · `session.clear(key)` → `DecideResult` |
| Segunda tentativa | `DecideResult.reason === 'already-decided'` |
| Linhas de característica | `view.summary.characteristics[]`: `name`, `value`, `formula`, `limits`, `composition`, `pendingOn` |
| Gravação | `snapshot.save`, `session.retrySave()` |

- **Conformidade:** conforme ao `design.md`, com uma exceção escalada: o `segmented-control` de 4 segmentos não cabe a 360 px nem no reflow de 320 px (E5, [Escalações](#escalações-e-pendências)). O resto usa componentes e tokens existentes.

### default

Etapa aberta, ajuste não usado. Exemplo: Dwarf.

1. **`step-header`** (card, como na FEAT-007):
   - eyebrow `STEP 2 OF 8 · CHOICE`, com a marca de identidade acima;
   - `h1`: "How strong, quick, clever and willful is your character?";
   - linha de regra em `.typography-body` `--color-text-secondary`: "Your ancestry sets your starting scores. Once, you may lower one score by 1 to raise another by 1." + `source-badge` `CORE p.10`;
   - contadores: ver [Contadores](#contadores).
2. **Card Attributes** (`card`):
   - `h2` "Attributes" em `.typography-title`;
   - lista (`ul`, rótulo "Attributes") com quatro linhas na ordem do pacote. Cada linha é um gatilho de Disclosure (React Aria), em grade de três colunas (como o `characteristic-row`):
     - nome em `.typography-label`;
     - "Modifier +0" em `.typography-meta` `--color-text-secondary`;
     - score em `.typography-stat`, tabular, à direita;
     - ícone `chevron-down` (`--size-icon-sm`, `aria-hidden`), que vira `chevron-up` aberto;
   - divisor `--color-border-divider` entre linhas, padding vertical `--space-3`;
   - aberta, a linha mostra o `value-composition` (ver [Composição](#composição));
   - **nome acessível do gatilho:** "{Attribute} {score}, modifier {mod}", ex.: "Intellect 11, modifier +1". O `e2e/perf.spec.ts` acha a linha por `main` + papel `button` + nome começando por "{Attribute} " e lê o score dele (technical-design §5).
3. **Card Score adjustment** (`card`):
   - `h2` "Score adjustment" em `.typography-title` (`tabindex="-1"`, alvo de foco depois de desfazer) e, abaixo, "Optional. You can make it once." em `.typography-meta`;
   - duas `subdecision`, empilhadas com `--space-3` entre elas, cada uma com pergunta em `.typography-label` e um `segmented-control` dos quatro atributos (semântica de radiogroup, rótulo = a pergunta):
     1. "Raise one attribute by 1";
     2. "Lower another attribute by 1". Desabilitada (`--opacity-disabled`) até haver escolha na primeira, com o motivo visível em `.typography-meta` abaixo dela, ligado por `aria-describedby`: "Choose the attribute to raise first.";
   - ações, alinhadas à direita, `--space-4` acima: `button-primary` "Apply adjustment", desabilitado com o motivo ao lado em `.typography-meta`: "Choose both attributes first." (P31).
4. **Card Characteristics** (`card`):
   - `h2` "Characteristics" em `.typography-title` e, na mesma linha à direita, "Calculated from your attributes. They update when your scores change." em `.typography-meta`;
   - dez `characteristic-row` na ordem do pacote: nome em `.typography-label` · fórmula e limite em `.typography-meta` `--color-text-secondary` · valor em `.typography-stat` à direita; Disclosure para o `value-composition`;
   - **linha de fórmula** (FR-CALC-003): `formula` de `formatFormula`, seguida dos limites, separados por vírgula:
     - mínimo: ", minimum {limite}"; máximo: ", maximum {limite}";
     - limite numérico aparece como número ("maximum 25"); limite por referência aparece com o valor entre parênteses ("maximum Will (10)"), ou sem ele quando pendente;
     - fórmula que é só um número aparece como "Fixed" ("Fixed, maximum Will (10)");
     - exemplos do core: "Health / 4, rounded down, minimum 1" · "Agility, maximum 25" · "Intellect + 1, maximum 25" · "Strength + 4" · "Fixed" · "1/2 or 1";
   - **nome acessível do gatilho:** "{Characteristic} {value}" ("Healing Rate 3"); pendente: "{Characteristic}, open". A linha de fórmula é a descrição (`aria-describedby`);
   - **pendente** (Human com Size aberto): valor "—" e `pill-counter` pendente "Open" abaixo do nome, como no resumo vivo.
5. **Back e Next:** `button-secondary` "Back" e `button-primary` "Next: Story", como na moldura.

#### Contadores

`pill-counter` no `step-header`, só das vagas obrigatórias (technical-design §3.3), mais o do ajuste:

| Caso | Pílulas |
| :-- | :-- |
| `total` > 0 (Human) | "Chosen {d} of {t}", pendente enquanto `open` > 0, e "{n} open" pendente |
| `total` = 0 (Dwarf, etapa `done`) | "Nothing required", preenchida (concluído) |
| ajuste aplicado | mais "Adjustment used", preenchida |

O ajuste não usado não ganha pílula: ele não é pendência (D2), e pílula tracejada diria que é. O próprio card diz "Optional".

#### Composição

`value-composition` (`design.md` §4) ao abrir uma linha, na etapa e no resumo vivo (mesmos rótulos):

| Parcela (technical-design §3.3) | Origem (`.typography-meta`) | Valor (`.typography-badge`) |
| :-- | :-- | :-- |
| `base` de atributo | "{Ancestry} starting score" (FEAT-007) | "10" |
| `base` de característica | "{Ancestry}: {fórmula}" · "Standard rule: {fórmula}" (FEAT-007) | "14" |
| `modifier` do ajuste | "Score adjustment" | "+1" · "−1" |
| `limit` máximo, só quando corta | "Capped at {limite}" ("Capped at 25") | "−2" |
| `limit` mínimo, só quando corta | "Raised to minimum {limite}" | "+1" |
| total | "{Name}", com divisor acima, semibold | "11" |

Sinais com o menos tipográfico (−). O total é sempre a soma das parcelas (D5).

### selecting

O jogador escolhe na primeira `subdecision` (ex.: Intellect).

- O segmento fica selecionado (`--color-action-selected`, texto `--color-text-inverse`).
- A segunda `subdecision` se habilita, e o motivo dela some. Nela, o segmento do atributo escolhido para subir fica desabilitado, com o motivo visível abaixo do grupo: "You can't lower the attribute you're raising." (P31). As setas pulam o segmento desabilitado.
- Trocar a primeira escolha para o atributo já escolhido na segunda limpa a segunda.
- Com as duas escolhidas (ex.: subir Intellect, baixar Strength):
  - aparece a **prévia** (FR-FLOW-014), a mesma caixa da FEAT-007 (`--color-background-sunken`, `--radius-md`, padding `--space-3`), entre as `subdecision` e as ações:
    - eyebrow `IF YOU APPLY THIS ADJUSTMENT`;
    - uma linha por mudança de `changes`, atributos primeiro: "Intellect 10 → 11", "Strength 10 → 9", "Perception 11 → 12", "Health 14 → 13"; mudanças de etapa no formato da FEAT-007;
  - "Apply adjustment" se habilita, e o motivo some.
- A seleção é estado local (technical-design §3.4): nada é gravado, e recarregar volta ao [default](#default).

### applied

`session.decide` devolveu `ok` (ajuste decidido).

- As duas `subdecision` passam de tracejada a sólida (`--color-border-divider`), como o Size decidido da FEAT-007, e mostram o par aplicado nos segmentos. A prévia e "Apply adjustment" saem.
- Abaixo delas, a linha de estado "Applied: Intellect +1, Strength −1." em `.typography-meta` (`tabindex="-1"`) e, à direita, `button-secondary` "Undo adjustment".
- Pílula "Adjustment used" no cabeçalho; linhas e resumo com os valores novos; a composição de Intellect e Strength ganha a parcela "Score adjustment".
- **Foco e anúncio:** o foco vai para a linha de estado, que o leitor de tela lê. O resumo vivo anuncia os valores em `aria-live="polite"` (FEAT-007).

### refused

Segunda tentativa: com o ajuste aplicado, o jogador muda um segmento. A ui chama `session.decide` com o par novo, e o comando devolve `already-decided` (FR-STEP-010; a recusa vem do motor, não da tela, D3).

- Os segmentos voltam ao par aplicado; nada muda nem é gravado.
- `inline-alert` warning (ícone `triangle-alert`), `role="status"`, entre as `subdecision` e a linha de estado, logo acima de "Undo adjustment": "You've already made your adjustment, and it can be made only once. To change it, undo the current one first."
- O foco fica no segmento do par aplicado (o grupo continua o mesmo); o alerta é anunciado pelo `role="status"`.
- O alerta some na próxima ação do jogador nesta etapa. É warning, não danger: nada deu errado.

### undone

"Undo adjustment" chama `session.clear(key)`, e o comando devolve `ok`.

- O card volta ao [default](#default): `subdecision` tracejadas e vazias, sem prévia, "Apply adjustment" desabilitado com o motivo.
- Os dois atributos e as características dependentes voltam aos valores sem o ajuste; a pílula "Adjustment used" sai.
- **Foco e anúncio:** o foco vai para o `h2` "Score adjustment"; uma região `role="status"` visualmente oculta, no card, diz "Adjustment undone." O resumo vivo anuncia os valores.
- Um ajuste novo pode ser aplicado em seguida (FR-STEP-011).

### increase-pending

Com Human, o +1 da ancestralidade (FR-STEP-008, só a exibição; a resolução é da FEAT-016).

- No card Attributes, abaixo das quatro linhas, `--space-3` acima: caixa com a forma da `subdecision` (borda tracejada `--color-border-control`), sem controle:
  - título "+1 to one attribute" em `.typography-label` (o rótulo de pendência da FEAT-007);
  - em `.typography-meta`: "From Human. Choosing it here isn't available yet. It stays in Open decisions, and your scores don't include it until then.";
  - `id` do elemento derivado da chave da vaga e `tabindex="-1"`, para o atalho `?slot=` de Open decisions rolar até ele e focá-lo (FR-FLOW-011).
- Esse texto substitui, nesta etapa, o provisório da FEAT-007 ("You can't make this choice here yet…"), que continua nas etapas Story a Review.
- Contadores: "Chosen 0 of 1" e "1 open", pendentes. O ajuste continua disponível e independente do +1.

### save-failed

`snapshot.save === 'failed'` depois de aplicar ou desfazer: o padrão da FEAT-007, sem mudança. `inline-alert` danger fixo no topo do corpo, `role="alert"`, com "Your last choice wasn't saved…" e `button-secondary` "Try again" (`session.retrySave()`), em loading durante a nova tentativa. O estado novo continua na tela.

### loading · error

Os da moldura da FEAT-007, sem mudança (esqueletos; erro de abertura no card centrado).

- **Teclado:**
  - ordem de foco: cabeçalho → linhas de atributo → `segmented-control` de subir → de baixar → "Apply adjustment" ou "Undo adjustment" → linhas de característica → Back → Next;
  - `segmented-control` com setas (radiogroup), pulando segmento desabilitado; o grupo desabilitado sai da ordem de foco, e o motivo continua visível;
  - Disclosure com Enter e Espaço;
  - a pendência do +1 só recebe foco pelo atalho.
- **Notas responsivas:**
  - **desktop (≥ `--bp-xl`):** a moldura de três zonas; o corpo da etapa limitado a `--size-prose-max` só no texto corrido (a linha de regra), e os cards ocupam a coluna;
  - **intermediário (`--bp-md` a `--bp-below-xl`):** seletor de etapas no topo, etapa e resumo em duas colunas; linhas com as três colunas;
  - **celular (< `--bp-md`, SCR-WEB-016):**
    - corpo em uma coluna, `step-header` sem card, `h1` em `--font-size-display-mobile`, padding de card `--space-4`;
    - linhas de atributo e de característica em duas linhas: nome e valor na primeira, a linha de fórmula (ou "Modifier …") abaixo do nome;
    - `segmented-control` de 4 segmentos em grade de 2 colunas (E5);
    - ações do ajuste em largura total;
    - Back e Next fixos e a barra de resumo recolhida embaixo, com os quatro scores. Ela é o elemento que o `perf.spec.ts` observa nesse projeto.
  - Reflow a 320 CSS px sem rolagem horizontal (`design.md` §5).
- **Decisões:**
  - **O ajuste em duas `subdecision`, não em botões −1/+1 em cada atributo (como no wireframe).** Motivo: P30 (subdecisões em ordem), FR-FLOW-014 (a prévia do par inteiro antes de aplicar) e uma ação só, que vira um comando. Alternativa rejeitada: os botões por cartão do wireframe SCR-05, que aplicariam meio ajuste por clique e não têm prévia do par.
  - **Primeiro o que sobe, depois o que desce.** Motivo: a regra da p.10 descreve o ajuste a partir do aumento, e o exemplo do P30 põe "aumentar" antes de "diminuir". Alternativa rejeitada: descer primeiro, a ordem em que o pedido da revisão listou as duas. Fica para revisão do usuário.
  - **A segunda tentativa passa pelo comando.** Motivo: D3 do technical-design (a recusa vem do modelo); o padrão de troca recusada da FEAT-007 (`dependents-blocked`: a seleção volta e um warning explica). Alternativa rejeitada: travar os segmentos depois de aplicar, o que deixaria a recusa da FR-STEP-010 sem estado visível.
  - **Atributos em linhas, não em cartões.** Motivo: os controles saíram dos cartões, e o resumo vivo ao lado já tem os quatro mini-cartões; a linha repete a forma do `characteristic-row`, com o modificador no lugar da fórmula. Alternativa rejeitada: os cartões grandes do wireframe, que duplicariam o resumo no desktop.

## Decisões entre telas

- **Mesmos rótulos de composição na etapa e no resumo vivo.** O `LiveSummary` ganha "Score adjustment", "Capped at {limite}" e "Raised to minimum {limite}", e a etapa usa os mesmos componentes de composição.
- **Etapa `done` sem vaga obrigatória mostra "Nothing required".** Vale para qualquer etapa nesse caso, não só Attributes; as etapas sem nenhuma vaga continuam "Not started" e com o fallback.

## Textos

Fechados para a FEAT-008, revisados contra a NFR-USE-001 e o `design.md` §6. Nenhum id, `kind`, "slot" ou "stage" aparece na tela. Os rascunhos do technical-design §3.4 ficam lá; vale esta tabela. Os textos da moldura e as mensagens de gravação são os da FEAT-007.

**Etapa Attributes**

| Onde | Texto |
| :-- | :-- |
| Eyebrow | "STEP 2 OF 8 · CHOICE" |
| Pergunta (`h1`) | "How strong, quick, clever and willful is your character?" |
| Linha de regra | "Your ancestry sets your starting scores. Once, you may lower one score by 1 to raise another by 1." + `CORE p.10` |
| Contadores | "Chosen {d} of {t}" · "{n} open" · "Nothing required" · "Adjustment used" |
| Card de atributos | "Attributes" · "Modifier {mod}" |
| Nome acessível da linha de atributo | "{Attribute} {score}, modifier {mod}" |
| Card do ajuste | "Score adjustment" · "Optional. You can make it once." |
| Subdecisões | "Raise one attribute by 1" · "Lower another attribute by 1" |
| Motivos (P31) | "Choose the attribute to raise first." · "You can't lower the attribute you're raising." · "Choose both attributes first." |
| Prévia | "IF YOU APPLY THIS ADJUSTMENT" · "{Name} {de} → {para}" |
| Ações | "Apply adjustment" · "Undo adjustment" |
| Aplicado | "Applied: {Raised} +1, {Lowered} −1." |
| Segunda tentativa | "You've already made your adjustment, and it can be made only once. To change it, undo the current one first." |
| Desfeito (oculto) | "Adjustment undone." |
| +1 pendente | "+1 to one attribute" · "From {Ancestry}. Choosing it here isn't available yet. It stays in Open decisions, and your scores don't include it until then." |
| Card de características | "Characteristics" · "Calculated from your attributes. They update when your scores change." |
| Linha de fórmula | "{fórmula}" · ", minimum {limite}" · ", maximum {limite}" · "{referência} ({valor})" · "Fixed" |
| Nome acessível da característica | "{Characteristic} {value}" · pendente: "{Characteristic}, open" |
| Next | "Next: Story" |

**Composição:** "Score adjustment" · "Capped at {limite}" · "Raised to minimum {limite}", mais os da FEAT-007 ("{Ancestry} starting score", "{Ancestry}: {fórmula}", "Standard rule: {fórmula}", "HOW THIS IS CALCULATED").

**Rótulo de pendência** (acréscimo à tabela da FEAT-007; o ajuste nunca é pendência, então só aparece onde o título da vaga é pedido): `attribute-shift` → "Score adjustment".

**Provisório:** nesta etapa, nenhum. O provisório da FEAT-007 continua em Story a Review.

## Escalações e pendências

- **E5. `segmented-control` com 4 segmentos em tela estreita** (proposta de emenda ao `design.md` §4, Formulários, pela ux-foundations; não editado aqui):
  - **O que falta:** o componente é "grupo de 2 a 4 botões unidos", sem regra para quando não cabe. Os quatro nomes de atributo, com o padding de segmento da FEAT-007 (`--space-4`), dão cerca de 300 px; a `subdecision` no celular tem cerca de 296 px de área útil a 360 px e 256 px no reflow de 320 px.
  - **Proposta:** "Quando os segmentos não cabem numa linha, o grupo vira uma grade de 2 colunas de largura igual, com os mesmos divisores internos (`--border-width-default` `--color-border-control`), a mesma ordem de leitura e as mesmas setas."
  - **Telas:** SCR-WEB-005. Até a emenda, a entrada do manifesto fica `escalation-pending`; o desktop e o intermediário não dependem dela.
- **Para revisão do usuário:** a ordem das subdecisões (subir antes de descer), registrada nas Decisões.
- **Fora desta feature:** controle do +1 (FEAT-016), atributos rolados e o botão de rolar desabilitado do wireframe (P14b; o MVP não tem regra opcional que os ligue), ajuste manual (FEAT-019), limpar o Size na Ancestry (FEAT-011).
- **RTM:** sem mudança, a pedido do usuário. A Design ref das FRs da FEAT-008 continua apontando o `technical-design.md`.
