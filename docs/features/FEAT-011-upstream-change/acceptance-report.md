# Acceptance Report: FEAT-011 — Mudança a montante

> Veredito: Accepted · Data: 2026-11-19
> Padrão: technical-design.md §6, §5 e §7, ui-design.md @ `1bc9347` · Fontes: srs.md (v1.2.1), use-cases.md (UC-010), ADR-004 (com a emenda `ff9e2f9`), design-manifest.json (SCR-WEB-003, 005, 007, 009)
> Estado auditado: `1bc9347`, sem correção de teste
> Re-verificação: Accepted · 2026-11-25 · DEF-014 (ver a seção no fim)

## Veredito

Aceita. Os 17 critérios têm teste fiel, e nenhum teste precisou de correção. Todas as suítes passaram nesta execução, sem retry e sem instáveis. Sondas locais confirmaram duas coisas que só existiam no jsdom ou no teste:
- **Foco do Apply no Choose → Choose:** confirmado nos 5 projetos.
- **Tempo do diálogo até o fim da animação:** dentro dos 300 ms da NFR-PERF-003, mas com folga de 2 a 16 ms no mobile-chrome 4×.

O teste da NFR-PERF-003 fecha a medida num quadro em que o diálogo ainda tem opacidade 0. Isso fica para decisão do usuário (achado 1). Ficam quatro achados menores, sem bloqueio.

## Tabela de auditoria

| AC | Codifica | Teste(s) | Auditoria | Observado |
| :- | :-- | :-- | :-- | :-- |
| AC-1 | FR-CHG-019; ADR-004 §1; ADR-005 | `schemas.test` (6 testes AC-1, inclusive documentos e logs até a FEAT-009 sem mudança) | fiel | verde |
| AC-2 | FR-CHG-012, 018, 019; UC-010 2b | `evaluate.test` (6 testes AC-2: primeiro válido, desempate pela mais recente, validade por `kind`, vaga aberta sem contar, não geradas por chave, mesma visão com e sem marca) | fiel | verde |
| AC-3 | FR-CHG-001 a 006, 012; UC-010 2 | `impact.test` (12 testes: neta com `parent`, `undone` fora de `setAside`, Taint 1 → 0, `stays`, `restored`, `reopened`, `needsDialog`, pureza) | fiel | verde |
| AC-4 | ADR-004 §1, §4 | `impact.test` (5 testes `settle`: mesmo objeto no assentado; transições iguais às do `impact` na ida e na volta) | fiel | verde |
| AC-5 | FR-STEP-005, FR-CHG-001, 008, 011, 019; FR-LOG-007; UC-010 1–4 | `session.test` (AC-5; D8); `Builder.test` (switch-kept; AC-17 switch-applied) | fiel | verde |
| AC-6 | FR-CHG-018 (parcial), 001; UC-010 1b | `session.test` (AC-6: sem sorteio, mesmas faces, Corruption 1, `restored` por tabela, Size em `setAside`); `Builder.test` (restore-only) | fiel | verde |
| AC-7 | FR-CHG-002; UC-010 1a | `session.test` (AC-7 ×2: troca sem filhas, Choose → Choose sem filha, Reroll na mesma entrada com a filha); `impact.test` (FR-CHG-002) | fiel | verde |
| AC-8 | FR-DEC-015, 016 (parcial), 017; FR-CHG-009, 010; UC-010 3a, 4a | `session.test` (AC-8 ×2; falha no Keep da rerrolagem); `Builder.test` (by-reroll: Keep e Apply) | fiel | verde |
| AC-9 | FR-DEC-018 (parcial), 017, 016 (parcial); UC-010 4a | `session.test` (AC-9 ×3; `roll-effect` com Reroll e Enter result; contador na vaga reaberta); `Builder.test` (decided-choose, mode-switch, replace-kept ×2, effect-reroll) | fiel | verde |
| AC-10 | FR-CHG-018, 019; FR-LOG-007; ADR-004 §3 | `changes.test` (9 testes, as cinco linhas da tabela e a ordem das entradas); `session.test` (AC-10 ×3) | fiel | verde |
| AC-11 | FR-CHG-001, 002; FR-LOG-007; FEAT-009 D13 | `session.test` (FR-STEP-011 AC-11; `clear` direto AC-11; recusas e `retrySave`; D13) | fiel | verde |
| AC-12 | FR-CHG-009 | `session.test` (AC-12: `change-pending` nos quatro comandos, `no-pending`, `retrySave` e `visit` com a pendente, `open` a descarta) | fiel | verde |
| AC-13 | FR-CONT-015, 016; FR-CHG-011, 012; ADR-004 §1 | `session.test` (AC-13 i a v, falha com `retrySave`, `dismissNotice`); `Builder.test` (open-notice) | fiel | verde |
| AC-14 | FR-CHG-019, 018; NFR-REL-001 | `session.test` (AC-14: duas instâncias, valores, livro, `logged` e marca; volta sem nova decisão) | fiel | verde |
| AC-15 | UC-010; ADR-008 fluxo 2; NFR-ACC-001 | `impact.spec` (2 testes × 5 projetos); `ancestry.spec:189` (item 14 do §7) | fiel | verde |
| AC-16 | NFR-PERF-002, 003 | `evaluate.perf.test` (5 casos `evaluate`, 2 `impact`); `perf.spec` (NFR-PERF-003 em `chromium` e `mobile-chrome` 4×) | o E2E mede até o diálogo no DOM, não até ele visível (achado 1) | verde |
| AC-17 | D11 da FEAT-007; C2; FR-CHAR-010 | `session.test` (AC-17 ×2; AC-8 Keep; AC-13 i com a gravação retida); `Builder.test` (AC-17 ×2; by-reroll Keep com `control.hold()`) | fiel | verde |

