# Acceptance Report: FEAT-009 — Decidir uma tabela: Roll, Choose, Enter result

> Veredito: Accepted · Data: 2026-11-17
> Padrão: technical-design.md §6 e §5, ui-design.md @ `887c808` · Fontes: srs.md (v1.2), use-cases.md (UC-005, UC-006), design-manifest.json (SCR-WEB-009, SCR-WEB-003)
> Estado auditado: código de `887c808`, mais a correção de nomes de teste abaixo (só artefatos de teste)
> Re-verificação: Accepted · 2026-11-25 · DEF-013 (ver a seção no fim)

## Veredito

Aceita. Os 17 critérios têm teste fiel. A única correção foi de rastreabilidade: o número do AC entrou no nome dos testes do AC-3 e do AC-16, sem mudar nenhuma asserção. Todas as suítes passaram nesta execução, sem retry e sem instáveis. A NFR-PERF-001 ficou em 2,56 s no celular, com o mesmo elemento LCP da base, e a NFR-PERF-002 bem abaixo do limite. A sonda com a gravação retida confirmou o AC-14 em Chromium, Firefox e WebKit, e falhou contra um build quebrado de propósito. Ficam dois achados menores, sem bloqueio.

## Tabela de auditoria

| AC | Codifica | Teste(s) | Auditoria | Observado |
| :- | :-- | :-- | :-- | :-- |
| AC-1 | FR-STEP-012 (parcial), FR-STEP-013; UC-006 1, 1a | `core-pack.test` (FR-STEP-013; FR-STEP-012); `core-view.test` (FR-STEP-012); `Builder.test` (FR-STEP-012… AC-1, AC-2; FR-DEC-012, FR-STEP-013… AC-1, AC-6; FR-STEP-012: fallback); `story.spec` (FR-STEP-012… AC-1, AC-16) | fiel | verde |
| AC-2 | FR-DEC-001, 002, 004 | `evaluate.test` (FR-DEC-001, 002, 004); `Builder.test` (AC-1, AC-2); `story.spec` (frases do regime; sem Enter result na Age) | fiel | verde |
| AC-3 | FR-DEC-005; ADR-009 | `dice/index.test` (5 testes, 8 casos: 3d6, d20, rejeição, valor logo abaixo do limite, volta de resíduos, em d6 e d20) | fiel (mutação); nome sem o AC, corrigido | verde |
| AC-4 | FR-DEC-005, 007, 016 (parcial), FR-CALC-001; UC-005 1–4 | `session.test` (FR-DEC-005, FR-DEC-016… AC-4; modificador da versão vigente); `evaluate.test` (FR-DEC-007, FR-DEC-016); `Builder.test` (FR-DEC-007, FR-DEC-008… AC-4, AC-5); `story.spec` (faces, total e faixa coerentes) | fiel | verde |
| AC-5 | FR-DEC-008; UC-005 3a | `evaluate.test` (FR-DEC-008, 012); `Builder.test` (AC-4, AC-5); `story.spec` ("No text added for this entry · CORE p.18") | fiel | verde |
| AC-6 | FR-DEC-012, 024; UC-005 2a | `evaluate.test` (FR-DEC-008, 012; FR-DEC-024); `session.test` (FR-DEC-024… AC-6); `Builder.test` (AC-1, AC-6); `schemas.test` (FR-DEC-024 ×2) | fiel | verde |
| AC-7 | FR-DEC-019, 020; UC-005 2c, 2f | `session.test` (3 testes AC-7); `Builder.test` (FR-DEC-019, 020… AC-7; Cancel) | fiel | verde |
| AC-8 | FR-STEP-014, FR-DEC-011; UC-006 4 | `evaluate.test` (FR-STEP-014, FR-DEC-011; FR-STEP-014… AC-8); `session.test` (FR-STEP-014… AC-8; FR-DEC-024 has-dependents… AC-8); `Builder.test` (FR-STEP-014, FR-DEC-011… AC-8) | fiel | verde |
| AC-9 | FR-CALC-010, 011, 005 (parcial); UC-005 4 | `core-pack.test` (FR-CALC-010); `core-view.test` (FR-CALC-010… AC-9); `evaluate.test` (FR-CALC-010; FR-CALC-011; FR-CALC-005 ×2, AC-9); `story.spec` (Corruption 1, composição, recarga) | fiel | verde |
| AC-10 | FR-LOG-001, 002, 004, 010 | `session.test` (FR-LOG-001, 002, 004, 010… AC-10; FR-LOG-001 ancestralidade; recusas, `clear` e `retrySave`… AC-10; D13… AC-10); `schemas.test` (FR-LOG-001 ×2) | fiel | verde |
| AC-11 | D5; D8 da FEAT-007 | `session.test` (D5… AC-11; D8… AC-11); `Builder.test` (FR-FLOW-003 (AC-11)) | fiel | verde |
| AC-12 | FR-FLOW-001, 010, 011; FR-CHAR-005, 006 | `core-view.test` (FR-CHAR-005, FR-CHAR-006… AC-12); `evaluate.test` (FR-FLOW-001); `Builder.test` (FR-FLOW-011… AC-12; "Decide now"); `story.spec` (Open decisions · 6, atalho, "6 of 6 decided", "Complete"); `home.spec` ("Creating · 6 open") | fiel | verde |
| AC-13 | NFR-REL-001; ADR-004 §5 | `session.test` (NFR-REL-001… AC-13: reabrir sem sortear); `story.spec` (recarga com o mesmo cálculo) | fiel | verde |
| AC-14 | D11 da FEAT-007; C2; FR-CHAR-010 | `Builder.test` (4 testes AC-14, gravação retida por `holdSave`) | fiel | verde |
| AC-15 | FR-CONT-008 (parcial); ADR-003 §7 | `schemas.test` (FR-CONT-008 ×6, um deles AC-15); `npm run packs:check` | fiel | verde |
| AC-16 | UC-005, UC-006; ADR-008 fluxo 1; NFR-ACC-001 | `story.spec` (3 testes × 5 projetos); `builder-dock.spec` (2 testes × 2 larguras, só celular) | fiel; nomes sem o AC, corrigidos | verde |
| AC-17 | FR-CONT-015, 016 (parte do motor); FR-CHG-015 revista; FR-SRC-009; D2, D3; D40 | `evaluate.test` (FR-CONT-015… AC-17 i; … AC-17 ii; FR-CONT-016, FR-SRC-009… AC-17 iii, iv, v) | fiel ao critério emendado | verde |

