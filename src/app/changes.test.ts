import { describe, expect, it } from 'vitest'
import { characterDocumentSchema, type Book, type CharacterDocument, type Decision, type LogEntry } from '../content'
import { evaluate, resolve, settle, type SlotView } from '../engine'
import { change, nextLogId, place, remove, type DecisionDraft } from './changes'

// Pacote fictício (FEAT-011 §3.2, AC-10): a Gnome concede duas tabelas, e a entrada 17 da Past tem um efeito de dado
// (a neta `roll-effect`); a Troll concede um valor a escolher.
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
        { id: 'step:origin', name: 'Origin', page: 1, slots: { ancestry: { kind: 'choose-entity', of: 'ancestry' } } },
        { id: 'step:story', name: 'Story', page: 2, requires: ['step:origin'] },
        { id: 'attribute:might', name: 'Might', page: 3, modifier: { add: [{ ref: 'self' }, -10] } },
        { id: 'characteristic:madness', name: 'Madness', page: 3, formula: 0 },
        { id: 'characteristic:stature', name: 'Stature', page: 3 },
        { id: 'creature-type:wolf', name: 'Wolves', page: 7 },
        { id: 'table:gnome-foe', name: 'Gnome Foe', page: 7, dice: { count: 1, sides: 20 }, regime: 'choice', entries: { '1-20': { entity: 'creature-type:wolf' } } },
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
          attributes: { 'attribute:might': 8 },
          grants: {
            foe: { kind: 'table', step: 'step:story', table: 'table:gnome-foe' },
            past: { kind: 'table', step: 'step:story', table: 'table:gnome-past' },
          },
        },
        {
          id: 'ancestry:troll',
          name: 'Troll',
          page: 6,
          attributes: { 'attribute:might': 12 },
          characteristics: { 'characteristic:stature': { ref: 'grant:stature' } },
          grants: { stature: { kind: 'choose-value', step: 'step:origin', target: 'characteristic:stature', options: [1, 2] } },
        },
      ],
    },
  ],
}
const rules = resolve([book], ['test.book'])

const ANCESTRY = 'ancestry'
const FOE = 'ancestry=gnome/foe'
const PAST = 'ancestry=gnome/past'
const MADNESS = 'ancestry=gnome/past=17/madness'
const STATURE = 'ancestry=troll/stature'
const AT = '2026-01-02T00:00:00.000Z'

const entity = (value: string, logged?: number): Decision => ({ mode: 'chosen', value, ...(logged !== undefined && { logged }) })
const entry = (value: string, logged?: number, from = 'test.book'): Decision => ({ mode: 'chosen', value, book: from, ...(logged !== undefined && { logged }) })
const madness = (logged?: number): Decision => ({ mode: 'rolled', dice: [4], modifier: 0, total: 4, ...(logged !== undefined && { logged }) })
const marked = (decision: Decision): Decision => ({ ...decision, setAside: true })

/** Entrada `decision` mínima (a sessão monta a real com os nomes congelados, FEAT-009 §3.3). */
const draft = (slot: string, value: string): DecisionDraft => ({
  kind: 'decision',
  slot,
  slotKind: slot === ANCESTRY ? 'choose-entity' : 'table',
  step: slot === ANCESTRY ? { id: 'step:origin', name: 'Origin' } : { id: 'step:story', name: 'Story' },
  origin: slot === ANCESTRY ? null : { id: 'ancestry:gnome', name: 'Gnome' },
  mode: 'chosen',
  subject: slot === ANCESTRY ? null : { id: 'table:gnome-past', name: 'Gnome Past' },
  source: { book: 'test.book', abbr: 'TB', page: 7 },
  result: slot === ANCESTRY ? { entity: { id: value, name: value } } : { entry: value },
})
/** O log com uma entrada `decision` por id, da vaga dada. */
const logOf = (...ids: [number, string][]): LogEntry[] =>
  ids.map(([id, slot]) => ({ id, at: '2026-01-01T00:00:00.000Z', ...draft(slot, slot === ANCESTRY ? 'ancestry:gnome' : '1') }))

function character(decisions: Record<string, Decision>, earlier?: Record<string, Decision[]>, log: LogEntry[] = []): CharacterDocument {
  return {
    schema: 1,
    id: 'c1',
    contentVersion: '0.0.0',
    revision: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sources: { order: ['test.book'] },
    decisions,
    ...(earlier && { earlier }),
    text: {},
    log,
  }
}
const slotOf = (document: CharacterDocument, key: string) => evaluate(rules, document).slots.find((slot) => slot.key === key) as SlotView
const decide = (document: CharacterDocument, key: string, decision: Decision) =>
  change(rules, document, slotOf(document, key), { decision, draft: draft(key, String(decision.mode === 'chosen' ? decision.value : '')) }, AT)
