import { describe, expect, it } from 'vitest'
import type { Book, CharacterDocument, Decision } from '../content'
import { evaluate, impact, resolve, settle, type ImpactItem, type SetAsideRef } from '.'

// Pacote fictício (FEAT-011 AC-3, AC-4): a Gnome concede duas tabelas, e a Past tem uma entrada com efeito de dado
// (a neta `roll-effect`); a Gnome tem Taint 1 e a Troll o padrão 0 (como a Corruption do Dwarf e do Human); a Troll
// concede um valor a escolher (como o Size do Human).
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
        { id: 'procedure:test', steps: ['step:origin', 'step:story'] },
        {
          id: 'step:origin',
          name: 'Origin',
          page: 1,
          slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' }, adjust: { kind: 'attribute-shift', amount: 1, optional: true } },
        },
        { id: 'step:story', name: 'Story', page: 2, requires: ['step:origin'] },
        { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'attribute:will', name: 'Will', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'characteristic:taint', name: 'Taint', page: 3, formula: 0 },
        { id: 'characteristic:madness', name: 'Madness', page: 3, formula: 0 },
        { id: 'characteristic:stature', name: 'Stature', page: 3 },
        { id: 'creature-type:wolf', name: 'Wolves', page: 7 },
        { id: 'creature-type:bear', name: 'Bears', page: 7 },
        {
          id: 'table:gnome-foe',
          name: 'Gnome Foe',
          page: 7,
          dice: { count: 1, sides: 20 },
          regime: 'choice',
          entries: { '1-10': { entity: 'creature-type:wolf' }, '11-20': { entity: 'creature-type:bear' } },
        },
        {
          id: 'table:gnome-past',
          name: 'Gnome Past',
          page: 7,
          dice: { count: 3, sides: 6 },
          regime: 'roll-or-choose',
          entries: {
            '3-4': {},
            '5-16': {},
            '17': { effects: { madness: { target: 'characteristic:madness', add: { dice: { count: 1, sides: 6 } } } } },
            '18': {},
          },
        },
        {
          id: 'ancestry:gnome',
          name: 'Gnome',
          page: 5,
          attributes: { 'attribute:might': 8, 'attribute:will': 10 },
          characteristics: { 'characteristic:taint': 1 },
          grants: {
            foe: { kind: 'table', step: 'step:story', table: 'table:gnome-foe' },
            past: { kind: 'table', step: 'step:story', table: 'table:gnome-past' },
          },
        },
        {
          id: 'ancestry:troll',
          name: 'Troll',
          page: 6,
          attributes: { 'attribute:might': 12, 'attribute:will': 9 },
          characteristics: { 'characteristic:stature': { ref: 'grant:stature' } },
          grants: { stature: { kind: 'choose-value', step: 'step:origin', target: 'characteristic:stature', options: [1, 2] } },
        },
      ],
    },
  ],
}
const rules = resolve([book], ['test.book'])

const ANCESTRY = 'ancestry'
const ADJUST = 'adjust'
const FOE = 'ancestry=gnome/foe'
const PAST = 'ancestry=gnome/past'
const MADNESS = 'ancestry=gnome/past=17/madness'
const STATURE = 'ancestry=troll/stature'

const entity = (value: string, logged: number): Decision => ({ mode: 'chosen', value, logged })
const entry = (value: string, logged: number): Decision => ({ mode: 'chosen', value, book: 'test.book', logged })
const madness = (face: number, logged: number): Decision => ({ mode: 'rolled', dice: [face], modifier: 0, total: face, logged })

function character(decisions: Record<string, Decision>, earlier?: Record<string, Decision[]>): CharacterDocument {
  return {
    schema: 1,
    id: 'c1',
    contentVersion: '0.0.0',
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: { order: ['test.book'] },
    decisions,
    ...(earlier && { earlier }),
    text: {},
    log: [],
  }
}