**Padrão contra as fontes.**
- Todo FR do cabeçalho do design tem critério.
- Os caminhos do UC-005 que a feature realiza estão representados: o principal e o 2a, 2c, 3a e 2f. Do UC-006, o 1, 2, 4 e 1a. O 2b, 2d, 2e, 3b, 3c (subdecisões de entidade) e 3d são da FEAT-010 e da FEAT-011, como diz o plano.
- As parciais seguem o plano: FR-STEP-012 sem Write, FR-DEC-016 só na primeira rolagem, FR-CALC-005 só com `define` e `sum`, FR-CONT-008 sem concessões nem ligações.
- Nenhum critério estreita o FR que codifica. O AC-7 segue a FR-DEC-019 revista na v1.2: a soma de cada expressão, sem modificador.

## Pontos pedidos

1. **AC-3 e AC-16 cobrem o que o critério diz.**
   - **AC-3:** os testes do `src/dice/index.test.ts` conferem três sorteios no 3d6 e faces de 1 a 6, e um sorteio no d20. Com uma fonte fixa, um valor no limite e um acima dele são descartados e o seguinte vale; o valor logo abaixo do limite é aceito; duas voltas de resíduos dão cada face o mesmo número de vezes, em d6 e d20.
     - Mutação 1, sem a rejeição: os dois casos de descarte ficaram vermelhos.
     - Mutação 2, um número uniforme de 3 a 18 no lugar das três faces: o caso do 3d6 ficou vermelho.
     - O código foi restaurado com `git checkout` depois de cada uma.
   - **AC-16:** o fluxo inteiro está no `story.spec.ts`, a partir de "New character", nos 5 projetos. Ele escolhe a Hatred e rola a Age (faces de 1 a 6, total igual à soma, entrada entre as faixas reais da Age e contendo o total). Depois escolhe o Background 1 e vê Corruption 1 e a parcela "Dwarf Background: 1", recarrega e vê o mesmo cálculo, rola as outras três, vê "6 of 6 decided" e "Complete" na Home. Também rodam o axe da Story e os dois testes da Story no `builder-dock.spec.ts`.
   - Os nomes ganharam o AC (ver "Testes corrigidos").
