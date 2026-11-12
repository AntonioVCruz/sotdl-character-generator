# Design System: Gerador de personagens SotDL

> Fonte da verdade para toda implementação de interface, junto com `docs/tokens.json`.
> Gerado por ux-foundations · Modo: design file (wireframe v1 ingerido) + identidade A escolhida pelo usuário
> Última atualização: 2026-11-12 (emenda E1–E4 do ui-design da FEAT-007)

## 1. Tema visual e atmosfera

Sóbrio, sombrio, legível. A estrutura segue o wireframe v1 (e, por ele, o D&D Beyond): fundo neutro cor de pergaminho, conteúdo em cartões planos brancos, listas densas e organizadas. O clima de *Shadow of the Demon Lord* aparece só nas bordas (P33, D28): o vermelho-sangue em poucos pontos de identidade, a serifa de livro nas perguntas das etapas e nos títulos da ficha. Nada temático atrás de conteúdo denso. A confiança vem de mostrar sempre de onde vem cada regra (selo de fonte) e como cada número foi calculado (composição). Interface em inglês (P25).

## 2. Tokens

Valores derivados de `tokens.json`. Use sempre a variável, nunca o valor cru.

### Cores

| Papel | Token | Valor | Uso |
| :-- | :-- | :-- | :-- |
| Texto | `--color-text-default` | #1A1A18 | Títulos, corpo, valores |
| Texto secundário | `--color-text-secondary` | #4F4F4B | Rótulos, texto de apoio |
| Texto apagado | `--color-text-muted` | #65645E | Metadados, linha de origem, placeholder |
| Texto invertido | `--color-text-inverse` | #FFFFFF | Sobre preenchimento escuro ou vermelho |
| Fundo da página | `--color-background-page` | #F2EFE9 | Fundo do app |
| Superfície | `--color-background-surface` | #FFFFFF | Cartões, painéis, diálogos |
| Superfície suave | `--color-background-subtle` | #F7F6F2 | Barra do cabeçalho, blocos discretos |
| Superfície rebaixada | `--color-background-sunken` | #ECE9E2 | Caixa de composição, cartão aguardando, campo desabilitado |
| Divisor | `--color-border-divider` | #D4D4CF | Separadores e contorno de cartão; nunca a única borda de um controle |
| Borda de controle | `--color-border-control` | #85847E | Inputs, botões de contorno, caixas tracejadas de pendência |
| Borda forte | `--color-border-strong` | #1A1A18 | Cartão selecionado (2px), segmento ativo |
| Ação principal | `--color-action-primary` | #1A1A18 | Botão principal (Next, Roll, Apply) |
| Ação principal hover | `--color-action-primary-hover` | #33332F | Hover do botão principal |
| Selecionado | `--color-action-selected` | #1A1A18 | Segmento selecionado, etapa atual no mapa |
| Destaque | `--color-accent-default` | #8E1B1B | Linha e sobretítulo da etapa, marca, borda de "Rule triggered", perigo |
| Destaque hover | `--color-accent-hover` | #6F1414 | Hover de botão de perigo |
| Destaque suave | `--color-accent-tint` | #F6E7E5 | Fundo de alerta de perigo e de gatilho |
| Perigo | `--color-state-danger` | #8E1B1B | Erro, exclusão |
| Sucesso | `--color-state-success` | #2E6B30 | Salvo, importado |
| Sucesso suave | `--color-state-success-tint` | #E8F1E8 | Fundo de alerta de sucesso |
| Atenção | `--color-state-warning` | #8A5A00 | Aviso (ex.: dados só neste navegador) |
| Atenção suave | `--color-state-warning-tint` | #F7EEDA | Fundo de aviso |
| Foco | `--color-focus` | #1F5FBF | Anel de foco |
| Fundo de diálogo | `--color-overlay` | #1A1A1880 | Backdrop de diálogo |

O vermelho não é cor de ação comum: o botão principal é preto (como no wireframe). Vermelho em botão só para ação destrutiva ("Delete character").

