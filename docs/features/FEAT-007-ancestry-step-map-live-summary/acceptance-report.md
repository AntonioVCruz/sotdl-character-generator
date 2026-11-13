# Acceptance Report: FEAT-007 — Etapa Ancestry, mapa de etapas e resumo vivo

> Veredito: Accepted · Data: 2026-11-12
> Padrão: technical-design.md §6 @ `7c0883e` · Fontes: srs.md, use-cases.md (UC-003), ui-design.md, design-manifest.json
> Estado auditado: `33330d9` (código de `7c0883e` mais as correções de teste abaixo)
> Re-verificação: Accepted · 2026-11-13 · DEF-001 e DEF-002 (ver a seção no fim)

## Veredito

Aceita. Os 13 critérios têm teste fiel, depois de corrigidos sete testes fracos (só arquivos de teste). Todas as suítes passaram nesta execução, e o UC-003 foi percorrido só com teclado no build, no desktop e a 390 e 320 px. Ficam três achados menores, sem bloqueio: dois vão para a FEAT-022 e a FEAT-003, e um é só registro.

## Tabela de auditoria

| AC | Codifica | Teste(s) | Auditoria | Observado |
| :- | :-- | :-- | :-- | :-- |
| AC-1 | FR-FLOW-004, 005; UC-001 5 | `evaluate.test` (FR-FLOW-004/005); `router.test` (FR-FLOW-005); `ancestry.spec` (FR-FLOW-004, 005) | fiel | verde |
| AC-2 | FR-STEP-001, FR-SRC-010, FR-CONT-009 | `core-view.test` (FR-STEP-001…); `ancestry.spec` (FR-STEP-001…) | fiel | verde |
| AC-3 | FR-STEP-002, FR-FLOW-014; UC-003 2–3 | `core-view.test` (FR-STEP-002, FR-FLOW-014); `ancestry.spec` (FR-STEP-002, FR-FLOW-014: selecting…) | fraco, corrigido | verde |
| AC-4 | FR-STEP-003, FR-DEC-011, FR-FLOW-010, 011; UC-003 4a | `evaluate.test` (FR-DEC-011, FR-FLOW-010); `ancestry.spec` (FR-STEP-001, FR-FLOW-012…) | fraco, corrigido | verde |
| AC-5 | FR-FLOW-001, 002, 006, 007, 008 | `evaluate.test` (FR-FLOW-002, 007); `ancestry.spec` | fiel | verde |
| AC-6 | FR-FLOW-009 | `evaluate.test` (FR-FLOW-010, contadores); `ancestry.spec` (FR-FLOW-004…) | fiel | verde |
| AC-7 | FR-FLOW-012, 013, FR-CALC-001 | `core-view.test`; `session.test` (FR-CALC-001: the saved document…); `schemas.test` (FR-CALC-001); `ancestry.spec` | fraco, corrigido | verde |
| AC-8 | FR-FLOW-003, 004, 007, D8; UC-003 4c | `session.test` (FR-FLOW-003 ×3); `evaluate.test` (FR-FLOW-007); `Builder.test` (FR-FLOW-003); `ancestry.spec` (FR-FLOW-003, D8) | fraco, corrigido | verde |
| AC-9 | FR-FLOW-018 | `ancestry.spec` e `skeleton.spec` nos projetos `mobile-*` | fiel | verde |
| AC-10 | FR-CONT-006, NFR-REL-001 | `session.test` (FR-CONT-006: renaming… after reopening); `core-view.test` (FR-CONT-006); `ancestry.spec` (recarregar) | fraco, corrigido | verde |
| AC-11 | FR-HELP-004, 005, NFR-USE-001 | `session.test` (open ×5); `Builder.test` (as 4 razões, 5 casos) | fraco, corrigido | verde |
| AC-12 | FR-CHAR-010 | `session.test` (FR-CHAR-010); `Builder.test` (FR-CHAR-010) | fraco, corrigido | verde |
| AC-13 | FR-CONT-003 (parcial), FR-CONT-004; ADR-004 §2 | `schemas.test` (FR-CONT-004 ×2, ADR-004 ×4); `core-pack.test`; `npm run packs:check` | fiel | verde |

Padrão conferido contra as fontes: todo FR do plano para a FEAT-007 tem critério; UC-003 1–5, 4a e 4c (recusa D8 até a FEAT-011) estão representados; 4b (Clockwork) é da FEAT-017. Nenhum critério estreita o FR que codifica.

