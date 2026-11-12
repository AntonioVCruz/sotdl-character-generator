import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const packsDir = resolve(import.meta.dirname, 'packs')

// ADR-007: o Pages não permite cabeçalhos, então a CSP vai por <meta>. Só no build:
// o servidor de desenvolvimento do Vite injeta script inline, que a política bloquearia.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'sotdl:csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  }
}

// ADR-005: packs/ vai para o site em <base>/packs/, servido no dev e emitido no build.
function officialPacks(): Plugin {
  const files = () => readdirSync(packsDir).filter((f) => f.endsWith('.json'))
  return {
    name: 'sotdl:packs',
    configureServer(server) {
      server.middlewares.use(`${server.config.base}packs/`, (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0].replace(/^\//, ''))
        if (!files().includes(name)) return next()
        res.setHeader('Content-Type', 'application/json')
        res.end(readFileSync(resolve(packsDir, name)))
      })
    },
    generateBundle() {
      for (const name of files()) {
        this.emitFile({ type: 'asset', fileName: `packs/${name}`, source: readFileSync(resolve(packsDir, name)) })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  return {
    // ADR-007: endereço do Pages (/sotdl-character-generator/) ou "/" no local; ver .env.example.
    base: env.BASE_PATH || '/',
    publicDir: false,
    plugins: [react(), contentSecurityPolicy(), officialPacks()],
    test: {
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{js,mjs,ts}'],
      environment: 'node',
      coverage: {
        // ADR-008: cobertura só relatada, sem limite.
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.generated.ts'],
        reporter: ['text-summary', 'html', 'json-summary'],
      },
    },
  }
})