2. **AC-17 (iv) está coberto, e a pendência está registrada.**
   - O teste troca só a procedência da tabela nas regras (`replacedBy`, outro livro). A vaga reabre, a outra tabela continua decidida, e com as regras anteriores a mesma decisão volta, sem mudar o documento nem o log.
   - Isso é o que o critério emendado pede ("regras em que a procedência da tabela é outro livro").
   - O caminho com `replaces` e um segundo livro está no §8 do design ("Verificação adiada") e no T3, para a FEAT-005 e a FEAT-024. A linha da FEAT-024 no plano já tem a FR-CHG-015. A da FEAT-005 não cita a pendência (achado menor 2). Não é lacuna desta feature.
3. **NFR-ACC-001 no Firefox: a cobertura nos 5 projetos é adequada.**
   - Nos outros quatro projetos, o axe roda na página da interação. No Firefox, roda numa página nova do mesmo contexto, depois de esperar a gravação, e analisa o mesmo estado: Hatred escolhida, Age rolada, Background 1, "3 of 6 decided".
   - Conferido de duas formas, por uma sonda fora do repositório:
     - **O DOM é o mesmo.** O `main` serializado de forma canônica (atributos em ordem, ids do React Aria normalizados, `checked` pela propriedade) é igual na página da interação e na página nova, em Chromium, Firefox e WebKit, 2 de 2 em cada. A única diferença bruta é a ordem dos atributos e o atributo `checked`, que o React só escreve na primeira renderização.
     - **O axe no Firefox, na mesma página da interação,** com localizadores só por CSS, sem `getByRole` com `name`: 0 violações, 3 de 3, sem "Page crashed".
   - O contorno deixa de fora só o foco transitório depois da interação, que o axe não avalia.
4. **FR-CHAR-006 voltou.** O `home.spec.ts` perdeu o "Complete" na T6 (`9af1f0e`): o título perdeu o FR-CHAR-006, e a expectativa passou a "Creating · 6 open", como o §7 diz. O "Complete" voltou no `story.spec.ts` (`35bdc8c`), cujo título cita o FR-CHAR-006, com o personagem decidido pela interface e a Home conferida no fim.
5. **Diff dos testes desde `72091fa`.**
   - O comando foi `git diff 72091fa..887c808`, sobre os `*.test.*`, o `e2e/` e a configuração: 2.072 linhas acrescentadas, 14 removidas.
   - As remoções são só as expectativas do §7 e assinaturas de ajudante (imports, `setup` com `random`):
     - o "Complete" e o título do `home.spec.ts`;
     - `grants` `undefined` no `core-pack.test`;
     - no `core-view.test`, as duas linhas de Story na prévia, o `...others` do FR-FLOW-001 (agora com `['Story', 'open']` e `others.slice(1)`) e o `grants: []` do FR-STEP-002.
   - Nos dois testes de documento inteiro do `session.test`, só se acrescentou o `log` esperado, com `toEqual` exato.
   - Nenhum `.skip`, `.only`, `.fixme`, retry nem timeout novo. Os dois `test.skip` novos, no `builder-dock.spec.ts`, são o padrão já existente no arquivo: a região fixa só existe no celular.
   - Nenhuma mudança em `playwright.config.ts`, `vite.config.ts`, `package.json`, Vitest, Lighthouse nem no workflow.

## Testes corrigidos

Um commit, só nomes, nenhuma asserção mudou (`FEAT-009 acceptance: correct test for AC-3 and AC-16`):

- **AC-3:** os 5 testes de `rollDice` e `rollDie` do `src/dice/index.test.ts` ganham "AC-3" no nome. O de "the modifier is not part of the faces" fica como está: é FR-DEC-005, mas não é cláusula do AC-3.
- **AC-16:** os três testes do `e2e/story.spec.ts` ganham "AC-16" (o primeiro, "AC-1, AC-16"), e os dois da Story no `e2e/builder-dock.spec.ts` ganham "AC-16". Nenhum documento nem filtro cita esses nomes.

## Execução independente

Do zero, no Windows 11, PowerShell e Git Bash, com Node 22.15.0 e Playwright 1.65.0. A porta 4173 estava livre antes.

