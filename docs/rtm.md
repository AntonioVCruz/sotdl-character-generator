# Matriz de rastreabilidade de requisitos (RTM)

> Fonte: `docs/srs.md`, `docs/use-cases.md` · Última atualização: 2026-11-08
> As colunas Design, Plan e Test são preenchidas pelas etapas seguintes, cada uma só na sua coluna: arquitetura e design detalhado (Design), planejamento (Plan), verificação (Test). Sempre acrescentar, nunca sobrescrever.

| Req ID | Requisito (curto) | Prioridade | Status | Origem | Caso(s) de uso | Design ref | Plan ref | Test ref |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| FR-CHAR-001 | Criar um personagem de nível 0 tendo apenas o core como fonte ativa | Must | Active | SCR-01, P2 | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-002 | Abrir a configuração de fontes desse personagem | Must | Active | SCR-01, SCR-02 | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-003 | Listar os personagens salvos com nome, ancestralidade, nível, estado, resumo das… | Must | Active | SCR-01 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-004 | Ordená-los da edição mais recente para a mais antiga | Must | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-005 | Exibir o estado "Creating" com o número de decisões abertas | Must | Active | SCR-01, P4 | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-006 | Exibir o estado "Complete" | Must | Active | Entrevista de requisitos | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-007 | Abrir o construtor na última etapa visitada desse personagem | Must | Active | SCR-01 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-008 | Exibir a ficha com as decisões abertas indicadas | Must | Active | SCR-01, P4 | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-009 | Salvar o personagem sem exigir ação do usuário | Must | Active | Entrevista de requisitos | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-010 | Avisar o usuário e manter na tela o estado ainda não salvo | Must | Active | Entrevista de requisitos | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-011 | Exibi-lo como "Unnamed character" | Must | Active | Entrevista de requisitos | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-012 | Atualizar o nome | Must | Active | Entrevista de requisitos | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-013 | Pedir confirmação informando que a exclusão é irreversível | Must | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-014 | Remover permanentemente o personagem e o seu log | Must | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-015 | Exibir um estado vazio que diz o que o app faz, avisa que o texto das regras vem do… | Must | Active | D35 | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-016 | Informar ao usuário que eles ficam disponíveis somente naquele navegador | Must | Active | Entrevista de requisitos | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-017 | Avisar o usuário e recarregar o personagem antes de aceitar nova mudança | Should | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-018 | Gerar um arquivo que reabre o personagem no gerador com suas fontes e regras | Should | Active | P8a | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-019 | Recriar o personagem com suas fontes e regras | Should | Active | P8a, SCR-01 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-020 | Criar uma cópia independente dele | Could | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-021 | Permitir copiar as fontes de outro personagem | Could | Active | SCR-01 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHAR-022 | Aplicá-las a cada personagem novo | Could | Active | SCR-01, P2 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-001 | Listar os livros em ordem de prioridade, com o estado ligado ou desligado de cada um | Must | Active | P2, D7, SCR-02 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-002 | Incluir apenas os livros que têm conteúdo no pacote oficial | Must | Active | Entrevista de requisitos | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-003 | Manter o core sempre ligado e na última posição da lista | Must | Active | P2b, D37 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-004 | Definir a ordem padrão dos livros por camadas: pacotes da casa no topo, suplementos no… | Must | Active | P2b, D37 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-005 | Ordená-los entre si pelo nome, em ordem alfabética | Must | Active | D37 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-006 | Colocá-lo na posição que a sua camada define | Must | Active | D37 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-007 | Retirar o conteúdo desse livro das opções do personagem | Must | Active | P14 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-008 | Usar a nova ordem como prioridade daquele personagem | Must | Active | P2b, D8 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-009 | Oferecer a entidade uma única vez, na versão do livro mais acima | Must | Active | D4, D8 | UC-002, UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-010 | Mostrar o livro, a página e o tipo da opção (Core, Adds ou Replaces core) | Must | Active | P1 | UC-002, UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-011 | Exibir no cabeçalho a ordem resumida dos livros ligados | Must | Active | Entrevista de requisitos | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-012 | Manter a alteração pendente até o usuário acionar "Apply and continue" | Must | Active | SCR-02 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-013 | Pedir confirmação para descartá-las | Must | Active | Entrevista de requisitos | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-014 | Submeter a alteração à confirmação de dependentes | Must | Active | P6 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-015 | Aplicar as erratas de cada livro dentro do próprio livro, antes da precedência entre… | Must | Active | D37 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-016 | Colocar o importado mais recentemente acima | Should | Active | D37 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-017 | Permitir ligar e desligar cada componente de um livro, partindo do estado padrão… | Should | Active | P2e, P14a, D20, D37 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-018 | Oferecer regras opcionais e o pacote da casa embarcado, desligados por padrão | Should | Active | P14a, P14b, P27, D3, D23, D24 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-019 | Permitir trocar a versão só para aquele personagem, no cartão do item | Should | Active | P2c, D9 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-020 | Oferecer a comparação lado a lado das versões | Should | Active | P2d, SCR-04 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-021 | Permitir trocar a fonte da tabela só para aquela rolagem | Should | Active | P2f, D21, SCR-08 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-022 | Explicar o motivo no lugar em que ela faria falta, com atalho para ligá-la | Should | Active | P3 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-023 | Mostrar uma frase sobre o livro e um resumo gerado do que ele adiciona e substitui | Should | Active | P15 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-024 | Tornar a lista de livros navegável por quem não os conhece, com agrupamento e busca | Should | Active | P2a | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-025 | Usar o caminho que vale e indicar que há outro | Should | Active | P26 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SRC-026 | Incluí-lo na lista de livros como mais uma fonte | Could | Active | P21, D10, D11 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-001 | Exibir o mapa de etapas com o estado de cada etapa e a etapa atual destacada | Must | Active | P4 | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-002 | Ordenar as etapas pela ordem de dependências da regra, com Ancestry primeiro | Must | Active | P5 | UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-003 | Recalcular o conjunto de etapas da criação | Must | Active | Entrevista de requisitos | UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-004 | Manter bloqueadas todas as etapas exceto Ancestry | Must | Active | P4, D5 | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-005 | Exibi-la no mapa sem permitir abri-la e informar a dependência que falta | Must | Active | Entrevista de requisitos | UC-001 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-006 | Abrir essa etapa | Must | Active | Entrevista de requisitos | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-007 | Abrir a etapa seguinte mesmo que a etapa atual tenha decisões abertas, desde que a… | Must | Active | P4, D5 | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-008 | Abrir a etapa anterior | Must | Active | Entrevista de requisitos | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-009 | Mostrar o regime de decisão, uma pergunta, uma linha de regra com a página e… | Must | Active | P29 | UC-003, UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-010 | Exibir o painel de decisões abertas com a contagem e um atalho para cada pendência | Must | Active | P4 | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-011 | Abrir a etapa no ponto em que a pendência se resolve | Must | Active | Entrevista de requisitos | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-012 | Exibir o resumo vivo com atributos e modificadores, características e o que foi ganho… | Must | Active | P24 | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-013 | Atualizar o resumo vivo | Must | Active | P24 | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-014 | Mostrar o que ela muda na ficha: atributos, características e etapas | Must | Active | P10 | UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-015 | Listar as decisões abertas, com atalho para cada uma, e oferecer a abertura da ficha | Must | Active | Entrevista de requisitos | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-016 | Exibir a ficha com essas decisões indicadas | Must | Active | Entrevista de requisitos | UC-011, UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-017 | Tratar a etapa Roleplaying como opcional, sem gerar decisões abertas | Must | Active | Entrevista de requisitos | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-018 | Exibir a etapa em tela cheia, o mapa como seletor no topo, o resumo como barra… | Must | Active | P32, SCR-16 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-FLOW-019 | Indicar no mapa quais etapas foram substituídas e por qual | Should | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-001 | Oferecer rolar e escolher, qualquer que seja o regime da regra | Must | Active | P7, D1 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-002 | Indicar o regime que a regra prevê, sem restringir as opções | Must | Active | P7 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-003 | Oferecer também o modo Write | Must | Active | SCR-09 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-004 | Oferecer "Enter result" junto de Roll | Must | Active | D30 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-005 | Sortear cada dado da expressão de forma independente e uniforme e combiná-los como a… | Must | Active | lição 1 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-006 | Rolar cada etapa na tabela que a etapa anterior indicar | Must | Active | SCR-08, SCR-10 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-007 | Exibir o valor, os dados, a tabela, o cálculo com cada modificador, o resultado e os… | Must | Active | Entrevista de requisitos | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-008 | Exibir "No text added for this entry" com a faixa e a página | Must | Active | D35, P22, P9a | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-009 | Oferecer um campo para o usuário digitar o nome | Must | Active | D36 | UC-005, UC-007 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-010 | Oferecê-la junto do resultado | Must | Active | P30 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-011 | Contá-la como decisão aberta | Must | Active | P4, P30 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-012 | Mostrar a faixa do dado de cada entrada | Must | Active | SCR-09, SCR-10 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-013 | Exibi-la desabilitada, como "already yours", onde ela reaparecer para escolha | Must | Active | SCR-10 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-014 | Exibi-la como aguardando, com o motivo | Must | Active | Entrevista de requisitos | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-015 | Substituir o resultado e registrar o anterior no log como desfeito | Must | Active | P8 | UC-005, UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-016 | Registrar quantas vezes ela já foi rolada | Must | Active | P8 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-017 | Submetê-la à confirmação de dependentes antes de aplicar | Must | Active | P6 | UC-005, UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-018 | Tratar o novo resultado como substituição do anterior | Must | Active | Entrevista de requisitos | UC-005, UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-019 | Aceitar o valor de cada dado ou etapa da rolagem | Must | Active | D30 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-020 | Recusá-lo e informar a faixa válida | Must | Active | Entrevista de requisitos | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-021 | Recusar o registro e pedir o texto | Must | Active | Entrevista de requisitos | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-022 | Abrir um ajuste manual ligado a esse resultado | Must | Active | SCR-09 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-023 | Rolar só as tabelas da etapa sem decisão e que não estejam aguardando outra tabela | Must | Active | Entrevista de requisitos | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-024 | Registrar a entrada e a sua faixa, sem valor de dado | Must | Active | Entrevista de requisitos | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-025 | Registrá-la como concessão ou decisão da mesa, separada da edição manual | Should | Active | P23, D15 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-DEC-026 | Oferecer a rolagem consequente, com opção de escolher ou informar | Should | Active | P34, P11d | — | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-001 | Exibir as ancestralidades dos livros ativos, cada uma com a linha de mecânica, a… | Must | Active | P1, P9, SCR-03 | UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-002 | Exibir os atributos iniciais, as características, os idiomas e profissões, o benefício… | Must | Active | SCR-03, P22 | UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-003 | Oferecer a subdecisão de Size | Must | Active | Entrevista de requisitos | UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-004 | Oferecer as tabelas Purpose e Form como subdecisões da etapa Ancestry, com rolar e… | Must | Active | P7 | UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-005 | Submeter a troca à confirmação de dependentes | Must | Active | P6 | UC-003, UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-006 | Oferecer busca por nome ou traço e filtro por livro | Should | Active | SCR-03 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-007 | Exibir os quatro atributos com valor, modificador e composição | Must | Active | SCR-05, P11 | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-008 | Pedir ao usuário o atributo a aumentar | Must | Active | Entrevista de requisitos | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-009 | Reduzir em 1 um atributo e aumentar em 1 outro atributo | Must | Active | D24 | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-010 | Impedir e oferecer desfazer o ajuste atual | Must | Active | Entrevista de requisitos | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-011 | Restaurar os dois atributos afetados | Must | Active | Entrevista de requisitos | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-012 | Exibir um cartão para cada tabela de história da ancestralidade, com Roll, Choose e Write | Must | Active | SCR-09 | UC-006 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-013 | Oferecer na etapa Story a escolha da Hated Creature em grade, com as faixas do d20 | Must | Active | SCR-09 | UC-006 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-014 | Oferecer a rolagem desse efeito no próprio cartão, com Roll e "Enter result" | Must | Active | Entrevista de requisitos | UC-006, UC-008 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-015 | Adicioná-la ao personagem com a origem do resultado | Must | Active | P28 | UC-006 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-016 | Oferecer duas vagas de profissão, cada uma com Roll d6 + d20, Choose e "Trade for a… | Must | Active | SCR-10, D36 | UC-007 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-017 | Oferecer falar um idioma novo ou ler um idioma que o personagem já fala | Must | Active | SCR-10 | UC-007 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-018 | Oferecer essa vaga na etapa Professions & languages | Must | Active | D22 | UC-007 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-019 | Exibir o novo nome e permitir marcá-lo como aprovado pelo mestre | Must | Active | SCR-10 | UC-007 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-020 | Mostrar, para cada um, se ele fala, lê e escreve, e a origem | Must | Active | SCR-10, P28 | UC-007 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-021 | Exibi-lo na lista de idiomas com atalho para o ponto em que se resolve | Must | Active | SCR-10 | UC-007 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-022 | Oferecer a rolagem de 3d6 na tabela de riqueza, com "Enter result" | Must | Active | SCR-11 | UC-008 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-023 | Adicionar ao personagem o pacote de equipamento correspondente | Must | Active | SCR-11 | UC-008 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-024 | Oferecê-las como subdecisões | Must | Active | Entrevista de requisitos | UC-008 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-025 | Permitir comprar itens com o dinheiro do personagem | Could | Active | SCR-11 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-026 | Oferecer a rolagem de tipo e item, com "Reroll item", "Reroll type and item" e "Enter… | Must | Active | SCR-08 | UC-009 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-027 | Registrá-la no campo Interesting Things com a origem | Must | Active | P28 | UC-009 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-028 | Colocá-la no inventário com a marca "interesting thing" e referenciá-la no campo… | Should | Active | D26 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-029 | Oferecer o nome do personagem como texto livre | Must | Active | D36 | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-030 | Oferecer dois traços positivos e um negativo, pela tabela de traços ou por texto livre | Must | Active | Entrevista de requisitos | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-STEP-031 | Oferecer um campo de notas de interpretação com a referência de página das perguntas… | Must | Active | P22 | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-001 | Calcular cada valor derivado a partir das decisões, das fontes e dos ajustes do… | Must | Active | D2, P11 | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-002 | Mostrar a composição: base, cada parcela com a sua origem e total | Must | Active | P11, SCR-05 | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-003 | Mostrar a fórmula em linguagem legível | Must | Active | SCR-05 | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-004 | Usar a fórmula declarada pela versão vigente da fonte, inclusive quando ela substitui… | Must | Active | P11a | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-005 | Calcular cada valor na ordem: base da ancestralidade, modificadores permanentes,… | Must | Active | P11b | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-006 | Aplicar os limites declarados nos dados | Must | Active | Entrevista de requisitos | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-007 | Indicar o corte na composição | Must | Active | Entrevista de requisitos | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-008 | Arredondar cada valor conforme a fórmula declarada | Must | Active | Entrevista de requisitos | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-009 | Recalcular os valores dependentes e atualizar o resumo vivo, a etapa e a ficha | Must | Active | Entrevista de requisitos | UC-004 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-010 | Incluí-lo no cálculo com a origem do resultado | Must | Active | P28 | UC-004, UC-006 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-011 | Acumulá-los | Must | Active | Entrevista de requisitos | UC-006 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-012 | Exibi-lo com o seu efeito e não incluí-lo no cálculo da Defense | Must | Active | Entrevista de requisitos | UC-008 | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-013 | Substituir a Defense base pela da armadura e indicar quando a Strength estiver abaixo… | Should | Active | P11b | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CALC-014 | Incluí-lo no cálculo sem registrá-lo no log | Could | Active | P11c | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-001 | Exibir o diálogo de impacto antes de aplicá-la | Must | Active | P6, D6, SCR-07 | UC-002, UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-002 | Aplicá-la sem diálogo | Must | Active | Entrevista de requisitos | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-003 | Mostrar lado a lado o estado atual e o novo | Must | Active | SCR-07 | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-004 | Listar o que será removido, o que será recalculado e o que permanece | Must | Active | SCR-07 | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-005 | Incluir os dependentes transitivos | Must | Active | Entrevista de requisitos | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-006 | Mostrar o valor antigo e o novo | Must | Active | Entrevista de requisitos | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-007 | Agrupar o impacto por livro | Must | Active | Entrevista de requisitos | UC-002, UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-008 | Remover os dependentes, recalcular os derivados e deixar o personagem em estado válido | Must | Active | P6 | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-009 | Manter o personagem exatamente como estava | Must | Active | Entrevista de requisitos | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-010 | Registrar o valor recusado no log como desfeito | Must | Active | SCR-15 | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-011 | Registrá-la no log como desfeita, com o motivo | Must | Active | P8 | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-012 | Devolvê-la como decisão aberta | Must | Active | Entrevista de requisitos | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-013 | Removê-lo junto e listá-lo entre os removidos | Must | Active | Entrevista de requisitos | UC-010, UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-014 | Mantê-lo e listá-lo entre os recalculados | Must | Active | P12 | UC-010, UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-015 | Manter os resultados já obtidos, marcados com a fonte de origem, e usar a nova fonte… | Should | Active | P6b, D21 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-016 | Reabrir a decisão, com a confirmação de dependentes | Should | Active | D32, SCR-15 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CHG-017 | Reverter a última mudança confirmada | Could | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-001 | Adicionar ao log uma entrada com o tipo, a descrição, a fonte e o modo (rolado,… | Must | Active | P8, SCR-15 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-002 | Registrar o valor de cada dado, cada modificador aplicado, o total e o número de… | Must | Active | P8 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-003 | Registrar o texto digitado | Must | Active | Entrevista de requisitos | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-004 | Registrar os valores informados com a marca "entered" | Must | Active | D30 | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-005 | Registrar a mudança no log | Must | Active | P12 | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-006 | Registrar uma entrada "Sources" com a ordem resultante dos livros ligados | Must | Active | P14a, SCR-15 | UC-002 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-007 | Manter a entrada no log, marcada como desfeita, com o motivo | Must | Active | P8 | UC-010 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-008 | Salvar a alteração sem registrá-la no log | Must | Active | D36 | UC-011 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-009 | Impedir a edição e a exclusão de entradas do log | Must | Active | Entrevista de requisitos | UC-014 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-010 | Guardar a data e a hora | Must | Active | Entrevista de requisitos | UC-014 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-011 | Exibir as entradas em ordem cronológica, agrupadas por fase | Must | Active | SCR-15 | UC-014 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-012 | Exibir só as entradas do tipo filtrado | Must | Active | Entrevista de requisitos | UC-014 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-013 | Exibir as entradas desfeitas riscadas, com o motivo | Must | Active | Entrevista de requisitos | UC-014 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-014 | Ocultar as entradas desfeitas | Must | Active | Entrevista de requisitos | UC-014 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-015 | Oferecer acesso ao log no cabeçalho | Must | Active | Entrevista de requisitos | UC-014 | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-016 | Gerar o log sozinho ou junto com a ficha | Should | Active | P8a, SCR-15 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-LOG-017 | Mostrar a data e a hora | Could | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-001 | Exibir no cabeçalho o nome, a ancestralidade e o nível do personagem | Must | Active | SCR-14 | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-002 | Exibir os quatro atributos com os seus modificadores | Must | Active | SCR-14 | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-003 | Exibir as características com a sua composição | Must | Active | P11 | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-004 | Exibir os talentos do personagem com a origem e a página | Must | Active | Entrevista de requisitos | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-005 | Exibir o equipamento e o dinheiro | Must | Active | SCR-14 | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-006 | Exibir os campos fixos, cada entrada com a sua origem | Must | Active | P28, D25, D27, D29 | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-007 | Exibir um texto de estado vazio | Must | Active | Entrevista de requisitos | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-008 | Ocultá-la | Must | Active | Entrevista de requisitos | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-009 | Adicionar a entrada com a origem "Added by player", como ajuste manual | Must | Active | P12, P28 | UC-012, UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-010 | Indicá-las na ficha e exibir as decisões pendentes do mestre como "GM's choice" | Must | Active | SCR-11 | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-011 | Exibir na ficha a mecânica e a referência de página, sem texto descritivo dos livros | Must | Active | P22, D35 | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-012 | Manter travados os valores calculados, alteráveis só pelo construtor ou por ajuste manual | Must | Active | P13, P12 | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-013 | Gerar um layout sem controles, legível em preto e branco, com as decisões abertas… | Must | Active | P8a | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-014 | Exibir a ficha em coluna única, com os ajustes acessíveis | Must | Active | Entrevista de requisitos | UC-012 | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-015 | Gerar um arquivo PDF | Should | Active | P8a, SCR-15 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-016 | Exibir os ataques com talentos e efeitos aplicados e permitir ataques personalizados | Could | Active | D34 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-017 | Exibi-la na ficha e na exportação | Could | Active | D33 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-018 | Incluir os textos do usuário | Could | Active | P9a, SCR-15 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-SHEET-019 | Controlar os recursos de sessão e oferecer os gatilhos de regra como avisos não… | Could | Active | D17, P13c, P34, D31 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-001 | Exibi-la apenas para leitura | Must | Active | SCR-14 | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-002 | Liberar os ajustes manuais | Must | Active | SCR-14, P13 | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-003 | Pedir um nome ou motivo curto | Must | Active | P12 | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-004 | Recusá-lo e pedir o nome | Must | Active | Entrevista de requisitos | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-005 | Somá-lo ao valor calculado | Must | Active | P12 | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-006 | Usar o valor informado no lugar do calculado | Must | Active | P12 | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-007 | Recusá-lo e informar o formato esperado | Must | Active | Entrevista de requisitos | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-008 | Mostrar na composição o valor calculado e o valor substituído | Must | Active | Entrevista de requisitos | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-009 | Manter a substituição e atualizar o valor calculado exibido | Must | Active | Entrevista de requisitos | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-010 | Usar o valor ajustado no cálculo dos derivados | Must | Active | Entrevista de requisitos | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-011 | Indicar isso na composição | Must | Active | P7, P11b | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-012 | Registrar a mudança como ajuste manual | Must | Active | P28 | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-013 | Manter o original visível na composição e no log | Must | Active | P17 | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-014 | Registrá-lo como texto, sem efeito mecânico | Must | Active | Entrevista de requisitos | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-015 | Registrar a remoção como ajuste manual | Must | Active | Entrevista de requisitos | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-ADJ-016 | Restaurar o valor ou a entrada original | Must | Active | Entrevista de requisitos | UC-013 | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-001 | Carregar o conteúdo oficial a partir de pacotes no formato documentado, o mesmo dos… | Must | Active | P21a | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-002 | Trazer o pacote oficial embutido, sem exigir importação | Must | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-003 | O pacote oficial do MVP deve cobrir o nível 0 do core para Human, Dwarf e Clockwork, o… | Must | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-004 | Conter apenas mecânica: IDs e nomes de entidades, números, faixas de dado, efeitos,… | Must | Active | P22, D35, M3 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-005 | Incluir um nome curto que seja o conteúdo inteiro de uma entrada só quando outra regra… | Must | Active | D36, D38 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-006 | Identificar cada entidade por um ID estável, independente do nome exibido e do livro | Must | Active | P18 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-007 | Usar o ID que a versão declara substituir e herdar os campos que ela não sobrescreve | Must | Active | P18, P19 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-008 | Representar fórmulas, efeitos (alvo e operação) e tabelas (dado, faixas, entradas,… | Must | Active | P11a, P14a, P28 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-009 | Gerar a linha de mecânica a partir dos dados | Must | Active | P9 | UC-003 | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-010 | Recusá-lo | Must | Active | D37 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-011 | Recusar o pacote | Must | Active | P22 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-012 | Recusá-lo e listar cada referência que falta, com o local | Must | Active | P20, P21b | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-013 | Aceitar o pacote e usar o caminho alternativo | Must | Active | P26 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-014 | Exibir a página e sugerir o ajuste manual | Must | Active | P11d | UC-005 | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-015 | Recalcular os personagens pela versão atual | Must | Active | P6a | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-016 | Reabri-la como decisão aberta, avisar ao abrir o personagem e registrar no log | Must | Active | P6, P8 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-CONT-017 | Ter documentação com exemplos e modelos para copiar | Should | Active | P21b | — | _TBD_ | _TBD_ | _TBD_ |
| FR-HELP-001 | Oferecer acesso à página "About" em todas as telas | Must | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-HELP-002 | Informar que o projeto não é oficial nem afiliado à Schwalb Entertainment e que os… | Must | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-HELP-003 | Explicar que o texto das regras está nos livros e indicar onde comprá-los | Must | Active | D35 | — | _TBD_ | _TBD_ | _TBD_ |
| FR-HELP-004 | Exibir uma mensagem compreensível e manter intactos os personagens salvos | Must | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-HELP-005 | Exibir uma mensagem compreensível, sem termos internos do sistema, e preservar os… | Must | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| FR-HELP-006 | Abrir o canal de feedback do projeto | Could | Active | Entrevista de requisitos | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-PERF-001 | O maior elemento visível da primeira carga (LCP) aparece em até 2,5 s no desktop com… | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-PERF-002 | Depois de uma decisão, o resumo vivo e a etapa se atualizam em até 100 ms (p95) num… | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-PERF-003 | O diálogo de impacto abre em até 300 ms (p95) depois do pedido de mudança | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-CAP-001 | Com até 100 personagens salvos por usuário, as metas de desempenho continuam atendidas | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-CAP-002 | O formato de pacote e o carregamento comportam o pacote oficial completo (core e todos… | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-REL-001 | Nenhuma decisão confirmada se perde: o salvamento conclui em até 1 s depois da… | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-REL-002 | Sem SLA formal; meta de 99% de disponibilidade mensal | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-REL-003 | Depois da primeira visita, o app funciona sem conexão para criar, consultar e imprimir… | Should | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-SEC-001 | Todo o tráfego usa HTTPS, e nenhum segredo fica no repositório | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-SEC-002 | Arquivos importados são tratados só como dados, nunca executados; arquivos inválidos… | Should | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-PRIV-001 | O app não coleta dados pessoais nem usa analytics, cookies de rastreamento ou serviços… | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-ACC-001 | Construtor, ficha e log seguem a WCAG 2.2 AA, com todas as ações acessíveis por… | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-USE-001 | Nenhum termo interno do sistema aparece na interface, verificado por revisão dos… | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-USE-002 | Um jogador experiente cria um personagem de nível 0 completo em até 10 minutos; uma… | Must | Active | M1, M4 | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-COMP-001 | Funciona nas 2 últimas versões de Chrome, Edge, Firefox e Safari, no desktop, no iOS e… | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-COMP-002 | Funciona de 360 px a 1920 px de largura, sem rolagem horizontal | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-COMP-003 | A ficha de nível 0 impressa cabe em até 2 páginas A4 ou Letter | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-MAINT-001 | Acrescentar conteúdo dos padrões 1 a 3 exige só dados, sem mudança no código do motor;… | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-MAINT-002 | Cada requisito Must de FR-CALC, FR-CHG e FR-DEC tem teste automatizado | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-COST-001 | Hospedagem e operação custam US$ 0 por mês como meta, com teto de US$ 5 por mês | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-L10N-001 | Interface, conteúdo e ficha só em inglês (P25, D12); tradução não é requisito | Must | Active | P25, D12 | — | _TBD_ | _TBD_ | _TBD_ |
| NFR-OBS-001 | Sem telemetria no MVP; erros chegam ao usuário pela FR-HELP-005 | Must | Active | Entrevista de requisitos (NFR) | — | _TBD_ | _TBD_ | _TBD_ |
