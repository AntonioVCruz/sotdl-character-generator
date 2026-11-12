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

## Tokens e casca

- `npm run tokens` (`scripts/build-tokens.mjs`) lê `docs/tokens.json` e gera, em `src/ui/styles/` (fora do Git):
  - `tokens.generated.css`: variáveis CSS (`--color-*`, `--space-*`…), com referências como `var()`, e os estilos `typography.*` como classes `.typography-*`;
  - `media.generated.css`: os breakpoints como `@custom-media --bp-md`, `--bp-below-md`, `--bp-xl` e `--bp-below-xl`, injetados em todo CSS pelo `@csstools/postcss-global-data` e expandidos pelo `postcss-custom-media` (`postcss.config.js`);
  - `breakpoints.generated.ts`: as mesmas consultas para `matchMedia`.
- Os scripts `predev`, `prebuild`, `pretypecheck`, `prelint`, `pretest` e `pretest:coverage` rodam o gerador. Sem `tokens.json`, nada compila.
- Fontes pelo `@fontsource`, empacotadas pelo Vite: Spectral 600, Inter 400/500/600/700 e IBM Plex Mono 500. O `@fontsource-variable/inter` foi descartado porque registra a família como "Inter Variable", e os tokens dizem "Inter".
- Casca: `app-header` (marca e About), Home, `#/about` provisório, construtor com três zonas carregado sob demanda (`React.lazy`), anel de foco, `@media print` base, error boundary na raiz e por rota.

## Esqueleto (plano §2)

Caminho: Home → **New character** → `app.createCharacter` → `content.loadBookIndex` (busca `<BASE_URL>packs/index.json` e valida com o schema Zod) → documento v1 → `storage.save` (documento e metadados numa transação do IndexedDB; `persist()` no primeiro salvamento) → `#/characters/<id>` → `app.openCharacter` → `content.loadBook` → `engine.resolve`/`evaluate` → mapa de etapas. Ao recarregar, a Home lista pelos metadados, sem ler documentos nem pacotes.

Stubs (substituídos pela FEAT indicada no código):

| Onde | O que faz hoje | Quem substitui |
| :-- | :-- | :-- |
| `engine.resolve` | procedimento do primeiro livro da ordem que declara etapas | FEAT-007 |
| `engine.evaluate` | toda etapa "Not started" | FEAT-007 |
| `dice` | só a fonte `globalThis.crypto`; sem sorteio de faces | FEAT-009 |
| Home | lista nome e nível; sem cartões, estado, ordem, exclusão nem aviso | FEAT-001 |
| About | texto provisório | FEAT-022 |
| Documento v1 | `decisions` e `log` vazios, sem forma | FEAT-007, FEAT-020 |
| `CONTENT_VERSION` | `0.0.0` | versionamento dos pacotes (design detalhado) |

Fora do esqueleto, por decisão: aviso entre abas por `BroadcastChannel` (FEAT-031) e logger estruturado. A NFR-OBS-001 e a arquitetura §8 dizem "nenhuma telemetria"; fica só o error boundary.

## Pacote do core (`packs/`)

Formato mínimo: livro (`format`, `id`, `name`, `layer`, `published`) e etapa (`id`, `name`, `page`), com objetos estritos. Conferido no PDF do core (página impressa = página do PDF − 1):

| Etapa | Página | Âncora no livro |
| :-- | :-- | :-- |
| Ancestry | 9 | "Ancestries" |
| Attributes | 10 | "Attributes", ajuste de scores |
| Story | 11 | "Ancestry Tables" |
| Professions & languages | 23 | "Professions", "Starting Professions", "Languages" |
| Wealth & equipment | 25 | "Starting Equipment", "Wealth" |
| Interesting thing | 26 | "Interesting Things" |
| Roleplaying | 27 | "Roleplaying" |

Sem conferência no PDF:
- **Review:** etapa do próprio gerador, sem página no livro. Por isso `page` é opcional na etapa.
- **`published: "2015"`:** a página de créditos só dá o ano (© 2015); o PDF é a "revised edition", sem data completa. Por isso o schema aceita `YYYY`, `YYYY-MM` ou `YYYY-MM-DD`. A precisão da data fica para o design detalhado.

Os testes usam só pacotes fictícios (`test.*`).
