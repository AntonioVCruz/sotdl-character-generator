# Acceptance Report: FEAT-001 — Home: listar, continuar e excluir personagens

> Veredito: Accepted · Data: 2026-11-14
> Padrão: technical-design.md §3, §6 e §7 @ `e297f60`, ui-design.md @ `b42f799` · Fontes: srs.md, use-cases.md (UC-001 1a), design-manifest.json (SCR-WEB-001), implementation-plan.md §6
> Estado auditado: `1806a9d` (código de `cf813de`, mais as correções de teste abaixo)

## Veredito

Aceita. Os 17 critérios têm teste fiel, depois de quatro reforços e uma correção, todos só em arquivos de teste. Todas as suítes passaram nesta execução: E2E sem retentativa e com uma worker, Vitest dez vezes e Lighthouse nas quatro configurações. Na interface, nas quatro larguras e em dois motores, só falhou um ponto do ui-design: o `aria-busy` de "Delete permanently" durante a exclusão não chega ao DOM. Ele fica como achado menor, sem bloqueio, porque nenhuma AC depende dele; se você o quiser bloqueante, o veredito passa a Rework. Um defeito da fundação de CI vai para o `defects.md` (DEF-007).

## Tabela de auditoria

| AC | Codifica | Teste(s) | Auditoria | Observado |
| :- | :-- | :-- | :-- | :-- |
| AC-1 | FR-CHAR-003, NFR-PERF-001 | `Home.test` (FR-CHAR-003 ×2); `home.spec` (FR-CHAR-001, FR-CHAR-003); `skeleton.spec:45` (sem `/packs/` nem `Builder-*.js` com personagem salvo); `skeleton.spec:61` (vazia); `capacity.spec` | fiel; `skeleton.spec:79` reforçado | verde |
| AC-2 | FR-CHAR-004 | `index.test` (FR-CHAR-004: ordem, empate pelo id, data vazia no fim); `home.spec` (decidir no mais antigo; só navegar); `session.test` (visit sem `updatedAt`) | fiel | verde |
| AC-3 | FR-CHAR-005 | `session.test` (FR-CHAR-005 ×2, inclusive o ajuste opcional); `Home.test` (FR-CHAR-005); `home.spec` ("1 open", "3 open") | fiel | verde |
| AC-4 | FR-CHAR-006 | `session.test` (FR-CHAR-006); `Home.test` (FR-CHAR-006); `home.spec` (Dwarf "Complete") | fiel | verde |
| AC-5 | FR-CHAR-007, FR-FLOW-005, 006 | `router.test` (FR-CHAR-007 ×3, FR-FLOW-005); `last-step.test` (×5, inclusive armazenamento bloqueado); `session.test` (FR-CHAR-007 ×2); `Builder.test` (FR-CHAR-007 ×3); `home.spec` (FR-CHAR-007, com reload) | fiel | verde |
| AC-6 | FR-CHAR-011 | `Home.test` (FR-CHAR-011); `Builder.test` (FR-CHAR-011 ×2) | fiel | verde |
| AC-7 | FR-CHAR-013 | `Home.test` (FR-CHAR-013 ×4); `home.spec` (Cancel; teclado) | sincronização corrigida; dois casos novos | verde |
| AC-8 | FR-CHAR-014 | `index.test` (FR-CHAR-014: documento, metadado e `forget` depois); `storage/index.test` (FR-CHAR-014: documento e metadados removidos; a transação única conferida no código, `src/storage/index.ts:73`, e no navegador, com a transação abortada sem remover nada); `Home.test` (FR-CHAR-014 ×2); `home.spec` (sai e não volta com reload; último → vazio) | fiel | verde |
| AC-9 | FR-CHAR-014, NFR-USE-001 | `index.test` (delete que rejeita; `forget` que lança); `Home.test` (delete-failed; nova tentativa) | um caso novo | verde |
| AC-10 | FR-CHAR-015; UC-001 1a | `Home.test` (FR-CHAR-015); `home.spec` (FR-CHAR-015, FR-CHAR-016) | fiel | verde |
| AC-11 | FR-CHAR-016 | `Home.test` (FR-CHAR-016, nos dois estados, sem região viva); `home.spec` (vazia e com personagem) | fiel | verde |
| AC-12 | FEAT-007 §8; FR-HELP-005 | `index.test` (FR-HELP-005); `Home.test` (FR-HELP-005) | fiel | verde |
| AC-13 | FR-CHAR-001, 003, FR-HELP-004 | `index.test` (FR-CHAR-001 com o metadado novo; FR-HELP-004 ×2); `home.spec` (FR-CHAR-001, FR-CHAR-003: um pedido a `sotdl.core.json`) | fiel | verde |
| AC-14 | FR-CHAR-003 (D1) | `index.test` (FR-CHAR-003 ×2: metadado antigo, registro sem id, estado recalculado); `Home.test` (FR-CHAR-005, metadado antigo) | fiel | verde |
| AC-15 | NFR-CAP-001, NFR-PERF-001 | `capacity.spec` (×2); `lighthouserc.capacity.*` com a guarda dos 100 cartões; `lighthouserc.desktop/mobile` (vazia) | fiel (ver M2) | verde |
| AC-16 | NFR-ACC-001 | `home.spec` (axe ×2; teclado; foco ×2); `Home.test` (foco ×3) | fiel | verde |
| AC-17 | NFR-L10N-001, NFR-USE-001 | textos exatos em `Home.test` e `home.spec`; revisão de `src/ui/home/copy.ts` e `src/ui/copy.ts` contra o ui-design, "Textos" | fiel | verde |