**Padrão contra as fontes:**
- Todo FR do cabeçalho tem critério.
- Os caminhos do UC-010 que o design cita (principal, 1a, 1b, 2b, 3a, 4a) estão representados.
- Nenhum critério estreita o FR. O Keep da rerrolagem sobe o `rolls` da ativa, e as notas da v1.2.1 na FR-CHG-009 e na FR-DEC-016 dizem que isso não é violação.
- A FR-CHG-014 não é cobrada: não há critério nem teste para ela, o `recalculated` só tem antigo e novo, e o manifesto da SCR-WEB-007 a lista como lacuna da FEAT-019 (D9).

**Diff dos testes** (de `a73dae6^` a `1bc9347`):
- Toda asserção removida ou mudada corresponde a um item de 1 a 14 do §7, inclusive a saída do "aviso sai na próxima ação" (item 13).
- Os títulos dos itens 6 e 12 mudaram como a nota 5 do §8 registra.
- Nenhum `skip`, `only` nem tolerância alargada.
- `vitest`, `playwright.config.ts` e a configuração de cobertura não mudaram.

## Pontos pedidos

**1. NFR-PERF-003: a medida atende ao requisito escrito?** Em parte. Medi três fins na mesma amostra, do `timeStamp` do clique (5 de aquecimento e 40 amostras, 3 rodadas por perfil). Os valores são p95, e o máximo vem entre parênteses:

| Perfil | Diálogo no DOM (fim do teste) | Primeiro quadro pintado | Fim da animação (`animationend` da `.dialog`) |
| :-- | --: | --: | --: |
| chromium 1× | 16,1 a 16,4 ms | 32,7 ms | 232,5 a 233,2 ms (233,9) |
| mobile-chrome 4× | 43,0 a 48,6 ms | 45,4 a 50,7 ms | 284,3 a 298,2 ms (300,5) |

