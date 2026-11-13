# Acceptance Report: FEAT-008 — Etapa Attributes: ajuste ±1, características com fórmula e composição

> Veredito: Accepted · Data: 2026-11-12
> Padrão: technical-design.md §6 e §5, ui-design.md @ `e3a06ce` · Fontes: srs.md, use-cases.md (UC-004), design-manifest.json (SCR-WEB-005), architecture.md §10
> Estado auditado: `9979aed` (código de `84d43fd` mais as correções de teste abaixo)

## Veredito

Aceita. Os 15 critérios têm teste fiel, depois de dois testes reforçados (só arquivos de teste). Todas as suítes passaram nesta execução, local e no CI. A NFR-PERF-002 ficou bem abaixo dos limites nos dois perfis, e a NFR-REL-001, abaixo de 1 s nos três motores medidos. Ficam três achados menores, sem bloqueio: dois na moldura da FEAT-007 e um só registro.

## Tabela de auditoria

| AC | Codifica | Teste(s) | Auditoria | Observado |
| :- | :-- | :-- | :-- | :-- |
| AC-1 | FR-STEP-007, FR-CALC-003; UC-004 1 | `core-view.test` (FR-STEP-007; FR-CALC-003); `attributes.spec` (FR-STEP-007, FR-CALC-003) | fiel | verde |
| AC-2 | FR-STEP-009, FR-CALC-002, FR-CALC-001; UC-004 3 | `evaluate.test` (FR-STEP-009; FR-CALC-002); `session.test` (FR-STEP-009: documento gravado comparado inteiro); `attributes.spec` (FR-STEP-009, FR-CALC-002, FR-CALC-009) | fiel | verde |
| AC-3 | FR-STEP-010; UC-004 3b | `session.test` (FR-STEP-010); `Builder.test` (FR-STEP-010); `attributes.spec` (FR-STEP-010) | fiel | verde |
| AC-4 | FR-STEP-011; UC-004 3a | `session.test` (FR-STEP-011 ×2); `attributes.spec` (FR-STEP-011, FR-CALC-009) | fiel | verde |
| AC-5 | FR-CALC-009 (parcial), NFR-REL-001; UC-004 4 | `core-view.test` (FR-CALC-009); `attributes.spec` (etapa, resumo e recarga) | fiel | verde |
| AC-6 | FR-CALC-005 (parcial) | `evaluate.test` (FR-CALC-005); `formula.test` (FR-CALC-005) | fiel | verde |
| AC-7 | FR-CALC-006, 007 | `core-pack.test` (FR-CALC-006); `evaluate.test` (FR-CALC-006, FR-CALC-007 ×2); `Builder.test` (FR-CALC-002, FR-CALC-007) | fiel | verde |
| AC-8 | FR-CALC-008 | `formula.test` (FR-CALC-008) | fiel | verde |
| AC-9 | FR-STEP-008 (exibição), FR-FLOW-011; lição 4 | `attributes.spec` (FR-STEP-008) | fraco, corrigido | verde |
| AC-10 | FR-STEP-009; ADR-003 §6 | `evaluate.test` (FR-STEP-009 ×2); `core-view.test` (FR-FLOW-001); `Builder.test` (FR-STEP-009) | fraco, corrigido | verde |
| AC-11 | FR-STEP-011, D8 da FEAT-007 | `session.test` (FR-STEP-011: has-dependents… AC-11) | fiel | verde |
| AC-12 | FR-CALC-006; ADR-004 §2 | `schemas.test` (FR-CALC-006 ×3, FR-STEP-009 ×2); `npm run packs:check` | fiel | verde |
| AC-13 | NFR-PERF-002 | `perf.spec`; guarda `evaluate.perf.test` (×2) | fiel (mutação) | verde |
| AC-14 | UC-004; ADR-008 fluxo 1 | `attributes.spec` (6 testes × 5 projetos) | fiel | verde |
| AC-15 | FR-FLOW-001, FR-FLOW-014; D2 | `core-view.test` (FR-FLOW-001; FR-FLOW-014 ×2); `evaluate.test` (FR-FLOW-001); `attributes.spec` (mapa com Dwarf e Human) | fiel | verde |