const clear = (document: CharacterDocument, key: string) => change(rules, document, slotOf(document, key), { clear: true }, AT)
/** As entradas sem `at`, para comparar. */
const shapes = (entries: LogEntry[]) =>
  entries.map((logged) => {
    const { at: _at, ...rest } = logged
    expect(_at).toBe(AT)
    return logged.kind === 'decision' ? { id: logged.id, kind: logged.kind, slot: logged.slot } : rest
  })

// A Gnome com as duas tabelas e a neta decididas, assentada; o log vai de 1 a 4.
const gnome = character(
  { [ANCESTRY]: entity('ancestry:gnome', 1), [FOE]: entry('1-20', 2), [PAST]: entry('17', 3), [MADNESS]: madness(4) },
  undefined,
  logOf([1, ANCESTRY], [2, FOE], [3, PAST], [4, MADNESS]),
)

describe('write rules: the five rows of the table (FEAT-011 §3.2)', () => {
  it('FR-CHG-019: open slot without candidates: the new decision goes to decisions[k], with logged = its entry id (row 1)', () => {
    const open = character({ [ANCESTRY]: entity('ancestry:gnome', 1), [FOE]: entry('1-20', 2) }, undefined, logOf([1, ANCESTRY], [2, FOE]))
    const result = decide(open, PAST, entry('5-16'))
    expect(result.document.decisions[PAST]).toEqual(entry('5-16', 3))
    expect(result.document).not.toHaveProperty('earlier')
    expect(shapes(result.entries)).toEqual([{ id: 3, kind: 'decision', slot: PAST }])
    expect(characterDocumentSchema.parse(result.document)).toEqual(result.document)
  })

  it('FR-CHG-019: reopened slot: the new one goes to decisions[k], the set-aside one to the front of earlier[k] with its mark, and no entry about it (row 2, AC-10)', () => {
    // Os dois candidatos da Past são de outro livro: a vaga está reaberta, e eles, marcados.
    const reopened = character(
      { [ANCESTRY]: entity('ancestry:gnome', 1), [FOE]: entry('1-20', 2), [PAST]: marked(entry('17', 4, 'other.book')) },
      { [PAST]: [marked(entry('18', 3, 'other.book'))] },
      logOf([1, ANCESTRY], [2, FOE], [3, PAST], [4, PAST]),
    )
    expect(slotOf(reopened, PAST).decided).toBe(false)
    const result = decide(reopened, PAST, entry('5-16'))
    expect(result.document.decisions[PAST]).toEqual(entry('5-16', 5))
    expect(result.document.earlier).toEqual({ [PAST]: [marked(entry('17', 4, 'other.book')), marked(entry('18', 3, 'other.book'))] })
    expect(shapes(result.entries)).toEqual([{ id: 5, kind: 'decision', slot: PAST }])
    expect(settle(rules, result.document).document).toBe(result.document)
  })

  it('FR-LOG-007: replacing with the active at index 0: earlier stays, the active leaves as undone (replaced, ref, by), and its child is set aside (row 3)', () => {
    const result = decide(gnome, PAST, entry('5-16'))
    expect(result.document.decisions[PAST]).toEqual(entry('5-16', 5))
    expect(result.document).not.toHaveProperty('earlier')
    expect(result.document.decisions[MADNESS]).toEqual(marked(madness(4)))
    expect(shapes(result.entries)).toEqual([
      { id: 5, kind: 'decision', slot: PAST },
      { id: 6, kind: 'undone', slot: PAST, ref: 3, reason: 'replaced', by: 5 },
      { id: 7, kind: 'set-aside', slot: MADNESS, ref: 4, cause: { entry: 5 } },
    ])
    expect(result.document.log).toEqual([...gnome.log, ...result.entries])
    expect(characterDocumentSchema.parse(result.document)).toEqual(result.document)
  })

  it('FR-LOG-007: replacing with the active in earlier: the one in decisions[k] goes to the front, only the active leaves, the other set-aside ones stay (row 4)', () => {
    const stacked = character(
      { [ANCESTRY]: entity('ancestry:gnome', 1), [FOE]: entry('1-20', 2), [PAST]: marked(entry('18', 5, 'other.book')), [MADNESS]: madness(4) },
      { [PAST]: [entry('17', 3), marked(entry('3-4', 6))] },
      logOf([1, ANCESTRY], [2, FOE], [3, PAST], [4, MADNESS], [5, PAST], [6, PAST]),
    )
    expect(slotOf(stacked, PAST)).toMatchObject({ decided: true, value: '17', candidate: 1 })
    const result = decide(stacked, PAST, entry('5-16'))
    expect(result.document.decisions[PAST]).toEqual(entry('5-16', 7))
    expect(result.document.earlier).toEqual({ [PAST]: [marked(entry('18', 5, 'other.book')), marked(entry('3-4', 6))] })
    expect(shapes(result.entries)).toEqual([
      { id: 7, kind: 'decision', slot: PAST },
      { id: 8, kind: 'undone', slot: PAST, ref: 3, reason: 'replaced', by: 7 },
      { id: 9, kind: 'set-aside', slot: MADNESS, ref: 4, cause: { entry: 7 } },
    ])
  })

  it('FR-LOG-007, FR-CHG-018: clear takes out only the active; the most recent left takes decisions[k] and, active again, is restored with its child (row 5, AC-10)', () => {
    const stacked = character(
      { [ANCESTRY]: entity('ancestry:gnome', 1), [FOE]: entry('1-20', 2), [PAST]: entry('5-16', 5), [MADNESS]: marked(madness(4)) },
      { [PAST]: [marked(entry('17', 3))] },
      logOf([1, ANCESTRY], [2, FOE], [3, PAST], [4, MADNESS], [5, PAST]),
    )
    const result = clear(stacked, PAST)
    expect(result.document.decisions[PAST]).toEqual(entry('17', 3))
    expect(result.document.decisions[MADNESS]).toEqual(madness(4))
    expect(result.document).not.toHaveProperty('earlier')
    expect(shapes(result.entries)).toEqual([
      { id: 6, kind: 'undone', slot: PAST, ref: 5, reason: 'cleared' },
      { id: 7, kind: 'restored', slot: PAST, ref: 3, cause: { entry: 6 } },
      { id: 8, kind: 'restored', slot: MADNESS, ref: 4, cause: { entry: 6 } },
    ])
    expect(characterDocumentSchema.parse(result.document)).toEqual(result.document)
  })

  it('FR-LOG-007: clear with no candidate left takes the key out; with the active in earlier, decisions[k] keeps the set-aside one (row 5)', () => {
    const alone = clear(gnome, PAST)
    expect(alone.document.decisions).not.toHaveProperty(PAST)
    expect(shapes(alone.entries)).toEqual([
      { id: 5, kind: 'undone', slot: PAST, ref: 3, reason: 'cleared' },
      { id: 6, kind: 'set-aside', slot: MADNESS, ref: 4, cause: { entry: 5 } },
    ])

    const stacked = character(
      { [ANCESTRY]: entity('ancestry:gnome', 1), [PAST]: marked(entry('18', 5, 'other.book')), [MADNESS]: madness(4) },
      { [PAST]: [entry('17', 3)] },
      logOf([1, ANCESTRY], [3, PAST], [4, MADNESS], [5, PAST]),
    )
    const result = clear(stacked, PAST)
    expect(result.document.decisions[PAST]).toEqual(marked(entry('18', 5, 'other.book')))
    expect(result.document).not.toHaveProperty('earlier')
    expect(shapes(result.entries)).toEqual([
      { id: 6, kind: 'undone', slot: PAST, ref: 3, reason: 'cleared' },
      { id: 7, kind: 'set-aside', slot: MADNESS, ref: 4, cause: { entry: 6 } },
    ])
  })

  it('FR-LOG-007: place and remove alone apply the table without touching the log or the marks', () => {
    const placed = place(gnome, slotOf(gnome, PAST), entry('18', 9))
    expect(placed.leaving).toEqual(entry('17', 3))
    expect(placed.document.decisions[PAST]).toEqual(entry('18', 9))
    expect(placed.document.decisions[MADNESS]).toEqual(madness(4))
    expect(placed.document.log).toBe(gnome.log)
    const removed = remove(gnome, slotOf(gnome, FOE))
    expect(removed.leaving).toEqual(entry('1-20', 2))
    expect(removed.document.decisions).not.toHaveProperty(FOE)
    expect(() => remove(gnome, slotOf(character({ [ANCESTRY]: entity('ancestry:gnome', 1) }), FOE))).toThrow()
  })
})