Padrão conferido contra as fontes: as dez FRs do plano para a FEAT-001 têm critério, o UC-001 1a está na AC-10, e nenhum critério estreita o FR que codifica.

## Testes: diff, reforços e correção

**Diff de `src/**/*.test.ts*` e `e2e/` desde `b42f799`.** Nos testes da FEAT-001, as únicas expectativas que mudaram são as do §7: o metadado do `FR-CHAR-001` no `index.test`, o mock do `Home.test`, o `skeleton.spec:77` e o `:86`. As demais mudanças só acrescentam casos ou ampliam ajudantes (`opened` e `setup` com `lastStep` e `holdSave`). As do `builder-dock.spec.ts` e o teste do DEF-003 e do DEF-005 no `Builder.test` são da FEAT-007 (defects.md). Nenhum `.skip` ou `.only` novo; os `test.skip` do `builder-focus.spec` são por projeto, declarados. A configuração de cobertura não mudou.

**Retrabalho do `Home.test.tsx` (`cf813de`).** A causa registrada se confirma: depois de "Cancel", o foco devolvido pelo `Home.tsx` no quadro seguinte tira um menu aberto antes desse quadro, porque o jsdom não tem `inert`. O commit só acrescenta uma espera e não muda nenhuma asserção. Aqui, o arquivo de `cf813de~1` passou 15 de 15, e a oscilação (7 de 15 no ambiente do revisor) não reproduziu. Para conferir a causa, montei o pior caso numa cópia temporária, trocando o `requestAnimationFrame` por quadros de 60 ms:
- `cf813de~1`: 5 falhas em 5, no segundo `openDelete`.
- `cf813de`: 4 em 15 no mesmo ponto, e 8 em 15 no teste "focus goes back to the ···", que tem o mesmo padrão e não foi tocado.

A espera do `cf813de` (foco no "···") também é satisfeita pela devolução de foco do React Aria ao fechar o modal, antes do quadro do `Home.tsx`.

**Correção e reforços**, cada caso novo visto vermelho com a mutação correspondente no código (restaurado depois):

| Commit | O quê |
| :-- | :-- |
| `1806a9d` | AC-7, sincronização: `focusSettledOn` espera o foco no "···", um quadro, e confere o foco de novo. Aplicado aos dois testes de cancelar. Com quadros de 60 ms: 0 em 15. Mutação: cancelar manda o foco ao `h1` → os dois ficam vermelhos. |
| `d19d97c` | AC-7: durante a exclusão, "Cancel" desabilitado e Esc não fecham o diálogo. AC-7: clique no fundo não fecha. AC-9: na nova tentativa, o alerta sai, volta se falhar de novo e o sucesso exclui. |
| `03dd56b` | `skeleton.spec:79`: um cartão só na lista (`getByRole('article')` com `toHaveCount(1)`), equivalente à asserção anterior à T5. |

