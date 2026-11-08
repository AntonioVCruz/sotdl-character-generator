# Gerador SotDL — Documento de princípios

Documento vivo. Atualizado ao longo da conversa.

**Status:** 3 referências de geradores, 4 suplementos e o core completo analisados. Decisões D1–D34 fechadas. Todos os princípios validados (P1–P34). Wireframe v1 publicado (16 telas, ver seção 6); nenhuma decisão em aberto.

**Legenda de fontes**
- **[Core]** — confirmado no livro básico (capítulo de criação lido por OCR; livro completo lido em texto).
- **[Não verificado]** — vem da memória; precisa de confirmação do Antônio.

---

## 1. Base de comparação: fluxo de criação do livro básico [Core]

### 1.1 Regimes de decisão

O core usa quatro regimes, não dois:

| Regime | Significado |
|---|---|
| **Escolha** | O jogador decide. |
| **Rolagem com escolha permitida** | O texto manda rolar, mas permite escolher ou inventar o resultado. |
| **Rolagem prescrita** | O texto só fala em rolar. |
| **Derivado** | Valor calculado a partir de outros. |

### 1.2 Etapas (nível 0)

| # | Etapa | Regime | Observações |
|---|---|---|---|
| 1 | Ancestralidade | Escolha | Seis no core: humano, changeling, clockwork, anão, goblin, orc. O texto prevê "outras a critério do mestre". |
| 1a | Atributos | Fixos + escolha | Valores iniciais fixos por ancestralidade. Humano: +1 em um atributo à escolha. Ajuste opcional de +1/−1, uma única vez. |
| 1b | Características | Derivadas + fixas | Perception = Int (+1 em algumas); Defense = Agi (clockwork: 13); Health = Str (+4 no anão); Healing = ¼ Health. Size, Speed, Power, Damage, Insanity e Corruption fixos. Humano escolhe Size ½ ou 1. |
| 1c | Idiomas, profissão e talentos da ancestralidade | Fixos, com exceções | Humano escolhe idioma extra **ou** profissão aleatória. Anão *escolhe* a Hated Creature (a tabela tem coluna d20). |
| 1d | Tabelas mecânicas da clockwork | Rolagem (d20) | Purpose: +2 em atributo, às vezes à escolha entre dois. Form: altera Size, Health, Speed e Defense. |
| 2 | Tabelas narrativas (idade, porte, aparência, background, personalidade, religião, etc.) | Rolagem com escolha permitida | O texto diz explicitamente: rolar, escolher ou inventar. Várias entradas têm efeito mecânico (ver 1.3). |
| 3 | Duas profissões | Escolha livre **ou** d6 (tipo) + d20 | Uma profissão pode ser trocada por um idioma ou pela leitura de um idioma. Pode ser renomeada com aval do mestre. |
| 4 | Riqueza e equipamento | Rolagem prescrita (3d6) | Riqueza define pacote fixo, com dinheiro rolado e escolha interna (escudo, pergaminho ou kit). A magia do pergaminho é escolhida pelo **mestre**. |
| 5 | Coisa interessante | Rolagem prescrita (d6 + d20) | Sem opção de escolher no texto. |
| 6 | Interpretação | Livre | Dois traços positivos e um negativo (tabela d20 opcional "para inspiração"); perguntas de interpretação; nome a partir de lista sugerida. |
| 7 | Avanço (níveis 1–10) | Escolha nos níveis 1, 3 e 7 | Nos demais, benefícios automáticos. Nível 4: benefício da ancestralidade (magia **ou** talento). Começando em nível alto: +2d6 ss por nível e +1 coisa interessante aleatória a cada path escolhido (1, 3 e 7). |

### 1.3 Observações relevantes para o design

- **Tabelas narrativas com efeito mecânico.** Backgrounds podem dar 1d6 Insanity, Corruption, idioma, leitura do Common, 2d6 cp ou profissão extra; um background do changeling bloqueia Steal Identity. Rolar de novo uma tabela "de história" pode mexer no esqueleto.
- **Etapas que puxam outras tabelas.** Aparência do changeling redireciona para tabelas de outra ancestralidade (num resultado, quem decide é o mestre). Humano e alguns backgrounds puxam a tabela de profissões. Coisas interessantes ficam atreladas aos níveis em que se escolhe path.
- **Decisões do mestre dentro do fluxo:** magia do pergaminho, ancestralidades extras, profissões renomeadas, um resultado do changeling.
- **Ambiguidade a decidir:** o texto permite escolher resultados das tabelas "de história" da ancestralidade. Não está claro se isso vale para Purpose e Form da clockwork, que alteram números.
- **Paths e magia:** verificados no core completo (ver 1.5).

### 1.4 Comparação com a ficha da Liliana

- **Possíveis campos ausentes** (confirmar; o HTML veio truncado na leitura): idade, porte, aparência, background, personalidade, religião, riqueza/estilo de vida e coisas interessantes (no nível 7 seriam quatro: uma inicial + uma em cada nível 1, 3 e 7).
- **Derivado vs. armazenado:** a ficha guarda Health como valor-base editável; a regra deriva Health de Strength. Decidir no esqueleto.

---

### 1.5 Verificado no core completo

**Paths e subida de nível**
- Níveis: novice em 1, 2, 5 e 8; expert em 3, 6 e 9; master em 7 e 10 (cada path traz os benefícios do seu nível).
- Benefícios possíveis por nível: aumento de atributos à escolha (novice: dois atributos em 1; experts variam entre dois e três), características fixas (Health, Power, Defense), idiomas e profissões (muitas vezes à escolha), magia (descobrir tradição ou aprender magia, N vezes) e talentos.
- Cada novice path tem uma tabela d6 de *Training*; cada expert path, uma tabela d6 de *Story Development*. Ambas: escolher, rolar ou inventar.
- Ao chegar ao nível expert, o personagem define um *Objective* (tabela d20 de *Character Objectives*: escolher ou rolar).
- Ao escolher um expert ou master path, o equipamento não mágico se desgasta e precisa ser substituído.
- Tabela opcional de *Group Identity* (d6) no nível 1, para o grupo.

**Magia**
- Descobrir uma tradição dá automaticamente uma magia de rank 0 dela (à escolha). O Magician ganha uma rank 0 extra por tradição (Cantrip).
- Aprender magia: de tradição já descoberta, com rank ≤ Power. Ao aprender, pode trocar uma magia já aprendida por outra de rank igual ou menor.
- Priest: tradições restritas às associadas à religião do personagem (a *Religion* é estrutural para priests).
- Conjurações por rank dependem do Power (tabela Castings); recuperadas após um descanso + 1 minuto de meditação ou estudo.
- Magia sombria (Forbidden, Necromancy): +1 Corruption ao descobrir a tradição; ao aprender cada magia, rola d6 e, se for menor que o total de magias sombrias aprendidas, +1 Corruption. Cada magia sombria dá 1 boon para resistir a Insanity.
- Grimoire (Wizard): três magias de rank ≥ 1, de qualquer tradição; conta como "aprender" para fins de Corruption.

