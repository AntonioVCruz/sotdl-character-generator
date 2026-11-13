# Tasks: FEAT-001 — Home: listar, continuar e excluir personagens

> Executa: `docs/features/FEAT-001-home/technical-design.md`
> Status: pending · Última atualização: 2026-11-12
> Tela (SCR-WEB-001): do ui-design, pelo `docs/design-manifest.json`. As tarefas de ui aqui são só integração.
> Pré-requisito: o technical-design (com o §7 "Contratos alterados") está no `main` antes da T1.

Em toda tarefa, o pronto-quando inclui `npm run typecheck` e `npm run lint` passando, e todos os testes existentes verdes, salvo as expectativas listadas no §7 do design, trocadas na tarefa indicada.

- [ ] **T1. `Rules.books`, `CharacterSummary` e `summarize` com estado e contagem** (design §3.1 `summarize`, §3.2, §4; FR-CHAR-003, 005, 006; D1, D2, D7)
  - Em `src/engine/resolve.ts`: `books` em `Rules`, na ordem de `order`, a partir dos `Book`.
  - Em `src/app/session.ts`:
    - `CharacterSummary` da §3.1;
    - `summarize(document, rules)`, com `rules` obrigatório, `status`, `openDecisions`, `sources` com nome e sigla e `contentVersion`.
  - Em `src/app/index.ts`: o `createCharacter` carrega as regras do core pelo `loadRules` compartilhado, antes de gravar (§3.1, tabela de falhas).
  - **Contrato alterado (§7):** `index.test.ts` "FR-CHAR-001: creates…" passa ao metadado novo.
  - **Pronto quando** os testes (pacotes fictícios) passam:
    - `resolve.test.ts`: `books` na ordem de prioridade;
    - `session.test.ts`:
      - `FR-CHAR-005`: vaga obrigatória aberta → `creating` com o número;
      - `FR-CHAR-005`: a vaga opcional não conta;
      - `FR-CHAR-006`: nenhuma aberta → `complete`;
      - `FR-CHAR-003`: ancestralidade e fontes com nome no metadado gravado por `decide`;
    - `index.test.ts`:
      - `FR-CHAR-001` com o metadado novo;
      - `FR-HELP-004`: livro do core que não carrega (índice ok) → `pack-load-failed`, nada gravado.

- [ ] **T2. `listCharacters`, leitura tolerante e ordem** (design §3.1 `listCharacters`; FR-CHAR-003, 004; D4, D5; AC-12, AC-14)
  - Em `src/app/session.ts` (ou num arquivo novo no `app`): `readSummary(raw)`, pela tabela da §3.1.
  - Em `src/app/index.ts`: `listCharacters(): Promise<ListResult>`, ordenado.
  - Em `src/ui/screens/Home.tsx`, só para continuar verde até a T5:
    - consumir o `ListResult`;
    - na falha, o aviso provisório em `role="alert"`, com o rascunho da §3.5, no lugar da lista vazia.
  - **Contrato alterado (§7):** mock do `Home.test.tsx`.
  - **Pronto quando** os testes passam:
    - `index.test.ts`:
      - `FR-CHAR-004`: ordem por `updatedAt` decrescente e empate pelo `id`;
      - `FR-CHAR-003`: metadado antigo (sem `openDecisions`, `sources` como ids) lido com `openDecisions: null`, `status: 'creating'` e `sources: []`; registro sem `id` ignorado;
      - `FEAT-007 §8`: `list` que rejeita → `storage-unavailable`;
    - `Home.test.tsx`: lista que falha mostra o alerta e não o estado vazio.

