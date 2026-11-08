# Gerador de personagens SotDL — Especificação do wireframe v1

Documento de passagem para o planejamento do desenvolvimento. Descreve as 16 telas do wireframe, os componentes que se repetem, as regras de interação e o modelo de dados que as telas pressupõem.

**Data:** 7 de novembro de 2026
**Origem:** canvas de design "SotDL Character Generator — Wireframe" (projeto "Gerador de personagens para Shadow of the Demon Lord").

---

## 0. Como usar este pacote

| Arquivo | Papel |
|---|---|
| `wireframe-spec-sotdl.md` (este) | Descrição das telas, componentes, interações e dados implícitos. |
| `principios-gerador-sotdl.md` | **Fonte da verdade** para regras do jogo, princípios (P1–P34) e decisões (D1–D34). Em caso de conflito com este documento, vale o de princípios. |
| `screens/SCR-xx-*.png` | Imagem de cada tela, em largura de desktop (1440px) ou celular (390px). |
| `canvas-source.zip` | Fonte do canvas (arquivos `.dc.html` + `canvas.json`). Só é útil como backup ou para reabrir no editor de design; não é código da aplicação. |

**Sobre as imagens.** São wireframes em escala de cinza: definem estrutura, conteúdo e comportamento, não a identidade visual (P33, D28 ficam para uma etapa posterior). A fonte Inter não carregou no ambiente de captura, então o texto aparece numa fonte de sistema parecida. Uma barra de rolagem fina aparece na borda direita de algumas imagens; é artefato da captura.

**Convenções.**
- Interface e conteúdo do gerador em inglês (P25); este documento em português.
- Cada tela tem um ID estável `SCR-xx`, para uso em requisitos, histórias e rastreabilidade.
- Valores entre colchetes (`[Family profession]`, `[Supplement path]`) são marcadores de conteúdo que o wireframe não preencheu.
- "Pxx" e "Dxx" remetem ao documento de princípios.

---

## 1. Escopo do wireframe

**Coberto:** configuração de fontes; criação de nível 0 (fluxo com suplemento que revisa o procedimento e fluxo do core); comparação de versões; confirmação de mudança a montante; subida de nível com escolha de path e magia; ficha de jogo; log e exportação; uma etapa no celular.

**Personagens de exemplo.**
- **Liliana**: Humana, com *Only Human* ativo (Humano revisado + tabelas de desenvolvimento), *Oddities*, *Insupposable Instruments*, *Battle Scars* e core. Aparece criando no nível 0, subindo para o nível 3 (Wizard) e já no nível 7 (Magician › Wizard › Chrononaut) na ficha.
- **Brokk**: Anão, só core. Mostra o fluxo padrão (tabelas de história com rolar/escolher/escrever, profissões, riqueza), que para Humanos é substituído pelo *Only Human*.

**Fora do wireframe** (precisa de definição no planejamento; ver seção 8 para a lista completa): etapas Roleplaying e Review; subetapas da subida de nível além de path e magia; ficha no celular; editores de pacote da casa e de texto; fluxos de importação; estados vazios, de erro e de carregamento.

---

## 2. Mapa de telas