**Contrastes conferidos (WCAG 2.2):**

| Par | Razão | Exigência |
| :-- | :-- | :-- |
| Texto #1A1A18 sobre página #F2EFE9 | 15,2:1 | 4,5:1 texto |
| Secundário #4F4F4B sobre rebaixado #ECE9E2 | 6,8:1 | 4,5:1 |
| Apagado #65645E sobre rebaixado #ECE9E2 | 4,9:1 | 4,5:1 (pior caso do apagado) |
| Branco sobre ação #1A1A18 / hover #33332F | 17,4:1 / 12,7:1 | 4,5:1 |
| Destaque #8E1B1B sobre branco / sobre suave #F6E7E5 | 9,0:1 / 7,5:1 | 4,5:1 |
| Sucesso #2E6B30 sobre #E8F1E8 | 5,6:1 | 4,5:1 |
| Atenção #8A5A00 sobre #F7EEDA | 5,1:1 | 4,5:1 |
| Borda de controle #85847E sobre branco / página | 3,8:1 / 3,3:1 | 3:1 componente |
| Foco #1F5FBF sobre branco / página | 6,1:1 / 5,3:1 | 3:1 componente |

### Tipografia

Famílias, todas servidas pelo próprio site (NFR-PRIV-001), licença OFL:
- **Display:** `Spectral`, Georgia, serif. Só em `display` e `heading`; nunca abaixo de 20px.
- **Corpo:** `Inter`, system-ui, sans-serif. Toda a interface.
- **Mono:** `IBM Plex Mono`, ui-monospace. Só em selos de fonte (`CORE p.17`) e notação de dado (`3d6`).

| Estilo | Família | Tamanho / altura | Peso | Uso |
| :-- | :-- | :-- | :-- | :-- |
| `display` | Spectral | 28 / 1.2 | 600 | Pergunta da etapa, título de página, nome na ficha |
| `heading` | Spectral | 22 / 1.2 | 600 | Título de seção da ficha, título de diálogo |
| `title` | Inter | 18 / 1.2 | 600 | Nome de cartão de destaque, nome da tabela |
| `title-sm` | Inter | 16 / 1.2 | 600 | Nome de cartão de opção, de campo fixo |
| `body-lg` | Inter | 16 / 1.45 | 400 | Texto de campos de formulário (evita zoom no iOS) |
| `body` | Inter | 14 / 1.45 | 400 | Corpo padrão |
| `label` | Inter | 14 / 1.2 | 500 | Botões, rótulos de campo |
| `meta` | Inter | 13 / 1.45 | 400 | Linha de origem, explicações curtas |
| `caption` | Inter | 12 / 1.45 | 400 | Notas de rodapé, modificador sob atributo |
| `eyebrow` | Inter | 12 / 1.2, maiúsculas, +0.06em | 600 | "STEP 3 OF 8 · …", "LIVE SUMMARY", "OPEN DECISIONS · 3" |
| `stat` | Inter, algarismos tabulares | 28 / 1.2 | 600 | Atributos e características |
| `stat-lg` | Inter, algarismos tabulares | 40 / 1.2 | 600 | Valor do cartão de rolagem |
| `stat-sm` | Inter, algarismos tabulares | 22 / 1.2 | 600 | Valor dos mini-cartões de atributo do resumo vivo |
| `badge` | IBM Plex Mono | 12 / 1.2 | 500 | Selo de fonte, notação de dado |

Números de atributo, característica e dado usam `font-variant-numeric: tabular-nums`.

### Espaçamento, raio, borda, elevação, movimento

