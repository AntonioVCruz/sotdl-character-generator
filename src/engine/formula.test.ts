import { describe, expect, it } from 'vitest'
import type { Formula } from '../content'
import { EngineError, evaluateFormula, evaluateFormulas, formatFormula, type FormulaNames } from './formula'

// Pacote fictício: nomes e concessões de entidades inventadas.
const names: FormulaNames = {
  items: new Map<string, { name: string; grants?: Record<string, { kind: string; options?: number[] }> }>([
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
    const nameOf = (id: string) => names.items.get(id)?.name ?? id
    expect(() => evaluateFormulas(formulas, leaf, nameOf)).toThrow(EngineError)
    expect(() => evaluateFormulas(formulas, leaf, nameOf)).toThrow('cycle: Vigor → Recovery → Vigor')
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