- `npm ci`, `typecheck`, `lint` (fronteiras), `packs:check` ("2 file(s) valid; no ids removed since HEAD") e `build`: verdes.
- `npm test`: 244 testes em 18 arquivos, verdes. Depois da correção, `npx vitest run src/dice`: 10 verdes.
- `npx playwright test --retries=0 --workers=1`, com os nomes corrigidos: 187 passaram, 48 foram pulados, 0 falhas e 0 instáveis, em 7,3 min, sem violação de CSP.

| Projeto | Passaram | Pulados | Falhas | Instáveis |
| :-- | --: | --: | --: | --: |
| chromium | 32 | 15 | 0 | 0 |
| firefox | 31 | 16 | 0 | 0 |
| webkit | 31 | 16 | 0 | 0 |
| mobile-chrome | 47 | 0 | 0 | 0 |
| mobile-safari | 46 | 1 | 0 | 0 |

- Os pulados são todos previstos: 42 do `builder-dock.spec` fora do celular, 3 do `builder-focus.spec` e 3 do `perf.spec` fora do Chromium.
- Contra a re-verificação da FEAT-008 (164 passaram, 36 pulados), há 23 a mais: 15 do `story.spec` (3 testes × 5 projetos) e 8 da Story no `builder-dock.spec` (4 × 2 projetos de celular). São 12 pulados a mais: os mesmos 4 nos 3 projetos de desktop.
- CI do `887c808`, run 44140272090: os jobs `check`, `e2e` e `lighthouse` verdes, e `deploy` pulado. No E2E, 187 passaram e 48 foram pulados, sem linha de flaky.
- Migrações: não se aplicam. O IndexedDB continua na v1, e o documento só alarga a união (§4).

## Verificação direta

**Sonda** (script Node com a biblioteca do Playwright, fora do repositório, descartável). Ela rodou contra um build de `887c808` servido do zero pelo `vite preview` (base `/`, porta 4180), com Dwarf, em Desktop Chrome, Desktop Firefox e Desktop Safari.

**FR principais**, 1 execução por motor, todas as conferências verdes nos três:

| Passo | Observado |
| :-- | :-- |
| Decide now (SCR-WEB-003) | "6 tables in Story", os seis nomes na ordem, "0 of 6 decided." e "Go to Story" para `?slot=ancestry=dwarf/hated-creature`. Com três decididas: "3 of 6 decided.", o link aponta a Build, e ela recebe o foco. |
| Rolar | Exemplo: "Rolled 3d6: 6 + 4 + 2 · Modifier +0 · Total 12", entrada 8–12. Gravado `{ mode: 'rolled', dice: [6, 4, 2], modifier: 0, total: 12, entry: '8-12', rolls: 1, book: 'sotdl.core' }`, sem valor derivado no documento. A entrada de log tem `slotKind: 'table'`, etapa Story, origem Dwarf, assunto Dwarf Age, fonte CORE p.18, `result.entry`, `roll` com faces, modificador, total e `rolls: 1`, e `at` em ISO. |
| Escolher | Hatred "3–4 Troglodytes": `{ mode: 'chosen', value: '3-4', book: 'sotdl.core' }`; log com `{ entry: '3-4', entity: Troglodytes }` e sem `roll`. |
| Background 1 | O chip "Corruption +1" aparece. O resumo vivo mostra "Corruption 1", com a composição "Standard rule: 0 · 0 · Dwarf Background: 1 · +1". |
| Recarregar e manter | Mesmo cálculo e Corruption 1. Abrir não gravou nada: revisão, tamanho do log e `updatedAt` iguais, nenhuma transação concluída. |
| Atalho de Open decisions | "Open decisions · 3". O link "Dwarf Build · Story · Dwarf" vai a `?slot=ancestry%3Ddwarf%2Fbuild` e foca o cartão. |
| Decidir as seis | "6 of 6 decided". O log tem 7 entradas, ids 1 a 7, todas `decision`. Na Home, "Dwarf · Level 0 · Complete". |

**AC-14 com a gravação retida** (método do DEF-008). Só a transação do documento fica presa: depois do `put` em `characters`, `count()` em laço até a sonda liberar; para a falha, a transação é abortada. Para o Enter result, a recusa e a `roll-effect`, o pacote do core é alterado só na rota da sonda: Personality com regime `roll`, e Background 2 com "1d6 Insanity". Foram 3 execuções por motor, 42 de 42 conferências em cada um:

| Sequência | Observado nos três motores |
| :-- | :-- |
| (a) Roll retido, clique no Choose da Build | O cálculo aparece e o foco vai à coluna de resultado com nada gravado. Depois da gravação, o foco continua no segmento da Build, e a Build continua sem decisão, com a grade aberta. |
| (b) Choose retido, foco no Roll da Appearance | A entrada está marcada e o resultado aparece antes da gravação (às vezes antes de ela começar), com o foco no `radio`. Depois da gravação, o foco continua no Roll da Appearance. |
| (c) Roll com a gravação falhando | O alerta "Your last choice wasn't saved…" aparece, o resultado fica, nada é gravado, e o foco fica na coluna. "Try again" grava o total mostrado. |
| (d) Enter result 11 retido | "Entered for 3d6: 11 · Modifier +0 · Total 11" aparece focado antes da gravação, e o foco levado à Build fica lá. Gravado `{ mode: 'entered', sum: 11, modifier: 0, total: 11, entry: '9-12', book }`; log com `roll` `{ count: 3, sides: 6, modifier: 0, total: 11, sum: 11 }`. Enter result só aparece na tabela de regime `roll`. |
| (e) Recusa com outra gravação retida | "2" dá "Enter a value from 3 to 18.". Depois da gravação da Age, o foco continua no campo, com "2" e `aria-invalid`, e nada é gravado para a Personality. |
| `roll-effect` (AC-8) | Background 2 abre "Insanity 1d6", com "Roll 1d6", "Enter result" e "Or decide later…", e o resumo mostra "Insanity Open —". Rolada, o resumo soma o total. Background 3 dá "You can't change Dwarf Background to 3 yet: your Insanity 1d6 result depends on the current result, 2. Changing a choice that others depend on isn't available yet." |

- **A sonda discrimina** (C15). Um build com `TablesStep` alterado só no disco, focando a coluna também depois do `await` do Roll e do Enter result (o padrão do DEF-008), falhou 9 de 9 nos três motores, exatamente em (a), (d) e (e). O (b) e o (c) passaram, porque não foram mexidos. O código foi restaurado com `git checkout`, e o build mutado, descartado.
- **Erros da sonda,** corrigidos antes da rodada que vale:
  - ela lia o primeiro personagem do IndexedDB, e não o da URL;
  - ela exigia a transação já presa quando o resultado aparecia, mas o resultado às vezes aparece antes de a gravação começar.

  Com as correções, a asserção continua exigindo resultado na tela e nada gravado.

**Telas contra o manifesto.**
- Os estados `to-decide`, `entering`, `rolled`, `entered`, `chosen`, `no-text`, `effect-open`, `effect-decided`, `decided-locked`, `dependents-blocked` e `save-failed` foram observados acima.
- `loading` e `error` são os da moldura da FEAT-007.
- A 320 e a 412 px, no Pixel 7 (Chromium) e no iPhone 15 (WebKit), com resultados na tela: sem rolagem horizontal, nenhum elemento do `main` passa da borda, e a grade fica em 2 colunas.

**Contratos e propriedade intelectual.**
- `roll`, `enter` com `out-of-range` e `range`, Choose, `already-decided` e `has-dependents` conferem com a §3.2.
- O documento grava só a decisão e o log, nunca valor derivado. O motor não cita o log (`src/engine`, fora dos testes).
- O diff de `packs/` só tem ids, nomes de entidade, páginas, dado, regime, campo, faixas e o efeito do Background 1, sem texto de entrada.

**NFRs:**