| ID | Tela | Imagem | Objetivo | Chega de | Vai para |
|---|---|---|---|---|---|
| SCR-01 | Home · My characters | `SCR-01-home.png` | Listar personagens e iniciar um novo | Abertura do app | SCR-02 (novo), SCR-03/09 (continuar), SCR-14 (ficha), SCR-12 (subir de nível) |
| SCR-02 | Sources & rules | `SCR-02-sources-rules.png` | Configurar livros, componentes, regras opcionais, regras da casa e textos **do personagem** | Novo personagem; botão "Sources" no cabeçalho do construtor | Construtor (Apply and continue) |
| SCR-03 | Builder · 1 Ancestry | `SCR-03-ancestry.png` | Escolher ancestralidade e versão | SCR-01, SCR-02 | SCR-04, SCR-05 |
| SCR-04 | Compare versions (sobreposição) | `SCR-04-compare-versions.png` | Comparar versões de uma entidade e escolher a do personagem | "Compare versions" no SCR-03 | SCR-03 |
| SCR-05 | Builder · 2 Attributes | `SCR-05-attributes.png` | Atributos iniciais, +1 do Humano, ajuste ±1, características derivadas | SCR-03 | SCR-06 |
| SCR-06 | Builder · 3 Development | `SCR-06-development.png` | Cadeia de tabelas do *Only Human* (rolagem prescrita, modificadores encadeados, gatilho de regra) | SCR-05 | SCR-08 |
| SCR-07 | Upstream change confirmation (diálogo) | `SCR-07-change-confirmation.png` | Mostrar o impacto de mudar um resultado do qual outros dependem | "Reroll" de uma tabela com dependentes; "Change" no log | Tela de origem |
| SCR-08 | Builder · 4 Interesting thing | `SCR-08-interesting-thing.png` | Rolar a coisa interessante, com troca da tabela só para aquela rolagem | SCR-06 | Roleplaying (não desenhada) |
| SCR-09 | Core flow · Story tables (Brokk) | `SCR-09-story-tables.png` | Tabelas de história do core: rolar, escolher ou escrever | Atributos (Brokk) | SCR-10 |
| SCR-10 | Core flow · Professions & languages | `SCR-10-professions.png` | Duas profissões (rolar ou escolher), troca por idioma, renomear | SCR-09 | SCR-11 |
| SCR-11 | Core flow · Wealth & equipment | `SCR-11-wealth.png` | Riqueza 3d6, pacote de equipamento, escolha interna, decisão do mestre | SCR-10 | SCR-08 |
| SCR-12 | Level up · Expert path (nível 3) | `SCR-12-levelup-path.png` | Escolher o expert path e ver os benefícios do nível | SCR-14 ou SCR-01 (Level up) | Subetapas do nível; SCR-13 |
| SCR-13 | Level up · Magic | `SCR-13-levelup-magic.png` | Descobrir tradição ou aprender magia; Grimoire; gatilho de magia sombria | SCR-12 | Story Development (não desenhada) |
| SCR-14 | Play sheet | `SCR-14-play-sheet.png` | Ficha de jogo: valores calculados, recursos de sessão, efeitos, ataques, campos fixos, gatilhos | SCR-01, fim da criação, fim da subida | SCR-12, SCR-15 |
| SCR-15 | Character log & export | `SCR-15-log-export.png` | Histórico de tudo o que aconteceu; mudar escolha passada; exportar | Cabeçalho do construtor e da ficha | SCR-07 (Change), SCR-14 |
| SCR-16 | Mobile · Builder step | `SCR-16-mobile-builder.png` | Uma etapa do construtor no celular (Development) | — | — |

---

## 3. Estrutura comum

### 3.1 Cabeçalho do app
- Marca "SotDL Generator" (volta ao SCR-01).
- No construtor: nome, ancestralidade, nível e estado ("Level 0 · Creating", "Level 2 → 3").
- Ações à direita: **Sources** (mostra a ordem de prioridade resumida, ex.: "Only Human › Core"), **Log**, **Preview sheet**. Na subida de nível: **Cancel level up** e **Log**.
- Na ficha: miniatura do retrato (abre a imagem inteira), nome, linha de ancestralidade · paths · nível, e ações **Edit sheet**, **Log**, **Export**, **Level up to N**.

### 3.2 Construtor em três zonas (P32)
1. **Mapa de etapas** (esquerda): lista numerada; cada item mostra estado ("Done", "1 open", "Not rolled", "Optional"). Etapa atual destacada. Pode conter uma nota sobre etapas substituídas por fonte (ex.: "Professions, Wealth and the core story tables are replaced by Development").
2. **Etapa atual** (centro): cabeçalho da etapa (3.3), conteúdo, botões Back/Next no rodapé.
3. **Resumo vivo** (direita, P24): atributos com modificador, características, "Gained so far" (idiomas, profissões, história) quando relevante, e **Open decisions** com contagem e atalho para cada pendência.

No celular (SCR-16): o mapa de etapas vira um seletor no topo ("Step 3 of 6 · Development · 3 open ▾"), o resumo vira uma barra recolhível no rodapé (atributos + "Summary ▴"), e Back/Next ficam fixos embaixo.

### 3.3 Cabeçalho de etapa (P29)
- Linha pequena: "Step N of M · [regime]" (Choice, Fixed scores and choice, Prescribed rolls, Roll, choose or write your own, Choice or roll), com selo de fonte e tipo quando a etapa vem de suplemento.
- Pergunta em linguagem natural ("What is your character's ancestry?").
- Linha de regra curta + referência de página.
- Contadores em pílulas: concluídos ("Chosen 1 / 1", "10 of 13 tables rolled") em preto; pendências ("2 subdecisions open") com borda tracejada.

### 3.4 Navegação por dependências (P4, P5, D5)
- Pendências que não são dependências não bloqueiam etapas seguintes (ex.: "Interesting thing · Not blocked by this step").
- Tabelas que dependem de outras aparecem como **Waiting**, com o motivo ("Waits for Life Experience 3. Current bonus +1").
- O número de etapas muda conforme as fontes: com *Only Human* a criação tem 6 etapas; no fluxo do core, 8.