## Execução independente

Do zero, no Windows 11, com `npm ci`:

| Comando | Resultado |
| :-- | :-- |
| `npx vitest run` ×10 | 18 arquivos, 162 de 162 em todas as 10 execuções |
| `Home.test.tsx` (atual) ×30 | 0 falhas |
| `typecheck`, `lint`, `packs:check`, `build` | ok |
| `E2E_PORT=4291 npx playwright test --retries=0 --workers=1` (a execução que vale; porta livre, servidor novo) | 164 passed, 36 skipped (por projeto), 0 falhas, 6,3 min |
| `E2E_PORT=4292 npx playwright test --retries=0` (workers padrão, informação) | 164 passed, 36 skipped, 0 falhas, 1,0 min |
| `npm run lighthouse` | as quatro asserções passam |
| `dist/` | nenhum código da semente nem da medição (`seedCharacters`, "Seed NNN", puppeteer, lighthouse) |

Nenhuma queda de navegador (GraphicsCriticalError ou outra) em nenhuma execução. O resíduo de ambiente do DEF-003 não apareceu.

## Verificação direta

Um script fora do repositório dirigiu o build pelo `vite preview` (porta 4293), no Chromium e no WebKit, a 1440, 1024, 412 e 320 px. Em cada combinação passaram 41 de 42 conferências:
- **Estados dos cartões:** personagem novo "Creating · 1 open"; Dwarf "Complete"; Human com Size adiado "Creating · 3 open" no topo.
- **Ordem:** decidir no mais antigo o leva ao topo; navegar por Next, Back e mapa ou seletor não reordena.
- **Continue:** abre na última etapa visitada, também depois de recarregar e por link direto sem etapa.
- **Exclusão:** Cancel, Esc, clique no fundo, falha (transação abortada pelo navegador) com o diálogo aberto e o aviso, nova tentativa lenta (transação mantida aberta 1,5 s) com o alerta fora e Esc e Cancel sem efeito, sucesso com vizinho, e o último personagem levando ao estado vazio. As chaves de última etapa são apagadas.
- **Falha da lista:** com o IndexedDB bloqueado, o aviso aparece no lugar do estado vazio, e "New character" continua, com a própria falha.
- **Grade e rolagem:** 4, 3, 1 e 1 colunas, sem rolagem horizontal; o diálogo e os botões ficam dentro da janela.
- **Foco, todos os casos das tabelas "Foco na Home" e "Builder frame focus":** carregamento inicial, recarga e link direto não movem o foco. A navegação interna põe o foco no `h1` (Home, New character, Continue, Next, Back, mapa a 1440, seletor abaixo de 1280). Com `?slot=`, o foco vai à vaga. O menu abre no primeiro item, o diálogo em "Cancel", cancelar volta ao "···", excluir vai ao `h2` vizinho ou a "No characters yet", e na falha o foco fica em "Delete permanently".

A única falha, nas oito combinações, é o `aria-busy` (M1). As capturas conferem com o ui-design (layout, pílulas, diálogo empilhado a 320 px, alerta de falha).

**Medidas** (locais, indicativas; Lighthouse 13.6.0, mediana de 3):

| Medida | `b42f799` | HEAD | Elemento LCP no HEAD |
| :-- | :-- | :-- | :-- |
| Home vazia, desktop | 208 ms | 529 ms | `div.card > p` do estado vazio ("For each rule…") |
| Home vazia, móvel | 756 ms | 2559 ms (TTI 2559) | `div.card > p` do estado vazio ("This generator…", 346×81) |
| 100 personagens, desktop (NFR-CAP-001, ≤ 2,5 s) | 209 ms | 208 ms | `p` do aviso "só neste navegador" |
| 100 personagens, móvel (NFR-CAP-001, ≤ 4 s) | 757 ms | 758 ms | `p` do aviso "só neste navegador" |