Padrão conferido contra as fontes: todo FR do plano para a FEAT-008 tem critério, e UC-004 1, 3, 3a, 3b e 4 estão representados (o passo 2 é da FEAT-016; a FEAT-008 só exibe a pendência). A FR-CALC-005 e a FR-CALC-009 entram como parciais, conforme o plano. Nenhum critério estreita o FR que codifica. Os quatro limites e o ajuste do pacote foram conferidos no PDF do core: impressas 10 (ajuste), 34 (Defense e Perception ≤ 25, Healing Rate mínimo 1) e 35 (Insanity até a Will).

## Divergências decididas na implementação

As três foram conferidas no diff dos testes (`4c7a3c2^..84d43fd`). Nenhuma enfraquece o que o teste provava:

- **Terceira expectativa da FEAT-007** (`session.test`, `FR-CONT-006: renaming the entity…`; `8967a70`, anunciada em `6c1a153`): só o valor esperado muda, de `['done', 'not-started']` para `['done', 'open']`, com `toEqual` exato, como manda a regra nova do §3.3 (o boost do Gnome, concedido em Traits, abre a etapa). O resto do teste (decisões vivas, nome novo, documento) ficou igual.
- **Teste da T2 em `Builder.test`** (`e0940ff`): a verificação do texto do fallback virou a do card "Score adjustment" com "Optional. You can make it once.", porque a etapa passou a ter tela própria. As duas verificações de que não há pendência continuaram. O contador do cabeçalho, porém, não era conferido, e é nele que a vaga podia aparecer como pendência: reforçado (AC-10, abaixo).
- **Emenda do ui-design (WCAG 2.5.3)** (`e3a06ce`, código em `28de681`): o nome acessível passou a vir do conteúdo. Os testes ficaram mais estritos, não menos: o nome da característica agora inclui a linha de fórmula com os limites ("Healing Rate 3 Health / 4, rounded down, minimum 1"), e o do atributo inclui o modificador. O `perf.spec.ts` acha a linha pelo nome começando por "{Attribute} ", como pede o §5.
- **`label-content-name-mismatch` roda sem filtro.** No axe-core 4.14.0 a regra está habilitada, não é experimental e tem a tag `wcag21a`, que o `withTags` do teste inclui. O teste não desliga regra nenhuma: só exclui o nó `[data-live-announcer]`. Mutação: com um `aria-label` "{Name}, {total}" no gatilho de composição, o `NFR-ACC-001` da etapa Attributes ficou vermelho com `label-content-name-mismatch` em 28 nós. Restaurado depois.

Configuração: nenhuma mudança em `vitest`, `playwright.config.ts`, `package.json` nem no workflow ao longo da feature. O único `test.skip` novo é o do `perf.spec.ts` fora do Chromium, previsto no §5.

## Testes corrigidos

- **AC-9** (`9979aed`): o E2E conferia o FallbackStep só em Story e em Professions & languages, mas o critério diz "Story a Review". Agora visita também Wealth & equipment, Interesting thing, Roleplaying e Review e confere o fallback e a ausência do card de ajuste em cada uma.
- **AC-10** (`9979aed`): `FR-STEP-009: the optional adjustment slot is not shown as pending in the step` agora confere também o cabeçalho: "Nothing required" e nenhuma pílula "{n} open".

Mudança de artefato de teste, fora das correções: `f5d763f` faz o `perf.spec.ts` escrever o p95 de cada perfil no log e, no CI, no `GITHUB_STEP_SUMMARY`. Antes, o JSON só ia para o relatório HTML, que o CI só sobe quando o job falha. Limites, perfis, amostras e método ficaram iguais.

Teste de mutação: com uma espera ativa de 120 ms no `evaluate`, o `perf.spec.ts` no `chromium` ficou vermelho (p95 251,6 ms, limite 100). Restaurado depois.

## Execução independente

Do zero, com os comandos do AGENTS.md (Windows, PowerShell, sem servidor em execução, porta padrão 4173):