---

## 4. Componentes reutilizáveis

| Componente | Onde aparece | Comportamento e estados |
|---|---|---|
| **Selo de fonte** | Cartões, cabeçalhos, tabelas, log | Texto monoespaçado: livro + página ("CORE p.11", "ONLY HUMAN", "ODDITIES"). Página como "ch. N" quando não verificada. |
| **Selo de tipo** (P1) | Cartões, componentes | "Core", "Adds", "Replaces core", "Revises procedure", "Optional rule", "House rule". |
| **Cartão de opção** | SCR-03, SCR-12 | Nome, linha de mecânica sempre visível (P9), selos. Estados: selecionado (borda 2px), normal, **inelegível** (esmaecido, tracejado, "Not available: motivo", P31). Cartão com mais de uma versão mostra "2 versions". |
| **Alternador de versão** (P2c) | Detalhe da ancestralidade | Botões segmentados com as versões; a ativa por prioridade vem marcada. Link "Compare versions". |
| **Comparação lado a lado** (P2d) | SCR-04 | Linhas por regra, colunas por versão, coluna de status (Differs/Same), filtro "Show only differences", bloco "If you switch…" com o impacto. |
| **Subdecisão** (P30) | SCR-03, SCR-09, SCR-10, SCR-11 | Bloco "Decide now" ou caixa tracejada com escolha pequena (Size ½/1; idioma; ofício do Artisan). Pode ser adiada: vira pendência no resumo. |
| **Seletor de modo** | SCR-09, SCR-10, SCR-13 | Segmentado: Roll / Choose / Write (tabelas do core); Roll / Choose / Trade for a language (profissões); Discover a tradition / Learn a spell (magia). |
| **Cartão de rolagem** | SCR-06, SCR-08, SCR-09, SCR-10, SCR-11 | Caixa com valor + dado ("10 / 3d6"), nome da tabela, cálculo ("rolled 15 · Family Circumstances −1"), texto do resultado, **chips de efeito** ("Childhood −1", "Corruption +1", "Language +1 (choose)"), botão Reroll. Estados: **rolado**; **a rolar** (tracejado, "Roll 3d6" + "Enter result"); **aguardando** (cinza, motivo); **escolha pendente** derivada do resultado; **sem texto** (ver abaixo). |
| **Gatilho de regra** (P34, D31) | SCR-06, SCR-13, SCR-14, SCR-16 | Bloco com borda escura e rótulo "Rule triggered" + selo de página: o que disparou, a regra em uma frase, a rolagem e o resultado ("d20 = 14 · No mark. Logged."). Na ficha, vira aviso não bloqueante no topo com Roll d20 / Enter result / Undo Corruption, até ser resolvido. |
| **Seleção em grade** | SCR-09 (Hated Creature), SCR-10 (profissões) | Botões com a faixa do dado + rótulo ("3–4 Troglodytes"). Já possuído aparece desabilitado ("already yours"). |
| **Decisão do mestre** (P23) | SCR-11 | Caixa tracejada com rótulo "GM decides", campo que pode ficar "Waiting for your GM"; a pendência segue no resumo e aparece na ficha como "GM's choice". |
| **Texto ausente** (P9, P22) | SCR-03, SCR-09 | "No text added for this entry · CORE p.17" + botão "Add text". Em descrições: refs de página + "Add your own text" + "Import text pack". |
| **Composição de valor** (P11) | SCR-05, SCR-14 | Lista base + parcelas + total ("Human 10 · Rune of Speed · effect +4 · Speed 14"). Em atributos: "Base 10 · Human +1 · Adjustment −1". |
| **Linha de característica** | SCR-05 | Nome · fórmula legível · valor ("Healing Rate · ¼ Health, round down, minimum 1 · 2"). |
| **Efeito ligável** (P11c) | SCR-14 | Checkbox + nome + efeito em uma linha. Botão "+ Add a temporary effect" no fim. Não entra no log. |
| **Contador de recurso** (P13c) | SCR-14 | Health (barra + dano −/+ + Heal), Insanity (x / máx), Corruption, castings por magia (círculos cheios/vazios), "Rest: regain all castings". |
| **Cartão de ataque** (D34) | SCR-14 | Nome, selo (Equipped · two-handed · finesse / Always / Custom), Attack (+N e boons/banes), Damage, linha de origem dos ajustes. Ataques personalizados têm Edit/Remove. |
| **Formulário que expande no lugar** | SCR-14 (ataque personalizado) | Botão tracejado de largura total no fim da lista ("+ Add custom attack"); abre o formulário ali, com prévia calculada, Add/Cancel. Edit reabre o mesmo formulário no lugar do cartão. Modal só se o formulário crescer. |
| **Campo fixo da ficha** (P28) | SCR-14 | Título + "+" para adicionar; entradas com texto e **origem** ("Development · Only Human", "Magician · level 1", "Added by player"); estado vazio com texto ("None · set by your GM"). |
| **Diálogo de impacto** (P6) | SCR-04, SCR-07 | Antes/depois lado a lado; listas "Will be removed", "Will be recalculated", "Stays as it is"; nota de que o log mantém o que foi desfeito; ação conservadora à esquerda, aplicar à direita. |
| **Entrada de log** (P8) | SCR-15 | Tipo (Sources, Choice, Roll, Rule, GM grant, Edit, Play), descrição, fonte, botão Change em escolhas e rolagens. Desfeita: riscada com motivo. |
| **Retrato** (D33) | SCR-14 | Miniatura 56px no cabeçalho (botão que abre a imagem); retrato 3:4 na seção Character com Change image / Remove. No celular, só a miniatura. |