- No quadro em que o teste fecha a medida, a opacidade do `.dialog-overlay` é **0** nas 6 rodadas: o diálogo está no DOM e com o foco, mas não aparece. O §5 do design pede "até o diálogo visível", e a nota 8 do §8 já reconhece que, no meio da animação, a opacidade é parcial.
- Pela leitura mais estrita ("abre" é o fim da animação de 200 ms), o requisito também passa, com folga de 2 a 16 ms no mobile-chrome 4×. Uma amostra isolada passou de 300 ms. Um teste com esse fim seria instável no CI (C13).
- Julgamento: o requisito é cumprido pelas duas leituras. A medida do teste atende à leitura "o diálogo responde (entra na tela e recebe o foco)", não à palavra "visível" do próprio design. Não mudei o teste. Alternativas no achado 1.

**2. Foco depois do Apply no Choose → Choose e na troca de modo para Choose.** Observei nos navegadores, porque a conferência só existia no jsdom (C16). Usei uma sonda local, já descartada: o pacote fictício `test.tables`, servido só por `page.route`, e o personagem gravado direto no IndexedDB.
- **Pelo mouse, nos 5 projetos:** depois do Apply, o foco fica na entrada acionada, agora marcada. Testei a troca de modo para Choose numa rolada (4 → 5–6) e o Choose → Choose de volta (5–6 → 4, restore-only).
- **Pelo teclado, em chromium, firefox e webkit:** seta na grade, Tab até "Apply new result" e Enter. O foco fica na entrada acionada, marcada.
- **Controle com Keep:** a entrada acionada fica com o foco e sem marca, como no replace-kept.
- A sonda registra o elemento focado (papel, nome e `checked`) em vez de só passar ou falhar, então um foco no `body` ou no título apareceria no resultado.

**3. Notas da implementação do §8.** Nenhuma esconde desvio de requisito. Três divergem do texto do ui-design, mas o resultado ou a decisão do usuário estão registrados:

| Nota | Conferido no código | Julgamento |
| :-- | :-- | :-- |
| 1. Foco pelo `opener` da moldura | `Builder.tsx:162–184`. O `opener` é guardado num `useLayoutEffect` quando o `pending` aparece. No Apply sem destino próprio (`appliedTarget` nulo), o foco vai para ele. No Keep, também, ou para o `h1` se ele saiu da tela. | Diverge do mecanismo escrito no applied ("a própria restauração do `Modal`; sem foco programático"). O resultado é o do ui-design nos 5 projetos (ponto 2). |
| 2. "Keep current choice" / "Apply new choice" | `copy.ts:238`, usado em `impactWording` só quando a vaga não é ancestralidade, tabela nem `roll-effect` | Texto de interface inventado sem o ui-design, inalcançável com o conteúdo do MVP (achado 3) |
| 3. Keep depois do Enter no campo da soma | O `opener` é o campo, e o foco volta para ele | Diverge da linha do replace-kept ("Use this result" recebe o foco), mas segue o princípio do kept. A decisão do usuário F2 está registrada. |
| 4. Ordem do teclado da effect-reroll | `TablesStep.tsx:184–193`: a caixa da `roll-effect` vem antes da linha de ações da tabela | Segue o leiaute do decided-roll e a primeira frase da regra de teclado. O ui-design se contradiz na sequência de setas (achado 4). |
| 5. Títulos dos testes | Itens 6 e 12 do §7 | Sem efeito em asserção |
| 6. Pacote `test.rollpast` | Só no `Builder.test.tsx` | Fiel |
| 7. Fixture da T8 | 54 não geradas, 18 `invalid` e 12 `superseded`, conferidas por asserção | Fiel à §5 |
| 8. axe depois da animação; Back sem `page.goto` | `impact.spec.ts:206–209`; `perf.spec.ts` | Fiel. A nota é a evidência do ponto 1. |

