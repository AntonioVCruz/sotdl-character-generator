# UI Design: FEAT-010 — Write e "Roll all undecided"

> Feature de: `docs/implementation-plan.md` · Par com: `technical-design.md`
> Telas: SCR-WEB-009, SCR-WEB-007 · Modo: por feature, re-verificado depois da emenda D-ERR do `design.md` (`2312de8`) · Status: Verified · Data: 2026-11-24 · P1 decidida pelo usuário em 2026-11-25

Autoridade: `docs/design.md` e `docs/tokens.json`. Todo valor visual abaixo é token (`--…`) ou classe `.typography-*`; breakpoints pelos `@custom-media` da FEAT-007. Ícones Lucide, decorativos com `aria-hidden`. Texto da interface em inglês; o exemplo de texto escrito é o do AC-3, inventado, nunca do livro (P22). Este documento acrescenta e troca estados das telas da FEAT-009 ([SCR-WEB-009](../FEAT-009-decide-a-table/ui-design.md#scr-web-009--story-step)) e da FEAT-011 ([SCR-WEB-007](../FEAT-011-upstream-change/ui-design.md#scr-web-007--impact-dialog), [SCR-WEB-009](../FEAT-011-upstream-change/ui-design.md#scr-web-009--story-step)), sem editá-los. Fora desta feature: o checkbox "This result has a rules effect" do `roll-card` escrito (FR-DEC-022, FEAT-019), as tabelas aguardando (FEAT-024), as subdecisões de resultado (FEAT-012), "Add text" e o campo "Name" (P9a; FEAT-012).

**Regra de entrada dos estados (C2; D11 da FEAT-007; technical-design §3.3):** todo estado desta feature começa por uma mudança do snapshot, antes da gravação, e vale também com `save-failed`. A continuação depois do `await` de `write` e `rollAll` só trata a recusa (`empty-text`, só se nenhuma ação veio depois do clique, DEF-006) e desfaz a marca do clique; `needs-confirmation` conta como recusa. A continuação nunca move o foco.

## SCR-WEB-009 — Story step

- **Estratégia e fonte:** code-native; esta seção é o design dos estados novos. A tela é a da FEAT-009, com os estados da FEAT-011.
- **Composição:** o corpo `TablesStep` ganha, como primeiro elemento, antes do primeiro `roll-card`, a [linha do Roll all](#roll-all); o resto não muda de ordem. O `roll-card` ganha o segmento Write e os estados [write-mode](#write-mode), [write-refused](#write-refused), [written](#written) e [write-again](#write-again).
- **Dados** (technical-design §3.3): segmento Write ← `'write'` em `table.modes`; estado escrito ← `slot.result` com `mode: 'written'` (`text`); confirmar ← `session.write(key, text)`, recusa `empty-text`; Roll all ← `rollAllKeys(view, step.id)` (presença e quantidade) e `session.rollAll(step.id)`; marca do clique ← `decisions[key].logged` (FEAT-011).
- **Conformidade:** `segmented-control` (com a regra de quebra, E5), `textarea` (`design.md` §4, Formulários, com a Validação), `button-primary`, `button-secondary`, `card`, `source-badge` e `step-header`, como o `design.md` §4 os define; o `roll-card` "escrito" sem o checkbox, que é da FEAT-019. O anúncio do Roll all é uma região `role="status"` visualmente oculta, como o "Adjustment undone." da FEAT-008. Sem token, componente nem variante nova. Sem escalação.

### Cabeçalho da etapa

- **Eyebrow:** `REGIME_LABEL['roll-or-choose']` volta a "Roll, choose or write your own" (FR-DEC-002; nota do "Rótulo de regime" da FEAT-009): "STEP 3 OF 8 · ROLL, CHOOSE OR WRITE YOUR OWN", como o exemplo do `step-header` no `design.md` §4. O texto no DOM é "Step 3 of 8 · Roll, choose or write your own" (a caixa alta é do estilo `eyebrow`).
- **Linha de regra:** não muda ("Roll on each of your ancestry's tables, or choose the result you want. …" + `CORE p.11`). O eyebrow e o segmento Write já dizem que se pode escrever.
- **Frase do regime no cartão** (`REGIME_PHRASE['roll-or-choose']`): não muda, "The book says to roll or choose.". A frase diz o que o livro prevê (FR-DEC-002); o Write é a opção do gerador (FR-DEC-003, P7), e o segmento já a mostra. O item 4 do §7 do technical-design não se aplica: `e2e/story.spec.ts:118` e `src/ui/screens/Builder.test.tsx:793` continuam como estão.
- **Decisões:**
  - **Linha de regra sem o Write.** Motivo: o eyebrow e os segmentos já dizem; a linha é lida pelo `Builder.test.tsx:780` com o texto inteiro, e mudá-la pediria uma emenda do §7 do technical-design por um ganho pequeno. Alternativa rejeitada: "Roll on each of your ancestry's tables, choose the result you want, or write your own. …".
  - **Frase do regime sem o Write.** Motivo: acima. Alternativa rejeitada: "The book says to roll or choose. You can also write your own.", que poria no "the book says" uma opção do gerador.

### write-mode

O segmento e o formulário do Write. Segmentos na ordem de `table.modes`: **Roll · Choose · Write**, este só onde `'write'` está em `table.modes` (as cinco tabelas `roll-or-choose` do Dwarf; a Dwarf Hatred continua com Roll · Choose). O rótulo do segmento sai do modo, um por modo ("Roll", "Choose", "Write"); `enter` continua fora dos segmentos (botão dentro do Roll). Semântica, nome e `data-focus-ring` como os segmentos da FEAT-009.

- **Modo inicial:** o da FEAT-009 (Choose no regime `choice`, Roll nos demais). Write nunca é o inicial de uma tabela sem decisão.
- **Segmento mostrado de uma decisão escrita:** Write, pela regra da FEAT-011 (o da decisão, até a pessoa trocá-lo; volta ao da decisão quando o snapshot muda o modo dela). Se a tabela não tem `write` em `modes` (só com pacote fictício, D4), Roll.
- Trocar para o segmento Write só troca o corpo; nada é gravado e o foco fica no segmento (o campo nunca recebe foco pela troca de segmento: as setas do grupo continuam movendo entre os segmentos).

Corpo do segmento Write, **com a vaga sem decisão escrita** (a decidir, ou decidida por Roll, Choose ou Enter result):

```
Your own result                                       ← label .typography-label
┌────────────────────────────────────────────────┐
│                                                │    ← textarea, 3 linhas
└────────────────────────────────────────────────┘
Write it in your own words, or as your GM decides.    ← ajuda .typography-meta
Up to 2,000 characters.
[ Use this text ]                                     ← button-primary
Not decided yet. Nothing else waits for it.           ← sem decisão; com decisão, a coluna de resultado
```

1. **Campo:** `TextField` com `TextArea` do React Aria, `textarea` do `design.md` §4: fundo `--color-background-surface`, borda `--border-width-default` `--color-border-control`, `--radius-md`, texto `.typography-body-lg`, padding `--space-2` `--space-3`, largura total do corpo do cartão, `rows={3}`, `resize: vertical`. Rótulo visível em `.typography-label`, "Your own result", ligado por `<label>` (C9); ajuda em `.typography-meta` abaixo, ligada por `aria-describedby` (o `slot="description"` do React Aria). Enter é quebra de linha. Sem placeholder.
2. **Limite (D3):** `maxLength={2000}` no campo. A ajuda diz o limite antes de a pessoa chegar nele ("Up to 2,000 characters."). O navegador não aceita mais que isso ao digitar e corta o que se cola além do limite. Quando o texto do campo chega a 2.000 caracteres, a ajuda ganha a frase "You've reached the limit. Text past 2,000 characters isn't kept.", em `.typography-meta` `--color-text-secondary` (não é erro: sem `danger` nem `aria-invalid`), e a perde quando o texto fica abaixo do limite. Assim a tela nunca envia mais de 2.000 caracteres, e a recusa `invalid-value` do comando fica sem mensagem própria.
3. **Ação:** `button-primary` "Use this text", abaixo da ajuda, `--space-3` acima, alinhado à esquerda (campo e ação empilhados em toda largura). É a ação principal da área do formulário, como "Use this result" no Enter result. Sem "Cancel": sair do Write é trocar de segmento.
4. **Rascunho:** o texto digitado é estado local do cartão e sobrevive à troca de segmento enquanto a etapa está aberta; ele só se esvazia quando o snapshot mostra a escrita aplicada a partir dele (outro `logged` em `decisions[key]` com `mode: 'written'`). Uma decisão por outro modo (Roll, Choose, Roll all) não o apaga: de volta ao Write, o campo mostra o rascunho. Sair da etapa o descarta, como o rascunho do Enter result.
5. **Abaixo do formulário,** `--space-3` acima: sem decisão, "Not decided yet. Nothing else waits for it." em `.typography-meta`; com a decisão rolada, escolhida ou informada, a coluna de resultado dela como no [decided-choose](../FEAT-011-upstream-change/ui-design.md#decided-choose) (entrada, sem texto, efeitos, `roll-effect` e, na rolada ou informada, o cálculo; sem caixa de valor). O campo começa vazio (ou com o rascunho): a decisão atual não tem texto a editar.
6. **Confirmar:** "Use this text" chama `session.write(slot.key, draft)` com o texto como está; o comando apara as pontas (D3). Põe a marca do clique (`logged` da vaga naquele momento), como o Roll. A verificação do vazio é a recusa do comando ([write-refused](#write-refused)). Sem atalho de teclado para confirmar.
7. **Aplicado direto** (sem suspensa nem restaurada; FR-CHG-002): o cartão entra no [written](#written) pelo snapshot; o formulário sai, e o foco vai para a coluna de resultado do estado escrito (a marca é consumida quando o snapshot mostra outro `logged` em `decisions[key]`), lida pelo leitor de tela a partir do rótulo ("Your own result Raised by a caravan of tinkers. Change text"). Com suspensas ou restauradas, o diálogo abre ([by-write](#by-write)); a continuação só desfaz a marca.

- **Decisões:**
  - **O vazio pela recusa do comando, não por verificação local.** Motivo: a regra do vazio é a do `trim` do comando (D3; FR-DEC-021, AC-2 na sessão); conferir na tela duplicaria a regra em dois lugares que podem divergir. O Enter result confere na tela só o que o comando não pode receber (um texto que não é número). Alternativa rejeitada: `draft.trim() === ''` na tela, sem comando.
  - **Sem atalho para confirmar.** Motivo: Enter é quebra de linha, e um atalho como Ctrl+Enter não aparece em lugar nenhum da tela nem do `design.md`; Tab chega a "Use this text" logo depois do campo. Alternativa rejeitada: Ctrl+Enter ou Cmd+Enter.
  - **Limite no campo, com a frase no limite.** Motivo: com só o `maxLength`, um texto colado maior seria cortado sem aviso. Alternativas rejeitadas: contador "{n} of 2,000" a cada tecla, que muda a ajuda o tempo todo e pesa na leitura do campo; nenhum aviso.
  - **O rascunho sobrevive à troca de segmento.** Motivo: trocar para Roll ou Choose para comparar não pode apagar um texto longo. Alternativa rejeitada: o formulário perder o texto ao sair do segmento.

### write-refused

`session.write` recusou com `empty-text` (texto vazio, só espaços ou só quebras de linha; AC-2). O snapshot não mudou; o estado aparece pela continuação depois do `await`, só nessa recusa e só se nenhuma ação veio depois do clique (contador de ações, DEF-006), como o erro do Enter result:

- erro do `textarea` (`design.md` §4): borda `--color-state-danger`, mensagem em `.typography-meta` `--color-state-danger` com ícone `circle-alert` (`--size-icon-sm`), abaixo da ajuda, ligada ao campo por `aria-describedby`, e `aria-invalid="true"` (o `FieldError` com `validationBehavior="aria"`, como o `EnterForm`);
- texto: "Write your result first. Spaces and line breaks alone don't count." (diz o que fazer, `design.md` §6);
- o campo mantém o que foi digitado; **o foco fica onde estava** (em "Use this text", pelo clique). Como o foco não vai até a mensagem, ela é anunciada pela regra do `design.md` §4 (convenção de estados, "error"; emenda D-ERR): uma região `aria-live="polite"` que já está no formulário desde que ele abre, antes de a mensagem aparecer; ao aparecer, o leitor de tela a lê sem que o foco se mova;
- a mensagem some na próxima edição do campo;
- as outras recusas (`invalid-value`, `unknown-slot`, `change-pending`) não têm mensagem: a tela não as provoca (limite no campo; página inerte com o diálogo aberto).

- **Decisão: o foco fica no botão, com a mensagem anunciada pela região viva.** Motivo: AC-2 ("mantém … o foco") e AC-11 ("a continuação não move o foco"), e o precedente do Enter result pelo clique; a região viva cumpre a WCAG 4.1.3 sem mover o foco. Alternativa rejeitada: levar o foco ao campo na recusa, que anunciaria o erro pelo `aria-describedby`, mas contraria o AC-2 e o AC-11 e se afasta do Enter result.

### written

Começa quando o snapshot mostra a vaga com `result.mode: 'written'` (D11 da FEAT-007; C2), antes da gravação, e vale também com `save-failed`.

```
Your own result                                    ← .typography-label
Raised by a caravan of tinkers.                    ← .typography-body, quebras mantidas
[ Change text ]                                    ← button-secondary (segmento Write)
```

- **Coluna de resultado** (`id` = `resultId(key)`, `tabindex="-1"`, destino do foco), sem caixa de valor, `--space-1` entre linhas:
  1. rótulo "Your own result" em `.typography-label` (um `p`, não um `<label>`: não há campo aqui);
  2. o texto (`result.text`) em `.typography-body` `--color-text-default`, com `white-space: pre-wrap` (quebras de linha mantidas, como foram digitadas), `overflow-wrap: anywhere` (uma palavra de 2.000 caracteres sem espaço quebra na largura da coluna, sem rolagem horizontal a 320 px) e `max-width: var(--size-prose-max)`. Sem corte, sem rolagem interna: o cartão cresce;
  3. no segmento Write, a linha de ações, `--space-3` acima: `button-secondary` "Change text" ([write-again](#write-again)). É secundária porque a decisão já existe (FEAT-011, "Reroll").
- **O que não aparece:** cálculo, faixa, entidade, "No text added for this entry", `effect-chip`, caixa de `roll-effect` e selo de entrada. A escrita não tem entrada nem efeito (D6). O selo da tabela continua na linha do regime. O checkbox "This result has a rules effect" é da FEAT-019 (FR-DEC-022) e não tem lugar provisório na tela.
- **Nos outros segmentos** com a decisão escrita ([mode-switch-write](#mode-switch-write)): no Roll, a mesma coluna (rótulo e texto), sem caixa nem cálculo, com a linha de ações no fim: `button-secondary` "Roll {dado}" (não "Reroll": o resultado na tela não foi rolado, regra da FEAT-011) e, com `enter` em `table.modes`, "Enter result"; no Choose, a grade sem entrada marcada (`RadioGroup` com valor nulo) e, abaixo, a mesma coluna, sem ações.
- O texto aparece no cartão e no log (P28); a ficha o lê na FEAT-018 (technical-design §3.3). O resumo vivo recalcula o que a decisão anterior somava (por exemplo, Corruption 1 → 0 sobre a Background 1) e anuncia, como hoje.
- **Foco:** só no cartão em que a pessoa acionou "Use this text", na entrada do estado ([write-mode](#write-mode), item 7). O fim da gravação não move o foco.

### write-again

A decisão escrita, segmento Write: "Change text" troca o rótulo, o texto e a linha de ações pelo formulário do [write-mode](#write-mode), no lugar (D34), com:

- o campo preenchido com o texto atual (`result.text`), o foco nele ao abrir e o cursor no fim do texto;
- `button-primary` "Use this text" e `button-secondary` "Cancel", lado a lado abaixo da ajuda, gap `--space-2`, com quebra (`flex-wrap`) no celular;
- "Cancel" volta ao [written](#written) sem gravar, descarta a edição e põe o foco em "Change text", como o "Cancel" do Enter result;
- "Use this text" com o mesmo texto depois do `trim` (D5) não chama o comando: o formulário fecha como no "Cancel", com o foco em "Change text". Precedente: a entrada já marcada da grade não chama comando (D13 da FEAT-009);
- com outro texto, `session.write` substitui (FR-DEC-018; a anterior vai ao log como `undone`): o snapshot mostra outro `logged`, o formulário fecha e o foco vai para a coluna de resultado, com o texto novo. A escrita nunca tem dependentes (D6), então essa troca nunca abre o diálogo;
- vazio: [write-refused](#write-refused), com o formulário aberto.

### mode-switch-write

Linhas que se acrescentam à tabela do [mode-switch](../FEAT-011-upstream-change/ui-design.md#mode-switch) da FEAT-011, todas pelo mesmo pipeline (FR-DEC-018):

| Decisão atual | Ação | Comando | Diálogo com dependentes |
| :-- | :-- | :-- | :-- |
| rolada, informada ou escolhida | segmento Write, texto e "Use this text" | `write` | [by-write](#by-write) |
| escrita | "Change text", outro texto e "Use this text" | `write` | nunca (sem dependentes) |
| escrita | segmento Roll e "Roll {dado}" | `roll` | [by-reroll](../FEAT-011-upstream-change/ui-design.md#by-reroll), com o Current escrito |
| escrita | segmento Choose e uma entrada | `decide` | [by-decision](../FEAT-011-upstream-change/ui-design.md#by-decision) ou [restore-only](../FEAT-011-upstream-change/ui-design.md#restore-only), com o Current escrito |

- Enter result sobre uma escrita não aparece na tela: as tabelas com Write são `roll-or-choose` e não têm `enter` (D4). Com pacote fictício, a sessão aceita (AC-5); os textos do diálogo ficam definidos em [Textos](#textos).
- **Rótulo do Roll sobre a decidida** (troca o da FEAT-011): "Reroll {dado}" sobre resultado rolado ou informado; "Roll {dado}" sobre escolhido ou escrito.
- Sem suspensa nem restaurada, aplica direto, com o foco da FEAT-009: coluna de resultado depois de Roll e "Use this text" (marca do clique, consumida com outro `logged`); nenhum foco no Choose (fica no `radio` acionado).
- Uma escrita nunca é guardada: a troca dela por outro modo a põe no log como `undone`, nunca em "Will be set aside" (technical-design §3.2).

### roll-all

A linha do "Roll all undecided" (FR-DEC-023; D7, D9), primeiro elemento do corpo `TablesStep`, antes do primeiro `roll-card`, no espaçamento que a coluna da etapa já usa entre o cabeçalho e os cartões:

```
[ ⚄ Roll all undecided · 6 ]
```

- `button-secondary` com o ícone `dices` (`--size-icon-sm`, `aria-hidden`) antes do rótulo, alinhado à esquerda, largura do conteúdo. Secundário porque cada cartão a decidir já tem o seu `button-primary` "Roll {dado}" (`design.md` §4: um por área de decisão); a área do Roll all é a etapa inteira, e um segundo primário competiria com os dos cartões.
- **Presença e quantidade:** `rollAllKeys(view, step.id)`, a mesma regra do comando (D9): as vagas `table` da etapa sem ativa, novas ou reabertas, de qualquer regime, inclusive a Hatred; nunca a `roll-effect`. Com `n` ≥ 1, o botão está habilitado e o rótulo leva a quantidade: "Roll all undecided · {n}" (como "Stays as it is · {n}" e "Open decisions · {n}"). O nome acessível é o rótulo (C9).
- **Aciona:** `session.rollAll(step.id)`; põe a marca do Roll all (as chaves de `rollAllKeys` e o `logged` de cada uma no momento do clique). A continuação só desfaz a marca numa recusa (`nothing-to-roll`, `change-pending`, `needs-confirmation`); nenhuma delas tem mensagem: a primeira só ocorreria numa corrida, a segunda com a página inerte, e a terceira abre o diálogo ([by-roll-all](#by-roll-all)).
- **Teclado:** o botão fica entre o cabeçalho da etapa e o primeiro cartão na ordem de foco.
- **Celular e 320 px:** a mesma linha no fluxo da etapa, no topo, nunca na região fixa (Back e Next ficam sós nela); o rótulo cabe com o ícone a 320 px, e, se não couber (zoom), quebra em duas linhas dentro do botão.

- **Decisão: `button-secondary`, à esquerda, com a quantidade no rótulo.** Motivo: um primário por área de decisão (`design.md` §4); à esquerda, o botão fica na linha de leitura, logo abaixo dos contadores; a quantidade diz quantas tabelas serão roladas quando a pessoa já decidiu algumas. Alternativas rejeitadas: `button-primary`, que poria dois primários lado a lado com o "Roll {dado}" do primeiro cartão; à direita, como no wireframe (referência, não autoridade); o rótulo sem a quantidade.

### roll-all-none

`rollAllKeys(view, step.id)` vazio (todas as tabelas da etapa com decisão; uma `roll-effect` aberta não conta):

- o botão fica **desabilitado** (`isDisabled`: `--opacity-disabled`, `cursor: not-allowed`), com o rótulo sem quantidade, "Roll all undecided";
- ao lado (abaixo, quando não cabe), o motivo visível em `.typography-meta` `--color-text-secondary`: "Every table in this step has a result.", ligado ao botão por `aria-describedby` (P31; `design.md` §7, "não esconda opção sem dizer por quê"), como o motivo do Next bloqueado (FEAT-007) e o "Apply adjustment" desabilitado (FEAT-008);
- o botão desabilitado sai da ordem de foco; o motivo é texto e é lido na leitura da página.

- **Decisão: desabilitado com o motivo, não escondido.** Motivo: P31, `design.md` §7 e os precedentes da FEAT-007 e da FEAT-008; a pessoa vê que a ação existe e por que não há o que rolar. Alternativa rejeitada: o botão sumir quando não há o que rolar.

### roll-all-applied

`rollAll` aplicou direto (sem restauradas; FR-CHG-002), ou o Apply do [by-roll-all](#by-roll-all). Começa quando o snapshot mostra outro `logged` em `decisions[k]` para todas as chaves da marca (uma gravação só, C2):

- **Cartões:** cada um entra no [rolled](../FEAT-009-decide-a-table/ui-design.md#rolled) da FEAT-009 pelo snapshot: caixa de valor, cálculo, entrada, sem texto, efeitos e "Reroll {dado}" ([decided-roll](../FEAT-011-upstream-change/ui-design.md#decided-roll)). O segmento mostrado passa ao Roll em todos (a regra do segmento da decisão), inclusive na Hatred, que abre em Choose. Nenhum cartão move o foco: a marca de foco de cada cartão é só do clique no próprio cartão. Um rascunho do Write num cartão rolado fica guardado ([write-mode](#write-mode), item 4). Os cartões já decididos não mudam (FR-DEC-023).
- **Contadores e resumo:** "{d} of {t} decided" e "{n} open" seguem a visão; o resumo vivo anuncia os valores novos (`aria-live="polite"`).
- **Linha do Roll all:** passa ao [roll-all-none](#roll-all-none) (no MVP, sempre; se o botão continua habilitado, o foco fica nele).
- **Anúncio**, só na aplicação direta: a região `role="status"` visualmente oculta da linha do Roll all diz "Rolled {n} tables. {Tabela}: {valor}. …", na ordem das vagas, com o valor da [linha de decisão](../FEAT-011-upstream-change/ui-design.md#linha-de-decisão) (faixa e entidade, "7–8 Orcs"; "8–12"). Com uma, "Rolled 1 table. {Tabela}: {valor}.". Depois do Apply do diálogo, sem anúncio: o diálogo já listou os resultados.
- **Foco** (P1 = A, decisão do usuário de 2026-11-25): vai para a frase do motivo do [roll-all-none](#roll-all-none), "Every table in this step has a result.", que tem `tabindex="-1"` (só recebe foco pelo programa). Na aplicação direta, no quadro seguinte à entrada do estado, pela marca do Roll all no `TablesStep` (consumida quando o snapshot mostra outro `logged` em todas as chaves da marca); pelo Apply do diálogo `roll-all`, pelo `appliedTarget` da moldura, no quadro seguinte ao fechamento ([applied-write-roll-all](#applied-write-roll-all)). Se o botão continuar habilitado (não ocorre no MVP), o foco fica nele. O leitor de tela lê a frase e, em seguida, o anúncio.
- **Decisão: o foco na frase do motivo.** Motivo: o foco fica onde a pessoa agiu, sem rolar a página; a frase visível confirma o estado novo, e o próximo Tab vai ao primeiro cartão. Alternativas rejeitadas: B, o primeiro cartão rolado, porque a página rola para longe do botão; C, o `h1` da etapa, porque o foco volta para antes do controle acionado; manter o botão focável depois de desabilitado (`aria-disabled`), variante nova do estado desabilitado do `design.md` §4.
- **`save-failed`:** os cartões continuam rolados, com o alerta da moldura; o fim da gravação não move o foco nem repete o anúncio.

- **Notas responsivas** (acréscimo às da FEAT-009 e da FEAT-011):
  - os três segmentos seguem a regra do título: na mesma linha do nome quando cabem; senão, descem para baixo dele (FEAT-009). A 320 px, "Roll · Choose · Write" cabe numa linha abaixo do título; se não couber (zoom de texto, 200%), vale a quebra do `segmented-control` (E5): grade de 2 colunas de largura igual, Roll e Choose na primeira linha, Write na segunda, com as mesmas setas;
  - formulário do Write em largura total: rótulo, campo, ajuda, erro e ações empilhados em toda largura; no write-again, "Use this text" e "Cancel" quebram com `flex-wrap`;
  - texto escrito sem rolagem horizontal a 320 px (`overflow-wrap: anywhere`), também no diálogo;
  - alvos de `--size-touch-target` em ponteiro grosso.
- **Teclado:** cabeçalho → "Roll all undecided" (se habilitado) → por cartão: `segmented-control` → no Write: campo → "Use this text" (→ "Cancel", no write-again), ou "Change text" no escrito → … (o resto como na FEAT-011) → Back → Next. Na `textarea`, Enter é quebra de linha e Tab sai do campo.
- **Anel de foco (C18):** nenhum controle novo desenha o anel num contêiner: o segmento Write é um `Radio` com `data-focus-ring`, como os outros (já coberto pelo caso da Story no `e2e/builder-dock.spec.ts`); campo, botões e a frase do motivo desenham o anel no próprio elemento. Para a T5: nenhum caso novo no `builder-dock.spec.ts`.

## SCR-WEB-007 — Impact dialog

- **Estratégia e fonte:** code-native; esta seção acrescenta as variantes `write` e `roll-all` e a linha de uma decisão escrita ao diálogo da FEAT-011, sem mudar o resto (estrutura, foco ao abrir, Esc, Keep, notas, listas, responsivo).
- **Dados:** `snapshot.pending` com `kind: 'write'` (`key`, `impact`) ou `kind: 'roll-all'` (`step`, `keys`, `impact` sem `change`; D8); `impact.before` e `impact.after` para as colunas do Roll all; `result.text` na vaga escrita e na entrada de log escrita.
- **Conformidade:** as colunas Current × New continuam em todas as variantes (FR-CHG-003; `design.md` §4, `impact-dialog`); o Roll all as preenche com uma linha por tabela. As ações seguem "Keep current …" / "Apply …", com o precedente da vaga aberta da FEAT-011 ("Keep current result" sem resultado antes). Sem token, componente nem variante do `design.md` nova. Sem escalação.

### by-write

`pending.kind === 'write'` (pendente da `write`, com suspensas; no MVP, só com pacote fictício: AC-6, Gnome Past 4 com a Madness):

- **Título:** "Change {Tabela} from {faixa atual} to your own result?" ("Change Gnome Past from 4 to your own result?"); vaga aberta antes: "Change {Tabela} to your own result?". O valor curto de uma escrita, nos títulos, é sempre "your own result", nunca o texto (o `shortValue` não põe o texto num título).
- **Current:** o valor da FEAT-011 (faixa, cálculo ou "Chosen", efeitos). **New:** a [coluna escrita](#written-line).
- **Listas:** as da FEAT-011 ("Will be set aside" com a Madness e a nota da D40; "Will be recalculated"; "Stays as it is"). Sem a nota da rerrolagem. A decisão que sai fica em Current e em `undone`, fora das listas.
- **Ações:** "Keep current result" · "Apply new result".
- **Keep:** nada é gravado (FR-CHG-009). O foco volta ao `opener`, "Use this text", que continua na tela: o segmento Write e o formulário continuam abertos, com o rascunho. Sem o caso do Enter pela tecla (F2 da FEAT-011): o Write só confirma pelo botão.
- **Apply:** o destino do foco é a coluna de resultado do cartão, agora no [written](#written) (tabela do [applied](#applied-write-roll-all)).

**Antes escrito** (Roll, Choose ou Enter result sobre uma escrita, com suspensas ou restauradas; AC-6, "Choose 4" depois da escrita): título, ações e listas da variante da FEAT-011, com "your own result" como valor curto de Current ("Change Gnome Past from your own result to 4?"; no Roll, "Use the new roll for Gnome Past?", sem valor no título); Current é a [coluna escrita](#written-line). No Roll, a nota da rerrolagem e o Keep que grava o valor recusado (FR-CHG-010), como a "Troca de modo para Roll numa escolhida".

### by-roll-all

`pending.kind === 'roll-all'` (Roll all com restauradas; só com pacote fictício, AC-10). O diálogo é uma variante do [restore-only](../FEAT-011-upstream-change/ui-design.md#restore-only): o Roll all nunca deixa nada de lado (FR-DEC-023).

- **Com uma tabela em `keys`:** o diálogo da rolagem numa vaga aberta da FEAT-011, com a vaga `keys[0]` de `impact.before` em Current ("Not decided yet.") e de `impact.after` em New (faixa, cálculo, efeitos): título "Use this roll for {Tabela}?", "Keep current result" · "Apply new result".
- **Com duas ou mais:**
  - **Título:** "Use these rolls for {n} tables?";
  - **Current × New:** as duas colunas, com uma linha por chave de `keys`, na mesma ordem nas duas, gap `--space-1-5`: em Current, "{Tabela}: " em `.typography-body` + "Not decided yet." em `.typography-meta` (a vaga em `impact.before`); em New, a [linha de decisão](../FEAT-011-upstream-change/ui-design.md#linha-de-decisão) da vaga em `impact.after` ("Gnome Past: 4 · rolled"). Sem cálculo nem efeitos por tabela: os efeitos que mudam algo estão em "Will be recalculated";
  - **Listas:** "Will be restored" (`impact.restored`, com "depends on {decisão}" no transitivo, pela regra da FEAT-011; o dependente direto de uma tabela rolada também leva a linha, porque não há `change.key`: ver abaixo), "Will be recalculated" e "Stays as it is". Sem "Will be set aside", sem a nota da D40 e sem a nota da rerrolagem;
  - **Ações:** "Keep current results" · "Apply new results".
- **"depends on" sem `change`:** com `impact.change` ausente, todo item com `parent` leva a linha "depends on {decisão}", com o rótulo da vaga mãe em `impact.after`. Assim a pessoa vê qual rolagem trouxe cada restaurada ("Insanity 1d6: 4 · rolled" + "depends on Gnome Past").
- **Keep:** nada é gravado; os dados sorteados são descartados e nenhum contador sobe (technical-design §3.2, item 5). O foco volta ao `opener`, "Roll all undecided", que continua na tela e habilitado (o personagem não mudou).
- **Apply:** os cartões entram no [roll-all-applied](#roll-all-applied), sem anúncio; no quadro seguinte ao fechamento, o foco vai para a frase do motivo da linha do Roll all ("Every table in this step has a result."), pelo `appliedTarget` da moldura; se o botão continuar habilitado, para ele.

### written-line

A [linha de decisão](../FEAT-011-upstream-change/ui-design.md#linha-de-decisão) e a coluna Current ou New de uma decisão escrita. O valor em `.typography-badge` (mono, 12 px, uma linha) não serve para texto.

- **Linha de decisão** (em "Will be set aside", "Will be restored" e "Stays as it is", e no [open-notice](../FEAT-011-upstream-change/ui-design.md#open-notice) da moldura):
  1. primeira linha: o título em `.typography-body` ("Dwarf Appearance") e o modo em `.typography-meta`, " · written";
  2. abaixo, o texto em `.typography-body` `--color-text-default`, `white-space: pre-wrap`, `overflow-wrap: anywhere`, inteiro, sem corte;
  3. "depends on {decisão}", quando houver, abaixo do texto (no MVP, uma escrita nunca é dependente transitiva).
  O leitor de tela lê na ordem visual ("Dwarf Appearance · written Raised by a caravan of tinkers."), sem `aria-label` (C9).
- **De onde vem:** na vaga, `decision.text` (`partsOf`); vinda do log (suspensa sem vaga, no open-notice), `subject.name` e `result.text` da entrada `decision` (`partsOfLogged`), com o modo `written` da entrada.
- **Coluna Current ou New:** o texto em `.typography-body`, com as mesmas regras de quebra, e abaixo "Written" em `.typography-meta` `--color-text-secondary` (como "Chosen"). Sem faixa, cálculo nem efeitos.
- **Corpo longo:** o diálogo rola por inteiro, como na FEAT-011. Uma troca de ancestralidade com seis tabelas escritas de 2.000 caracteres rola mais, com o mesmo comportamento.

### applied-write-roll-all

Linhas que se acrescentam à tabela do [applied](../FEAT-011-upstream-change/ui-design.md#applied) da FEAT-011 (`appliedTarget` do `Builder.tsx`):

| Variante | Destino do foco | Coerente com |
| :-- | :-- | :-- |
| `write` | a coluna de resultado do cartão (`tabindex="-1"`), agora no estado escrito, lida a partir do rótulo | [written](#written) |
| `roll-all` | a frase do motivo da linha do Roll all ("Every table in this step has a result.", `tabindex="-1"`); se o botão continuar habilitado (não ocorre no MVP), o botão | [roll-all-applied](#roll-all-applied) |

O destino sai de `pending.kind`, não de `impact.change`, que o `roll-all` não tem (D8).

- **Anel de foco (C18):** os controles do diálogo são os da FEAT-011; nada novo.

## Decisões entre telas

- **"your own result" é o valor curto de uma escrita,** nos títulos do diálogo; o texto só aparece por inteiro, no cartão, nas colunas e nas linhas, nunca cortado.
- **"written" é o modo de uma escrita** na linha de decisão (" · written") e "Written" na coluna, como "rolled" / "Chosen".
- **Um botão de etapa é secundário** quando os cartões da etapa têm o seu primário (Roll all undecided).

## Textos

Fechados para a FEAT-010, revisados contra a NFR-USE-001 e o `design.md` §6 (termos da D40: só "set aside", "restored" e "undone"). `{Tabela}` é o nome da tabela; `{faixa}` com travessão (FEAT-009). Exemplo de texto escrito: "Raised by a caravan of tinkers." (AC-3). Os da FEAT-009 e da FEAT-011 continuam, salvo o que esta tabela troca.

**Etapa Story**

| Onde | Texto |
| :-- | :-- |
| Eyebrow (`REGIME_LABEL['roll-or-choose']`) | "Roll, choose or write your own" → "STEP 3 OF 8 · ROLL, CHOOSE OR WRITE YOUR OWN" |
| Linha de regra | sem mudança |
| Roll all | "Roll all undecided · {n}" · sem nada a rolar: "Roll all undecided" + "Every table in this step has a result." |
| Anúncio do Roll all | "Rolled {n} tables. {Tabela}: {valor}. {Tabela}: {valor}." · com uma: "Rolled 1 table. {Tabela}: {valor}." |

**Roll-card**

| Onde | Texto |
| :-- | :-- |
| Regime (`roll-or-choose`) | sem mudança: "The book says to roll or choose." |
| Segmentos | "Roll" · "Choose" · "Write" |
| Campo | rótulo "Your own result" · ajuda "Write it in your own words, or as your GM decides. Up to 2,000 characters." · no limite, mais: "You've reached the limit. Text past 2,000 characters isn't kept." |
| Ações do Write | "Use this text" · no write-again, também "Cancel" |
| Vazio (`empty-text`) | "Write your result first. Spaces and line breaks alone don't count." |
| Escrito | "Your own result" + o texto · "Change text" |
| Roll sobre a escrita | "Roll {dado}" ("Roll 3d6") · "Enter result" (só com `enter`) |

**Diálogo de impacto (SCR-WEB-007)**

| Variante | Título | Keep | Apply |
| :-- | :-- | :-- | :-- |
| `write` | "Change {Tabela} from {faixa atual} to your own result?" · vaga aberta antes: "Change {Tabela} to your own result?" | "Keep current result" | "Apply new result" |
| Choose ou Enter result sobre uma escrita | "Change {Tabela} from your own result to {faixa nova}?" | "Keep current result" | "Apply new result" |
| Roll sobre uma escrita | "Use the new roll for {Tabela}?" | "Keep current result" | "Apply new result" |
| `roll-all`, uma tabela | "Use this roll for {Tabela}?" | "Keep current result" | "Apply new result" |
| `roll-all`, duas ou mais | "Use these rolls for {n} tables?" | "Keep current results" | "Apply new results" |

| Onde | Texto |
| :-- | :-- |
| Coluna escrita | o texto · "Written" |
| Colunas do Roll all | Current: "{Tabela}: " + "Not decided yet." · New: "{Tabela}: {valor} · rolled" |
| Linha escrita | "{título} · written" + o texto · "depends on {decisão}" |

Exemplos: "Change Gnome Past from 4 to your own result?" · "Change Gnome Past from your own result to 4?" · "Use these rolls for 2 tables?" · "Dwarf Appearance · written" + "Raised by a caravan of tinkers." · "Rolled 6 tables. Dwarf Hatred: 7–8 Orcs. Dwarf Age: 8–12. …".

### Nomes novos contra os localizadores do e2e/ (C1)

Conferidos todos os `getByRole`, `getByText`, `getByLabel`, `getByTitle` e `getByPlaceholder` de `e2e/` contra os nomes e textos acima, em todas as telas onde aparecem (Story, diálogo e o open-notice da moldura). `e2e/` não tem `getByLabel`, `getByTitle` nem `getByPlaceholder`. Lembrete: sem `exact`, o Playwright casa por substring e sem caixa; com o diálogo aberto, o resto da página fica `aria-hidden`.

| Localizador existente | Nome ou texto novo | Situação |
| :-- | :-- | :-- |
| `main.getByText('Step 3 of 8 · Roll or choose')` (`story.spec.ts:101`) | eyebrow "Step 3 of 8 · Roll, choose or write your own" | Muda pelo §7, item 1, com o texto final daqui. "Roll or choose" não é substring do texto novo, então o localizador antigo falharia: a troca é necessária. |
| `modes(page, name).getByRole('radio')` com `toHaveCount(2)` (`story.spec.ts:110`) | segmento "Write" | Muda pelo §7, item 1: 3 nas cinco tabelas `roll-or-choose`, 2 na Dwarf Hatred. |
| `getByRole('radio', { name: 'Roll' \| 'Choose', exact: true })` (`story.spec.ts:37`, `:111`, `:112`; `builder-dock.spec.ts:363`) e `getByText('Choose', { exact: true })` (`story.spec.ts:36`, `impact.spec.ts:96`, `builder-dock.spec.ts:346`, `perf.spec.ts`) | "Write" | Sem colisão: `exact`. |
| `main.getByText(/write/i)` com `toHaveCount(0)` (`story.spec.ts:114`) | eyebrow, segmento "Write", "Your own result", ajuda ("Write it…"), vazio ("Write your result first…") | Sai pelo §7, item 1. Os segmentos das l.108 a 112 cobrem o que ela cobria. |
| `card(page, 'Dwarf Age').locator('.roll-card__regime')` com `toHaveText('The book says to roll or choose. CORE p.18')` (`story.spec.ts:118`) | — | Sem mudança: a frase do regime fica (§7, item 4, não se aplica). |
| `card(page, name).getByRole('button', { name: 'Roll 3d6' })` (`story.spec.ts:42`, `:122`), `{ name: 'Roll 3d6', exact: true }` (`impact.spec.ts:99`, `perf.spec.ts:168`) | "Roll all undecided · {n}"; "Roll 3d6" sobre a escrita | Sem colisão: todos no escopo de um cartão, e o Roll all fica fora dos cartões; "Roll all undecided" não contém "roll 3d6". O `roll3d6` só roda em cartão a decidir (Roll segment), onde o rótulo é "Roll 3d6". |
| `card(page, 'Dwarf Age').getByRole('button', { name: 'Enter result' })` com `toHaveCount(0)` (`story.spec.ts:123`) | — | Sem colisão: nenhum botão novo contém "enter result". |
| `getByText('Decided.')` (`ancestry.spec.ts:193`, Size do Human) | "Every table in this step has a result.", "Roll all undecided", "Not decided yet." | Sem colisão: nenhum texto novo contém "decided." ("undecided · 6" não tem ponto; "Not decided yet." já existia e o teste roda na Ancestry com Human, sem Story de tabelas). |
| `getByText(/^\d+ open$/)` (`story.spec.ts:179`), `getByText('{n} of 6 decided', { exact: true })` (`story.spec.ts:103`, `:162`, `:178`; `perf.spec.ts:171`), `getByText('6 open', { exact: true })` | "Roll all undecided · 6", o anúncio | Sem colisão: regex ancorada e `exact`. |
| `getByRole('heading', { name: 'Open decisions · 6' })` (`story.spec.ts:127`) | "Roll all undecided · 6" | Sem colisão: o novo é botão, não `heading`. |
| `getByRole('button', { name: 'Back' })` (`ancestry.spec.ts:130`, `builder-dock.spec.ts:70`), `'Summary'`, `'Cancel'` (`capacity.spec.ts:76`), `'More'` (no `banner`), `'Choose Dwarf'`, `'Choose Human'`, `'Apply adjustment'`, `'Undo adjustment'`, `'Next: …'` | "Roll all undecided · {n}", "Use this text", "Change text", "Cancel" (write-again), "Keep current results", "Apply new results" | Sem colisão: nenhum nome novo contém esses textos; o "Cancel" novo fica na Story, e os `'Cancel'` existentes são da Home. |
| `getByRole('button', { name: 'Keep current ancestry' \| 'Apply new ancestry', exact: true })` (`ancestry.spec.ts:201`, `impact.spec.ts:139`) | "Keep current result(s)", "Apply new result(s)" | Sem colisão: `exact`, e "ancestry" ≠ "result". |
| `dialog.getByRole('listitem').filter({ hasText: 'Dwarf Age: … · rolled' \| 'Dwarf Background: 1 · chosen' \| 'Size: 1' \| 'Corruption' })` (`impact.spec.ts`, `ancestry.spec.ts:200`) | linha escrita "Dwarf Appearance · written …" | Sem colisão: os testes não escrevem; nenhum texto escrito do pacote real entra no diálogo sem a pessoa escrever. |
| `dialog.getByRole('heading', { level: 2 })` com `toHaveText('Switch from …')` (`impact.spec.ts`) e `getByRole('heading', { level: 2, name: 'Human' })` sem escopo (`builder-dock.spec.ts:229`) | títulos "Change … to your own result?", "Use these rolls for {n} tables?" | Sem colisão: nenhum título novo contém "human" nem "dwarf", e esses testes não abrem as variantes novas. |
| `getByRole('dialog', { name: 'Creation steps' })` (`ancestry.spec.ts:15`) | títulos novos | Sem colisão. |
| `getByRole('status')` (`attributes.spec.ts:181`, com `hasText: 'Adjustment undone.'`) | a região `role="status"` do Roll all | Sem colisão: o teste fica na Attributes e filtra pelo texto. |
| `target.getByText(age.calc, { exact: true })` (`story.spec.ts:213`, Firefox) | o anúncio "Rolled {n} tables. …" | Sem colisão: o anúncio não traz o cálculo, e o teste não aciona o Roll all. |
| `getByText('Troglodytes', { exact: true })` (`story.spec.ts:142`, `perf.spec.ts:164`) | anúncio com "3–4 Troglodytes" | Sem colisão: `exact` e escopo da grade. |

Conferência do §7 do technical-design com os nomes finais:
- **Item 1** (`story.spec.ts:95`): o título ganha FR-DEC-003 e "Write on the roll-or-choose ones"; l.101 com "Step 3 of 8 · Roll, choose or write your own"; l.108 a 112 com 3 segmentos e `{ name: 'Write', exact: true }` contado 1 nas cinco, 2 segmentos e nenhum Write na Hatred; sai a l.114. Confirmado.
- **Item 2** (`Builder.test.tsx:773`): l.778 com "Step 2 of 2 · Roll, choose or write your own"; l.799 com `['Roll', 'Choose', 'Write']` na Gnome Age e na Gnome Past. Confirmado. A l.780 (linha de regra) não muda.
- **Item 3** (`evaluate.test.ts:493`): não depende de texto.
- **Item 4:** não se aplica (a frase do regime fica).
- **`getByText('Decided.')`** (`ancestry.spec.ts:193`): sem colisão (tabela acima).

**Como escrever os localizadores novos** (T5 e T6):
- tudo de um cartão no escopo dele, `card(page, name)` (`getByRole('region', { name })`): "Write", "Your own result", "Use this text", "Change text" e "Cancel" se repetem em vários cartões;
- o segmento como os outros: clicar o texto, `modes(page, name).getByText('Write', { exact: true })`, e conferir `modes(page, name).getByRole('radio', { name: 'Write', exact: true })` com `toBeChecked()`;
- o campo por `card(page, name).getByLabel('Your own result')` (o rótulo do estado escrito é um `p`, não um `<label>`, então não casa) ou `getByRole('textbox', { name: 'Your own result' })`;
- as ações com `exact: true`: `getByRole('button', { name: 'Use this text', exact: true })`, `'Change text'`, `'Cancel'`;
- o erro pelo texto, `card(page, name).getByText("Write your result first. Spaces and line breaks alone don't count.")`, com `toHaveAttribute('aria-invalid', 'true')` no campo, o valor do campo mantido (`toHaveValue`) e o foco em "Use this text" (`toBeFocused()`);
- o texto escrito por `card(page, name).getByText('Raised by a caravan of tinkers.', { exact: true })`;
- o Roll all no `main`, com `exact`: `page.getByRole('main').getByRole('button', { name: 'Roll all undecided · 5', exact: true })`; depois, `{ name: 'Roll all undecided', exact: true }` com `toBeDisabled()` e o motivo por `getByText('Every table in this step has a result.')`. Sem `exact`, "Roll all undecided" casaria com qualquer quantidade;
- os resultados do Roll all pelos cartões (`.roll-result__calc` e `.roll-result__entry` no escopo de cada um, como o `roll3d6`), não pelo anúncio;
- no diálogo, `page.getByRole('dialog')` sem nome e as ações com `exact: true`: "Keep current result" é substring de "Keep current results", e "Apply new result" de "Apply new results";
- **Firefox e o axe** (T6, AC-12): o contorno do `docs/scaffold-notes.md` (C23), como o caso atual do `story.spec.ts`: página nova no mesmo contexto, depois de `saved(...)` com a Appearance, a espera do estado pelo texto (`target.getByText('Raised by a caravan of tinkers.', { exact: true })`, sem localizador por nome) e o axe nessa página. O campo do Write usa `<label>`, não `aria-labelledby`; os cartões continuam com `aria-labelledby`, por isso o contorno.

## Escalações e pendências

Nenhuma escalação para o detailed-design nem pergunta aberta. Decidido pelo usuário em 2026-11-25 sobre a primeira versão (`ec9f3a7`):

- **P1. Foco depois do Roll all undecided aplicado** (direto e pelo Apply do diálogo `roll-all`): alternativa A, a frase do motivo da linha do Roll all, com `tabindex="-1"`. Aplicada no [roll-all-applied](#roll-all-applied), no [by-roll-all](#by-roll-all) e na tabela do [applied-write-roll-all](#applied-write-roll-all). Rejeitadas: B, o primeiro cartão rolado (a página rola para longe do botão), e C, o `h1` da etapa (o foco volta para antes do controle acionado).
- **D-ERR. Erro anunciado por região viva** (ux-foundations; `design.md` §4, convenção de estados "error" e `text-input / textarea`, e §5): a nota da primeira versão sobre o Enter result virou emenda do `design.md` (`2312de8`). Re-verificado: o [write-refused](#write-refused) segue a regra emendada. O Enter result da FEAT-009 ([entering](../FEAT-009-decide-a-table/ui-design.md#entering)) passou a dizer o anúncio, e o código que ainda não o faz é o [DEF-013](../../defects.md).

Notas, sem emenda:
- **Para a FEAT-012** (technical-design §8): se o Roll all passar a rolar vagas filhas abertas no mesmo comando, a quantidade do rótulo e o anúncio seguem o `rollAllKeys`, sem mudar a tela.
- **Para a FEAT-024:** com tabelas aguardando, o `rollAllKeys` as exclui; o motivo do botão desabilitado, se só restarem tabelas aguardando, é texto dessa feature.
- **RTM:** recebe este `ui-design.md` na Design ref das FRs que as telas daqui realizam: FR-DEC-002, 003, 016, 018, 021, 023; FR-STEP-012; FR-CHG-001, 003, 004.