---

## 5. Telas

### SCR-01 · Home · My characters
- **Conteúdo:** cartões de personagem (miniatura, nome, ancestralidade · paths · nível, estado — "Ready to play" ou "Creating · N open decisions" —, número de livros, regras da casa ligadas, ações primária e secundária contextuais, menu "···", data de edição). Bloco "Starting a new character": copiar fontes de (defaults, outro personagem, só core) e nível inicial (sempre 0, subindo um por vez).
- **Ações:** New character, Import character file, Default sources, House rule packs.
- **Princípios:** fontes por personagem (P2); importação do arquivo do personagem (P8a, ida e volta).

### SCR-02 · Sources & rules
- **Conteúdo:** abas Books / Optional rules / House rules / Rule texts.
  - **Books:** lista em ordem de prioridade com alça de arrastar, número de posição, nome, resumo do que traz, "Active", botão "Components (N)". Componentes expandidos (ex.: *Only Human*: Human ancestry (revised) · Replaces core; Development tables · Revises procedure; Level 4 option · Adds; Random attributes · Optional rule, desligado). Core fixo no fim, com cadeado: "Always active".
  - **Optional rules:** checkbox, selo de fonte, o que afeta ("Play only", "Creation: Attributes step shows a die").
  - **House rules:** pacote embutido (P27) com "Any ancestry may roll attributes (base − 2 + 1d3)"; Import/Export pack (P21).
  - **Rule texts:** pacote de textos importado, quantas entradas cobre, quantos campos escritos à mão; Import text pack / Export my texts.
- **Coluna direita:** "What these settings mean" (P15), lista em linguagem natural gerada da configuração; aviso de que mudanças depois de escolhas passam pela confirmação de dependentes; "Apply and continue".
- **Princípios:** P2, P2a, P2b, P2e, P3, P14, P14a, P14b, P15, P16, P21, P27, P9a.

### SCR-03 · Builder · 1 Ancestry
- **Cabeçalho:** "Step 1 of 6 · Choice" / "What is your character's ancestry?" / regra + CORE p.9 / "Chosen 1 / 1", "2 subdecisions open".
- **Filtros:** busca por nome ou traço; filtro por livro; contagem por origem ("6 core · 2 from supplements").
- **Grade de cartões:** seis ancestralidades do core com mecânica resumida e página (Changeling p.13, Clockwork p.15, Dwarf p.17, Goblin p.19, Orc p.21) e duas de suplemento como marcadores. Humano selecionado, com selo "ONLY HUMAN · Replaces core · 2 versions".
- **Detalhe da selecionada:** versão em uso e por quê ("first in your priority order"), alternador Only Human / Core p.11, "Compare versions"; blocos de mecânica (atributos iniciais, características, idiomas e profissões, nível 4); **Decide now** (Size ½/1; "+1 attribute" remete à próxima etapa); bloco de texto ausente.
- **Princípios:** P1, P2c, P2d, P5, P9, P10, P29, P30.

### SCR-04 · Compare versions (sobreposição)
- **Conteúdo:** tabela Rule × Only Human (In use) × Core p.11 × Status, com seis linhas (Starting attributes, Characteristics, Languages and professions, Creation steps, Level 4, Talents); filtro "Show only differences" ("4 of 6 rows differ"); bloco "If you switch this character to Core" (o que muda, nada perdido, só este personagem).
- **Ações:** Keep Only Human / Use Core for this character / fechar.
- **Princípios:** P2c, P2d, P6, P19.

