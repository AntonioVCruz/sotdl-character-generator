import { describe, expect, it } from 'vitest'
import type { Book, CharacterDocument } from '../content'
import core from '../../packs/sotdl.core.json'
import { ancestryDetail, evaluate, preview, resolve } from '.'

// O pacote oficial real (validado pelo schema em src/content/core-pack.test.ts), com os valores da §4.
const rules = resolve([core as unknown as Book], ['sotdl.core'])

function character(decisions: Record<string, string | number> = {}): CharacterDocument {
  return {
    schema: 1,
    id: 'c1',
    contentVersion: '0.0.0',
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: { order: ['sotdl.core'] },
    decisions: Object.fromEntries(Object.entries(decisions).map(([key, value]) => [key, { mode: 'chosen', value }])),
    text: {},
    log: [],
  }
}
const values = (view: ReturnType<typeof evaluate>) =>
  Object.fromEntries(view.summary.characteristics.map((c) => [c.name, c.value]))

describe('evaluate: live summary with the core pack', () => {
  it('FR-FLOW-012, FR-CALC-001: Dwarf gives Health 14, Perception 11, Healing Rate 3, Speed 8, Size 1/2 and modifiers 0/−1/0/0', () => {
    const view = evaluate(rules, character({ ancestry: 'ancestry:dwarf' }))
    expect(view.summary.attributes.map((a) => [a.name, a.score, a.modifier])).toEqual([
      ['Strength', 10, 0],
      ['Agility', 9, -1],
      ['Intellect', 10, 0],
      ['Will', 10, 0],
    ])
    expect(values(view)).toMatchObject({ Health: 14, Perception: 11, 'Healing Rate': 3, Speed: 8, Size: 0.5, Defense: 9 })
    expect(view.summary.gained.languages.map((l) => [l.name, l.abilities])).toEqual([
      ['Common Tongue', ['speak']],
      ['Dwarfish', ['speak', 'read', 'write']],
    ])
    expect(view.summary.gained.talents.map((t) => t.name)).toEqual(['Darksight', 'Hated Creature', 'Robust Constitution'])
  })

  it('FR-STEP-003, FR-CALC-001: Human without Size leaves Size pending on ancestry=human/size', () => {
    const size = evaluate(rules, character({ ancestry: 'ancestry:human' })).summary.characteristics.find((c) => c.name === 'Size')
    expect(size).toMatchObject({ value: null, pendingOn: 'ancestry=human/size', formula: '1/2 or 1' })
    const decided = evaluate(rules, character({ ancestry: 'ancestry:human', 'ancestry=human/size': 1 }))
    expect(values(decided).Size).toBe(1)
  })

  it('FR-FLOW-012: each value carries its base term and origin (ancestry or the standard rule)', () => {
    const view = evaluate(rules, character({ ancestry: 'ancestry:dwarf' }))
    const dwarf = { kind: 'ancestry', id: 'ancestry:dwarf', name: 'Dwarf' }
    expect(view.summary.attributes[0].composition).toEqual([{ stage: 'base', value: 10, origin: dwarf }])
    const byName = (name: string) => view.summary.characteristics.find((c) => c.name === name)!.composition
    expect(byName('Health')).toEqual([{ stage: 'base', value: 14, formula: 'Strength + 4', origin: dwarf }])
    expect(byName('Healing Rate')).toEqual([
      {
        stage: 'base',
        value: 3,
        formula: 'Health / 4, rounded down',
        origin: { kind: 'default', id: 'characteristic:healing-rate' },
      },
    ])
  })

  it('FR-FLOW-014: preview of Dwarf → Human lists what would change and leaves the document as it was', () => {
    const document = character({ ancestry: 'ancestry:dwarf' })
    const before = JSON.stringify(document)
    const { view, changes } = preview(rules, document, 'ancestry', 'ancestry:human')
    expect(view.ancestry).toBe('ancestry:human')
    expect(changes.attributes).toEqual([{ id: 'attribute:agility', name: 'Agility', from: 9, to: 10 }])
    expect(changes.characteristics.map((c) => [c.name, c.from, c.to])).toEqual([
      ['Perception', 11, 10],
      ['Defense', 9, 10],
      ['Health', 14, 10],
      ['Healing Rate', 3, 2],
      ['Size', 0.5, null],
      ['Speed', 8, 10],
    ])
    // Size do Human fica em aberto na própria etapa; as outras etapas continuam liberadas. O +1 abre Attributes, e a
    // concessão de idioma ou profissão abre Professions & languages (FEAT-008 §3.3 e §7).
    expect(changes.steps.map((s) => [s.name, s.from, s.to])).toEqual([
      ['Ancestry', 'done', 'open'],
      ['Attributes', 'done', 'open'],
      ['Professions & languages', 'not-started', 'open'],
    ])
    expect(JSON.stringify(document)).toBe(before)
  })

  it('FR-FLOW-014: preview from no ancestry opens the locked steps', () => {
    const { changes } = preview(rules, character(), 'ancestry', 'ancestry:dwarf')
    expect(changes.steps.map((s) => [s.name, s.from, s.to])).toEqual([
      ['Ancestry', 'not-started', 'done'],
      // Só com a vaga opcional do ajuste, a etapa fica `done` (FEAT-008 §3.3 e §7).
      ['Attributes', 'locked', 'done'],
      ['Story', 'locked', 'not-started'],
      ['Professions & languages', 'locked', 'not-started'],
      ['Wealth & equipment', 'locked', 'not-started'],
      ['Interesting thing', 'locked', 'not-started'],
      ['Roleplaying', 'locked', 'optional'],
      ['Review', 'locked', 'not-started'],
    ])
    expect(changes.characteristics.find((c) => c.name === 'Health')).toMatchObject({ from: null, to: 14 })
  })
})

