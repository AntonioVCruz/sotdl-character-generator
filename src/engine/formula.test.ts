import { describe, expect, it } from 'vitest'
import type { Formula } from '../content'
import { EngineError, evaluateFormula, evaluateFormulas, formatFormula, type FormulaNames } from './formula'

// Pacote fictício: nomes e concessões de entidades inventadas.
const names: FormulaNames = {
  items: new Map<string, object>([
    ['attribute:might', { name: 'Might' }],
    ['attribute:wits', { name: 'Wits' }],
    ['characteristic:vigor', { name: 'Vigor' }],
    ['characteristic:recovery', { name: 'Recovery' }],
    ['ancestry:gnome', { name: 'Gnome', grants: { stature: { kind: 'choose-value', options: [0.5, 1] } } }],
  ]),
}
const scores: Record<string, number | null> = { 'attribute:might': 13, 'attribute:wits': 9, 'grant:stature': null }
const leaf = (ref: string) => scores[ref] ?? null

describe('formulas', () => {
  it('FR-CALC-001: evaluates add, div, round and min/max over references', () => {
    const formulas = new Map<string, Formula>([
      ['characteristic:vigor', { add: [{ ref: 'attribute:might' }, 4] }],
      ['characteristic:recovery', { round: 'down', of: { div: [{ ref: 'characteristic:vigor' }, 4] } }],
      ['characteristic:up', { round: 'up', of: { div: [{ ref: 'characteristic:vigor' }, 4] } }],
      ['characteristic:nearest', { round: 'nearest', of: { div: [7, 2] } }],
      ['characteristic:low', { min: [{ ref: 'attribute:might' }, { ref: 'attribute:wits' }] }],
      ['characteristic:high', { max: [{ ref: 'attribute:might' }, { ref: 'attribute:wits' }] }],
    ])
    const values = evaluateFormulas(formulas, leaf)
    expect(Object.fromEntries([...values].map(([id, result]) => [id, result.value]))).toEqual({
      'characteristic:vigor': 17,
      'characteristic:recovery': 4,
      'characteristic:up': 5,
      'characteristic:nearest': 4,
      'characteristic:low': 9,
      'characteristic:high': 13,
    })
    expect(evaluateFormula({ add: [{ ref: 'self' }, -10] }, (ref) => (ref === 'self' ? 9 : null)).value).toBe(-1)
  })

  it('FR-CALC-001: a grant without a decision leaves the value pending, and pending propagates', () => {
    const formulas = new Map<string, Formula>([
      ['characteristic:stature', { ref: 'grant:stature' }],
      ['characteristic:reach', { add: [{ ref: 'characteristic:stature' }, 1] }],
    ])
    const values = evaluateFormulas(formulas, leaf)
    expect(values.get('characteristic:stature')).toEqual({ value: null, pendingOn: 'grant:stature' })
    expect(values.get('characteristic:reach')).toEqual({ value: null, pendingOn: 'grant:stature' })
  })

  it('ADR-004: a cycle between formulas is an EngineError (invariant; loading already refuses it)', () => {
    const formulas = new Map<string, Formula>([
      ['characteristic:vigor', { ref: 'characteristic:recovery' }],
      ['characteristic:recovery', { add: [{ ref: 'characteristic:vigor' }, 1] }],
    ])
    const nameOf = (id: string) => (names.items.get(id) as { name?: string } | undefined)?.name ?? id
    expect(() => evaluateFormulas(formulas, leaf, nameOf)).toThrow(EngineError)
    expect(() => evaluateFormulas(formulas, leaf, nameOf)).toThrow('cycle: Vigor → Recovery → Vigor')
  })

  it('FR-CALC-008: each formula rounds as it declares (down, up, nearest), and one without round stays fractional', () => {
    const formulas = new Map<string, Formula>([
      ['characteristic:down-low', { round: 'down', of: { div: [9, 4] } }],
      ['characteristic:up-low', { round: 'up', of: { div: [9, 4] } }],
      ['characteristic:nearest-low', { round: 'nearest', of: { div: [9, 4] } }],
      ['characteristic:down-high', { round: 'down', of: { div: [11, 4] } }],
      ['characteristic:up-high', { round: 'up', of: { div: [11, 4] } }],
      ['characteristic:nearest-high', { round: 'nearest', of: { div: [11, 4] } }],
      ['characteristic:half', { div: [1, 2] }],
    ])
    const values = Object.fromEntries([...evaluateFormulas(formulas, leaf)].map(([id, result]) => [id.slice(15), result.value]))
    // 2.25 e 2.75: o `nearest` fica com o `down` num e com o `up` no outro.
    expect(values).toEqual({ 'down-low': 2, 'up-low': 3, 'nearest-low': 2, 'down-high': 2, 'up-high': 3, 'nearest-high': 3, half: 0.5 })
  })

  it('FR-CALC-005: the finishing step runs per id before any reference reads it, and its formulas share the cycle check', () => {
    const formulas = new Map<string, Formula>([
      ['characteristic:vigor', { add: [{ ref: 'attribute:might' }, 4] }],
      ['characteristic:recovery', { add: [{ ref: 'characteristic:vigor' }, 1] }],
    ])
    // Acabamento que corta Vigor em 15: Recovery lê o total acabado.
    const cap = (id: string, value: { value: number | null }) => (id === 'characteristic:vigor' ? { value: Math.min(value.value!, 15) } : value)
    const values = evaluateFormulas(formulas, leaf, undefined, cap)
    expect(values.get('characteristic:vigor')?.value).toBe(15)
    expect(values.get('characteristic:recovery')?.value).toBe(16)

    // Um limite de Vigor que lê Recovery, que lê Vigor: o mesmo resolvedor acusa o ciclo.
    const nameOf = (id: string) => (names.items.get(id) as { name?: string } | undefined)?.name ?? id
    const cyclic = (id: string, value: { value: number | null }, evaluate: (formula: Formula) => { value: number | null }) =>
      id === 'characteristic:vigor' ? evaluate({ ref: 'characteristic:recovery' }) : value
    expect(() => evaluateFormulas(formulas, leaf, nameOf, cyclic)).toThrow('cycle: Vigor → Recovery → Vigor')
  })

  it('FR-CONT-009: formats formulas as readable text', () => {
    expect(formatFormula(names, { add: [{ ref: 'attribute:might' }, 4] })).toBe('Might + 4')
    expect(formatFormula(names, { add: [{ ref: 'attribute:might' }, -2] })).toBe('Might − 2')
    expect(formatFormula(names, { round: 'down', of: { div: [{ ref: 'characteristic:vigor' }, 4] } })).toBe(
      'Vigor / 4, rounded down',
    )
    expect(formatFormula(names, { ref: 'grant:stature' }, 'ancestry:gnome')).toBe('1/2 or 1')
    expect(formatFormula(names, 0.5)).toBe('1/2')
    expect(formatFormula(names, { min: [{ ref: 'attribute:might' }, { ref: 'attribute:wits' }] })).toBe(
      'the lower of Might and Wits',
    )
  })
})