### SCR-05 · Builder · 2 Attributes
- **Cabeçalho:** "Step 2 of 6 · Fixed scores and choice"; pílulas "Human +1 · 1/1 (Will)" e "Adjustment · used (Strength → Intellect)".
- **Método:** "Fixed scores" + botão de dado **desabilitado** "Roll 8 + 1d3 each", com o motivo e link para Sources (P14b, P31).
- **Quatro cartões de atributo:** valor grande, modificador, composição ("Base 10 · Adjustment −1"), botões "Human +1", "−1", "+1".
- **Characteristics:** dez linhas com fórmula legível e valor (Perception, Defense, Health, Healing Rate, Size, Speed, Power, Damage, Insanity com máximo = Will, Corruption).
- **Princípios:** P10, P11, P14b, P30, P31, D24.

### SCR-06 · Builder · 3 Development (*Only Human*)
- **Cabeçalho:** "Step 3 of 6 · Prescribed rolls · ONLY HUMAN · Revises procedure"; regra que explica o encadeamento; "10 of 13 tables rolled", "1 choice open", "Life Experiences 2 / 3".
- **Subnavegação:** Family · Appearance · Childhood · Life Experiences (atual, "2 of 3") · Lifestyle ("Waiting") · Personality; botão "Roll the rest".
- **Sequência de cartões** agrupada (Family, Appearance, Background, Life Experiences · 3 from Age, Lifestyle and personality), com: modificador passado adiante (Family Circumstances → Childhood −1); quantidade definida por outra tabela (Age → 3 Life Experiences); tabela que chama outra (Life Experience 2 → Major Setback); escolha derivada ("Which profession did you work in?"); **gatilho de regra** (Corruption +1 → checagem de Mark of Darkness); tabela a rolar; tabela aguardando ("Starting Lifestyle · 3d6 + 1").
- **Nota de rodapé:** o livro manda aceitar o resultado; "Enter result" registra resultado da mesa e vai para o log (D30).
- **Resumo:** "Gained so far" (idiomas, profissões, história) e três pendências.
- **Princípios:** P4, P7, P8, P26, P34, D22, D30.

### SCR-07 · Upstream change confirmation (diálogo)
- **Caso mostrado:** rerrolar Age. Current (10, adulto, 3 Life Experiences) × New roll (5, adolescente, 1 Life Experience, altura e peso −25%).
- **Listas:** Will be removed (Life Experience 2 · Major Setback, com seu Corruption +1 e a checagem; Life Experience 3, não rolada), Will be recalculated (Corruption 1 → 0; altura e peso −25%; bônus de Lifestyle), Stays as it is.
- **Ações:** Keep current Age / Apply new Age. Nota: o que for removido fica no log como desfeito.
- **Princípios:** P6, P6b, P8, D32 (mesmo diálogo usado a partir do log).

### SCR-08 · Builder · 4 Interesting thing
- **Fonte da rolagem:** botão "Rolling on: ODDITIES · Oddities, Artifacts, and Esoterica ▾ · first in your priority order", com o seletor aberto: Oddities (d20 tipo + d20, padrão) ou Core p.26 (d6 + d20, "Only for this roll") (P2f, D21).
- **Resultado:** Type d20 = 2 → Art and Heirlooms; d20 = 16 → texto do item. Ações: Reroll item, Reroll type and item, Enter result.
- **Na ficha:** prévia da entrada no campo Interesting Things com origem "Creation · rolled"; "Record one granted by your GM".
- **Princípios:** P2f, P8, P23, P28, D21, D26.

### SCR-09 · Core flow · Story tables (Brokk, Anão)
- **Cabeçalho:** "Step 3 of 8 · Roll, choose or write your own"; CORE p.17–18.
- **Cartões por tabela** com seletor Roll / Choose / Write: Hated Creature (grade de dez criaturas com faixas d20; escolhida Troglodytes); Age (rolado, com texto); Build (rolado, **sem texto**, com "Add text"); Appearance (escrito pelo jogador, com "This result has a rules effect"); Background (rolado, efeito "Language +1 (choose)" e subdecisão de idioma); Personality (a rolar). Botão "Roll all undecided".
- **Princípios:** P7, P9, P22, P28, P30.

