# CLAUDE.md

## Propósito deste repositório

Planejamento e estruturação, por Spec-Driven Development, de um gerador de personagens para *Shadow of the Demon Lord* (SotDL). O produto deste repositório são **documentos de especificação**, não código.

- Não escrever código de implementação. Exceção: trechos ilustrativos dentro de uma spec (ex.: um esquema de dados), quando ajudarem a decisão.
- O gerador é um projeto pessoal, não comercial, para portfólio. Público: jogadores e mestres em geral, inclusive quem não domina as regras.

## Insumos e hierarquia

Os insumos ficam em `docs/reference/`. Em caso de conflito, vale esta ordem:

1. `design-principles.md`: autoridade para decisões de produto e UX.
2. `wireframe/`: referência de fluxo e telas.
3. `character-sheet.html`: o resultado que o gerador deve produzir. É a ficha final, não a interface do gerador.
4. `lessons-learned.md`: erros da tentativa anterior a evitar.

Regras do jogo: o conteúdo dos livros fica em `content/` (somente local, fora do Git).
- `content/pdfs/`: os livros. São a fonte da verdade.
- `content/extracted/`: extrações em Markdown da tentativa anterior, ainda não verificadas. Podem ser usadas para localizar regras rapidamente, mas qualquer dado que entre numa spec deve ser conferido no PDF correspondente.
O que vier da memória, ou só de `content/extracted/` sem conferência, deve ser marcado como **não verificado**.

Se uma spec contradisser os princípios ou o wireframe, aponte o conflito e pergunte. Não resolva sozinho.

## Metodologia

Usar o Agentic SDLC Kit, na ordem do pipeline, uma etapa por vez e só avançando com aprovação:

1. `requirements-engineering`
2. `software-architecture`
3. `ux-foundations`
4. `implementation-planning`

Esta fase termina em `implementation-planning`. Scaffolding, implementação e o ciclo por feature ficam fora deste momento.

Por etapa:

- **requirements-engineering:** fechar primeiro o corte do MVP (seção abaixo). Tudo fora dele entra como Should ou Could, sem detalhamento.
- **software-architecture:** o modelo de fontes e o esqueleto vs. camada editável são o núcleo do sistema. Tratar ambos explicitamente, com ADRs próprias, e validá-los contra casos reais dos suplementos em `content/`.
- **ux-foundations:** não criar um design do zero. Usar o modo de ingerir os insumos existentes (princípios e wireframe).
- Seguir os formatos e IDs do kit. Não criar um esquema de IDs paralelo.

## Salvaguardas de escopo

A tentativa anterior falhou por escopo inflado e excesso de processo (ver `docs/reference/lessons-learned.md`). Por isso:

- **MVP:** [A DEFINIR na etapa de requisitos. Ponto de partida sugerido: criação no nível 0, um pequeno conjunto de ancestralidades, rolagens, ficha final e edição final.] Evolução de níveis, gerenciamento em sessão (efeitos ativos, conjuração, descanso) e cobertura de todos os suplementos ficam fora do MVP.
- Ao enumerar requisitos, não expandir áreas fora do MVP. Registrar o que ficou de fora numa seção "Fora do escopo" e seguir em frente.
- Produzir **apenas documentos de decisão**: requisitos, arquitetura, ADRs, UX e plano. Nada de relatórios de entrega, status, fechamento, matrizes de aceite ou registros do trabalho realizado.
- Preferir documentos curtos. Se um documento precisar de um resumo para ser entendido, ele está longo demais.
- O plano deve prever um esqueleto funcional de ponta a ponta antes de qualquer ampliação de conteúdo.

## Pontos críticos do domínio

- **Fontes:** o escopo de conteúdo inclui o livro básico e todos os suplementos. Alguns suplementos expandem opções do core; outros as substituem ou revisam (ancestralidades, tabelas de coisas interessantes, Forbidden Rules). Cada elemento tem uma fonte padrão, e o usuário pode trocá-la. Definir o que acontece com escolhas já feitas quando a fonte muda e como a interface mostra a origem de cada regra.
- **Esqueleto vs. camada editável:** ao final, o usuário pode editar valores e adicionar ou remover elementos, desde que não quebre o esqueleto gerado. Definir o que é estrutural e travado e como a interface comunica essa diferença.
- **Escolha vs. rolagem:** a criação mistura decisões e rolagens em tabelas. Respeitar a distribuição publicada (3d6 são três dados, não um número uniforme de 3 a 18) e distinguir rolagem em tabela oficial de sorteio entre opções válidas.
- **Demonstrabilidade:** o repositório é público e não pode conter conteúdo dos livros. A especificação deve responder cedo: o que um visitante sem os livros consegue fazer no app?

## Propriedade intelectual

- Este repositório é **público**. Nunca copiar texto, tabelas ou arte dos livros para fora de `content/`.
- Nos documentos, referenciar livro e página em vez de transcrever regras. Nomes de elementos (ancestralidades, caminhos, magias) podem ser citados.
- PDFs nunca são versionados (`*.pdf` está no `.gitignore`).

## Repositório anterior

`AntonioVCruz/sotdl-character-forge` é a tentativa anterior. Não usá-lo como base para requisitos nem UX. Ele só entra na etapa de `software-architecture`, analisado contra as specs aprovadas, para decidir peça por peça o que portar. Portar, não herdar: cada peça aproveitada entra por decisão explícita, registrada numa ADR.

## Convenções

- Documentos em português. Termos mecânicos oficiais do jogo em inglês (Strength, Agility, Health, Defense, novice path etc.), como nos livros.
- Decisões em aberto: apresentar as alternativas com prós e contras e deixar a decisão comigo.
- Commits pequenos, um por documento ou decisão relevante.
