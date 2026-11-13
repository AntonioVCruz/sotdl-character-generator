# UI Design: FEAT-001 — Home: listar, continuar e excluir personagens

> Feature de: `docs/implementation-plan.md` · Par com: `technical-design.md`
> Telas: SCR-WEB-001 (e o foco da moldura do construtor, SCR-WEB-003 e SCR-WEB-016) · Modo: por feature · Status: Verified · Data: 2026-11-13

Autoridade: `docs/design.md` e `docs/tokens.json`. Todo valor visual abaixo é token (`--…`) ou classe `.typography-*`, e os breakpoints são os `@custom-media` da FEAT-007 (`--bp-md` = 768 px, `--bp-xl` = 1280 px). Ícones Lucide, decorativos com `aria-hidden`. Texto da interface em inglês (NFR-L10N-001), fechado em [Textos](#textos). Nenhum texto dos livros (P22).

## SCR-WEB-001 — Home

- **Estratégia e fonte:** code-native; esta seção é o design.
- **Composição** (dentro do `main` da casca: `app-header`, `main.app-main`, rodapé com About):
  1. cabeçalho da página: `h1` "My characters" e `button-primary` "New character";
  2. alerta de falha ao criar (`inline-alert` danger), só depois de uma falha;
  3. aviso "só neste navegador" (`inline-alert` warning), em todos os estados;
  4. região do estado: esqueleto, alerta de falha da lista, estado vazio ou grade de `character-card`;
  5. diálogo de exclusão (`dialog`), um só para a tela;
  6. região `role="status"` visualmente oculta, para anunciar a exclusão.
- **Dados** (technical-design §3.1 e §3.5):

| Elemento | Fonte |
| :-- | :-- |
| Estado da tela | `app.listCharacters()` → `ListResult` |
| Nome | `displayName(summary.name)` |
| Linha de contexto | `summary.ancestry` (quando não nulo) + "Level 0" |
| Pílula de estado | `summary.status` e `summary.openDecisions` |
| Fontes | `summary.sources[].name`, na ordem recebida |
| Data | `formatEdited(summary.updatedAt)` |
| Continue | `href.builder(summary.id)`, sem etapa |
| Excluir | `app.deleteCharacter(summary.id)` → `DeleteResult` |
| New character | `app.createCharacter()` → `CreateResult` (sem mudança na tela, só no alerta) |

- **Conformidade:** usa só componentes e tokens do `design.md`. Duas correções do código atual: a falha ao criar passa de `.notice` (borda inteira) a `inline-alert` danger, e a lista de links (`.character-list`) dá lugar ao `character-card`. Uma emenda de texto vai à ux-foundations (E6, em [Escalações](#escalações-e-pendências)).

### Layout por largura

A página ocupa a coluna do `.app-main` (até `--size-content-max`; padding lateral `--space-4` abaixo de `--bp-md`, `--space-6` a partir dele). Seções separadas por `--space-6`.

- **Cabeçalho da página:** flex com quebra, `h1` à esquerda, "New character" à direita, gap `--space-4`. Abaixo de `--bp-md`, o botão quebra para baixo do `h1` e ocupa a largura toda.
- **Grade de cartões:** `ul` em grade com `repeat(auto-fill, minmax(min(100%, var(--size-summary)), 1fr))` e gap `--space-3`, a mesma regra da grade de `option-card` da FEAT-007. Colunas resultantes:

| Largura | Área útil | Colunas | Largura do cartão |
| :-- | :-- | :-- | :-- |
| 1440 | 1392 | 4 | ~339 |
| 1024 | 976 | 3 | ~317 |
| 412 | 380 | 1 | 380 |
| 320 | 288 | 1 | 288 (área interna 256) |

```text
1440 · populated
┌ SotDL Generator ────────────────────────────────────────────────────────────────┐
│ My characters                                                  [New character] │
│ ▌⚠ Characters are saved in this browser only. Clearing your browser's data… ▌ │
│ ┌ Liliana ───────────┐ ┌ Brokk ─────────────┐ ┌ Unnamed character ─┐ ┌ …  ──┐ │
│ │ Human · Level 0    │ │ Dwarf · Level 0    │ │ Level 0            │ │      │ │
│ │ ┆Creating · 3 open┆ │ │ ■ Complete ■       │ │ ┆Creating · 1 open┆ │ │      │ │
│ │ Sources: Shadow of │ │ Sources: Shadow of │ │ Sources: Shadow of │ │      │ │
│ │ the Demon Lord     │ │ the Demon Lord     │ │ the Demon Lord     │ │      │ │
│ │────────────────────│ │────────────────────│ │────────────────────│ │      │ │
│ │ [Continue] [···]   │ │ [Continue] [···]   │ │ [Continue] [···]   │ │      │ │
│ │ Edited Nov 13, 2026│ │ Edited Nov 12, 2026│ │ Edited Nov 12, 2026│ │      │ │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘ └──────┘ │
│ About                                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘

1024 · populated: o mesmo, com 3 colunas.

412 · populated                      320 · populated
┌ SotDL Generator          [···] ┐   ┌ SotDL Generator  [···] ┐
│ My characters                  │   │ My characters          │
│ [        New character       ] │   │ [   New character    ] │
│ ▌⚠ Characters are saved in   ▌ │   │ ▌⚠ Characters are    ▌ │
│ ▌  this browser only. …      ▌ │   │ ▌  saved in this …   ▌ │
│ ┌ Liliana ───────────────────┐ │   │ ┌ Liliana ───────────┐ │
│ │ Human · Level 0            │ │   │ │ Human · Level 0    │ │
│ │ ┆Creating · 3 open┆        │ │   │ │ ┆Creating · 3 open┆│ │
│ │ Sources: Shadow of the     │ │   │ │ Sources: Shadow of │ │
│ │ Demon Lord                 │ │   │ │ the Demon Lord     │ │
│ │────────────────────────────│ │   │ │────────────────────│ │
│ │ [Continue] [···]           │ │   │ │ [Continue] [···]   │ │
│ │ Edited Nov 13, 2026        │ │   │ │ Edited Nov 13, 2026│ │
│ └────────────────────────────┘ │   │ └────────────────────┘ │
│ ┌ Brokk ─────────────────────┐ │   │ ┌ Brokk ─────────────┐ │
```

Abaixo de `--bp-md` não há rodapé: o About fica no menu "···" do `app-header` (FEAT-007).

### character-card

`li` > `article` (`card`, `aria-labelledby` = id do nome), nesta ordem:

1. **Nome:** `h2` `.typography-title`, `id="character-{id}-name"`, `overflow-wrap: anywhere` (nome longo nunca alarga a grade).
2. **Contexto:** "{Ancestry} · Level 0", ou "Level 0" sem ancestralidade, em `.typography-meta` `--color-text-secondary`.
3. **Estado:** `pill-counter` (`design.md` §4):
   - `creating` com número → "Creating · {n} open", pendente (tracejado);
   - `creating` com `openDecisions: null` → "Creating", pendente;
   - `complete` → "Complete", concluído (preenchido).
4. **Fontes:** "Sources: {nome} › {nome}" em `.typography-meta` `--color-text-secondary`, com os nomes de `sources` na ordem recebida. Sem fontes (metadado antigo), a linha não aparece.
5. **Divisor** `--border-width-default` `--color-border-divider`.
6. **Ações** (flex, gap `--space-2`):
   - "Continue": `a` com a classe `button-primary`, `href.builder(id)`;
   - "···": `button-secondary` só de ícone (`ellipsis`, `--size-icon-md`, `aria-hidden`), gatilho de um `Menu` do React Aria, com as classes `menu-popover`, `menu` e `menu__item` do `app-header`. Item único: "Delete".
7. **Data:** "Edited {data}" em `.typography-caption` `--color-text-muted`, com a data num `time` (`dateTime` = `updatedAt`). Com `formatEdited` nulo, a linha não aparece.

Gap interno `--space-2`; `--space-3` acima e abaixo do divisor. Padding pelo `card` (`--space-4` no celular, `--space-5` a partir de `--bp-md`).

**Nomes acessíveis** (vindos do conteúdo, sem `aria-label` que repita texto visível):

| Elemento | Marcação | Nome resultante |
| :-- | :-- | :-- |
| Cartão | `article aria-labelledby="character-{id}-name"` | "Liliana" |
| Continue | `id="character-{id}-continue"`, `aria-labelledby="character-{id}-continue character-{id}-name"` | "Continue Liliana" |
| Menu "···" | `id="character-{id}-more"`, `aria-label="More actions for"`, `aria-labelledby="character-{id}-more character-{id}-name"` | "More actions for Liliana" |
| Menu aberto | rotulado pelo gatilho (React Aria) | "More actions for Liliana" |

- O texto visível do Continue ("Continue") é o começo do nome, então a regra `label-content-name-mismatch` do axe passa sem filtro (WCAG 2.5.3). O "···" não tem texto visível; o `aria-label` dele é só o prefixo, e o nome do personagem vem do conteúdo pela referência.
- A autorreferência no `aria-labelledby` faz o cálculo de nome usar o texto do próprio elemento (o conteúdo no Continue, o `aria-label` no "···"). A T5 confere os dois nomes com `getByRole(…, { name })`, porque o `Button` do React Aria repassa os dois atributos.
- Dois personagens com o mesmo nome (ex.: dois "Unnamed character") têm nomes de ação iguais. A posição na lista ("2 of 5") e a linha de contexto os distinguem. Acrescentar data ou ancestralidade ao nome foi rejeitado, porque o tornaria longo em todo cartão para cobrir um caso raro.

### loading

Antes de `listCharacters` responder.

- Cabeçalho da página, "New character" (habilitado) e o aviso já aparecem.
- Na região do estado: um `div` com `aria-busy="true"`, o texto visualmente oculto "Loading characters…" e três esqueletos de cartão (`aria-hidden`) na mesma grade, com fundo `--color-background-sunken`, `--radius-lg` e altura `calc(3 * var(--size-header))` (~192 px, perto da altura de um cartão). Sem spinner (`design.md` §4, `loading`).
- Nenhum atraso antes do esqueleto: a leitura dos metadados é rápida, e um atraso só esconderia a tela por mais tempo.

### error

`{ ok: false, reason: 'storage-unavailable' }`.

- No lugar da grade: `inline-alert` danger (`circle-alert`, `role="alert"`) com o texto da falha da lista (ver [Textos](#textos)). Nunca o estado vazio.
- O cabeçalho, "New character" e o aviso continuam. Se "New character" também falhar, o alerta de criação aparece acima do aviso, com o próprio texto.
- Sem botão de recarregar: o texto diz o que fazer, como no erro de abertura do construtor (FEAT-007).

```text
412 · error
│ My characters                  │
│ [        New character       ] │
│ ▌⚠ Characters are saved …    ▌ │   warning
│ ▌⊘ This browser didn't let   ▌ │   danger, role=alert
│ ▌  the generator read your   ▌ │
│ ▌  saved characters. …       ▌ │
```

### empty

Lista vazia (FR-CHAR-015; UC-001 1a).

- `card` com o texto limitado a `--size-prose-max`:
  - `h2` "No characters yet" em `.typography-title`, `tabindex="-1"` (alvo de foco depois de excluir o último);
  - dois parágrafos em `.typography-body`: o que o app faz, e que o texto das regras está nos livros;
  - "To start, choose New character." em `.typography-body`.
- O card não repete o botão. "New character" fica no cabeçalho da página em todos os estados (ver as decisões no fim desta seção).

```text
1440 · empty
│ My characters                                                  [New character] │
│ ▌⚠ Characters are saved in this browser only. …                              ▌ │
│ ┌──────────────────────────────────────────────────────────────────────────┐   │
│ │ No characters yet                                                        │   │
│ │ This generator guides you through creating a level 0 character for       │   │
│ │ Shadow of the Demon Lord, one step at a time. It shows where each rule   │   │
│ │ comes from and how each number is calculated.                            │   │
│ │ It shows each rule's mechanics and the page it's on. The full rules text │   │
│ │ is in the books.                                                         │   │
│ │ To start, choose New character.                                          │   │
│ └──────────────────────────────────────────────────────────────────────────┘   │

320 · empty: o mesmo card em coluna única, botão em largura total acima do aviso.
```

### populated

Lista não vazia: um `character-card` por personagem, na ordem do `app` (FR-CHAR-004), dentro de `ul aria-label="Saved characters"`. Sem paginação nem "load more" (NFR-CAP-001): com 100 personagens, são 100 cartões na mesma grade, e a página rola só na vertical.

### delete-confirm

"Delete" no menu de um cartão abre o `dialog` (`Modal` + `Dialog` do React Aria, `role="alertdialog"`):

- **Moldura:** largura `min(var(--size-prose-max), 100% − 2 × var(--space-4))`, dentro do máximo `--size-dialog-max` do componente; fundo `--color-background-surface`, `--radius-lg`, `--shadow-overlay`, backdrop `--color-overlay`, padding `--space-5` (`--space-4` abaixo de `--bp-md`). Abre em `--duration-normal`, sem deslocamento com `prefers-reduced-motion`.
- **Conteúdo,** gap `--space-3`:
  - título `h2` `.typography-heading` (slot `title`, nome do diálogo): "Delete {name}?", com `overflow-wrap: anywhere`;
  - linha de identificação em `.typography-meta` `--color-text-secondary`: "{Ancestry} · Level 0 · Edited {data}" (as partes ausentes saem), para distinguir personagens de mesmo nome;
  - consequência em `.typography-body`: "This permanently deletes {name} and its creation log from this browser. You can't undo this." (FR-CHAR-013);
  - ações no rodapé, `--space-2` entre elas, alinhadas à direita: `button-secondary` "Cancel" à esquerda e `button-danger` "Delete permanently" à direita (`design.md` §4, `dialog`). Quando não cabem lado a lado (a 320 px, ~260 px pedidos para 256 disponíveis), quebram em duas linhas de largura total, na mesma ordem do DOM.
- **Foco inicial:** "Cancel" (a ação conservadora). Foco preso no diálogo.
- **Fechar:** Esc e "Cancel" fecham sem excluir (FR-CHAR-013). Clique no backdrop não fecha (`isDismissable` falso): numa confirmação destrutiva, só as duas ações e o Esc.
- **Excluindo:** "Delete permanently" com `isPending` (spinner `--size-icon-sm`, rótulo mantido, `aria-busy`); "Cancel" desabilitado e Esc ignorado até o resultado, para o diálogo não fechar com o resultado desconhecido.
- **Sucesso:** o diálogo fecha; o cartão sai da lista local, sem nova leitura; a região `role="status"` diz "{name} was deleted."; o foco segue a [regra de foco](#foco-na-home). Se era o último, a tela passa a [empty](#empty).

```text
1440 · delete-confirm                       320 · delete-confirm
┌───────────────────────────────────────┐   ┌──────────────────────┐
│ Delete Liliana?                       │   │ Delete Unnamed       │
│ Human · Level 0 · Edited Nov 13, 2026 │   │ character?           │
│ This permanently deletes Liliana and  │   │ Level 0 · Edited Nov │
│ its creation log from this browser.   │   │ 12, 2026             │
│ You can't undo this.                  │   │ This permanently …   │
│              [Cancel] [Delete permanently] │ [       Cancel      ]│
└───────────────────────────────────────┘   │ [Delete permanently ]│
                                            └──────────────────────┘
```

### delete-failed

`{ ok: false, reason: 'delete-failed' }` (D6).

- O diálogo **fica aberto**. Entre a consequência e as ações entra um `inline-alert` danger (`role="alert"`): "{name} wasn't deleted. It's still saved in this browser. Try again, and if it keeps failing, reload the page."
- "Delete permanently" volta ao normal e mantém o foco (não saiu do DOM); "Cancel" e Esc voltam a funcionar.
- Nova tentativa: o alerta sai ao acionar "Delete permanently" de novo e volta se falhar outra vez. Sucesso segue o [delete-confirm](#delete-confirm).

### create-failed

`createCharacter` devolveu `pack-load-failed` ou `save-failed` (FR-HELP-004, FR-CHAR-010): `inline-alert` danger (`role="alert"`) logo abaixo do cabeçalho da página, com os textos de hoje (`FAILURE` do `Home.tsx`, sem mudança). Some na próxima tentativa.

### Foco na Home

| Momento | Foco | Anúncio |
| :-- | :-- | :-- |
| Chegar à Home por navegação interna (marca, "Back to My characters") | `h1` "My characters" (`tabindex="-1"`) | o título |
| Carregamento inicial da página | nada é movido (padrão do navegador) | — |
| Abrir o menu "···" | primeiro item (React Aria) | — |
| Abrir o diálogo | "Cancel" | título e consequência (`alertdialog`) |
| Cancelar (Esc ou "Cancel") | de volta ao "···" do cartão (restauração do React Aria) | — |
| Excluir com sucesso, com outros cartões | `h2` do nome do cartão que ocupa o lugar do excluído (o seguinte; se era o último da lista, o anterior), com `tabindex="-1"` | "{name} was deleted." (`role="status"`) |
| Excluir o último personagem | `h2` "No characters yet" | "{name} was deleted." |
| Falha ao excluir | fica em "Delete permanently" | o alerta (`role="alert"`) |

O foco vai ao **título** do cartão vizinho, e não ao "Continue" dele: o título dá o contexto ("Brokk, heading level 2"), o próximo Tab chega ao "Continue", e um Enter dado por engano não abre o construtor.

**Ordem de Tab:** "New character" → por cartão, "Continue" → "···" → rodapé. 100 cartões dão 200 paradas, sem armadilha. A lista não tem atalho de salto: o cabeçalho de cada cartão é um `h2`, navegável por título no leitor de tela.

### Medidas de capacidade (NFR-CAP-001, NFR-COMP-002)

- **A Home não tem elemento fixo.** O `app-header` da Home é estático (o `sticky` e o `fixed` do `builder.css` são do construtor), então `document.documentElement.scrollWidth <= clientWidth` basta para a página com 100 cartões, a 320 e a 360 px.
- **O diálogo e o popover do menu são fixos ou posicionados fora do fluxo**, e o `scrollWidth` não os vê. Com o diálogo aberto a 320 px, o E2E mede com `getBoundingClientRect` o diálogo e os dois botões: `left >= 0` e `right <= window.innerWidth`. O mesmo para o popover do menu do último cartão da grade.
- Um cartão com nome de 200 caracteres sem espaço não alarga a grade (`overflow-wrap: anywhere` no `h2` e no título do diálogo).

### Seletor para o `skeleton.spec.ts:77` (contrato alterado da T5)

```ts
const card = page.getByRole('list', { name: 'Saved characters' }).getByRole('article', { name: 'Unnamed character' })
await expect(card).toHaveCount(1)
await expect(card.getByRole('link', { name: 'Continue Unnamed character' })).toBeVisible()
```

Papel `article` com o nome do personagem (pelo `aria-labelledby` do `h2`), e o "Continue" com o nome próprio vindo do conteúdo.

- **Notas responsivas:** a grade e o cabeçalho da página seguem a tabela de [Layout por largura](#layout-por-largura). Alvos de `--size-touch-target` em ponteiro grosso ("Continue", "···", itens do menu e botões do diálogo, pelas regras já existentes de `button-*` e `menu__item`). Reflow a 320 CSS px sem rolagem horizontal (`design.md` §5).
- **Decisões:**
  - **"New character" só no cabeçalho da página, em todos os estados.** Motivo: uma ação, um nome acessível (dois botões "New character" no estado vazio quebrariam os seletores do E2E e repetiriam a ação para o leitor de tela) e nenhum deslocamento do botão entre os estados. O estado vazio aponta para ele em texto. Alternativa rejeitada: o botão dentro do card vazio, que muda de lugar ao passar a populated, ou aparece duas vezes.
  - **Menu "···" com um item só ("Delete"), não um botão "Delete" direto.** Motivos: o `design.md` §4 e o wireframe põem a exclusão no menu do cartão; a FEAT-002 (Export character file) e a FEAT-018 (Preview sheet) acrescentam itens sem mudar a forma do cartão nem os seletores; e a ação destrutiva fica a um passo a mais do "Continue". Custo: um menu de um item até a FEAT-002, e um passo a mais para excluir. Alternativa rejeitada: botão "Delete" ao lado do "Continue", que poria uma ação destrutiva a um toque da principal e mudaria de forma quando o menu chegasse.
  - **O aviso "só neste navegador" em todos os estados, abaixo do cabeçalho.** Motivo: AC-11 pede com e sem personagens. Num lugar só, o texto não salta entre estados, e o leitor de tela o encontra sempre no mesmo ponto. É texto estático: `inline-alert` warning **sem** `role` de região viva (ver [Decisões entre telas](#decisões-entre-telas)). Alternativa rejeitada: só no estado vazio e no rodapé da lista (com 100 cartões, ficaria fora da vista).
  - **Fontes pelo nome, não pela sigla.** Motivo: a sigla ("CORE") é um identificador do selo `source-badge`, que acompanha página, e não diz nada a quem não tem os livros (visitante, iniciante). O nome, unido por " › " como no rodapé do `print-sheet`, é o "resumo das fontes" da FR-CHAR-003. A linha quebra quando há vários livros; nada é truncado. A direção da prioridade na linha é a da lista `sources` do `app`; a FEAT-005, que traz o segundo livro, confere que a mais alta vem primeiro, como no `print-sheet`.
  - **Data absoluta ("Edited Nov 12, 2026"), não relativa ("2 days ago") como no wireframe.** Motivo: o contrato fixa `formatEdited` no `dateStyle: 'medium'` (technical-design §3.5), e a data absoluta não envelhece com a página aberta. Alternativa rejeitada: data relativa, que pediria atualização periódica e um contrato novo.
  - **Grade com mínimo de coluna `--size-summary`.** Motivo: a regra da grade de `option-card` da FEAT-007, sem token novo; dá 4, 3 e 1 colunas nas larguras de referência, e o cartão nunca fica abaixo de 280 px fora do celular.
  - **Linha de identificação no diálogo.** Motivo: com vários "Unnamed character", o título sozinho não diz qual será excluído.

## Builder frame focus

Foco ao mostrar uma etapa no construtor (achado menor 2 do aceite da FEAT-008; technical-design §8). Muda a moldura da FEAT-007 ([Builder frame](../FEAT-007-ancestry-step-map-live-summary/ui-design.md#builder-frame)) e o seletor do SCR-WEB-016.

**Regra única:** quando a etapa mostrada muda, inclusive na primeira vez que o construtor fica pronto, o foco vai para o `h1` da etapa (`tabindex="-1"` no `h1` do `step-header`). Vale para qualquer origem:
- "Continue" da Home e "New character" (a entrada, depois do redirecionamento para a etapa);
- Next e Back;
- um link do mapa de etapas;
- um item do seletor do celular. O popover fecha e o React Aria devolve o foco ao gatilho; o foco no `h1` tem de vencer essa devolução, adiado para o quadro seguinte, como a AncestryStep já faz com o título do detalhe.

**Exceção:** com `?slot=` na rota, o foco vai ao elemento da vaga (FR-FLOW-011, FEAT-007, sem mudança), e não ao `h1`.

- O `h1` recebe o anel de foco do `design.md` §4 quando o navegador o considera `:focus-visible` (depois de teclado), como os títulos que já recebem foco (detalhe da ancestralidade, "Score adjustment").
- Focar o `h1` o rola para a vista; na troca de etapa, o topo da etapa aparece.
- O leitor de tela lê a pergunta da etapa, e o próximo Tab vai ao primeiro controle da etapa, não ao resumo vivo.
- Nada muda no foco dentro da etapa (escolher a ancestralidade, aplicar e desfazer o ajuste).

**Contratos alterados:** nenhum. Asserções de foco existentes, conferidas, sem mudança:
- `e2e/ancestry.spec.ts:147`: a vaga de Size focada pelo atalho (`?slot=`, a exceção);
- `e2e/attributes.spec.ts:125`: a linha "Applied…" depois de aplicar (foco dentro da etapa);
- `e2e/attributes.spec.ts:180`: o `h2` "Score adjustment" depois de desfazer (dentro da etapa);
- `e2e/attributes.spec.ts:234`: a pendência do +1 focada pelo atalho (`?slot=`);
- `e2e/skeleton.spec.ts:68` e `e2e/ancestry.spec.ts:19`: Esc fecha o popover do seletor aberto por clique, sem trocar de etapa;
- `src/**/*.test.ts*`: nenhuma asserção de foco (`toHaveFocus`, `activeElement`).

Nenhum teste depende do foco que fica no botão Next nem do primeiro Tab depois de trocar de etapa. As expectativas novas (abaixo, em [Escalações](#escalações-e-pendências)) não são contratos alterados.

## Decisões entre telas

- **Textos e peças compartilhados fora de `src/ui/builder/`.** A Home não importa de `src/ui/builder/` (guarda do chunk `Builder-*.js`), e não pode duplicar texto nem componente:
  - `src/ui/copy.ts` (novo): `displayName` (T4) e `STORAGE_UNAVAILABLE`, a mensagem da falha de leitura. O `OPEN_MESSAGE['storage-unavailable']` de `src/ui/builder/copy.ts` passa a apontar para essa constante; o texto não muda.
  - `src/ui/parts.tsx` (novo): `InlineAlert` e `PillCounter`, movidos de `src/ui/builder/parts.tsx`. O construtor passa a importá-los dali. O `InlineAlert` ganha a opção de não ter região viva (`live={false}`, sem `role`), para o aviso estático; o padrão continua o de hoje (`alert` no danger, `status` no warning).
  - `src/ui/home/`: `CharacterCard`, `DeleteDialog` e `copy.ts` (textos da Home e `formatEdited`).
  - CSS: `pill-counter` e `skeleton*` saem do `builder.css` (carregado com o construtor) para o `base.css`; `button-danger` e `dialog` entram no `base.css`; o resto da Home vai a `src/ui/styles/home.css`, importado pelo `Home.tsx`. A `.notice` e a `.character-list` saem do `base.css`.
- **Foco ao trocar de tela, pela mesma regra:** a etapa do construtor e a Home recebem o foco no `h1` quando se chega a elas por navegação interna. Uma regra, duas telas; nenhuma das duas move o foco no carregamento inicial da Home.

## Textos

Fechados para a FEAT-001, revisados contra a NFR-USE-001 e o `design.md` §6 (o que aconteceu, o que ficou a salvo, o que fazer). Nenhum id, `reason` ou termo interno. Os rascunhos do technical-design §3.5 ficam lá; vale esta tabela.

| Onde | Texto |
| :-- | :-- |
| Título (`h1`) | "My characters" |
| Ação da página | "New character" |
| Aviso "só neste navegador" (FR-CHAR-016) | "Characters are saved in this browser only. Clearing your browser's data for this site deletes them." |
| Lista: rótulo acessível | "Saved characters" |
| Carregando (oculto) | "Loading characters…" |
| Falha da lista (`storage-unavailable`, em `src/ui/copy.ts`) | "This browser didn't let the generator read your saved characters. Nothing was changed. Reload the page to try again. If it keeps happening, check that this site is allowed to store data." |
| Vazio: título | "No characters yet" |
| Vazio: o que o app faz | "This generator guides you through creating a level 0 character for Shadow of the Demon Lord, one step at a time. It shows where each rule comes from and how each number is calculated." |
| Vazio: texto nos livros (D35) | "It shows each rule's mechanics and the page it's on. The full rules text is in the books." |
| Vazio: ação | "To start, choose New character." |
| Cartão: nome | `displayName`: o nome, ou "Unnamed character" (FR-CHAR-011) |
| Cartão: contexto | "{Ancestry} · Level 0" · "Level 0" |
| Cartão: estado | "Creating · {n} open" · "Creating" · "Complete" |
| Cartão: fontes | "Sources: {Book} › {Book}" |
| Cartão: data | "Edited {Nov 12, 2026}" (`formatEdited`; sem data, a linha sai) |
| Cartão: ações | "Continue" · menu "Delete" |
| Nomes acessíveis | "Continue {name}" · "More actions for {name}" |
| Diálogo: título | "Delete {name}?" |
| Diálogo: identificação | "{Ancestry} · Level 0 · Edited {data}" |
| Diálogo: consequência (FR-CHAR-013) | "This permanently deletes {name} and its creation log from this browser. You can't undo this." |
| Diálogo: ações | "Cancel" · "Delete permanently" |
| Falha ao excluir | "{name} wasn't deleted. It's still saved in this browser. Try again, and if it keeps failing, reload the page." |
| Exclusão feita (oculto, `role="status"`) | "{name} was deleted." |
| Falha ao criar | sem mudança: os textos de `FAILURE` no `Home.tsx` |

`{name}` é sempre `displayName(name)`. O aviso não promete exportar: o arquivo do personagem só existe com a FEAT-002, que acrescenta ao aviso "Export a character file to keep a copy." (como no `design.md` §6).

## Escalações e pendências

**E6. Texto do aviso "só neste navegador"** (emenda ao `design.md` §6, pela ux-foundations; este documento não edita o `design.md`):
- **O que diverge:** o exemplo "Faça" do §6 é "Characters are saved in this browser only. Export a character file to keep a copy." A segunda frase promete uma ação que só existe na FEAT-002, e falta o que a ADR-002 pede: que limpar os dados do navegador apaga os personagens.
- **Proposta:** trocar o exemplo por "Characters are saved in this browser only. Clearing your browser's data for this site deletes them.", com uma nota: "Com a exportação (FEAT-002), acrescenta-se 'Export a character file to keep a copy.'". O "Não faça" ("Data persisted in IndexedDB.") continua.
- **Telas:** SCR-WEB-001.
- **Situação:** proposta, não aplicada. A entrada do manifesto fica em `escalation-pending` até a emenda; a tela pode ser implementada com o texto daqui, que não muda nenhum componente nem token.

**Emenda do tasks.md, pelo detailed-design** (este documento não edita o `tasks.md`). O technical-design não muda: os contratos atendem a tela. O `tasks.md` não tem pronto-quando para três pontos deste design:
- **T4 (construtor):** o foco no `h1` a cada troca de etapa ([Builder frame focus](#builder-frame-focus)). Testes:
  - `Builder.test.tsx`, `FR-FLOW-007`: depois de Next, o foco está no `h1` da nova etapa;
  - `Builder.test.tsx`, `FR-CHAR-007`: abrir sem etapa vai à etapa resolvida com o foco no `h1`;
  - `Builder.test.tsx`, `FR-FLOW-011`: com `?slot=`, o foco fica na vaga, não no `h1`;
  - E2E móvel: escolher uma etapa no seletor deixa o foco no `h1`, não no gatilho.
- **T5 (Home):** a reorganização de [Decisões entre telas](#decisões-entre-telas) (`src/ui/copy.ts`, `src/ui/parts.tsx`, CSS compartilhado), que toca arquivos do construtor. Testes de foco: depois de cancelar, no "···"; depois de excluir, no título vizinho; depois do último, em "No characters yet".
- **T7 (capacidade):** no `capacity.spec.ts`, a 320 px com 100 cartões, sem rolagem horizontal (`scrollWidth`), e as bordas do diálogo aberto e dos botões dele dentro da viewport (`getBoundingClientRect`), como em [Medidas de capacidade](#medidas-de-capacidade-nfr-cap-001-nfr-comp-002).

**Fora desta feature:** "Import character file" e os estados de importação do inventário (FEAT-002); Export character file e Preview sheet no menu (FEAT-002, FEAT-018); "Open sheet" como ação principal do personagem Complete (FEAT-018); erro inesperado na Home (FEAT-022).

**RTM:** Design ref com este documento nas FRs que a tela realiza (FR-CHAR-001, 003, 004, 005, 006, 007, 010, 011, 013, 014, 015, 016; FR-HELP-004, 005) e nas da moldura cujo foco muda (FR-FLOW-006, 007, 008).

Status: Verified