**4. AC-17 e C2.**
- **O diálogo abre pelo `pending`:** na sessão, com a gravação anterior retida, `decide('ancestry')` devolve `needs-confirmation` e o `pending` está no snapshot. No `Builder.test`, com as gravações retidas, o diálogo abre e `saved` continua vazio.
- **O Apply mostra o estado novo antes do fim da gravação:** na sessão, com só a gravação do Apply retida (`holdNextSave`), e no `Builder.test`, com o foco no `h2` e a linha "1 set aside".
- **O Keep da rerrolagem mostra o estado novo antes do fim da gravação:** no `Builder.test`, com `control.hold()` só antes do Keep. O diálogo fecha, e o foco vai para "Reroll d6" com o resultado anterior. Na sessão, o snapshot já sem `pending`, com o log de 4 entradas e `rolls: 2`, é lido antes do fim da gravação assíncrona, que ainda tem 2 entradas.
- **O save-failed mantém o estado novo:** depois do Apply (sessão e `Builder.test`, com o alerta da moldura), depois do Keep da rerrolagem e ao abrir com diferença, sempre com `retrySave`.
- **C15:** só o `Builder.test` do AC-17 retém todas as gravações. Ele precisa das duas: a anterior, para o diálogo abrir sem ela, e a do Apply.

**5. Parciais da §6.**
- **FR-CHG-018:** sai só o ajuste ligado. O plano e o RTM dão a parte que falta à FEAT-019.
- **FR-DEC-016:** o plano marca "parcial: Reroll". Com a FEAT-009, cobre as tabelas.
- **FR-DEC-018:** sai só o Write. As cinco linhas da tabela mode-switch, entre Roll, Choose e Enter result, estão cobertas (AC-9; mode-switch).
- **FR-CHG-019:** sai só a exportação de ponta a ponta. O salvamento e a reabertura estão no AC-14.
- **FR-CONT-015 e 016:** não são parciais em escopo. Só o teste usa pacote fictício, porque o pacote do MVP não tem segunda versão.
- **FR-CHG-014:** não é cobrada aqui (D9, FEAT-019).
- **Lacuna de rastreabilidade (achado 2):** o design diz que o Write da FR-DEC-018 entra na FEAT-010 e que a exportação da FR-CHG-019 é da FEAT-002. Nenhuma das duas linhas do plano lista essas FRs, e o Plan ref delas no RTM é só a FEAT-011.

## Testes corrigidos

Nenhum.

## Execução independente

Do zero no Windows 11, com PowerShell e Git Bash, Node 22.15.0, Vitest 5.1.0 e Playwright 1.65.0. A porta 4173 estava livre, e o Playwright fez o build e subiu o `vite preview`.

- `npm run typecheck`, `npm run lint` (com as fronteiras) e `npm run packs:check` ("packs: 2 file(s) valid; no ids removed since HEAD"): verdes.
- `npm run test` (diretório com `C:` maiúsculo): 20 arquivos e 332 testes, verdes.
- `npx vitest run src/engine/evaluate.perf.test.ts --reporter=verbose`: 7 verdes, com os p95 na Verificação direta.
- `npx playwright test --retries=0 --workers=1 --reporter=list`: 199 passaram, 51 foram pulados, 0 falhas e 0 instáveis, em 8,3 min.

| Projeto | Passaram | Pulados | Falhas | Instáveis |
| :-- | --: | --: | --: | --: |
| chromium | 35 | 15 | 0 | 0 |
| firefox | 33 | 17 | 0 | 0 |
| webkit | 33 | 17 | 0 | 0 |
| mobile-chrome | 50 | 0 | 0 | 0 |
| mobile-safari | 48 | 2 | 0 | 0 |

- O `impact.spec.ts` passou nos 5 projetos (2 testes cada), com o contorno do Firefox no caso do axe.
- CI do `1bc9347`, run 44644178061: os jobs `check`, `e2e` e `lighthouse` verdes e o `deploy` pulado. No E2E, "199 passed", sem linha de flaky.
- Migrações: não se aplicam. O IndexedDB continua na v1, e o documento só alarga o `schema: 1` (§4).

