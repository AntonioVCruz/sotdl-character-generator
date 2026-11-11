# Especificação de Requisitos de Software: Gerador de personagens SotDL

> Versão: 1.1 · Status: Finalizado · Última atualização: 2026-11-11
> Sintaxe dos requisitos: EARS, em português — "Quando ⟨evento⟩, o sistema deve ⟨resposta⟩"; "Enquanto ⟨estado⟩, o sistema deve …"; "Onde ⟨recurso⟩, o sistema deve …"; "Se ⟨situação indesejada⟩, então o sistema deve …"; ubíquo: "O sistema deve …"

## Histórico de revisões

| Versão | Data | Autor | Mudanças |
|---|---|---|---|
| 1.0 | 2026-11-08 | Antônio Cruz | Especificação inicial finalizada: 230 FR (12 áreas), 22 NFR, 14 casos de uso. |
| 1.0.1 | 2026-11-11 | Antônio Cruz | Q2 resolvida na etapa de arquitetura (empilhamento conferido no core); nota da FR-CALC-011 atualizada. Nenhum requisito mudou. |
| 1.1 | 2026-11-11 | Antônio Cruz | Exportar e importar o arquivo do personagem passa para o MVP (Must), contra a limpeza de dados do Safari (ADR-002): FR-CHAR-018 e 019 viram Must, FR-CHAR-023 entra, NFR-SEC-002 vira Must, UC-015 entra. 231 FR. |

## 1. Introdução

### 1.1 Propósito
Este documento especifica os requisitos do gerador de personagens para *Shadow of the Demon Lord* (SotDL) e define a ordem de entrega. Ele é lido pelas etapas de arquitetura, UX e planejamento. Os princípios (P*, D*) definem o produto; este SRS define o que entra em cada entrega. Nenhuma decisão dos princípios é revogada por estar fora do MVP: ela entra aqui com prioridade Should ou Could.

### 1.2 Visão e escopo do produto
Aplicação web, usada pelo navegador, que conduz a criação de um personagem de SotDL pela regra do livro básico e dos suplementos que a mesa escolher. Mostra de onde vem cada regra, registra a origem de cada resultado e não fiscaliza (P7). Projeto pessoal, não comercial, para portfólio. Atende jogadores e mestres em geral, inclusive quem não domina as regras.

#### 1.2.1 Corte do MVP

O MVP cria um personagem de nível 0 e entrega a ficha. O fluxo vem de ponta a ponta com pouco conteúdo; o modelo de fontes entra no mínimo necessário para validar o núcleo do sistema.

**Dentro do MVP (Must):**

| # | Capacidade | Origem |
|---|---|---|
| 1 | Personagens: criar, listar, continuar, excluir; persistem entre sessões, sem conta de usuário. | SCR-01 |
| 2 | Fontes por personagem: ligar/desligar livros e ordenar a prioridade; versão vigente pela ordem; selo de fonte e tipo no cartão. Padrões de interferência 1 (adição) e 2 (substituição de entidade), com o conteúdo: *Only Human* só com o Human revisado (padrão 2, sem as tabelas de Development) e *Demon Lord's Companion* só com o Halfling (padrão 1). | P1, P2, P2b, P14, D4, D7, D8, D37 |
| 3 | Fluxo de nível 0 do core em 8 etapas (Ancestry, Attributes, Story, Professions & languages, Wealth & equipment, Interesting thing, Roleplaying, Review), com as ancestralidades Human, Dwarf e Clockwork. | Princípios §1.2; SCR-03, 05, 08–11 |
| 4 | Regimes de decisão: escolher, rolar ou escrever/informar em qualquer tabela; distribuição publicada respeitada; subdecisões adiáveis. | P7, D1, D30, P30 |
| 5 | Navegação por dependências: mapa de etapas com estado, pendências não bloqueantes, contagem de decisões abertas. | P4, P5, D5, P29 |
| 6 | Derivados calculados com composição visível, fórmulas vindas das fontes, ordem de cálculo e limites; efeito na escolha e resumo vivo. | P11, P11a, P11b, D2, P10, P24 |
| 7 | Mudança a montante: lista o que será desfeito e pede confirmação. | P6, D6 |
| 8 | Log de criação: escolhas e rolagens com origem e valores; desfeitos ficam marcados. | P8 |
| 9 | Ficha final em tela: campos fixos do nível 0 com origem; mecânica e página, sem texto dos livros. | P28, P9, P22 |
| 10 | Ajuste manual: modificador ou substituição, nomeado, reversível, no log; cobre o que não foi modelado. | P12, P11d |
| 11 | Imprimir a ficha (PDF pelo navegador). | P8a (parcial) |
| 12 | Arquivo do personagem: exportar e importar, como cópia de segurança e para mudar de navegador. | P8a (parcial); ADR-002 |

**Should** (próximos incrementos, na ordem sugerida):
1. Componentes por livro e regras opcionais com estado padrão (P2e, P14a, D3, D20); atributos aleatórios e pacote da casa embarcado (P14b, P27, D23, D24).
2. Revisão de procedimento e substituição de tabela: *Only Human* e *Oddities* (padrões 3, 4 e 7; P2f, D21, D22, P6b, P26).
3. Versão local no cartão e comparação (P2c, P2d, D9).
4. Motivos de indisponível e inelegível, resumo das fontes, lista de livros navegável (P3, P31, P15, P2a).
5. Concessões e decisões do mestre (P23, D15). No MVP, decisões do mestre entram por escrever/informar.
6. Gatilhos de regra na criação (P34). No MVP, o resultado entra por ajuste manual (P11d).
7. Demais ancestralidades do core; mudar escolha pelo log (D32); exportar o log (P8a).
8. Subida de nível 1–10 com paths e magia (P13b, D16).

**Could:** ficha como ferramenta de jogo (D17, P13c, P11c, D31, D34, D33); pacotes da casa importáveis e sua atualização (P21, P21b, P6a, D13); editor e pacote de textos (P9a, D18); demais suplementos.

**Importação de pacotes:** a prioridade acima se mantém (Could), independentemente da demonstrabilidade.

#### 1.2.2 Demonstrabilidade (D35, D36)

O app traz a mecânica oficial sem texto, nos termos do P22. Um visitante sem os livros percorre o fluxo inteiro do MVP, vê de onde vem cada regra e os efeitos de cada resultado. O texto descritivo fica a cargo do livro, do modo Write ou de um pacote de textos (P9a, fora do MVP).

- **Entra no pacote oficial:** identificadores e nomes de entidades, números, faixas de dado, efeitos, concessões, ligações entre tabelas, condições (P26) e página. Nomes curtos que são o conteúdo inteiro de uma entrada só entram quando outra regra os referencia (D36).
- **Fica de fora:** toda frase descritiva, inclusive o texto de resultado das tabelas narrativas.
- **Resultado aceito:** uma entrada sem texto mostra a faixa rolada, a página, os efeitos mecânicos e as subdecisões que gera ("No text added for this entry · CORE p.17", SCR-09). Tabelas sem efeito mecânico (aparência, personalidade, coisa interessante) ficam reduzidas a faixa e página.

Consequências:
- O P2b e a SCR-02 ficam como estão: o core é o livro fixo no fim da lista.
- Um pacote de demonstração não é obrigatório no MVP; o pacote oficial de mecânica serve de exemplo do formato (P21a, P21b).
- **Ajuste na SCR-10, para a etapa de UX:** sem pacote de textos, os nomes não referenciados das profissões não vêm no pacote. O modo Choose passa a escolher a faixa e digitar o nome; o Roll mostra faixa e página com um campo para o nome. Com um pacote de textos, a grade volta a mostrar os nomes.

### 1.3 Objetivos e métricas de sucesso

| # | Métrica | Meta |
|---|---|---|
| M1 | Uma pessoa sem os livros cria um personagem de nível 0 com cada uma das três ancestralidades do MVP, do início à ficha impressa, sem ajuda externa. | 3 de 3 ancestralidades |
| M2 | Valores da ficha que mostram sua composição ou sua entrada no log. | 100% |
| M3 | Texto descritivo dos livros no repositório e no app, conferido na revisão do pacote oficial antes de cada publicação. | Zero |
| M4 | Tempo para um jogador experiente criar um personagem de nível 0 completo. | Até 10 minutos |

### 1.4 Definições
Ver Apêndice A.

### 1.5 Referências
- `docs/reference/principios-gerador-sotdl.md`: princípios (P*) e decisões (D*).
- `docs/reference/wireframe/wireframe-spec-sotdl.md` e `docs/reference/screens/`: telas (SCR-*).
- `docs/reference/character-sheet.html`: ficha de referência (conteúdo e organização).
- `docs/reference/lessons-learned.md`: restrições vindas da tentativa anterior.