// A Gnome com as duas tabelas, a neta e o ajuste decididos (como o Dwarf com Background 1, Age e o ajuste).
const gnome = character({
  [ANCESTRY]: entity('ancestry:gnome', 1),
  [ADJUST]: { mode: 'chosen', value: { decrease: 'attribute:will', increase: 'attribute:might' }, logged: 2 },
  [FOE]: entry('1-10', 3),
  [PAST]: entry('17', 4),
  [MADNESS]: madness(4, 5),
})
/** O documento candidato de um comando, montado à mão pelas regras de escrita (a T4 as implementa no `app`). */
const replacing = (document: CharacterDocument, key: string, decision: Decision): CharacterDocument => ({
  ...document,
  decisions: { ...document.decisions, [key]: decision },
})
const rows = (items: (ImpactItem | SetAsideRef)[]) => items.map((item) => [item.key, item.decision])

describe('impact: switching the ancestry (FEAT-011 AC-3)', () => {
  const toTroll = replacing(gnome, ANCESTRY, entity('ancestry:troll', 6))

  it('FR-CHG-004, FR-CHG-005: sets aside the table and its roll-effect, with parent, including the granddaughter', () => {
    const result = impact(rules, gnome, toTroll, ANCESTRY)
    expect(result.setAside.map((item) => [item.key, item.parent, item.slot.key])).toEqual([
      [FOE, ANCESTRY, FOE],
      [PAST, ANCESTRY, PAST],
      [MADNESS, PAST, MADNESS],
    ])
    expect(rows(result.setAside)).toEqual([
      [FOE, entry('1-10', 3)],
      [PAST, entry('17', 4)],
      [MADNESS, madness(4, 5)],
    ])
    // A vaga de antes, em que a decisão era ativa.
    expect(result.setAside[0].slot).toBe(result.before.slots.find((slot) => slot.key === FOE))
    expect(result.needsDialog).toBe(true)
  })

  it('FR-CHG-003: the change has the slot before and after; the value that leaves its own slot is undone, never set aside', () => {
    const result = impact(rules, gnome, toTroll, ANCESTRY)
    expect(result.change!.key).toBe(ANCESTRY)
    expect(result.change!.from).toMatchObject({ key: ANCESTRY, value: 'ancestry:gnome' })
    expect(result.change!.to).toMatchObject({ key: ANCESTRY, value: 'ancestry:troll' })
    expect(result.undone).toEqual(entity('ancestry:gnome', 1))
    expect(result.setAside.map((item) => item.key)).not.toContain(ANCESTRY)
  })

  it('FR-CHG-006: recalculated lists old and new values (Taint 1 → 0)', () => {
    const result = impact(rules, gnome, toTroll, ANCESTRY)
    expect(result.recalculated.characteristics).toEqual([
      { id: 'characteristic:taint', name: 'Taint', from: 1, to: 0 },
      { id: 'characteristic:madness', name: 'Madness', from: 4, to: 0 },
    ])
    expect(result.recalculated.attributes).toEqual([
      { id: 'attribute:might', name: 'Might', from: 9, to: 13 },
      { id: 'attribute:will', name: 'Will', from: 9, to: 8 },
    ])
  })

  it('FR-CHG-004: stays has the active decisions outside the changed slot that do not change; nothing is reopened', () => {
    const result = impact(rules, gnome, toTroll, ANCESTRY)
    expect(result.stays.map((item) => [item.key, item.index])).toEqual([[ADJUST, 0]])
    expect(result.reopened).toEqual([])
    expect(result.restored).toEqual([])
  })

  it('FR-CHG-018: switching back restores the stored values, and sets aside the decided grant of the other ancestry', () => {
    const troll = settle(rules, replacing(toTroll, STATURE, { mode: 'chosen', value: 1, logged: 7 })).document
    const back = replacing(troll, ANCESTRY, entity('ancestry:gnome', 8))
    const result = impact(rules, troll, back, ANCESTRY)
    expect(rows(result.restored)).toEqual([
      [FOE, entry('1-10', 3)],
      [PAST, entry('17', 4)],
      [MADNESS, madness(4, 5)],
    ])
    expect(result.restored[2]).toMatchObject({ parent: PAST, slot: { key: MADNESS, decided: true } })
    expect(result.restored[0].slot).toBe(result.after.slots.find((slot) => slot.key === FOE))
    expect(rows(result.setAside)).toEqual([[STATURE, { mode: 'chosen', value: 1, logged: 7 }]])
    expect(result.undone).toEqual(entity('ancestry:troll', 6))
    expect(result.recalculated.characteristics).toContainEqual({ id: 'characteristic:taint', name: 'Taint', from: 0, to: 1 })
    expect(result.needsDialog).toBe(true)
  })

  it('FR-CHG-002: without anything set aside or restored there is no dialog, even when values are recalculated', () => {
    const bare = character({ [ANCESTRY]: entity('ancestry:gnome', 1) })
    const result = impact(rules, bare, replacing(bare, ANCESTRY, entity('ancestry:troll', 2)), ANCESTRY)
    expect(result.setAside).toEqual([])
    expect(result.restored).toEqual([])
    expect(result.recalculated.characteristics).toContainEqual({ id: 'characteristic:taint', name: 'Taint', from: 1, to: 0 })
    expect(result.undone).toEqual(entity('ancestry:gnome', 1))
    expect(result.needsDialog).toBe(false)
  })
})