### SCR-10 · Core flow · Professions & languages
- **Profession 1:** d6 = 2 (Common) + d20 = 15 → Miner; renomeada para "Deep-vein prospector" com "Renamed with GM approval".
- **Profession 2 (ativa):** seletor Roll d6 + d20 / Choose / Trade for a language; abas por tipo (Academic, Common, Criminal, Martial, Religious, Wilderness); grade da tabela Common (18 itens), Miner desabilitado "already yours", Artisan selecionado com subdecisão "choose a trade".
- **Languages:** lista com o que sabe fazer (speak / read / write) e origem; pendência de idioma vinda da Story.
- **Princípios:** P7, P23, P28, P30. Ordem do d6 de tipos **não verificada**.

### SCR-11 · Core flow · Wealth & equipment
- **Lifestyle:** 3d6 = 15 → Comfortable; escala das seis faixas com a atual destacada.
- **Equipamento do pacote:** lista; escolha da arma (Staff / Club / Sling + 20 stones); moeda 2d6 cp = 7; "Choose one" (Small shield / Incantation of a rank 0 spell on a scroll / kit) com **GM decides** para a magia do pergaminho.
- **Extras:** Buy equipment, Add a GM grant.
- **Princípios:** P23, P28, P30.

### SCR-12 · Level up · Expert path (nível 3)
- **Mapa do nível:** Expert path, Attributes (+1 to two), Language or scholarship, Magic, Story Development (d6), Objective (d20), Equipment (worn out), Review. Nota: níveis anteriores mudam pelo log (D32).
- **Grade de paths:** filtros (All, Magic, Combat, From supplements); Wizard selecionado; um path de suplemento **inelegível** com o motivo.
- **Detalhe do Level 3 Wizard:** benefícios com rótulo "You choose" / "Automatic" / "You choose 3" / "Talent"; "Later at levels 6 and 9" recolhível.
- **"Reaching expert also asks for":** Objective, Story Development, troca de equipamento gasto.
- **Resumo:** "Changes at level 3" (Health 13 → 15, Power 1 → 2) e trilha de paths.
- **Princípios:** P13b, P29, P31, D16.

### SCR-13 · Level up · Magic
- **Escolha do nível:** Discover a tradition / Learn a spell; filtro de tradição só com as descobertas; "Show spells you can't take".
- **Lista de magias Time:** colunas Spell / Type / Rank / Status; estados Known (com quando), Can learn, Selected, **inelegível** ("Rank 3 is above your Power (2)", riscado). Opção "Also swap a spell you know…".
- **Grimoire:** três espaços (rank 1–2, qualquer tradição); Tongue Rip marcado "Dark magic" → **gatilho de regra** (d6 contra magias sombrias aprendidas; boon contra Insanity).
- **Resumo:** castings em Power 2 (3 / 2 / 1) com o valor anterior; magias conhecidas; tradições.
- **Princípios:** P11, P31, P34.

### SCR-14 · Play sheet
- **Topo:** aviso de gatilho (Corruption 1 → 2, checar Mark of Darkness) com Roll d20 / Enter result / Undo Corruption (D31).
- **Atributos:** quatro cartões com valor e modificador.
- **Characteristics:** Health (restante / máximo, barra, dano −/+, Heal, Healing Rate); Speed com selo "1 effect on" e composição aberta; grade com Defense, Perception, Power, Size, Insanity, Corruption, cada um com a fórmula curta.
- **Spells · Power N:** linhas com tradição e rank, tipo, castings como círculos; "Rest: regain all castings"; magia do Grimoire sem castings próprias.
- **Talents:** recolhíveis, com origem (path · nível) e página.
- **Character:** retrato 3:4 + campos fixos na ordem Appearance, Background, Personality, Religion, Languages, Professions, Interesting Things, Companions, Other Possessions, Marks of Darkness, Quirks, Objective.
- **Coluna direita:** **Attacks** (Staff, Unarmed strike, Thrown dagger personalizado; linha de armas naturais; "+ Add custom attack"), **Effects in play** (Rune of Speed ligado, Battle Prowess e outros desligados; "+ Add a temporary effect"), **Insanity and Corruption** (−/+, com nota de que vira evento de jogo no log), **Equipment and money**, e a explicação do **Edit sheet** (calculados ficam travados; texto, itens e regras da casa editáveis; tudo vai para o log).
- **Princípios:** P11, P11b, P11c, P12, P13, P13c, P28, P34, D31, D33, D34.

### SCR-15 · Character log & export
- **Log:** filtros (All, Choices, Rolls, GM grants, Edits and house rules, Play events); "Show undone entries"; grupos por fase (Creation · level 0, Level 3 · Wizard, Play); entradas com tipo, texto, fonte e **Change** em escolhas e rolagens; entrada desfeita riscada com motivo.
- **Export:** What (Sheet only / Log only / Sheet and log), Format (PDF / Character file), "Include my rule texts", resumo das fontes do personagem, Export.
- **Princípios:** P8, P8a, P9a, D19, D32.

