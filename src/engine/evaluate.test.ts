import { describe, expect, it } from 'vitest'
import type { Book, CharacterDocument, DecisionValue } from '../content'
import { evaluate, preview, resolve } from '.'

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

// Pacote fictício com o ajuste de scores: uma etapa com a vaga opcional `attribute-shift` e uma ancestralidade que
// concede uma vaga obrigatória nela (como o +1 do Human).
const shiftBook = (slotStep = 'step:scores', slotName = 'adjust'): Book => ({
  ...book,
  components: [
    {
      id: 'base',
      type: 'adds',
      default: 'on',
      items: [
        { id: 'procedure:test', steps: ['step:origin', 'step:scores', 'step:extras'] },
        { id: 'step:origin', name: 'Origin', page: 1, slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
        {
          id: 'step:scores',
          name: 'Scores',
          page: 2,
          requires: ['step:origin'],
          ...(slotStep === 'step:scores' && { slots: { [slotName]: { kind: 'attribute-shift', amount: 1, optional: true } } }),
        },
        {
          id: 'step:extras',
          name: 'Extras',
          requires: ['step:origin', 'step:scores'],
          ...(slotStep === 'step:extras' && { slots: { [slotName]: { kind: 'attribute-shift', amount: 1, optional: true } } }),
        },
        { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'attribute:wits', name: 'Wits', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'characteristic:vigor', name: 'Vigor', page: 3, formula: { add: [{ ref: 'attribute:might' }, 2] } },
        { id: 'characteristic:insight', name: 'Insight', page: 3, formula: { ref: 'attribute:wits' } },
        {
          id: 'ancestry:gnome',
          name: 'Gnome',
          page: 5,
          attributes: { 'attribute:might': 8, 'attribute:wits': 12 },
          grants: { boost: { kind: 'attribute-increase', step: 'step:scores', amount: 1 } },
        },
        { id: 'ancestry:troll', name: 'Troll', page: 6, attributes: { 'attribute:might': 12, 'attribute:wits': 9 } },
      ],
    },
  ],
})
const shiftRules = resolve([shiftBook()], ['test.book'])
const shift = { decrease: 'attribute:might', increase: 'attribute:wits' }
function shifted(decisions: Record<string, DecisionValue> = {}): CharacterDocument {
  const entries = Object.entries(decisions).map(([key, value]) => [key, { mode: 'chosen' as const, value }])
  return { ...character(), decisions: Object.fromEntries(entries) }
}
const scores = (view: ReturnType<typeof evaluate>) => view.summary.attributes.map((a) => [a.name, a.score, a.modifier])

describe('evaluate: score adjustment slot (attribute-shift)', () => {
  it('FR-STEP-009: the pair applies −1 and +1 with the origin of the slot, and an invalid decision is ignored', () => {
    const view = evaluate(shiftRules, shifted({ ancestry: 'ancestry:troll', adjust: shift }))
    const origin = { kind: 'slot', key: 'adjust', stepId: 'step:scores', slotKind: 'attribute-shift' }
    expect(scores(view)).toEqual([
      ['Might', 11, 1],
      ['Wits', 10, 0],
    ])
    expect(view.summary.attributes[0].composition).toEqual([
      { stage: 'base', value: 12, origin: { kind: 'ancestry', id: 'ancestry:troll', name: 'Troll' } },
      { stage: 'modifier', value: -1, origin },
    ])
    expect(view.summary.attributes[1].composition[1]).toEqual({ stage: 'modifier', value: 1, origin })
    expect(view.slots.find((slot) => slot.key === 'adjust')).toMatchObject({
      kind: 'attribute-shift',
      decided: true,
      value: shift,
      options: [
        { id: 'attribute:might', name: 'Might' },
        { id: 'attribute:wits', name: 'Wits' },
      ],
    })

    for (const invalid of [
      { decrease: 'attribute:might', increase: 'attribute:might' },
      { decrease: 'attribute:luck', increase: 'attribute:wits' },
    ]) {
      const ignored = evaluate(shiftRules, shifted({ ancestry: 'ancestry:troll', adjust: invalid }))
      expect(scores(ignored)).toEqual([
        ['Might', 12, 2],
        ['Wits', 9, -1],
      ])
      const slot = ignored.slots.find((candidate) => candidate.key === 'adjust')
      expect(slot).toMatchObject({ decided: false })
      expect(slot).not.toHaveProperty('value')
    }
  })

  it('FR-STEP-009: the optional slot does not lock any step, is not an open decision and is not counted', () => {
    const view = evaluate(shiftRules, shifted({ ancestry: 'ancestry:troll' }))
    expect(view.slots.find((slot) => slot.key === 'adjust')).toMatchObject({ decided: false, optional: true })
    expect(view.openDecisions).toEqual([])
    expect(view.steps[1]).toMatchObject({ status: 'done', decided: 0, open: 0, total: 0 })
    // Extras exige Scores, e a vaga raiz de Scores, opcional e sem decisão, não a bloqueia.
    expect(view.steps[2]).toMatchObject({ status: 'not-started', lockedBy: [] })
    const decided = evaluate(shiftRules, shifted({ ancestry: 'ancestry:troll', adjust: shift }))
    expect(decided.steps[1]).toMatchObject({ status: 'done', decided: 0, open: 0, total: 0 })
  })

  it('FR-STEP-009: another step and another slot name work the same (the engine does not know the step)', () => {
    const rules = resolve([shiftBook('step:extras', 'tweak')], ['test.book'])
    const view = evaluate(rules, shifted({ ancestry: 'ancestry:troll', tweak: shift }))
    expect(scores(view)).toEqual([
      ['Might', 11, 1],
      ['Wits', 10, 0],
    ])
    expect(view.summary.attributes[0].composition[1]).toEqual({
      stage: 'modifier',
      value: -1,
      origin: { kind: 'slot', key: 'tweak', stepId: 'step:extras', slotKind: 'attribute-shift' },
    })
    expect(view.openDecisions).toEqual([])
    expect(view.steps.map((step) => step.status)).toEqual(['done', 'not-started', 'done'])
  })

  it('FR-FLOW-014: preview with a pair lists the attributes and characteristics that change, and saves nothing', () => {
    const document = shifted({ ancestry: 'ancestry:troll' })
    const before = JSON.stringify(document)
    const { changes } = preview(shiftRules, document, 'adjust', shift)
    expect(changes.attributes).toEqual([
      { id: 'attribute:might', name: 'Might', from: 12, to: 11 },
      { id: 'attribute:wits', name: 'Wits', from: 9, to: 10 },
    ])
    expect(changes.characteristics).toEqual([
      { id: 'characteristic:vigor', name: 'Vigor', from: 14, to: 13 },
      { id: 'characteristic:insight', name: 'Insight', from: 9, to: 10 },
    ])
    expect(changes.steps).toEqual([])
    expect(JSON.stringify(document)).toBe(before)
  })

  it('FR-CALC-002: the total of each attribute is the sum of its base and modifier parts', () => {
    const cases = [
      { ancestry: 'ancestry:troll', adjust: shift },
      { ancestry: 'ancestry:gnome', adjust: { decrease: 'attribute:wits', increase: 'attribute:might' } },
    ]
    for (const decisions of cases) {
      const view = evaluate(shiftRules, shifted(decisions))
      for (const attribute of view.summary.attributes) {
        expect(attribute.composition.map((stage) => stage.stage)).toEqual(['base', 'modifier'])
        expect(attribute.score).toBe(attribute.composition.reduce((total, stage) => total + stage.value!, 0))
      }
    }
  })

  it('FR-FLOW-001: a step with only the optional slot is done; with a granted required slot open, open; with no slots, not started', () => {
    expect(statuses(evaluate(shiftRules, shifted({ ancestry: 'ancestry:troll' })))).toEqual([
      ['origin', 'done'],
      ['scores', 'done'],
      ['extras', 'not-started'],
    ])
    const gnome = evaluate(shiftRules, shifted({ ancestry: 'ancestry:gnome' }))
    expect(statuses(gnome)).toEqual([
      ['origin', 'done'],
      ['scores', 'open'],
      ['extras', 'not-started'],
    ])
    expect(gnome.steps[1]).toMatchObject({ decided: 0, open: 1, total: 1 })
    expect(gnome.openDecisions.map((decision) => decision.key)).toEqual(['ancestry=gnome/boost'])
  })
})