## 2. Descrição geral

### 2.1 Perspectiva do produto
Produto novo e independente, sem integração com sistemas externos no MVP. O conteúdo de jogo chega em pacotes num formato documentado, o mesmo para o core, suplementos e conteúdo da casa (P21a). O livro físico ou em PDF do usuário complementa o app: é onde se lê o texto descritivo (D35). Onde ficam os dados, se há contas e onde hospedar são decisões da arquitetura.

### 2.2 Funções do produto (resumo)
- Gerenciar personagens (criar, listar, continuar, excluir, exportar e importar).
- Configurar as fontes de cada personagem (livros ativos e ordem de prioridade).
- Conduzir a criação de nível 0 por etapas guiadas por dependências.
- Registrar cada decisão como escolha, rolagem ou resultado informado.
- Calcular os valores derivados e mostrar sua composição.
- Desfazer dependentes quando uma escolha anterior muda, com confirmação.
- Manter o log de criação.
- Exibir e imprimir a ficha final, com ajustes manuais.

### 2.3 Classes de usuários

| Classe | Características | O que precisa |
|---|---|---|
| Jogador experiente | Tem os livros e conhece as regras. | Rapidez: ler só a linha de mecânica (P9), rolar ou escolher sem fricção. |
| Jogador iniciante | Não domina as regras; pode ou não ter os livros. | Saber o que cada escolha muda (P10), de onde vem cada regra (página) e o que ainda falta (P4, P29). |
| Mestre | Define as fontes e as regras da mesa; toma decisões dentro do fluxo (ex.: magia do pergaminho). | Configurar fontes por personagem; no MVP, registrar suas decisões por escrever/informar. |
| Visitante sem os livros | Avalia o projeto como portfólio. | Percorrer o fluxo inteiro e chegar a uma ficha (D35), entendendo o que falta por não ter o texto. |

Autor de pacotes da casa é uma classe fora do MVP (P21, Could).

### 2.4 Ambiente de operação
Navegador moderno, em computador e celular (largura a partir de 390px, SCR-16). Interface, conteúdo e ficha gerada em inglês (P25, D12). Detalhes de navegadores e desempenho ficam nos requisitos não funcionais.

### 2.5 Restrições
- **Propriedade intelectual:** o conteúdo oficial entra só como mecânica, nos termos do P22 (D35, D36). Texto descritivo e arte dos livros nunca entram no app nem no repositório, que é público.
- **Dados de regra conferidos no livro:** todo dado do pacote oficial é conferido no PDF; o que vier da memória ou de extrações não verificadas é marcado como tal.
- **Formato único de conteúdo:** o pacote oficial usa o formato documentado dos pacotes (P21a).
- **Custo:** projeto pessoal; hospedagem e operação devem ter custo compatível (meta nos requisitos não funcionais).
- **Nível inicial:** a criação sempre começa no nível 0 (wireframe, seção 8).

### 2.6 Premissas e dependências
- A mesa decide como joga; o gerador registra (P7).
- Quem quiser o texto descritivo consulta o livro ou escreve o resultado (D35).
- **Risco de licença, aceito:** não há licença de terceiros publicada pela Schwalb para SotDL *[Não verificado: termos de licença; nada encontrado em busca de novembro de 2026]*. O site é aberto ao público desde o MVP, sem controle de acesso (Apêndice B, Q1).

## 3. Requisitos específicos

### 3.1 Requisitos funcionais

#### 3.1.1 Personagens (FR-CHAR)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-CHAR-001 | Quando o usuário acionar "New character", o sistema deve criar um personagem de nível 0 tendo apenas o core como fonte ativa. | Must | Active | SCR-01; P2. Nível inicial sempre 0. |
| FR-CHAR-002 | Quando um personagem for criado, o sistema deve abrir a configuração de fontes desse personagem. | Must | Active | SCR-01 → SCR-02. |
| FR-CHAR-003 | Quando o usuário abrir a tela inicial, o sistema deve listar os personagens salvos com nome, ancestralidade, nível, estado, resumo das fontes e data da última edição. | Must | Active | SCR-01. |
| FR-CHAR-004 | Quando o sistema listar os personagens, o sistema deve ordená-los da edição mais recente para a mais antiga. | Must | Active | — |
| FR-CHAR-005 | Enquanto um personagem tiver decisões abertas, o sistema deve exibir o estado "Creating" com o número de decisões abertas. | Must | Active | SCR-01; P4. |
| FR-CHAR-006 | Enquanto um personagem não tiver decisões abertas, o sistema deve exibir o estado "Complete". | Must | Active | — |
| FR-CHAR-007 | Quando o usuário acionar "Continue" num personagem, o sistema deve abrir o construtor na última etapa visitada desse personagem. | Must | Active | SCR-01. |
| FR-CHAR-008 | Quando o usuário acionar "Preview sheet" num personagem em criação, o sistema deve exibir a ficha com as decisões abertas indicadas. | Must | Active | SCR-01; pendências não bloqueiam (P4). |
| FR-CHAR-009 | Quando uma decisão, configuração ou ajuste do personagem mudar, o sistema deve salvar o personagem sem exigir ação do usuário. | Must | Active | Sem botão "Save". |
| FR-CHAR-010 | Se o salvamento falhar, então o sistema deve avisar o usuário e manter na tela o estado ainda não salvo. | Must | Active | — |
| FR-CHAR-011 | Enquanto um personagem não tiver nome, o sistema deve exibi-lo como "Unnamed character". | Must | Active | — |
| FR-CHAR-012 | Quando o usuário editar o nome do personagem, em qualquer etapa da criação, o sistema deve atualizar o nome. | Must | Active | Não depende da etapa Roleplaying. |
| FR-CHAR-013 | Quando o usuário pedir para excluir um personagem, o sistema deve pedir confirmação informando que a exclusão é irreversível. | Must | Active | Sem lixeira. |
| FR-CHAR-014 | Quando o usuário confirmar a exclusão, o sistema deve remover permanentemente o personagem e o seu log. | Must | Active | — |
| FR-CHAR-015 | Enquanto não houver personagem salvo, o sistema deve exibir um estado vazio que diz o que o app faz, avisa que o texto das regras vem do livro e oferece "New character". | Must | Active | D35. |
| FR-CHAR-016 | Onde os personagens forem guardados apenas no navegador, o sistema deve informar ao usuário que eles ficam disponíveis somente naquele navegador. | Must | Active | Depende da decisão de arquitetura. |
| FR-CHAR-017 | Se o personagem aberto for alterado em outra aba, então o sistema deve avisar o usuário e recarregar o personagem antes de aceitar nova mudança. | Should | Active | Evita perda silenciosa. |
| FR-CHAR-018 | Quando o usuário exportar o arquivo do personagem, o sistema deve gerar um arquivo que reabre o personagem no gerador com suas fontes e regras. | Must | Active | P8a. Inclui decisões, ajustes e log. Promovido na v1.1 (ADR-002). |
| FR-CHAR-019 | Quando o usuário importar um arquivo de personagem, o sistema deve recriar o personagem com suas fontes e regras. | Must | Active | P8a, SCR-01. Sempre cria um personagem novo, sem sobrescrever. Decisões que não existem no pacote atual seguem a FR-CONT-016. Promovido na v1.1. |
| FR-CHAR-020 | Quando o usuário acionar "Duplicate" num personagem, o sistema deve criar uma cópia independente dele. | Could | Active | Não detalhado. |
| FR-CHAR-021 | Quando o usuário criar um personagem, o sistema deve permitir copiar as fontes de outro personagem. | Could | Active | SCR-01. Não detalhado. |
| FR-CHAR-022 | Onde o usuário tiver definido fontes padrão, o sistema deve aplicá-las a cada personagem novo. | Could | Active | SCR-01 "Default sources"; P2. Não detalhado. |
| FR-CHAR-023 | Se o arquivo importado não for um arquivo de personagem válido, então o sistema deve recusá-lo, informar o motivo e manter os personagens salvos inalterados. | Must | Active | NFR-SEC-002. Acrescentado na v1.1. |

