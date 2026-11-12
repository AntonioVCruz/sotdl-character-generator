import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import boundaries from 'eslint-plugin-boundaries'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Módulos da SPA e dependências permitidas: docs/architecture.md §5.2.
const elements = [
  { type: 'engine', pattern: 'src/engine' },
  { type: 'content', pattern: 'src/content' },
  { type: 'app', pattern: 'src/app' },
  { type: 'storage', pattern: 'src/storage' },
  { type: 'dice', pattern: 'src/dice' },
  { type: 'ui', pattern: 'src/ui' },
]

const internal = (from, to, dependency) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: to } }, ...(dependency && { dependency }) },
})

const noExternal = (from, sources) => ({
  from: { element: { types: from } },
  disallow: { to: { module: { origin: 'external', source: sources } } },
})

const pure = ['engine', 'content', 'dice']
const notReact = ['engine', 'content', 'dice', 'storage', 'app']

// O que não existe num ambiente sem DOM: o motor, o conteúdo e o sorteio rodam em qualquer lugar.
const domGlobals = [
  ...['window', 'document', 'navigator', 'indexedDB', 'localStorage', 'sessionStorage'].map((name) => ({
    name,
    message: 'Sem DOM nem armazenamento neste módulo (architecture.md §5.2).',
  })),
  { name: 'crypto', message: 'Use globalThis.crypto (ADR-009).' },
]

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', '.lighthouseci']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': elements,
      'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.app.json' } },
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          policies: [
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
            ...elements.map(({ type }) => internal(type, [type])),
            internal('ui', ['app', 'engine']),
            internal('app', ['engine', 'content', 'storage', 'dice']),
            internal('engine', ['content'], { kind: 'type' }),
            noExternal(notReact, ['react', 'react-dom', 'react-dom/*', 'react-aria-components']),
            noExternal(['engine', 'content', 'dice', 'app', 'ui'], ['idb']),
          ],
        },
      ],
    },
  },
  {
    files: pure.map((m) => `src/${m}/**/*.ts`),
    rules: { 'no-restricted-globals': ['error', ...domGlobals] },
  },
])