| NFR | Medida | Resultado |
| :-- | :-- | :-- |
| NFR-PERF-001 | `npm run lighthouse` com a `.lighthouseci` apagada antes (Lighthouse CI, 3 execuções por perfil, local). Medianas: desktop 526,5 ms (limite 2.500), elemento `main.app-main > section.home > div.card > p.typography-body` ("For each rule…"); **celular 2.558,0 ms** (limite 4.000; base 2.620), elemento o mesmo `p.typography-body` ("This generator guides you…"), o da base (DEF-007); capacity-desktop 208,1 ms e capacity-mobile 758,3 ms, elemento `section.home > div.inline-alert > div.inline-alert__body > p` (o aviso "Characters are saved in this browser only…"). Elemento do `lcp-breakdown-insight`, o mesmo nas 3 execuções de cada perfil. Nos quatro, a execução representativa é a de LCP mediano. As asserções passaram. | passa |
| NFR-PERF-002 | Guarda do `evaluate.perf.test.ts`, 200 execuções, 3 rodadas, p95: core (Human, Size, ajuste) 0,082 a 0,106 ms; fixture de porte 0,224 a 0,276 ms; **core com Dwarf, seis tabelas, Background 1 e ajuste 0,202 a 0,235 ms**; **fixture de tabelas 0,140 a 0,151 ms**. O limite é 20 ms. No `perf.spec`, na mesma rodada do E2E: `chromium` p95 15,7 ms (limite 100) e `mobile-chrome` com 4× de CPU p95 54,6 ms (limite 200). Máquina local acima de um notebook médio (AMD Ryzen 9 7900X3D): os números são indicativos, e a folga é o que sustenta o veredito. | passa |
| NFR-REL-001 | AC-13 por teste, e a recarga observada nos três motores. Com a gravação retida, o resultado na tela e "Try again" depois da falha. | passa |
| NFR-ACC-001 | axe sem violação grave na Story nos 5 projetos e, no Firefox, também na mesma página (ponto 3). A Story foi verificada no `builder-dock.spec` a 320 e 412 px. Foco e anúncio conforme o ui-design, com a gravação retida. A revisão manual WCAG completa das telas do MVP continua para antes da publicação. | passa (parcial) |
| NFR-USE-001 / NFR-L10N-001 | Textos observados (Decide now, cálculo, regime, sem texto, `roll-effect`, `has-dependents`, Enter result): só inglês, sem id, `kind` nem "slot". Conferem com o ui-design §Textos. | passa (parcial) |
| NFR-MAINT-002 | FR-DEC-001, 002, 004, 005, 007, 008, 011, 012, 016, 019, 020, 024 e FR-CALC-001, 005, 010, 011 têm teste com o FR no nome. | passa (parcial) |

Os servidores de preview e as sondas foram encerrados ao fim. Scripts e builds ficaram no scratchpad da sessão, fora do repositório.

## Achados

**Rework:** nenhum.

**Defeito de design:** nenhum.

**Menores:**

1. **Rastreabilidade do AC-3 e do AC-16.** Os testes citavam o FR, mas não o AC. Corrigido nesta verificação (só nomes).
2. **Pendência do AC-17 (iv) fora da linha da FEAT-005.** O caminho com `replaces` de tabela, que fica para a FEAT-005, só está registrado no §8 da FEAT-009 e no T3. A linha da FEAT-005 no plano não o cita, e quem desenhar a FEAT-005 precisa chegar a ele pela FEAT-009. **Para:** detailed-design da FEAT-005, que deve incluir o caso nos critérios dela. Se o usuário quiser, uma emenda do plano antes. Sem bloqueio.

Registro, sem ação: a nota do Playwright 1.66 no `scaffold-notes.md` continua pendente. Quando sair a versão estável, o contorno do `story.spec.ts` sai.

## RTM

Test ref acrescentado (`features/FEAT-009-decide-a-table/acceptance-report.md`) em:
- FR-DEC-001, 002, 004, 005, 007, 008, 012, 019, 020, 024; FR-STEP-013, 014; FR-CALC-010, 011; FR-LOG-001, 002, 004, 010;
- com `(partial)`: FR-DEC-016, FR-STEP-012, FR-CALC-005 e FR-CONT-008, parciais pelo plano;
- FR-DEC-011, FR-CALC-001, FR-FLOW-001, 010, 011 e FR-CHAR-005, 006, que são de outras features e tiveram o comportamento estendido por esta (Design ref da FEAT-009);
- com `(partial)`: NFR-PERF-001, NFR-REL-001, NFR-ACC-001, NFR-USE-001, NFR-L10N-001 e NFR-MAINT-002, NFRs das fundações (plano §6).

FR-CONT-015, 016, FR-SRC-009 e FR-CHG-015 ficam sem registro: esta feature só adianta a parte do motor, e os Plan refs delas são outras features.

## Re-verificação de 2026-11-25: DEF-013

> Veredito: Accepted · Estado auditado: `e327859` (código de `4d66547`) · Padrão: technical-design.md §6, sem mudança; ui-design.md com o entering corrigido em `54583db`, contra a emenda D-ERR do design.md (`2312de8`)