- **A alta de 0,76 s para 2,56 s no celular.** Em `b42f799`, a Home não tinha texto de estado vazio, e o LCP era o `h1` "My characters", pintado no FCP. No HEAD, o parágrafo do estado vazio é maior que o `h1` e só aparece depois do `listCharacters`. A simulação do Lighthouse o põe no fim do trabalho de JS (LCP = TTI). A decomposição observada no relatório, sem throttling, é pequena: TTFB 5 ms e render delay 170 ms no móvel; TTFB 4 ms e render delay 132 ms no desktop. A meta de 4 s continua com 1,44 s de folga.
- **CI:** as quatro asserções passaram no job `lighthouse` (run 43549914062), mas o CI nunca publicou os valores (DEF-007).
- **Tempo do job `lighthouse` no CI:** 84 s antes da T7 (run 43484475764). Depois dela, de 161 a 199 s (runs 43486021825, 43487234872, 43525718280, 43530513623, 43549914062), dentro da estimativa da D8. Continua abaixo do job `e2e` (354 a 438 s), então o tempo total do CI não muda.
- **Complemento da NFR-CAP-001:** 100 cartões na tela em 94 ms (mediana de 5, desktop) e em 364 ms com CPU 4× mais lenta.
- **NFR-REL-001:** última etapa gravada 15 a 22 ms depois do clique em Next. Exclusão concluída (`complete` da transação) 14 a 17 ms depois do clique no Chromium, e 36 a 39 ms no WebKit.

**Pendente de ambiente:** o LCP no site publicado (o GitHub Pages ainda não está ativo; `initial-deployment`) e os valores do CI (DEF-007).

## Achados

**Rework:** nenhum. **Design defect:** nenhum.

**Menores:**
- **M1. `aria-busy` de "Delete permanently" não chega ao DOM** (dono: feature-implementation; se o `Button` do React Aria não permitir, emenda do ui-design). O ui-design (delete-confirm, "Excluindo") pede `aria-busy`, e o `DeleteDialog.tsx` passa a prop. O `Button` do `react-aria-components` 1.22.1 a descarta (`filterDOMProps`): no lugar, com `isPending`, põe `aria-disabled` e anuncia o rótulo do botão. Observado no jsdom e nas oito combinações de navegador e largura. O teste não foi acrescentado, para o `main` não ficar vermelho; a correção começa por ele.
- **M2. Com 100 personagens, o LCP é o aviso "só neste navegador", não os cartões** (dono: detailed-design, D8). A NFR-CAP-001 é atendida como escrita (meta de LCP), mas a medida não acusaria uma piora na pintura dos 100 cartões. O complemento acima (94 e 364 ms) é a medida que os vê.
- **M3. O retrabalho do `cf813de` resolveu só em parte a oscilação** (dono: feature-implementation; já corrigido em `1806a9d`). Fica registrado: a espera "foco no ···" não prova que o quadro pendente do `Home.tsx` rodou.

**Registrado fora deste relatório** (comportamento aceito de outra entrega): DEF-007, o job `lighthouse` do CI não publica `.lighthouseci/`, porque o `upload-artifact` ignora pastas ocultas (`include-hidden-files: false`).

## RTM

Test ref acrescentado com `features/FEAT-001-home/acceptance-report.md`:
- nas FRs da FEAT-001 (FR-CHAR-003, 004, 005, 006, 007, 011, 013, 014, 015, 016) e na NFR-CAP-001;
- nas FRs de outras entregas que a FEAT-001 mudou, sem "(partial)": FR-CHAR-001, FR-FLOW-006, 007, 008, FR-HELP-004 e 005;
- com "(partial)", pela regra do plano §6: NFR-PERF-001, NFR-ACC-001, NFR-USE-001, NFR-L10N-001, NFR-REL-001, NFR-PRIV-001, NFR-COMP-002 e NFR-MAINT-002.
