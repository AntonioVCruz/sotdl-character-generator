# ADR-001: Aplicação estática no navegador, sem backend

**Status:** Aceita
**Data:** 2026-11-11
**Requisitos atendidos:** NFR-COST-001, NFR-PRIV-001, NFR-PERF-001, NFR-PERF-002, NFR-PERF-003, NFR-REL-002, NFR-REL-003, NFR-SEC-001, NFR-OBS-001, FR-CONT-002.

## Contexto

Projeto pessoal com meta de custo zero (NFR-COST-001), sem dados pessoais nem telemetria (NFR-PRIV-001, NFR-OBS-001), sem contas no MVP (SRS 1.2.1, item 1) e com respostas locais rápidas (NFR-PERF-002/003). O pacote oficial vem embutido (FR-CONT-002). Os princípios falam em escopo "por usuário" (P2, P9) e em compartilhar pacotes (P21), o que no futuro pode pedir contas e sincronização. A decisão do MVP não pode impedir isso.

## Decisão

O app é uma SPA estática. Motor, conteúdo e persistência rodam no navegador; o servidor só entrega arquivos. O acesso a personagens passa por uma interface de repositório (ADR-002), e o motor não sabe onde os dados moram. Contas e sincronização, se vierem, entram como um contêiner novo atrás dessa interface, sem mexer no motor.

## Opções consideradas

- **SPA estática (escolhida).** Prós: custo zero; nada a operar; sem dados pessoais no servidor; funciona offline com service worker (NFR-REL-003, Should); recalcular é local. Contras: personagens presos ao navegador, salvo pela exportação do arquivo (FR-CHAR-018/019); sujeitos às regras de limpeza de armazenamento do navegador (ver ADR-002).
- **SPA + backend serverless com contas.** Prós: personagens em qualquer dispositivo; escopo "por usuário" real. Contras: autenticação, dados pessoais (contraria a NFR-PRIV-001 do MVP), operação e risco de sair da faixa gratuita. Perdeu por custo e escopo; fica como evolução.
- **Renderização no servidor.** Prós: primeira carga rápida. Contras: exige servidor ligado; o app é interativo e não depende de SEO. Perdeu pela NFR-COST-001.

## Consequências

- Nenhum segredo, nenhuma API, nenhum dado de usuário fora do navegador.
- "Por usuário" (P2, P9) significa "por navegador" no MVP; a FR-CHAR-016 avisa o usuário.
- A tela inicial carrega sem o pacote de conteúdo, para não pesar no LCP (NFR-PERF-001); os livros carregam quando um personagem é aberto.
- Rever se contas, compartilhamento de pacotes (P21) ou acesso multi-dispositivo virarem prioridade.