### SCR-16 · Mobile · Builder step
- **Tela 390 × 844:** cabeçalho com voltar, nome e "···"; seletor de etapa; pergunta + selo de fonte; subnavegação em pílulas roláveis; cartão de rolagem, gatilho de regra, cartão a rolar; barra de resumo recolhível; Back / Next fixos.
- **Princípios:** P32.

---

## 6. Regras de interação transversais

1. **Fontes por personagem.** Cada personagem guarda livros ativos, ordem, componentes, regras opcionais e regras da casa. Trocar depois passa pelo diálogo de impacto (P6).
2. **Versão por prioridade, exceção local.** A versão em uso vem da ordem dos livros; o alternador no cartão muda só para o personagem (P2b, P2c).
3. **Exceção por rolagem.** Em tabelas roladas várias vezes, cada rolagem mostra a fonte e permite trocar só ela; quem só rola segue a prioridade sem confirmação (P2f, D21).
4. **Registrar, não fiscalizar.** Toda tabela aceita rolar ou escolher; tabelas de rolagem prescrita oferecem "Enter result"; tudo vai para o log (P7, D30).
5. **Dependências.** Uma etapa ou tabela só fica bloqueada pelo que ela realmente usa; o resto vira pendência em Open decisions (P4, D5).
6. **Mudança a montante.** Rerrolar ou mudar algo com dependentes abre o diálogo de impacto antes de aplicar; o que for desfeito fica no log (P6, P6b). Resultados não se perdem só porque a tabela mudou de fonte.
7. **Gatilhos de regra.** Eventos como ganhar Corruption ou aprender magia sombria disparam a rolagem certa, no construtor (inline) e na ficha (aviso não bloqueante que fica até ser resolvido) (P34, D31).
8. **Valores calculados.** Nada derivado é digitado; todo valor mostra a composição; efeitos temporários entram no cálculo mas não no log; ajustes manuais são modificador ou substituição nomeados (P11, P11b, P11c, P12).
9. **Subida de nível.** Reabre o construtor só com as etapas do novo nível; níveis anteriores mudam pelo log, com o mesmo diálogo de impacto (P13b, D16, D32).
10. **Edição da ficha.** "Edit sheet" libera texto, itens e entradas da casa; calculados continuam travados e mudam pelo construtor ou por modificador (P12, P13).
11. **Texto das regras.** Sem pacote de textos, cada item mostra mecânica + página; o texto entra campo a campo ou por importação, por usuário (P9, P9a, P22).
12. **Formulários pequenos expandem no lugar;** modais ficam para comparação e confirmação com consequência (D34).

---

## 7. Modelo de dados implícito nas telas

Esboço para o planejamento; não é um esquema fechado. Os princípios P11a, P17–P21b e P26 detalham as regras de conteúdo.

| Entidade | O que as telas exigem |
|---|---|
| **Book / Pack** | ID estável, nome, tipo (oficial, casa), descrição curta, resumo gerado (P15), lista de componentes com estado padrão (D20), regras opcionais. Core e pacotes da casa no mesmo formato (P21a). |
| **Component** | Pertence a um livro; tipo (Adds, Replaces, Revises procedure, Optional rule, House rule); ligado/desligado por personagem. |
| **Entity** (ancestralidade, path, magia, item, talento, tradição, tabela) | ID estável independente do nome (P18); versões por livro com herança (P19); mecânica como dados (P11a); página; texto opcional vindo do pacote de textos. |
| **Table / TableEntry** | Dado (d6, d20, 3d6…), faixas, texto, efeitos e concessões por entrada, ligações (chama outra tabela, modificador para outra, quantidade de rolagens), regime (prescrita ou rolar/escolher), campo de destino na ficha (P28). |
| **Character** | Fontes do personagem; escolhas e resultados por etapa e nível; pendências; recursos de sessão; efeitos ativos; ataques personalizados; entradas dos campos fixos; retrato. |
| **SourceConfig** | Ordem dos livros, componentes ligados, regras opcionais, regras da casa (por personagem). |
| **Decision / Roll record** | Etapa, tabela ou opção, valor do dado, modo (rolado, escolhido, escrito, informado), fonte usada, dependências (para o diálogo de impacto). |
| **LogEntry** | Tipo, texto, fonte, fase (criação, nível N, jogo), estado (ativo ou desfeito + motivo), ligação com o registro que pode ser mudado. |
| **Effect / Modifier** | Alvo (atributo, característica, ataque, rolagem), operação (soma, define, boons/banes, dano extra), origem, permanente ou temporário, ligado/desligado. |
| **Formula** | Por característica, com ordem de cálculo fixa (P11b) e limites (Defense e Perception máx. 25; Healing Rate mín. 1; Insanity máx. = Will). |
| **Grant** | Concessão do mestre, vinculada a uma dependência ou avulsa (P23, D15); decisões pendentes do mestre ("GM decides"). |
| **SessionState** | Dano, castings gastas por magia, Insanity e Corruption atuais, efeitos ligados. |
| **Attack** | Derivado (arma equipada, desarmado, armas naturais) ou personalizado (nome, atributo, boons/banes, dano, aplicar talentos/efeitos). |
| **SheetField entry** | Campo fixo, texto, efeitos e concessões, origem (P28). |
| **TextPack** | Por usuário; textos por ID de entidade e versão; importação e exportação de ida e volta (P9a). |
| **Trigger** | Evento (ganhar Corruption, aprender magia sombria…), rolagem exigida, tabela consequente, estado pendente/resolvido (P34). |

