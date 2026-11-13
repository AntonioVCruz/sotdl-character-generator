import { describe, expect, it } from 'vitest'
import type { Book } from '../content'
import { EngineError, resolve } from '.'

// Dois livros fictícios: um core e um suplemento que acrescenta uma ancestralidade.
const core: Book = {
  format: 1,
  id: 'test.core',
  name: 'Test Core',
  abbr: 'TC',
  layer: 'core',
  published: '2001',
  components: [
    {
      id: 'base',
      type: 'adds',
      default: 'on',
      items: [
        { id: 'procedure:test', steps: ['step:origin', 'step:end'] },
        { id: 'step:end', name: 'End' },
        { id: 'step:origin', name: 'Origin', page: 1, slots: { origin: { kind: 'choose-entity', of: 'ancestry' } } },
        { id: 'attribute:might', name: 'Might', page: 2, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'characteristic:vigor', name: 'Vigor', page: 2, formula: { ref: 'attribute:might' } },
        { id: 'ancestry:gnome', name: 'Gnome', page: 3, attributes: { 'attribute:might': 8 } },
      ],
    },
  ],
}
const extra: Book = {
  format: 1,
  id: 'test.extra',
  name: 'Test Extra',
  abbr: 'TX',
  layer: 'supplement',
  published: '2002',
  components: [
    { id: 'more', type: 'adds', default: 'on', items: [{ id: 'ancestry:troll', name: 'Troll', page: 9, attributes: { 'attribute:might': 12 } }] },
    { id: 'variant', type: 'optional-rule', default: 'off', items: [{ id: 'ancestry:ghost', name: 'Ghost', page: 10, attributes: {} }] },
  ],
}

describe('resolve', () => {
  it('FR-SRC-010: keeps the active items in source order, each with book, abbreviation, page and type', () => {
    const rules = resolve([extra, core], ['test.core', 'test.extra'])
    expect(rules.steps.map((step) => step.id)).toEqual(['step:origin', 'step:end'])
    expect(rules.ancestries.map((a) => [a.id, a.provenance])).toEqual([
      ['ancestry:gnome', { book: 'test.core', abbr: 'TC', page: 3, type: 'core' }],
      ['ancestry:troll', { book: 'test.extra', abbr: 'TX', page: 9, type: 'adds' }],
    ])
    expect(rules.attributes.map((a) => a.id)).toEqual(['attribute:might'])
    expect(rules.characteristics.map((c) => c.id)).toEqual(['characteristic:vigor'])
  })

  it('FR-CHAR-003: lists the active books with name and abbreviation in priority order, whatever the load order', () => {
    expect(resolve([extra, core], ['test.core', 'test.extra']).books).toEqual([
      { id: 'test.core', name: 'Test Core', abbr: 'TC' },
      { id: 'test.extra', name: 'Test Extra', abbr: 'TX' },
    ])
    expect(resolve([core, extra], ['test.extra', 'test.core']).books.map((book) => book.id)).toEqual(['test.extra', 'test.core'])
  })

  it('FR-SRC-010: ignores a component that is off by default', () => {
    const rules = resolve([core, extra], ['test.core', 'test.extra'])
    expect(rules.items.has('ancestry:ghost')).toBe(false)
  })

  it('FR-CONT-006: an id defined in two books without revises/replaces is an EngineError naming the id and both books', () => {
    const clash: Book = { ...extra, components: [{ ...extra.components[0], items: [{ ...core.components[0].items[5] }] }] }
    expect(() => resolve([core, clash], ['test.core', 'test.extra'])).toThrow(EngineError)
    expect(() => resolve([core, clash], ['test.core', 'test.extra'])).toThrow(
      'ancestry:gnome is defined in both test.core and test.extra',
    )
  })
})