#### 3.1.2 Fontes por personagem (FR-SRC)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-SRC-001 | Quando o usuário abrir a configuração de fontes de um personagem, o sistema deve listar os livros em ordem de prioridade, com o estado ligado ou desligado de cada um. | Must | Active | P2, D7; SCR-02. |
| FR-SRC-002 | Quando o sistema listar os livros, o sistema deve incluir apenas os livros que têm conteúdo no pacote oficial. | Must | Active | No MVP, cada livro aparece só com o nome. |
| FR-SRC-003 | O sistema deve manter o core sempre ligado e na última posição da lista. | Must | Active | P2b, D37. |
| FR-SRC-004 | O sistema deve definir a ordem padrão dos livros por camadas: pacotes da casa no topo, suplementos no meio com a publicação mais recente acima, core por último. | Must | Active | P2b, D37. A ordem padrão independe da sequência de ativação. |
| FR-SRC-005 | Se dois suplementos tiverem a mesma data de publicação, então o sistema deve ordená-los entre si pelo nome, em ordem alfabética. | Must | Active | Desempate proposto, para que a mesma combinação dê sempre a mesma ordem (D37). |
| FR-SRC-006 | Quando o usuário ligar um livro, o sistema deve colocá-lo na posição que a sua camada define. | Must | Active | D37. |
| FR-SRC-007 | Quando o usuário desligar um livro, o sistema deve retirar o conteúdo desse livro das opções do personagem. | Must | Active | Ligar não é priorizar (P14). |
| FR-SRC-008 | Quando o usuário reordenar os livros, o sistema deve usar a nova ordem como prioridade daquele personagem. | Must | Active | P2b, D8. |
| FR-SRC-009 | Quando dois ou mais livros ligados definirem a mesma entidade, o sistema deve oferecer a entidade uma única vez, na versão do livro mais acima. | Must | Active | D4, D8. |
| FR-SRC-010 | Quando o sistema exibir uma opção de escolha, o sistema deve mostrar o livro, a página e o tipo da opção (Core, Adds ou Replaces core). | Must | Active | P1. |
| FR-SRC-011 | Enquanto o construtor estiver aberto, o sistema deve exibir no cabeçalho a ordem resumida dos livros ligados. | Must | Active | Wireframe 3.1 ("Sources: Only Human › Core"). |
| FR-SRC-012 | Quando o usuário alterar a configuração de fontes, o sistema deve manter a alteração pendente até o usuário acionar "Apply and continue". | Must | Active | SCR-02. |
| FR-SRC-013 | Se o usuário sair da configuração de fontes com alterações não aplicadas, então o sistema deve pedir confirmação para descartá-las. | Must | Active | — |
| FR-SRC-014 | Quando o usuário aplicar uma alteração de fontes que afete escolhas já feitas, o sistema deve submeter a alteração à confirmação de dependentes. | Must | Active | P6; ver FR-CHG. |
| FR-SRC-015 | O sistema deve aplicar as erratas de cada livro dentro do próprio livro, antes da precedência entre livros. | Must | Active | D37. |
| FR-SRC-016 | Quando o sistema ordenar pacotes da casa, o sistema deve colocar o importado mais recentemente acima. | Should | Active | D37. Não há pacotes da casa no MVP. |
| FR-SRC-017 | O sistema deve permitir ligar e desligar cada componente de um livro, partindo do estado padrão declarado nos dados, inclusive as erratas. | Should | Active | P2e, P14a, D20, D37. Não detalhado. |
| FR-SRC-018 | O sistema deve oferecer regras opcionais e o pacote da casa embarcado, desligados por padrão. | Should | Active | P14a, P14b, P27, D3, D23, D24. Não detalhado. |
| FR-SRC-019 | Quando uma entidade tiver mais de uma versão disponível, o sistema deve permitir trocar a versão só para aquele personagem, no cartão do item. | Should | Active | P2c, D9. Não detalhado. |
| FR-SRC-020 | Quando uma entidade tiver mais de uma versão disponível, o sistema deve oferecer a comparação lado a lado das versões. | Should | Active | P2d; SCR-04. Não detalhado. |
| FR-SRC-021 | Quando o usuário rolar numa tabela que se rola mais de uma vez, o sistema deve permitir trocar a fonte da tabela só para aquela rolagem. | Should | Active | P2f, D21; SCR-08. Não detalhado. |
| FR-SRC-022 | Quando uma opção estiver indisponível por causa da configuração de fontes, o sistema deve explicar o motivo no lugar em que ela faria falta, com atalho para ligá-la. | Should | Active | P3. Não detalhado. |
| FR-SRC-023 | Quando o sistema exibir um livro, o sistema deve mostrar uma frase sobre o livro e um resumo gerado do que ele adiciona e substitui. | Should | Active | P15. Não detalhado. |
| FR-SRC-024 | O sistema deve tornar a lista de livros navegável por quem não os conhece, com agrupamento e busca. | Should | Active | P2a. Não detalhado. |
| FR-SRC-025 | Quando uma entrada declarar condições sobre livros ou regras ativos, o sistema deve usar o caminho que vale e indicar que há outro. | Should | Active | P26. Não detalhado. |
| FR-SRC-026 | Quando o usuário importar um pacote da casa, o sistema deve incluí-lo na lista de livros como mais uma fonte. | Could | Active | P21, D10, D11. Não detalhado. |

#### 3.1.3 Navegação da criação (FR-FLOW)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-FLOW-001 | Enquanto o construtor estiver aberto, o sistema deve exibir o mapa de etapas com o estado de cada etapa e a etapa atual destacada. | Must | Active | P4; wireframe 3.2. Estados: "Done", "N open", "Not started", "Optional". |
| FR-FLOW-002 | O sistema deve ordenar as etapas pela ordem de dependências da regra, com Ancestry primeiro. | Must | Active | P5. |
| FR-FLOW-003 | Quando a ancestralidade ou as fontes do personagem mudarem, o sistema deve recalcular o conjunto de etapas da criação. | Must | Active | Wireframe 3.4. No MVP, as 8 etapas do core. |
| FR-FLOW-004 | Enquanto nenhuma ancestralidade estiver escolhida, o sistema deve manter bloqueadas todas as etapas exceto Ancestry. | Must | Active | P4, D5. Dependências mais finas ficam dentro das etapas (FR-DEC). |
| FR-FLOW-005 | Enquanto uma etapa estiver bloqueada, o sistema deve exibi-la no mapa sem permitir abri-la e informar a dependência que falta. | Must | Active | Ex.: "Choose an ancestry first". |
| FR-FLOW-006 | Quando o usuário selecionar uma etapa liberada no mapa, o sistema deve abrir essa etapa. | Must | Active | — |
| FR-FLOW-007 | Quando o usuário acionar Next, o sistema deve abrir a etapa seguinte mesmo que a etapa atual tenha decisões abertas, desde que a seguinte esteja liberada. | Must | Active | P4, D5: pendência não bloqueia. |
| FR-FLOW-008 | Quando o usuário acionar Back, o sistema deve abrir a etapa anterior. | Must | Active | — |
| FR-FLOW-009 | Quando o sistema exibir uma etapa, o sistema deve mostrar o regime de decisão, uma pergunta, uma linha de regra com a página e contadores do que foi feito e do que falta. | Must | Active | P29; wireframe 3.3. |
| FR-FLOW-010 | Enquanto o construtor estiver aberto, o sistema deve exibir o painel de decisões abertas com a contagem e um atalho para cada pendência. | Must | Active | P4; wireframe 3.2. |
| FR-FLOW-011 | Quando o usuário acionar o atalho de uma pendência, o sistema deve abrir a etapa no ponto em que a pendência se resolve. | Must | Active | — |
| FR-FLOW-012 | Enquanto o construtor estiver aberto, o sistema deve exibir o resumo vivo com atributos e modificadores, características e o que foi ganho até ali. | Must | Active | P24. |
| FR-FLOW-013 | Quando uma decisão do personagem mudar, o sistema deve atualizar o resumo vivo. | Must | Active | P24. |
| FR-FLOW-014 | Quando o usuário escolher uma opção, o sistema deve mostrar o que ela muda na ficha: atributos, características e etapas. | Must | Active | P10. |
| FR-FLOW-015 | Quando o usuário abrir a etapa Review, o sistema deve listar as decisões abertas, com atalho para cada uma, e oferecer a abertura da ficha. | Must | Active | — |
| FR-FLOW-016 | Quando o usuário abrir a ficha a partir da etapa Review com decisões abertas, o sistema deve exibir a ficha com essas decisões indicadas. | Must | Active | Concluir não exige zerar pendências; FR-CHAR-008. |
| FR-FLOW-017 | O sistema deve tratar a etapa Roleplaying como opcional, sem gerar decisões abertas. | Must | Active | Nome, traços e perguntas de interpretação. |
| FR-FLOW-018 | Enquanto o app estiver em tela de celular, o sistema deve exibir a etapa em tela cheia, o mapa como seletor no topo, o resumo como barra recolhível embaixo e Back e Next fixos. | Must | Active | P32; SCR-16. Largura nos NFR. |
| FR-FLOW-019 | Quando uma fonte substituir etapas do fluxo, o sistema deve indicar no mapa quais etapas foram substituídas e por qual. | Should | Active | Wireframe 3.2. Só ocorre com revisão de procedimento (Should). Não detalhado. |

