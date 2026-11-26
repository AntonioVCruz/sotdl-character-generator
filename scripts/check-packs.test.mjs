import { describe, expect, it } from 'vitest'
import { removedIds } from './check-packs.mjs'

describe('removed pack ids', () => {
  const base = { 'test.book.json': { id: 'test.book', steps: [{ id: 'step:a' }, { id: 'step:b' }] } }

  it('FR-CONT-006: flags an id that disappeared since the base revision', () => {
    const current = { 'test.book.json': { id: 'test.book', steps: [{ id: 'step:a' }] } }
    expect(removedIds(base, current)).toEqual(['step:b (was in packs/test.book.json)'])
  })

  it('FR-CONT-006: accepts renamed entries and ids moved to another file', () => {
    const current = {
      'test.book.json': { id: 'test.book', steps: [{ id: 'step:a', name: 'Renamed' }] },
      'test.other.json': { id: 'test.other', steps: [{ id: 'step:b' }] },
    }
    expect(removedIds(base, current)).toEqual([])
  })
})

// DEF-017 (ADR-004, Consequências): as chaves de objeto que formam as chaves das vagas também são contrato com
// personagens salvos. Onde o motor as monta (src/engine/evaluate.ts): `slots` de uma etapa (a chave raiz), `grants` de
// uma ancestralidade (`childKey`), `entries` de uma tabela e `effects` de uma entrada (`childKey`; a chave da entrada é
// também o valor gravado da decisão) e, pela FEAT-012, `grants` de uma entrada (`childKey`).
describe('removed slot keys', () => {
  const book = (items) => ({ id: 'test.book', components: [{ id: 'base', items }] })
  const step = (slots) => ({ id: 'step:ancestry', name: 'Ancestry', slots })
  const dwarf = (grants) => ({ id: 'ancestry:dwarf', name: 'Dwarf', grants })
  const table = (entries) => ({ id: 'table:dwarf-background', name: 'Background', entries })
  const grants = {
    background: { kind: 'table', step: 'step:story', table: 'table:dwarf-background' },
    age: { kind: 'table', step: 'step:story', table: 'table:dwarf-age' },
  }
  const entries = {
    1: { effects: { corruption: { target: 'characteristic:corruption', add: 1 } } },
    12: { grants: { profession: { kind: 'profession', table: 'table:common-professions', entry: '3' } } },
    13: { grants: { language: { kind: 'language' } } },
    '14-20': {},
  }
  const slots = { ancestry: { kind: 'choose-entity', of: 'ancestry' } }
  const files = (items) => ({ 'test.book.json': book(items) })
  const base = files([step(slots), dwarf(grants), table(entries)])
  const without = (object, key) => Object.fromEntries(Object.entries(object).filter(([k]) => k !== key))
  const renamed = (object, from, to) => Object.fromEntries(Object.entries(object).map(([k, v]) => [k === from ? to : k, v]))

  it('DEF-017 FR-CONT-006: flags a renamed grant, qualified by its owner (background → history on the Dwarf)', () => {
    const current = files([step(slots), dwarf(renamed(grants, 'background', 'history')), table(entries)])
    expect(removedIds(base, current)).toEqual(['ancestry:dwarf grants.background (was in packs/test.book.json)'])
  })

  it('DEF-017 FR-CONT-006: flags a removed entry key once, without the keys inside it', () => {
    const current = files([step(slots), dwarf(grants), table(without(entries, '13'))])
    expect(removedIds(base, current)).toEqual(['table:dwarf-background entries.13 (was in packs/test.book.json)'])
  })

  it('DEF-017 FR-CONT-006: flags a renamed step slot key', () => {
    const current = files([step(renamed(slots, 'ancestry', 'lineage')), dwarf(grants), table(entries)])
    expect(removedIds(base, current)).toEqual(['step:ancestry slots.ancestry (was in packs/test.book.json)'])
  })

  it('DEF-017 FR-CONT-006: flags a renamed effect key inside an entry', () => {
    const changed = { ...entries, 1: { effects: renamed(entries[1].effects, 'corruption', 'taint') } }
    const current = files([step(slots), dwarf(grants), table(changed)])
    expect(removedIds(base, current)).toEqual(['table:dwarf-background entries.1.effects.corruption (was in packs/test.book.json)'])
  })

  it('DEF-017 FR-CONT-006: flags a renamed grant inside an entry (FEAT-012 entry grants)', () => {
    const changed = { ...entries, 13: { grants: renamed(entries[13].grants, 'language', 'tongue') } }
    const current = files([step(slots), dwarf(grants), table(changed)])
    expect(removedIds(base, current)).toEqual(['table:dwarf-background entries.13.grants.language (was in packs/test.book.json)'])
  })

  it('DEF-017 FR-CONT-006: accepts a change of name only, an added key and an owner moved to another file', () => {
    const current = {
      'test.book.json': book([{ ...step({ ...slots, extra: { kind: 'choose-value' } }), name: 'Lineage' }, { ...dwarf({ ...grants, build: {} }), name: 'Dwarf (revised)' }]),
      'test.other.json': { id: 'test.other', components: [{ id: 'base', items: [table({ ...entries, 13: { grants: { ...entries[13].grants, profession: {} } } })] }] },
    }
    expect(removedIds(base, current)).toEqual([])
  })
})
