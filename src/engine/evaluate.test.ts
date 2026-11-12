import { describe, expect, it } from 'vitest'
import type { Book, CharacterDocument } from '../content'
import { evaluate, resolve } from '.'

// Pacote fictício: três etapas, uma ancestralidade com concessões (como o Human) e uma sem (como o Dwarf).
const book: Book = {
  format: 1,
  id: 'test.book',
  name: 'Test Book',
  abbr: 'TB',
  layer: 'core',
  published: '2001',
  components: [
    {
      id: 'base',
      type: 'adds',
      default: 'on',
      items: [
        { id: 'procedure:test', steps: ['step:origin', 'step:traits', 'step:extras', 'step:flavor'] },
        { id: 'step:origin', name: 'Origin', page: 1, regime: 'choice', slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
        { id: 'step:traits', name: 'Traits', page: 2, requires: ['step:origin'] },
        { id: 'step:extras', name: 'Extras', requires: ['step:origin'] },
        { id: 'step:flavor', name: 'Flavor', optional: true, requires: ['step:origin'] },
        { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'characteristic:stature', name: 'Stature', page: 3 },
        {
          id: 'ancestry:gnome',
          name: 'Gnome',
          page: 5,
          attributes: { 'attribute:might': 8 },
          characteristics: { 'characteristic:stature': { ref: 'grant:stature' } },
          grants: {
            stature: { kind: 'choose-value', step: 'step:origin', target: 'characteristic:stature', options: [0.5, 1] },
            boost: { kind: 'attribute-increase', step: 'step:traits', amount: 1 },
            extra: { kind: 'language-or-profession', step: 'step:extras' },
          },
        },
        { id: 'ancestry:troll', name: 'Troll', page: 6, attributes: { 'attribute:might': 12 }, characteristics: { 'characteristic:stature': 2 } },
      ],
    },
  ],
}
const rules = resolve([book], ['test.book'])

function character(decisions: Record<string, string | number> = {}): CharacterDocument {
  return {
    schema: 1,
    id: 'c1',
    contentVersion: '0.0.0',
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: { order: ['test.book'] },
    decisions: Object.fromEntries(Object.entries(decisions).map(([key, value]) => [key, { mode: 'chosen', value }])),
    text: {},
    log: [],
  }
}
const statuses = (view: ReturnType<typeof evaluate>) => view.steps.map((step) => [step.slug, step.status])

describe('evaluate: slot tree, step states and open decisions', () => {
  it('FR-FLOW-004, FR-FLOW-005: with no decisions only the first step is open; the others are locked by it', () => {
    const view = evaluate(rules, character())
    expect(statuses(view)).toEqual([
      ['origin', 'not-started'],
      ['traits', 'locked'],
      ['extras', 'locked'],
      ['flavor', 'locked'],
    ])
    expect(view.steps[1].lockedBy).toEqual(['step:origin'])
    expect(view.ancestry).toBeNull()
  })

  it('FR-FLOW-002: steps keep the order of the procedure, with name, page and regime', () => {
    const view = evaluate(rules, character())
    expect(view.steps.map((step) => step.id)).toEqual(['step:origin', 'step:traits', 'step:extras', 'step:flavor'])
    expect(view.steps[0]).toMatchObject({ index: 0, name: 'Origin', page: 1, regime: 'choice' })
  })

  it('FR-FLOW-003: choosing an ancestry without grants unlocks the other steps', () => {
    const view = evaluate(rules, character({ ancestry: 'ancestry:troll' }))
    expect(statuses(view)).toEqual([
      ['origin', 'done'],
      ['traits', 'not-started'],
      ['extras', 'not-started'],
      ['flavor', 'optional'],
    ])
    expect(view.ancestry).toBe('ancestry:troll')
    expect(view.openDecisions).toEqual([])
  })

  it('FR-FLOW-007: a granted slot left open (like Size of the Human) does not lock any step', () => {
    const view = evaluate(rules, character({ ancestry: 'ancestry:gnome' }))
    expect(view.steps.filter((step) => step.status === 'locked')).toEqual([])
    expect(view.steps[0]).toMatchObject({ status: 'open', decided: 1, open: 1, total: 2 })
  })

  it('FR-DEC-011: grants open as child slots keyed ancestry=<x>/<grant>, each counted as an open decision', () => {
    const view = evaluate(rules, character({ ancestry: 'ancestry:gnome' }))
    expect(view.slots.map((slot) => [slot.key, slot.kind, slot.stepId, slot.decided])).toEqual([
      ['ancestry', 'choose-entity', 'step:origin', true],
      ['ancestry=gnome/stature', 'choose-value', 'step:origin', false],
      ['ancestry=gnome/boost', 'attribute-increase', 'step:traits', false],
      ['ancestry=gnome/extra', 'language-or-profession', 'step:extras', false],
    ])
    expect(view.openDecisions).toEqual([
      { key: 'ancestry=gnome/stature', kind: 'choose-value', stepId: 'step:origin', source: { id: 'ancestry:gnome', name: 'Gnome' }, target: 'characteristic:stature' },
      { key: 'ancestry=gnome/boost', kind: 'attribute-increase', stepId: 'step:traits', source: { id: 'ancestry:gnome', name: 'Gnome' } },
      { key: 'ancestry=gnome/extra', kind: 'language-or-profession', stepId: 'step:extras', source: { id: 'ancestry:gnome', name: 'Gnome' } },
    ])
  })

  it('FR-FLOW-010: counts decided and open slots per step; the open root slot is an open decision', () => {
    expect(evaluate(rules, character()).openDecisions).toEqual([
      { key: 'ancestry', kind: 'choose-entity', stepId: 'step:origin', source: null },
    ])
    const view = evaluate(rules, character({ ancestry: 'ancestry:gnome', 'ancestry=gnome/stature': 1 }))
    expect(view.steps.map((step) => [step.decided, step.open, step.total])).toEqual([
      [2, 0, 2],
      [0, 1, 1],
      [0, 1, 1],
      [0, 0, 0],
    ])
    expect(view.openDecisions).toHaveLength(2)
  })

  it('FR-CONT-006: a decision without a live slot (an orphan) is ignored', () => {
    const view = evaluate(rules, character({ ancestry: 'ancestry:troll', 'ancestry=gnome/stature': 1 }))
    expect(view.slots.map((slot) => slot.key)).toEqual(['ancestry'])
    const unknown = evaluate(rules, character({ ancestry: 'ancestry:ghost' }))
    expect(unknown.ancestry).toBeNull()
    expect(unknown.steps[1].status).toBe('locked')
  })
})