#### 3.1.4 Decisões e rolagens (FR-DEC)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-DEC-001 | Quando o sistema exibir uma tabela, o sistema deve oferecer rolar e escolher, qualquer que seja o regime da regra. | Must | Active | P7, D1. Vale para tabelas com efeito mecânico. |
| FR-DEC-002 | Quando o sistema exibir uma tabela, o sistema deve indicar o regime que a regra prevê, sem restringir as opções. | Must | Active | P7; princípios §1.1. |
| FR-DEC-003 | Quando a tabela for de rolagem com escolha permitida, o sistema deve oferecer também o modo Write. | Must | Active | SCR-09. |
| FR-DEC-004 | Quando a tabela for de rolagem prescrita, o sistema deve oferecer "Enter result" junto de Roll. | Must | Active | D30. |
| FR-DEC-005 | Quando o usuário rolar, o sistema deve sortear cada dado da expressão de forma independente e uniforme e combiná-los como a tabela publica. | Must | Active | 3d6 são três dados. Sem semente nem auditoria da aleatoriedade (lição 1). |
| FR-DEC-006 | Quando a tabela usar rolagens encadeadas, o sistema deve rolar cada etapa na tabela que a etapa anterior indicar. | Must | Active | Ex.: d6 do tipo e d20 na tabela do tipo (SCR-08, SCR-10). |
| FR-DEC-007 | Quando um resultado for obtido, o sistema deve exibir o valor, os dados, a tabela, o cálculo com cada modificador, o resultado e os seus efeitos mecânicos. | Must | Active | Wireframe §4 (cartão de rolagem). |
| FR-DEC-008 | Quando o resultado for uma entrada sem texto, o sistema deve exibir "No text added for this entry" com a faixa e a página. | Must | Active | D35, P22. Botão "Add text" fora do MVP (P9a). |
| FR-DEC-009 | Quando o usuário rolar ou escolher uma entrada cujo nome não vem no pacote, o sistema deve oferecer um campo para o usuário digitar o nome. | Must | Active | D36. No Choose, escolhe-se a faixa. Nome em branco conta como decisão aberta. |
| FR-DEC-010 | Quando um resultado gerar uma subdecisão, o sistema deve oferecê-la junto do resultado. | Must | Active | P30. Ex.: "Language +1 (choose)". |
| FR-DEC-011 | Enquanto uma subdecisão estiver sem resposta, o sistema deve contá-la como decisão aberta. | Must | Active | P4, P30. |
| FR-DEC-012 | Quando o sistema exibir as entradas de uma tabela para escolha, o sistema deve mostrar a faixa do dado de cada entrada. | Must | Active | SCR-09, SCR-10. |
| FR-DEC-013 | Enquanto o personagem já possuir uma opção, o sistema deve exibi-la desabilitada, como "already yours", onde ela reaparecer para escolha. | Must | Active | SCR-10. |
| FR-DEC-014 | Enquanto uma tabela depender do resultado de outra ainda não decidida, o sistema deve exibi-la como aguardando, com o motivo. | Must | Active | Wireframe 3.4. |
| FR-DEC-015 | Quando o usuário acionar Reroll, o sistema deve substituir o resultado e registrar o anterior no log como desfeito. | Must | Active | P8. |
| FR-DEC-016 | Quando o usuário rolar uma tabela, o sistema deve registrar quantas vezes ela já foi rolada. | Must | Active | P8. |
| FR-DEC-017 | Quando a substituição de um resultado afetar decisões dependentes, o sistema deve submetê-la à confirmação de dependentes antes de aplicar. | Must | Active | P6; ver FR-CHG. |
| FR-DEC-018 | Quando o usuário trocar o modo de uma tabela já decidida, o sistema deve tratar o novo resultado como substituição do anterior. | Must | Active | Ex.: de Roll para Write. Aplica-se FR-DEC-015 e FR-DEC-017. |
| FR-DEC-019 | Quando o usuário acionar "Enter result", o sistema deve aceitar o valor de cada dado ou etapa da rolagem. | Must | Active | D30. |
| FR-DEC-020 | Se um valor informado em "Enter result" estiver fora da faixa possível, então o sistema deve recusá-lo e informar a faixa válida. | Must | Active | Ex.: 3–18 para 3d6. |
| FR-DEC-021 | Se o usuário confirmar um resultado no modo Write sem texto, então o sistema deve recusar o registro e pedir o texto. | Must | Active | — |
| FR-DEC-022 | Quando o usuário marcar que um resultado escrito tem efeito de regra, o sistema deve abrir um ajuste manual ligado a esse resultado. | Must | Active | SCR-09; ver FR-ADJ. |
| FR-DEC-023 | Quando o usuário acionar "Roll all undecided", o sistema deve rolar só as tabelas da etapa sem decisão e que não estejam aguardando outra tabela. | Must | Active | Nunca sobrescreve o que foi decidido. |
| FR-DEC-024 | Quando o usuário escolher uma entrada no modo Choose, o sistema deve registrar a entrada e a sua faixa, sem valor de dado. | Must | Active | — |
| FR-DEC-025 | Quando o fluxo exigir uma decisão do mestre, o sistema deve registrá-la como concessão ou decisão da mesa, separada da edição manual. | Should | Active | P23, D15. No MVP, decisões do mestre entram por Write ou "Enter result". Não detalhado. |
| FR-DEC-026 | Quando um evento declarado como gatilho ocorrer na criação, o sistema deve oferecer a rolagem consequente, com opção de escolher ou informar. | Should | Active | P34. No MVP, o efeito entra por ajuste manual (P11d). Não detalhado. |

#### 3.1.5 Etapas do nível 0 (FR-STEP)