## Verificação direta

**NFRs.** Medidas locais, indicativas, Chromium no Windows.

| NFR | Medida | Limite | Observado |
| :-- | :-- | --: | :-- |
| NFR-PERF-002 | `evaluate`, p95 de 200 execuções, fixture com suspensas acumuladas | 20 ms | 0,292 ms |
| NFR-PERF-003 | `impact`, p95 de 200, core (Dwarf completo → Human) | 60 ms | 0,407 ms |
| NFR-PERF-003 | `impact`, p95 de 200, fixture (a0 → a1) | 60 ms | 1,025 ms |
| NFR-PERF-002 | E2E `perf.spec` (FEAT-008), chromium · mobile-chrome 4× | 100 · 200 ms | 16,5 · 43,1 ms |
| NFR-PERF-003 | E2E `perf.spec`, clique → diálogo no DOM, chromium · mobile-chrome 4× | 300 ms | 16,2 · 40,0 ms |
| NFR-PERF-003 | Sonda, clique → fim da animação, chromium · mobile-chrome 4× | 300 ms | 232,5 a 233,2 · 284,3 a 298,2 ms |
| NFR-REL-001 | AC-14 e AC-17 | — | suspensas sobrevivem a gravar e reabrir; o estado novo fica na tela com a falha |
| NFR-ACC-001 | axe com o diálogo aberto (AC-15), 5 projetos | sem grave | 0 violações graves |

Pendente de ambiente: nenhuma. O celular médio da NFR-PERF-003 é aproximado pelo `mobile-chrome` com 4× de CPU, como na FEAT-008.

**Telas, conferidas contra o manifesto.**
- Os estados da SCR-WEB-007 (by-decision, by-reroll, restore-only, dialog-open, kept, applied) e os suplementos da SCR-WEB-003 (switch-with-dependents, switch-kept, switch-applied, switch-back-restores, open-notice, set-aside-line) e da SCR-WEB-009 (decided-roll, decided-choose, mode-switch, replace-with-dependents, replace-kept, replace-applied, effect-reroll) têm teste com os textos do ui-design.
- A SCR-WEB-005 não mudou na tela. O `clear` do ajuste grava a `undone` (AC-11).
- O CSS novo da feature (`builder.css`) não tem valor solto: nenhum px, hex, ms nem rem fora dos tokens.

**Contratos.** O `Snapshot.pending`, o `notice`, `confirm`, `keep`, `dismissNotice`, o `DecideResult` (sem `has-dependents`), o `Impact` e o `Settled` conferem com a §3. A divergência do `slot` em `stays` e a do `recalculated` por id têm emenda (emenda 4 do §8).

## Achados

**Rework:** nenhum.

**Defeito de design:** nenhum.

**Menores:**

1. **A medida da NFR-PERF-003 não mede o diálogo visível.**
   - O que acontece: o E2E fecha a medida no primeiro quadro com o diálogo no DOM, quando a opacidade ainda é 0. O §5 do design diz "até o diálogo visível". Até o fim da animação, o p95 no mobile-chrome 4× fica entre 284 e 298 ms.
   - Alternativas, para decisão do usuário:
     - **(A)** Manter a medida e emendar o §5 (detailed-design) para "até o diálogo no DOM, com o foco; a animação de entrada, de duração fixa por token, fica fora". Prós: estável e com folga. Contras: mede algo que a pessoa ainda não vê.
     - **(B)** Medir até o primeiro quadro pintado (rAF duplo, p95 de 33 e 51 ms). Prós: o diálogo já foi apresentado. Contras: a opacidade ainda é baixa, e a diferença para a medida atual é de um quadro.
     - **(C)** Medir até o `animationend`. Prós: fiel à leitura mais estrita de "abre". Contras: folga de 2 a 16 ms no mobile-chrome 4×, então seria instável no CI (C13).
     - **(D)** A leitura estrita, com uma animação de entrada mais curta (emenda do `design.md` pela ux-foundations). Prós: devolve a folga. Contras: muda o design system por um teste.
   - Recomendação: (A), porque a NFR fala do tempo de resposta, e a animação é decisão do design system.
   - **Para:** o usuário. Pela escolha, o detailed-design (A) ou a correção do teste (B ou C).
