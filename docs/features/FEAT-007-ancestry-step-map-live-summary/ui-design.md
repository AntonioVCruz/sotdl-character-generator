# UI Design: FEAT-007 — Etapa Ancestry, mapa de etapas e resumo vivo

> Feature de: `docs/implementation-plan.md` · Par com: `technical-design.md`
> Telas: SCR-WEB-003, SCR-WEB-016 · Modo: por feature, com rigor de âncora (primeira execução; não houve telas-âncora) · Status: Verified (re-verificação após a emenda E1–E4 do design system, 2026-11-12) · Data: 2026-11-12

Autoridade: `docs/design.md` e `docs/tokens.json`. Todo valor visual abaixo é token (`--…`) ou classe `.typography-*`; os breakpoints são `@custom-media` (`--bp-md`, `--bp-below-md`, `--bp-xl`, `--bp-below-xl`). Ícones: Lucide (`design.md` §2), traço `--icon-stroke`, decorativos com `aria-hidden`. Texto da interface em inglês (NFR-L10N-001), fechado na seção [Textos](#textos). Nenhum texto dos livros (P22).

## SCR-WEB-003 — Ancestry step

- **Estratégia e fonte:** code-native; esta seção é o design.
- **Composição:** a moldura do construtor ([Builder frame](#builder-frame)) com o corpo da etapa Ancestry:
  1. `step-header`;
  2. alertas da etapa (`inline-alert`);
  3. grade de `option-card` (radiogroup);
  4. card de detalhe da ancestralidade selecionada, com prévia, confirmação, `subdecision` de Size e pendências concedidas;
  5. barra de navegação (Back e Next).
- **Dados** (technical-design §3.2–§3.4):

| Elemento | Fonte |
| :-- | :-- |
| Eyebrow, regime, contadores | `view.steps[i]` (`index`, `regime`, `decided`, `open`, `total`) + `steps.length` |
| Linha de regra | texto do app por id de etapa; selo `rules` procedência do `step:ancestry` (`abbr`, `page`) |
| Cartões | `view.slots` da vaga `ancestry` (`kind: choose-entity`) → `options[]`: `id`, `name`, `mechanics[]`, procedência (`abbr`, `page`, `type`) |
| Escolha atual | `slot.value` da vaga `ancestry` |
| Detalhe | `engine.ancestryDetail(rules, id)` |
| Prévia | `engine.preview(rules, document, 'ancestry', id).changes` |
| Confirmar | `session.decide('ancestry', id)` → `DecideResult` |
| Size | vaga `ancestry=<x>/size` (`choose-value`, `options`) → `session.decide(key, n)` |
| Pendências concedidas | `ancestryDetail` (concessões) + `view.slots` (`stepId`, `decided`) |

- **Conformidade:** conforme ao `design.md` emendado (E1–E4, 2026-11-12). Sem valor solto nem variante local.

### default

Nenhuma ancestralidade escolhida (personagem novo).

1. **`step-header`** (card):
   - eyebrow `STEP 1 OF 8 · CHOICE` (`.typography-eyebrow`, `--color-accent-default`), com a marca de identidade acima: linha de largura `--space-8` e espessura `--border-width-selected` em `--color-accent-default`;
   - `h1` com a pergunta (`.typography-display`);
   - linha de regra em `.typography-body` `--color-text-secondary` com `source-badge` `CORE p.9`;
   - contadores em `pill-counter` (altura `--size-pill`), os dois pendentes (tracejados): `Chosen 0 of 1` e `1 open`.
2. **Grade de `option-card`:**
   - `RadioGroup` do React Aria, rótulo acessível = a pergunta;
   - grade com `auto-fill` e mínimo de coluna `--size-summary`, gap `--space-3`;
   - cada cartão: nome (`.typography-title-sm`), linha de mecânica (`.typography-meta`, partes unidas por " · ") e selos (`source-badge` `CORE p.17`, `type-badge` `Core`);
   - ordem: a do pacote;
   - nada selecionado, e nenhum card de detalhe.
3. **Navegação** (rodapé da coluna da etapa, `--space-6` acima):
   - Back não aparece na primeira etapa;
   - `button-primary` "Next: Attributes" desabilitado (estado disabled do `design.md` §4: `--opacity-disabled`), com o motivo visível em `.typography-meta` ao lado: "Choose an ancestry first." (P31);
   - o botão desabilitado aponta para esse texto por `aria-describedby`.

### selected

O jogador seleciona um cartão (clique ou setas), sem decidir ainda.

- O cartão fica marcado em prévia (`aria-checked`, borda `--border-width-selected` `--color-border-strong`; `design.md` §4, `option-card`). Se já existe escolha atual em outro cartão, aquele cartão mantém só o rótulo "Your choice", sem borda de seleção: prévia e escolha atual nunca têm o mesmo tratamento.
- Abaixo da grade aparece o **card de detalhe** (`card`, `--space-5` de padding):
  - **cabeçalho:**
    - nome em `.typography-heading`;
    - à direita, os selos;
    - abaixo, "Description: " + `source-badge` `CORE p.11` em `.typography-meta`;
  - **blocos em três colunas** (≥ `--bp-xl`; uma coluna abaixo), cada um com `eyebrow` em `--color-text-secondary` e corpo em `.typography-body`:
    - `STARTING ATTRIBUTES`: "Strength 10, Agility 9, Intellect 10, Will 10";
    - `CHARACTERISTICS`: as fórmulas e valores de `ancestryDetail`, uma por linha ("Health = Strength + 4", "Speed 8");
    - `LANGUAGES AND PROFESSIONS`: idiomas com o que se faz ("Dwarfish: speak, read, write"). No Human, a pendência: "One extra language or a random profession, chosen in Professions & languages.";
    - `TALENTS`: nomes com `source-badge`;
    - `LEVEL 4`: a linha gerada ("Health +6; one spell or Shake it Off");
  - **prévia** (FR-FLOW-014):
    - caixa `--color-background-sunken`, `--radius-md`, padding `--space-3`;
    - eyebrow `IF YOU CHOOSE DWARF`;
    - linhas em `.typography-meta` com o valor em `.typography-badge` alinhado à direita: "Health — → 14", "Agility — → 9"; estados de etapa: "Attributes: Locked → Not started";
    - mais de 6 linhas de etapa viram uma só: "Opens the other 7 steps";
  - **ação:** `button-primary` "Choose Dwarf", alinhado à direita do card.
- Ao confirmar:
  - o snapshot muda antes de gravar (technical-design §3.2);
  - o foco vai para o título do card de detalhe (`tabindex="-1"`);
  - o resumo anuncia a mudança em `aria-live="polite"` (`design.md` §5).

### chosen

Ancestralidade decidida.

- Cartão escolhido: estado `current` (`design.md` §4, `option-card`):
  - rótulo "Your choice" no canto superior, em `.typography-caption` semibold, fundo `--color-background-sunken`, `--radius-sm`, padding `--space-0-5` `--space-1-5`, com o ícone `check` (`--size-icon-sm`, `aria-hidden`) antes do texto;
  - borda padrão (`--border-width-default` `--color-border-divider`), nunca a de seleção;
  - nome acessível "Dwarf, your choice";
  - ele também é a opção marcada do radiogroup e, nesse caso, vale só o tratamento `current`.
- Detalhe da escolhida: sem prévia nem botão "Choose". No lugar entra o bloco **Decide now**, separado por divisor `--color-border-divider`:
  - título `Decide now` em `.typography-label`, mais `.typography-meta` "You can also leave these for later.";
  - **Size** (só Human): `subdecision` com `segmented-control` de 2 segmentos (`1/2`, `1`) e o rodapé "Or decide later: it stays in Open decisions."; ver [size-open](#size-open) e [size-decided](#size-decided);
  - **pendências de outras etapas** (Human): uma linha por concessão, rótulo em `.typography-label` + "Chosen in Attributes." em `.typography-meta` + `link` "Go to Attributes" (rota da etapa com `?slot=`);
  - **Dwarf:** sem concessões nesta feature, então não há bloco Decide now.
- Contadores do cabeçalho:
  - Dwarf: `Chosen 1 of 1` preenchido;
  - Human com Size em aberto: `Chosen 1 of 2` pendente e `1 open`. Os contadores contam só as vagas desta etapa; as do Human em outras etapas aparecem nelas.
- Next habilitado: "Next: Attributes".
- Trocar de ancestralidade: selecionar outro cartão mostra o detalhe dele com prévia e "Choose Human" (estado `selected`), enquanto o cartão atual mantém "Your choice".

### size-open

- `subdecision` com borda tracejada `--border-width-default` `--color-border-control`, `--radius-md`, padding `--space-3` `--space-4`.
- Pergunta "Size" em `.typography-label` e `segmented-control` sem segmento ativo.
- `id` do elemento derivado da chave da vaga, para o atalho `?slot=` focar nele.

### size-decided

- `segmented-control` com o segmento escolhido (`--color-action-selected`, texto `--color-text-inverse`).
- A borda tracejada passa a sólida `--color-border-divider`; o rodapé some e entra "Decided." em `.typography-meta`.
- Mudar o segmento decide de novo; Size não tem dependentes.

### dependents-blocked

`decide` devolveu `has-dependents` (technical-design D8). Exemplo: Human com Size decidido, jogador confirma Dwarf.

- `inline-alert` warning (ícone `triangle-alert`, `--size-icon-md`, `aria-hidden`; borda esquerda `--border-width-alert`) no topo do corpo da etapa, abaixo do `step-header`, com `role="status"`. Texto em [Textos](#textos), nomeando cada escolha dependente pelo rótulo da vaga e pela ancestralidade de origem.
- Nada muda na escolha: o cartão atual continua "Your choice", e a seleção volta para ele.
- O alerta some na próxima ação do jogador nesta etapa. É warning, não danger: nada deu errado.

### save-failed

`snapshot.save === 'failed'` (FR-CHAR-010).

- `inline-alert` danger (ícone `circle-alert`, `--size-icon-md`, `aria-hidden`; borda esquerda `--border-width-alert`) fixo no topo do corpo da etapa, `role="alert"`, com o texto de [Textos](#textos) e `button-secondary` "Try again", que chama `session.retrySave()`.
- Durante a nova tentativa, o botão fica em loading (`design.md` §4: spinner de `--size-icon-sm`).
- O estado novo continua na tela; o alerta some quando `save` volta a `'saved'`.

### loading

`snapshot.status === 'loading'`.

- A moldura aparece com esqueletos (`design.md` §4, loading):
  - mapa: 8 linhas `--color-background-sunken` de altura `--size-control`;
  - cabeçalho: um bloco;
  - grade: 2 cartões;
  - resumo: 4 mini-cartões.
- `aria-busy="true"` na região principal e o texto visualmente oculto "Loading character…". Sem spinner.

### error

`snapshot.status === 'error'`: as quatro razões de `open` (technical-design §3.2).

- Sem mapa nem resumo: no lugar da moldura, um card centrado com largura máxima `--size-prose-max`, `inline-alert` danger com o texto da razão (ver [Textos](#textos)) e, abaixo, `link` "Back to My characters".
- O `h1` da tela é "Can't open this character" (`.typography-display`).
- Nunca fica em "Loading…".

- **Notas responsivas:**
  - de `--bp-md` a `--bp-below-xl`, o mapa vira o seletor de etapas do SCR-WEB-016 no topo, com etapa e resumo em duas colunas;
  - abaixo de `--bp-md`, vale o SCR-WEB-016;
  - os detalhes vão para uma coluna abaixo de `--bp-xl`.
- **Decisões:**
  - **Selecionar mostra o detalhe abaixo da grade, não num diálogo.** Motivo: wireframe SCR-03 e UC-003 2–3 (comparar olhando a grade). Alternativa rejeitada: diálogo, que esconde a grade e quebra a comparação.
  - **"Choose {Ancestry}" no card de detalhe, não no cartão.** Motivo: FR-FLOW-014 (ver o que muda antes de confirmar).

## SCR-WEB-016 — Builder mobile layout

- **Estratégia e fonte:** code-native; esta seção é o design. Vale para toda etapa abaixo de `--bp-md`; o corpo da etapa é o do SCR da etapa (aqui, o SCR-WEB-003) em uma coluna.
- **Composição:**
  1. `app-header` móvel;
  2. seletor de etapas (gatilho + `step-map` num popover);
  3. corpo da etapa em tela cheia;
  4. região fixa no rodapé: Back e Next, e abaixo deles a barra de resumo recolhível (`design.md` §3).
- **Dados:** os mesmos da moldura e do SCR-WEB-003. Barra: `view.summary.attributes`. Painel: `live-summary` e `open-decisions` completos.
- **Conformidade:** conforme ao `design.md` emendado (E1–E4, 2026-11-12). Sem valor solto nem variante local.

### collapsed

O estado padrão abaixo de `--bp-md`.

- **`app-header` móvel:**
  - altura `--size-header-mobile`, fundo `--color-background-subtle`, borda inferior `--color-border-divider`;
  - à esquerda, botão só de ícone para voltar à Home: ícone `arrow-left` (`--size-icon-md`, `aria-hidden`), `aria-label` "Back to My characters"; depois, o nome ("Unnamed character" em `.typography-title-sm`) e, abaixo, "Dwarf · Level 0" em `.typography-meta`;
  - à direita, `button-secondary` só de ícone: ícone `ellipsis` (`--size-icon-md`, `aria-hidden`), `aria-label` "More". Abre um menu com "About", que no celular mora aqui (`design.md` §3, FR-HELP-001);
  - alvos de `--size-touch-target` em ponteiro grosso.
- **Seletor de etapas:**
  - faixa logo abaixo do cabeçalho, fundo `--color-background-surface`, borda inferior `--color-border-divider`, padding `--space-2` `--space-4`;
  - botão de largura total com eyebrow `STEP 1 OF 8` e, abaixo, o nome da etapa atual em `.typography-title-sm`; à direita, o estado ("2 open" em `.typography-meta`) e o indicador de abrir, ícone `chevron-down` (`--size-icon-sm`, `aria-hidden`), que vira `chevron-up` com o popover aberto;
  - `aria-expanded`, `aria-haspopup="dialog"`.
- **Corpo:**
  - padding lateral `--space-4`;
  - `step-header` sem card (direto sobre a página, como no wireframe), `h1` em `--font-size-display-mobile` (regra de `design.md` §4, Variantes);
  - cartões em uma coluna; detalhe em uma coluna.
- **Região fixa:**
  - fundo `--color-background-surface`, borda superior `--color-border-divider`, padding `--space-3` `--space-4`;
  - linha 1: `button-secondary` "Back" e `button-primary` "Next: {step}", lado a lado, com o primário ocupando o resto;
  - linha 2: a barra de resumo, com os quatro atributos (nome em `.typography-caption`, valor em `.typography-title-sm` tabular) e o gatilho "Summary" com o ícone `chevron-up` (`--size-icon-sm`, `aria-hidden`) e `aria-expanded="false"`;
  - o corpo reserva no fim o espaço da altura medida da região, para nada ficar escondido atrás dela.

### selector-open

- Popover ancorado no seletor, largura total, sombra `--shadow-overlay`, `--radius-lg`, com o `step-map` completo (estados iguais aos da moldura).
- Foco no item atual; Esc ou toque fora fecha, e o foco volta ao gatilho.
- Etapa bloqueada não é selecionável, mostra "Locked", e o motivo aparece uma vez abaixo da lista, como na moldura.

### summary-open

- O gatilho mostra `aria-expanded="true"`, e o ícone vira `chevron-down`.
- O painel se abre para cima, entre o cabeçalho e a região fixa, com rolagem própria e fundo `--color-background-page`.
- O painel traz o `live-summary` completo (com composição, ver [Builder frame](#builder-frame)) e o `open-decisions`.
- Abre e fecha em `--duration-normal`, sem deslocamento com `prefers-reduced-motion: reduce`.
- Um atalho de Open decisions fecha o painel e navega.

- **Notas responsivas:** de `--bp-md` para cima, nada desta tela; vale a moldura. Reflow a 320 CSS px sem rolagem horizontal (`design.md` §5).
- **Decisões:**
  - **Back e Next acima da barra de resumo.** Motivo: o `design.md` §3 manda assim, e a imagem do wireframe mostra o contrário. O `design.md` prevalece sobre o wireframe (CLAUDE.md, Fonte da verdade).

## Builder frame

Moldura comum às etapas do construtor. A FEAT-007 a cria; as features das outras etapas reaproveitam.

**Regiões e landmarks** (`design.md` §5): `header` (`app-header`), `nav` (mapa, rótulo "Creation steps"), `main` (etapa), `aside` (resumo, rótulo "Summary") e `footer` (rodapé da página), irmãos entre si. O `aside` nunca fica dentro do `main`. Ordem de foco: cabeçalho → mapa → etapa → resumo. Desktop (≥ `--bp-xl`): mapa `--size-step-map` | etapa flexível (texto até `--size-prose-max`) | resumo `--size-summary`, fixo ao rolar; gutter `--space-6`; conteúdo até `--size-content-max`.

**`app-header`** (desktop):
- à esquerda, a marca "SotDL Generator" (link para a Home) e o contexto "Unnamed character · Dwarf · Level 0" em `.typography-meta`, sem ancestralidade enquanto não houver escolha;
- à direita, nesta feature, nada: as ações Sources, Log e Preview sheet entram com as features delas (FEAT-004, 020, 018);
- About não fica no cabeçalho (`design.md` §3).

**Rodapé da página** (desktop e intermediário, ≥ `--bp-md`): `footer` abaixo do conteúdo, borda superior `--color-border-divider`, padding `--space-4` `--space-6`, com o `link` "About" em `.typography-meta` (FR-HELP-001). Abaixo de `--bp-md`, o About fica no menu "···" do SCR-WEB-016, e o rodapé não aparece.

**`step-map`:**
- eyebrow `LEVEL 0 · CREATION`; lista ordenada de links "1. Ancestry", com o estado à direita em `.typography-meta`:

| Estado (`status`) | Texto | Visual |
| :-- | :-- | :-- |
| `done` | "Done" | padrão |
| `open` | "{n} open" | padrão |
| `not-started` | "Not started" | padrão |
| `optional` | "Optional" | padrão |
| `locked` | "Locked" | texto `--color-text-muted`, sem link e sem foco; nome acessível "{n}. {Step}, locked. {motivo}"; sem tooltip (`design.md` §4, `step-map`) |
| atual | o estado da etapa | fundo `--color-action-selected`, texto `--color-text-inverse`, barra à esquerda de `--border-width-indicator` em `--color-accent-default`, `aria-current="step"` |

- Abaixo da lista, quando houver etapa bloqueada, o motivo uma vez em `.typography-caption` `--color-text-secondary`: "Choose an ancestry first to open the other steps."

**`live-summary`** (card, `aria-live="polite"` só no texto anunciado, não no card inteiro):
- **eyebrow** `LIVE SUMMARY`;
- **quatro mini-cartões de atributo** em grade de 4 (gap `--space-2`; borda `--color-border-divider`, `--radius-md`):
  - rótulo em `.typography-caption`;
  - valor em `.typography-stat-sm`, com `font-variant-numeric: tabular-nums` (`design.md` §2);
  - modificador em `.typography-caption` ("+0", "−1"; sinal de menos tipográfico);
- **características** em duas colunas: nome em `.typography-meta`, valor semibold tabular à direita;
- **pendente:** o valor mostra "—" e, abaixo do nome, um `pill-counter` pendente (altura `--size-pill`, borda tracejada `--color-border-control`) com "Open";
- **sem ancestralidade:** os atributos com "—" e a frase "Choose an ancestry to see your scores." em `.typography-meta`;
- **composição** (FR-FLOW-012; P11, `design.md` §7):
  - cada linha de atributo e de característica é um gatilho de Disclosure (React Aria), com `aria-expanded` e o ícone `chevron-down` (`--size-icon-sm`, `aria-hidden`), que vira `chevron-up` quando aberto;
  - aberto, mostra o `value-composition` com eyebrow `HOW THIS IS CALCULATED`;
  - uma linha por estágio, origem à esquerda (`.typography-meta`) e valor à direita (`.typography-badge` tabular): "Dwarf: Strength + 4" → 14, ou "Standard rule: Health / 4, rounded down" → 3;
  - linha de total com divisor acima: "Health" → 14;
  - atributo: "Dwarf starting score" → 9;
  - pendente: "Human: Size, open" → "—";
- **ganhos** abaixo: `GAINED SO FAR`, idiomas e talentos em `.typography-meta`.

**`open-decisions`** (card abaixo do resumo):
- eyebrow `OPEN DECISIONS · {n}`;
- cada pendência é um `link` em caixa tracejada `--color-border-control`, `--radius-md`, padding `--space-3`: título em `.typography-label` e, abaixo, onde se resolve em `.typography-meta` ("Ancestry · Human");
- o atalho navega para `#/characters/:id/:step?slot=<key>`; a etapa abre, rola até o elemento da vaga e põe o foco nele (FR-FLOW-011);
- vazio: "Nothing open right now." em `.typography-meta`.

**Etapa sem tela própria ainda** (Attributes a Review, até as features delas):
- `step-header` com os textos de fallback e corpo com as pendências concedidas desta etapa, cada uma em caixa tracejada (forma do `subdecision`): rótulo em `.typography-label` + "You can't make this choice here yet. It stays in Open decisions." em `.typography-meta`. **Texto provisório:** a feature de cada etapa (FEAT-008, 009, 012 a 016) o retira quando a etapa ganhar tela própria;
- sem pendências: "There's nothing to decide in this step yet."

**Back e Next:**
- Back: `button-secondary` "Back", ausente na primeira etapa;
- Next: `button-primary` "Next: {próxima etapa}", desabilitado com motivo visível quando a próxima está bloqueada;
- última etapa: sem Next nesta feature (o Review é da FEAT-015).

**Teclado:** grade de cartões e `segmented-control` com setas (radiogroup); mapa como lista de links; Disclosure com Enter e Espaço; popover e menu com Esc.

## Textos

Fechados para a FEAT-007, revisados contra a NFR-USE-001, a lição 5 e o `design.md` §6 (o que aconteceu, o que ficou a salvo, o que fazer). Nenhum id, enum ou nome de vaga aparece na tela. Os rascunhos do technical-design ficam lá; vale esta tabela.

**Etapa Ancestry**

| Onde | Texto |
| :-- | :-- |
| Eyebrow | "STEP 1 OF 8 · CHOICE" |
| Pergunta (`h1`) | "What is your character's ancestry?" |
| Linha de regra | "Choose one ancestry. It sets your starting attributes, characteristics, languages and talents." + `CORE p.9` |
| Contadores | "Chosen {d} of {t}" · "{n} open" |
| Detalhe | "Description: " + selo · "IF YOU CHOOSE {NAME}" · "Choose {Name}" · "Your choice" |
| Nome acessível do cartão | "{Name}" · escolha atual: "{Name}, your choice" |
| Decide now | "Decide now" · "You can also leave these for later." · "Or decide later: it stays in Open decisions." · "Decided." |
| Pendência em outra etapa | "Chosen in {Step}." · "Go to {Step}" |
| Next bloqueado | "Choose an ancestry first." |

**Fallback por etapa** (sem texto próprio no app, technical-design §3.4)

| Onde | Regra | Exemplo |
| :-- | :-- | :-- |
| Pergunta | `choose-entity` → "Choose your {entity label}"; sem vaga raiz → "{Step name}" | "Choose your ancestry" · "Attributes" |
| Linha de regra | "The rules for this step are in your book." + selo; sem página, não aparece | `CORE p.10` |
| Motivo de bloqueio | Ancestry: "Choose an ancestry first."; demais: "Finish {Step name} first." | — |
| Mapa, nota única | "{motivo sem ponto final} to open the other steps." | "Choose an ancestry first to open the other steps." |

**Rótulos de tipo de entidade** (nunca o prefixo do id): ancestry → "ancestry"; attribute → "attribute"; characteristic → "characteristic"; talent → "talent"; language → "language"; step → "step". Maiúscula inicial quando abre frase ou título.

**Rótulos de regime** (nunca o valor do enum):

| Regime | Rótulo |
| :-- | :-- |
| `choice` | "Choice" |
| `roll-or-choose` | "Roll, choose or write your own" |
| `roll` | "Roll" |
| `derived` | "Calculated" |
| `free` | "Write your own" |

**Rótulos de pendência** (por `kind` de vaga; título · onde se resolve)

| `kind` | Título | Onde |
| :-- | :-- | :-- |
| `choose-entity` (ancestry) | "Ancestry" | "{Step}" |
| `choose-value` | "{nome do alvo}" (ex.: "Size") | "{Step} · {origem}" |
| `attribute-increase` | "+1 to one attribute" | "{Step} · {origem}" |
| `language-or-profession` | "Extra language or profession" | "{Step} · {origem}" |

**Estados do mapa:** "Done" · "{n} open" · "Not started" · "Optional" · "Locked".

**Resumo:** "LIVE SUMMARY" · "Choose an ancestry to see your scores." · "Open" · "HOW THIS IS CALCULATED" · "{Ancestry}: {fórmula}" · "Standard rule: {fórmula}" · "{Ancestry} starting score" · "GAINED SO FAR" · "OPEN DECISIONS · {n}" · "Nothing open right now."

**Mensagens**

| Caso | Texto |
| :-- | :-- |
| `storage-unavailable` | "This browser didn't let the generator read your saved characters. Nothing was changed. Reload the page to try again. If it keeps happening, check that this site is allowed to store data." |
| `not-found` | "This character isn't saved in this browser. It may have been deleted, or created in another browser." |
| `unreadable` | "This character was saved by an earlier version of the generator and can't be opened. Your other characters aren't affected." |
| `pack-load-failed` | "The rules this character uses couldn't be loaded. Nothing was changed. Check your connection and reload the page." |
| Título dos erros de abertura | "Can't open this character" · link "Back to My characters" |
| `save: 'failed'` | "Your last choice wasn't saved. It's still on screen, but it will be lost if you close this page." · botão "Try again" |
| `has-dependents` | "You can't switch to {New} yet: {escolhas} for {Current} depend on your current ancestry. Changing a choice that others depend on isn't available yet." |
| Exemplo do `has-dependents` | "You can't switch to Dwarf yet: your Size choice for Human depends on your current ancestry. Changing a choice that others depend on isn't available yet." |
| Loading (oculto) | "Loading character…" |

Regra do `{escolhas}`: "your {título} choice"; com duas, "your {a} and {b} choices"; e o verbo concorda ("depends" ou "depend").

**Celular:** "Back to My characters" (`aria-label`) · "More" (`aria-label`) · "STEP {i} OF {n}" · "Summary".

**Provisório:** "You can't make this choice here yet. It stays in Open decisions." (etapa sem tela própria) sai com a feature de cada etapa.

**Abertos:** nenhum texto desta feature. As perguntas próprias das etapas 2 a 8 ficam com as features delas; até lá vale o fallback.

## Decisões entre telas

- **A moldura é única e responsiva.** O SCR-WEB-016 é a variante dela abaixo de `--bp-md`, não outra árvore de componentes: o mesmo `step-map` serve o mapa e o popover, e o mesmo `live-summary` serve a coluna e o painel.
- **Número de etapas vem do procedimento.** "STEP 1 OF 8" usa `view.steps.length`; nada fixo em 8.
- **Frações em todo lugar como "1/2".** Motivo: `formatFormula` já entrega "1/2", e o livro escreve assim; o segmento de Size usa o mesmo texto. Alternativa rejeitada: "½" só na ui, que daria dois formatos para o mesmo valor.
- **Atributos com o nome inteiro**, nunca abreviados ("Intellect", não "Int"). Motivo: abreviar exigiria texto do app por id de atributo; os nomes cabem nos mini-cartões nas larguras do `design.md` §3.

## Escalações e pendências

Nenhuma escalação aberta. As quatro propostas do primeiro passe (E1 a E4) foram aprovadas e entraram no design system em 2026-11-12 (`docs/tokens.json` em `af0a2e5`, `docs/design.md` em `cb587a5`). As duas telas foram re-verificadas contra o `design.md` emendado:

- **E1. `step-map`, estado bloqueado:** "Locked" visível, motivo no nome acessível e uma vez em `caption` abaixo da lista, sem tooltip. Aplicada na moldura e no popover do celular.
- **E2. `option-card`, estado `current`:** rótulo "Your choice" com fundo `sunken` e ícone `check`, borda padrão, nome acessível "{Nome}, your choice". A borda de seleção fica só na prévia. Aplicada em `selected` e `chosen`.
- **E3. Ícones Lucide:**
  - `circle-alert` e `triangle-alert` nos alertas;
  - `chevron-down`/`chevron-up` no seletor, no Disclosure e no "Summary";
  - `arrow-left` e `ellipsis` no cabeçalho móvel;
  - `check` no rótulo "Your choice".

  A dependência `lucide-react` entra na implementação (T9).
- **E4. Tokens:** `--size-pill`, `--opacity-disabled`, `--border-width-alert`, `.typography-stat-sm`, `--size-icon-sm`/`--size-icon-md`, `--icon-stroke`, e o `button-primary` com padding `--space-4`.

Pendências:
- **About no rodapé:** o esqueleto põe o About no cabeçalho. A implementação o leva ao rodapé (desktop) e ao menu "···" (celular), conforme este documento.
- **Texto provisório:** "You can't make this choice here yet…" sai quando cada etapa ganhar tela própria.
- **Fora desta feature:** ações de cabeçalho (Sources, Log, Preview sheet), estado "Creating" e nome editável (FEAT-004, 020, 018, 001, 015).