Páginas aproximadas do core, a confirmar nos dados do pacote: Human p.11–12, Clockwork p.15–16, Dwarf p.17–18, ajuste de atributos p.10, profissões e idiomas p.23–24, riqueza p.25, coisa interessante p.26–27, interpretação p.27–28. Halfling: *Demon Lord's Companion* p.9–10.

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-STEP-001 | Quando o usuário abrir a etapa Ancestry, o sistema deve exibir as ancestralidades dos livros ativos, cada uma com a linha de mecânica, a página e os selos de fonte e tipo. | Must | Active | P1, P9; SCR-03. |
| FR-STEP-002 | Quando o usuário selecionar uma ancestralidade, o sistema deve exibir os atributos iniciais, as características, os idiomas e profissões, o benefício de nível 4 e a referência de página da descrição. | Must | Active | SCR-03; P22. |
| FR-STEP-003 | Quando o usuário escolher uma ancestralidade com Size à escolha, o sistema deve oferecer a subdecisão de Size. | Must | Active | Human: ½ ou 1. |
| FR-STEP-004 | Quando o usuário escolher Clockwork, o sistema deve oferecer as tabelas Purpose e Form como subdecisões da etapa Ancestry, com rolar e escolher. | Must | Active | P7; resolve a ambiguidade dos princípios §1.3. |
| FR-STEP-005 | Quando o usuário trocar a ancestralidade escolhida, o sistema deve submeter a troca à confirmação de dependentes. | Must | Active | P6; ver FR-CHG. |
| FR-STEP-006 | Quando o usuário abrir a etapa Ancestry, o sistema deve oferecer busca por nome ou traço e filtro por livro. | Should | Active | SCR-03. Não detalhado. |
| FR-STEP-007 | Quando o usuário abrir a etapa Attributes, o sistema deve exibir os quatro atributos com valor, modificador e composição. | Must | Active | SCR-05; P11. |
| FR-STEP-008 | Quando a ancestralidade ou uma subdecisão conceder aumento de atributo à escolha, o sistema deve pedir ao usuário o atributo a aumentar. | Must | Active | Human +1; Clockwork Purpose (às vezes entre dois). |
| FR-STEP-009 | Quando o usuário aplicar o ajuste opcional, o sistema deve reduzir em 1 um atributo e aumentar em 1 outro atributo. | Must | Active | D24. Vale também depois de atributos rolados (Should). |
| FR-STEP-010 | Se o usuário tentar aplicar o ajuste opcional uma segunda vez, então o sistema deve impedir e oferecer desfazer o ajuste atual. | Must | Active | Uma única vez por personagem. |
| FR-STEP-011 | Quando o usuário desfizer o ajuste opcional, o sistema deve restaurar os dois atributos afetados. | Must | Active | — |
| FR-STEP-012 | Quando o usuário abrir a etapa Story, o sistema deve exibir um cartão para cada tabela de história da ancestralidade, com Roll, Choose e Write. | Must | Active | SCR-09. |
| FR-STEP-013 | Quando o personagem for Dwarf, o sistema deve oferecer na etapa Story a escolha da Hated Creature em grade, com as faixas do d20. | Must | Active | SCR-09. |
| FR-STEP-014 | Quando um resultado ou pacote tiver um efeito com dado, o sistema deve oferecer a rolagem desse efeito no próprio cartão, com Roll e "Enter result". | Must | Active | Ex.: "1d6 Insanity", "2d6 cp". Vai para o log. |
| FR-STEP-015 | Quando um resultado conceder idioma, profissão ou outra entidade, o sistema deve adicioná-la ao personagem com a origem do resultado. | Must | Active | P28. |
| FR-STEP-016 | Quando o usuário abrir a etapa Professions & languages, o sistema deve oferecer duas vagas de profissão, cada uma com Roll d6 + d20, Choose e "Trade for a language". | Must | Active | SCR-10. Nomes conforme FR-DEC-009 (D36). |
| FR-STEP-017 | Quando o usuário escolher "Trade for a language", o sistema deve oferecer falar um idioma novo ou ler um idioma que o personagem já fala. | Must | Active | SCR-10. |
| FR-STEP-018 | Quando a ancestralidade conceder um idioma adicional ou uma profissão aleatória, o sistema deve oferecer essa vaga na etapa Professions & languages. | Must | Active | Human do core e Human revisado com fallback (D22). |
| FR-STEP-019 | Quando o usuário renomear uma profissão, o sistema deve exibir o novo nome e permitir marcá-lo como aprovado pelo mestre. | Must | Active | SCR-10 ("Renamed with GM approval"). |
| FR-STEP-020 | Quando o sistema exibir os idiomas do personagem, o sistema deve mostrar, para cada um, se ele fala, lê e escreve, e a origem. | Must | Active | SCR-10; P28. |
| FR-STEP-021 | Enquanto houver idioma pendente vindo de outra etapa, o sistema deve exibi-lo na lista de idiomas com atalho para o ponto em que se resolve. | Must | Active | SCR-10. |
| FR-STEP-022 | Quando o usuário abrir a etapa Wealth & equipment, o sistema deve oferecer a rolagem de 3d6 na tabela de riqueza, com "Enter result". | Must | Active | SCR-11; rolagem prescrita. |
| FR-STEP-023 | Quando o estilo de vida for definido, o sistema deve adicionar ao personagem o pacote de equipamento correspondente. | Must | Active | SCR-11. |
| FR-STEP-024 | Quando o pacote de equipamento contiver escolhas internas, o sistema deve oferecê-las como subdecisões. | Must | Active | Arma; escudo, pergaminho ou kit. Magia do pergaminho: FR-DEC-025. |
| FR-STEP-025 | Quando o usuário acionar "Buy equipment", o sistema deve permitir comprar itens com o dinheiro do personagem. | Could | Active | SCR-11. Exige catálogo com preços. Não detalhado. |
| FR-STEP-026 | Quando o usuário abrir a etapa Interesting thing, o sistema deve oferecer a rolagem de tipo e item, com "Reroll item", "Reroll type and item" e "Enter result". | Must | Active | SCR-08. |
| FR-STEP-027 | Quando a coisa interessante for definida, o sistema deve registrá-la no campo Interesting Things com a origem. | Must | Active | P28. |
| FR-STEP-028 | Quando a coisa interessante for um item existente, o sistema deve colocá-la no inventário com a marca "interesting thing" e referenciá-la no campo Interesting Things. | Should | Active | D26. Não detalhado. |
| FR-STEP-029 | Quando o usuário abrir a etapa Roleplaying, o sistema deve oferecer o nome do personagem como texto livre. | Must | Active | Sem lista de nomes sugeridos (D36). Ver FR-CHAR-012. |
| FR-STEP-030 | Quando o usuário abrir a etapa Roleplaying, o sistema deve oferecer dois traços positivos e um negativo, pela tabela de traços ou por texto livre. | Must | Active | Tabela conforme FR-DEC-009. |
| FR-STEP-031 | Quando o usuário abrir a etapa Roleplaying, o sistema deve oferecer um campo de notas de interpretação com a referência de página das perguntas do livro. | Must | Active | As perguntas são texto do livro (P22). |

#### 3.1.6 Valores derivados (FR-CALC)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-CALC-001 | O sistema deve calcular cada valor derivado a partir das decisões, das fontes e dos ajustes do personagem, sem guardar o resultado como valor solto. | Must | Active | D2, P11. |
| FR-CALC-002 | Quando o sistema exibir um atributo ou característica, o sistema deve mostrar a composição: base, cada parcela com a sua origem e total. | Must | Active | P11; SCR-05. |
| FR-CALC-003 | Quando o sistema exibir uma característica, o sistema deve mostrar a fórmula em linguagem legível. | Must | Active | SCR-05. Ex.: "¼ Health, round down, minimum 1". |
| FR-CALC-004 | O sistema deve usar a fórmula declarada pela versão vigente da fonte, inclusive quando ela substitui a fórmula padrão. | Must | Active | P11a. Ex.: Clockwork, Defense 13. |
| FR-CALC-005 | O sistema deve calcular cada valor na ordem: base da ancestralidade, modificadores permanentes, efeitos que definem, efeitos que somam, limites e ajuste manual. | Must | Active | P11b. |
| FR-CALC-006 | O sistema deve aplicar os limites declarados nos dados. | Must | Active | Defense ≤ 25, Perception ≤ 25, Healing Rate ≥ 1, Insanity ≤ Will. |
| FR-CALC-007 | Quando um limite cortar um valor, o sistema deve indicar o corte na composição. | Must | Active | Ex.: "capped at 25". |
| FR-CALC-008 | O sistema deve arredondar cada valor conforme a fórmula declarada. | Must | Active | Sem regra global de arredondamento. |
| FR-CALC-009 | Quando uma decisão, fonte, atributo ou ajuste mudar, o sistema deve recalcular os valores dependentes e atualizar o resumo vivo, a etapa e a ficha. | Must | Active | Health acompanha Strength. Sem botão "recalcular". |
| FR-CALC-010 | Quando um resultado de tabela tiver efeito mecânico, o sistema deve incluí-lo no cálculo com a origem do resultado. | Must | Active | P28. Ex.: Corruption +1, Size 1. |
| FR-CALC-011 | Quando mais de um efeito somar ao mesmo valor, o sistema deve acumulá-los. | Must | Active | Conferido no core: bônus e penalidades de fontes diferentes são cumulativos (p. 32), dano extra também (p. 39); boons e banes se cancelam um a um (p. 33). Exceções declaradas por efeito (Apêndice B, Q2). |
| FR-CALC-012 | Quando o personagem possuir um escudo, o sistema deve exibi-lo com o seu efeito e não incluí-lo no cálculo da Defense. | Must | Active | Equipar é estado de jogo (Could). Defense com escudo: ajuste manual. |
| FR-CALC-013 | Quando o personagem usar armadura, o sistema deve substituir a Defense base pela da armadura e indicar quando a Strength estiver abaixo do mínimo exigido. | Should | Active | P11b; princípios §1.5. Nenhum pacote do core traz armadura. Não detalhado. |
| FR-CALC-014 | Quando um efeito temporário estiver ligado, o sistema deve incluí-lo no cálculo sem registrá-lo no log. | Could | Active | P11c. Ficha de jogo. Não detalhado. |

#### 3.1.7 Mudança a montante (FR-CHG)