**Características e estado**
- Defense máxima 25; Perception máxima 25; Healing rate = ¼ Health, mínimo 1; Health acompanha mudanças de Strength.
- Armadura substitui a Defense (Agility + X ou valor fixo) e exige Strength mínima (11, 13 ou 15).
- Insanity: máximo = Will; ao chegar a Will, o personagem enlouquece (tabela d20 de Madness) e depois reduz 1d6 + modificador de Will. *Quirks* (definidas pelo mestre) reduzem Insanity e são permanentes.
- Corruption: efeitos por faixa (0–3 nenhum; 4–6 1 bane social e animais hostis; 7–8 −1 nas rolagens de destino e sinal físico; 9+ morre ao ficar incapacitado, alma presa no Inferno).
- **Marks of Darkness:** sempre que ganhar Corruption, rola d20; se for menor que a nova Corruption, rola na tabela de *Mark of Darkness* (d20). Uma marca repetida vira 2d6 de Insanity.

## 2. Interferência dos suplementos

As seções 2.1 e 2.2 nasceram da memória ([Não verificado]); a 2.3 traz os casos verificados nos suplementos enviados pelo Antônio.

### 2.1 Pontos de interferência

| Ponto do fluxo | Tipo provável | Exemplo |
|---|---|---|
| Lista de ancestralidades | Expande | Novas ancestralidades no *Demon Lord's Companion* e em suplementos menores |
| Ancestralidade existente | Substitui | Versões revisadas de ancestralidades do core |
| Geração e ajuste de atributos | Revisa regra | Métodos alternativos em regras opcionais (*Forbidden Rules*?) |
| Tabelas narrativas | Expande ou substitui | Tabelas novas ou alternativas por ancestralidade |
| Profissões | Expande | Novas listas |
| Riqueza e equipamento | Expande (itens), talvez revise regra | Novos itens e pacotes |
| Coisas interessantes | Expande ou substitui | Tabelas novas ou revisadas |
| Benefício de nível 4 da ancestralidade | Substitui ou expande | Variantes junto com ancestralidades revisadas |
| Paths novice, expert e master | Expande (muito), às vezes revisa | Novos paths em vários livros; paths de sacerdote ligados a religiões |
| Tradições e magias | Expande, talvez substitua | Novas tradições; revisões de magias |
| Tabelas que apontam para outras | Efeito colateral | Aparência do changeling e profissões aleatórias ganham ou não mais opções, conforme o suplemento |

### 2.2 Padrões de interferência

1. **Adição.** Entradas novas numa lista existente. Sem conflito: união de listas.
2. **Substituição de entidade.** Mesma coisa (ex.: "Goblin"), conteúdo diferente. Pede fonte padrão + troca; afeta escolhas já feitas.
3. **Substituição de tabela.** Mesmo dado e mesmo lugar no fluxo, conteúdo diferente. Um resultado já rolado pode deixar de existir.
4. **Revisão de procedimento.** Muda *como* a etapa funciona ou acrescenta etapa. Altera o esqueleto do fluxo. Maior risco.
5. **Regra opcional.** Variante que coexiste com a original e se liga/desliga, em vez de substituí-la. Pode se acumular.
6. **Propagação.** Qualquer padrão acima pode se espalhar por etapas que referenciam outras tabelas.
7. **Conteúdo condicional.** Uma entrada muda conforme outro livro ou regra esteja ativo ("se você tem o *Terrible Beauty*…; se não…"). Verificado em 2.3.

**Resolvido:** os padrões 4 e 5 não cabem no mecanismo de "trocar a fonte"; são tratados como componentes com estado padrão próprio (P14a, D3, D20).

### 2.3 Casos verificados