describe('Attributes step with the core pack', () => {
  const dwarf = { kind: 'ancestry', id: 'ancestry:dwarf', name: 'Dwarf' }
  const adjustment = { kind: 'slot', key: 'adjustment', stepId: 'step:attributes', slotKind: 'attribute-shift' }
  const adjusted = (ancestry: string) => {
    const document = character({ ancestry })
    document.decisions.adjustment = { mode: 'chosen', value: { decrease: 'attribute:strength', increase: 'attribute:intellect' } }
    return document
  }

  it('FR-STEP-007: the four attributes of the Dwarf, with modifier and composition, before and after the adjustment', () => {
    const view = evaluate(rules, character({ ancestry: 'ancestry:dwarf' }))
    expect(view.summary.attributes.map((a) => [a.name, a.score, a.modifier, a.composition])).toEqual([
      ['Strength', 10, 0, [{ stage: 'base', value: 10, origin: dwarf }]],
      ['Agility', 9, -1, [{ stage: 'base', value: 9, origin: dwarf }]],
      ['Intellect', 10, 0, [{ stage: 'base', value: 10, origin: dwarf }]],
      ['Will', 10, 0, [{ stage: 'base', value: 10, origin: dwarf }]],
    ])

    const after = evaluate(rules, adjusted('ancestry:dwarf'))
    expect(after.summary.attributes.map((a) => [a.name, a.score, a.modifier])).toEqual([
      ['Strength', 9, -1],
      ['Agility', 9, -1],
      ['Intellect', 11, 1],
      ['Will', 10, 0],
    ])
    expect(after.summary.attributes[0].composition).toEqual([
      { stage: 'base', value: 10, origin: dwarf },
      { stage: 'modifier', value: -1, origin: adjustment },
    ])
    expect(after.summary.attributes[2].composition).toEqual([
      { stage: 'base', value: 10, origin: dwarf },
      { stage: 'modifier', value: 1, origin: adjustment },
    ])
  })

  it('FR-FLOW-001: Attributes is done with Dwarf; with Human, Attributes and Professions & languages are open', () => {
    const states = (view: ReturnType<typeof evaluate>) => view.steps.map((s) => [s.name, s.status])
    const others = [
      ['Story', 'not-started'],
      ['Wealth & equipment', 'not-started'],
      ['Interesting thing', 'not-started'],
      ['Roleplaying', 'optional'],
      ['Review', 'not-started'],
    ]
    for (const document of [character({ ancestry: 'ancestry:dwarf' }), adjusted('ancestry:dwarf')]) {
      const view = evaluate(rules, document)
      expect(states(view)).toEqual(expect.arrayContaining([['Attributes', 'done'], ['Professions & languages', 'not-started'], ...others]))
      expect(view.steps[1]).toMatchObject({ decided: 0, open: 0, total: 0 })
    }
    const human = evaluate(rules, character({ ancestry: 'ancestry:human' }))
    expect(states(human)).toEqual([
      ['Ancestry', 'open'],
      ['Attributes', 'open'],
      ['Story', 'not-started'],
      ['Professions & languages', 'open'],
      ...others.slice(1),
    ])
    expect(human.steps[1]).toMatchObject({ decided: 0, open: 1, total: 1 })
    expect(human.steps[3]).toMatchObject({ decided: 0, open: 1, total: 1 })
    expect(human.openDecisions.map((decision) => decision.key)).not.toContain('adjustment')
  })
})

