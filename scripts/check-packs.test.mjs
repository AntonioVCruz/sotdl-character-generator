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
    // DEF-021: um dono movido de arquivo que é uma tabela muda de livro (o `provenance.book` vem do livro do arquivo,
    // src/engine/resolve.ts:64), e as decisões dela ficam suspensas pela regra (a) (`tableResult`,
    // src/engine/evaluate.ts:588; ADR-004 §1). A expectativa é provisória até o detailed-design da FEAT-024 (troca de
    // fonte e `replaces`).
    const current = {
      'test.book.json': book([{ ...step({ ...slots, extra: { kind: 'choose-value' } }), name: 'Lineage' }, { ...dwarf({ ...grants, build: {} }), name: 'Dwarf (revised)' }]),
      'test.other.json': { id: 'test.other', components: [{ id: 'base', items: [table({ ...entries, 13: { grants: { ...entries[13].grants, profession: {} } } })] }] },
    }
    expect(removedIds(base, current)).toEqual([])
  })
})

// DEF-021 (ADR-004 §1 e §3): a validade de uma `choose-value` confere o valor gravado contra as `options` da concessão
// (`grantedSlots`, src/engine/evaluate.ts:538), e a chave de uma vaga raiz é só a chave em `step.slots`, sem a etapa
// (`slotTree`, src/engine/evaluate.ts:479).
describe('removed choose-value options and moved root slots', () => {
  const book = (items) => ({ 'test.book.json': { id: 'test.book', components: [{ id: 'base', items }] } })
  const size = (options) => ({ kind: 'choose-value', step: 'step:ancestry', target: 'characteristic:size', options })
  const human = (grants) => ({ id: 'ancestry:human', name: 'Human', grants })
  const ancestry = (slots) => ({ id: 'step:ancestry', name: 'Ancestry', ...(slots && { slots }) })
  const attributes = (slots) => ({ id: 'step:attributes', name: 'Attributes', slots })
  const choose = { kind: 'choose-entity', of: 'ancestry' }
  const shift = { kind: 'attribute-shift', amount: 1 }
  const base = book([ancestry({ ancestry: choose }), attributes({ adjustment: shift }), human({ size: size([0.5, 1]) })])

  it('DEF-021 FR-CONT-006: flags a removed choose-value option, qualified by its owner and grant (Size 0.5 on the Human)', () => {
    const current = book([ancestry({ ancestry: choose }), attributes({ adjustment: shift }), human({ size: size([1]) })])
    expect(removedIds(base, current)).toEqual(['ancestry:human grants.size.options=0.5 (was in packs/test.book.json)'])
  })

  it('DEF-021 FR-CONT-006: flags a removed choose-value grant once, without its options', () => {
    const current = book([ancestry({ ancestry: choose }), attributes({ adjustment: shift }), human({})])
    expect(removedIds(base, current)).toEqual(['ancestry:human grants.size (was in packs/test.book.json)'])
  })

  it('DEF-021 FR-CONT-006: accepts an added choose-value option and a change of option order', () => {
    const added = book([ancestry({ ancestry: choose }), attributes({ adjustment: shift }), human({ size: size([0.5, 1, 2]) })])
    const reordered = book([ancestry({ ancestry: choose }), attributes({ adjustment: shift }), human({ size: size([1, 0.5]) })])
    expect(removedIds(base, added)).toEqual([])
    expect(removedIds(base, reordered)).toEqual([])
  })

  it('DEF-021 FR-CONT-006: accepts a root slot moved to another step with the same key', () => {
    const current = book([ancestry(), attributes({ ancestry: choose, adjustment: shift }), human({ size: size([0.5, 1]) })])
    expect(removedIds(base, current)).toEqual([])
  })
})