describe('log entries of a change (FEAT-011 §3.2, "Entradas de log novas")', () => {
  it('FR-CHG-011: order is decision, undone, then one set-aside per set-aside and one restored per restored, each with ref and cause', () => {
    // A Troll com o valor decidido; as decisões da Gnome guardadas e marcadas.
    const troll = character(
      {
        [ANCESTRY]: entity('ancestry:troll', 5),
        [FOE]: marked(entry('1-20', 2)),
        [PAST]: marked(entry('17', 3)),
        [MADNESS]: marked(madness(4)),
        [STATURE]: { mode: 'chosen', value: 2, logged: 6 },
      },
      undefined,
      logOf([1, ANCESTRY], [2, FOE], [3, PAST], [4, MADNESS], [5, ANCESTRY], [6, STATURE]),
    )
    expect(settle(rules, troll).document).toBe(troll)
    const result = decide(troll, ANCESTRY, entity('ancestry:gnome'))
    expect(shapes(result.entries)).toEqual([
      { id: 7, kind: 'decision', slot: ANCESTRY },
      { id: 8, kind: 'undone', slot: ANCESTRY, ref: 5, reason: 'replaced', by: 7 },
      { id: 9, kind: 'set-aside', slot: STATURE, ref: 6, cause: { entry: 7 } },
      { id: 10, kind: 'restored', slot: FOE, ref: 2, cause: { entry: 7 } },
      { id: 11, kind: 'restored', slot: PAST, ref: 3, cause: { entry: 7 } },
      { id: 12, kind: 'restored', slot: MADNESS, ref: 4, cause: { entry: 7 } },
    ])
    expect(result.document.decisions).toEqual({
      [ANCESTRY]: entity('ancestry:gnome', 7),
      [FOE]: entry('1-20', 2),
      [PAST]: entry('17', 3),
      [MADNESS]: madness(4),
      [STATURE]: marked({ mode: 'chosen', value: 2, logged: 6 }),
    })
    // Depois da gravação, a marca coincide com o estado derivado (ADR-004 §1).
    expect(settle(rules, result.document).document).toBe(result.document)
    expect(result.settled.restored.map((item) => item.key)).toEqual([FOE, PAST, MADNESS])
    expect(characterDocumentSchema.parse(result.document)).toEqual(result.document)
  })

  it('FR-LOG-007: ref comes from the logged of the decision, never from the log; a decision saved before logged gets no ref', () => {
    // O log tem outros ids e nenhuma entrada da Past com o id 3: o ref segue o `logged`.
    const misleading = { ...gnome, log: logOf([10, PAST], [11, MADNESS], [12, ANCESTRY]) }
    const result = decide(misleading, PAST, entry('5-16'))
    expect(shapes(result.entries)).toEqual([
      { id: 13, kind: 'decision', slot: PAST },
      { id: 14, kind: 'undone', slot: PAST, ref: 3, reason: 'replaced', by: 13 },
      { id: 15, kind: 'set-aside', slot: MADNESS, ref: 4, cause: { entry: 13 } },
    ])

    const old = character({ [ANCESTRY]: entity('ancestry:gnome'), [PAST]: entry('17'), [MADNESS]: madness() }, undefined, logOf([1, ANCESTRY], [2, PAST], [3, MADNESS]))
    const replaced = decide(old, PAST, entry('5-16'))
    expect(shapes(replaced.entries)).toEqual([
      { id: 4, kind: 'decision', slot: PAST },
      { id: 5, kind: 'undone', slot: PAST, reason: 'replaced', by: 4 },
      { id: 6, kind: 'set-aside', slot: MADNESS, cause: { entry: 4 } },
    ])
    expect(replaced.document.decisions[PAST]).toEqual(entry('5-16', 4))
  })

  it('FR-LOG-009: change is pure: the document it gets does not change, the log only grows, and revision and updatedAt are left to the session', () => {
    const before = JSON.stringify(gnome)
    const result = decide(gnome, PAST, entry('5-16'))
    expect(JSON.stringify(gnome)).toBe(before)
    expect(result.document.log.slice(0, gnome.log.length)).toEqual(gnome.log)
    expect(result.document).toMatchObject({ revision: gnome.revision, updatedAt: gnome.updatedAt })
    expect(nextLogId(result.document)).toBe(8)
    expect(nextLogId(character({}))).toBe(1)
  })
})