| Livro | O que traz | Padrões | Observações |
|---|---|---|---|
| *Only Human* | Humano variante (atributos padrão **ou** aleatórios 8 + 1d3; idiomas e profissões vêm das tabelas); nível 4 com opção extra "discover a tradition"; tabelas de desenvolvimento (família, idade, infância, experiências de vida, profissões com itens, estilo de vida, personalidade) | 2, 3, 4, 7 | As tabelas substituem as etapas de profissões e riqueza do core para Humanos e são encadeadas com modificadores (Idade define quantas Life Experiences; Family dá bônus em Childhood; experiências somam bônus no Lifestyle). O livro manda rolar e aceitar o resultado. Várias entradas dependem de outros livros (*Demon Lord's Companion*, *Tombs of the Desolation*, *Terrible Beauty*, *Tooth and Claw*). |
| *Oddities, Artifacts, and Esoterica* | Tabelas de coisas interessantes (d20 de tipo + d20 por tipo) | 3, 7 | "Quando você for ganhar uma coisa interessante, pode usar estas tabelas no lugar das do core": a escolha é por ocorrência. Uma entrada remete ao *Dark Passages*. |
| *Insupposable Instruments* | Itens (alquímicos, proibidos, poções, equipamento, engenharia), animais, veículos, propriedades, negócios, mercadores errantes | 1, 7 | Sem conflito. Referências condicionais a *Battle Scars* (Sawbones Tools, Clockwork Limb) e ao *Demon Lord's Companion*. Parte do conteúdo (veículos, negócios, mercadores) é material de mestre e fica fora do personagem. |
| *Battle Scars* | Duas regras opcionais (Injuries; Incapacitated Characters, mais letal); próteses e membros mecânicos; magias Restore Body (Life 4) e Unspeakable Graft (Forbidden 4) | 1, 5 | As regras afetam o jogo, não a criação: ferimentos podem ser permanentes (−1 em atributo, perda de membro). Conteúdo útil mesmo com as regras desligadas. |

---

## 3. Princípios de design

Estado de cada princípio: **proposto** (extraído de referência, aguardando validação) ou **fechado** (decidido pelo Antônio).

### Fontes

- **P1. A fonte aparece no ponto de escolha.** Toda opção mostra no próprio cartão de que livro vem **e** o tipo: novo, substitui [original] ou casa. *Fechado (validado; revisado após o SWCharGen e a D11) — origem: D&D Beyond.*
- **P2. Fontes escolhidas nas configurações, livro a livro.** A configuração é por personagem e lista cada livro individualmente (D7). Cada item aparece no fluxo como uma entrada única, na versão definida pelas configurações (D4). O escopo de cada configuração é explícito (personagem, usuário, navegador). *Fechado (D4, D7).*
- **P2e. Cada livro abre uma lista de componentes.** O livro é a unidade de ligar/desligar e da ordem de prioridade, mas dentro dele cada componente se liga e desliga sozinho: conteúdo novo, substituição de entidade, substituição de tabela, revisão de procedimento, regra opcional. Ex.: *Only Human* ligado com as tabelas de desenvolvimento desligadas; *Battle Scars* ligado com as regras de ferimentos desligadas. Componentes podem declarar dependência entre si (P20). *Fechado (D20; amplia a D7 após os suplementos).*
- **P2b. Precedência por ordem de livros.** Na lista de livros das configurações, a ordem define a prioridade: quando dois livros ligados definem a mesma entidade, vale a versão do livro mais acima. **Ordem padrão:** o core fica sempre por último; cada suplemento ligado entra acima dele (presume-se que a mesa ligou o suplemento porque quer o que ele traz). O usuário pode reordenar. *Fechado (D8; ordem padrão definida após o Only Human).*
- **P2c. Exceção local no cartão do item.** Itens com mais de uma versão disponível mostram um toggle para alternar entre elas, sobrepondo a ordem de prioridade só para aquele item, naquele personagem. A exceção fica visível (ex.: "versão alterada manualmente") e pode ser desfeita. Trocar a versão de um item já escolhido segue a regra de mudança a montante (P6). *Fechado (D9). Cobre o contra da D8: permite exceções pontuais.*
- **P2f. Exceção por rolagem.** Em tabelas que se rolam mais de uma vez (ex.: coisas interessantes no nível 0 e nos níveis 1, 3 e 7), cada rolagem mostra a fonte da tabela, definida pela ordem de prioridade. Clicar na fonte permite trocá-la só para aquela rolagem; quem apenas rola segue o padrão, sem confirmação extra. *Fechado (D21).*
- **P2d. Comparação entre versões.** Itens com mais de uma versão oferecem uma comparação lado a lado, destacando o que muda entre elas. *Fechado (D9). Forma da comparação a definir no wireframe.*
- **P2a. A lista de livros precisa ser navegável por quem não os conhece.** Consequência da D7: com dezenas de suplementos, a lista exige mitigação (agrupamento visual, busca, descrição curta por livro). *Fechado (validado).*
- **P3. Quando algo some, a interface diz por quê.** Opção indisponível por causa da configuração de fontes é explicada no lugar onde faria falta, com atalho para ligá-la. *Fechado (validado) — origem: D&D Beyond (avisa, mas de forma genérica).*
- **P14. Ativar não é priorizar.** A configuração separa duas perguntas: "quais fontes estão disponíveis" e "qual versão vale por padrão quando duas fontes definem a mesma coisa". *Fechado (validado) — o D&D Beyond só responde à primeira; com 5e e 5.5e ligados, as duas versões aparecem lado a lado.*
- **P14a. Componentes declaram seu estado padrão; nenhuma mudança é silenciosa.** Ligar um livro aplica os componentes marcados como padrão nos dados. Heurística (o mais específico prevalece): componentes de uma entidade específica vêm ligados com o livro (ex.: tabelas do Humano no *Only Human*); regras que mudam o jogo para todos vêm desligadas (ex.: ferimentos do *Battle Scars*, atributos aleatórios). A transparência vem da lista de componentes (P2e) e do resumo automático do livro (P15), que diz o que cada componente substitui. Cada regra declara qual etapa **ou parte da ficha** afeta, se substitui ou soma, e com quais outras regras conflita; conflitos são avisados ao ligar. Ligar ou desligar um componente depois de feitas as escolhas segue o P6. Componentes que acrescentam etapas acrescentam nós ao mapa de dependências (P4). O log registra os componentes ativos. *Fechado (D3, revisado pela D20: o padrão deixou de ser "sempre desligado").*
- **P14b. Atributos aleatórios: regra oficial por ancestralidade, com regra da casa embarcada para as demais.**
  - **Regra oficial:** ancestralidades cujo livro traz a opção de atributos aleatórios podem rolar quando esse livro e essa opção estão ativos. Os números vêm de cada ancestralidade (Humano do *Only Human*: 8 + 1d3 em cada atributo).
  - **Regra da casa embarcada "Permitir qualquer ancestralidade rolar atributos"** (desligada por padrão, D20): com ela ligada, toda ancestralidade pode rolar, usando **atributo-base da ancestralidade − 2 + 1d3** para cada atributo. Onde existe fórmula oficial, ela prevalece; a fórmula da casa preenche as lacunas. (Para o Humano, as duas dão o mesmo resultado.)
  - **Na interface:** a etapa de atributos mostra um pequeno dado ao lado dos atributos quando rolar é permitido. Sem permissão, o dado não aparece. A rolagem vai para o log (P8).
  - **Ajuste do core:** o ajuste de +1 num atributo e −1 em outro, uma única vez, continua valendo depois de rolar; é regra geral de criação. Ordem na etapa: atributos-base (fixos ou rolados) → ajuste opcional de +1/−1.
  *Fechado (D23, D24).*
- **P27. O gerador traz um pacote de regras da casa embarcado.** Regras que não vêm de nenhum livro, mas que o próprio gerador oferece (ex.: "Permitir qualquer ancestralidade rolar atributos"), ficam num pacote da casa que já vem instalado. Ele aparece na lista de livros como qualquer pacote (P21), com a marca "casa" (P1) e suas regras desligadas por padrão. *Fechado (D23).*
- **P15. Cada fonte se explica.** Uma frase sobre o que o livro ou pacote traz, mais um resumo gerado a partir dos dados (P17, P18). Ex.: "adiciona 3 ancestralidades, substitui Goblin e Changeling, traz 2 regras opcionais". Vale também para pacotes da casa, sem depender de quem os escreveu. *Fechado (validado; revisado após o SWCharGen) — origem: D&D Beyond ("may conflict with the Core Rules").*
- **P16. Conteúdo da casa entra como fonte, e as três camadas da mesa não se misturam.** O conteúdo da casa usa o mesmo mecanismo das fontes oficiais e pode adicionar ou substituir (D11). As três camadas da mesa são distintas:
  - **conteúdo da casa** (pacote; vale para todo personagem que o usa — P21);
  - **concessão do mestre** (vale para um personagem, fora da regra — P23);
  - **ajuste manual** (muda um valor da ficha — P12).
  *Fechado (validado; revisado após o SWCharGen e a D11) — origem: D&D Beyond (Homebrew como categoria de fonte).*

### Navegação

- **P4. Navegação guiada por dependências.** Uma etapa só é liberada quando suas dependências estão resolvidas. Pendências que não são dependências não bloqueiam nada: ex., faltar escolher uma tradição não impede rolar as tabelas aleatórias. O que falta aparece como contagem ("2 escolhas"). *Fechado (D5). Consequência: é preciso mapear explicitamente o grafo de dependências entre etapas.*
- **P5. Ordem segue as dependências da regra.** No SotDL, ancestralidade vem primeiro, porque define atributos e as tabelas narrativas. *Fechado (decorre da D5).*
- **P6. Mudança a montante desfaz os dependentes, com confirmação.** Ao trocar uma escolha da qual outras dependem, a interface lista o que será desfeito antes de aplicar; ao confirmar, os dependentes são removidos e o estado fica sempre válido. Vale para qualquer mudança a montante: escolha, versão no cartão (P2c), regra opcional (P14a), ligar ou desligar livro, reordenar a lista de livros, remover ou atualizar pacote (D13). *Fechado (D6; ampliado após o SWCharGen). Contra aceito: rolagens dependentes se perdem (mas ficam no log, P8).*
- **P6b. Resultado obtido não depende da fonte da tabela.** Desfaz-se o que depende de uma *escolha* que mudou (trocar de ancestralidade desfaz o background dela) ou de um *procedimento* que mudou (desligar as tabelas do *Only Human* desfaz o background feito com elas). Permanece o que só veio de uma tabela cuja fonte mudou: o resultado fica na ficha, marcado com a fonte de origem, e a mudança vale para as próximas rolagens. *Fechado (D21).*
- **P6a. Personagem acompanha a versão atual dos pacotes.** Quando o mestre atualiza um pacote já usado, o personagem passa a usar a nova versão: derivados se recalculam sozinhos e, se a mudança desfizer escolhas, vale o P6. *Fechado (D13). Contra aceito: um personagem pode mudar sem o jogador ter feito nada.*

### Escolha e aleatoriedade

- **P7. O gerador registra, não fiscaliza.** Toda tabela aceita rolar ou escolher, inclusive as que têm efeito mecânico (Purpose/Form da clockwork). Presume-se que o personagem foi criado do jeito que a mesa joga. O regime da regra (ver 1.1) aparece como indicação, não como restrição. Rolar é um botão ao lado da escolha, não um modo global. *Fechado (D1). Confirmado: vale também para as tabelas de rolagem prescrita (riqueza e coisa interessante).*
- **P8. Log do personagem.** Cada mudança permanente fica registrada com sua origem: rolado (com o valor do dado e quantas vezes foi rolado), escolhido, inventado, versão alterada (P2c), editado manualmente (P12), concedido pela mesa (P23), desfeito por mudança a montante (P6) ou ocorrido em jogo (P13c). O log cobre a criação e toda a vida do personagem; estado de sessão (dano, usos por descanso, efeitos temporários) fica de fora. Rolagens com modificadores registram o dado e cada modificador aplicado (ex.: "3d6 = 9, +1 por família Comfortable → 10"). *Fechado (D1, ampliado pela D19). Efeito colateral útil: rolagens desfeitas pela D6 somem da ficha, mas continuam no log. Registro de modificadores: validado após o Only Human.*
- **P8a. Exportação independente de ficha e log.** O usuário exporta só a ficha, só o log ou ambos. *Fechado.*

### Apresentação das regras

- **P9. Divulgação progressiva, com mecânica sempre visível e texto preenchível.** Três níveis de texto por item: **uma linha → resumo → texto completo**. Quem conhece o sistema lê só a primeira linha; quem não conhece expande.
  - **Dados mecânicos sempre aparecem.** O que o gerador já precisa saber para calcular (P11a) é mostrado como resumo gerado automaticamente a partir do modelo. Ex.: "Health +5 at level 4; learn one spell or gain Determined". Isso mantém o P10 funcionando desde o primeiro uso.
  - **Texto descritivo começa vazio, só com a referência de página** (P22). O gerador não traz texto dos livros.
  - **Nível vazio cai no seguinte:** uma linha vazia → resumo mecânico automático; resumo ou texto completo vazios → referência de página. Quem preencher só o texto completo já tem uma experiência razoável.
  - **O texto pertence a uma versão específica** da entidade (P18). O texto do Goblin do core não aparece no Goblin revisado. Pacotes da casa podem trazer seus próprios textos completos.
  - **Escopo do texto: por usuário**, valendo para todos os seus personagens (P2), porque descreve o item, não o personagem.
  *Fechado (D18; revisado após o SWCharGen e o P22) — origem: D&D Beyond.*
- **P9a. Texto entra campo a campo ou por importação, nos dois sentidos.** O usuário pode editar cada campo de texto no próprio gerador ou importar todos os textos num formato documentado (o mesmo dos pacotes, P21a). O que for digitado pode ser exportado nesse formato, para que o mestre preencha uma vez e distribua um pacote de textos à mesa. Esse editor só de texto é uma **exceção explícita à D10**: não mexe em mecânica nem em dependências; cria a camada "só texto" do P17. *Fechado (D18).*
- **P10. O efeito aparece no momento da escolha.** Ao escolher uma opção, a interface mostra o que ela muda na ficha (atributos, características, etapas novas). *Fechado (validado).*

### Edição depois da criação

- **P11. Valores derivados são sempre calculados e mostram sua composição.** Ex.: Health = Strength + bônus de ancestralidade + bônus dos paths + efeitos ativos + ajuste manual. Nada derivado é guardado como número solto. *Fechado (D2) — origem: D&D Beyond (Score Calculations).*
- **P11a. Fórmulas pertencem às fontes.** Cada ancestralidade, path, item ou efeito declara as fórmulas e modificadores que aplica, como dado, não como código espalhado. Uma fonte pode substituir a fórmula padrão (ex.: clockwork tem Defense 13 fixa, em vez de Defense = Agility). Assim a troca de versão (P2b, P2c) já leva junto as fórmulas certas. *Fechado (validado).*
- **P11b. Ordem de cálculo fixa e explícita.** Base da ancestralidade → modificadores permanentes (paths, itens) → efeitos que *definem* um valor → efeitos que *somam* → limites (máximos e mínimos) → ajuste manual. Limites verificados no core: Defense máxima 25, Perception máxima 25, Healing rate mínimo 1; armadura substitui a Defense base. *Fechado (validado). [Ainda não verificado: regras gerais de empilhamento de efeitos.]*
- **P11c. Efeitos temporários são uma camada de jogo.** Magias, condições e outros efeitos ligáveis entram no cálculo, mas não no log (P8): são estado de sessão, não histórico do personagem. *Fechado (validado).*
- **P11d. Modelagem incompleta não trava ninguém.** Quando uma fórmula ou efeito ainda não foi modelado, a substituição manual (P12) resolve, e o log registra. Isso permite modelar as fontes aos poucos. *Fechado (validado).*
- **P12. Ajuste manual é uma camada nomeada e reversível.** Distinguir "modificador" (soma ao cálculo) de "substituição" (ignora o cálculo). Nada é sobrescrito em silêncio. *Fechado (validado) — origem: D&D Beyond (Other Modifier / Override Score).*
- **P13. Construtor e ficha são telas do gerador; a ficha é a fonte da verdade.**
  - **Construtor:** escolhas estruturais, concessões do mestre (P23) e subida de nível (P13b).
  - **Ficha:** ajustes manuais (P12) e efeitos temporários (P11c).
  - **Exportação:** gera uma cópia estática para imprimir ou compartilhar (P8a). O que se faz na cópia não volta ao gerador; por isso todas as edições passam pela tela, pelo log e pelas regras.
  *Fechado (D14, revisado após o SWCharGen) — origem: D&D Beyond. Contra aceito: o jogador usa o gerador durante o jogo. Nota: a ficha da Liliana continua sendo a referência de conteúdo e organização, não de comportamento (ela é um arquivo vivo; a exportação será estática).*
- **P13b. Subir de nível reabre o construtor** na etapa do próximo nível, como qualquer mudança estrutural. *Fechado (D16).*
- **P13c. A ficha controla recursos de sessão.** Usos por descanso, dano recebido, Insanity e Corruption ganhas em jogo, contadores de usos (ex.: "Fogo da Bruxa 1 e 2" da ficha da Liliana). Isso amplia o escopo: a ficha passa a ser também ferramenta de jogo. Mudanças permanentes feitas em jogo (ex.: Corruption ganha, magia aprendida por evento da história) entram no log (P8); estado de sessão não. Cada recurso declara, nos dados, se é permanente ou de sessão. *Fechado (D17, D19). Verificado no core: Insanity é permanente (não zera com descanso; diminui ao enlouquecer ou com quirks), logo entra no log; Corruption também.*
- **P28. Campos fixos na ficha; tabelas rotulam seus resultados.** O número de tabelas varia por ancestralidade e suplemento, então a ficha tem campos fixos e cada tabela declara nos dados para qual campo vai o texto do resultado. Campos: *Languages, Professions, Appearance, Background, Personality, Religion, Interesting Things, Companions, Other Possessions* (bens sem efeito mecânico). Se o resultado for um item que já existe no banco de dados (ex.: uma espada), ele entra como item normal, não em *Other Possessions*. *Fechado (D25) — ideia do Antônio.*
  - **Resultado = texto + efeitos + concessões**, todos opcionais: o texto vai para o campo do rótulo; os efeitos entram no cálculo (P11a), ex.: Corruption +1, Size 1/2, bônus no Starting Lifestyle; as concessões criam entidades ou escolhas pendentes (P4), ex.: "aprende um idioma". *Fechado (validado).*
  - **Languages e Professions são listas de entidades, não texto**, para a ficha saber o que o personagem fala e faz. *Fechado (validado).*
  - **Cada campo é uma lista de entradas com origem** (tabela, rolagem, fonte), para o P6 conseguir desfazer e o P6b conseguir preservar; cada entrada é editável como ajuste manual (P12). *Fechado (validado).*
  - **Coisa interessante que é item existente** vai para o inventário com a marca "coisa interessante", e o campo *Interesting Things* lista uma referência a ela. *Fechado (D26).*
  - **Campos extras:** *Personality* (traços do core; personalidade, relacionamentos, desejos, medos, obrigações e moralidade do *Only Human*), *Religion* (core e *Only Human*) e *Companions* (aliados e criaturas com estatísticas, ex.: "um soldado, como mercenary"; um cavalo; um pequeno construto). *Fechado (D27).*
  - **Marks of Darkness:** campo próprio na ficha, com cada marca e sua origem (P8). Faltava na ficha da Liliana. *Fechado (pedido do Antônio).*
  - **Quirks** (reduzem Insanity e são permanentes) e **Objective** (definido ao chegar ao nível expert) também precisam de campo. *Fechado (validado).*

- **P23. Concessões do mestre são uma camada própria, feita no construtor.** O que a mesa concede fora da regra fica marcado como "concedido pela mesa", separado da edição manual (P12) e do conteúdo da casa (P16), e registrado no log. A ficha da Liliana já tem esse caso: "12 magias extras concedidas pela mesa". Uma concessão pode ser de dois tipos:
  - **Vinculada:** segue as regras e dependências como uma escolha normal (P4, P6). Ex.: "aprende uma magia da tradição Fire" — o jogador escolhe Fireball entre as magias elegíveis.
  - **Avulsa:** concede algo diretamente, sem dependências. Ex.: "pode conjurar Fireball 3 vezes por dia", sem conhecer a tradição. Referencia um item existente e acrescenta parâmetros (usos, limites); o que não estiver modelado cai no P11d.
  *Fechado (D15) — origem: SWCharGen (GM Grants).*

### Conteúdo e banco de dados

- **P17. Dados oficiais são imutáveis; toda personalização é uma camada por cima.** A camada identifica o tipo de mudança: item **novo**, **substituição** de um item oficial ou **só texto** (nome ou descrição). Remover a personalização devolve o original. *Fechado (validado) — origem: SWCharGen (DataCustom; AddedItem / CustomItem / DescOnly).*
- **P18. Identidade estável.** Cada entidade tem um identificador fixo, independente do nome exibido e do livro. Uma versão de outro livro declara explicitamente qual entidade substitui. É o que permite saber que "Goblin revisado" e "Goblin" são a mesma coisa (D4, D8), e é a base do mapa de dependências (P4), da regra de desfazer (P6) e do log (P8). *Fechado (validado) — origem: SWCharGen (keys únicas e imutáveis).*
- **P19. Variantes por herança.** Uma versão revisada, um subtipo ou um item da casa herda do original e sobrescreve só os campos que mudam. A comparação entre versões (P2d) mostra exatamente esses campos. *Fechado (validado) — origem: SWCharGen (sub-species com "Override" por campo).*
- **P20. Integridade referencial.** Ao importar ou ativar conteúdo, o gerador verifica se tudo o que ele referencia existe e está ligado. Se não, lista o que falta antes de aplicar. *Fechado (validado) — origem: SWCharGen (importação bloqueada quando faltam referências).*
- **P26. Conteúdo condicional a outras fontes.** Uma entrada pode declarar condições que dependem de livros ou regras ativos, com um caminho alternativo quando a condição não se cumpre (ex.: "se *Terrible Beauty* estiver ativo, favor aleatório; se não, objeto encantado"; "se *Battle Scars* estiver em uso, as Sawbones Tools também…"). A interface mostra o caminho que vale e indica que há outro se determinado livro ou regra for ligado (P3). Referência condicional a livro ausente não é erro de integridade (P20). *Fechado (validado) — origem: Only Human, Oddities, Insupposable Instruments.*
- **P34. Gatilhos de regra disparam rolagens.** Alguns eventos exigem uma rolagem automática, na criação ou em jogo: ganhar Corruption → rolar para Mark of Darkness (e, se a marca repetir, 2d6 de Insanity); aprender magia sombria → rolar para ganhar Corruption; Insanity chegar a Will → Madness. O gerador oferece a rolagem no momento do evento, com a opção de escolher ou registrar manualmente (P7), e encadeia os gatilhos seguintes. Gatilhos são dados, declarados pela regra ou fonte (P11a). *Fechado (validado).*
- **P21. Conteúdo da casa é um pacote compartilhável.** O mestre escreve um pacote (ancestralidades, tabelas, paths, regras opcionais) e o distribui; os jogadores importam. O pacote entra na lista de livros como mais uma fonte, com posição na ordem de prioridade (D8), e pode tanto adicionar quanto substituir conteúdo oficial (D11); o toggle local (D9) continua valendo. Não há editor dentro do gerador: o pacote é um arquivo num formato documentado (D10). O design deixa espaço para um editor interno no futuro, mas ele está fora do escopo atual. *Fechado (D10, D11) — origem: SWCharGen (Data Sets).*
- **P21a. O core usa o mesmo formato dos pacotes da casa.** Todo o conteúdo oficial é escrito no formato de importação. Assim o formato é testado pelo uso real, e quem for escrever um pacote tem exemplos de tudo. *Fechado (validado; consequência da D10).*
- **P21b. A importação é a interface de quem escreve conteúdo.** Como não há editor, a qualidade da experiência depende de: documentação do formato com exemplos, modelos prontos para copiar e mensagens de erro legíveis, que digam o que está errado e onde (P20). *Fechado (validado; mitigação do contra da D10).*
- **P22. Referência de página obrigatória, texto de regra opcional.** O gerador sempre mostra livro e página. O gerador não traz texto descritivo dos livros: os campos de texto começam só com a página e são preenchidos pelo usuário (P9, P9a). *Fechado (validado; revisado com a D18) — origem: SWCharGen (não inclui texto dos livros; só páginas, com descrição preenchível pelo usuário).*

### Navegação (complemento)

- **P24. Resumo vivo sempre visível.** Durante a criação, um painel mostra o estado atual da ficha e se atualiza a cada escolha. Complementa o P10. *Fechado (validado) — origem: SWCharGen (painel de resumo).*
- **P29. Cada etapa abre com uma pergunta, uma linha de regra e contadores.** Ex.: "Choose your ancestry" + "Your ancestry sets your starting attributes and the tables you roll on" + contadores do que falta ("Languages 0/1"). Os contadores são as pendências do P4, mostradas no ponto da decisão. *Fechado (validado) — origem: Progeny ("Pick your Disciplines" · "2 powers in one discipline · 1 in another" · "CLAN POWERS 0/3").*
- **P30. Etapas densas se dividem em subdecisões sequenciais quando a regra tem ordem natural.** Ex.: atributos-base → rolar (se permitido) → atributo a aumentar → atributo a diminuir; tabelas encadeadas do *Only Human* uma por vez. Quem conhece pode expandir tudo de uma vez (P9). *Fechado (validado) — origem: Progeny (atributos: mais forte → mais fraco → três médios → o resto automático).*
- **P31. Opção inelegível por regra aparece esmaecida, com o motivo.** Ex.: magia de rank acima do permitido, path sem pré-requisito. Opção indisponível por fonte segue o P3. *Fechado (validado) — origem: Progeny (poderes de nível 2 esmaecidos).*
- **P32. Três zonas na tela, recolhíveis em tela pequena.** Resumo vivo (P24), etapa atual e mapa de etapas (P4). No celular, a etapa ocupa a tela e as outras duas zonas ficam a um toque. *Fechado (validado) — origem: Progeny (resumo à esquerda, etapas à direita, coluna de etapas oculta em tela pequena).*

### Identidade visual

- **P33. Estrutura limpa, identidade temática nas bordas.** Layout e densidade seguem o D&D Beyond: fundo neutro, conteúdo em cartões e listas expansíveis. O clima do SotDL aparece em cor, tipografia e cabeçalhos de etapa, nunca atrás de conteúdo denso. Cuidado: evitar um meio-termo sem graça. *Fechado (D28).*

### Idioma

- **P25. Tudo em inglês.** Interface e conteúdo do gerador em inglês, como os livros. Os documentos de design do projeto continuam em português. Vale também para a ficha gerada. *Fechado (D12). Nota: a ficha da Liliana, usada como referência de saída, hoje mistura português e inglês; a ficha gerada sai toda em inglês.*

### Nota para a versão pública

Se o gerador sair do círculo de amigos, reproduzir textos de regras do livro pode esbarrar em direitos autorais. O P22 e o P9 já tratam disso: o gerador não traz texto dos livros, só a referência de página e os dados mecânicos; todo texto descritivo é preenchido pelo usuário. *[Não verificado: termos de licença da Schwalb para terceiros.]*

## 4. Decisões

### 4.1 Em aberto

*Nenhuma no momento.*

### 4.2 Fechadas

| # | Decisão | Escolha | Comentário do Antônio |
|---|---|---|---|
| D1 | Escolha manual em tabelas mecânicas | Sim | Presumir que o personagem foi criado do jeito que a mesa joga. Manter um log de criação que registre se cada resultado foi rolado (uma ou n vezes) ou selecionado. Vale para todas as tabelas, inclusive as de rolagem prescrita. Exportação: só a ficha, só o log ou ambos. |
| D2 | Valores derivados: guardados ou calculados | (A) Sempre calculados, com camada de ajuste por cima | A ficha vai calcular os derivados a partir dos efeitos aplicados (magias, condições etc.). Recomendação do Claude: A, com fórmulas declaradas pelas fontes, ordem de cálculo explícita e efeitos temporários como camada de jogo (P11a–P11d). |
| D3 | Revisões de procedimento e regras opcionais | (B) Mecanismo separado de "Regras opcionais", desligadas por padrão | Concordou com a recomendação do Claude. |
| D4 | Versões da mesma entidade | (A) Entrada única com seletor de versão | As fontes poderão ser escolhidas nas configurações. |
| D5 | Navegação | (B) Guiada, com etapas liberadas por dependência | Decisões pendentes não impedem etapas seguintes, caso não sejam dependências. Ex.: faltar escolher a tradição não impede rolar as tabelas aleatórias. |
| D6 | Mudar uma escolha anterior | (A) Desfazer dependentes, com confirmação que lista as perdas | — |
| D7 | Granularidade das fontes | (A) Por livro | — |
| D8 | Precedência entre livros que definem a mesma entidade | (B) Ordem de prioridade entre livros (o de cima vence) | — |
| D9 | Troca de versão no próprio cartão do item | Sim | Incluir toggle para alternar as versões e algo que permita compará-las. |
| D10 | Onde se cria o conteúdo da casa | (C) Só importação de arquivo, sem editor, num formato documentado | Deixar espaço para um editor dentro do gerador no futuro; por ora, fora do escopo. Exceção posterior: editor só de texto (D18, P9a). |
| D11 | Conteúdo da casa: substituir ou só adicionar | (B) Adicionar e substituir, com o pacote na ordem de livros (D8) e o toggle local (D9) valendo | — |
| D12 | Idioma | Interface, conteúdo e ficha gerada em inglês | — |
| D13 | Atualização de pacote da casa já usado | (A) O personagem acompanha a nova versão; se a mudança desfizer escolhas, vale o P6 | — |
| D14 | A ficha é tela do gerador ou arquivo exportado | (A) Tela do gerador; exportar gera cópia estática | — |
| D15 | Onde ficam as concessões do mestre | No construtor, vinculadas ou não às dependências | Ex.: aprender uma magia da tradição Fire e escolher Fireball (vinculada) vs. ganhar a capacidade de conjurar Fireball 3x ao dia (avulsa). |
| D16 | Onde acontece a subida de nível | Reabre o construtor na etapa do próximo nível | — |
| D17 | A ficha controla recursos de sessão | Sim | Ajustar o escopo: a ficha também é ferramenta de jogo. |
| D18 | Texto das regras (revisão do P9) | Os três níveis mostram só a página até o usuário preencher; edição campo a campo ou importação | Ajustes aceitos: mecânica sempre visível; editor só de texto como exceção à D10; ida e volta no mesmo formato; texto preso à versão; nível vazio cai no seguinte; escopo por usuário. |
| D19 | Mudanças permanentes feitas em jogo entram no log | Sim | — |
| D20 | Estado padrão dos componentes de um livro | Cada componente declara seu padrão nos dados: componentes de entidade específica vêm ligados; regras que mudam o jogo para todos vêm desligadas | Confirmados: tabelas do Humano (*Only Human*) ligadas; regras do *Battle Scars* e atributos aleatórios desligados. |
| D21 | Escolha da tabela de coisas interessantes | (A) Seletor em cada rolagem; padrão pela ordem dos livros; resultados anteriores preservados | O gerador mostra a fonte da rolagem; clicar nela permite trocar; quem só rola segue o previsto, sem confirmação extra. |
| D22 | *Only Human*: Humano revisado ligado, tabelas de desenvolvimento desligadas | (A) Fallback para a linha de idiomas e profissões do Humano do core, como padrão do componente e reversível | — |
| D23 | Atributos aleatórios para ancestralidades sem fórmula oficial | Regra da casa embarcada "Permitir qualquer ancestralidade rolar atributos": base − 2 + 1d3; desligada, só rolam as ancestralidades cujo livro e opção estão ativos | Na etapa de atributos, um pequeno dado aparece quando rolar é permitido. |
| D24 | O ajuste de +1/−1 do core vale depois de rolar os atributos | Sim | É regra geral de criação. |
| D25 | Como acomodar o número variável de tabelas na ficha | Campos fixos; cada tabela rotula para qual campo vai o texto; item existente entra como item | Ideia do Antônio. Campos: Languages, Professions, Appearance, Background, Interesting Things, Other Possessions. |
| D26 | Coisa interessante que é item existente | (A) Vai para o inventário com a marca "coisa interessante"; o campo lista uma referência | — |
| D27 | Campos extras da ficha e ajustes do P28 | Entram Personality, Religion e Companions; ajustes do P28 aprovados | — |
| D28 | Direção visual | (C) Híbrida: estrutura do D&D Beyond; identidade temática só em cor, tipografia e cabeçalhos | Princípios P29–P32 aprovados junto. |
| D29 | Campos Marks of Darkness, Quirks e Objective; gatilhos de regra | Aprovados | Marks of Darkness: faltavam na ficha da Liliana. |
| D30 | "Enter result" em tabelas de rolagem prescrita | (A) Manter, sempre registrado no log | Vale também para tabelas como as do *Only Human*, que mandam rolar e aceitar (coerente com P7). |
| D31 | Como um gatilho de regra aparece na ficha de jogo | (A) Aviso não bloqueante, que fica até ser resolvido | Ações do aviso: rolar, informar o resultado ou desfazer a mudança que o disparou. |
| D32 | Mudar escolhas de níveis anteriores depois de subir | (A) Pelo log, com a confirmação de dependentes do P6 | — |
| D33 | Imagem do personagem na ficha de jogo | (D) Miniatura no cabeçalho + retrato grande na seção Character, junto de Appearance e Background | No celular, só a miniatura; tocar nela abre a imagem inteira. A imagem também vai para a exportação. |
| D34 | Referência rápida de ataques na ficha de jogo | Bloco Attacks no topo da coluna direita, acima dos Effects in play: armas equipadas, ataque desarmado e armas naturais (quando houver), cada um com modificador de ataque, boons/banes e dano, já com talentos e efeitos aplicados e a origem de cada ajuste visível; inclui ataques personalizados | Pedido do Antônio. O ataque personalizado escolhe atributo, boons/banes e dano, e pode ou não receber talentos e efeitos. Interação: botão tracejado no fim da lista, que expande o formulário no lugar (sem modal, coerente com o resto da ficha); prévia calculada antes de salvar; Add/Cancel; o ataque criado entra no fim com a marca Custom e Edit/Remove, e Edit reabre o mesmo formulário no lugar do cartão. Modal só se o formulário crescer (alcance, propriedades, condições). |

---

## 5. Referências analisadas

### 5.1 D&D Beyond — Character Builder (D&D 5e/5.5e)

**O que o Antônio gosta:** interface limpa, navegação fácil entre etapas.

**Destaques observados nos prints:**
- Abas numeradas (Class, Background, Species, Abilities, Equipment, What's Next) + Settings, todas clicáveis; setas de anterior/próximo.
- Lista de classes agrupada por conjunto de regras (5.5e Core, 5e Core, Critical Role); a mesma classe aparece duas vezes, uma por versão, cada cartão com o livro de origem.
- Pendências marcadas com "!" e contagem ("2 Choices · 1st level"); ficha bloqueada enquanto o personagem está incompleto.
- Modal de confirmação antes de adicionar classe, com resumo e características expansíveis.
- Atributos: seletor de método de geração; tabela de cálculo com Base, Bonus, Set Score, Stacking Bonus, Other Modifier e Override Score.
- Equipamento: escolha entre pacote A ou B, ou pular.
- Nome com sugestões aleatórias.

**Aba Settings ("Character Preferences"):**
- Configuração por personagem, não por conta; vale para o construtor e para a ficha.
- Fontes organizadas por categoria, não por livro: Homebrew, 5.5e Core, 5.5e Expanded, D&D Beyond Drops, Blizzard, 5e Core, 5e Expanded, Legacy/Noncore. Cada uma com uma frase de descrição e livros de exemplo.
- Conteúdo de parceiros: "ativar tudo" + lista expansível por parceiro.
- Legacy/Noncore é descrito como "pode conflitar com o core", mas não há regra de precedência: ligar duas versões mostra as duas.
- Aviso: sem nenhuma fonte, não é possível completar o personagem.
- Rolagem de dados digital na mesma página, mas com escopo diferente (navegador), indicado no texto.
- Só o topo da página foi visto; o que vem abaixo de Dice Rolling não foi analisado.

### 5.2 SWCharGen (OggDude) — Star Wars RPG da Fantasy Flight

**O que o Antônio gosta:** liberdade de criação e a possibilidade de o usuário alimentar o banco de dados. **O que não gosta:** a interface.

**Fonte da análise:** documentação em PDF (link enviado), lida por ferramenta de extração em três partes. A parte sobre a janela de Options e a seleção de fontes veio só em resumo.

**Destaques:**
- Quatro aplicativos: lançador, gerador de personagens, ferramentas do mestre e editor de dados.
- Dados do jogo em XML; personalizações numa pasta separada (DataCustom), sem tocar nos originais.
- Tipos de personalização: AddedItem (novo), CustomItem (substitui um item oficial), DescOnly (só nome ou descrição). Remover a personalização restaura o original; itens oficiais não podem ser apagados.
- Cada item tem nome, chave única (definida na criação, depois imutável) e fonte. O usuário pode criar suas próprias fontes; a padrão é "User Data".
- Data Sets: pacotes de conteúdo exportáveis e importáveis em ZIP. A importação verifica referências e é bloqueada se algo estiver faltando, com a lista dos itens em conflito.
- Precedência implícita: Data Sets sobrescrevem DataCustom; entre dois Data Sets, vence o carregado por último.
- Nenhum texto dos livros: só referência de página; o usuário pode preencher descrições do próprio livro.
- Talentos e poderes modelados como dados (bônus de dano, atributos, perícias, dados especiais, substituição de característica).
- Gerador com navegação por coluna de botões à esquerda e painel de resumo que se atualiza ao vivo.
- Árvores de talentos com estados liberado e bloqueado; desmarcar um talento remove os dependentes e devolve o XP.
- Botões de aleatório em painéis específicos (obrigações, motivações, moralidade); o aleatório substitui o que havia.
- GM Grants: concessões do mestre fora da regra (talentos, perícias, especializações).
- Opções de regra da casa nas configurações (método de cálculo de defesa, limites de obrigação).
- Subespécies com caixa "Override" por campo: o que não é marcado herda da espécie principal.
- Ferimentos registrados em coluna separada do valor-base.
- Idioma da interface e dos textos como pacotes de tradução em XML.

**Confirma decisões já fechadas:** D6 (dependentes removidos), D8 (precedência, mas aqui implícita; a nossa é explícita), P7 (botão de aleatório por tabela), P11c (estado temporário separado do valor-base), P14a (regras da casa nas configurações).

**Não se aplica:** economia de XP para comprar tudo; aplicativo desktop Windows com arquivos XML; ferramentas de veículos e encontros; a interface densa.

**Princípios extraídos:** P17–P24.

**Não visto nos prints (descrito de memória, [Não verificado]):** comportamento ao trocar uma escolha anterior; métodos exatos de geração de atributos.

**Princípios extraídos:** P1–P4, P9, P11–P16.

### 5.3 Suplementos do SotDL — *Only Human*, *Oddities, Artifacts, and Esoterica*, *Insupposable Instruments*, *Battle Scars*

**Objetivo:** mostrar como a maior parte dos suplementos funciona e revisar os princípios. Texto completo lido dos PDFs do projeto.

**Resumo:** ver tabela 2.3.

**Confirma:** P19 (Humano revisado herda do core e acrescenta uma opção no nível 4), P14a (regras do *Battle Scars* desligáveis com o conteúdo ligado), D11/união de listas (*Insupposable Instruments*).

**Mudou:** componentes por livro (P2e), estado padrão por componente (P14a, D20), ordem padrão dos livros (P2b), exceção por rolagem (P2f, D21), resultados preservados quando a fonte da tabela muda (P6b), regras que afetam a ficha em jogo (P14a).

**Novo:** padrão 7 e P26 (conteúdo condicional), P14b (regra global com parâmetros por entidade), registro de modificadores no log (P8).

### 5.4 Progeny — Vampire: The Masquerade 5e

**O que o Antônio gosta:** intuitivo, responsivo, bonito. **Receio:** com o volume de informação do SotDL, a mesma estética ficaria poluída.

**Fonte da análise:** README do repositório, código do frontend (etapas, barra de etapas, layout em tela pequena) e capturas de tela incluídas no repositório. O site não foi navegado.

**Destaques:**
- Três zonas: resumo do personagem à esquerda, etapa no centro, lista de etapas ("Stages") à direita com marca de concluída e número.
- Cada etapa: título em forma de pedido ("Pick your Disciplines"), uma linha com a regra e chips de contagem ("CLAN POWERS 0/3").
- Atributos divididos em subdecisões: o mais forte, o mais fraco, três médios, o resto automático.
- Cartões com selo de nível; opções ainda inelegíveis esmaecidas.
- Etapas que só aparecem por causa de uma escolha (Rituals com Blood Sorcery; Ceremonies com Oblivion).
- Etapas liberadas em sequência: uma etapa só abre depois das anteriores.
- Em tela pequena, a coluna de etapas some; fontes menores no celular.
- Exportação para PDF editável, JSON (salvar e carregar) e Foundry VTT.
- Ficha com rolagem de dados e controle de Health, Willpower e Hunger.
- Fundos fotográficos escuros atrás do conteúdo.

**Confirma:** P4/D5 (etapas liberadas por dependência; aqui, mais rígido: sequência linear), P14a (escolhas que acrescentam etapas), P24 (resumo vivo), P8a (exportação), D17 (ficha como ferramenta de jogo).

**Não se aplica:** sistema simples, regra única, sem fontes nem suplementos; poucas opções por etapa (o SotDL tem listas longas, como magias por tradição); fundos fotográficos atrás de texto denso prejudicam a leitura; contas e grupos (coteries) fora do escopo.

**Princípios extraídos:** P29–P33.

---

## 6. Wireframe v1

Canvas de design com 16 telas em escala de cinza, interface em inglês (P25). Exemplo principal: Liliana, Humana, com Only Human ativo; fluxo do core mostrado com Brokk, Anão.

| Grupo | Telas | Princípios mais visíveis |
|---|---|---|
| Configuração | Home; Sources & rules | P2–P2f, P14a/b, P15, P21, P27, P9 |
| Nível 0 (Liliana) | Ancestry; Compare versions; Attributes; Development (cadeia do Only Human); Upstream change confirmation; Interesting thing | P1, P2e, P4/P5, P6, P9a, P11, P24, P29–P31, P34, D21 |
| Fluxo do core (Brokk) | Story tables; Professions & languages; Wealth & equipment | regimes rolar/escolher/inventar, P9 (entrada sem texto), P23, P30 |
| Subida de nível | Level 3 expert path; Magic | P13b, P31, P11 (Castings), P34 (magia sombria) |
| Jogo | Play sheet; Log & export; Mobile builder | P11c, P12, P13, P13c, P28, P34, P8/P8a, P32 |

**Escolhas feitas ao desenhar** (revisar se algo não bater com a intenção):
- Com o Only Human ativo, a etapa **Development** substitui Profissões, Riqueza e as tabelas de história do core para Humanos (o livro diz que as tabelas substituem as do core e as profissões e riqueza aleatórias). A lista de etapas avisa disso.
- O cenário assume um pacote de textos importado pelo usuário; entradas sem texto mostram a referência de página e o botão "Add text" (P9).
- Hated Creature do Anão aparece na etapa de história, como subdecisão da ancestralidade.
- Rolagens desfeitas por mudança a montante continuam no log, marcadas como desfeitas.

**Não verificado no wireframe:** a ordem do d6 de tipos de profissão (Academic, Common, Criminal, Martial, Religious, Wilderness); páginas exatas das regras de magia sombria e dos expert paths (aparecem como "ch."); efeitos de magias e do Lifestyle, mostrados como placeholders.
