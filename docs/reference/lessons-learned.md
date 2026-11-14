# Lições da tentativa anterior

A tentativa anterior (`sotdl-character-forge`) produziu, em 11 dias, 103 commits, 130 documentos (cerca de 115 mil palavras) e cerca de 17 mil linhas de código, mais 9,6 mil de testes. O resultado funcional foi uma única ancestralidade no nível 0, e o repositório público não gerava personagens sem os livros instalados localmente.

O planejamento em si era bom: os princípios e a arquitetura continuam válidos em boa parte. O que falhou foi **escopo**, **sequência** e **processo**. Estas lições valem como restrições para a nova especificação. Elas não descrevem o código antigo, que não deve servir de base.

## 1. Um gerador não é um gerenciador de personagem

O MVP anterior exigia níveis de 0 a 10, aleatoriedade auditável completa (seed, versão de PRNG, substreams, travas, rerrolagens), HTML editável offline, conjuração, efeitos de sessão, descanso e equipar/desequipar. Metade disso pertence a uma ficha digital de mesa, e cada requisito multiplicava o custo dos outros.

**Lição:** o MVP gera um personagem e entrega a ficha. Gerenciar o personagem durante o jogo é outro produto.

## 2. Primeiro o fluxo, depois o catálogo

A primeira especificação foi catalogar e reconciliar todas as publicações. Isso consumiu muito esforço antes de existir um fluxo de criação de ponta a ponta, e o esqueleto funcional chegou tarde.

**Lição:** construir primeiro um esqueleto que gere um personagem completo com pouco conteúdo. Ampliar o conteúdo só depois que o fluxo funciona. O modelo de dados precisa aguentar todos os suplementos, mas o conteúdo não precisa estar todo lá desde o início.

## 3. O processo não pode engolir o produto

Havia 41 documentos de entrega, 29 de plano, além de matrizes, freezes, aceites, lotes e atividades: 18 palavras de relatório para cada palavra de especificação. A maior parte registrava o trabalho dos agentes, não decisões. Entender o estado do projeto exigia conhecer o vocabulário do próprio processo.

**Lição:** documentar decisões, não atividades. Um documento só existe se alguém precisar consultá-lo para decidir ou construir algo.

## 4. Aposentar o que foi substituído

Motores demonstrativos com dados fictícios, uma grade legada, um wizard parcial e o gerador real conviviam na mesma interface. Nada era removido quando deixava de ser necessário.

**Lição:** quando algo é substituído, sai. Dados fictícios ficam restritos aos testes.

## 5. A interface fala com jogadores, não com o desenvolvedor

A interface usava termos como "seed", "needs-review", "projeção mínima" e "alternativa Core mediante escolha explícita". Isso contradiz o objetivo de servir quem não domina as regras.

**Lição:** termos internos do sistema não aparecem na interface. Cada texto visível deve fazer sentido para um jogador de SotDL sem contexto do projeto.

## 6. O projeto precisa se demonstrar

Por respeito à propriedade intelectual, a geração ficava bloqueada sem os livros na máquina local. A intenção era correta, mas o efeito foi um portfólio que ninguém consegue experimentar.

**Lição:** decidir na especificação, e não no fim, o que um visitante sem os livros consegue fazer, sem violar a propriedade intelectual.

## 7. Texto dos livros nunca entra no Git

O primeiro commit continha derivados dos livros e dados pessoais de compra. Corrigir exigiu reescrever o histórico, e parte da limpeza ainda depende do suporte do GitHub.

**Lição:** a linha entre o que pode e o que não pode entrar no repositório público é traçada antes do primeiro commit, não corrigida depois. PDFs, extrações e texto descritivo dos livros ficam em `content/` (`content/` e `*.pdf` no `.gitignore`); só a mecânica entra no repositório, nos termos do P22 (D35, D36). Dados pessoais nunca entram.

## O que vale reaproveitar

Reaproveitar significa portar por decisão explícita, na etapa de arquitetura, nunca herdar.

| O quê | Por quê |
| --- | --- |
| Princípios gerais da arquitetura anterior | Motor de cálculo puro, conteúdo separado da lógica, efeitos explicáveis, recalcular em vez de acumular, nunca fundir versões de fontes diferentes silenciosamente. Continuam corretos. |
| Modelo de aleatoriedade | Tabelas como entidades com fonte e página, distribuição publicada respeitada (3d6 são três dados) e distinção entre rolagem em tabela oficial e sorteio entre opções válidas. |
| Inventário de fontes | Mapeamento de publicações, páginas e identificadores dos suplementos, útil para validar o modelo de dados. Não contém texto dos livros. |

# Lições da construção (`sotdl-character-generator`)

