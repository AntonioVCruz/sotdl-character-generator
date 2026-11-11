# ADR-004: Esqueleto calculado e camadas editáveis

**Status:** Aceita
**Data:** 2026-11-11
**Requisitos atendidos:** FR-CALC-001 a FR-CALC-014, FR-CHG-001 a FR-CHG-016, FR-DEC-010, FR-DEC-011, FR-DEC-014, FR-DEC-015, FR-DEC-016, FR-DEC-017, FR-DEC-018, FR-DEC-022, FR-DEC-023, FR-DEC-024, FR-DEC-025, FR-ADJ-005, FR-ADJ-006, FR-ADJ-008, FR-ADJ-009, FR-ADJ-010, FR-ADJ-011, FR-ADJ-012, FR-ADJ-013, FR-ADJ-016, FR-LOG-001, FR-LOG-005, FR-LOG-007, FR-LOG-009, FR-CONT-014, FR-CONT-015, FR-CONT-016, FR-FLOW-001, FR-FLOW-003, FR-FLOW-004, FR-FLOW-005, FR-FLOW-010, FR-FLOW-013, FR-SRC-014, FR-CHAR-005, FR-CHAR-006, NFR-PERF-002, NFR-PERF-003, NFR-MAINT-002; UC-004, UC-005, UC-010, UC-013. Princípios: D2, D6, P4, P6, P6a, P6b, P8, P11, P11a–P11d, P12, P16, P23, P28, P30.

## Contexto

Os derivados são sempre calculados (D2) e mostram sua composição (P11). Por cima deles há camadas que não se misturam: ajuste manual (P12), concessão do mestre (P23) e, na ficha de jogo, efeitos temporários (P11c). Uma mudança a montante desfaz os dependentes, com confirmação que lista o que sai, o que se recalcula e o que fica (P6, SCR-07), e o mesmo vale para mudanças de fonte e de versão do pacote (FR-CONT-015/016). Tudo isso precisa responder em até 100 ms depois de uma decisão e em até 300 ms para o diálogo de impacto (NFR-PERF-002/003), e ser testável sem interface (NFR-MAINT-002).

A pergunta é o que o personagem guarda e como se sabe o que depende de quê.

## Decisão

**1. O personagem guarda só entradas, em camadas nomeadas.** Nada derivado é gravado.

| Camada | Conteúdo | No log? |
|---|---|---|
| `sources` | Livros ligados, ordem e, depois, exceções de componente e de versão (Should). | Sim (FR-LOG-006) |
| `decisions` | Mapa vaga → decisão: modo (rolado, escolhido, escrito, informado), entrada, valor de cada dado, texto, nome digitado (D36), livro da tabela, número de rolagens. | Sim |
| `grants` | Concessões do mestre, vinculadas ou avulsas (P23, Should). | Sim |
| `adjustments` | Ajustes manuais: alvo, tipo (modificador, substituição, entrada de campo), valor, nome e, se houver, a vaga a que está ligado (FR-DEC-022). | Sim |
| `text` | Nome, notas e outros textos livres. | Não (FR-LOG-008) |
| `session` | Recursos e efeitos de jogo (P11c, Could). | Não |
| `log` | Entradas imutáveis, só acréscimo. | — |

**2. Tudo o mais sai de uma função pura: `evaluate(regras vigentes, personagem) → visão do personagem`.** A partir do procedimento (ADR-003), a função percorre a árvore de vagas: cada decisão preenche uma vaga e pode abrir vagas filhas (as concessões da entrada ou entidade escolhida, P30). Daí saem:
- etapas e seus estados, vagas abertas, tabelas aguardando outra, contagem de decisões abertas (P4, FR-FLOW-001 a 005, FR-DEC-011, FR-DEC-014);
- efeitos coletados com a origem (P28), calculados na ordem do P11b: base da ancestralidade → modificadores permanentes → efeitos que definem → efeitos que somam → limites → ajuste manual;
- composição de cada valor, com corte por limite e valor substituído visíveis (FR-CALC-002, 007; FR-ADJ-008, 011);
- campos fixos da ficha como listas de entradas com origem (P28);
- efeitos não modelados, com página e sugestão de ajuste manual (FR-CONT-014, P11d).

Fórmulas são dados: uma árvore JSON (`ref`, `add`, `div`, `round`, `min`, `max`, constantes), nunca texto avaliado. A ordem entre valores sai das referências das fórmulas (Health depende de Strength; Healing Rate de Health), com ciclo rejeitado na validação do pacote. A linha legível da fórmula (FR-CALC-003) é gerada da árvore.

Empilhamento: efeitos que somam no mesmo alvo se acumulam (FR-CALC-011). Conferido no core: bônus e penalidades de fontes diferentes são cumulativos (p. 32), dano extra também (p. 39), e boons e banes se cancelam um a um (p. 33). Um efeito que não se acumula declara isso nos dados (grupo de empilhamento), sem regra global.

O escudo do MVP (FR-CALC-012) é um efeito condicionado a "equipado", estado de jogo que não existe no MVP: aparece com o efeito e não entra na Defense.

**3. A dependência está na chave da vaga.** A chave de uma vaga filha inclui a chave da mãe e o valor escolhido nela, mais o id da concessão vindo do conteúdo. Exemplos ilustrativos (sintaxe final no design detalhado):