Mudanças a montante: trocar uma escolha, rerrolar, trocar de modo numa tabela decidida, ligar ou desligar livro, reordenar livros (P6, D6).

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-CHG-001 | Quando o usuário pedir uma mudança da qual outras decisões dependem, o sistema deve exibir o diálogo de impacto antes de aplicá-la. | Must | Active | P6, D6; SCR-07. |
| FR-CHG-002 | Quando o usuário pedir uma mudança sem dependentes, o sistema deve aplicá-la sem diálogo. | Must | Active | — |
| FR-CHG-003 | Quando o sistema exibir o diálogo de impacto, o sistema deve mostrar lado a lado o estado atual e o novo. | Must | Active | SCR-07. |
| FR-CHG-004 | Quando o sistema exibir o diálogo de impacto, o sistema deve listar o que será removido, o que será recalculado e o que permanece. | Must | Active | SCR-07: "Will be removed", "Will be recalculated", "Stays as it is". |
| FR-CHG-005 | Quando o sistema listar o que será removido, o sistema deve incluir os dependentes transitivos. | Must | Active | — |
| FR-CHG-006 | Quando o sistema listar o que será recalculado, o sistema deve mostrar o valor antigo e o novo. | Must | Active | Ex.: "Corruption 1 → 0". |
| FR-CHG-007 | Quando a mudança vier da configuração de fontes, o sistema deve agrupar o impacto por livro. | Must | Active | — |
| FR-CHG-008 | Quando o usuário confirmar a mudança, o sistema deve remover os dependentes, recalcular os derivados e deixar o personagem em estado válido. | Must | Active | P6. |
| FR-CHG-009 | Quando o usuário recusar a mudança, o sistema deve manter o personagem exatamente como estava. | Must | Active | — |
| FR-CHG-010 | Quando o usuário recusar uma rerrolagem no diálogo, o sistema deve registrar o valor recusado no log como desfeito. | Must | Active | SCR-15. |
| FR-CHG-011 | Quando uma decisão for removida por mudança a montante, o sistema deve registrá-la no log como desfeita, com o motivo. | Must | Active | P8. |
| FR-CHG-012 | Quando uma decisão removida ainda for exigida pela regra, o sistema deve devolvê-la como decisão aberta. | Must | Active | Ex.: tabelas de história da nova ancestralidade. |
| FR-CHG-013 | Quando um ajuste manual estiver ligado a uma decisão removida, o sistema deve removê-lo junto e listá-lo entre os removidos. | Must | Active | Ex.: efeito de um resultado escrito (FR-DEC-022). |
| FR-CHG-014 | Quando um ajuste manual livre incidir sobre um valor que será recalculado, o sistema deve mantê-lo e listá-lo entre os recalculados. | Must | Active | P12. |
| FR-CHG-015 | Quando a fonte de uma tabela mudar, o sistema deve manter os resultados já obtidos, marcados com a fonte de origem, e usar a nova fonte só nas próximas rolagens. | Should | Active | P6b, D21. Não detalhado. |
| FR-CHG-016 | Quando o usuário acionar "Change" numa entrada do log, o sistema deve reabrir a decisão, com a confirmação de dependentes. | Should | Active | D32; SCR-15. Não detalhado. |
| FR-CHG-017 | Quando o usuário acionar "desfazer", o sistema deve reverter a última mudança confirmada. | Could | Active | Sem desfazer geral no MVP; a confirmação prévia cumpre o papel. Não detalhado. |

#### 3.1.8 Log de criação (FR-LOG)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-LOG-001 | Quando uma decisão for registrada, o sistema deve adicionar ao log uma entrada com o tipo, a descrição, a fonte e o modo (rolado, escolhido, escrito ou informado). | Must | Active | P8; SCR-15. |
| FR-LOG-002 | Quando a decisão for uma rolagem, o sistema deve registrar o valor de cada dado, cada modificador aplicado, o total e o número de rolagens daquela tabela. | Must | Active | P8. Ex.: "3d6 = 9, +1 por … → 10". |
| FR-LOG-003 | Quando a decisão for feita no modo Write, o sistema deve registrar o texto digitado. | Must | Active | — |
| FR-LOG-004 | Quando a decisão for feita por "Enter result", o sistema deve registrar os valores informados com a marca "entered". | Must | Active | D30. |
| FR-LOG-005 | Quando o usuário criar, alterar ou remover um ajuste manual, o sistema deve registrar a mudança no log. | Must | Active | P12. |
| FR-LOG-006 | Quando o usuário aplicar uma mudança de fontes, o sistema deve registrar uma entrada "Sources" com a ordem resultante dos livros ligados. | Must | Active | P14a; SCR-15. |
| FR-LOG-007 | Quando uma decisão for desfeita, o sistema deve manter a entrada no log, marcada como desfeita, com o motivo. | Must | Active | P8; FR-CHG-011. |
| FR-LOG-008 | Quando o usuário alterar o nome, as notas ou outro campo de texto livre, o sistema deve salvar a alteração sem registrá-la no log. | Must | Active | Nomes digitados em entradas de tabela (D36) são registrados, por fazerem parte da decisão. |
| FR-LOG-009 | O sistema deve impedir a edição e a exclusão de entradas do log. | Must | Active | O log some só com o personagem (FR-CHAR-014). |
| FR-LOG-010 | Quando o sistema registrar uma entrada, o sistema deve guardar a data e a hora. | Must | Active | Não exibidas no MVP. |
| FR-LOG-011 | Quando o usuário abrir o log, o sistema deve exibir as entradas em ordem cronológica, agrupadas por fase. | Must | Active | SCR-15. No MVP, só "Creation · level 0". |
| FR-LOG-012 | Quando o usuário selecionar um filtro, o sistema deve exibir só as entradas do tipo filtrado. | Must | Active | Filtros do MVP: All, Choices, Rolls, Edits. |
| FR-LOG-013 | Enquanto "Show undone entries" estiver ligado, o sistema deve exibir as entradas desfeitas riscadas, com o motivo. | Must | Active | Ligado por padrão. |
| FR-LOG-014 | Quando o usuário desligar "Show undone entries", o sistema deve ocultar as entradas desfeitas. | Must | Active | — |
| FR-LOG-015 | Enquanto o construtor ou a ficha estiver aberto, o sistema deve oferecer acesso ao log no cabeçalho. | Must | Active | Wireframe 3.1. |
| FR-LOG-016 | Quando o usuário exportar o log, o sistema deve gerar o log sozinho ou junto com a ficha. | Should | Active | P8a; SCR-15. Não detalhado. |
| FR-LOG-017 | Quando o sistema exibir uma entrada do log, o sistema deve mostrar a data e a hora. | Could | Active | Não detalhado. |

#### 3.1.9 Ficha final e impressão (FR-SHEET)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-SHEET-001 | Quando o usuário abrir a ficha, o sistema deve exibir no cabeçalho o nome, a ancestralidade e o nível do personagem. | Must | Active | SCR-14. |
| FR-SHEET-002 | Quando o usuário abrir a ficha, o sistema deve exibir os quatro atributos com os seus modificadores. | Must | Active | SCR-14. |
| FR-SHEET-003 | Quando o usuário abrir a ficha, o sistema deve exibir as características com a sua composição. | Must | Active | P11; FR-CALC-002. |
| FR-SHEET-004 | Quando o usuário abrir a ficha, o sistema deve exibir os talentos do personagem com a origem e a página. | Must | Active | Ex.: Darksight e Hated Creature do Dwarf. |
| FR-SHEET-005 | Quando o usuário abrir a ficha, o sistema deve exibir o equipamento e o dinheiro. | Must | Active | SCR-14. |
| FR-SHEET-006 | Quando o usuário abrir a ficha, o sistema deve exibir os campos fixos, cada entrada com a sua origem. | Must | Active | P28, D25, D27, D29: Appearance, Background, Personality, Religion, Languages, Professions, Interesting Things, Companions, Other Possessions, Marks of Darkness, Quirks, Objective. |
| FR-SHEET-007 | Enquanto um campo fixo estiver vazio, o sistema deve exibir um texto de estado vazio. | Must | Active | Ex.: "Set when you reach an expert path"; "None · set by your GM". |
| FR-SHEET-008 | Enquanto uma seção própria de níveis mais altos estiver vazia, o sistema deve ocultá-la. | Must | Active | Ex.: Spells. |
| FR-SHEET-009 | Quando o usuário acionar "+" num campo fixo, o sistema deve adicionar a entrada com a origem "Added by player", como ajuste manual. | Must | Active | P12, P28; ver FR-ADJ. |
| FR-SHEET-010 | Enquanto houver decisões abertas, o sistema deve indicá-las na ficha e exibir as decisões pendentes do mestre como "GM's choice". | Must | Active | FR-CHAR-008; SCR-11. |
| FR-SHEET-011 | O sistema deve exibir na ficha a mecânica e a referência de página, sem texto descritivo dos livros. | Must | Active | P22, D35. |
| FR-SHEET-012 | Enquanto a ficha estiver aberta, o sistema deve manter travados os valores calculados, alteráveis só pelo construtor ou por ajuste manual. | Must | Active | P13, P12. |
| FR-SHEET-013 | Quando o usuário imprimir a ficha, o sistema deve gerar um layout sem controles, legível em preto e branco, com as decisões abertas marcadas, as referências de página e um rodapé com as fontes do personagem. | Must | Active | P8a (parcial). Limite de páginas nos NFR. |
| FR-SHEET-014 | Enquanto o app estiver em tela de celular, o sistema deve exibir a ficha em coluna única, com os ajustes acessíveis. | Must | Active | Não desenhado no wireframe (spec §8). |
| FR-SHEET-015 | Quando o usuário exportar a ficha, o sistema deve gerar um arquivo PDF. | Should | Active | P8a; SCR-15. Não detalhado. |
| FR-SHEET-016 | Quando o usuário abrir a ficha, o sistema deve exibir os ataques com talentos e efeitos aplicados e permitir ataques personalizados. | Could | Active | D34. Não detalhado. |
| FR-SHEET-017 | Quando o usuário adicionar uma imagem ao personagem, o sistema deve exibi-la na ficha e na exportação. | Could | Active | D33. Não detalhado. |
| FR-SHEET-018 | Quando o usuário exportar a ficha com "Include my rule texts", o sistema deve incluir os textos do usuário. | Could | Active | P9a; SCR-15. Não detalhado. |
| FR-SHEET-019 | Enquanto a ficha estiver em uso em jogo, o sistema deve controlar os recursos de sessão e oferecer os gatilhos de regra como avisos não bloqueantes. | Could | Active | D17, P13c, P34, D31. Ficha de jogo. Não detalhado. |