Lições do pipeline atual, para aplicar nos designs, nas revisões e nos prompts ao Claude Code.

## C1. Nome acessível novo pode colidir com seletores existentes

Na FEAT-001 (T5), o "···" do cartão da Home ganhou o nome "More actions for {name}", como pede o ui-design. O `e2e/skeleton.spec.ts` da FEAT-007 clicava em `getByRole('button', { name: 'More' })`, e o Playwright compara o nome **por substring, sem diferenciar maiúsculas**. Com isso, o seletor passou a achar dois botões e falhou por ambiguidade nos projetos de celular. O §7 do technical-design não tinha visto isso: a conferência olhou os testes que dependiam das regras alteradas, mas não os nomes novos que contêm nomes antigos.

**Lição:**
- Todo design que cria nomes acessíveis ou textos visíveis novos confere os localizadores por nome já existentes em `e2e/` (`getByRole`, `getByText`, `getByLabel`, `getByTitle` e `getByPlaceholder` sem `exact`) contra esses nomes, em todas as telas onde os elementos novos aparecem.
- A colisão se resolve no seletor (escopo por landmark, como `getByRole('banner')`, ou `exact: true`), registrada no §7 como contrato alterado. A interface não muda para acomodar um seletor.
- No Testing Library (Vitest), o nome com string é comparado inteiro por padrão, então o risco fica no Playwright.

## C2. Estado de tela definido pelo retorno de um comando que grava contradiz a D11

O ui-design da FEAT-008 dizia que applied começa quando "`session.decide` devolveu `ok`" e undone quando "o comando devolve `ok`". Pela D11 da FEAT-007 (a tela atualiza antes de gravar), o comando só devolve depois da gravação. O código seguia o texto ao pé da letra: o foco, o anúncio e a limpeza da seleção vinham depois da gravação e, com uma gravação lenta, tiravam o foco de onde a pessoa o tinha posto (DEF-008, DEF-009). Foi o mesmo padrão do DEF-003 ao DEF-006 na Ancestry. A emenda `779f7c6` passou a entrada dos estados para o snapshot.

**Lição:**
- O ui-design define a entrada de um estado visual pela mudança do snapshot, não pelo retorno do comando. O retorno só decide o que depende de uma recusa, que volta sem gravar.
- Ao revisar um ui-design, procure "devolve" e "devolveu" nos estados e confira contra a D11.
- No código, a continuação depois do `await` de um comando que grava não mexe em foco nem em estado de interface. A entrada no estado fica num efeito sobre o snapshot, e a continuação só desfaz a marca do clique numa recusa.

## C3. Dois critérios no mesmo prompt podem se contradizer

O prompt B pediu, como critério para os defeitos da AttributesStep, o "Foco e anúncio" do ui-design da FEAT-008 e a regra da moldura. Os dois se contradiziam (C2). O Claude Code seguiu a moldura e só relatou a divergência no fim, depois de corrigir o código.

**Lição:**
- Antes de enviar um prompt com mais de um critério, confira no texto do design que eles concordam. Se não concordam, a emenda vem antes da correção.
- Diga no prompt: "se o design disser outra coisa, pare e me relate".

## C4. Regra do design.md que o componente base não cumpre

O design.md §4 pede `aria-busy` no estado "loading" de todo controle. O `Button` do `react-aria-components` 1.22.1, a base do ADR-006, descarta o atributo (`filterDOMProps`). Com `isPending`, ele põe `aria-disabled`, mantém o foco e anuncia o rótulo. O `DeleteDialog.tsx` passava a prop, e o atributo não chegava ao DOM. Outros dois botões com `isPending` ("New character" e "Try again") tinham a mesma divergência sem citá-la. O aceite da FEAT-001 achou o problema (M1).

**Lição:**
- Uma regra de acessibilidade que depende de um atributo é conferida no DOM renderizado pelo componente do ADR-006, não na prop passada no código.
- Quando o componente não cumpre a regra, ela vira emenda do design.md (ux-foundations), seguida da re-verificação dos ui-design. Não se contorna o componente.
- Um achado num estado convencional do design.md vale para todos os controles daquele estado: procure em todas as features, não só na auditada.

## C5. Job do CI que não publica nada fica verde

O job `lighthouse` nunca publicou os relatórios (DEF-007). O `actions/upload-artifact` ignora pastas ocultas por padrão (`include-hidden-files: false`), e o `.lighthouseci/` é uma. O `if-no-files-found: ignore` do mesmo passo transformava o erro em aviso, e o job terminava verde.

**Lição:**
- Artefato do qual alguma medida ou verificação depende usa `if-no-files-found: error`, para a falha não ficar silenciosa.
- Pasta oculta pede `include-hidden-files: true`.
- Ao conferir o CI, veja se o artefato existe no run, não só se o job passou.