```
ancestry
ancestry=dwarf/table:dwarf-age
ancestry=dwarf/table:dwarf-background=9-10/language
professions/1=common:7/name
```

Trocar a ancestralidade muda o prefixo de todas as vagas filhas; elas deixam de ser geradas e suas decisões ficam órfãs. Uma versão revisada que mantém os ids de concessão (Human do core → Human do *Only Human*) preserva as decisões compatíveis. Não há grafo de dependências gravado.

Cada decisão de tabela grava o livro da tabela usada e é lida nessa versão. Se só a fonte da tabela mudar, o resultado fica, marcado com a fonte de origem, e a nova fonte vale para as próximas rolagens (P6b, FR-CHG-015). Se mudar o procedimento ou a escolha de que a vaga depende, a vaga deixa de existir e a decisão é desfeita.

**4. Mudança a montante é uma simulação.** `impact(regras, personagem, mudança)` avalia o personagem antes e depois de aplicar a mudança e compara:
- **removido:** decisões órfãs, já com os dependentes transitivos (FR-CHG-005), e ajustes ligados a elas (FR-CHG-013);
- **recalculado:** valores com total diferente, antigo → novo (FR-CHG-006), inclusive os que têm ajuste livre (FR-CHG-014);
- **reaberto:** vagas exigidas que voltaram a ficar abertas (FR-CHG-012);
- **fica:** o resto.

Sem nada removido, a mudança se aplica sem diálogo (FR-CHG-002). Na confirmação, o novo documento é gravado sem as órfãs e o log recebe uma entrada "desfeito" por decisão removida, com o motivo (FR-CHG-008, 011). Na recusa, nada muda, exceto o valor de rerrolagem recusado, que vai ao log como desfeito (FR-CHG-009, 010). Mudanças de fonte usam o mesmo cálculo, agrupado pela procedência de cada vaga (FR-CHG-007). Ao abrir um personagem com um pacote de versão nova, o mesmo cálculo reabre as decisões que deixaram de existir, avisa e registra no log (FR-CONT-015, 016).

**5. Só comandos escrevem.** A camada de aplicação expõe comandos (decidir, rerrolar, trocar modo, mudar fontes, ajustar, renomear). Cada comando produz o novo documento e as novas entradas do log e grava os dois numa única transação (ADR-002). Rolar dados é o único passo impuro e acontece dentro do comando (ADR-009); `evaluate` e `impact` nunca rolam.

**6. Log só de acréscimo.** Entradas não se editam nem se apagam (FR-LOG-009). "Desfeito" é uma entrada nova que aponta para a original; o estado riscado de cada entrada é derivado na leitura (FR-LOG-007, 013). O log não é lido para calcular nada.

Esboço ilustrativo do documento do personagem:

```json
{
  "schema": 1,
  "id": "…",
  "contentVersion": "0.1.0",
  "sources": { "order": ["sotdl.core"] },
  "decisions": {
    "ancestry": { "mode": "chosen", "value": "ancestry:dwarf" },
    "ancestry=dwarf/hated-creature": { "mode": "chosen", "value": "creature-type:ogre" },
    "ancestry=dwarf/table:dwarf-age": { "mode": "rolled", "dice": [3, 5, 2], "entry": "8-12", "rolls": 1 }
  },
  "adjustments": [
    { "id": "a1", "target": "characteristic:defense", "kind": "modifier", "value": 1, "name": "Shield wielded" }
  ],
  "text": { "name": "Brokk" },
  "log": []
}
```

## Opções consideradas

- **Entradas em camadas + derivação pura + impacto por diferença (escolhida).** Prós: D2 por construção; um único mecanismo cobre mudança a montante, fontes e versão de pacote; o motor é testável com fixtures. Contras: a chave da vaga precisa ser estável entre versões do pacote; o personagem inteiro é reavaliado a cada mudança.
- **Event sourcing (só o log; o estado sai do replay).** Prós: uma fonte de verdade só. Contras: replay com reordenação, migração de eventos antigos e desfazer transitivo ficam caros; o log precisa guardar eventos que o usuário nunca vê. A tentativa anterior seguiu esse caminho (ledger por nível) e acumulou complexidade. Perdeu pela simplicidade.
- **Valores gravados + grafo de dependências explícito.** Prós: abrir o diálogo é ler arestas. Contras: contraria a D2; o grafo precisa ser mantido em cada comando e diverge do conteúdo quando o pacote muda. Perdeu pela D2 e pela FR-CONT-015.

## Consequências

- Mudança a montante, troca de fontes e atualização de pacote compartilham código e testes.
- Custo: `evaluate` roda inteiro a cada mudança. No nível 0 são algumas dezenas de vagas, bem abaixo dos 100 ms. `resolve` é memoizado por configuração de fontes. Medir de novo quando a subida de nível (Should) entrar.
- Ids de concessão e de entrada viram parte do contrato com personagens salvos: renomear um id desfaz decisões. O CI compara versões do pacote oficial e acusa id removido (ADR-008).
- Decisões e log moram no mesmo documento e são gravados juntos; o log nunca é fonte de cálculo, então não há como divergir no que se calcula.
- Cabem sem mudar o modelo: concessões do mestre (vagas-raiz extras), subida de nível (etapas por nível no procedimento), gatilhos (P34, eventos declarados que abrem vagas), efeitos temporários (entrada opcional de `evaluate`, fora do log) e mudar escolha pelo log (D32: a entrada do log aponta para a chave da vaga).
