import { describe, expect, it } from 'vitest'
import core from '../../packs/sotdl.core.json'
import { bookSchema, isItemOf, type AncestryItem, type TableItem } from './schemas'

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
    // FEAT-009 §7: as seis tabelas da Story, concedidas pelo Dwarf na ordem do pacote.
    expect(ancestry('ancestry:dwarf').grants).toEqual({
      'hated-creature': { kind: 'table', step: 'step:story', table: 'table:dwarf-hatred' },
      age: { kind: 'table', step: 'step:story', table: 'table:dwarf-age' },
      build: { kind: 'table', step: 'step:story', table: 'table:dwarf-build' },
      appearance: { kind: 'table', step: 'step:story', table: 'table:dwarf-appearance' },
      background: { kind: 'table', step: 'step:story', table: 'table:dwarf-background' },
      personality: { kind: 'table', step: 'step:story', table: 'table:dwarf-personality' },
    })
    expect(Object.keys(ancestry('ancestry:dwarf').grants!)).toEqual(['hated-creature', 'age', 'build', 'appearance', 'background', 'personality'])

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

  it('FR-CALC-006: the core pack declares the Defense, Perception, Healing Rate and Insanity limits', () => {
    const items = book.components.flatMap((c) => c.items)
    const limits = Object.fromEntries(items.flatMap((item) => (isItemOf(item, 'characteristic') && item.limits ? [[item.id, item.limits]] : [])))
    expect(limits).toEqual({
      'characteristic:perception': { max: 25 },
      'characteristic:defense': { max: 25 },
      'characteristic:healing-rate': { min: 1 },
      'characteristic:insanity': { max: { ref: 'attribute:will' } },
    })
  })

  const item = (id: string) => book.components.flatMap((c) => c.items).find((candidate) => candidate.id === id)
  const table = (id: string) => item(id) as TableItem

  it('FR-STEP-013: Dwarf Hatred is a d20 choice table with the ten creature types in the verified ranges', () => {
    expect(table('table:dwarf-hatred')).toMatchObject({ name: 'Dwarf Hatred', page: 18, dice: { count: 1, sides: 20 }, regime: 'choice' })
    expect(table('table:dwarf-hatred').entries).toEqual({
      '1-2': { entity: 'creature-type:ogre' },
      '3-4': { entity: 'creature-type:troglodyte' },
      '5-6': { entity: 'creature-type:beastman' },
      '7-8': { entity: 'creature-type:orc' },
      '9-10': { entity: 'creature-type:goblin' },
      '11-12': { entity: 'creature-type:elf' },
      '13-14': { entity: 'creature-type:troll' },
      '15-16': { entity: 'creature-type:giant' },
      '17-18': { entity: 'creature-type:dragon' },
      '19-20': { entity: 'creature-type:demon' },
    })
    const creatures = book.components.flatMap((c) => c.items).filter((candidate) => isItemOf(candidate, 'creature-type'))
    expect(creatures.map((creature) => [creature.id, 'name' in creature && creature.name, 'page' in creature && creature.page])).toEqual([
      ['creature-type:ogre', 'Ogres', 18],
      ['creature-type:troglodyte', 'Troglodytes', 18],
      ['creature-type:beastman', 'Beastmen', 18],
      ['creature-type:orc', 'Orcs', 18],
      ['creature-type:goblin', 'Goblins', 18],
      ['creature-type:elf', 'Elves', 18],
      ['creature-type:troll', 'Trolls', 18],
      ['creature-type:giant', 'Giants', 18],
      ['creature-type:dragon', 'Dragons', 18],
      ['creature-type:demon', 'Demons', 18],
    ])
  })

  it('FR-STEP-012: the Story step and the other five Dwarf tables carry the verified dice, regime, field, page and ranges, with no text', () => {
    expect(item('step:story')).toMatchObject({ page: 11, regime: 'roll-or-choose' })
    const shape = (id: string) => {
      const { name, page, dice, regime, field, entries } = table(id)
      return { name, page, dice, regime, field, keys: Object.keys(entries).sort((a, b) => parseInt(a) - parseInt(b)) }
    }
    const roll3d6 = { dice: { count: 3, sides: 6 }, regime: 'roll-or-choose' }
    expect(shape('table:dwarf-age')).toEqual({ name: 'Dwarf Age', page: 18, ...roll3d6, field: undefined, keys: ['3', '4-7', '8-12', '13-15', '16-17', '18'] })
    expect(shape('table:dwarf-build')).toEqual({ name: 'Dwarf Build', page: 18, ...roll3d6, field: undefined, keys: ['3', '4-6', '7-8', '9-12', '13-15', '16-17', '18'] })
    expect(shape('table:dwarf-appearance')).toEqual({
      name: 'Dwarf Appearance',
      page: 18,
      ...roll3d6,
      field: 'appearance',
      keys: ['3-4', '5-6', '7-8', '9-11', '12-15', '16-18'],
    })
    expect(shape('table:dwarf-background')).toEqual({
      name: 'Dwarf Background',
      page: 19,
      dice: { count: 1, sides: 20 },
      regime: 'roll-or-choose',
      field: 'background',
      keys: Array.from({ length: 20 }, (_, i) => String(i + 1)),
    })
    expect(shape('table:dwarf-personality')).toEqual({
      name: 'Dwarf Personality',
      page: 19,
      ...roll3d6,
      field: 'personality',
      keys: ['3', '4', '5-6', '7-8', '9-12', '13-14', '15-16', '17', '18'],
    })
    // Só faixa e página (D36): nenhuma entrada de Age, Build, Appearance ou Personality tem campo.
    for (const id of ['table:dwarf-age', 'table:dwarf-build', 'table:dwarf-appearance', 'table:dwarf-personality']) {
      expect(Object.values(table(id).entries).every((entry) => Object.keys(entry).length === 0)).toBe(true)
    }
  })

  it('FR-CALC-010: Dwarf Background 1 adds 1 to Corruption, and no other Background entry has an effect yet (D12)', () => {
    const entries = table('table:dwarf-background').entries
    expect(entries['1']).toEqual({ effects: { corruption: { target: 'characteristic:corruption', add: 1 } } })
    expect(Object.entries(entries).filter(([key, entry]) => key !== '1' && Object.keys(entry).length > 0)).toEqual([])
  })

  it('FR-FLOW-002: keeps the 8 steps of the level 0 procedure, every step after Ancestry requiring it', () => {
    const items = book.components.flatMap((c) => c.items)
    const procedure = items.find((item) => isItemOf(item, 'procedure'))
    expect(procedure && isItemOf(procedure, 'procedure') && procedure.steps).toHaveLength(8)
    const steps = items.filter((item) => isItemOf(item, 'step'))
    expect(steps.slice(1).every((step) => isItemOf(step, 'step') && step.requires?.[0] === 'step:ancestry')).toBe(true)
  })
})