2. **Parciais do design sem dono no plano.**
   - O que acontece: o §6 diz que o Write da FR-DEC-018 entra na FEAT-010 e que a FEAT-002 confere a exportação da FR-CHG-019. Nenhuma das duas linhas do plano lista essas FRs, e o Plan ref delas no RTM é só a FEAT-011. Pela regra do RTM, as duas passariam a contar como totalmente verificadas com este aceite. Para não dar isso a entender, o Test ref delas leva `(partial)`, como o design as declara.
   - O mesmo vale, em menor grau, para a FR-DEC-016: o design diz que o "Roll all undecided" (FEAT-010) e a rolagem encadeada (FEAT-012) seguem a mesma regra.
   - **Para:** implementation-planning, numa emenda que acrescente as FRs às linhas da FEAT-010 e da FEAT-002 e os Plan refs no RTM. Sem bloqueio.
3. **Textos de interface sem ui-design.**
   - O que acontece: "Keep current choice" e "Apply new choice" (`copy.ts:238`) foram criados pela implementação para a variante de uma vaga que não é ancestralidade, tabela nem `roll-effect`. Estão marcados como provisórios e são inalcançáveis com o conteúdo do MVP.
   - **Para:** o ui-design da primeira feature em que uma vaga dessas tenha dependentes. Sem bloqueio.
4. **Texto do ui-design atrás da implementação aceita.** O ui-design ainda descreve três pontos de outro modo:
   - o mecanismo do applied ("sem foco programático"; nota 1);
   - o foco do replace-kept com Enter no campo (nota 3, decisão F2);
   - a sequência de setas da effect-reroll, que contradiz a frase anterior (nota 4).

   O comportamento confere ou foi aprovado. **Para:** o ui-design, numa limpeza de texto sem mudança de tela, se o usuário quiser. Sem bloqueio.

Registro, sem ação: o "Status" no topo do tasks.md ainda diz "T1 a T4 feitas". O estágio vem das caixas (C10).

## RTM

Test ref acrescentado (`features/FEAT-011-upstream-change/acceptance-report.md`) em:
- FR-CHG-001, 002, 003, 004, 005, 006, 008, 009, 010, 011, 012; FR-DEC-015, 017; FR-STEP-005; FR-LOG-007; FR-CONT-015, 016; NFR-PERF-003;
- com `(partial)`:
  - FR-CHG-018 e FR-DEC-016, parciais pelo plano;
  - FR-DEC-018 e FR-CHG-019, parciais pelo §6 do design (achado 2);
- NFR-PERF-002, de outra feature, com a guarda das suspensas acumuladas estendida por esta (Design ref da FEAT-011);
- com `(partial)`: NFR-REL-001, NFR-ACC-001, NFR-USE-001, NFR-L10N-001 e NFR-MAINT-002, NFRs das fundações (plano §6).

A FR-CHG-014 fica sem registro (D9, FEAT-019).

## Re-verificação de 2026-11-25: DEF-014

> Veredito: Accepted · Estado auditado: `e327859` (código de `2a160c2`) · Padrão: technical-design.md §6 e ui-design.md, sem mudança (SCR-WEB-007, item 2; com o rolled, item 1, do ui-design da FEAT-009)

**Veredito.** Aceita de novo. A correção do DEF-014 (`docs/defects.md`) dá `--color-text-secondary` ao cálculo e ao "Chosen" das colunas Current e New do diálogo de impacto, pela mesma regra do "Written". Os dois testes vermelhos falham sem a correção, pelo motivo do defeito, e passam com ela. No navegador, a cor computada é a de `--color-text-secondary` nos 5 projetos, e nenhum outro elemento do diálogo mudou de cor. Todas as suítes passaram nesta execução, sem retry. Nenhum achado novo.

