# ADR-005: Pacotes e arquivos de personagem em JSON com JSON Schema publicado

**Status:** Aceita
**Data:** 2026-11-11
**Requisitos atendidos:** FR-CONT-001, FR-CONT-002, FR-CONT-004, FR-CONT-005, FR-CONT-008, FR-CONT-010, FR-CONT-011, FR-CONT-012, FR-CONT-017, FR-CHAR-018, FR-CHAR-019, FR-CHAR-023, NFR-SEC-002, NFR-CAP-002. Princípios: P21, P21a, P21b, P22.

## Contexto

O conteúdo oficial e o da casa usam o mesmo formato documentado (P21a), e a importação é a interface de quem escreve conteúdo, sem editor (D10, P21b). O formato precisa representar fórmulas, efeitos, tabelas e condições como dados (FR-CONT-008), aguentar o conteúdo completo (NFR-CAP-002) e nunca ser executado (NFR-SEC-002). O arquivo do personagem (FR-CHAR-018/019, no MVP desde a v1.1 do SRS) segue a mesma linha. Decidido pelo usuário: JSON com JSON Schema publicado.

## Decisão

- **JSON** para pacotes de conteúdo, pacotes de texto (Could) e arquivo do personagem (o documento da ADR-004 com camadas e log, mais a lista de livros e versões usados).
- **Fonte única de tipos e validação:** os schemas são escritos em TypeScript com Zod 4; o JSON Schema (draft 2020-12) é gerado deles (`z.toJSONSchema`) e publicado no site e no repositório. O mesmo schema valida em tempo de execução, autocompleta no editor (`"$schema"` no arquivo) e documenta o formato.
- **Validação em camadas:** schema → regras do formato (data de publicação, página obrigatória em fonte com páginas, ids sem colisão, ciclo de fórmula) → integridade referencial (ADR-003). Erros saem com caminho no arquivo e texto legível (P21b).
- **Pacote oficial só com mecânica (P22):** o schema do pacote oficial não tem campos de texto livre além de nomes de entidade e de nomes curtos referenciados (D36, D38). Texto descritivo só existe no tipo "pacote de textos", que o pacote oficial não usa. O CI barra o pacote oficial que tenha campo de texto (M3).
- **Pacote oficial no repositório** em `packs/`, um arquivo por livro mais um índice com nome, camada e data de cada livro. O build copia os arquivos para o site; o app carrega o índice na abertura e cada livro quando um personagem o usa.
- **Versão do formato** (`format`) em todo arquivo, com migração na leitura.

## Opções consideradas

- **JSON + JSON Schema gerado do Zod (escolhida).** Prós: um formato só; nenhum parser extra; autocompletar e validar no VS Code; tipos, validação e documentação da mesma fonte. Contras: verboso e sem comentários; quem escreve pacote depende do editor para conforto.
- **YAML para escrever, JSON para rodar.** Prós: tabelas à mão mais legíveis, com comentários. Contras: passo de conversão, parser a mais e ambiguidades conhecidas do YAML. Perdeu na escolha do usuário.
- **JSON Schema escrito à mão + tipos gerados.** Prós: o schema publicado é o original. Contras: duas linguagens de tipo para manter. Perdeu para a fonte única; a TypeBox é alternativa equivalente se a geração do Zod falhar em algum caso.

## Consequências

- O formato documentado (FR-CONT-017, Should) parte do JSON Schema gerado, com exemplos tirados do próprio pacote oficial (P21a).
- Importar um arquivo nunca executa nada: JSON é lido, validado e recusado com mensagem se inválido (NFR-SEC-002). Fórmulas são árvores JSON (ADR-004).
- A pasta `packs/` é pública e só tem mecânica; `content/` continua local e fora do Git.