## C6. Medidas de LCP: o elemento escolhido e a execução que vale

Três surpresas no aceite da FEAT-001:
- O Lighthouse 13 não tem mais o audit `largest-contentful-paint-element`. O elemento vem do `lcp-breakdown-insight`.
- A execução representativa do Lighthouse CI (`manifest.json`) não é necessariamente a de LCP mediano: ele a escolhe por outras métricas (diferença de até 2 ms aqui).
- O elemento LCP pode não ser o que a medida pretende ver. Com 100 personagens, era o aviso "só neste navegador", não os cartões (M2). Na Home vazia, era o texto do estado vazio, pintado depois da leitura do IndexedDB, o que explicou a alta de 0,76 s para 2,56 s no celular.

**Lição:**
- Todo pedido de medida de LCP pede também o elemento LCP de cada perfil.
- O pedido diz se quer a mediana ou a execução representativa.
- Antes de concluir o que uma meta de LCP garante, confira se o elemento medido é o que a requisição quer proteger. Se não for, a decisão é seguir a requisição ao pé da letra ou emendar o design com uma medida complementar.

## C7. Regra mudada por um design: procure em todos os testes o que depende dela

Quando um design muda uma regra que features anteriores já usam, os testes delas podem depender da regra antiga sem citá-la, inclusive os que usam pacotes fictícios. Na FEAT-001, as expectativas antigas que mudaram (o metadado do FR-CHAR-001, o `skeleton.spec.ts`) entraram no §7 do technical-design antes de o teste mudar. A linha 86 do `skeleton.spec.ts` ainda pediu uma emenda à parte (`e297f60`).

**Lição:**
- O design que muda uma regra procura em `src/**/*.test.ts*` e `e2e/` todas as asserções que dependem dela, também nos pacotes fictícios.
- Uma expectativa antiga que muda por decisão aprovada vai para o §7 do design, num commit de documentação anterior à mudança no teste. Fora do §7, mudar uma asserção existente é afrouxar o teste.

## C8. Estado intermediário entre tarefas

Uma feature passa por estados intermediários entre as tarefas: uniões novas que quebram `switch` exaustivos, telas provisórias, E2E de features anteriores que deixam de passar.

**Lição:** todo "pronto quando" do tasks.md inclui typecheck e lint, e a revisão confere o estado entre as tarefas, não só o final.

## C9. Nome acessível vem do conteúdo

**Lição:** o nome acessível de um elemento vem do conteúdo visível (`aria-labelledby` ou o próprio texto). Não se usa `aria-label` que repita o texto visível. Quando o nome precisa de contexto (por exemplo, "More actions for {name}"), ele é composto por referência ao conteúdo, como na FEAT-001.

## C10. O estágio de uma feature vem dos artefatos, não do "Status"

Um revisor externo leu o "Status: Verified" do technical-design da FEAT-001 como "feature verificada sem aceite".

**Lição:**
- No kit, "Status: Verified" no technical-design e no ui-design significa desenhado e conferido, não implementado nem aceito.
- O estágio vem dos artefatos: as caixas do tasks.md (pending, in-progress, done) e a existência de um acceptance-report com veredito Accepted.

## C11. Emendas: quando rodam e como saem

**Lição:**
- As emendas que um design aponta rodam logo depois dele, não no aceite.
- Divergência do plano registrada num design (por exemplo, a D7 da FEAT-001, com o `engine.resolve` fora da coluna "Blocos") também pede a emenda do plano pela implementation-planning.
- Um manifesto em `escalation-pending` só sai pela emenda do design.md (ux-foundations), seguida da re-verificação do ui-design.
- Se o diagnóstico de um defeito mostra que o próprio design está errado, a correção para e vira emenda (C2, C3).

## C12. Defeito em comportamento já aceito segue a rota de manutenção

**Lição:**
- Defeito em comportamento de uma feature aceita: linha no `docs/defects.md`, teste vermelho primeiro (commit próprio), correção limitada (commit próprio) e re-verificação da feature dona, numa sessão nova.
- Achado sobre comportamento aceito de outra entrega não entra no relatório da feature auditada; vai para o defects.md (como o DEF-007, achado no aceite da FEAT-001).
- Uma variante achada pelo auditor é defeito novo, não retrabalho do anterior (o DEF-006 veio da re-verificação do DEF-005).
- Ao corrigir um padrão, procure o mesmo padrão nas outras etapas: a varredura do DEF-006 achou o DEF-008 e o DEF-009 na AttributesStep.

## C13. Instabilidade é defeito, e o CI pode escondê-la

