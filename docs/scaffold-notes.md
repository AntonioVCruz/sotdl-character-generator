# Notas do scaffolding

> Registro do projeto, escrito durante o `project-scaffolding` (2026-11-12). Fatos duráveis; nada de andamento.

## Ambiente

Windows 11, PowerShell. Node 22.15.0, npm 11.19.1, git 2.49. Docker não é usado: o armazenamento é o IndexedDB do navegador (ADR-002), sem serviço local.

## Gerador

| Unidade | Gerador | Flags | Por quê |
| :-- | :-- | :-- | :-- |
| SPA (raiz) | `create-vite@9.3.4` | `--template react-ts --eslint --no-interactive --no-immediate` | ADR-006. `--eslint` porque o padrão do create-vite 9 é o Oxlint (decisão 2 abaixo). Gerado numa pasta temporária e copiado para a raiz, que já tinha `docs/`, `.gitignore` e README. |

Versões geradas: Vite 8.3, React 19.3, TypeScript 6.0 (o template fixa `~6.0.3`), ESLint 10, `@vitejs/plugin-react` 6.

Removido do template: `App.tsx`, `App.css`, `index.css`, `src/assets/`, `public/favicon.svg`, `public/icons.svg` e o README (demonstração e identidade do Vite). Acrescentado: `"strict": true` nos dois tsconfig (ADR-006 pede modo estrito; o template não liga).

## Decisões desta etapa

Candidatas a emenda da arquitetura (as ADRs não decidiam):
1. **npm** como gerenciador de pacotes: já instalado, uma unidade só.
2. **ESLint** em vez do Oxlint: as fronteiras de módulo usam o `eslint-plugin-boundaries`.
3. **Script próprio de tokens** (`scripts/build-tokens.mjs`) em vez do Style Dictionary: classes de tipografia e breakpoints pedem formato próprio.

Delegada ao scaffolding pela ADR-002 (não é emenda): **`idb`** como wrapper do IndexedDB.

## Estrutura e fronteiras

- Módulos em `src/<módulo>/` (§5.2). O ponto de entrada do template foi movido para `src/ui/main.tsx`, porque só renderiza React; não existe arquivo fora de um módulo (`boundaries/no-unknown-files`).
- `eslint-plugin-boundaries` 7.4 com `eslint-import-resolver-typescript`, `default: disallow` e `checkAllOrigins`. A dependência `engine → content` só vale com `dependency.kind: "type"`. React só no `ui`; `idb` só no `storage`. `engine`, `content` e `dice` ainda têm `no-restricted-globals` para `window`, `document`, `navigator`, `indexedDB`, `localStorage`, `sessionStorage` e o `crypto` sem `globalThis`.
- Prova de que as regras falham: violações temporárias (React e import de valor no `engine`, `ui → content` e `ui → storage`, `window.crypto` no `dice`, arquivo fora de módulo) foram todas rejeitadas, e o `import type` do `engine` passou.
