# ADR-004: Esqueleto calculado e camadas editáveis

**Status:** Aceita
**Data:** 2026-11-11
**Revisão:** 2026-11-16, emenda 2 da FEAT-009 (§1, §3) e D40 com o SRS v1.2 (§1, §3, §4, §5, §6): mudança a montante suspende em vez de desfazer. 2026-11-16: §3, o vínculo do ajuste ligado é do design da FEAT-019, para onde o plano levou a FR-CHG-013. 2026-11-17, emenda da FEAT-011 (§1, §4, §6): ponteiro do log e contador de rolagens. 2026-11-24 (§1, §3): validade da decisão escrita, que não tem entrada, só pela regra (a).
**Requisitos atendidos:** FR-CALC-001 a FR-CALC-014, FR-CHG-001 a FR-CHG-016, FR-CHG-018 a FR-CHG-021, FR-DEC-010, FR-DEC-011, FR-DEC-014, FR-DEC-015, FR-DEC-016, FR-DEC-017, FR-DEC-018, FR-DEC-022, FR-DEC-023, FR-DEC-024, FR-DEC-025, FR-ADJ-005, FR-ADJ-006, FR-ADJ-008, FR-ADJ-009, FR-ADJ-010, FR-ADJ-011, FR-ADJ-012, FR-ADJ-013, FR-ADJ-016, FR-LOG-001, FR-LOG-005, FR-LOG-007, FR-LOG-009, FR-LOG-013, FR-LOG-014, FR-CONT-014, FR-CONT-015, FR-CONT-016, FR-FLOW-001, FR-FLOW-003, FR-FLOW-004, FR-FLOW-005, FR-FLOW-010, FR-FLOW-013, FR-SRC-014, FR-CHAR-005, FR-CHAR-006, FR-CHAR-018, FR-CHAR-019, NFR-PERF-002, NFR-PERF-003, NFR-MAINT-002; UC-004, UC-005, UC-010, UC-013. Princípios: D2, D6, D40, P4, P6, P6a, P6b, P8, P11, P11a–P11d, P12, P16, P23, P28, P30.

## Contexto

Os derivados são sempre calculados (D2) e mostram sua composição (P11). Por cima deles há camadas que não se misturam: ajuste manual (P12), concessão do mestre (P23) e, na ficha de jogo, efeitos temporários (P11c). Uma mudança a montante suspende os dependentes: saem da ficha e do cálculo, continuam guardados no personagem e voltam quando o contexto volta (P6, D40). A confirmação lista o que fica suspenso, o que volta, o que se recalcula e o que fica (SCR-07), e o mesmo vale para mudanças de fonte e de versão do pacote (FR-CONT-015/016). O log é só registro (SRS §2.5). Tudo isso precisa responder em até 100 ms depois de uma decisão e em até 300 ms para o diálogo de impacto (NFR-PERF-002/003), e ser testável sem interface (NFR-MAINT-002).

A pergunta é o que o personagem guarda e como se sabe o que depende de quê.

## Decisão

**1. O personagem guarda só entradas, em camadas nomeadas.** Nada derivado é gravado, com uma exceção nomeada abaixo (marca de registro). O registro de metadados da ADR-002 é uma projeção derivada, gravada fora do documento a cada gravação, só para a lista inicial. Nunca é entrada de cálculo, e pode ficar desatualizada até a próxima gravação.

O que se grava de uma rolagem é o fato da rolagem (faces ou soma informada, modificadores, total, entrada e livro), não um derivado das regras. Os derivados, inclusive página e efeitos da entrada, seguem a versão atual (FEAT-009 D3).

| Camada | Conteúdo | No log? |
|---|---|---|
| `sources` | Livros ligados, ordem e, depois, exceções de componente e de versão (Should). | Sim (FR-LOG-006) |
| `decisions` | Mapa vaga → decisão mais recente da vaga: modo (rolado, escolhido, escrito, informado), entrada, valor de cada dado ou soma informada, modificadores e total da rolagem, texto, nome digitado (D36), livro da tabela, contador de rolagens da vaga, id da entrada de log que a registrou (`logged`) e marca de registro. | Sim |
| `earlier` | Mapa vaga → decisões anteriores da mesma vaga, ainda guardadas, da mais recente para a mais antiga (§3). Só existe para vagas com mais de uma decisão. | Sim (quando decididas) |
| `grants` | Concessões do mestre, vinculadas ou avulsas (P23, Should). | Sim |
| `adjustments` | Ajustes manuais: alvo, tipo (modificador, substituição, entrada de campo), valor, nome e, se houver, a decisão a que está ligado (FR-DEC-022). | Sim |
| `text` | Nome, notas e outros textos livres. | Não (FR-LOG-008) |
| `session` | Recursos e efeitos de jogo (P11c, Could). | Não |
| `log` | Entradas imutáveis, só acréscimo. | — |