describe('impact: replacing and clearing a table (FEAT-011 AC-3)', () => {
  it('FR-CHG-001, FR-CHG-005: Choose → Choose sets aside the roll-effect of the old entry; the old value is undone', () => {
    const result = impact(rules, gnome, replacing(gnome, PAST, entry('5-16', 6)), PAST)
    expect(rows(result.setAside)).toEqual([[MADNESS, madness(4, 5)]])
    expect(result.setAside[0].parent).toBe(PAST)
    expect(result.undone).toEqual(entry('17', 4))
    expect(result.change!.from).toMatchObject({ value: '17' })
    expect(result.change!.to).toMatchObject({ value: '5-16' })
    // Na ordem das vagas: as concessões da ancestralidade vêm logo depois dela.
    expect(result.stays.map((item) => item.key)).toEqual([ANCESTRY, FOE, ADJUST])
    expect(result.needsDialog).toBe(true)
  })

  it('FR-CHG-018: going back to the entry restores its roll-effect, with no set-aside (restore only)', () => {
    const moved = settle(rules, replacing(gnome, PAST, entry('5-16', 6))).document
    const result = impact(rules, moved, replacing(moved, PAST, entry('17', 7)), PAST)
    expect(rows(result.restored)).toEqual([[MADNESS, madness(4, 5)]])
    expect(result.setAside).toEqual([])
    expect(result.undone).toEqual(entry('5-16', 6))
    expect(result.needsDialog).toBe(true)
  })

  it('FR-CHG-012: clear reopens the required slot that lost its active decision; the change has no `to`', () => {
    const cleared = { ...gnome, decisions: Object.fromEntries(Object.entries(gnome.decisions).filter(([key]) => key !== PAST)) }
    const result = impact(rules, gnome, cleared, PAST)
    expect(result.reopened).toEqual([PAST])
    expect(result.change!.from).toMatchObject({ key: PAST, decided: true })
    expect(result.change).not.toHaveProperty('to')
    expect(result.undone).toEqual(entry('17', 4))
    expect(rows(result.setAside)).toEqual([[MADNESS, madness(4, 5)]])
  })

  it('FR-CHG-018: clear with an older candidate that becomes active brings it, and its granddaughter, in restored', () => {
    // A Past tem '5-16' (ativa) e, guardada, a '17' com a neta, ambas marcadas.
    const stacked = settle(rules, character({ ...gnome.decisions, [PAST]: entry('5-16', 6) }, { [PAST]: [entry('17', 4)] })).document
    const after = { ...stacked, decisions: { ...stacked.decisions, [PAST]: stacked.earlier![PAST][0] } }
    delete after.earlier
    const result = impact(rules, stacked, after, PAST)
    expect(result.undone).toEqual(entry('5-16', 6))
    expect(rows(result.restored)).toEqual([
      [PAST, entry('17', 4)],
      [MADNESS, madness(4, 5)],
    ])
    expect(result.reopened).toEqual([])
  })

  it('FR-CHG-012: a new version of the rules that drops the recorded entry reopens the slot and sets the decision aside (afterRules)', () => {
    const errata = resolve(
      [
        {
          ...book,
          components: book.components.map((component) => ({
            ...component,
            items: component.items.map((item) =>
              item.id === 'table:gnome-foe'
                ? ({ ...item, entries: { '1-12': { entity: 'creature-type:wolf' }, '13-20': { entity: 'creature-type:bear' } } } as typeof item)
                : item,
            ),
          })),
        },
      ],
      ['test.book'],
    )
    const result = impact(rules, gnome, gnome, FOE, errata)
    expect(rows(result.setAside)).toEqual([[FOE, entry('1-10', 3)]])
    expect(result.reopened).toEqual([FOE])
    expect(result).not.toHaveProperty('undone')
  })

  it('FR-CHG-001: impact is pure: it changes neither document', () => {
    const after = replacing(gnome, PAST, entry('5-16', 6))
    const snapshot = JSON.stringify([gnome, after])
    impact(rules, gnome, after, PAST)
    expect(JSON.stringify([gnome, after])).toBe(snapshot)
  })
})

