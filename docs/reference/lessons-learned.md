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