**Suspensa é derivada.** Não há camada nem estado de suspensão lido pelo cálculo. Uma decisão guardada (em `decisions` ou em `earlier`) está suspensa quando não é a ativa da sua vaga: o `evaluate` não gera a vaga, a decisão não passa na validade, ou outra decisão da mesma vaga passa e é mais recente (§3). A validade é a da FEAT-009 D3 para tabelas, regras (a) livro e (b) entrada (a decisão escrita, que não tem entrada, passa só pela regra (a)); para as demais vagas, o valor existe nas regras vigentes e pertence à vaga; com a D39, também a elegibilidade (FR-CHG-021, Should). A suspensa não conta como decisão aberta (FR-CHG-012).

**Marca de registro.** Cada decisão guardada pode levar `setAside: true`: o último estado que o log registrou para ela (suspensa). Sem a marca, o último registro é "ativa". A marca não decide nada; serve para saber o que mudou quando o pacote muda, já que a versão antiga do pacote não existe mais para recalcular o estado de antes (FR-CONT-016). Três cuidados:
1. A marca é gravada na mesma escrita que a entrada de log correspondente (suspensão ou restauração); nunca uma sem a outra.
2. Abrir o personagem compara o estado derivado com a marca e só grava quando encontra diferença (pacote novo ou arquivo importado). Sem diferença, abrir não grava.
3. O `evaluate` e a validade nunca leem a marca. Ela serve só para comparar e escrever as entradas de suspensão e de restauração e o aviso da FR-CONT-016.

Depois de cada gravação, a marca coincide com o estado derivado.

**Id da entrada de log (`logged`).** Cada decisão guarda o id da entrada `decision` que a registrou. O comando que cria a decisão grava esse id na mesma escrita, e ele nunca muda; acompanha a decisão quando ela passa a `earlier`. Como a marca, não decide nada: o `evaluate`, a validade e a comparação de abertura nunca o leem. É opcional: as entradas sobre uma decisão sem ele (gravada antes do campo) ficam sem ponteiro (§6).

**Contador de rolagens.** O número de rolagens é o contador da tabela na vaga. Ele atravessa a substituição na própria vaga (Reroll, troca de modo, Choose → Choose) e conta a rolagem recusada (§4). A decisão nova herda o contador da prévia: a ativa, ou, na vaga reaberta, a que ocupa `decisions[chave]`. A rolada soma 1; a escolhida e a informada o levam como está.