**Padrão.** Os 17 critérios da §6 continuam valendo. A manutenção toca a FR-CHG-003 (o diálogo de impacto). O SCR-WEB-007, item 2, pede o cálculo ou "Chosen" da coluna `table` "em `.typography-meta` `--color-text-secondary`". Para a coluna `roll-effect`, ele diz só "o cálculo", que o rolled da FEAT-009 (item 1) define em `.typography-meta` `--color-text-secondary`. O código põe a classe `impact-dialog__calc` nos dois `p` (`ImpactDialog.tsx:245`, `:256`), e o `builder.css` junta o seletor à regra do `.impact-dialog__mode`, sem token novo.

**Mudanças de teste auditadas** (`1935905..e327859`, só `src/ui/screens/Builder.test.tsx`): 157 linhas acrescentadas, nenhuma removida, nenhum teste existente mudado. Nenhum skip, `.only`, retry, timeout aumentado nem mudança de configuração.

| Teste | Commit | Classe | Auditoria |
| :-- | :-- | :-- | :-- |
| DEF-014: coluna `table`, pelo diálogo da rerrolagem da Gnome Past (Choose 4 → Roll 1, com a Madness rolada) | `e4ba028` | teste novo | Fiel ao item 2: o "Chosen" em Current e o cálculo "Rolled d6: 1 · Modifier +0 · Total 1" em New, cada um com `.typography-meta` e exatamente `var(--color-text-secondary)` entre as cores que o `builder.css` lhe dá. |
| DEF-014: coluna `roll-effect`, com o `ImpactDialog` renderizado direto e o impacto calculado pelo motor sobre a sessão real | `e4ba028` | teste novo | Fiel ao item 2 com o rolled da FEAT-009: o texto inteiro das duas colunas e o cálculo de cada uma com a mesma cor. A montagem direta é declarada no teste, porque nenhum fluxo mostra essa coluna (abaixo). |

**Método do teste e falso verde.** O Vitest não aplica CSS, então o teste lê o `builder.css` do disco e confere as declarações `color` das regras cujo seletor casa com o elemento (`Element.matches`). O teste exige exatamente uma cor, então outra regra do `builder.css` que também casasse o faria falhar. O método não vê:
- as outras folhas;
- a cascata entre folhas (especificidade, ordem, `!important`);
- a condição das `@media`, cujas regras ele conta sempre;
- estilo inline.

Por isso, ele daria falso verde se outra folha carregada no Builder desse cor ao elemento ou a `.typography-meta` com precedência maior. Hoje não dá. As folhas do Builder são as do `main.tsx` (fontes do `@fontsource`, `tokens.generated.css`, `base.css` e `print.css`), o `home.css` (a Home é import estático do `App.tsx`) e o `builder.css` (o Builder é `lazy`).
- As fontes não têm `color`.
- O `.typography-meta` do `tokens.generated.css` só define fonte, tamanho, peso, altura de linha e espaçamento.
- O `print.css` está todo sob `@media print`.
- No `base.css` e no `home.css`, nenhuma regra com `color` casa com esses elementos. A única com `.typography-meta` é `.app-header__character .typography-meta`, e o diálogo é renderizado fora do cabeçalho.

A cor computada, medida abaixo, fecha o ponto que o método não alcança.

**Vermelhos conferidos** (produção trocada só no disco, restaurada com `git restore` depois; 3 vezes):

| Teste | Comando | Sem a correção (`ImpactDialog.tsx` e `builder.css` de `349710d`) | Com a correção (`HEAD`) |
| :-- | :-- | :-- | :-- |
| DEF-014 (2 testes) | `npx vitest run src/ui/screens/Builder.test.tsx -t "DEF-014"` | 3/3 rodadas com os dois vermelhos: `:1448` ("Chosen: expected [] to deeply equal [ 'var(--color-text-secondary)' ]") e `:1471` ("Rolled 1d6: 4 · Modifier +0 · Total 4: expected [] …"). Nenhuma regra dá cor ao elemento, que é o defeito. | 3/3 verdes |

