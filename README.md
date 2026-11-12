# SotDL Character Generator

Gerador de personagens para *Shadow of the Demon Lord* (Schwalb Entertainment), pensado para jogadores e mestres em geral, inclusive quem ainda não domina as regras. Projeto pessoal e não comercial.

## Estado

**Construção.** O esqueleto técnico está montado (plano de implementação, §2): criar um personagem, recarregar e vê-lo na Home. As funcionalidades entram por fatia, a partir da FEAT-007. O site ainda não foi publicado.

## Como funciona

Uma SPA estática em TypeScript, React e Vite, sem backend (ADR-001). Os personagens ficam no IndexedDB do navegador (ADR-002), e o conteúdo oficial vem dos pacotes em `packs/`, que só têm mecânica. Hospedagem no GitHub Pages (ADR-007).

```
src/        engine, content, app, storage, dice, ui (arquitetura §5.2)
packs/      pacote oficial: índice e um arquivo por livro
e2e/        testes de ponta a ponta (Playwright)
scripts/    geração dos tokens e validação do pacote
docs/       requisitos, arquitetura, UX, plano e notas do scaffolding
content/    conteúdo extraído dos livros, somente local
```

## Rodar localmente

Pré-requisitos: Node 22 e npm. Os comandos funcionam no PowerShell.

```powershell
npm ci
npm run dev          # http://localhost:5173
```

Testes:

```powershell
npm test                     # unitários (Vitest)
npm run test:coverage        # com relatório em coverage/ (sem limite)
npx playwright install       # uma vez: navegadores do E2E
npm run e2e                  # E2E contra o build, com axe
npm run build; npm run lighthouse   # LCP da Home
```

Também: `npm run typecheck`, `npm run lint` (inclui as fronteiras entre módulos) e `npm run packs:check`. A lista completa está no [AGENTS.md](AGENTS.md).

## Documentos

[Requisitos](docs/srs.md) · [Arquitetura](docs/architecture.md) e [ADRs](docs/adr/) · [Plano](docs/implementation-plan.md) · [UX](docs/ux-foundations.md) · [Design system](docs/design.md) · [Notas do scaffolding](docs/scaffold-notes.md)

## Conteúdo dos livros

Este repositório é público e **não contém texto, tabelas ou arte dos livros** de *Shadow of the Demon Lord*. O conteúdo extraído fica na pasta `content/`, que o `.gitignore` mantém fora do Git. Não copie trechos dos livros para nenhuma outra pasta do repositório. Os pacotes em `packs/` têm só a mecânica oficial (identificadores, números, faixas de dado, efeitos e páginas).

*Shadow of the Demon Lord* é marca da Schwalb Entertainment. Este projeto não é afiliado nem endossado pela editora.
