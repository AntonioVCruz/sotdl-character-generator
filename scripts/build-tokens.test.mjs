import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildTokens } from './build-tokens.mjs'

const tokens = JSON.parse(readFileSync(new URL('../docs/tokens.json', import.meta.url), 'utf8'))

describe('tokens.json to CSS', () => {
  const { css, media, ts } = buildTokens(tokens)

  it('ADR-006: emits every token as a CSS variable, with references kept as var()', () => {
    expect(css).toContain(`--color-background-page: ${tokens.color.background.page.$value};`)
    expect(css).toContain('--color-action-primary: var(--color-text-default);')
    expect(css).toContain('--space-0-5: 2px;')
    expect(css).toContain('--font-family-mono: "IBM Plex Mono", ui-monospace, "Consolas", monospace;')
  })

  it('ADR-006: emits typography styles as classes, not variables', () => {
    expect(css).toMatch(/\.typography-display \{\n {2}font-family: var\(--font-family-display\);\n {2}font-size: var\(--font-size-3xl\);/)
    expect(css).not.toContain('--typography-')
  })

  it('ADR-006: emits breakpoints as custom media and TS constants, never as CSS variables', () => {
    expect(css).not.toContain('--breakpoint-')
    expect(media).toContain(`@custom-media --bp-md (width >= ${tokens.breakpoint.md.$value});`)
    expect(ts).toContain(`'below-xl': '(width < ${tokens.breakpoint.xl.$value})'`)
  })
})