- [ ] **T3. Última etapa: store, sessão e exclusão** (design §3.1 `deleteCharacter`, §3.3, §3.4; FR-CHAR-007, 014; D3, D6)
  - Em `src/storage/`: `createLastStepStore`, com a chave da §3.3, exportado pelo `index.ts`.
  - Em `src/app/session.ts`:
    - `lastStep` opcional em `SessionDeps`;
    - `ready.lastStep` lido em `open`;
    - `visit(slug)`.
  - Em `src/app/index.ts`:
    - o store criado uma vez e passado às sessões;
    - `deleteCharacter`: `repository.delete`, depois `forget` (falha ignorada).
  - **Pronto quando** os testes passam:
    - `storage`:
      - `FR-CHAR-007`: `set` e `get` com um `Storage` falso;
      - `FR-CHAR-007`: `forget` remove;
      - `FR-CHAR-007`: armazenamento que lança (inclusive no acesso) → `get` `undefined`, `set` e `forget` sem exceção;
    - `session.test.ts`:
      - `FR-CHAR-007`: `open` traz `lastStep`;
      - `FR-CHAR-007`: `visit` grava no store sem chamar `repository.save`, sem mudar `updatedAt`, `revision` nem o snapshot;
    - `index.test.ts`:
      - `FR-CHAR-014`: excluir remove documento e metadados e chama `forget`;
      - `FR-CHAR-014`: `delete` que rejeita → `delete-failed`, com documento, metadados e chave intactos;
      - `FR-CHAR-014`: `forget` que lança → `{ ok: true }`.

- [ ] **T4. Rota e construtor: abrir na última etapa e nome no cabeçalho** (design §3.5 `builderRedirect` e `Builder`; FR-CHAR-007, 011, FR-FLOW-005, 006)
  - Em `src/ui/router.ts`: `builderRedirect(route, steps, lastStep?)`.
  - Em `src/ui/screens/Builder.tsx`:
    - `lastStep` no redirect;
    - `session.visit(current.slug)` a cada etapa mostrada;
    - `displayName(document.text.name)` no cabeçalho.
  - `displayName` como função pura do `ui`, fora de `src/ui/builder/` (a Home a usa na T5).
  - **Pronto quando** os testes passam:
    - `router.test.ts`, `FR-CHAR-007`:
      - sem etapa e com a última liberada → ela;
      - com a última bloqueada → primeira liberada;
      - com a última inexistente ou sem registro → primeira;
    - o caso da FR-FLOW-005 continua igual;
    - `Builder.test.tsx`:
      - `FR-CHAR-007`: abrir sem etapa com `lastStep` vai à etapa salva;
      - `FR-CHAR-007`: trocar de etapa chama `visit`;
      - `FR-CHAR-011`: nome só de espaços → "Unnamed character" no cabeçalho;
      - `FR-CHAR-011`: nome definido → o nome.

- [ ] **T5. Home: estados, cartões, menu e exclusão** (design §3.5 Home; FR-CHAR-003, 005, 006, 011, 013, 014, 015, 016; AC-1 a AC-12, AC-16, AC-17)
  - Integração da tela do ui-design (SCR-WEB-001, manifesto):
    - estados `loading`, `error`, `empty` e `populated`;
    - `character-card` com "Continue" (`href.builder(id)`) e o menu "···" só com "Delete";
    - diálogo de exclusão com falha que mantém o diálogo aberto;
    - aviso "só neste navegador" nos estados vazio e populado;
    - `formatEdited`;
    - foco e nomes acessíveis conforme o ui-design.
  - A Home não importa de `src/ui/builder/`.
  - **Contrato alterado (§7):** `skeleton.spec.ts:77`, com o seletor do cartão definido pelo ui-design. **Expectativa nova:** nesse teste, depois do `reload` com o personagem salvo, nenhum pedido a `/packs/` nem ao `Builder-*.js` (zerar a lista de pedidos antes do `reload`).
  - **Pronto quando:**
    - os testes do `Home.test.tsx` passam:
      - `FR-CHAR-003`: o cartão mostra nome, ancestralidade, "Level 0", estado, fontes e data;
      - `FR-CHAR-005`: "Creating · N open";
      - `FR-CHAR-005`: "Creating" sem número com `openDecisions: null`;
      - `FR-CHAR-006`: "Complete";
      - `FR-CHAR-011`: "Unnamed character";
      - `FR-CHAR-013`: "Delete" abre o diálogo irreversível; "Cancel" e Esc não chamam `deleteCharacter`;
      - `FR-CHAR-014`: confirmar remove o cartão, e o último leva ao estado vazio;
      - `FR-CHAR-014`: `delete-failed` mantém o diálogo com o aviso, e tentar de novo exclui;
      - `FR-CHAR-015`: estado vazio;
      - `FR-CHAR-016`: aviso nos dois estados;
      - `formatEdited`: data válida em inglês e inválida → sem data;
    - o `skeleton.spec.ts` passa nos 5 projetos;
    - a tela confere com o manifesto.