#### 3.1.10 Ajuste manual (FR-ADJ)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-ADJ-001 | Enquanto a ficha não estiver em modo de edição, o sistema deve exibi-la apenas para leitura. | Must | Active | SCR-14. |
| FR-ADJ-002 | Quando o usuário acionar "Edit sheet", o sistema deve liberar os ajustes manuais. | Must | Active | SCR-14; P13. |
| FR-ADJ-003 | Quando o usuário criar um ajuste, o sistema deve pedir um nome ou motivo curto. | Must | Active | P12. Ex.: "Shield wielded". |
| FR-ADJ-004 | Se o usuário confirmar um ajuste sem nome, então o sistema deve recusá-lo e pedir o nome. | Must | Active | — |
| FR-ADJ-005 | Quando o usuário aplicar um modificador a um atributo ou característica, o sistema deve somá-lo ao valor calculado. | Must | Active | P12. Inteiro com sinal. |
| FR-ADJ-006 | Quando o usuário aplicar uma substituição a um atributo ou característica, o sistema deve usar o valor informado no lugar do calculado. | Must | Active | P12. |
| FR-ADJ-007 | Se o valor informado num ajuste não for um número inteiro, então o sistema deve recusá-lo e informar o formato esperado. | Must | Active | — |
| FR-ADJ-008 | Enquanto uma substituição estiver ativa, o sistema deve mostrar na composição o valor calculado e o valor substituído. | Must | Active | Ex.: "Calculated 10 · overridden to 12". |
| FR-ADJ-009 | Quando o valor calculado sob uma substituição mudar, o sistema deve manter a substituição e atualizar o valor calculado exibido. | Must | Active | FR-CHG-014. |
| FR-ADJ-010 | Quando um atributo tiver ajuste, o sistema deve usar o valor ajustado no cálculo dos derivados. | Must | Active | Ex.: substituir Strength muda Health. |
| FR-ADJ-011 | Enquanto um valor ajustado estiver acima do máximo da regra, o sistema deve indicar isso na composição. | Must | Active | P7, P11b: o ajuste vem depois dos limites. |
| FR-ADJ-012 | Quando o usuário adicionar, editar ou remover uma entrada de campo fixo, o sistema deve registrar a mudança como ajuste manual. | Must | Active | P28. |
| FR-ADJ-013 | Quando o usuário editar uma entrada vinda de uma tabela, o sistema deve manter o original visível na composição e no log. | Must | Active | P17, por analogia. |
| FR-ADJ-014 | Quando o usuário adicionar um item ao equipamento, o sistema deve registrá-lo como texto, sem efeito mecânico. | Must | Active | — |
| FR-ADJ-015 | Quando o usuário remover um item do pacote de equipamento, o sistema deve registrar a remoção como ajuste manual. | Must | Active | — |
| FR-ADJ-016 | Quando o usuário remover um ajuste, o sistema deve restaurar o valor ou a entrada original. | Must | Active | Registro no log: FR-LOG-005. |

#### 3.1.11 Pacote oficial de conteúdo (FR-CONT)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-CONT-001 | O sistema deve carregar o conteúdo oficial a partir de pacotes no formato documentado, o mesmo dos pacotes da casa. | Must | Active | P21a. |
| FR-CONT-002 | O sistema deve trazer o pacote oficial embutido, sem exigir importação. | Must | Active | Importação de pacotes é Could (FR-SRC-026). |
| FR-CONT-003 | O pacote oficial do MVP deve cobrir o nível 0 do core para Human, Dwarf e Clockwork, o Human revisado do *Only Human* e o Halfling do *Demon Lord's Companion*. | Must | Active | SRS 1.2.1. Cada dado conferido no PDF. |
| FR-CONT-004 | O pacote oficial deve conter apenas mecânica: IDs e nomes de entidades, números, faixas de dado, efeitos, concessões, ligações entre tabelas, condições e página. | Must | Active | P22, D35. Verificado pela métrica M3. |
| FR-CONT-005 | O pacote oficial deve incluir um nome curto que seja o conteúdo inteiro de uma entrada só quando outra regra o referenciar. | Must | Active | D36, D38. Todos os idiomas entram (nome de entidade, sem a descrição). Tipos de criatura são entidades (D38): todos os nomes entram, ex.: Hated Creature. |
| FR-CONT-006 | O sistema deve identificar cada entidade por um ID estável, independente do nome exibido e do livro. | Must | Active | P18. |
| FR-CONT-007 | Quando uma versão de outro livro substituir uma entidade, o sistema deve usar o ID que a versão declara substituir e herdar os campos que ela não sobrescreve. | Must | Active | P18, P19. |
| FR-CONT-008 | O formato de pacote deve representar fórmulas, efeitos (alvo e operação) e tabelas (dado, faixas, entradas, efeitos, concessões, ligações, regime e campo de destino na ficha) como dados. | Must | Active | P11a, P14a, P28; wireframe §7. |
| FR-CONT-009 | Quando o sistema exibir uma entidade, o sistema deve gerar a linha de mecânica a partir dos dados. | Must | Active | P9. |
| FR-CONT-010 | Se um pacote não declarar a data de publicação, então o sistema deve recusá-lo. | Must | Active | D37. |
| FR-CONT-011 | Se uma entidade, tabela ou entrada de uma fonte com páginas não tiver referência de página, então o sistema deve recusar o pacote. | Must | Active | P22. Pacotes sem páginas (ex.: casa) dispensam. |
| FR-CONT-012 | Se um pacote fizer uma referência não condicional a algo inexistente, então o sistema deve recusá-lo e listar cada referência que falta, com o local. | Must | Active | P20, P21b. |
| FR-CONT-013 | Quando uma referência estiver condicionada a um livro ou regra inativo, o sistema deve aceitar o pacote e usar o caminho alternativo. | Must | Active | P26. Exibição do outro caminho: FR-SRC-025 (Should). |
| FR-CONT-014 | Quando uma entrada declarar um efeito não modelado, o sistema deve exibir a página e sugerir o ajuste manual. | Must | Active | P11d. |
| FR-CONT-015 | Quando o pacote oficial mudar numa nova versão do app, o sistema deve recalcular os personagens pela versão atual. | Must | Active | P6a, por analogia. |
| FR-CONT-016 | Se uma decisão de um personagem deixar de existir no pacote atual, então o sistema deve reabri-la como decisão aberta, avisar ao abrir o personagem e registrar no log. | Must | Active | P6, P8. |
| FR-CONT-017 | O formato de pacote deve ter documentação com exemplos e modelos para copiar. | Should | Active | P21b. Não detalhado. |

#### 3.1.12 Sobre, aviso legal e erros gerais (FR-HELP)

| ID | Requisito | Prioridade | Status | Origem / notas |
|---|---|---|---|---|
| FR-HELP-001 | Enquanto o app estiver aberto, o sistema deve oferecer acesso à página "About" em todas as telas. | Must | Active | — |
| FR-HELP-002 | Quando o usuário abrir "About", o sistema deve informar que o projeto não é oficial nem afiliado à Schwalb Entertainment e que os nomes do jogo são marcas dela. | Must | Active | Mitigação do risco de licença aceito (Q1). |
| FR-HELP-003 | Quando o usuário abrir "About", o sistema deve explicar que o texto das regras está nos livros e indicar onde comprá-los. | Must | Active | D35. |
| FR-HELP-004 | Se o sistema não conseguir carregar o pacote oficial, então o sistema deve exibir uma mensagem compreensível e manter intactos os personagens salvos. | Must | Active | — |
| FR-HELP-005 | Se ocorrer um erro inesperado, então o sistema deve exibir uma mensagem compreensível, sem termos internos do sistema, e preservar os personagens salvos. | Must | Active | Lição 5. |
| FR-HELP-006 | Quando o usuário acionar "Feedback", o sistema deve abrir o canal de feedback do projeto. | Could | Active | Ex.: issues no GitHub. Não detalhado. |

