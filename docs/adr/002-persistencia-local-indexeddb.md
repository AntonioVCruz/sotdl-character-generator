# ADR-002: Persistência local em IndexedDB atrás de um repositório

**Status:** Aceita
**Data:** 2026-11-11
**Requisitos atendidos:** FR-CHAR-009, FR-CHAR-010, FR-CHAR-014, FR-CHAR-016, FR-CHAR-017, FR-CHAR-018, FR-CHAR-019, NFR-REL-001, NFR-CAP-001, NFR-PRIV-001; UC-001, UC-015.

## Contexto

O personagem salva sozinho a cada mudança (FR-CHAR-009), e nenhuma decisão confirmada pode se perder, mesmo fechando a aba logo depois (NFR-REL-001). São até 100 personagens por navegador (NFR-CAP-001), cada um com decisões e log (ADR-004). Sem backend (ADR-001).

## Decisão

- **IndexedDB**, com um registro por personagem (documento inteiro: camadas e log) e um registro de metadados para a lista inicial (nome, ancestralidade, estado com a contagem de decisões abertas, fontes, data e a versão do conteúdo da última gravação, para detectar a desatualização quando o conteúdo mudar). Acesso por um wrapper fino sobre a API nativa (biblioteca `idb` ou equivalente, escolhida no scaffolding).
- **Gravação imediata a cada comando**, sem debounce, numa transação que grava o documento e as entradas novas do log juntos. Falha de gravação mantém o estado na tela e avisa (FR-CHAR-010).
- **Interface de repositório** (`list`, `get`, `save`, `delete`) entre a aplicação e o IndexedDB, para que um adaptador de servidor possa entrar depois (ADR-001).
- **Versão do documento** (`schema`) com migrações puras e testadas, aplicadas na leitura.
- **Contador de revisão** no documento. A gravação compara com a revisão lida, e um `BroadcastChannel` avisa as outras abas, que recarregam antes de aceitar nova mudança (FR-CHAR-017, Should).
- **Pedido de armazenamento persistente** (`navigator.storage.persist()`) no primeiro salvamento.

## Opções consideradas

- **IndexedDB (escolhida).** Prós: assíncrono, transacional, cota grande, grava objetos estruturados. Contras: API verbosa (mitigada pelo wrapper); sujeito à limpeza do navegador.
- **localStorage.** Prós: API simples. Contras: síncrono (bloqueia a interface), cerca de 5 MB por origem, sem transação entre documento e log. Perdeu pela NFR-CAP-001 e pela NFR-REL-001.
- **OPFS (sistema de arquivos do navegador).** Prós: bom para arquivos grandes. Contras: não há arquivos grandes aqui, e o suporte a escrita síncrona fica restrito a workers. Sem vantagem.

## Consequências

- **Risco mitigado:** o Safari apaga o armazenamento de sites sem interação do usuário por 7 dias, e `persist()` não garante proteção fora de apps na Tela de Início. Por isso exportar e importar o arquivo do personagem entrou no MVP (SRS v1.1: FR-CHAR-018, 019, 023; UC-015). O arquivo é o próprio documento do personagem (ADR-005).
- O aviso da FR-CHAR-016 passa a mencionar que limpar os dados do navegador apaga os personagens.
- Excluir um personagem remove o registro inteiro, log incluído (FR-CHAR-014).