- [ ] **T6. E2E do fluxo da Home** (fluxo crítico 1, UC-001 parcial; design §6; FR-CHAR-004, 005, 006, 007, 013, 014, 015; NFR-ACC-001)
  - `e2e/home.spec.ts` (novo), nos 5 projetos, contra o build com a CSP ativa, pela interface:
    - Home vazia (FR-CHAR-015, 016);
    - Dwarf → "Complete";
    - Human com Size adiado → "Creating · 3 open", no topo (FR-CHAR-004);
    - abrir a etapa Attributes, voltar à Home, "Continue" → Attributes; recarregar e "Continue" de novo → Attributes (FR-CHAR-007);
    - só navegar não muda a ordem;
    - excluir com "Cancel" (fica) e com "Delete permanently" (sai, e continua fora depois do `reload`);
    - excluir o último → estado vazio;
    - só com teclado.
  - axe sem violação grave na Home com personagens e com o diálogo aberto, uma análise por teste (scaffold-notes, Firefox).
  - **Pronto quando:** `npm run e2e` passa nos 5 projetos, sem violação de CSP.

- [ ] **T7. NFR-CAP-001: 100 personagens, E2E e Lighthouse** (design D8, D9; AC-15; NFR-CAP-001, NFR-PERF-001)
  - `e2e/seed-characters.js`: a função de navegador da D9, sem dependência e sem nada no bundle.
  - `e2e/capacity.spec.ts` (novo), nos 5 projetos:
    - cria um personagem pela interface, volta à Home, semeia até 100 pelo `page.evaluate` e recarrega;
    - confere 100 cartões na ordem da FR-CHAR-004;
    - **expectativa nova:** nenhum pedido a `/packs/` nem ao `Builder-*.js` depois do `reload`.
  - Lighthouse com 100:
    - `lighthouserc.capacity.desktop.cjs` e `lighthouserc.capacity.mobile.cjs` pelo `lighthouserc.shared.cjs`, com `puppeteerScript` (`lighthouse/seed.cjs` ou equivalente, que cria o personagem, semeia com a mesma função e volta à Home);
    - `puppeteerLaunchOptions` com os flags de headless;
    - `chromePath` de `require('chrome-launcher').Launcher.getInstallations()[0]`;
    - sem `disableStorageReset`, e com o `clearStorageTypes` padrão (D8);
    - `outputDir` próprio em `.lighthouseci/`.
  - `package.json`:
    - `puppeteer-core` como devDependency fixa em `25.17.0`;
    - `npm run lighthouse` roda as quatro configs (o job `lighthouse` do CI não muda).
  - **Pronto quando:**
    - `npm run e2e` passa com o `capacity.spec.ts`;
    - `npm run lighthouse` passa as quatro asserções (2500 ms desktop, 4000 ms móvel), e o relatório com 100 mostra os 100 cartões (conferir no LHR que o LCP não é do estado vazio);
    - o tempo do job anotado no aceite.

- [ ] **T8. Verificação** (design §6; NFR-MAINT-002)
  - Todos os critérios da §6, de AC-1 a AC-17, passam, cada um com o teste que o cobre.
  - `npm run typecheck`, `npm run lint`, `npm test`, `npm run packs:check`, `npm run build`, `npm run e2e` e `npm run lighthouse` passam no local.
  - O CI do commit final está verde (`check`, `e2e`, `lighthouse`).
  - Revisão de textos visíveis (NFR-USE-001) e de acessibilidade da Home (NFR-ACC-001, revisão manual), como no plano §6.
  - Todo teste novo começa pelo FR ou NFR que verifica.
  - **Pronto quando:** tudo acima demonstrado e as caixas de T1 a T7 marcadas.