// FEAT-010 D8: a mudança que não é de uma vaga só (o Roll all undecided) passa `key` nulo.
describe('impact: a change without a single slot (FEAT-010 D8)', () => {
  // A Past sem decisão, com a neta guardada e marcada (como depois de um `clear` da Past).
  const open = settle(rules, character(Object.fromEntries(Object.entries(gnome.decisions).filter(([key]) => key !== PAST)))).document

  it('FR-DEC-023, FR-CHG-001, FR-CHG-018: with key null there is no change and no undone; a rolled table that brings back a stored child lists it in restored, and stays has every equal active (AC-10)', () => {
    expect(open.decisions[MADNESS]).toEqual({ ...madness(4, 5), setAside: true })
    const rolled = { ...open, decisions: { ...open.decisions, [PAST]: entry('17', 6) } }
    const result = impact(rules, open, rolled, null)
    expect(result).not.toHaveProperty('change')
    expect(result).not.toHaveProperty('undone')
    expect(result.setAside).toEqual([])
    expect(rows(result.restored)).toEqual([[MADNESS, madness(4, 5)]])
    expect(result.restored[0]).toMatchObject({ parent: PAST, slot: { key: MADNESS, decided: true } })
    expect(result.stays.map((item) => item.key)).toEqual([ANCESTRY, FOE, ADJUST])
    expect(result.recalculated.characteristics).toEqual([{ id: 'characteristic:madness', name: 'Madness', from: 0, to: 4 }])
    expect(result.needsDialog).toBe(true)
  })

  it('FR-DEC-023, FR-CHG-002: with key null and nothing restored there is no dialog; stays has every active of before that is the same after', () => {
    const bare = character({ [ANCESTRY]: entity('ancestry:gnome', 1), [ADJUST]: gnome.decisions[ADJUST] })
    const rolled = { ...bare, decisions: { ...bare.decisions, [FOE]: entry('1-10', 3), [PAST]: entry('5-16', 4) } }
    const result = impact(rules, bare, rolled, null)
    expect(result).not.toHaveProperty('change')
    expect(result).not.toHaveProperty('undone')
    expect(result.setAside).toEqual([])
    expect(result.restored).toEqual([])
    expect(result.stays.map((item) => item.key)).toEqual([ANCESTRY, ADJUST])
    expect(result.reopened).toEqual([])
    expect(result.needsDialog).toBe(false)
  })
})