**Execução independente.** A mesma da re-verificação da FEAT-009 desta data (DEF-013): `npm ci`, `typecheck`, `lint`, `packs:check` e `build` verdes. `npm test` 3 vezes: 385 testes em 21 arquivos, 3/3 verdes. `npx playwright test --retries=0 --workers=1`, uma worker, nos 5 projetos: 204 passaram, 51 pulados, 0 falhas, 0 instáveis, em 9,2 min. CI do `e327859`, run 45687328926: verde, sem linha de flaky.

**Verificação direta.** O mesmo script da re-verificação da FEAT-009 desta data: fora do repositório e descartado, contra os builds de `e327859` e de `39ab5b5` (a produção de `349710d` é a mesma), com o pacote fictício do `Builder.test.tsx` servido por `page.route`. Perfis: Desktop Chrome, Desktop Firefox, Desktop Safari, Pixel 7 e iPhone 15, 3 rodadas no `HEAD`.
- **Montagem:** Gnome Past escolhida em 4 e Madness rolada em 4, semeadas no IndexedDB. Na Gnome Past, segmento Roll e "Roll d6", com o `crypto.getRandomValues` da página fixo em 0 (face 1), para o diálogo abrir sempre com o mesmo conteúdo. As cores foram lidas por `getComputedStyle` depois da animação de entrada.
- **Cor do cálculo e do "Chosen":** no `HEAD`, o "Chosen" (Current) e "Rolled d6: 1 · Modifier +0 · Total 1" (New) saem `p.typography-meta.impact-dialog__calc` com `rgb(79, 79, 75)`. É a cor de um elemento com `color: var(--color-text-secondary)` posto na mesma coluna, e a de um `p.typography-meta.impact-dialog__mode` (a classe do "Written") posto ali. O texto padrão é `rgb(26, 26, 24)`. 3/3 nos 5 perfis.
- **Nenhum outro elemento mudou de cor:** a cor computada dos 51 elementos do diálogo, comparada um a um com o build de `39ab5b5`, nos 5 perfis. Só os dois `p` diferem: `rgb(26, 26, 24)` antes, herdada, e `rgb(79, 79, 75)` agora. Os outros 49 têm a mesma cor, e a estrutura é a mesma.
- **A sonda discrimina** (C15): contra o build de `39ab5b5`, a comparação com `--color-text-secondary` falha nos 5 perfis nos dois elementos, e só neles.

**Alcance da coluna `roll-effect`.** Nenhum fluxo a mostra, como diz o alcance do DEF-014. Isso foi constatado de três formas:
- **Pela leitura do código:** o diálogo só abre com `needsDialog`, isto é, com algo posto de lado ou restaurado (`src/engine/impact.ts:160`). As colunas mostram a vaga mudada, e uma `roll-effect` não tem vaga filha (o efeito é `add.dice`, sem `grants`), então mudá-la não põe nada de lado nem restaura nada. O pacote do core não tem `roll-effect`.
- **Pelo teste:** o do DEF-014 renderiza o `ImpactDialog` direto, e o `impact` do motor sobre a sessão real é aceito pelo diálogo.
- **Pela sonda:** com a Madness rolada, "Reroll 1d6" e "Enter result" com 6 mudam o resultado ("Entered for 1d6: 6 · Modifier +0 · Total 6") sem abrir diálogo, nos 5 perfis, 3/3.

A cor dessa coluna no navegador, portanto, não foi medida. Ela vem da mesma classe e da mesma regra da coluna `table`, medida acima.

**Achados.** Rework: nenhum. Defeito de design: nenhum. Menores: nenhum.

**RTM.** Sem mudança.