- `npm ci`, `typecheck`, `lint` (fronteiras), `packs:check` (2 arquivos, nenhum id removido) e `build`: verdes.
- `npm test`: 111 testes, 17 arquivos, verdes antes e depois das correções.
- `npm run e2e`: 72 passaram e 3 foram pulados (o `perf.spec` em firefox, webkit e mobile-safari, como previsto), sem retry, antes e depois das correções.
- CI no `f5d763f` (run 43337705013): os 4 jobs verdes (`check`, `e2e`, `lighthouse`; `deploy` pulado, Pages ainda desligado). No E2E, 72 passaram e 3 foram pulados, sem flaky.
- Migrações: não se aplicam (IndexedDB v1 sem mudança; o documento só alarga a união, §4).

## Verificação direta

- **Fluxo pela interface:** Dwarf → Attributes → selecionar → prévia → aplicar → segunda tentativa → desfazer → novo ajuste → recarregar, e Human com o +1 pendente, observados nas capturas e nos E2E. Na etapa Ancestry, a prévia Dwarf → Human mostra "Ancestry: Done → 1 open", "Attributes: Done → 1 open" e "Professions & languages: Not started → 1 open" (AC-15), e o mapa mostra Attributes "Done" com Dwarf, antes de escolher Human.
- **Só com teclado** (Chromium e WebKit): Tab até o grupo de subir, setas, Tab ao grupo de baixar, Espaço, Tab para "Apply adjustment" e Enter, e o foco vai para "Applied: …". No grupo só leitura, setas e Espaço não mudam a seleção. "Undo adjustment" com Enter leva o foco ao `h2` "Score adjustment", e o Disclosure abre com Enter. Ordem dentro da etapa: linhas de atributo → grupos → ação → características, como no ui-design (ver achado menor 2 sobre o foco inicial).
- **Telas contra o manifesto:** os estados `default`, `selecting`, `applied`, `undone` e `increase-pending` renderizam a 1440, 1024, 412 e 320 px. O `segmented-control` vira grade de 2 colunas no celular (E5), sem rolagem horizontal da página em nenhuma largura. `save-failed`, `loading` e `error` são os da moldura da FEAT-007, cobertos pelos testes dela.
- **Contratos:** `DecideResult` com `already-decided` e `not-decided`, `clear`, `Stage` `modifier`/`limit` e `CharacteristicSummary.limits` conferem com a §3.2–§3.3.
- **Propriedade intelectual:** o diff de `packs/` só traz ids, números, `regime`, a vaga e limites. O `src/engine` de produção não cita id de livro, etapa ou ancestralidade (só exemplos em comentários).
- **Capturas** (fora do repositório): `C:\Users\vicen\AppData\Local\Temp\claude\C--Users-vicen-Projects-sotdl-character-generator\b801d03b-3fc1-4f88-8923-cb3d4b212ae0\scratchpad\feat-008-screens\`. São `chromium-1440-*` (desktop), `chromium-1024-*` (intermediário) e `mobile-chrome-412-*` e `mobile-chrome-320-*` (celular), cada uma com default, seleção com prévia, aplicado com composição aberta, desfeito e Human com +1 pendente, mais a prévia Dwarf → Human.

**NFRs:**

| NFR | Medida | Resultado |
| :-- | :-- | :-- |
| NFR-PERF-002 | Método do §5. **Local** (AMD Ryzen 9 7900X3D, 12 núcleos, 47 GB, Windows 11, Node 22.15, Playwright 1.65, `perf.spec` sozinho, 1 worker, 3 execuções): `chromium` p95 15,7 / 15,9 / 16,0 ms (limite 100); `mobile-chrome` com 4× de CPU p95 53,4 / 56,2 / 66,8 ms (limite 200). **CI** (GitHub-hosted `ubuntu-latest`, imagem ubuntu-26.04, run 43337705013): `chromium` p95 14,5 ms; `mobile-chrome` 4× p95 57,7 ms. Guarda do `evaluate` (200 execuções): local 0,095 ms (core) e 0,242 ms (fictício); CI 0,291 e 3,252 ms (limite 20). A máquina local fica bem acima de um "notebook médio": os números locais são indicativos, e a folga de 6× no desktop e de 3× no celular é o que sustenta o veredito. | passa |
| NFR-REL-001 | Do clique em "Apply adjustment"/"Undo adjustment" até a transação `readwrite` concluída no IndexedDB (20 amostras por projeto, local): `chromium` 14–21 ms; `webkit` 55–59 ms; `mobile-safari` 51–58 ms (limite 1 s). Janela entre a tela atualizada e a gravação concluída: `chromium` 1–6 ms; `webkit` 39–44 ms; `mobile-safari` 28–44 ms. Na FEAT-007 (D11) a janela aceita era de 7–11 ms, no Chromium. Fechando a aba depois de aplicar: com 0 ms, perdida nos três; com 10, 25, 50, 100 e 250 ms, mantida nos três. O `attributes.spec` espera a gravação antes de recarregar, o que é correto: a recarga é imediata, por automação. | passa (ver achado menor 3) |
| NFR-ACC-001 | axe sem violação grave na etapa com ajuste aplicado, nos 5 projetos, com `label-content-name-mismatch` ativa (mutação acima). Ações só com teclado: ver acima. A revisão manual WCAG completa das telas do MVP continua para antes da publicação. | passa |
| NFR-USE-001 / NFR-L10N-001 | Texto visível nos estados capturados, nas 4 larguras: só inglês, sem id, `kind`, "slot" nem "stage". Textos conferem com o ui-design §Textos. | passa |
| NFR-MAINT-002 | Todo teste novo começa pelo FR ou NFR que verifica. FR-CALC-002, 003, 005, 006, 007, 008 e 009 têm teste automatizado. | passa |

## Achados

**Rework:** nenhum.

**Defeito de design:** nenhum.

**Menores:**

1. **A barra fixa do celular passa 15 px da tela a 320 px** (moldura SCR-WEB-016, `src/ui/styles/builder.css`, `.builder__dock` e `.summary-bar`). A 320 px, "Next" e "Summary" terminam em 335 px, e a borda direita deles fica cortada. A 360 e a 412 px, o gutter de 16 px está certo. Acontece igual na etapa Ancestry, e a FEAT-008 não mexeu nesses estilos: vem da FEAT-007. Não perde função (`design.md` §5: "reflow a 320 CSS px sem perder função"), e a página não rola na horizontal, porque elementos fixos não contam no `scrollWidth`. Por isso a verificação de reflow da FEAT-007 não pegou o problema. **Para:** correção de manutenção (sdlc-orchestrator: teste que falha, correção na moldura, re-verificação), com um E2E que meça a borda dos controles fixos a 320 px.
2. **Foco depois de "Next"** (moldura, `Builder.tsx`). Ao trocar de etapa por "Next", o foco fica no próprio botão, no fim do `main`, e o primeiro Tab vai ao resumo vivo, não ao começo da etapa nova. O ui-design da FEAT-007 não define o foco na troca de etapa. **Para:** ui-design da moldura, na próxima feature que a tocar (ou na FEAT-022). Decidir se o foco vai ao `h1` da etapa nova, como já acontece no atalho de Open decisions.
3. **Janela entre a tela e a gravação no WebKit** (D11). É de cerca de 40 ms, contra os menos de 10 ms do Chromium registrados na FEAT-007. Fechar a aba a 10 ms já mantém a decisão nos três motores, e o clique-gravação fica muito abaixo de 1 s. Só registro; nenhuma ação.

## RTM

Test ref acrescentado (`features/FEAT-008-attributes-step/acceptance-report.md`) em: FR-STEP-007, 009, 010, 011; FR-CALC-002, 003, 006, 007, 008; FR-CALC-005 e FR-CALC-009 com `(partial)`; FR-FLOW-001, 009 e 014 (comportamento mudado pela FEAT-008: estado da etapa, regime e linha de regra da Attributes, prévia com par e com linhas de etapa); NFR-PERF-002; NFR-REL-001, NFR-ACC-001, NFR-USE-001, NFR-L10N-001 e NFR-MAINT-002 com `(partial)`, porque valem para o produto todo (Plan ref "Foundations") e este relatório só as verifica na etapa Attributes.
