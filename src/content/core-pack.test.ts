import { describe, expect, it } from 'vitest'
import core from '../../packs/sotdl.core.json'
import { bookSchema, isItemOf, type AncestryItem } from './schemas'

// O pacote oficial real; os valores são os da tabela do technical-design §4, conferidos no PDF.
const book = bookSchema.parse(core)
const ancestry = (id: string) => book.components.flatMap((c) => c.items).find((item) => item.id === id) as AncestryItem

describe('official core pack', () => {
  it('FR-CONT-003: has Dwarf and Human with the verified level 0 data', () => {
    const items = book.components.flatMap((c) => c.items)
    expect(items.filter((item) => isItemOf(item, 'ancestry')).map((item) => item.id)).toEqual(['ancestry:human', 'ancestry:dwarf'])

    expect(ancestry('ancestry:dwarf')).toMatchObject({
      name: 'Dwarf',
      page: 17,
      attributes: { 'attribute:strength': 10, 'attribute:agility': 9, 'attribute:intellect': 10, 'attribute:will': 10 },
      characteristics: {
        'characteristic:perception': { add: [{ ref: 'attribute:intellect' }, 1] },
        'characteristic:health': { add: [{ ref: 'attribute:strength' }, 4] },
        'characteristic:size': 0.5,
        'characteristic:speed': 8,
      },
      languages: { 'language:common-tongue': ['speak'], 'language:dwarfish': ['speak', 'read', 'write'] },
      talents: ['talent:darksight', 'talent:hated-creature', 'talent:robust-constitution'],
      level4: { characteristics: { 'characteristic:health': 6 }, oneOf: [{ spells: 1 }, { talent: 'talent:shake-it-off' }] },
    })
    expect(ancestry('ancestry:dwarf').grants).toBeUndefined()

    expect(ancestry('ancestry:human')).toMatchObject({
      name: 'Human',
      page: 11,
      attributes: { 'attribute:strength': 10, 'attribute:agility': 10, 'attribute:intellect': 10, 'attribute:will': 10 },
      characteristics: { 'characteristic:size': { ref: 'grant:size' }, 'characteristic:speed': 10 },
      languages: { 'language:common-tongue': ['speak'] },
      level4: { characteristics: { 'characteristic:health': 5 }, oneOf: [{ spells: 1 }, { talent: 'talent:determined' }] },
      grants: {
        size: { kind: 'choose-value', step: 'step:ancestry', target: 'characteristic:size', options: [0.5, 1] },
        'attribute-increase': { kind: 'attribute-increase', step: 'step:attributes', amount: 1 },
        'language-or-profession': { kind: 'language-or-profession', step: 'step:professions-languages' },
      },
    })
  })

  it('FR-STEP-009: the Attributes step declares the optional score adjustment slot (amount 1)', () => {
    const step = book.components.flatMap((c) => c.items).find((item) => item.id === 'step:attributes')
    expect(step && isItemOf(step, 'step') && step.slots).toEqual({ adjustment: { kind: 'attribute-shift', amount: 1, optional: true } })
  })

  it('FR-FLOW-002: keeps the 8 steps of the level 0 procedure, every step after Ancestry requiring it', () => {
    const items = book.components.flatMap((c) => c.items)
    const procedure = items.find((item) => isItemOf(item, 'procedure'))
    expect(procedure && isItemOf(procedure, 'procedure') && procedure.steps).toHaveLength(8)
    const steps = items.filter((item) => isItemOf(item, 'step'))
    expect(steps.slice(1).every((step) => isItemOf(step, 'step') && step.requires?.[0] === 'step:ancestry')).toBe(true)
  })
})