- **Espaço:** 2, 4, 6, 8, 12, 16, 20, 24, 32, 48 px (`--space-0-5` … `--space-12`). Entre seções: 24. Entre cartões numa pilha: 12. Padding de cartão: 16 (celular) e 20 (desktop). Dentro de um componente: 8 a 12.
- **Raio:** 4 (selos, chips), 6 (botões, inputs, segmentos), 8 (cartões, diálogos), 999 (pílulas de contador).
- **Borda:** 1px padrão; 2px para selecionado e anel de foco; 3px na barra da etapa atual; 4px na borda esquerda do `inline-alert`.
- **Opacidade:** 0.45 em controle desabilitado (`--opacity-disabled`), sempre com o motivo em texto quando ele existir.
- **Ícones:** Lucide, traço 1.5 (`--icon-stroke`), em 16px (`--size-icon-sm`: controles, selos, texto corrido, spinner de botão) e 20px (`--size-icon-md`: cabeçalhos e alertas). Ícone decorativo leva `aria-hidden`, e todo controle tem rótulo: em texto visível ou, nos botões só de ícone (voltar e "···" do cabeçalho móvel), como nome acessível (`aria-label`). Informação nunca depende só do ícone.
- **Elevação:** cartões são planos (só borda). Sombra `overlay` (0 8px 24px #1A1A182E) só em diálogo, popover e menu.
- **Movimento:** 120ms para hover e foco, 200ms para abrir painel ou diálogo, `ease-out`. Com `prefers-reduced-motion: reduce`, sem transições de deslocamento.

```css
:root {
  --color-text-default: #1A1A18;
  --color-text-secondary: #4F4F4B;
  --color-text-muted: #65645E;
  --color-text-inverse: #FFFFFF;
  --color-background-page: #F2EFE9;
  --color-background-surface: #FFFFFF;
  --color-background-subtle: #F7F6F2;
  --color-background-sunken: #ECE9E2;
  --color-border-divider: #D4D4CF;
  --color-border-control: #85847E;
  --color-border-strong: #1A1A18;
  --color-action-primary: #1A1A18;
  --color-action-primary-hover: #33332F;
  --color-action-selected: #1A1A18;
  --color-accent-default: #8E1B1B;
  --color-accent-hover: #6F1414;
  --color-accent-tint: #F6E7E5;
  --color-state-danger: #8E1B1B;
  --color-state-danger-tint: #F6E7E5;
  --color-state-success: #2E6B30;
  --color-state-success-tint: #E8F1E8;
  --color-state-warning: #8A5A00;
  --color-state-warning-tint: #F7EEDA;
  --color-focus: #1F5FBF;
  --color-overlay: #1A1A1880;

  --font-family-display: "Spectral", Georgia, serif;
  --font-family-body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-family-mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 22px;
  --font-size-3xl: 28px;
  --font-size-4xl: 40px;
  --font-size-display-mobile: 24px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-line-height-tight: 1.2;
  --font-line-height-normal: 1.45;
  --font-letter-spacing-eyebrow: 0.06em;

  --space-0-5: 2px;
  --space-1: 4px;
  --space-1-5: 6px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-pill: 999px;
  --border-width-default: 1px;
  --border-width-selected: 2px;
  --border-width-focus: 2px;
  --border-width-indicator: 3px;
  --border-width-alert: 4px;
  --shadow-overlay: 0 8px 24px #1A1A182E;
  --duration-fast: 120ms;
  --duration-normal: 200ms;

  --size-control: 40px;
  --size-control-sm: 32px;
  --size-touch-target: 44px;
  --size-step-map: 232px;
  --size-summary: 280px;
  --size-content-max: 1440px;
  --size-prose-max: 72ch;
  --size-dialog-max: 760px;
  --size-header: 64px;
  --size-header-mobile: 56px;
  --size-sheet-aside: 320px;
  --size-pill: 24px;
  --size-icon-sm: 16px;
  --size-icon-md: 20px;

  --opacity-disabled: 0.45;
  --icon-stroke: 1.5;
}
```

## 3. Layout e grade

- **Breakpoints:** `< 768px` celular; `768–1279px` intermediário; `≥ 1280px` desktop. Largura mínima suportada: 360px (NFR-COMP-002), sem rolagem horizontal.
- **Cabeçalho do app:** altura `--size-header` desktop, `--size-header-mobile` celular; fundo `subtle`, borda inferior `divider`. Esquerda: marca "SotDL Generator" (volta à Home) + contexto do personagem (nome · ancestralidade · nível · estado). Direita: ações da tela (`Sources: …`, `Log`, `Preview sheet` no construtor; `Edit sheet`, `Log`, `Export` na ficha). Link "About" sempre acessível: no rodapé da página no desktop, no menu "···" no celular (FR-HELP-001).
- **Construtor, desktop (≥ 1280):** três zonas (P32). Mapa de etapas 232px à esquerda; etapa ao centro, flexível, texto corrido limitado a 72ch; resumo vivo 280px à direita, fixo ao rolar. Gutter 24px. Conteúdo centralizado até 1440px.
- **Construtor, intermediário (768–1279):** mapa vira seletor no topo (como no celular); etapa e resumo em duas colunas (resumo 280px).
- **Construtor, celular (< 768):** etapa em tela cheia; seletor de etapa no topo ("Step 3 of 8 · Story · 2 open ▾"); resumo como barra recolhível no rodapé (quatro atributos + "Summary ▴"); Back e Next fixos no rodapé, acima da barra (SCR-WEB-016). Padding lateral 16px.
- **Ficha:** desktop em duas colunas (principal + coluna direita `--size-sheet-aside`); celular em coluna única, na ordem: cabeçalho, decisões abertas, atributos, características, talentos, equipamento e dinheiro, campos fixos (FR-SHEET-014).
- **Impressão:** ver componente `print-sheet` (§4).
- **Alvos:** 40px de altura em ponteiro fino (mínimo absoluto 24px, WCAG 2.5.8); 44px em ponteiro grosso (`@media (pointer: coarse)`).

## 4. Componentes

Base: React Aria Components (ADR-006) para todo controle interativo. Os estilos abaixo vestem esses componentes.

**Convenção de estados (vale para todo controle):**
- **hover:** muda o fundo ou a borda em 120ms.
- **focus-visible:** anel de 2px `--color-focus` com deslocamento de 2px. Nunca remover sem substituto.
- **active:** igual ao hover, mais escuro.
- **disabled:** opacidade `--opacity-disabled`, cursor `not-allowed`, com o motivo em texto quando ele existir (P31).
- **loading:** spinner de `--size-icon-sm` no lugar do ícone, com o rótulo mantido e `aria-busy`.
- **error:** borda `--color-state-danger` mais mensagem abaixo com ícone.

### Ações
- **`button-primary`:** fundo `--color-action-primary`, texto `inverse`, `label`, altura `--size-control`, padding 0 `--space-4`, raio `md`. Hover: `--color-action-primary-hover`. Uma por área de decisão (Next, Apply and continue, Roll 3d6).
- **`button-secondary`:** fundo `surface`, borda 1px `--color-border-control`, texto `default`. Hover: fundo `subtle`. Back, Log, Enter result, Reroll.
- **`button-danger`:** fundo `--color-state-danger`, texto `inverse`. Hover: `--color-accent-hover`. Só dentro de diálogo de confirmação destrutiva.
- **`button-dashed-add`:** largura total, borda 1px tracejada `control`, texto `secondary`, "+ Add …". Abre o formulário no lugar (D34).
- **`link`:** texto `default` sublinhado; hover sem sublinhado; usado em referências e atalhos ("Go to Story").

### Formulários
- **`text-input` / `textarea`:** altura 40px (input), fundo `surface`, borda 1px `control`, raio `md`, texto `body-lg` (16px). Rótulo `label` acima, ajuda `meta` abaixo. Erro: borda `danger` + mensagem `meta` em `danger` com ícone, ligada por `aria-describedby`.
- **`select`:** mesmo visual do input, com seta.
- **`checkbox`:** caixa 18px, borda `control`, marcado com fundo `action-primary` e visto branco. Rótulo à direita, área clicável inteira.
- **`segmented-control`:** grupo de 2 a 4 botões unidos, altura 40px, borda `control`; segmento selecionado com fundo `action-selected` e texto `inverse`. Usos: Roll / Choose / Write; Roll / Choose / Trade for a language. Semântica de radiogroup.
- **Validação:** ao confirmar, nunca ao digitar. Mensagem diz o que fazer ("Enter a value from 3 to 18").

### Retorno ao usuário
- **`dialog`:** largura até 760px, fundo `surface`, raio `lg`, sombra `overlay`, backdrop `overlay`. Título `heading`. Ações no rodapé: conservadora à esquerda (`button-secondary`), aplicar à direita (`button-primary` ou `button-danger`). Foco preso, Esc fecha como a ação conservadora.
- **`inline-alert`:** faixa com ícone (`--size-icon-md`), borda esquerda `--border-width-alert` da cor do estado, fundo tint do estado (danger, success, warning). Texto `body`. Não some sozinha.
- **`toast`:** canto inferior, 4s, só para confirmação sem ação ("Character file saved"). Anunciado por `aria-live="polite"`.
- **`loading`:** esqueleto com fundo `sunken` para listas e cartões; spinner só em botão.
- **Estados de vista de dados:** vazio = frase do que é aquilo + a ação que preenche; carregando = esqueleto; erro = `inline-alert` danger com o que aconteceu, o que fica preservado e o que tentar.

### Estrutura
- **`card`:** fundo `surface`, borda 1px `divider`, raio `lg`, padding 20px (16px no celular). Plano.
- **`pill-counter`:** raio `pill`, `caption` semibold, altura `--size-pill`. Concluído: fundo `action-selected`, texto `inverse` ("5 of 6 decided"). Pendente: borda 1px tracejada `control`, texto `default` ("1 follow-up choice").
- **`eyebrow`:** estilo `eyebrow` em `text-secondary`.

### Componentes do domínio

- **`app-header`:** ver §3. As ações de cabeçalho são `button-secondary`; a principal do contexto (ex.: "Level up to N", fora do MVP) é `button-primary`.
- **`step-map`:** lista numerada ("1. Ancestry"), cada item com o nome à esquerda e o estado à direita em `meta` ("Done", "2 open", "Not started", "Optional"). Atual: fundo `action-selected`, texto `inverse`, mais uma barra de `--border-width-indicator` `--color-accent-default` à esquerda. Bloqueado: texto `muted`, sem ação, estado visível "Locked" no lugar do estado; o motivo vai no nome acessível do item ("2. Attributes, locked. Choose an ancestry first.") e aparece uma vez em `caption` abaixo da lista ("Choose an ancestry first to open the other steps."). Sem tooltip: o item bloqueado não recebe foco, e o motivo precisa ser visível por teclado e toque (P31). Nota de etapas substituídas em `caption` (Should). Navegável por teclado como lista de links.
- **`step-header`:** card. Sobretítulo `eyebrow` em `--color-accent-default` ("STEP 3 OF 8 · ROLL, CHOOSE OR WRITE YOUR OWN") com linha de 2px vermelha de 32px acima; pergunta em `display`; linha de regra em `body` `secondary` com `source-badge`; contadores em `pill-counter`.
- **`source-badge`:** `badge` (mono 12px), borda 1px `control`, raio `sm`, padding 2px 6px. Texto: livro abreviado + página ("CORE p.17", "DLC p.N"). Página não conferida: "ch. N".
- **`type-badge`:** `caption` semibold, fundo `sunken`, raio `sm`: "Core", "Adds", "Replaces core" (outros tipos são Should).
- **`option-card`:** card clicável (role radio). Nome `title-sm`, linha de mecânica em `meta` (P9), selos. Selecionado (prévia: a opção marcada no radiogroup que ainda não é a escolha): borda 2px `strong`. Escolha atual (`current`): rótulo "Your choice" em `caption` semibold com fundo `sunken`, raio `sm`, padding `--space-0-5` `--space-1-5`, no canto superior do cartão; borda padrão, nunca a de seleção; nome acessível "{Nome}, your choice". Quando a escolha atual é também a opção marcada, vale só o tratamento `current`; ao comparar, o cartão em prévia tem a borda e o atual tem o rótulo, nunca o mesmo tratamento. Estado nunca só por cor. Inelegível (Should): opacidade 0.6, borda tracejada, "Not available: motivo".
- **`roll-card`:** card de uma tabela. Cabeçalho: nome `title` + dado em `badge` + `segmented-control` de modos. Corpo por estado:
  - **a decidir:** `button-primary` "Roll 3d6" + `button-secondary` "Enter result" (prescrita) e frase do que espera ("Not decided yet. Nothing else waits for it.");
  - **rolado:** caixa de valor 72×72 (fundo `subtle`, borda `control`, valor `stat`, rótulo "rolled" em `caption`) + resultado + `effect-chip`s + "Reroll";
  - **escolhido:** grade de faixas (`range-grid`);
  - **escrito:** `textarea` + checkbox "This result has a rules effect" (abre ajuste manual, FR-DEC-022);
  - **informado:** um campo por dado, com a faixa válida na ajuda;
  - **aguardando:** fundo `sunken`, borda tracejada, motivo em `meta` ("Waits for Purpose");
  - **sem texto:** "No text added for this entry · " + `source-badge` (sem botão "Add text" no MVP).
- **`effect-chip`:** `caption`, fundo `sunken`, raio `sm`, padding 2px 6px: "Corruption +1", "Language +1 (choose)".
- **`range-grid`:** grade de botões (2 a 5 colunas conforme a largura), cada um com a faixa em `badge` e o nome quando o pacote o traz ("3–4 Troglodytes"). Sem nome no pacote (D36): só faixa e página, e ao selecionar abre um `text-input` "Name" logo abaixo da grade. Já possuído: desabilitado com "already yours".
- **`subdecision`:** caixa com borda 1px tracejada `control`, raio `md`, padding 12px 16px: pergunta em `label`, controle pequeno e "or decide later: it stays in Open decisions" em `meta`.
- **`live-summary`:** card com `eyebrow` "LIVE SUMMARY"; quatro mini-cartões de atributo (rótulo `caption`, valor `stat-sm`, modificador `caption`) e a lista de características em duas colunas (nome `meta`, valor semibold tabular).
- **`open-decisions`:** card com `eyebrow` "OPEN DECISIONS · N"; cada pendência é um link em caixa tracejada: título `label` + onde se resolve em `meta`. Ação leva ao ponto exato (FR-FLOW-011).
- **`value-composition`:** caixa `sunken`, raio `md`, padding 12px: `eyebrow` "HOW THIS IS CALCULATED"; linhas origem/valor (valor em mono tabular, alinhado à direita); corte por limite como linha "Capped at 25"; substituição como "Calculated 10 · overridden to 12"; total em semibold com divisor acima.
- **`characteristic-row`:** nome `label` · fórmula legível `meta` `secondary` · valor `stat` à direita. Expande para `value-composition`.
- **`impact-dialog`:** `dialog` com duas colunas "Current" × "New" no topo e três listas: "Will be removed" (ícone de remoção, texto `danger`), "Will be recalculated" ("Corruption 1 → 0"), "Stays as it is" (recolhida por padrão). Nota em `meta`: "Removed results stay in the log as undone." Ações: "Keep current …" à esquerda, "Apply …" à direita. Em mudança de fontes, as listas são agrupadas por livro.
- **`sheet-field`:** card com título `title-sm`, botão "+" (só em Edit sheet), entradas em `body` com a origem em `caption` `muted` ("Story · rolled", "Added by player"). Vazio: frase de estado vazio em `meta` ("None · set by your GM").
- **`adjustment-form`:** formulário no lugar (sem modal): alvo, tipo (Modifier / Override, `segmented-control`), valor inteiro, nome obrigatório. Prévia do valor final antes de salvar.
- **`log-entry`:** linha com tipo em `type-badge` (Sources, Choice, Roll, Edit), descrição `body`, fonte em `source-badge`. Desfeita: texto riscado em `muted` + motivo em `caption`.
- **`book-row`** (Sources): alça de arrastar + botões "Move up" / "Move down" (alternativa de teclado obrigatória) + posição + nome + interruptor ligado/desligado. Core: cadeado, "Always active", sem alça.
- **`character-card`** (Home): nome `title`, "Ancestry · Level 0", estado em `pill-counter` ("Creating · 3 open" tracejado / "Complete" preenchido), resumo das fontes em `meta`, data em `caption`. Ação principal "Continue" ou "Open sheet"; menu "···" com Preview sheet, Export character file, Delete.
- **`print-sheet`:** folha `@media print` sem cabeçalho do app, sem botões. Preto sobre branco, `--color-accent-*` impresso como #000. Fontes: corpo 9.5pt, títulos 12pt Spectral. Página A4 e Letter, margem 12mm, até 2 páginas (NFR-COMP-003). Decisões abertas marcadas com "☐ Open:" em negrito. `source-badge` mantido. Rodapé em toda página: nome do personagem, fontes ("Sources: Only Human › Core"), "Generated with SotDL Generator · not affiliated with Schwalb Entertainment".

### Fora do MVP (já especificados no wireframe; detalhar quando entrarem)
`version-toggle` e `compare-table` (P2c, P2d), `rule-trigger` (P34: borda 2px `--color-accent-default`, fundo `accent-tint`, eyebrow "RULE TRIGGERED"), `gm-decides` (P23), `effect-toggle`, `resource-counter`, `attack-card`, `portrait` (ficha de jogo).

### Variantes por superfície
Uma superfície (`WEB`). Variantes por contexto, sempre sobre os tokens acima:
- **Ponteiro grosso:** `--size-control` passa a 44px; `range-grid` com no máximo 3 colunas.
- **Celular (< 768):** `display` com `--font-size-display-mobile`; padding de card `--space-4`; cabeçalho `--size-header-mobile`.
- **Impressão:** ver `print-sheet`.

## 5. Acessibilidade (NFR-ACC-001: WCAG 2.2 AA, inegociável)

- Contraste: texto ≥ 4,5:1; texto grande (≥ 18px semibold ou ≥ 24px) e componentes ≥ 3:1. Pares conferidos em §2. Nenhuma combinação nova sem conferir.
- Foco sempre visível: anel 2px `--color-focus`, deslocamento 2px. A ordem de foco segue a leitura: cabeçalho → mapa → etapa → resumo.
- Tudo por teclado: grades e segmentos com setas, diálogos com foco preso e Esc, arrastar sempre com alternativa por botão ("Move up" / "Move down").
- Alvos: 24px no mínimo absoluto; 44px em ponteiro grosso.
- Estado nunca só por cor: tracejado + texto para pendência; ícone + texto para erro; "already yours" em texto.
- Semântica: um `h1` por tela (a pergunta da etapa); regiões com `landmark` (header, nav do mapa, main, aside do resumo); mudanças do resumo vivo anunciadas com `aria-live="polite"`, sem roubar foco.
- Resultado de rolagem anunciado ("Rolled 9 on 3d6: …").
- `prefers-reduced-motion` respeitado.
- Zoom de 200% e reflow a 320 CSS px sem perder função.

## 6. Voz e microcopy

Inglês simples, termos do jogo como nos livros (Strength, Health, novice path). Instrui sem julgar; sempre diz o que falta e onde. Nenhum termo interno (NFR-USE-001).

| Faça | Não faça |
| :-- | :-- |
| "Choose an ancestry first." | "Step locked: dependency unresolved." |
| "This file isn't a character from this generator. Your saved characters weren't changed." | "Import failed: schema validation error." |
| "Not decided yet. Nothing else waits for it." | "Pending slot (optional)." |
| "Characters are saved in this browser only. Export a character file to keep a copy." | "Data persisted in IndexedDB." |

Erros dizem: o que aconteceu, o que ficou a salvo, o que fazer. Confirmações destrutivas nomeiam a consequência no botão ("Delete permanently").

## 7. Faça e não faça

- **Faça** use tokens para toda cor, espaço, raio e tamanho.
- **Faça** mostre `source-badge` em toda opção, tabela e entrada de log.
- **Faça** mostre a composição de todo valor calculado ao expandir.
- **Faça** use o botão preto para a ação principal; o vermelho só como identidade ou perigo.
- **Não faça** use Spectral abaixo de 20px nem em controles.
- **Não faça** use sombra em cartões.
- **Não faça** esconda opção sem dizer por quê (P3, P31).
- **Não faça** invente variantes; estenda pelos eixos definidos (estado, tamanho).
- **Não faça** mostre texto descritivo dos livros; entrada sem texto mostra faixa e página (P22).

## 8. Referência rápida para agentes

- Fundo `--color-background-page`; cartões `--color-background-surface` + borda `--color-border-divider` + raio 8px + padding 20px.
- Texto `--color-text-default` 14px Inter; apoio `--color-text-secondary`; origem `--color-text-muted` 12–13px.
- Ação principal → `button-primary` (preto). Secundária → `button-secondary`. Destrutiva → `button-danger` dentro de diálogo.
- Escolha entre modos → `segmented-control`. Pendência → caixa tracejada `--color-border-control`.
- Pergunta da etapa → Spectral 28px; sobretítulo → `eyebrow` vermelho.
- Fonte da regra → `source-badge` (IBM Plex Mono 12px).
- Espaços: 8 dentro de componente, 12 entre cartões, 24 entre seções.
- Foco: anel 2px `#1F5FBF` com deslocamento 2px.
- Layout do construtor: mapa 232 | etapa | resumo 280 (≥ 1280); celular com seletor no topo e barra de resumo no rodapé.

## 9. Proveniência e lacunas

**Proveniência.** Estrutura, componentes, medidas (raios 4/6/8/999, espaços 2–24, Inter e IBM Plex Mono, cinzas quentes) ingeridos do wireframe v1 (`docs/reference/wireframe/`, código `.dc.html` e telas). Identidade visual (pergaminho, vermelho-sangue, Spectral) escolhida pelo usuário entre duas propostas (direção A), dentro do P33 e da D28. Ajustes exigidos pela NFR-ACC-001: o cinza `#A8A8A2` do wireframe (2,4:1 sobre branco) foi substituído por `#85847E` em bordas de controle e por `#65645E` em texto apagado; corpo subiu de 13 para 14px; campos de formulário em 16px; alvos de 44px em ponteiro grosso; anel de foco definido (o wireframe não tinha). Emenda de 2026-11-12, do ui-design da FEAT-007 (E1–E4): estado bloqueado do `step-map` sem tooltip; estado `current` do `option-card`; ícones Lucide; tokens `size.pill`, `size.icon-sm`, `size.icon-md`, `icon.stroke`, `opacity.disabled`, `border-width.alert` e `typography.stat-sm`; padding do `button-primary` em `--space-4`.

```json
{ "design_provenance": {
    "mode": "design-file",
    "fidelity": "mapped",
    "source": null,
    "generated": "2026-11-11"
} }
```

**Lacunas conhecidas.**
- Breakpoint intermediário (768–1279) não desenhado no wireframe; layout assumido.
- Ficha no celular, etapas Roleplaying e Review, About, estados vazio, erro e carregamento: especificados aqui e em `ux-foundations.md`, sem desenho.
- Valores ainda sem token, a tokenizar no detailed-design da primeira feature que os usa, nunca como número solto no código: caixa de valor 72×72 do `roll-card` e corpo 9.5pt, títulos 12pt e margem 12mm do `print-sheet`. A feature responsável por cada um está no plano de implementação.
- Modo escuro fora do escopo; os tokens por papel permitem acrescentá-lo.
- Componentes fora do MVP só com a especificação do wireframe.
