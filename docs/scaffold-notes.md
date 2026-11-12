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
- Fontes pelo `@fontsource`, empacotadas pelo Vite: Spectral 600, Inter 400/500/600 e IBM Plex Mono 500 (nenhum estilo tipográfico usa 700). O `@fontsource-variable/inter` foi descartado porque registra a família como "Inter Variable", e os tokens dizem "Inter".
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
| `packs:check`, ids removidos | compara com o commit anterior (base do PR ou `github.event.before`) | `initial-deployment`: passa a comparar com o último commit publicado (ADR-008, "versão publicada anterior") |
| `packs/index.json` | nome, camada e data repetem os do livro, sem checagem de consistência | FEAT-003 |

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

## Testes (ADR-008)

- **Vitest 5.1**: `src/**/*.test.ts(x)` ao lado do código, mais os testes dos scripts em `scripts/`. Ambiente `node`; testes de componente declaram `// @vitest-environment jsdom` (Testing Library 16 + user-event). Storage com `fake-indexeddb`.
- **Cobertura**: provedor v8, só relatada (`npm run test:coverage` → `coverage/`), sem limite e sem gate no CI.
- **Nome de teste**: começa pelo FR que verifica (NFR-MAINT-002); testes de fundação sem FR citam a ADR ou NFR (ex.: `ADR-009: …`).
- **Playwright 1.65** (`create-playwright@1.17.139 --quiet --lang=TypeScript --browser=chromium --browser=firefox --browser=webkit --no-examples`, sem `--gha`, porque o E2E roda no `ci.yml`). Projetos: Chromium, Firefox, WebKit, Pixel 7 e iPhone 15. O `webServer` faz o build com `BASE_PATH=/sotdl-character-generator/` e serve com `vite preview` (porta 4173), então a CSP está ativa e URL fixa em "/" quebra o teste. Tipos do E2E em `tsconfig.e2e.json`.
- **`e2e/skeleton.spec.ts`**: o fluxo do "pronto quando" (criar, recarregar, ver na Home), a cor de fundo vinda do `tokens.json`, a Home sem pedir pacotes nem o chunk do construtor, os pacotes buscados sob a base de caminho e nenhuma violação de CSP. O axe (`@axe-core/playwright` 4.14, WCAG 2.2 AA, falha em `serious` e `critical`) fica em testes separados, porque injeta script e estilo e geraria violações de CSP.
- **Lighthouse CI 0.16** (`lighthouserc.desktop.cjs`, `lighthouserc.mobile.cjs`): Home do build, 3 execuções, asserção sobre a mediana do LCP (2500 ms no preset desktop e 4000 ms no perfil móvel padrão). Relatórios em `.lighthouseci/`, sem envio externo. Primeira medição local: cerca de 0,21 s no desktop e 0,76 s no celular. Com teto de 100 ms, a asserção falha como esperado.

## Desvios encontrados ao rodar

- **CSP e Zod 4:** o Zod testa `Function('')` para ligar o JIT, o que gera uma violação de `script-src`. `z.config({ jitless: true })` em `src/content/schemas.ts`.
- **CSP e React Aria:** o `usePress` injeta um `<style>` (`touch-action` em `[data-react-aria-pressable]`). Liberado só o hash SHA-256 desse bloco no `style-src`. Se uma versão nova mudar o texto, o E2E acusa.
- **axe e React Aria:** depois de `isPending`, o anunciador (`[data-live-announcer]`) guarda por 7 s um nó `role="img"` com `aria-labelledby` para o botão. Quando o app navega, o botão some e o axe acusa `role-img-alt`. É um nó oculto e transitório de terceiros, por isso fica excluído da análise.
- **Firefox do Playwright no Windows:** duas análises do axe na mesma página derrubam o navegador ("Page crashed"). Cada análise roda num teste próprio.

## CI, configuração e deploy

- **`.github/workflows/ci.yml`**, em push no `main` e em PR, com quatro jobs:
  - `check`: tipos, lint, Vitest com cobertura publicada como artefato, `packs:check` e build;
  - `e2e`: `playwright install --with-deps` e `npm run e2e`;
  - `lighthouse`: build e LCP;
  - `deploy`: depende dos três anteriores.
- Actions na versão maior atual: checkout v7, setup-node v7, upload-artifact v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5. Node 22.
- **`packs:check` no CI:** `PACKS_BASE_REF` é `origin/<base>` em PR e `github.event.before` em push. Sem base (primeiro push de um branch, ou commit sumido depois de force-push), a comparação é pulada com aviso. No local, compara com `HEAD`.
- **Deploy escrito, não executado:** o job `deploy` só roda em push no `main` com `vars.PAGES_ENABLED == 'true'`. A variável não existe; a etapa `initial-deployment` liga o Pages (fonte: GitHub Actions) e cria a variável.
- **Configuração:** a única variável é `BASE_PATH`, lida pelo `vite.config.ts` (`base`) e pelo Playwright e o Lighthouse. Nenhum segredo existe. O modelo é o `.env.example`, só com nomes. O `.env` local (fora do Git) foi gerado com `BASE_PATH=/`; para recriá-lo, copie o `.env.example` e preencha com `/`. O CI usa `/<repositório>/`.
- **Validação do workflow:** o YAML foi lido e conferido localmente (jobs, `needs` e scripts npm existem). O actionlint não rodou, porque exigiria baixar uma imagem Docker. O primeiro push valida o resto.

## Verificação (2026-11-12)

- **Clone novo com `npm ci`:** typecheck, lint, test, packs:check, build, e2e (15 testes em 5 projetos) e lighthouse passaram, sem passo manual. Os tokens gerados não existiam no clone, e os scripts `pre*` os criaram.
- **Testes de que as checagens funcionam:**
  - sem `docs/tokens.json`, o build falha;
  - uma violação de fronteira é rejeitada pelo lint;
  - um id removido de `packs/` é acusado pelo `packs:check`;
  - o teste de falha de gravação falha quando o `abort` sai;
  - a asserção do Lighthouse falha com teto de 100 ms.
- **`npm run dev`** serve a página e `packs/`.
- **`npm run lighthouse`** faz o próprio build: sem isso, mediria o `dist/` deixado pelo E2E, que tem outra base de caminho (`NO_FCP`).
- **Pendente até o `initial-deployment`:** a metade publicada do "pronto quando" (criar, recarregar e ver na Home no endereço do Pages).