---

## 8. Lacunas e itens não verificados

**Telas ou estados não desenhados**
- Etapas Roleplaying (traços, nome) e Review da criação.
- Subetapas da subida de nível: Attributes, Language or scholarship, Story Development, Objective, Equipment (gear worn out), Review; benefício de ancestralidade no nível 4; escolha de master path (nível 7).
- Ficha de jogo no celular (D33 define só o retrato) e as demais etapas no celular.
- Formulário de concessão do mestre; editor de texto campo a campo; importação de personagem, de pacote da casa e de pacote de textos (incluindo verificação de integridade, P20); edição de pacotes da casa.
- Comparação de versões para outras entidades além da ancestralidade; Compare para tabelas.
- Mudança de fontes depois de escolhas feitas (o diálogo foi desenhado só para rerrolagem).
- Estados vazios (primeiro acesso), carregamento, erro, conflito de dados.
- Fluxo de criação de personagem com nível inicial maior que 0 está fora do escopo (sempre nível 0, subindo um por vez).

**Conteúdo não verificado no wireframe**
- Ordem do d6 de tipos de profissão (Academic, Common, Criminal, Martial, Religious, Wilderness).
- Páginas exatas da magia sombria e dos expert paths (aparecem como "ch.").
- Benefícios dos níveis 2 e 5 do Magician (os valores de Health e Power da ficha no nível 7 são ilustrativos).
- Efeitos de várias magias e do Lifestyle do *Only Human* (marcadores).
- Rune of Speed e Battle Prowess vêm da ficha de referência da Liliana, não do core.

---

## 9. Rastreabilidade princípios → telas

| Princípio / decisão | Telas |
|---|---|
| P1 fonte e tipo no ponto de escolha | 03, 06, 08, 09, 12 |
| P2, P2a, P2b, P2e configuração por livro e componentes | 02 |
| P2c, P2d versão local e comparação | 03, 04 |
| P2f, D21 fonte por rolagem | 08 |
| P3, P31 indisponível ou inelegível com motivo | 05, 10, 12, 13 |
| P4, P5, D5 navegação por dependências | 03–11, 16 |
| P6, P6b, D32 mudança a montante | 04, 07, 15 |
| P7, D30 registrar, não fiscalizar | 06, 09, 10 |
| P8, P8a log e exportação | 15 |
| P9, P9a, P22 texto e páginas | 02, 03, 09, 15 |
| P10, P24 efeito na hora e resumo vivo | 03, 05, 06, 12, 13 |
| P11, P11b, P11c, P12 valores calculados e camadas | 05, 13, 14 |
| P13, P13c ficha como tela e recursos de sessão | 14 |
| P13b, D16 subida de nível | 12, 13 |
| P14b, P27 atributos aleatórios e regras da casa | 02, 05 |
| P15 resumo das fontes | 02 |
| P21 pacotes compartilháveis | 02 |
| P23, D15 concessões e decisões do mestre | 08, 11 |
| P28 campos fixos com origem | 08, 14 |
| P29, P30 cabeçalho de etapa e subdecisões | 03, 05, 06, 09, 10, 11, 12, 13 |
| P32 três zonas e celular | todas do construtor, 16 |
| P34, D31 gatilhos de regra | 06, 13, 14, 16 |
| D33 retrato | 14 |
| D34 ataques | 14 |