**2. Tudo o mais sai de uma função pura: `evaluate(regras vigentes, personagem) → visão do personagem`.** A partir do procedimento (ADR-003), a função percorre a árvore de vagas: cada decisão ativa preenche uma vaga e pode abrir vagas filhas (as concessões da entrada ou entidade escolhida, P30). Daí saem:
- etapas e seus estados, vagas abertas, tabelas aguardando outra, contagem de decisões abertas (P4, FR-FLOW-001 a 005, FR-DEC-011, FR-DEC-014);
- decisões suspensas, com o motivo (vaga não gerada, validade, mais recente na mesma vaga);
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
ancestry=dwarf/age
ancestry=dwarf/background=9-10/language
professions/1=common:7/name
```

Trocar a ancestralidade muda o prefixo de todas as vagas filhas; elas deixam de ser geradas, e suas decisões ficam suspensas, guardadas com a chave. Nada é apagado: se a mesma chave voltar a ser gerada (a ancestralidade volta), as decisões dela são restauradas, com os dependentes e os ajustes ligados (FR-CHG-018). Uma versão revisada que mantém os ids de concessão (Human do core → Human do *Only Human*) preserva as decisões compatíveis. Não há grafo de dependências gravado.

Cada decisão de tabela grava o livro da tabela usada (FEAT-009 D3). Se outro livro passar a valer para a tabela, a decisão deixa de passar na regra (a), fica suspensa e a tabela reabre; se o livro anterior voltar, ela é restaurada (P6b, FR-CHG-015). Numa errata do mesmo livro, o resultado fica enquanto a entrada existir (regra (b)): faces, modificador, total e entrada são os gravados, e página e efeitos seguem a versão vigente. Se mudar o procedimento ou a escolha de que a vaga depende, a vaga deixa de ser gerada e a decisão fica suspensa.

**Mais de uma decisão por vaga.** Os candidatos de uma vaga gerada são `decisions[chave]` seguido de `earlier[chave]`, da mais recente para a mais antiga. A ativa é a primeira que passa na validade; as outras ficam suspensas. Isso dá o desempate do SRS (FR-CHG-018, UC-010 2b): vale a que passa em (a) e (b) (a escrita, que não tem entrada, só em (a)); se mais de uma passar, a mais recente. As regras de escrita mantêm a ordem:
- **Decidir uma vaga reaberta** (nenhum candidato passa): a decisão nova ocupa `decisions[chave]`, e a que estava lá passa à frente de `earlier[chave]`, com a marca. A suspensa fica guardada; não há entrada de log sobre ela, que já foi registrada como suspensa.
- **Substituir na própria vaga** (Reroll, Choose → Choose, troca de modo; D40 (4)): sai só a decisão ativa, que vai ao log como desfeita (FR-DEC-015, FR-LOG-007). A nova ocupa `decisions[chave]`; se a ativa estava em `earlier`, a que ocupava `decisions[chave]` passa à frente de `earlier`. As outras suspensas da vaga não mudam. As decisões que dependiam do valor antigo ficam suspensas.
- **Limpar** (`clear`): sai só a ativa, que vai ao log como desfeita, e a mais recente que sobrar ocupa `decisions[chave]`. Se uma suspensa da mesma vaga passar a ser a ativa, é uma restauração, e o impacto a mostra (§4).

Um ajuste ligado (FR-DEC-022) aponta para a decisão, não só para a vaga, para ser suspenso e restaurado com ela (FR-CHG-013). A forma do vínculo é do design detalhado da FEAT-019, que implementa a FR-CHG-013 e cria o ajuste ligado da FR-DEC-022 (plano, `21c6b87`), sem usar o log nem a posição em `earlier`.

**4. Mudança a montante é uma simulação.** `impact(regras, personagem, mudança)` avalia o personagem antes e depois de aplicar a mudança e compara:
- **suspenso:** decisões ativas antes e não depois, já com os dependentes transitivos (FR-CHG-005) e os ajustes ligados a elas (FR-CHG-013);
- **restaurado:** decisões guardadas que não eram ativas antes e são depois, com os dependentes e os ajustes ligados (FR-CHG-018);
- **recalculado:** valores com total diferente, antigo → novo (FR-CHG-006), inclusive os que têm ajuste livre (FR-CHG-014, FEAT-019);
- **reaberto:** vagas exigidas que voltaram a ficar abertas (FR-CHG-012);
- **fica:** o resto.

Como a marca coincide com o estado derivado depois de cada gravação (§1), "antes" é também o que a marca registra.

O diálogo aparece quando há algo suspenso ou restaurado (FR-CHG-001); sem isso, a mudança se aplica sem diálogo, mesmo que recalcule valores (FR-CHG-002). Na confirmação, o novo documento é gravado sem apagar nenhuma decisão guardada, com a marca atualizada, e o log recebe uma entrada de suspensão por decisão suspensa e uma de restauração por decisão restaurada, com o motivo, na mesma escrita (FR-CHG-008, 011). A substituição na própria vaga acrescenta a entrada de desfeito do valor antigo (§3). Na recusa, nada muda (FR-CHG-009), exceto numa rerrolagem: a recusa grava o valor recusado no log como desfeito (FR-CHG-010) e sobe o contador da decisão ativa (FR-DEC-016), na mesma escrita. Valores, decisões guardadas, marca, ficha e cálculo não mudam. Mudanças de fonte usam o mesmo cálculo, agrupado pela procedência de cada vaga (FR-CHG-007).

Ao abrir um personagem, o app compara o estado derivado com a marca. Com pacote novo ou arquivo importado, as diferenças viram o aviso da FR-CONT-016 (suspensas e restauradas) e as entradas de log, gravadas numa escrita com a marca atualizada (FR-CONT-015, 016). Sem diferença, abrir não grava. A importação grava o arquivo como veio, e a comparação acontece ao abrir (FR-CHAR-019).

**5. Só comandos escrevem.** A camada de aplicação expõe comandos (decidir, rerrolar, trocar modo, limpar, mudar fontes, ajustar, renomear, descartar guardadas). Cada comando produz o novo documento, as novas entradas do log e a marca atualizada e grava tudo numa única transação (ADR-002). Rolar dados é o único passo impuro e acontece dentro do comando (ADR-009); `evaluate` e `impact` nunca rolam nem gravam.

**Descartar guardadas** (FR-CHG-020, Should) é o único caminho que apaga decisões suspensas: tira do documento, depois de confirmação, as decisões que não são ativas (em `decisions` e em `earlier`) e os ajustes ligados a elas, e registra o descarte no log; em cada vaga, a mais recente que sobrar ocupa `decisions[chave]`. As entradas de log das descartadas ficam (FR-LOG-009). Fora dele, só a substituição e o `clear` tiram uma decisão do documento, e só a ativa da vaga (§3).

**6. Log só de acréscimo e só registro.** Entradas não se editam nem se apagam (FR-LOG-009). Desfeito, suspensão, restauração e descarte são entradas novas que apontam para a original pelo `logged` da decisão (§1), nunca por busca no log, com o motivo. Na rerrolagem recusada, a entrada do valor rolado e a de desfeito que aponta para ela nascem na mesma escrita. O estado riscado de cada entrada é derivado na leitura (FR-LOG-007, 013, 014). O log é só registro e auditoria: nunca é entrada do `evaluate`, da validade nem da comparação de abertura, e nenhuma decisão se muda por ele (SRS §2.5, FR-CHG-016).

Esboço ilustrativo do documento do personagem (a Dwarf Background foi decidida com um livro B, depois desligado; a tabela reabriu e foi decidida de novo pelo core):

```json
{
  "schema": 1,
  "id": "…",
  "contentVersion": "0.1.0",
  "sources": { "order": ["sotdl.core"] },
  "decisions": {
    "ancestry": { "mode": "chosen", "value": "ancestry:dwarf" },
    "ancestry=dwarf/hated-creature": { "mode": "chosen", "value": "9-10", "book": "sotdl.core" },
    "ancestry=dwarf/age": { "mode": "rolled", "dice": [3, 5, 2], "modifier": 0, "total": 10, "entry": "8-12", "rolls": 1, "book": "sotdl.core" },
    "ancestry=dwarf/background": { "mode": "chosen", "value": "1", "book": "sotdl.core", "rolls": 1, "logged": 6 }
  },
  "earlier": {
    "ancestry=dwarf/background": [
      { "mode": "rolled", "dice": [7], "modifier": 0, "total": 7, "entry": "7", "rolls": 1, "book": "livro-b", "logged": 4, "setAside": true }
    ]
  },
  "adjustments": [
    { "id": "a1", "target": "characteristic:defense", "kind": "modifier", "value": 1, "name": "Shield wielded" }
  ],
  "text": { "name": "Brokk" },
  "log": ["… entradas 1 a 6; a 4 registrou a rolagem com o livro B, a 5 a suspensão dela, a 6 a escolha pelo core …"]
}
```

## Opções consideradas

- **Entradas em camadas + derivação pura + impacto por diferença (escolhida).** Prós: D2 por construção; um único mecanismo cobre mudança a montante, fontes e versão de pacote; o motor é testável com fixtures. Contras: a chave da vaga precisa ser estável entre versões do pacote; o personagem inteiro é reavaliado a cada mudança.
- **Event sourcing (só o log; o estado sai do replay).** Prós: uma fonte de verdade só. Contras: replay com reordenação, migração de eventos antigos e desfazer transitivo ficam caros; o log precisa guardar eventos que o usuário nunca vê. A tentativa anterior seguiu esse caminho (ledger por nível) e acumulou complexidade. Perdeu pela simplicidade, e a D40 fecha a porta: o log não é relido.
- **Valores gravados + grafo de dependências explícito.** Prós: abrir o diálogo é ler arestas. Contras: contraria a D2; o grafo precisa ser mantido em cada comando e diverge do conteúdo quando o pacote muda. Perdeu pela D2 e pela FR-CONT-015.

**Suspensão (D40):**
- **Derivada, com marca só de registro (escolhida pelo usuário).** Prós: a validade nunca depende de um estado gravado; a marca vai no arquivo exportado, então a importação também detecta o que mudou. Contras: um dado derivado no documento, contido pelos três cuidados do §1.
- **Projeção de metadados com as chaves suspensas.** Prós: documento sem marca. Contras: o arquivo exportado não leva a projeção; um personagem importado não sabe o que mudou.
- **Ler o log para saber o último estado.** Prós: nenhum dado novo. Contras: o log vira entrada de um comando (contra a SRS §2.5) e exige identidade estável entre decisão e entrada.
- **Camada `suspended` gravada como estado de cálculo.** Contras: o `evaluate` passaria a depender de um estado que pode divergir da validade. Perdeu pela D2.

**Mais de uma decisão por vaga:**
- **`decisions` com a mais recente + `earlier` (escolhida).** Prós: só alarga o `schema: 1`, sem migração; o caso comum (uma decisão por vaga) não muda de forma, nem o código das FEAT-007 a 009. Contras: dois lugares para ler os candidatos de uma vaga.
- **`decisions` como lista por vaga.** Prós: um lugar só. Contras: muda a forma de todo documento gravado e todo leitor de `decisions`, por um caso que o MVP não alcança.
- **Uma decisão por vaga, a nova sobrescreve a suspensa** (limite da FEAT-009). Contras: perde a suspensa, contra a FR-CHG-018 e a FR-CHG-019.

**Ponteiro do log:**
- **Id da entrada na decisão (`logged`, escolhida pelo usuário).** Prós: identidade explícita entre decisão e entrada; o log nunca é lido. Contras: um campo a mais no documento; decisões gravadas antes dele ficam sem ponteiro.
- **Busca no log** (a entrada `decision` mais recente da vaga, com o mesmo fato e ainda não desfeita). Prós: nenhum campo novo. Contras: o log vira entrada de um comando, contra a SRS §2.5; a correspondência por conteúdo é frágil com valores repetidos.
- **Sem ponteiro** (cada entrada leva a própria descrição). Prós: entradas independentes. Contras: a original não pode ser riscada (FR-LOG-013), e a descrição se repete.

**Contador de rolagens:**
- **Contador da tabela na vaga (escolhida pelo usuário).** Prós: o log numera as rolagens sem repetição, inclusive as recusadas e as que cruzam a troca de modo (FR-DEC-016, FR-LOG-002). Contras: a recusa de uma rerrolagem também escreve na decisão ativa.
- **Só na decisão rolada.** Prós: a recusa não toca as decisões. Contras: a próxima rolagem repete o número da recusada, e Roll → Choose → Roll recomeça em 1.

## Consequências

- Mudança a montante, troca de fontes e atualização de pacote compartilham código e testes.
- Custo: `evaluate` roda inteiro a cada mudança. No nível 0 são algumas dezenas de vagas, bem abaixo dos 100 ms. `resolve` é memoizado por configuração de fontes. Medir de novo quando a subida de nível (Should) entrar.
- Suspensas acumuladas: as de vagas não geradas não são visitadas pelo `evaluate`; as de `earlier` acrescentam uma conferência de validade por candidato; a comparação com a marca é linear no número de decisões guardadas. O custo que cresce é o tamanho do documento, lido e gravado a cada comando. A FEAT-011 acrescenta à guarda do NFR-PERF-002 e 003 um caso com suspensas acumuladas (vagas não geradas e vagas com várias decisões), com os mesmos limites. Nenhuma NFR muda; o descarte (Should) é o alívio.
- Esquema: `earlier` e `setAside` são campos opcionais novos; o `schema: 1` só alarga, sem migração (ADR-005). O arquivo exportado é o documento, então leva as suspensas e a marca (FR-CHG-019, FR-CHAR-018; ADR-002).
- Ids de concessão e de entrada viram parte do contrato com personagens salvos: renomear um id suspende decisões, e elas só voltam se o id voltar. O CI compara versões do pacote oficial e acusa id removido (ADR-008).
- Decisões, marca e log moram no mesmo documento e são gravados juntos; o log nunca é fonte de cálculo, então não há como divergir no que se calcula.
- Cabem sem mudar o modelo: concessões do mestre (vagas-raiz extras), subida de nível (etapas por nível no procedimento), gatilhos (P34, eventos declarados que abrem vagas), efeitos temporários (entrada opcional de `evaluate`, fora do log) e mudar uma escolha de nível anterior (D32 revista pela D40: no construtor, reabrindo a vaga na etapa do nível dela).
