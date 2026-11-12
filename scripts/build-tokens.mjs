// Gera o CSS e as constantes de breakpoint a partir de docs/tokens.json (W3C DTCG).
// Saídas em src/ui/styles/, fora do Git; rodado pelos scripts pre* do package.json.
//   tokens.generated.css      variáveis CSS (--color-*, --space-* …) e classes .typography-*
//   media.generated.css       @custom-media dos breakpoints, injetado pelo PostCSS em todo CSS
//   breakpoints.generated.ts  os mesmos breakpoints para matchMedia
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'src/ui/styles')
const header = '/* Gerado por scripts/build-tokens.mjs a partir de docs/tokens.json. Não editar. */\n'

const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'system-ui', 'ui-monospace', '-apple-system'])
const TYPOGRAPHY_PROPS = {
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
}

/** Percorre os grupos e devolve os tokens folha com caminho e tipo herdado. */
export function flatten(node, path = [], inheritedType) {
  const type = node.$type ?? inheritedType
  if ('$value' in node) return [{ path, type, value: node.$value }]
  return Object.entries(node)
    .filter(([key]) => !key.startsWith('$'))
    .flatMap(([key, child]) => flatten(child, [...path, key], type))
}

const varName = (path) => `--${path.join('-')}`
const reference = (value) => /^\{([^}]+)\}$/.exec(value)?.[1]

/** Valor CSS de um token; referências {a.b} viram var(--a-b). */
export function cssValue(token) {
  const { type, value } = token
  if (typeof value === 'string' && reference(value)) return `var(${varName(reference(value).split('.'))})`
  if (type === 'fontFamily') {
    return value.map((family) => (GENERIC_FAMILIES.has(family) ? family : `"${family}"`)).join(', ')
  }
  if (type === 'shadow') {
    const { offsetX, offsetY, blur, spread, color } = value
    return `${offsetX} ${offsetY} ${blur} ${spread} ${color}`
  }
  return String(value)
}

export function buildTokens(tokens) {
  const all = flatten(tokens)
  const variables = all.filter((t) => t.type !== 'typography' && t.path[0] !== 'breakpoint')
  const typography = all.filter((t) => t.type === 'typography')
  const breakpoints = all.filter((t) => t.path[0] === 'breakpoint')

  const css =
    header +
    ':root {\n' +
    variables.map((t) => `  ${varName(t.path)}: ${cssValue(t)};`).join('\n') +
    '\n}\n\n' +
    typography
      .map((t) => {
        const body = Object.entries(t.value)
          .map(([prop, value]) => `  ${TYPOGRAPHY_PROPS[prop]}: ${cssValue({ type: undefined, value })};`)
          .join('\n')
        return `.typography-${t.path.slice(1).join('-')} {\n${body}\n}`
      })
      .join('\n\n') +
    '\n'

  const media =
    header +
    breakpoints
      .map((t) => {
        const name = t.path.slice(1).join('-')
        return `@custom-media --bp-${name} (width >= ${t.value});\n@custom-media --bp-below-${name} (width < ${t.value});`
      })
      .join('\n') +
    '\n'

  const ts =
    header +
    'export const mediaQuery = {\n' +
    breakpoints
      .map((t) => {
        const name = t.path.slice(1).join('-')
        return `  '${name}': '(width >= ${t.value})',\n  'below-${name}': '(width < ${t.value})',`
      })
      .join('\n') +
    '\n} as const\n'

  return { css, media, ts }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tokens = JSON.parse(readFileSync(resolve(root, 'docs/tokens.json'), 'utf8'))
  const { css, media, ts } = buildTokens(tokens)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'tokens.generated.css'), css)
  writeFileSync(resolve(outDir, 'media.generated.css'), media)
  writeFileSync(resolve(outDir, 'breakpoints.generated.ts'), ts)
  console.log('tokens: src/ui/styles/{tokens,media}.generated.css, breakpoints.generated.ts')
}