### 3.2 Requisitos de interfaces externas

- **Interface com o usuário:** aplicação web no navegador, responsiva de 360 px a 1920 px (NFR-COMP-002), em inglês (P25). Telas de referência do MVP: SCR-01, 02, 03, 05, 07, 08, 09, 10 (com o ajuste da D36), 11, 14 (só o conteúdo da ficha final), 15 (só o log) e 16. Entrada por mouse e teclado ou por toque.
- **Hardware:** nenhum requisito específico.
- **Software:** navegador com impressão para PDF (FR-SHEET-013). Nenhum serviço de terceiros no MVP (NFR-PRIV-001). Onde os dados ficam é decisão da arquitetura.
- **Comunicação:** HTTPS (NFR-SEC-001). Nenhuma API externa.
- **Formatos de dados:** pacote de conteúdo, documentado e com data de publicação (FR-CONT-001, FR-CONT-010); arquivo do personagem (FR-CHAR-018, FR-CHAR-019); pacote de textos (Could, P9a). A sintaxe dos formatos é decisão da arquitetura.

### 3.3 Requisitos não funcionais

| ID | Categoria | Requisito (métrica, meta, condição) | Prioridade |
|---|---|---|---|
| NFR-PERF-001 | Desempenho | O maior elemento visível da primeira carga (LCP) aparece em até 2,5 s no desktop com banda larga e em até 4 s em celular médio com 4G simulado, medido no Lighthouse. | Must |
| NFR-PERF-002 | Desempenho | Depois de uma decisão, o resumo vivo e a etapa se atualizam em até 100 ms (p95) num notebook médio e em até 200 ms (p95) num celular médio. | Must |
| NFR-PERF-003 | Desempenho | O diálogo de impacto abre em até 300 ms (p95) depois do pedido de mudança. | Must |
| NFR-CAP-001 | Capacidade | Com até 100 personagens salvos por usuário, as metas de desempenho continuam atendidas. | Must |
| NFR-CAP-002 | Capacidade | O formato de pacote e o carregamento comportam o pacote oficial completo (core e todos os suplementos) sem mudança de arquitetura; o MVP mede só o seu conteúdo. | Must |
| NFR-REL-001 | Confiabilidade | Nenhuma decisão confirmada se perde: o salvamento conclui em até 1 s depois da decisão, e fechar a aba logo em seguida não perde a decisão. | Must |
| NFR-REL-002 | Disponibilidade | Sem SLA formal; meta de 99% de disponibilidade mensal. | Must |
| NFR-REL-003 | Disponibilidade | Depois da primeira visita, o app funciona sem conexão para criar, consultar e imprimir personagens. | Should |
| NFR-SEC-001 | Segurança | Todo o tráfego usa HTTPS, e nenhum segredo fica no repositório. | Must |
| NFR-SEC-002 | Segurança | Arquivos importados são tratados só como dados, nunca executados; arquivos inválidos são recusados com mensagem. | Must |
| NFR-PRIV-001 | Privacidade | O app não coleta dados pessoais nem usa analytics, cookies de rastreamento ou serviços de rastreamento de terceiros. | Must |
| NFR-ACC-001 | Acessibilidade | Construtor, ficha e log seguem a WCAG 2.2 AA, com todas as ações acessíveis por teclado; verificação automática (axe) sem violações graves e revisão manual das telas do MVP. | Must |
| NFR-USE-001 | Usabilidade | Nenhum termo interno do sistema aparece na interface, verificado por revisão dos textos visíveis antes de cada publicação. | Must |
| NFR-USE-002 | Usabilidade | Um jogador experiente cria um personagem de nível 0 completo em até 10 minutos; uma pessoa sem os livros conclui a criação sem ajuda externa (M1, M4). | Must |
| NFR-COMP-001 | Compatibilidade | Funciona nas 2 últimas versões de Chrome, Edge, Firefox e Safari, no desktop, no iOS e no Android. | Must |
| NFR-COMP-002 | Compatibilidade | Funciona de 360 px a 1920 px de largura, sem rolagem horizontal. | Must |
| NFR-COMP-003 | Compatibilidade | A ficha de nível 0 impressa cabe em até 2 páginas A4 ou Letter. | Must |
| NFR-MAINT-001 | Manutenibilidade | Acrescentar conteúdo dos padrões 1 a 3 exige só dados, sem mudança no código do motor; verificado no MVP com o Human revisado e o Halfling. | Must |
| NFR-MAINT-002 | Manutenibilidade | Cada requisito Must de FR-CALC, FR-CHG e FR-DEC tem teste automatizado. | Must |
| NFR-COST-001 | Custo | Hospedagem e operação custam US$ 0 por mês como meta, com teto de US$ 5 por mês. | Must |
| NFR-L10N-001 | Localização | Interface, conteúdo e ficha só em inglês (P25, D12); tradução não é requisito. | Must |
| NFR-OBS-001 | Observabilidade | Sem telemetria no MVP; erros chegam ao usuário pela FR-HELP-005. | Must |

### 3.4 Outros requisitos

- **Propriedade intelectual:** o conteúdo oficial segue o P22, a D35, a D36 e a D38 (FR-CONT-004, FR-CONT-005), verificado pela métrica M3. Aviso de não afiliação em FR-HELP-002.
- **Dados pessoais:** o MVP não trata dados pessoais (NFR-PRIV-001).
- **Retenção:** um personagem fica guardado até o usuário excluí-lo (FR-CHAR-014).

## Apêndice A — Glossário

| Termo | Definição |
|---|---|
| Livro (fonte) | Unidade de conteúdo ligável por personagem: o core, um suplemento ou um pacote da casa (P2, D7). |
| Pacote | Arquivo no formato documentado que contém o conteúdo de um livro (P21a). |
| Componente | Parte de um livro que se liga e desliga sozinha, como uma regra opcional ou uma errata (P2e). Fora do MVP, salvo erratas aplicadas. |
| Camadas da ordem padrão | Pacotes da casa › suplementos › core, que definem a prioridade inicial dos livros (D37). |
| Entidade | Item de conteúdo com ID estável: ancestralidade, path, magia, talento, tradição, item, tipo de criatura, idioma (P18, D38). |
| Versão | Definição de uma entidade por um livro específico; a vigente é a do livro mais acima (D4, D8). |
| Mecânica | O que entra no pacote oficial: IDs, nomes de entidades, números, faixas, efeitos, concessões, ligações, condições e página (P22). |
| Regime de decisão | Escolha, rolagem com escolha permitida, rolagem prescrita ou derivado (princípios §1.1). |
| Decisão aberta | Escolha ainda não feita; aparece em "Open decisions" e não bloqueia o que não depende dela (P4). |
| Subdecisão | Escolha menor gerada por uma opção ou resultado, adiável (P30). |
| Mudança a montante | Mudança numa decisão da qual outras dependem (P6). |
| Diálogo de impacto | Confirmação que lista o que uma mudança a montante remove, recalcula e mantém (SCR-07). |
| Valor derivado | Valor calculado a partir de outros, nunca guardado solto (D2). |
| Composição | Base, parcelas e total de um valor, cada parcela com a sua origem (P11). |
| Ajuste manual | Modificador ou substituição nomeados e reversíveis sobre a ficha (P12). |
| Log | Registro só de acréscimo das decisões e ajustes do personagem (P8). |
| Campo fixo | Seção da ficha que recebe resultados de tabelas, com a origem de cada entrada (P28). |

## Apêndice B — Questões em aberto

| # | Questão | Origem | Estado |
|---|---|---|---|
| Q1 | O site fica aberto ao público no MVP ou restrito à mesa até consultar a Schwalb? | Nota final dos princípios | Resolvida: aberto ao público desde o MVP, sem controle de acesso. |
| Q2 | Quais são as regras gerais de empilhamento de efeitos no core? O MVP acumula todos os efeitos que somam (FR-CALC-011). | P11b [Não verificado] | Resolvida (2026-11-11): o core não tem regra geral de "não empilha"; bônus e penalidades de fontes diferentes se somam (p. 32), dano extra também (p. 39), boons e banes se cancelam um a um (p. 33). Efeitos que não se acumulam declaram isso nos dados (ADR-004). |
