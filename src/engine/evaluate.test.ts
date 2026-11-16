import { describe, expect, it } from 'vitest'
import type { Book, CharacterDocument, Decision, DecisionValue } from '../content'
import { evaluate, preview, resolve, type Resolved, type Rules, type SlotView } from '.'

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

// Pacote fictício com limites: máximo numérico, mínimo, máximo por atributo, limite que não corta e limite pendente.
// O modificador vem da vaga `attribute-shift` decidida no documento.
const limitBook: Book = {
  ...book,
  components: [
    {
      id: 'base',
      type: 'adds',
      default: 'on',
      items: [
        { id: 'procedure:test', steps: ['step:origin', 'step:scores'] },
        { id: 'step:origin', name: 'Origin', page: 1, slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
        { id: 'step:scores', name: 'Scores', page: 2, requires: ['step:origin'], slots: { adjust: { kind: 'attribute-shift', amount: 1, optional: true } } },
        { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'attribute:wits', name: 'Wits', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'characteristic:power', name: 'Power', page: 3, formula: { add: [{ ref: 'attribute:might' }, { ref: 'attribute:might' }] }, limits: { max: 25 } },
        { id: 'characteristic:reach', name: 'Reach', page: 3, formula: { add: [{ ref: 'characteristic:power' }, 1] } },
        { id: 'characteristic:footing', name: 'Footing', page: 3, formula: { add: [{ ref: 'attribute:wits' }, -12] }, limits: { min: 1 } },
        { id: 'characteristic:madness', name: 'Madness', page: 3, formula: 12, limits: { max: { ref: 'attribute:wits' } } },
        { id: 'characteristic:calm', name: 'Calm', page: 3, formula: 3, limits: { max: 25 } },
        { id: 'characteristic:stature', name: 'Stature', page: 3 },
        { id: 'characteristic:poise', name: 'Poise', page: 3, formula: 30, limits: { max: { ref: 'characteristic:stature' } } },
        {
          id: 'ancestry:troll',
          name: 'Troll',
          page: 6,
          attributes: { 'attribute:might': 12, 'attribute:wits': 9 },
          characteristics: { 'characteristic:stature': { ref: 'grant:stature' } },
          grants: { stature: { kind: 'choose-value', step: 'step:origin', target: 'characteristic:stature', options: [1, 2] } },
        },
      ],
    },
  ],
}
const limitRules = resolve([limitBook], ['test.book'])
// Might 12 → 13 e Wits 9 → 8.
const boosted = () => shifted({ ancestry: 'ancestry:troll', adjust: { decrease: 'attribute:wits', increase: 'attribute:might' } })
const characteristic = (view: ReturnType<typeof evaluate>, name: string) => view.summary.characteristics.find((c) => c.name === name)!

describe('evaluate: calculation order, limits and composition', () => {
  it('FR-CALC-005: parts come in stage order; the limit applies after the modifier; a reference reads the limited value', () => {
    const view = evaluate(limitRules, boosted())
    expect(view.summary.attributes[0].composition.map((stage) => [stage.stage, stage.value])).toEqual([
      ['base', 12],
      ['modifier', 1],
    ])
    // Sem o ajuste, 2 × 12 = 24 não passa do máximo; com ele, 2 × 13 = 26 é cortado para 25.
    expect(characteristic(evaluate(limitRules, shifted({ ancestry: 'ancestry:troll' })), 'Power').value).toBe(24)
    expect(characteristic(view, 'Power').composition.map((stage) => [stage.stage, stage.value])).toEqual([
      ['base', 26],
      ['limit', -1],
    ])
    expect(characteristic(view, 'Power').value).toBe(25)
    expect(characteristic(view, 'Reach').value).toBe(26)
  })

  it('FR-CALC-006, FR-CALC-007: a maximum cuts with a negative part, a minimum raises, a maximum given by an attribute cuts by it', () => {
    const view = evaluate(limitRules, boosted())
    expect(characteristic(view, 'Power').composition[1]).toEqual({
      stage: 'limit',
      value: -1,
      bound: 'max',
      limit: 25,
      formula: '25',
      origin: { kind: 'default', id: 'characteristic:power' },
    })
    expect(characteristic(view, 'Footing')).toMatchObject({ value: 1, limits: [{ bound: 'min', formula: '1', limit: 1 }] })
    expect(characteristic(view, 'Footing').composition[1]).toMatchObject({ stage: 'limit', value: 5, bound: 'min', limit: 1 })
    expect(characteristic(view, 'Madness')).toMatchObject({ value: 8, limits: [{ bound: 'max', formula: 'Wits', limit: 8 }] })
    expect(characteristic(view, 'Madness').composition[1]).toMatchObject({ stage: 'limit', value: -4, formula: 'Wits', limit: 8 })
  })

  it('FR-CALC-006, FR-CALC-007: no part when the limit does not cut, and a pending limit does not cut', () => {
    const view = evaluate(limitRules, boosted())
    expect(characteristic(view, 'Calm')).toMatchObject({ value: 3, limits: [{ bound: 'max', formula: '25', limit: 25 }] })
    expect(characteristic(view, 'Calm').composition.map((stage) => stage.stage)).toEqual(['base'])
    // O máximo de Poise lê Stature, que espera a decisão da vaga.
    expect(characteristic(view, 'Poise')).toMatchObject({ value: 30, limits: [{ bound: 'max', formula: 'Stature', limit: null }] })
    expect(characteristic(view, 'Poise').composition.map((stage) => stage.stage)).toEqual(['base'])
    const decided = evaluate(limitRules, { ...boosted(), decisions: { ...boosted().decisions, 'ancestry=troll/stature': { mode: 'chosen', value: 2 } } })
    expect(characteristic(decided, 'Poise')).toMatchObject({ value: 2, limits: [{ limit: 2 }] })
  })

  it('FR-CALC-002: the total of every attribute and characteristic is the sum of its parts', () => {
    for (const document of [boosted(), shifted({ ancestry: 'ancestry:troll' })]) {
      const view = evaluate(limitRules, document)
      const totals = [
        ...view.summary.attributes.map((a) => [a.score, a.composition] as const),
        ...view.summary.characteristics.filter((c) => c.value !== null).map((c) => [c.value, c.composition] as const),
      ]
      for (const [total, composition] of totals) {
        expect(composition.length).toBeGreaterThan(0)
        expect(total).toBe(composition.reduce((sum, stage) => sum + stage.value!, 0))
      }
    }
  })
})

// Pacote fictício com tabelas (FEAT-009): a ancestralidade concede três tabelas numa etapa sem vaga raiz, uma de cada
// regime. A "Past" tem as chaves em ordem de objeto diferente da ordem das faixas, uma entrada com página própria e
// efeitos, e uma entrada com efeito de dado.
const pastEntries = (): Record<string, object> => ({
  '3': { page: 8, effects: { taint: { target: 'characteristic:taint', add: 1 } } },
  '4': {},
  '5-6': {},
  '7-16': {},
  '17': { effects: { madness: { target: 'characteristic:madness', add: { dice: { count: 1, sides: 6 } } } } },
  '18': {},
})
type FateTable = { dice: { count: number; sides: number; modifier?: number }; entries: Record<string, object> }
const fateTable = (): FateTable => ({ dice: { count: 1, sides: 6, modifier: 1 }, entries: { '2-4': {}, '5-7': {} } })
const tableBook = (past = pastEntries(), fate = fateTable()): Book => ({
  ...book,
  components: [
    {
      id: 'base',
      type: 'adds',
      default: 'on',
      items: [
        { id: 'procedure:test', steps: ['step:origin', 'step:story'] },
        {
          id: 'step:origin',
          name: 'Origin',
          page: 1,
          slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' }, adjust: { kind: 'attribute-shift', amount: 1, optional: true } },
        },
        { id: 'step:story', name: 'Story', page: 2, regime: 'roll-or-choose', requires: ['step:origin'] },
        { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'attribute:will', name: 'Will', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'characteristic:vigor', name: 'Vigor', page: 3, formula: { add: [{ ref: 'attribute:might' }, 2] } },
        { id: 'characteristic:taint', name: 'Taint', page: 3, formula: 0 },
        { id: 'characteristic:madness', name: 'Madness', page: 3, formula: 0, limits: { max: { ref: 'attribute:will' } } },
        { id: 'creature-type:wolf', name: 'Wolves', page: 7 },
        { id: 'creature-type:bear', name: 'Bears', page: 7 },
        {
          id: 'table:gnome-foe',
          name: 'Gnome Foe',
          page: 7,
          dice: { count: 1, sides: 20 },
          regime: 'choice',
          entries: { '11-20': { entity: 'creature-type:bear' }, '1-10': { entity: 'creature-type:wolf' } },
        },
        { id: 'table:gnome-past', name: 'Gnome Past', page: 7, dice: { count: 3, sides: 6 }, regime: 'roll-or-choose', field: 'background', entries: past },
        { id: 'table:gnome-fate', name: 'Gnome Fate', page: 7, regime: 'roll', ...fate },
        {
          id: 'ancestry:gnome',
          name: 'Gnome',
          page: 5,
          attributes: { 'attribute:might': 8, 'attribute:will': 10 },
          grants: {
            foe: { kind: 'table', step: 'step:story', table: 'table:gnome-foe' },
            past: { kind: 'table', step: 'step:story', table: 'table:gnome-past' },
            fate: { kind: 'table', step: 'step:story', table: 'table:gnome-fate' },
          },
        },
        { id: 'ancestry:troll', name: 'Troll', page: 6, attributes: { 'attribute:might': 12, 'attribute:will': 9 } },
      ],
    },
  ],
})
const tableRules = resolve([tableBook()], ['test.book'])
const FOE = 'ancestry=gnome/foe'
const PAST = 'ancestry=gnome/past'
const FATE = 'ancestry=gnome/fate'
const MADNESS = 'ancestry=gnome/past=17/madness'
const BOOK = 'test.book'

function tabled(decisions: Record<string, Decision> = {}): CharacterDocument {
  return { ...character(), decisions: { ancestry: { mode: 'chosen', value: 'ancestry:gnome' }, ...decisions } }
}
const slotAt = (view: ReturnType<typeof evaluate>, key: string) => view.slots.find((slot) => slot.key === key)
const tableAt = (view: ReturnType<typeof evaluate>, key: string) => slotAt(view, key) as Extract<SlotView, { kind: 'table' }>
const rolled = (entry: string, dice = [3, 5, 2], modifier = 0): Decision => ({
  mode: 'rolled',
  dice,
  modifier,
  total: dice.reduce((sum, face) => sum + face, modifier),
  entry,
  rolls: 1,
  book: BOOK,
})
const chosen = (entry: string): Decision => ({ mode: 'chosen', value: entry, book: BOOK })

/** A versão vigente da tabela vinda de outro livro, como o `resolve` a dará com `replaces` num livro acima (FEAT-005). */
function replacedBy(rules: Rules, tableId: string, bookId: string): Rules {
  const items = new Map(rules.items)
  const table = items.get(tableId)!
  items.set(tableId, { ...table, provenance: { ...table.provenance, book: bookId, abbr: 'TS' } } as Resolved)
  return { ...rules, items }
}

describe('evaluate: table slots', () => {
  it('FR-DEC-001, FR-DEC-002, FR-DEC-004: every table offers roll and choose, enter only with regime roll; the regime is in the view', () => {
    const view = evaluate(tableRules, tabled())
    expect(tableAt(view, FOE).table).toMatchObject({ regime: 'choice', modes: ['roll', 'choose'] })
    expect(tableAt(view, PAST).table).toMatchObject({ regime: 'roll-or-choose', modes: ['roll', 'choose'] })
    expect(tableAt(view, FATE).table).toMatchObject({ regime: 'roll', modes: ['roll', 'choose', 'enter'] })
  })

  it('FR-DEC-001: the table view has name, dice, provenance, field, the range of the total and the range of Enter result', () => {
    const view = evaluate(tableRules, tabled())
    expect(tableAt(view, PAST)).toMatchObject({
      kind: 'table',
      stepId: 'step:story',
      source: { id: 'ancestry:gnome', name: 'Gnome' },
      decided: false,
      table: {
        id: 'table:gnome-past',
        name: 'Gnome Past',
        provenance: { book: BOOK, abbr: 'TB', page: 7, type: 'core' },
        dice: { count: 3, sides: 6 },
        range: [3, 18],
        enterRange: [3, 18],
        field: 'background',
      },
    })
    // d6+1: o total vai de 2 a 7; o Enter result, de 1 a 6 (D4).
    expect(tableAt(view, FATE).table).toMatchObject({ range: [2, 7], enterRange: [1, 6] })
  })

  it('FR-DEC-008, FR-DEC-012: every entry has its range and page, and the entity when there is one, in the order of the range start', () => {
    const view = evaluate(tableRules, tabled())
    const past = tableAt(view, PAST).table.entries
    expect(past.map((entry) => [entry.key, entry.range, entry.provenance.page])).toEqual([
      ['3', [3, 3], 8],
      ['4', [4, 4], 7],
      ['5-6', [5, 6], 7],
      ['7-16', [7, 16], 7],
      ['17', [17, 17], 7],
      ['18', [18, 18], 7],
    ])
    expect(past[0].effects).toEqual([{ id: 'taint', target: { id: 'characteristic:taint', name: 'Taint' }, op: 'add', amount: 1 }])
    expect(past[4].effects).toEqual([
      { id: 'madness', target: { id: 'characteristic:madness', name: 'Madness' }, op: 'add', dice: { count: 1, sides: 6 }, slot: MADNESS },
    ])
    expect(tableAt(view, FOE).table.entries.map((entry) => [entry.key, entry.range, entry.entity])).toEqual([
      ['1-10', [1, 10], { id: 'creature-type:wolf', name: 'Wolves' }],
      ['11-20', [11, 20], { id: 'creature-type:bear', name: 'Bears' }],
    ])
  })

  it('FR-DEC-007, FR-DEC-016: a rolled table shows the recorded faces, modifier, total, entry and rolls', () => {
    const view = evaluate(tableRules, tabled({ [PAST]: rolled('7-16') }))
    expect(tableAt(view, PAST)).toMatchObject({
      decided: true,
      value: '7-16',
      result: { mode: 'rolled', entry: '7-16', faces: [3, 5, 2], modifier: 0, total: 10, rolls: 1 },
    })
    const entered = evaluate(tableRules, tabled({ [FATE]: { mode: 'entered', sum: 3, modifier: 1, total: 4, entry: '2-4', book: BOOK } }))
    expect(tableAt(entered, FATE).result).toEqual({ mode: 'entered', entry: '2-4', sum: 3, modifier: 1, total: 4 })
  })

  it('FR-DEC-024: a chosen table has the entry and no faces; a decision without book or entry, or with an unknown key, is ignored', () => {
    const view = evaluate(tableRules, tabled({ [PAST]: chosen('5-6') }))
    expect(tableAt(view, PAST)).toMatchObject({ decided: true, value: '5-6', result: { mode: 'chosen', entry: '5-6' } })
    expect(tableAt(view, PAST).result).not.toHaveProperty('faces')

    const ignored: Decision[] = [
      { mode: 'chosen', value: '5-6' },
      { mode: 'rolled', dice: [3, 5, 2], modifier: 0, total: 10, rolls: 1, book: BOOK },
      { mode: 'entered', sum: 10, modifier: 0, total: 10, book: BOOK },
      chosen('5-7'),
      rolled('7-15'),
    ]
    for (const decision of ignored) {
      const reopened = evaluate(tableRules, tabled({ [PAST]: decision }))
      const slot = tableAt(reopened, PAST)
      expect(slot.decided).toBe(false)
      expect(slot).not.toHaveProperty('value')
      expect(slot).not.toHaveProperty('result')
      expect(reopened.openDecisions.map((decision) => decision.key)).toContain(PAST)
    }
  })

  it('FR-CONT-016, FR-SRC-009: a version without the recorded entry, or a higher book that replaces the table, reopens the slot; going back restores the same decision without writing anything (AC-17 iii, iv, v)', () => {
    const document = tabled({ [PAST]: rolled('7-16'), [FOE]: chosen('1-10') })
    const before = JSON.stringify(document)
    const recorded = { mode: 'rolled', entry: '7-16', faces: [3, 5, 2], modifier: 0, total: 10, rolls: 1 }
    expect(tableAt(evaluate(tableRules, document), PAST)).toMatchObject({ decided: true, result: recorded })

    // (iii) Errata do mesmo livro que divide a faixa 7-16: a entrada gravada deixa de existir.
    const split = pastEntries()
    delete split['7-16']
    const errata = resolve([tableBook({ ...split, '7-10': {}, '11-16': {} })], ['test.book'])
    const withoutEntry = evaluate(errata, document)
    expect(tableAt(withoutEntry, PAST)).toMatchObject({ decided: false })
    expect(withoutEntry.openDecisions.map((decision) => decision.key)).toEqual([PAST, FATE])

    // (iv) A versão vigente da tabela vem de outro livro: a regra (a) falha.
    const replaced = evaluate(replacedBy(tableRules, 'table:gnome-past', 'test.supplement'), document)
    expect(tableAt(replaced, PAST)).toMatchObject({ decided: false })
    expect(tableAt(replaced, FOE)).toMatchObject({ decided: true, value: '1-10' })

    // (v) De volta à versão anterior: a mesma decisão volta a valer; o documento não mudou, e o log continua vazio.
    expect(tableAt(evaluate(tableRules, document), PAST)).toMatchObject({ decided: true, value: '7-16', result: recorded })
    expect(JSON.stringify(document)).toBe(before)
    expect(document.log).toEqual([])
    expect(document.decisions[PAST]).toEqual(rolled('7-16'))
  })

  it('FR-STEP-014, FR-DEC-011: an entry with a dice effect opens a roll-effect slot, counted as open, which goes away when the entry changes', () => {
    const view = evaluate(tableRules, tabled({ [PAST]: chosen('17') }))
    expect(slotAt(view, MADNESS)).toEqual({
      key: MADNESS,
      stepId: 'step:story',
      source: { id: 'table:gnome-past', name: 'Gnome Past' },
      kind: 'roll-effect',
      dice: { count: 1, sides: 6 },
      enterRange: [1, 6],
      target: { id: 'characteristic:madness', name: 'Madness' },
      decided: false,
    })
    expect(view.steps[1]).toMatchObject({ status: 'open', decided: 1, open: 3, total: 4 })
    expect(view.openDecisions).toContainEqual({
      key: MADNESS,
      kind: 'roll-effect',
      stepId: 'step:story',
      source: { id: 'table:gnome-past', name: 'Gnome Past' },
      target: 'characteristic:madness',
      dice: { count: 1, sides: 6 },
    })

    const other = evaluate(tableRules, tabled({ [PAST]: chosen('18'), [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 } }))
    expect(slotAt(other, MADNESS)).toBeUndefined()
    expect(other.openDecisions.map((decision) => decision.key)).not.toContain(MADNESS)

    const decided = evaluate(tableRules, tabled({ [PAST]: chosen('17'), [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 } }))
    expect(slotAt(decided, MADNESS)).toMatchObject({ decided: true, result: { mode: 'rolled', faces: [4], modifier: 0, total: 4 } })
    const entered = evaluate(tableRules, tabled({ [PAST]: chosen('17'), [MADNESS]: { mode: 'entered', sum: 5, modifier: 0, total: 5 } }))
    expect(slotAt(entered, MADNESS)).toMatchObject({ decided: true, result: { mode: 'entered', sum: 5, modifier: 0, total: 5 } })
  })

  it('FR-FLOW-001: a step with granted tables is open, and done when all of them are decided', () => {
    const open = evaluate(tableRules, tabled())
    expect(statuses(open)).toEqual([
      ['origin', 'done'],
      ['story', 'open'],
    ])
    expect(open.steps[1]).toMatchObject({ decided: 0, open: 3, total: 3 })
    expect(open.openDecisions).toEqual([
      { key: FOE, kind: 'table', stepId: 'step:story', source: { id: 'ancestry:gnome', name: 'Gnome' }, table: { id: 'table:gnome-foe', name: 'Gnome Foe' } },
      { key: PAST, kind: 'table', stepId: 'step:story', source: { id: 'ancestry:gnome', name: 'Gnome' }, table: { id: 'table:gnome-past', name: 'Gnome Past' } },
      { key: FATE, kind: 'table', stepId: 'step:story', source: { id: 'ancestry:gnome', name: 'Gnome' }, table: { id: 'table:gnome-fate', name: 'Gnome Fate' } },
    ])

    const done = evaluate(tableRules, tabled({ [FOE]: chosen('11-20'), [PAST]: rolled('3', [1, 1, 1]), [FATE]: chosen('5-7') }))
    expect(statuses(done)).toEqual([
      ['origin', 'done'],
      ['story', 'done'],
    ])
    expect(done.openDecisions).toEqual([])
    // Sem a ancestralidade que concede tabelas, a etapa não começa.
    expect(statuses(evaluate(tableRules, tabled({ ancestry: { mode: 'chosen', value: 'ancestry:troll' } })))).toEqual([
      ['origin', 'done'],
      ['story', 'not-started'],
    ])
  })
})

// Efeitos de resultado: a entrada "4" da Past e a "2-4" da Fate mexem nos mesmos alvos, com `add` e `set`.
const effectPast = () => ({
  ...pastEntries(),
  '4': {
    effects: {
      might: { target: 'attribute:might', add: 2 },
      taint: { target: 'characteristic:taint', add: 1 },
      vigor: { target: 'characteristic:vigor', set: 20 },
      will: { target: 'attribute:will', set: 12 },
    },
  },
})
const effectFate = (): FateTable => ({
  dice: { count: 1, sides: 6, modifier: 1 },
  entries: {
    '2-4': {
      effects: {
        taint: { target: 'characteristic:taint', add: 3 },
        vigor: { target: 'characteristic:vigor', set: 5 },
        madness: { target: 'characteristic:madness', add: 15 },
        will: { target: 'attribute:will', add: 1 },
      },
    },
    '5-7': {},
  },
})
const effectRules = resolve([tableBook(effectPast(), effectFate())], ['test.book'])
const adjusted = (decisions: Record<string, Decision>) =>
  tabled({ adjust: { mode: 'chosen', value: { decrease: 'attribute:will', increase: 'attribute:might' } }, ...decisions })
const resultOrigin = (key: string, table: string, name: string, entry: string) => ({
  kind: 'table',
  key,
  stepId: 'step:story',
  table: { id: table, name },
  entry,
})
const pastOrigin = (entry: string) => resultOrigin(PAST, 'table:gnome-past', 'Gnome Past', entry)
const fateOrigin = (entry: string) => resultOrigin(FATE, 'table:gnome-fate', 'Gnome Fate', entry)
const attributeAt = (view: ReturnType<typeof evaluate>, name: string) => view.summary.attributes.find((a) => a.name === name)!
const parts = (stages: { stage: string; value: number | null }[]) => stages.map((stage) => [stage.stage, stage.value])

describe('evaluate: result effects (define and sum)', () => {
  it('FR-CALC-010: an add of the entry becomes a sum part with the origin of the table and the entry', () => {
    const view = evaluate(tableRules, tabled({ [PAST]: rolled('3', [1, 1, 1]) }))
    expect(characteristic(view, 'Taint')).toMatchObject({ value: 1 })
    expect(characteristic(view, 'Taint').composition).toEqual([
      { stage: 'base', value: 0, formula: '0', origin: { kind: 'default', id: 'characteristic:taint' } },
      { stage: 'sum', value: 1, origin: pastOrigin('3') },
    ])
    // Sem a decisão, nenhuma parcela de resultado.
    expect(parts(characteristic(evaluate(tableRules, tabled()), 'Taint').composition)).toEqual([['base', 0]])
  })

  it('FR-CALC-011: two adds on the same target add up, one part each', () => {
    const view = evaluate(effectRules, adjusted({ [PAST]: chosen('4'), [FATE]: chosen('2-4') }))
    expect(characteristic(view, 'Taint').value).toBe(4)
    expect(characteristic(view, 'Taint').composition.slice(1)).toEqual([
      { stage: 'sum', value: 1, origin: pastOrigin('4') },
      { stage: 'sum', value: 3, origin: fateOrigin('2-4') },
    ])
  })

  it('FR-CALC-005: base → modifier → define → sum → limit; a set is a difference part and the last set wins; the limit cuts after the sum (AC-9)', () => {
    const view = evaluate(effectRules, adjusted({ [PAST]: chosen('4'), [FATE]: chosen('2-4') }))
    expect(attributeAt(view, 'Might')).toMatchObject({ score: 11, modifier: 1 })
    expect(parts(attributeAt(view, 'Might').composition)).toEqual([
      ['base', 8],
      ['modifier', 1],
      ['sum', 2],
    ])
    // Will: 10 − 1 = 9; set 12 vira +3; +1 → 13.
    expect(attributeAt(view, 'Will').score).toBe(13)
    expect(attributeAt(view, 'Will').composition.slice(2)).toEqual([
      { stage: 'define', value: 3, set: 12, origin: pastOrigin('4') },
      { stage: 'sum', value: 1, origin: fateOrigin('2-4') },
    ])
    // Vigor: Might + 2 = 13; set 20 (+7) e set 5 (−15), em ordem de vagas: vale o último.
    expect(characteristic(view, 'Vigor').value).toBe(5)
    expect(characteristic(view, 'Vigor').composition.slice(1)).toEqual([
      { stage: 'define', value: 7, set: 20, origin: pastOrigin('4') },
      { stage: 'define', value: -15, set: 5, origin: fateOrigin('2-4') },
    ])
    // Madness: 0 + 15, cortado pelo máximo Will (13) depois do `sum`.
    expect(characteristic(view, 'Madness').value).toBe(13)
    expect(characteristic(view, 'Madness').composition.map((stage) => [stage.stage, stage.value])).toEqual([
      ['base', 0],
      ['sum', 15],
      ['limit', -2],
    ])
    for (const value of [...view.summary.attributes.map((a) => [a.score, a.composition] as const), ...view.summary.characteristics.filter((c) => c.value !== null).map((c) => [c.value, c.composition] as const)]) {
      expect(value[0]).toBe(value[1].reduce((sum, stage) => sum + stage.value!, 0))
    }
  })

  it('FR-CALC-005: an add on an attribute changes the characteristic that refers to it (AC-9)', () => {
    const without = evaluate(effectRules, adjusted({ [PAST]: chosen('5-6') }))
    const withAdd = evaluate(effectRules, adjusted({ [PAST]: chosen('4') }))
    expect(characteristic(without, 'Vigor').composition[0]).toMatchObject({ stage: 'base', value: 11 })
    expect(characteristic(withAdd, 'Vigor').composition[0]).toMatchObject({ stage: 'base', value: 13 })
  })

  it('FR-STEP-014: with the roll-effect open the target is pending on it; decided, it adds the recorded total (AC-8)', () => {
    const open = evaluate(tableRules, tabled({ [PAST]: chosen('17') }))
    expect(characteristic(open, 'Madness')).toMatchObject({ value: null, pendingOn: MADNESS })
    expect(characteristic(open, 'Madness').composition).toEqual([
      { stage: 'base', value: 0, formula: '0', origin: { kind: 'default', id: 'characteristic:madness' } },
      { stage: 'sum', value: null, origin: pastOrigin('17') },
    ])
    const decided = evaluate(tableRules, tabled({ [PAST]: chosen('17'), [MADNESS]: { mode: 'rolled', dice: [4], modifier: 0, total: 4 } }))
    expect(characteristic(decided, 'Madness')).toMatchObject({ value: 4 })
    expect(characteristic(decided, 'Madness')).not.toHaveProperty('pendingOn')
    expect(characteristic(decided, 'Madness').composition[1]).toEqual({ stage: 'sum', value: 4, origin: pastOrigin('17') })

    // Num atributo: score e modificador pendentes, e a característica que o lê também.
    const MIGHT = 'ancestry=gnome/past=18/might'
    const diceRules = resolve([tableBook({ ...pastEntries(), '18': { effects: { might: { target: 'attribute:might', add: { dice: { count: 1, sides: 6 } } } } } })], ['test.book'])
    const pending = evaluate(diceRules, tabled({ [PAST]: chosen('18') }))
    expect(attributeAt(pending, 'Might')).toMatchObject({ score: null, modifier: null, pendingOn: MIGHT })
    expect(characteristic(pending, 'Vigor')).toMatchObject({ value: null, pendingOn: MIGHT })
    const entered = evaluate(diceRules, tabled({ [PAST]: chosen('18'), [MIGHT]: { mode: 'entered', sum: 3, modifier: 0, total: 3 } }))
    expect(attributeAt(entered, 'Might')).toMatchObject({ score: 11, modifier: 1 })
    expect(attributeAt(entered, 'Might')).not.toHaveProperty('pendingOn')
    expect(characteristic(entered, 'Vigor').value).toBe(13)
  })

  it('FR-CONT-015: an errata of the dice keeps the recorded faces, modifier, total and entry (AC-17 i)', () => {
    const before = resolve([tableBook(pastEntries(), { dice: { count: 1, sides: 6, modifier: 2 }, entries: { '3-5': {}, '6-8': {} } })], ['test.book'])
    const after = resolve([tableBook(pastEntries(), { dice: { count: 1, sides: 6, modifier: 4 }, entries: { '5': {}, '6-8': {}, '9-10': {} } })], ['test.book'])
    const document = tabled({ [FATE]: rolled('6-8', [4], 2) })
    const recorded = { mode: 'rolled', entry: '6-8', faces: [4], modifier: 2, total: 6, rolls: 1 }
    expect(tableAt(evaluate(before, document), FATE).result).toEqual(recorded)
    const shown = tableAt(evaluate(after, document), FATE)
    expect(shown.result).toEqual(recorded)
    // A tabela mostrada é a da versão nova; o resultado, o gravado.
    expect(shown.table).toMatchObject({ dice: { count: 1, sides: 6, modifier: 4 }, range: [5, 10] })
  })

  it('FR-CONT-015: an errata that changes the effect of the recorded entry changes the affected value (AC-17 ii)', () => {
    const document = tabled({ [PAST]: rolled('3', [1, 1, 1]) })
    expect(characteristic(evaluate(tableRules, document), 'Taint').value).toBe(1)
    const errata = resolve([tableBook({ ...pastEntries(), '3': { page: 8, effects: { taint: { target: 'characteristic:taint', add: 2 } } } })], ['test.book'])
    const view = evaluate(errata, document)
    expect(characteristic(view, 'Taint').value).toBe(2)
    expect(tableAt(view, PAST).result).toEqual({ mode: 'rolled', entry: '3', faces: [1, 1, 1], modifier: 0, total: 3, rolls: 1 })
  })
})