## Testes corrigidos

- **AC-11** (`caf74fa`): só `storage-unavailable` era testado na tela. Agora cada razão (`storage-unavailable`, `not-found`, `unreadable`, `pack-load-failed` por pacote ausente e por id em dois livros) mostra o texto do ui-design, o título e o link de volta, nunca "Loading…", e nada é gravado.
- **AC-12** (`caf74fa`): o teste só via a chamada a `retrySave`. Agora confere que a falha não gravou nada e que "Try again" grava o documento com a escolha da tela.
- **AC-8** (`caf74fa`, `33330d9`): a recusa só era testada com pacote fictício, sem conferir gravação. Agora a tela confirma que o Size decidido continua e que nada foi gravado, e um E2E com o pacote real faz Human com Size decidido → Dwarf: confere o texto exato do aviso, a escolha, o Size e o resumo, antes e depois de recarregar.
- **AC-10** (`0849569`): o teste avaliava em memória um documento montado à mão. Agora a sessão grava a decisão e o personagem é reaberto com um pacote em que a entidade mudou de nome: escolha e subdecisão continuam vivas, com o nome novo.
- **AC-7** (`0849569`): `toMatchObject` aceitava valores derivados a mais. Agora o documento gravado é comparado inteiro.
- **AC-4** (`33330d9`): o E2E só via a contagem "3". Agora confere as três pendências e a etapa de cada uma.
- **AC-3** (`33330d9`): o E2E só via o nível 4 e uma linha da prévia. Agora confere todos os blocos do detalhe, as linhas da prévia, a pendência de idioma ou profissão do Human e que selecionar não grava nada.

Teste de mutação: aceitar `EngineError` como erro inesperado, gravar outro documento no retry e anular os dependentes deixam os testes corrigidos vermelhos.

## Execução independente

Do zero, com os comandos do AGENTS.md:

- `npm ci`, `typecheck`, `lint` (fronteiras), `packs:check` e `build`: verdes.
- `npm test`: 72 testes antes das correções e 78 depois, 16 arquivos, todos verdes.
- `npm run e2e`: 40/40 nos 5 projetos (8 testes × 5), sem retry, numa porta nova (`E2E_PORT`), então sem reaproveitar servidor. Na primeira rodada, o E2E novo do AC-8 falhou nos 5 projetos porque o teste clicava no input escondido sob o rótulo do segmento. Era erro do teste, não do código: corrigido para clicar no rótulo, como já se faz com os cartões.
- `npm run lighthouse`: asserções verdes (ver NFR-PERF-001).
- Migrações: não se aplicam (IndexedDB v1 sem mudança, §4).

## Verificação direta

- **UC-003 só com teclado** no build (`vite preview` com a base do Pages, Chromium), a 1280, 390 e 320 px: criar; setas na grade; Tab até "Choose Dwarf" e Enter (o foco vai ao título do detalhe); trocar para Human; Next com o Size em aberto; Back; Disclosure da composição com Enter; atalho de Open decisions, que põe o foco no Size; Size decidido com Espaço. No celular, o seletor abre com Enter e foco na etapa atual, Esc devolve o foco ao gatilho, o resumo abre com Enter, e não há rolagem horizontal a 320 px. Ordem de foco: cabeçalho → mapa → etapa no desktop; voltar → More → seletor → etapa no celular. Os controles do resumo (botões e links nativos) foram focados direto e acionados pelo teclado.
- **Telas contra o manifesto:** os estados `default`, `selected`, `chosen`, `size-open`, `size-decided`, `dependents-blocked`, `save-failed` e `error` (as 4 razões) renderizam, pelo percurso e pelos testes. `loading` dura pouco; o código o renderiza com esqueletos e texto oculto. No SCR-WEB-016, `collapsed`, `selector-open` e `summary-open` renderizam.
- **Contratos:** `Snapshot`, `DecideResult` e as razões do `open` conferem com a §3.2; `CharacterView` confere com a §3.3.
- **Propriedade intelectual:** as strings de `packs/` são só ids, nomes de entidade, `abbr`, enums e páginas. Em `src/`, as strings longas são texto do app ou nomes de teste. Nenhum texto descritivo dos livros.

**NFRs:**