O CI usa `retries: 2` (`playwright.config.ts:12`): um teste que falha e passa na repetição deixa o run verde. No DEF-003, o WebKit no Windows com 12 workers ficava cerca de 26 s sem quadros e falhava 1 a 2 vezes em 120; com uma worker, zero.

**Lição:**
- Instabilidade é defeito. O caso é tornado determinístico (o pior caso montado de propósito, como a gravação retida ou os quadros de 60 ms) e repetido com `--repeat-each` antes de aceitar.
- Todo relato de execução informa o comando exato e o número de workers.
- No CI, olhe a contagem de flaky, não só o verde. O aceite roda com `--retries=0 --workers=1`, a configuração do CI.
- Resíduo só de ambiente (o WebKit no Windows com muitas workers) não vira defeito: nota no defects.md e no scaffold-notes.md, com o critério de zero falhas valendo para `--workers=1`.

## C14. Relato de sessão não é evidência

O "60 de 60" relatado na T4 da FEAT-001 não se reproduziu, e uma "dívida registrada" não estava registrada em lugar nenhum. Na manutenção do DEF-008, a linha do defects.md atribuiu um atraso de quadro ao ui-design, que não falava nisso.

**Lição:** para cada afirmação de um relato, peça o comando, o resultado e o lugar do registro. O que não está no repositório ou num run conferível não conta como feito.

## C15. Experimento com gravação retida cria efeitos próprios

No experimento do DEF-004, manter aberta a transação do IndexedDB adiou o commit, e o `reload` do teste abortou a gravação. Isso parecia perda de decisão, mas era efeito do experimento. O mesmo experimento revelou o DEF-005.

**Lição:**
- O critério de um experimento tem de isolar a causa: retenha só a gravação relevante.
- Prove que a sonda discrimina: rode-a também contra o código anterior à correção e veja-a falhar no ponto do defeito, e passar onde não há defeito.
- Scripts de atraso ficam fora do repositório e são descartados; o que vai para o repositório é o teste de unidade com `holdSave` ou `failSave`.

## C16. O jsdom não implementa `inert`, e uma espera pode ser satisfeita pelo motivo errado

No `Home.test.tsx`, o foco devolvido ao "···" num quadro seguinte fechava um menu recém-aberto. Isso só acontece no jsdom, que não tem `inert`. A primeira correção (`cf813de`) esperou o foco no "···", mas o React Aria já devolvia o foco ali antes do quadro do `Home.tsx`, então a espera passava sem provar que o quadro tinha rodado. Com quadros de 60 ms, ela ainda falhava 4 em 15. A correção que vale (`1806a9d`) espera o foco, um quadro, e confere de novo.

**Lição:**
- Oscilação de foco num teste de unidade pode não existir no navegador. Confira nos 5 projetos antes de mexer no produto.
- Uma espera tem de depender do mecanismo que importa. Se dois mecanismos produzem o mesmo estado, esperar o estado não prova que o mecanismo certo rodou.

## C17. Elemento fixo se mede com `getBoundingClientRect`

**Lição:** rolagem horizontal causada por um elemento fixo ou posicionado fora do fluxo se mede com `getBoundingClientRect` de cada elemento. O `scrollWidth` do documento não o vê.

## C18. Anel de foco num contêiner

**Lição:** um componente de etapa que desenha o anel de foco num contêiner leva `data-focus-ring`, e a etapa entra no `e2e/builder-dock.spec.ts`.

## C19. ADR não cita feature do plano

**Lição:** um ADR registra a decisão de arquitetura e não cita features do plano. A ligação entre feature e decisão fica no plano e nos designs da feature.

## C20. Sessões e prompts

**Lição:**
- O auditor (acceptance-verification) roda numa sessão nova, depois de `/clear`, sem o investimento de quem implementou.
- O que depende da memória de uma sessão (um experimento descartado, um script local) fica nela; a sessão seguinte só sabe o que está no repositório.
- Prompt para sessão nova traz a abertura com o que ler: os documentos, as linhas do defects.md e os commits.
- Prompts de documentação (emendas do plano, dos designs) não rodam em paralelo com outra sessão.

## C21. Comentários de revisores externos

Um revisor externo apontou "FEAT-001 Verified sem aceite" (rejeitado: C10), "DEF-003 a DEF-005 sem re-verificação" (já resolvido) e "plano §3 sem `engine.resolve`" (aceito; virou emenda).

**Lição:** cada achado de um revisor externo é avaliado contra o kit e o repositório antes de ser aceito ou rejeitado, e a decisão fica registrada.

## C22. Worktree com junção de `node_modules`

**Lição:** num worktree em que o `node_modules` é uma junção (Windows), desfaça a junção antes de `git worktree remove --force`, para a remoção não apagar o `node_modules` do repositório principal.