**Veredito.** Aceita de novo. A correção do DEF-013 (`docs/defects.md`) põe no `EnterForm` uma região `aria-live="polite"` que já está no formulário quando ele abre, e a mensagem de erro aparece dentro dela pelo clique em "Use this result" e pela tecla Enter, sem mover o foco. Os três testes vermelhos falham sem a correção, pelo motivo do defeito, e também com uma variante ingênua; passam com ela. Todas as suítes passaram nesta execução, sem retry. Nenhum achado novo.

**Padrão.** Os 17 critérios da §6 continuam valendo. A manutenção toca o AC-7 (FR-DEC-019, FR-DEC-020), o AC-8 (FR-STEP-014) e a NFR-ACC-001. A regra é a do `design.md` §4 (convenção de estados, "error", e `text-input / textarea`, Erro) e §5: a mensagem que aparece sem que o foco vá até ela é anunciada por uma região `aria-live="polite"` já presente no DOM, com `aria-invalid` no campo e a mensagem no `aria-describedby`. O entering corrigido (`54583db`) diz que a região vale pelos dois caminhos, e o código faz isso: a região envolve o `FieldError` (`TablesStep.tsx:636`), e o clique e o Enter passam pelo mesmo `onSubmit` do formulário. Pelo `git diff 1935905..e327859`, só essa linha do entering mudou no ui-design da FEAT-009.

**Mudanças de teste auditadas** (`1935905..e327859`, só `src/ui/screens/Builder.test.tsx`): 157 linhas acrescentadas, nenhuma removida, nenhum teste existente mudado. Nenhum skip, `.only`, retry, timeout aumentado nem mudança de configuração (`playwright.config.ts`, `vite.config.ts`, `package.json`).

| Teste | Commit | Classe | Auditoria |
| :-- | :-- | :-- | :-- |
| DEF-013: "Use this result" com o campo vazio na Gnome Fate (regime `roll`) | `349710d` | teste novo | Fiel ao DEF e ao entering. A região é capturada antes do envio, vazia. Depois, a mesma região (por identidade) tem "Enter a value from 3 to 18.", a mensagem do `aria-describedby` a tem como ancestral `aria-live` mais próximo, o campo tem `aria-invalid="true"`, e o foco está no botão, antes e depois de um quadro. Nenhum `enter` nem gravação. Na edição seguinte, a mensagem some e a região fica. |
| DEF-013: recusa `out-of-range` ("7") na `roll-effect` da Madness | `349710d` | teste novo | Fiel: o `enter` é chamado com 7, e a recusa aparece na região capturada antes, com o valor mantido e o foco no botão. |
| DEF-013: tecla Enter no campo vazio da Gnome Fate | `349710d` | teste novo | Fiel ao entering corrigido: a mensagem na mesma região, com o foco no campo. |

Os testes não cobrem todas as combinações (faltam o Enter na `roll-effect` e a recusa na tabela de regime `roll`), mas o formulário é o mesmo componente nos dois lugares. As oito combinações foram observadas no navegador (abaixo).

**Vermelhos conferidos** (produção trocada só no disco, restaurada com `git restore` depois de cada rodada; cada linha, 3 vezes):

| Teste | Comando | Sem a correção | Com a correção (`HEAD`) |
| :-- | :-- | :-- | :-- |
| DEF-013 (3 testes) | `npx vitest run src/ui/screens/Builder.test.tsx -t "DEF-013"` | `TablesStep.tsx` e `builder.css` de `39ab5b5`: 3/3 rodadas com os três vermelhos em `regionBeforeSubmit` (`:1093`, "aria-live="polite" region in the Enter result form: expected null not to be null"). Não há região antes do envio, que é o defeito. | 3/3 verdes |
| DEF-013, variante ingênua | o mesmo comando | região recriada junto com a mensagem (`key={error ? 'shown' : 'empty'}` na `div` da região; local, descartada, sem commit): 3/3 rodadas com os três vermelhos em `:1098` ("expected '' to be 'Enter a value from …'"), porque a região capturada antes do envio fica vazia | — |