| NFR | Medida (local, Windows, Chromium headless; indicativa) | Resultado |
| :-- | :-- | :-- |
| NFR-PERF-001 | LCP da Home, mediana de 3: 209 ms no desktop (limite 2,5 s) e 759 ms no celular com 4G simulado (limite 4 s). A Home não busca pacotes (`skeleton.spec`). | passa |
| NFR-ACC-001 | axe sem violação grave no construtor com escolha, nos 5 projetos E2E e no percurso (desktop, `selector-open`). Com `summary-open` no celular, o axe acusou contraste 3,64:1 nos rótulos, mas só no meio da animação de abertura: assentado (1,5 s) ou com `prefers-reduced-motion`, 0 violações. Teclado: ver percurso. A revisão manual WCAG completa das telas do MVP fica para antes da publicação. | passa |
| NFR-USE-001 / NFR-L10N-001 | Varredura do texto visível em todos os estados do percurso, nas 3 larguras: nenhum id, enum, `null`/`undefined` nem texto fora do inglês. Mensagens e rótulos conferem com o ui-design §Textos. | passa |
| NFR-REL-001 | O documento está no IndexedDB 7–11 ms depois da atualização da tela (10 decisões; limite 1 s). Fechando a aba 10 a 250 ms depois do clique: 9/9 mantidas. Fechando no mesmo instante (0 ms, por automação): 2/2 perdidas, porque a gravação ainda não tinha terminado. | passa (ver achado menor 3) |
| NFR-PERF-002 | Indicativo: a tela mostra a escolha 6–8 ms depois do "Choose" (p95 8,2 ms, 10 amostras). A medição formal é da FEAT-008 (design §6). | registrada, sem veredito |

## Achados

**Rework:** nenhum.

**Defeito de design:** nenhum.

**Menores:**

1. **`session.open` relança erro inesperado e deixa a tela em "Loading…"** (`src/app/session.ts`, `open`; `src/ui/useCharacterSession.ts`, `void session.open(id)`). Um erro que não é `PackLoadError` nem `EngineError` (por exemplo, um `TypeError` num bug do `evaluate`) vira rejeição não tratada. O `ErrorBoundary` não pega erro assíncrono, então o snapshot fica em `loading` para sempre. Confirmado por mutação: o Vitest reportou a rejeição não tratada, e o teste ficou esperando. Não fere a FEAT-007: a §3.2 define só as falhas esperadas, e todas viram razão. Mas fere a FR-HELP-005, que é da FEAT-022. **Para:** detailed-design da FEAT-022. O design deve levar o erro inesperado do `open` (e de comandos futuros) a um estado que o boundary ou a tela mostrem.
2. **Conferência de fórmulas entre livros** (`technical-design` §3.1, `scaffold-notes`). Hoje a carga confere as referências só dentro de cada livro; ciclos que só aparecem com livros combinados caem no `EngineError` → `pack-load-failed`. Sem efeito na FEAT-007, que só tem o core. Já registrada. **Para:** FEAT-003, que precisa fechá-la antes do segundo livro.
3. **Janela de menos de 10 ms entre a tela e a gravação** (D11). Fechar a aba antes de a gravação de ~9 ms terminar perde a decisão. Ninguém fecha uma aba nesse tempo, então a NFR-REL-001 passa. Só registro; nenhuma ação.

## RTM

Test ref acrescentado (`features/FEAT-007-ancestry-step-map-live-summary/acceptance-report.md`) em: FR-SRC-010; FR-FLOW-001 a 014 e 018; FR-DEC-011; FR-STEP-001, 002, 003; FR-CALC-001; FR-CONT-006, 009; FR-CONT-003 com `(partial)`.

## Re-verificação de 2026-11-13: DEF-001 e DEF-002

> Veredito: Accepted · Estado auditado: `6c2b188` · Padrão: technical-design.md §6 (sem mudança) e ui-design.md emendado em `3beb2ff` (SCR-WEB-016, região fixa)

**Veredito.** Aceita de novo. As duas correções de manutenção na região fixa do celular (`docs/defects.md`) atendem a emenda do ui-design. Todas as suítes passaram nesta execução, sem retry. A instabilidade encontrada no caminho foi eliminada.