describe('ancestry options and detail with the core pack', () => {
  it('FR-STEP-001, FR-CONT-009, FR-SRC-010: Dwarf and Human appear once each, with the generated mechanics line and provenance', () => {
    const slot = evaluate(rules, character()).slots.find((s) => s.key === 'ancestry')!
    expect(slot.kind === 'choose-entity' && slot.options.map((o) => [o.name, o.provenance])).toEqual([
      ['Human', { book: 'sotdl.core', abbr: 'CORE', page: 11, type: 'core' }],
      ['Dwarf', { book: 'sotdl.core', abbr: 'CORE', page: 17, type: 'core' }],
    ])
    const dwarf = slot.kind === 'choose-entity' ? slot.options[1].mechanics : []
    expect(dwarf).toEqual([
      'Strength 10',
      'Agility 9',
      'Intellect 10',
      'Will 10',
      'Perception = Intellect + 1',
      'Health = Strength + 4',
      'Size 1/2',
      'Speed 8',
      'Darksight',
      'Hated Creature',
      'Robust Constitution',
    ])
    expect(slot.kind === 'choose-entity' && slot.options[0].mechanics).toContain('Size 1/2 or 1')
  })

  it('FR-STEP-002: the detail lists attributes, characteristics, languages, talents, level 4 and pending grants', () => {
    const dwarf = ancestryDetail(rules, 'ancestry:dwarf')
    expect(dwarf).toMatchObject({ name: 'Dwarf', page: 17, level4: 'Health +6; one spell or Shake it Off', grants: [] })
    expect(dwarf.attributes.map((a) => a.score)).toEqual([10, 9, 10, 10])
    expect(dwarf.characteristics.map((c) => c.text)).toEqual(['Perception = Intellect + 1', 'Health = Strength + 4', 'Size 1/2', 'Speed 8'])
    expect(dwarf.talents.map((t) => [t.name, t.provenance.page])).toEqual([
      ['Darksight', 17],
      ['Hated Creature', 17],
      ['Robust Constitution', 17],
    ])

    const human = ancestryDetail(rules, 'ancestry:human')
    expect(human.level4).toBe('Health +5; one spell or Determined')
    expect(human.grants.map((g) => [g.id, g.kind, g.stepName])).toEqual([
      ['size', 'choose-value', 'Ancestry'],
      ['attribute-increase', 'attribute-increase', 'Attributes'],
      ['language-or-profession', 'language-or-profession', 'Professions & languages'],
    ])
  })

  it('FR-CONT-006: renaming the entity in a pack keeps the decision, because it is stored by id', () => {
    const renamed = structuredClone(core) as unknown as Book
    const dwarf = renamed.components[0].items.find((item) => item.id === 'ancestry:dwarf') as { name: string }
    dwarf.name = 'Mountain Folk'
    const view = evaluate(resolve([renamed], ['sotdl.core']), character({ ancestry: 'ancestry:dwarf' }))
    expect(view.ancestry).toBe('ancestry:dwarf')
    expect(view.summary.attributes[0].composition[0].origin).toMatchObject({ name: 'Mountain Folk' })
    expect(values(view).Health).toBe(14)
  })
})