describe('settle: the record mark (FEAT-011 AC-4)', () => {
  const toTroll = replacing(gnome, ANCESTRY, entity('ancestry:troll', 6))

  it('ADR-004 §1: marks each stored decision by its derived state and returns the transitions', () => {
    const result = settle(rules, toTroll)
    expect(result.setAside.map((item) => [item.key, item.index, item.reason])).toEqual([
      [FOE, 0, 'not-generated'],
      [PAST, 0, 'not-generated'],
      [MADNESS, 0, 'not-generated'],
    ])
    expect(result.restored).toEqual([])
    expect(result.document.decisions).toEqual({
      [ANCESTRY]: entity('ancestry:troll', 6),
      [ADJUST]: gnome.decisions[ADJUST],
      [FOE]: { ...entry('1-10', 3), setAside: true },
      [PAST]: { ...entry('17', 4), setAside: true },
      [MADNESS]: { ...madness(4, 5), setAside: true },
    })
    // Os ativos que não mudam são o mesmo objeto; o documento de entrada não muda.
    expect(result.document.decisions[ADJUST]).toBe(toTroll.decisions[ADJUST])
    expect(toTroll.decisions[FOE]).toEqual(entry('1-10', 3))
  })

  it('ADR-004 §1: on a settled document nothing changes, and it is the same object', () => {
    const settled = settle(rules, toTroll).document
    const again = settle(rules, settled)
    expect(again.document).toBe(settled)
    expect(again.setAside).toEqual([])
    expect(again.restored).toEqual([])
    expect(settle(rules, gnome).document).toBe(gnome)
  })

  it('ADR-004 §1: an active decision with the mark is restored and loses it; marks in earlier follow the same rule', () => {
    const stale = character({ ...gnome.decisions, [PAST]: { ...entry('17', 4), setAside: true } }, { [PAST]: [entry('5-16', 2)] })
    const result = settle(rules, stale)
    expect(rows(result.restored)).toEqual([[PAST, entry('17', 4)]])
    expect(result.restored[0].slot).toMatchObject({ key: PAST, candidate: 0 })
    expect(result.setAside.map((item) => [item.key, item.index, item.reason])).toEqual([[PAST, 1, 'superseded']])
    expect(result.document.decisions[PAST]).toEqual(entry('17', 4))
    expect(result.document.earlier).toEqual({ [PAST]: [{ ...entry('5-16', 2), setAside: true }] })
  })

  it('ADR-004 §4: in a commit, the transitions of settle on the candidate are the lists of impact (switch and switch back)', () => {
    const away = impact(rules, gnome, toTroll, ANCESTRY)
    const awaySettled = settle(rules, toTroll)
    expect(rows(awaySettled.setAside)).toEqual(rows(away.setAside))
    expect(rows(awaySettled.restored)).toEqual(rows(away.restored))

    const troll = settle(rules, replacing(awaySettled.document, STATURE, { mode: 'chosen', value: 2, logged: 7 })).document
    const back = replacing(troll, ANCESTRY, entity('ancestry:gnome', 8))
    const home = impact(rules, troll, back, ANCESTRY)
    const homeSettled = settle(rules, back)
    expect(rows(homeSettled.setAside)).toEqual(rows(home.setAside))
    expect(rows(homeSettled.restored)).toEqual(rows(home.restored))
    expect(home.restored).toHaveLength(3)
    // Depois da gravação, o documento assentado não tem transição.
    expect(settle(rules, homeSettled.document).document).toBe(homeSettled.document)
  })

  it('ADR-004 §1: the view passed in gives the same result as the one settle computes', () => {
    expect(settle(rules, toTroll, evaluate(rules, toTroll))).toEqual(settle(rules, toTroll))
  })
})
