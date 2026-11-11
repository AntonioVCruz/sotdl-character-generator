# ADR-003: Modelo de fontes, componentes e versões

**Status:** Aceita
**Data:** 2026-11-11
**Requisitos atendidos:** FR-SRC-003, FR-SRC-004, FR-SRC-005, FR-SRC-006, FR-SRC-007, FR-SRC-008, FR-SRC-009, FR-SRC-010, FR-SRC-015, FR-SRC-016, FR-SRC-017, FR-SRC-018, FR-SRC-019, FR-SRC-020, FR-SRC-021, FR-SRC-025, FR-SRC-026, FR-CONT-001, FR-CONT-006, FR-CONT-007, FR-CONT-008, FR-CONT-012, FR-CONT-013, FR-FLOW-003, FR-FLOW-019, NFR-MAINT-001, NFR-CAP-002. Princípios: P1, P2, P2b, P2c, P2e, P2f, P14, P14a, P17–P20, P26; D4, D7, D8, D20, D21, D22, D37.

## Contexto

O conteúdo vem do core e de dezenas de suplementos, que interferem no core em sete padrões (princípios §2.2): adição, substituição de entidade, substituição de tabela, revisão de procedimento, regra opcional, propagação e conteúdo condicional. O MVP usa só os padrões 1 e 2 (Halfling do *Demon Lord's Companion*, Human do *Only Human*), mas a NFR-MAINT-001 exige que os padrões 1 a 3 entrem só com dados, e a NFR-CAP-002 exige que o formato aguente o conteúdo completo. Os princípios já decidem o mecanismo: livro como unidade de ligar e de ordem (D7, D8), componentes com estado padrão (P2e, D20), identidade estável (P18), herança por campo (P19), integridade referencial (P20), condições (P26), ordem padrão por camadas e erratas dentro do livro (D37).

O que falta decidir é a forma: como um item declara que é versão de outro, como a herança funciona, em que ordem a resolução acontece e onde o procedimento de criação mora.

## Decisão

**1. Três níveis: livro, componente, item.**
- *Livro* (um pacote): unidade de ligar e da ordem de prioridade. Declara `layer` (`core`, `supplement`, `house`) e `published` (data obrigatória, FR-CONT-010).
- *Componente*: parte do livro que liga e desliga sozinha, com `default` nos dados (D20). Tipos: `adds`, `replaces`, `table`, `procedure`, `optional-rule`, `errata`. Todo item pertence a um componente; um livro simples tem um componente só.
- *Item*: entidade (ancestralidade, talento, item, idioma, tipo de criatura, tabela, etapa…), com `id` global e `page`.

**2. Identidade e versões.** O `id` é global e independente do livro (`ancestry:human`, `table:dwarf-age`). Versão = par (id, livro). Um livro que define um id que já existe noutro livro precisa dizer como:
- `"revises": "<livro>"`: herda da versão daquele livro e sobrescreve só os campos que declara (P19).
- `"replaces": "<livro>"`: definição completa, sem herança (ex.: tabela com outro dado).
Definir um id existente sem uma das duas marcas é erro de validação. Isso evita colisão acidental e dá ao cartão o selo certo (Core, Adds, Replaces core; FR-SRC-010).

**3. Herança por JSON Merge Patch (RFC 7386).** Objetos se fundem recursivamente; listas e valores simples são substituídos inteiros; `null` remove o campo. A comparação de versões (P2d) mostra exatamente as chaves do patch.

**4. Componentes podem corrigir itens de outros livros.** Um componente pode trazer patches sobre ids de qualquer livro, aplicados quando ele está ligado. É assim que a D22 funciona sem caso especial: o componente `revised-human` herda do core a linha de idiomas e profissões; o componente `development`, quando ligado, aplica um patch que remove essa linha e acrescenta a etapa Development.

**5. Resolução: uma função pura, `resolve(pacotes, fontes do personagem) → regras vigentes`.**
1. Livros ligados, na ordem do personagem. Ordem padrão (D37): casa (importado mais recente acima) › suplementos (`published` mais recente acima; empate por nome) › core, fixo no fim.
2. Dentro de cada livro: componentes ativos (padrão dos dados, com exceção por personagem: Should) e erratas aplicadas como patch sobre as versões do próprio livro, antes da precedência entre livros (FR-SRC-015).
3. Por id, a versão vigente é a do livro mais acima (FR-SRC-009). Exceções por personagem sobrepõem só o ponto exceptuado: versão no cartão (P2c) e fonte da tabela por rolagem (P2f), ambas Should.
4. Condições `when` / `else` (P26) que dependem de livro, componente ou regra ativos são avaliadas aqui. As que dependem do personagem (ex.: ancestralidade) ficam para o `evaluate` (ADR-004).

O resultado traz, para cada item, a versão vigente e a procedência (livro, página, tipo, versões alternativas), que a interface usa nos selos e na comparação.

**6. O procedimento de criação é dado.** As etapas do nível 0 e as vagas de decisão que cada uma abre são itens do core (`procedure:level-0`, `step:*`). Ancestralidades e resultados de tabela concedem vagas ligadas a uma etapa. Uma revisão de procedimento (padrão 4) é um componente que acrescenta ou substitui etapas, com condição (ex.: só para `ancestry:human`). O motor não conhece nenhuma etapa pelo nome; a interface renderiza por tipo de vaga, com renderizadores especializados onde a tela pede (atributos, profissões).

**7. Integridade (P20).** Na carga de um pacote: schema, data de publicação, página obrigatória em fontes com páginas e toda referência não condicional resolvida, com a lista do que falta e onde (FR-CONT-010 a 013). Na ativação de um livro: referências não condicionais a livros desligados são listadas antes de aplicar. Referência condicional a livro ausente não é erro (FR-CONT-013).

Esboço ilustrativo (só mecânica, valores fictícios onde não conferidos):

```json
{
  "format": 1,
  "id": "sotdl.only-human",
  "name": "Only Human",
  "layer": "supplement",
  "published": "AAAA-MM-DD",
  "components": [
    {
      "id": "revised-human", "type": "replaces", "default": "on",
      "items": [
        { "id": "ancestry:human", "revises": "sotdl.core", "page": 0,
          "attributeMethods": ["standard", "random"],
          "randomAttributes": { "each": { "base": 8, "dice": "1d3" } } }
      ]
    },
    {
      "id": "development", "type": "procedure", "default": "off",
      "patches": [ { "id": "ancestry:human", "patch": { "grants": { "core-language-or-profession": null } } } ],
      "items": [
        { "id": "step:development", "replacesSteps": ["step:story", "step:professions", "step:wealth"],
          "when": { "ancestry": "ancestry:human" }, "page": 0 }
      ]
    }
  ]
}
```

## Validação contra casos reais

Conferido nos PDFs em `content/pdfs/` em 2026-11-11.

| Caso | Padrões | Como o modelo representa | MVP |
|---|---|---|---|
| Halfling (*Demon Lord's Companion*) | 1 | Item novo `ancestry:halfling` com tabelas próprias e dois talentos. Aparece na lista ao ligar o livro, sem conflito. | Sim |
| Human revisado (*Only Human*) | 2 | `ancestry:human` com `revises: sotdl.core`: acrescenta a escolha entre atributos padrão e aleatórios (8 + 1d3) e uma opção no nível 4; herda o resto. Sem as tabelas de Development, herda a linha de idiomas e profissões do core (D22). | Sim |
| Clockwork (core) | — | Fórmula de Defense própria (13 fixo) substitui a padrão (P11a). Purpose e Form são tabelas cujos resultados concedem efeitos (+2 em atributo, às vezes à escolha entre dois; Size, Health, Speed, Defense). | Sim |
| Erratas do core (2017) | — | Componente `errata` do core, ligado por padrão, com patches sobre itens do próprio core. | Sim, se alguma errata tocar o MVP |
| Development (*Only Human*) | 3, 4, 7 | Componente `procedure` desligado por padrão. Etapa nova que substitui Story, Professions e Wealth do Human. Tabelas encadeadas: um resultado concede vaga em outra tabela (Age dá N rolagens de Life Experience) e efeitos sobre a rolagem de outra tabela (alvo `roll:table:…`, ex.: bônus no Childhood e no Starting Lifestyle). Entradas condicionais a *Terrible Beauty*, *Demon Lord's Companion*, *Tombs of the Desolation* e *Tooth and Claw*. | Should |
| *Oddities, Artifacts, and Esoterica* | 3, 7 | Versão `replaces` das tabelas de coisa interessante (outro dado de tipo). Por padrão vale a do livro mais acima; a troca por rolagem (P2f) escolhe a outra só naquela vaga. | Should |
| *Battle Scars* | 1, 5 | Itens e magias como `adds`; ferimentos como `optional-rule` desligada, com efeitos que só se aplicam na ficha de jogo. | Could |
| *Insupposable Instruments* | 1, 7 | Itens `adds`; referências condicionais a *Battle Scars* e ao *Demon Lord's Companion*. | Could |

Nenhum caso exigiu código específico de livro. O padrão 6 (propagação) é consequência da identidade: "role na tabela de profissões Common" aponta para o id, e o id resolve para a versão vigente.

## Opções consideradas

- **Livro › componente › item, versões por id global com `revises`/`replaces` e Merge Patch (escolhida).** Prós: cobre os sete padrões com dados; a troca de versão leva junto fórmulas e concessões; validação simples. Contras: listas são substituídas inteiras no patch; o autor precisa dizer de que livro herda.
- **Herdar da versão imediatamente abaixo na ordem atual.** Prós: dispensa nomear a base. Contras: a mesma versão produz entidades diferentes conforme o usuário reordena os livros. Perdeu por imprevisibilidade.
- **Ids prefixados pelo livro (`core:human`, `oh:human`) e tabela de equivalência à parte.** Prós: sem colisão. Contras: a identidade estável do P18 vira uma tabela paralela que precisa ser mantida. Perdeu pelo P18.
- **Procedimento em código, conteúdo só para listas e tabelas.** Prós: menos schema. Contras: cada revisão de procedimento (padrão 4) exige código, o que contraria a visão completa dos princípios. Perdeu pela NFR-MAINT-001 e pelo P14a.

## Consequências

- Padrões 1 a 3, 5 e 7 entram só com dados; o padrão 4 também, desde que use os tipos de vaga existentes. Um tipo de vaga novo exige código no motor e na interface.
- O motor não tem nomes de livros, etapas ou ancestralidades no código. Testes usam pacotes sintéticos (lição 4).
- Listas substituídas inteiras: uma versão que muda uma concessão reescreve a lista toda. Para reduzir isso, listas de concessões e efeitos usam objetos com chave (`grants: { "<id>": … }`) em vez de arrays sempre que a ordem não importa.
- Ids nunca são renomeados nem reaproveitados entre versões de pacote (P18); a ADR-004 depende disso.
- Rever se a autoria de suplementos grandes mostrar que o patch por chave não basta.