**Execução independente** (do zero, porta 4173 livre antes; Windows 11, Node 22.15.0, Playwright 1.65.0):
- `npm ci`, `typecheck`, `lint`, `packs:check` ("2 file(s) valid; no ids removed since HEAD") e `build`: verdes.
- `npm test`, 3 vezes: 385 testes em 21 arquivos, 3/3 verdes.
- `npx playwright test --retries=0 --workers=1`, uma worker, nos 5 projetos: 204 passaram, 51 pulados, 0 falhas, 0 instáveis, em 9,2 min. Por projeto: chromium 36 (15 pulados), firefox 34 (17), webkit 34 (17), mobile-chrome 51 (0), mobile-safari 49 (2). Os pulados são os previstos: 42 do `builder-dock.spec` fora do celular, 3 do `builder-focus.spec` e 6 do `perf.spec`.
- Uma primeira invocação, com dois reporters na linha de comando, foi recusada pelo Playwright antes de rodar qualquer teste (erro de invocação no PowerShell) e não conta.
- CI do `e327859`, run 45687328926: `check`, `e2e` e `lighthouse` verdes, `deploy` pulado. No E2E, 204 passaram e 51 foram pulados, sem linha de flaky.

**Verificação direta.** Script Node com a biblioteca do Playwright, fora do repositório e descartado. Ele rodou contra dois builds servidos do zero pelo `vite preview` (base `/`): o de `e327859` e o de `39ab5b5`, de antes da correção (a produção de `349710d` é a mesma).
- O pacote fictício do `Builder.test.tsx` foi servido no lugar do `sotdl.core.json` por `page.route`: Gnome, Gnome Fate de regime `roll` e Gnome Past com a `roll-effect` Madness na entrada 4.
- O personagem foi criado por "New character". As decisões (Gnome; Gnome Past escolhida ou rolada em 4) foram semeadas no IndexedDB antes de abrir a Story.
- Perfis: Desktop Chrome, Desktop Firefox, Desktop Safari, Pixel 7 e iPhone 15, no viewport do perfil e a 320 × 568.
- O DOM foi lido no navegador. Nada foi conferido com leitor de tela.

| Ponto | Observado no `HEAD`, nos 5 perfis, 3 rodadas |
| :-- | :-- |
| Região antes do envio e mensagem dentro dela | 8 sequências por perfil: Gnome Fate e Madness × clique em "Use this result" e Enter no campo × vazio e fora da faixa ("2" e "7"). Em todas, a `div[aria-live="polite"]` já está no formulário ao abrir, vazia, e um `MutationObserver` posto nela antes do envio registra a entrada da mensagem. Depois, a mesma região (marcada antes) contém "Enter a value from 3 to 18." ou "… from 1 to 6.". A mensagem está no `aria-describedby` e tem a região como ancestral `aria-live` mais próximo. O campo tem `aria-invalid="true"` e mantém o valor. Dois quadros depois, o foco está em "Use this result" (clique) ou no campo (Enter). 24/24 por perfil. |
| Leiaute com a região vazia | Caixas do rótulo, do campo, da ajuda, das ações e de "Use this result", relativas ao formulário, e o tamanho do formulário: idênticas às do build de `39ab5b5`, nos 5 perfis, na Fate e na Madness, no viewport do perfil e a 320 px. A região vazia é `position: absolute`, 0 × 0, e não abre linha nem gap: o formulário tem 83,64 px de altura no desktop e 210,48 px no celular, nos dois builds. |
| Leiaute com a mensagem | Idêntico ao de `39ab5b5`. A mensagem fica abaixo da ajuda: no desktop, a 87,64 px do topo do formulário, que passa a 106,48 px; no celular, a 110,48 px, com as ações descendo para 133,33 px. A região passa a `static` e coincide com a caixa da mensagem. |
| 320 px | Formulário aberto, sem e com a mensagem, na Fate, na Madness com a Past escolhida e na Madness com a Past rolada: `scrollWidth` 320 e nenhum elemento fora de 0–320 pelo `getBoundingClientRect` (C17), nos 5 perfis. |

- **A sonda discrimina** (C15): contra o build de `39ab5b5`, as 8 sequências falham nos 5 perfis só no ponto do defeito, sem região `aria-live` no formulário, antes ou depois do envio. O `aria-invalid`, a mensagem no `aria-describedby`, o valor e o foco passam, como deviam, porque não eram o defeito. As caixas e a ausência de rolagem horizontal dão o mesmo resultado nos dois builds.
- **DEF-015, só registro:** a sonda vê os 4 px dele. Com a Gnome Past rolada em 4 e a Madness decidida, a 320 px, o `scrollWidth` é 324 nos 5 perfis e nos dois builds. Não é efeito desta correção nem entra neste veredito.

**Achados.** Rework: nenhum. Defeito de design: nenhum. Menores: nenhum.

**RTM.** Sem mudança.