**Padrão.** Os 13 critérios da §6 continuam valendo; a manutenção toca o AC-9 (FR-FLOW-018) e a NFR-ACC-001. A emenda acrescenta ao SCR-WEB-016:
- "Summary" em linha própria, de largura total, quando a barra não cabe;
- foco não escondido pela região fixa (WCAG 2.4.11).

Nenhum critério foi mudado.

**Testes auditados** (`e2e/builder-dock.spec.ts`, novo; nenhum teste existente mudou em `fe419b5..6c2b188`):

| Teste | Codifica | Auditoria | Observado |
| :-- | :-- | :-- | :-- |
| DEF-001, a 320 e 360 px | Controles da região dentro do gutter de 16 px, alvo de 44 px, sem rolagem horizontal; Ancestry sem e com escolha, Attributes com o +1 pendente, Review (`design.md` §3 e §5) | fiel | verde |
| Tab pela etapa, a 320 e 412 px | Cada parada do corpo termina acima do topo da região, medida pelo contêiner visível do anel | fiel | verde |
| DEF-002, pior caso, a 320 e 412 px | Contêiner do anel (`option-card`, segmento) com o topo visível e a base sob a região; depois do Tab, inteiro acima dela | fiel | verde |
| DEF-002, toque e clique, a 320 e 412 px | Ponteiro não rola a página | fiel; mutação conferida: sem `:focus-visible`, 4/4 vermelhos | verde |

**Execução independente** (do zero): `npm ci`, `typecheck`, `lint`, `packs:check`, `build` e `npm test` (111) verdes. `npm run e2e` numa porta nova, sem retry: 88 passaram, 27 pulados, 0 falhas, 0 instáveis. Os 27 pulados são os 8 testes da região fixa nos 3 projetos de desktop, mais os 3 do `perf.spec`, que já existiam. A Lighthouse passou nas asserções. Antes, na mesma árvore: o spec da região com `--repeat-each=10` nos dois projetos de celular deu 160/160, e a bateria completa rodou duas vezes seguidas, verde.

**Verificação direta:**
- **Oito etapas a 320 e 360 px** (mobile-chrome e mobile-safari): nenhum controle da região fora do gutter, abaixo de 44 px ou com texto vazando.
- **Barra de resumo:** a 320 px o "Summary" fica em 16–304 px, abaixo dos atributos, e a região tem 174 px. A 360 px fica igual a antes (125 px).
- **Painel aberto:** termina no topo da região (a 320 px, 526 contra 526,42; a folga de 0,42 px vem do arredondamento do `--dock-height`, já existente).
- **Capturas** antes e depois das duas correções: idênticas pixel a pixel a 360, 412 e 1024 px, com a barra fechada e com o resumo aberto. A 320 px, só a faixa da região muda.
- **axe**, todas as gravidades: 0 violações na Ancestry, na Attributes e no resumo aberto, a 320, 360, 412 e 1024 px.
- A rolagem não usa `smooth`, então respeita `prefers-reduced-motion`. O foco depois de "Next" não foi tocado (é da FEAT-001).

**Instabilidade encontrada e eliminada.**
- A primeira correção do DEF-002 (`432636b`) usava só `scroll-margin-bottom`, que garante o input oculto, mas não o cartão que desenha o anel. Ela passou numa bateria completa e falhou na seguinte (mobile-safari, 320 px, cartão "Human, your choice"). Repetida, deu 4/10 no WebKit.
- O teste de pior caso (`a2a41c8`) tornou a falha determinística: 40/40 vermelhos nos dois motores com o código do `432636b`.
- A correção `851b60a` levou à vista o contêiner `[data-focus-ring]` só no foco por teclado: depois dela, 10/10 em todas as combinações.
- Na construção do teste houve duas fontes de instabilidade, corrigidas antes do commit: Tab contado enquanto a etapa ainda se acomodava, e rolagem assíncrona do WebKit.

**Achados.** Rework: nenhum. Defeito de design: nenhum. Menores:
1. **Links fora do percurso de Tab do WebKit.** O WebKit pula links no Tab (padrão do Safari), então o foco não escondido em links da etapa só é exercitado no Chromium. Só registro.
2. **Janelas baixas** (registrado no ui-design): a 320 × 568 sobram 394 px com a barra em duas linhas. Sem ação agora.

**RTM.** Sem mudança: o Test ref da NFR-ACC-001 e dos FRs da FEAT-007 já aponta para este relatório.
